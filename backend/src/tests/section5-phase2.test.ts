import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { AdminMembersService } from '../admin/admin-members.service';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const membersService = new AdminMembersService(prisma, auditService);

async function runTests() {
  console.log('🧪 Starting Section 5 — Phase 2: Member Management, Blocking, CRM Notes Tests\n');

  // Ensure Admin & Staff actors exist
  let adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        mobile: `99111${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: 'dummy',
        role: Role.ADMIN,
        fullName: 'HQ Admin Officer',
        status: 'ACTIVE',
      },
    });
  }

  let branchStaff = await prisma.user.findFirst({ where: { role: Role.BRANCH_STAFF } });
  if (!branchStaff) {
    branchStaff = await prisma.user.create({
      data: {
        mobile: `99222${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: 'dummy',
        role: Role.BRANCH_STAFF,
        fullName: 'Branch Staff Agent',
        status: 'ACTIVE',
      },
    });
  }

  // Ensure a test member profile exists
  const testMobile = `99333${Math.floor(10000 + Math.random() * 90000)}`;
  const testMemberUser = await prisma.user.create({
    data: {
      mobile: testMobile,
      passwordHash: 'dummy',
      role: Role.MEMBER,
      status: 'ACTIVE',
    },
  });

  const testProfile = await prisma.memberProfile.create({
    data: {
      userId: testMemberUser.id,
      memberId: `M2026${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: 'Sita',
      lastName: 'Lakshmi',
      gender: 'Female',
      dateOfBirth: new Date('1998-05-10'),
      packageType: 'FREE',
      profileData: { caste: 'Kamma', isCasteConverted: false },
    },
  });

  // Ensure an active package exists
  let goldPkg = await prisma.packageMaster.findFirst({ where: { name: 'Gold' } });
  if (!goldPkg) {
    goldPkg = await prisma.packageMaster.create({
      data: {
        name: 'Gold',
        validityDays: 90,
        contactReveals: 50,
        ticketQuota: 10,
        cost: 6500,
        servicesProvided: 'Priority matchmaking and 50 contact reveals',
        isActive: true,
      },
    });
  }

  // Test 1: Member list views
  console.log('📋 Test 1: Member List Views (ALL, FREE, PAID)');
  const allList = await membersService.listMembers(adminUser, { type: 'ALL' });
  const freeList = await membersService.listMembers(adminUser, { type: 'FREE' });
  assert.ok(allList.total >= 1, 'At least 1 member profile exists');
  assert.ok(freeList.total >= 1, 'Free member list contains profiles');
  console.log(`  ✅ PASS: Member list retrieved (Total: ${allList.total}, Free: ${freeList.total})`);

  // Test 2: Any staff can BLOCK a member profile
  console.log('\n📋 Test 2: Staff can BLOCK member (records Staff ID, timestamp, reason)');
  const blockRes = await membersService.blockMember(
    branchStaff,
    testProfile.id,
    'Marriage Settled',
  );
  assert.strictEqual(blockRes.profile.isBlocked, true);
  assert.strictEqual(blockRes.profile.blockedById, branchStaff.id);
  assert.strictEqual(blockRes.profile.blockedReason, 'Marriage Settled');
  assert.ok(blockRes.profile.blockedAt, 'Blocked timestamp must be auto-filled');
  console.log('  ✅ PASS: Member blocked with Staff ID, timestamp, and Marriage Settled reason');

  // Test 3: Unblocking DENIED for ordinary staff
  console.log('\n📋 Test 3: UNBLOCKING strictly denied for non-admin staff');
  await assert.rejects(
    async () => {
      await membersService.unblockMember(branchStaff, testProfile.id);
    },
    /UNBLOCKING is strictly reserved for Super Admin and Admin only/,
    'Branch staff must not be able to unblock',
  );
  console.log('  ✅ PASS: Non-admin staff blocked from unblocking');

  // Test 4: UNBLOCKING allowed for Admin
  console.log('\n📋 Test 4: UNBLOCKING allowed for Admin');
  const unblockRes = await membersService.unblockMember(adminUser, testProfile.id);
  assert.strictEqual(unblockRes.profile.isBlocked, false);
  assert.strictEqual(unblockRes.profile.blockedById, null);
  console.log('  ✅ PASS: Admin successfully unblocked member');

  // Test 5: Member profile closure request (requires staff/admin approval; data never deleted)
  console.log('\n📋 Test 5: Profile closure request submission and approval');
  await membersService.requestProfileClosure(testMemberUser, testProfile.id, 'Got married outside platform');
  const closureReqProfile = await prisma.memberProfile.findUnique({ where: { id: testProfile.id } });
  assert.strictEqual(closureReqProfile?.closureRequested, true);

  await membersService.approveProfileClosure(adminUser, testProfile.id);
  const closedProfile = await prisma.memberProfile.findUnique({ where: { id: testProfile.id } });
  assert.strictEqual(closedProfile?.isBlocked, true);
  assert.strictEqual(closedProfile?.closureRequested, false);
  assert.ok(closedProfile?.id, 'Data is preserved in database permanently without deletion');
  console.log('  ✅ PASS: Closure approved, profile closed and preserved permanently');

  // Test 6: Unblock profile for paid conversion test
  await membersService.unblockMember(adminUser, testProfile.id);

  // Test 7: Marking a member as PAID
  console.log('\n📋 Test 7: Marking a Member as Paid with facilitating staff');
  const paidRes = await membersService.markMemberAsPaid(adminUser, testProfile.id, {
    packageId: goldPkg.id,
    facilitatingStaffId: branchStaff.id,
    paymentMode: 'UPI',
    notes: 'Walk-in branch conversion',
  });
  assert.strictEqual(paidRes.profile.packageType, 'PAID');
  assert.strictEqual(paidRes.invoice.status, 'APPROVED');
  assert.strictEqual(paidRes.invoice.amount, goldPkg.cost);
  console.log(`  ✅ PASS: Member marked as Paid (${goldPkg.name}) with invoice ${paidRes.invoice.invoiceNumber}`);

  // Test 8: CRM & Internal Notes (Staff/Admin only)
  console.log('\n📋 Test 8: CRM & Confidential Internal Notes');
  const note = await membersService.addInternalNote(
    branchStaff,
    testProfile.id,
    'Called father regarding horoscope match. Favorable response.',
  );
  assert.ok(note.id);
  assert.strictEqual(note.staffId, branchStaff.id);

  const notesList = await membersService.getInternalNotes(adminUser, testProfile.id);
  assert.strictEqual(notesList.length, 1);
  assert.strictEqual(notesList[0].note, 'Called father regarding horoscope match. Favorable response.');

  // Verify ordinary members cannot access internal notes
  await assert.rejects(
    async () => {
      await membersService.getInternalNotes(testMemberUser, testProfile.id);
    },
    /confidential to staff and admin only/,
    'Member must be forbidden from accessing internal notes',
  );
  console.log('  ✅ PASS: Confidential CRM notes verified (staff accessible, member restricted)');

  // Test 9: Profile Update Request with immutable fields protection
  console.log('\n📋 Test 9: Member Profile Update Request with immutable field protection');
  const updateReq = await membersService.submitUpdateRequest(testMemberUser, testProfile.id, {
    firstName: 'Hacked Name', // immutable!
    mobile: '9999999999', // immutable!
    annualIncome: '18 LPA', // mutable
    occupation: 'Senior Software Engineer', // mutable
  });

  assert.strictEqual(updateReq.status, 'PENDING');

  // Review & approve update request
  await membersService.reviewUpdateRequest(adminUser, updateReq.id, 'APPROVED');
  const updatedMember = await prisma.memberProfile.findUnique({ where: { id: testProfile.id } });
  // Immutable fields must remain unchanged
  assert.strictEqual(updatedMember?.firstName, 'Sita');
  // Mutable field updated
  assert.strictEqual((updatedMember?.profileData as any)?.annualIncome, '18 LPA');
  console.log('  ✅ PASS: Update request reviewed; immutable fields strictly protected');

  console.log('\n🎉 ALL 9 SECTION 5 PHASE 2 TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
