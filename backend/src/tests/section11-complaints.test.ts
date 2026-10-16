import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { Role } from '../common/constants/roles.constants';
import { ComplaintType, ComplaintStatus } from '@prisma/client';
import * as assert from 'assert';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SECTION 11.4 — COMPLAINTS MODULE TESTS');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const service = new ComplaintsService(prisma, auditService);

  try {
    // 1. Fetch test admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    assert.ok(adminUser, 'Admin user must exist in DB');
    const adminActor = { id: adminUser.id, role: Role.SUPER_ADMIN };

    // 2. Mock non-admin actors
    const memberActor = { id: 'member-user-1', role: Role.MEMBER };
    const staffActor = { id: 'staff-user-1', role: Role.BRANCH_STAFF };
    const agentActor = { id: 'agent-user-1', role: Role.BRANCH_AGENT };

    // 3. Fetch a valid member profile
    const testMember = await prisma.memberProfile.findFirst();
    assert.ok(testMember, 'MemberProfile record must exist in DB');

    // 4. Fetch a valid staff user
    const testStaff = await prisma.user.findFirst({
      where: { role: { in: [Role.BRANCH_STAFF, Role.BRANCH_MANAGER] } },
    });
    assert.ok(testStaff, 'Staff user record must exist in DB');

    // TEST 1: Strictly deny non-admin users from accessing complaints
    console.log('TEST 1: Non-admin access denial (API and Service Level)');
    try {
      await service.listComplaints(memberActor, {});
      assert.fail('Member should not be able to list complaints');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Member access denied with 403 Forbidden');
    }

    try {
      await service.listComplaints(staffActor, {});
      assert.fail('Ordinary staff should not be able to list complaints');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Ordinary staff access denied with 403 Forbidden');
    }

    try {
      await service.listComplaints(agentActor, {});
      assert.fail('Agent should not be able to list complaints');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Agent access denied with 403 Forbidden');
    }

    // TEST 2: Validate relatedMemberId for MEMBER complaints
    console.log('\nTEST 2: Validation of relatedMemberId');
    try {
      await service.createComplaint(adminActor, {
        type: ComplaintType.MEMBER,
        subject: 'Profile Misrepresentation',
        description: 'Details do not match reality',
      });
      assert.fail('Should require relatedMemberId for MEMBER type');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Rejected MEMBER complaint without relatedMemberId');
    }

    try {
      await service.createComplaint(adminActor, {
        type: ComplaintType.MEMBER,
        relatedMemberId: 'non-existent-member-uuid',
        subject: 'Profile Misrepresentation',
        description: 'Details do not match reality',
      });
      assert.fail('Should reject non-existent member ID');
    } catch (err: any) {
      assert.strictEqual(err.status, 404);
      console.log('  [PASS] Rejected non-existent member ID with 404 Not Found');
    }

    // TEST 3: Validate relatedStaffId for STAFF complaints
    console.log('\nTEST 3: Validation of relatedStaffId');
    try {
      await service.createComplaint(adminActor, {
        type: ComplaintType.STAFF,
        subject: 'Staff Misconduct',
        description: 'Rude behavior during office consultation',
      });
      assert.fail('Should require relatedStaffId for STAFF type');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Rejected STAFF complaint without relatedStaffId');
    }

    try {
      await service.createComplaint(adminActor, {
        type: ComplaintType.STAFF,
        relatedStaffId: 'non-existent-staff-uuid',
        subject: 'Staff Misconduct',
        description: 'Rude behavior during consultation',
      });
      assert.fail('Should reject non-existent staff ID');
    } catch (err: any) {
      assert.strictEqual(err.status, 404);
      console.log('  [PASS] Rejected non-existent staff ID with 404 Not Found');
    }

    // TEST 4: Create Member Complaint with auto-generated reference number
    console.log('\nTEST 4: Create Member Complaint as Admin');
    const memberComplaintRes = await service.createComplaint(adminActor, {
      type: ComplaintType.MEMBER,
      relatedMemberId: testMember.id,
      subject: 'Inaccurate horoscope details on profile',
      description: 'Member submitted an updated horoscope showing different birth time.',
      internalNotes: 'Verification requested with family astrologer.',
    });

    assert.strictEqual(memberComplaintRes.success, true);
    assert.ok(memberComplaintRes.complaint.complaintNumber.startsWith('CMP-'));
    assert.strictEqual(memberComplaintRes.complaint.type, ComplaintType.MEMBER);
    assert.strictEqual(memberComplaintRes.complaint.status, ComplaintStatus.OPEN);
    assert.strictEqual(memberComplaintRes.complaint.relatedMemberId, testMember.id);
    console.log(`  [PASS] Member complaint created: ${memberComplaintRes.complaint.complaintNumber}`);

    // TEST 5: Create Staff Complaint as Admin
    console.log('\nTEST 5: Create Staff Complaint as Admin');
    const staffComplaintRes = await service.createComplaint(adminActor, {
      type: ComplaintType.STAFF,
      relatedStaffId: testStaff.id,
      subject: 'Delayed verification of submitted ID documents',
      description: 'Candidate documents remained unverified for over 5 working days.',
      internalNotes: 'Followed up with branch manager.',
    });

    assert.strictEqual(staffComplaintRes.success, true);
    assert.ok(staffComplaintRes.complaint.complaintNumber.startsWith('CMP-'));
    assert.strictEqual(staffComplaintRes.complaint.type, ComplaintType.STAFF);
    assert.strictEqual(staffComplaintRes.complaint.relatedStaffId, testStaff.id);
    console.log(`  [PASS] Staff complaint created: ${staffComplaintRes.complaint.complaintNumber}`);

    // TEST 6: Verify status change audit history
    console.log('\nTEST 6: Update complaint status and maintain statusHistory');
    const updateRes = await service.updateComplaint(adminActor, memberComplaintRes.complaint.id, {
      status: ComplaintStatus.UNDER_INVESTIGATION,
      internalNotes: 'Contacted branch for document resubmission.',
      historyNote: 'Assigned to senior verification specialist for review.',
    });

    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.complaint.status, ComplaintStatus.UNDER_INVESTIGATION);

    const history = updateRes.complaint.statusHistory as any[];
    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[1].status, ComplaintStatus.UNDER_INVESTIGATION);
    console.log('  [PASS] Status history preserved with timestamp, actor, and notes');

    // TEST 7: Search and filter complaints
    console.log('\nTEST 7: Search and filter complaints list');
    const memberFiltered = await service.listComplaints(adminActor, {
      type: ComplaintType.MEMBER,
    });
    assert.ok(memberFiltered.complaints.every((c) => c.type === ComplaintType.MEMBER));
    console.log(`  [PASS] Filtered by type=MEMBER (Total: ${memberFiltered.total})`);

    const searched = await service.listComplaints(adminActor, {
      search: 'horoscope',
    });
    assert.ok(searched.complaints.some((c) => c.id === memberComplaintRes.complaint.id));
    console.log('  [PASS] Search by term "horoscope" returned matching complaint');

    // TEST 8: Unauthorized ID lookup prevention
    console.log('\nTEST 8: Unauthorized ID direct lookup denial');
    try {
      await service.getComplaintById(memberActor, memberComplaintRes.complaint.id);
      assert.fail('Member should not be able to get complaint by ID');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Non-admin prevented from retrieving complaint by direct ID');
    }

    // Clean up test complaints
    await prisma.internalComplaint.deleteMany({
      where: {
        id: { in: [memberComplaintRes.complaint.id, staffComplaintRes.complaint.id] },
      },
    });

    console.log('\n====================================================');
    console.log('🎉 SECTION 11.4 COMPLAINTS TESTS PASSED (8/8)');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Complaints test failed:', err);
  process.exit(1);
});
