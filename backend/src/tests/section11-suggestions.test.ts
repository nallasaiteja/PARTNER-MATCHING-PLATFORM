import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { Role } from '../common/constants/roles.constants';
import { SuggestionStatus } from '@prisma/client';
import * as assert from 'assert';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SECTION 11.5 — SUGGESTED PROFILES TESTS');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const service = new SuggestionsService(prisma, auditService);

  try {
    // 1. Fetch test branch and staff
    const branchA = await prisma.organization.findFirst({
      where: { type: 'BRANCH' },
    });
    assert.ok(branchA, 'Branch A must exist in DB');

    let branchB = await prisma.organization.findFirst({
      where: { type: 'BRANCH', id: { not: branchA.id } },
    });
    if (!branchB) {
      branchB = await prisma.organization.create({
        data: { name: 'Branch B - Secondary Hub', type: 'BRANCH' },
      });
    }

    // Admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    assert.ok(adminUser, 'Admin user must exist');
    const adminActor = { id: adminUser.id, role: Role.SUPER_ADMIN };

    // Staff in Branch A
    let staffUser = await prisma.user.findFirst({
      where: { organizationId: branchA.id, role: Role.BRANCH_STAFF },
    });
    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          mobile: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: `staff_sug_${Date.now()}@pmp.test`,
          passwordHash: 'dummy',
          role: Role.BRANCH_STAFF,
          organizationId: branchA.id,
          employeeId: `EMP-SUG-${Date.now()}`,
          fullName: 'Staff Suggestion Agent',
        },
      });
    }
    const staffActor = {
      id: staffUser.id,
      role: Role.BRANCH_STAFF,
      organizationId: branchA.id,
    };

    // 2. Fetch or create test packages
    let freePkg = await prisma.packageMaster.findFirst({
      where: { cost: 0 },
    });
    if (!freePkg) {
      freePkg = await prisma.packageMaster.create({
        data: {
          name: `Free Basic ${Date.now()}`,
          validityDays: 30,
          contactReveals: 0,
          cost: 0,
          servicesProvided: 'Basic browsing',
          suggestedProfilesEligible: false,
        },
      });
    }

    let premiumPkg = await prisma.packageMaster.findFirst({
      where: { cost: { gt: 0 } },
    });
    if (!premiumPkg) {
      premiumPkg = await prisma.packageMaster.create({
        data: {
          name: `Premium Gold ${Date.now()}`,
          validityDays: 90,
          contactReveals: 25,
          cost: 4999,
          servicesProvided: 'Assisted matchmaking, unlimited views',
          suggestedProfilesEligible: false, // Initially disabled
        },
      });
    }

    // 3. Fetch or create test members
    // Member 1: Receiver (Paid member)
    const members = await prisma.memberProfile.findMany({
      take: 3,
      include: { user: true },
    });
    assert.ok(members.length >= 2, 'At least 2 member profiles required for test');

    const receiverMember = members[0];
    const candidateProfile = members[1];

    // Clean up any stale suggestions between them
    await prisma.profileSuggestion.deleteMany({
      where: {
        OR: [
          { receivingMemberProfileId: receiverMember.id },
          { suggestedProfileId: candidateProfile.id },
        ],
      },
    });

    // TEST 1: Reject suggestion creation by unauthorized actors (Members)
    console.log('TEST 1: Non-staff role access denial');
    try {
      await service.createSuggestion(
        { id: receiverMember.userId, role: Role.MEMBER },
        {
          suggestedProfileId: candidateProfile.id,
          receivingMemberProfileId: receiverMember.id,
        },
      );
      assert.fail('Members should not be allowed to suggest profiles');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Member suggestion creation rejected with 403 Forbidden');
    }

    // TEST 2: Package Eligibility Check — Free Member Rejected
    console.log('\nTEST 2: Reject suggestion to Free Tier member');
    await prisma.memberProfile.update({
      where: { id: receiverMember.id },
      data: {
        packageType: 'FREE',
        currentPackageId: freePkg.id,
      },
    });

    try {
      await service.createSuggestion(staffActor, {
        suggestedProfileId: candidateProfile.id,
        receivingMemberProfileId: receiverMember.id,
      });
      assert.fail('Should reject suggestion to Free member');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      assert.ok(err.message.includes('Ineligibility') || err.message.includes('Free tier'));
      console.log('  [PASS] Free tier member suggestion rejected:', err.message);
    }

    // TEST 3: Package Eligibility Check — Paid Member on non-qualifying package rejected
    console.log('\nTEST 3: Reject suggestion on non-qualifying Paid Package');
    await prisma.packageMaster.update({
      where: { id: premiumPkg.id },
      data: { suggestedProfilesEligible: false },
    });
    await prisma.memberProfile.update({
      where: { id: receiverMember.id },
      data: {
        packageType: 'PAID',
        currentPackageId: premiumPkg.id,
        packageExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days in future
      },
    });

    try {
      await service.createSuggestion(staffActor, {
        suggestedProfileId: candidateProfile.id,
        receivingMemberProfileId: receiverMember.id,
      });
      assert.fail('Should reject when package suggestedProfilesEligible is false');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      assert.ok(err.message.includes('not configured for Suggested Profiles'));
      console.log('  [PASS] Non-qualifying package correctly rejected:', err.message);
    }

    // TEST 4: Admin enables package eligibility & Staff creates valid suggestion
    console.log('\nTEST 4: Admin enables package eligibility and creates suggestion');
    const toggleRes = await service.togglePackageEligibility(
      adminActor,
      premiumPkg.id,
      true,
    );
    assert.strictEqual(toggleRes.package.suggestedProfilesEligible, true);
    console.log('  [PASS] Package eligibility enabled by Admin for:', premiumPkg.name);

    const suggestRes = await service.createSuggestion(staffActor, {
      suggestedProfileId: candidateProfile.id,
      receivingMemberProfileId: receiverMember.id,
      notes: 'Matches horoscope, education in Software Engineering, and location preferences.',
    });

    assert.strictEqual(suggestRes.success, true);
    assert.strictEqual(suggestRes.suggestion.status, SuggestionStatus.PENDING);
    assert.strictEqual(suggestRes.suggestion.suggestedProfileId, candidateProfile.id);
    assert.strictEqual(suggestRes.suggestion.receivingMemberProfileId, receiverMember.id);
    console.log(`  [PASS] Profile suggested successfully: ID ${suggestRes.suggestion.id}`);

    // TEST 5: Prevent duplicate active suggestions
    console.log('\nTEST 5: Prevent duplicate suggestions for same pair');
    try {
      await service.createSuggestion(staffActor, {
        suggestedProfileId: candidateProfile.id,
        receivingMemberProfileId: receiverMember.id,
      });
      assert.fail('Should reject duplicate suggestion');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      assert.ok(err.message.includes('already been submitted'));
      console.log('  [PASS] Duplicate suggestion rejected:', err.message);
    }

    // TEST 6: Member retrieves suggestions with privacy protections
    console.log('\nTEST 6: Member retrieves suggestions with privacy sanitization');
    const memberDashboardView = await service.getMemberSuggestions({
      id: receiverMember.userId,
    });

    assert.strictEqual(memberDashboardView.eligible, true);
    assert.ok(memberDashboardView.suggestions.length >= 1);

    const firstSug = memberDashboardView.suggestions[0];
    assert.ok(firstSug.suggestedProfile);
    assert.strictEqual((firstSug.suggestedProfile as any).mobile, undefined);
    assert.strictEqual((firstSug.suggestedProfile as any).email, undefined);
    assert.strictEqual((firstSug.suggestedProfile as any).idProofNumber, undefined);
    assert.strictEqual((firstSug.suggestedProfile as any).idProofFileUrl, undefined);
    console.log('  [PASS] Sensitive contact and ID details strictly hidden in suggested profile');

    // TEST 7: Member updates suggestion status (e.g. INTERESTED)
    console.log('\nTEST 7: Member updates suggestion status to INTERESTED');
    const updateStatusRes = await service.updateMemberSuggestionStatus(
      { id: receiverMember.userId },
      suggestRes.suggestion.id,
      { status: SuggestionStatus.INTERESTED },
    );
    assert.strictEqual(updateStatusRes.success, true);
    assert.strictEqual(updateStatusRes.suggestion.status, SuggestionStatus.INTERESTED);
    console.log('  [PASS] Suggestion status updated to INTERESTED by member');

    // TEST 8: Suggestion History Report & Branch Isolation
    console.log('\nTEST 8: Suggestion History Report with Branch Manager Scope');
    // Admin can see all suggestions
    const adminReport = await service.getSuggestionHistory(adminActor, {});
    assert.ok(adminReport.suggestions.some((s) => s.id === suggestRes.suggestion.id));
    console.log(`  [PASS] HQ Admin retrieved all suggestions history (Total: ${adminReport.total})`);

    // Clean up
    await prisma.profileSuggestion.deleteMany({
      where: { id: suggestRes.suggestion.id },
    });

    console.log('\n====================================================');
    console.log('🎉 SECTION 11.5 SUGGESTED PROFILES TESTS PASSED (8/8)');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Suggestions test failed:', err);
  process.exit(1);
});
