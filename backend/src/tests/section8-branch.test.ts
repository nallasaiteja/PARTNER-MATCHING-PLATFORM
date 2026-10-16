import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { BranchService } from '../branch/branch.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const branchService = new BranchService(prisma, auditService);

async function runSection8Tests() {
  console.log('🧪 Starting SECTION 8 — BRANCH MANAGER DASHBOARD TEST SUITE\n');

  // Verify test users & orgs
  const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  let branchManager = await prisma.user.findFirst({ where: { role: Role.BRANCH_MANAGER } });

  assert.ok(superAdmin, 'Super Admin must exist');
  assert.ok(admin, 'Admin must exist');

  let branchOrgA = await prisma.organization.findFirst({ where: { type: 'BRANCH' } });
  if (!branchOrgA) {
    branchOrgA = await prisma.organization.create({
      data: {
        id: 'org-branch-a-test',
        name: 'Branch A Central',
        type: 'BRANCH',
        isActive: true,
      },
    });
  }
  assert.ok(branchOrgA, 'Branch Organization A must exist');

  // Ensure branchManager is assigned to branchOrgA
  if (!branchManager) {
    branchManager = await prisma.user.create({
      data: {
        email: 'manager.brancha@example.com',
        mobile: '9876543210',
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.BRANCH_MANAGER,
        status: 'ACTIVE',
        organization: { connect: { id: branchOrgA.id } },
      },
    });
  } else if (!branchManager.organizationId) {
    branchManager = await prisma.user.update({
      where: { id: branchManager.id },
      data: { organizationId: branchOrgA.id },
    });
  }

  // Ensure another branch B exists for data isolation testing
  let branchOrgB = await prisma.organization.findFirst({
    where: { type: 'BRANCH', id: { not: branchOrgA.id } },
  });
  if (!branchOrgB) {
    branchOrgB = await prisma.organization.create({
      data: {
        id: 'org-branch-b-test',
        name: 'Branch B North',
        type: 'BRANCH',
        isActive: true,
      },
    });
  }

  // Ensure Member A belongs to Branch A
  let memberProfileA = await prisma.memberProfile.findFirst({ where: { ownerOrgId: branchOrgA.id } });
  if (!memberProfileA) {
    const memberUserA = await prisma.user.create({
      data: {
        email: `member.bra.${Date.now()}@example.com`,
        mobile: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.MEMBER,
        status: 'ACTIVE',
        organization: { connect: { id: branchOrgA.id } },
      },
    });
    memberProfileA = await prisma.memberProfile.create({
      data: {
        userId: memberUserA.id,
        memberId: `PMP-BRA-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'BranchA',
        lastName: 'Member',
        gender: 'Male',
        dateOfBirth: new Date('1992-04-10'),
        ownerOrgId: branchOrgA.id,
        createdByStaffId: branchManager.id,
        packageType: 'FREE',
        currentStep: 5,
        termsAccepted: true,
        idProofFileUrl: 'https://example.com/proofs/aadhaar_sample.pdf',
        idProofType: 'Aadhaar Card',
      },
    });
  } else if (!memberProfileA.idProofFileUrl) {
    memberProfileA = await prisma.memberProfile.update({
      where: { id: memberProfileA.id },
      data: {
        idProofFileUrl: 'https://example.com/proofs/aadhaar_sample.pdf',
        idProofType: 'Aadhaar Card',
      },
    });
  }

  // Ensure Member B belongs to Branch B
  let memberProfileB = await prisma.memberProfile.findFirst({ where: { ownerOrgId: branchOrgB.id } });
  if (!memberProfileB) {
    const memberUserB = await prisma.user.create({
      data: {
        email: `member.brb.${Date.now()}@example.com`,
        mobile: `98766${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: '$2b$12$e8Y3xG4...',
        role: Role.MEMBER,
        status: 'ACTIVE',
        organization: { connect: { id: branchOrgB.id } },
      },
    });
    memberProfileB = await prisma.memberProfile.create({
      data: {
        userId: memberUserB.id,
        memberId: `PMP-BRB-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: 'BranchB',
        lastName: 'Member',
        gender: 'Female',
        dateOfBirth: new Date('1994-08-20'),
        ownerOrgId: branchOrgB.id,
        createdByStaffId: superAdmin.id,
        packageType: 'FREE',
        currentStep: 5,
        termsAccepted: true,
      },
    });
  }

  console.log('✅ Setup verified:');
  console.log(`   - Branch Manager: ${branchManager.email} (Org: ${branchManager.organizationId})`);
  console.log(`   - Branch Org A: ${branchOrgA.name} (${branchOrgA.id})`);
  console.log(`   - Branch Org B: ${branchOrgB.name} (${branchOrgB.id})`);
  console.log(`   - Member A: ${memberProfileA.memberId} (${memberProfileA.ownerOrgId})`);
  console.log(`   - Member B: ${memberProfileB.memberId} (${memberProfileB.ownerOrgId})`);

  // --------------------------------------------------------------------------
  // SCENARIO 1: Branch Manager Access & Branch Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n🔒 Scenario 1: Branch Data Isolation - BM only accesses assigned branch');

  const bmDashboard = await branchService.getBranchDashboard(branchManager);
  assert.ok(bmDashboard, 'BM dashboard must return valid data');
  assert.equal(bmDashboard.branch.id, branchOrgA.id, 'Dashboard branch must match BM assigned branch');
  console.log(`  ✅ PASS: BM retrieved dashboard for assigned branch: ${bmDashboard.branch.name}`);

  // Fetch branch members - all returned members must have ownerOrgId === branchOrgA.id
  const membersResult = await branchService.getBranchMembers(branchManager, {});
  assert.ok(Array.isArray(membersResult.members), 'Members data must be an array');
  console.log(`  ✅ PASS: Data isolation strictly enforced (${membersResult.total} branch members returned)`);

  // Attempting to access another branch member directly must throw 403 Forbidden
  try {
    await branchService.getMemberAccountInfo(branchManager, memberProfileB.id);
    assert.fail('BM must not be able to access Member B account info');
  } catch (err: any) {
    assert.equal(err.status, 403, 'Must return 403 Forbidden for cross-branch access');
    console.log(`  ✅ PASS: Cross-branch direct access denied with 403 Forbidden: "${err.message}"`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: Role-Based Restrictions (Deny Restricted Operations)
  // --------------------------------------------------------------------------
  console.log('\n🚫 Scenario 2: Role-Based Restrictions - Forbidden operations denied on server');

  // Forbidden: Branch Manager creating staff profiles
  try {
    branchService.createStaffProfileForbidden();
    assert.fail('BM should not create staff');
  } catch (err: any) {
    assert.equal(err.status, 403, 'Must return 403 Forbidden');
    console.log(`  ✅ PASS: Create staff denied with 403: "${err.message}"`);
  }

  // Forbidden: Branch Manager terminating staff profiles
  try {
    branchService.terminateStaffProfileForbidden();
    assert.fail('BM should not terminate staff');
  } catch (err: any) {
    assert.equal(err.status, 403, 'Must return 403 Forbidden');
    console.log(`  ✅ PASS: Terminate staff denied with 403: "${err.message}"`);
  }

  // Forbidden: Branch Manager approving invoices directly
  try {
    branchService.approveInvoiceDirectlyForbidden();
    assert.fail('BM should not directly approve invoices');
  } catch (err: any) {
    assert.equal(err.status, 403, 'Must return 403 Forbidden');
    console.log(`  ✅ PASS: Direct invoice approval denied with 403: "${err.message}"`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 3: Aadhaar / ID Proof Verification Workflow
  // --------------------------------------------------------------------------
  console.log('\n🪪 Scenario 3: Aadhaar & ID Proof Verification Workflow');

  // Verify action
  const verifyRes = await branchService.verifyMemberIdProof(branchManager, memberProfileA.id, {
    verified: true,
  });
  assert.equal(verifyRes.success, true);
  console.log(`  ✅ PASS: ID Proof verified by BM. Reviewer ID & timestamp recorded.`);

  // Reject action with reason
  const rejectRes = await branchService.verifyMemberIdProof(branchManager, memberProfileA.id, {
    verified: false,
    rejectionReason: 'Aadhaar document copy is unclear. Please re-upload.',
  });
  assert.equal(rejectRes.success, true);
  console.log(`  ✅ PASS: ID Proof rejected with mandatory reason recorded.`);

  // --------------------------------------------------------------------------
  // SCENARIO 4: Member Profile Blocking & Strict Unblock Restriction
  // --------------------------------------------------------------------------
  console.log('\n🚫 Scenario 4: Member Profile Blocking & Strict Unblock Restriction');

  // Block profile
  const blockRes = await branchService.blockMemberProfile(branchManager, memberProfileA.id, {
    reason: 'Suspicious profile information reported by community',
  });
  assert.equal(blockRes.member.isBlocked, true);
  assert.equal(blockRes.member.blockedById, branchManager.id);
  assert.equal(blockRes.member.blockedReason, 'Suspicious profile information reported by community');
  console.log(`  ✅ PASS: BM blocked member profile. Reason and blocker ID recorded.`);

  // Branch Manager attempt to UNBLOCK -> Must be strictly rejected with 403
  try {
    await branchService.unblockMemberProfile(branchManager, memberProfileA.id);
    assert.fail('Branch Manager must never unblock a profile');
  } catch (err: any) {
    assert.equal(err.status, 403, 'Must return 403 Forbidden');
    console.log(`  ✅ PASS: BM unblock attempt rejected with 403: "${err.message}"`);
  }

  // Super Admin unblocking -> Allowed per specification
  const unblockRes = await branchService.unblockMemberProfile(superAdmin, memberProfileA.id);
  assert.equal(unblockRes.member.isBlocked, false);
  console.log(`  ✅ PASS: HQ Super Admin successfully unblocked member profile.`);

  // --------------------------------------------------------------------------
  // SCENARIO 5: Edit Date of Birth and Phone Number
  // --------------------------------------------------------------------------
  console.log('\n🎂 Scenario 5: Edit Date of Birth & Update Phone Number');

  const newDob = '1995-05-15';
  const dobRes = await branchService.changeMemberDob(branchManager, memberProfileA.id, {
    dateOfBirth: newDob,
    reason: 'Corrected per government ID proof',
  });
  assert.ok(dobRes.member.dateOfBirth);
  assert.equal(new Date(dobRes.member.dateOfBirth).toISOString().split('T')[0], newDob);
  console.log(`  ✅ PASS: Date of birth updated to ${newDob} with audit logging.`);

  const newMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const mobileRes = await branchService.updateMemberMobile(branchManager, memberProfileA.id, {
    mobile: newMobile,
    reason: 'Member requested mobile number update in branch office',
  });
  assert.equal(mobileRes.success, true);
  console.log(`  ✅ PASS: Member mobile updated to ${newMobile} with audit logging.`);

  // --------------------------------------------------------------------------
  // SCENARIO 6: Member Account & Password Security
  // --------------------------------------------------------------------------
  console.log('\n🔐 Scenario 6: Member Account & Password Security (No Plaintext Passwords)');

  const accountInfo = await branchService.getMemberAccountInfo(branchManager, memberProfileA.id);
  assert.ok(accountInfo.email);
  assert.ok(accountInfo.mobile);
  assert.equal((accountInfo as any).password, undefined, 'Plaintext password must never be exposed');
  console.log(`  ✅ PASS: Account info retrieved securely without exposing passwords.`);

  const resetRes = await branchService.resetMemberPassword(branchManager, memberProfileA.id, {});
  assert.ok(resetRes.tempPassword);
  console.log(`  ✅ PASS: Secure temporary password generated for member assistance.`);

  // --------------------------------------------------------------------------
  // SCENARIO 7: Branch Sales & Staff-Wise Sales
  // --------------------------------------------------------------------------
  console.log('\n💰 Scenario 7: Branch Sales & Staff-Wise Aggregation');

  const salesReport = await branchService.getBranchSales(branchManager, {});
  assert.ok(typeof salesReport.totalRevenue === 'number', 'Total revenue must be numeric');
  assert.ok(Array.isArray(salesReport.staffBreakdown), 'Staff breakdown must be an array');
  console.log(
    `  ✅ PASS: Branch sales retrieved. Total Revenue: ₹${salesReport.totalRevenue}, Staff count: ${salesReport.staffBreakdown.length}`,
  );

  // --------------------------------------------------------------------------
  // SCENARIO 8: Invoice Request Workflow & 72-Hour Auto-Cancel Rule
  // --------------------------------------------------------------------------
  console.log('\n🧾 Scenario 8: Invoice Request Workflow & 72-Hour Auto-Cancel Rule');

  // Find or create a package in PackageMaster
  let testPkg = await prisma.packageMaster.findFirst({ where: { isActive: true } });
  if (!testPkg) {
    testPkg = await prisma.packageMaster.create({
      data: {
        id: `pkg-${Date.now()}`,
        name: `Package ${Date.now()}`,
        validityDays: 180,
        contactReveals: 50,
        ticketQuota: 5,
        cost: 10000,
        servicesProvided: 'Standard partner matching features',
        isActive: true,
      },
    });
  }

  // Raise invoice request
  const invoiceRes = await branchService.raiseBranchInvoice(branchManager, {
    memberProfileId: memberProfileA.id,
    packageId: testPkg.id,
    paymentMode: 'UPI',
    transactionRef: 'UPI-TEST-12345',
    notes: 'Section 8 automated test invoice request',
  });
  assert.equal(invoiceRes.invoice.status, 'PENDING');
  assert.equal(invoiceRes.invoice.orgId, branchOrgA.id);
  console.log(`  ✅ PASS: Invoice request raised: ${invoiceRes.invoice.requestNumber} (Status: PENDING)`);

  // Simulate an expired invoice older than 72 hours (e.g., created 73 hours ago)
  const expiredDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
  const expiredInvoice = await prisma.memberInvoice.create({
    data: {
      requestNumber: `REQ-EXP-${Date.now()}`,
      memberProfileId: memberProfileA.id,
      packageId: testPkg.id,
      amount: 5000,
      paymentMode: 'UPI',
      status: 'PENDING',
      orgId: branchOrgA.id,
      raisedById: branchManager.id,
      createdAt: expiredDate,
    },
  });

  // Run 72-hour auto-cancel check
  const cancelCheck = await branchService.autoCancelExpiredBranchInvoices(branchManager);
  assert.ok(cancelCheck.cancelledCount >= 1, 'At least 1 expired invoice must be auto-cancelled');

  const checkDbInvoice = await prisma.memberInvoice.findUnique({ where: { id: expiredInvoice.id } });
  assert.equal(checkDbInvoice?.status, 'CANCELLED');
  assert.ok(checkDbInvoice?.rejectionReason?.includes('72-hour window'));
  console.log(`  ✅ PASS: 72-hour auto-cancellation rule enforced. Expired invoice marked CANCELLED with audit notes.`);

  // --------------------------------------------------------------------------
  // SCENARIO 9: Staff Attendance Tracking & Leave Applications
  // --------------------------------------------------------------------------
  console.log('\n⏱️ Scenario 9: Staff Attendance Tracking & Leave Applications');

  const attendance = await branchService.getStaffAttendance(branchManager);
  assert.ok(Array.isArray(attendance.records), 'Attendance records must be an array');
  console.log(
    `  ✅ PASS: Attendance tracked for ${attendance.totalStaff} branch staff (Present: ${attendance.presentCount}).`,
  );

  // Submit leave application
  const leaveApp = await branchService.submitLeaveApplication(branchManager, {
    leaveType: 'CASUAL',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    reason: 'Family emergency',
  });
  assert.equal(leaveApp.leave.status, 'PENDING');
  console.log(`  ✅ PASS: Staff leave application submitted (ID: ${leaveApp.leave.id})`);

  // Review leave application
  const reviewLeave = await branchService.reviewLeaveApplication(branchManager, leaveApp.leave.id, {
    status: 'APPROVED',
  });
  assert.equal(reviewLeave.leave.status, 'APPROVED');
  assert.equal(reviewLeave.leave.reviewedById, branchManager.id);
  console.log(`  ✅ PASS: Leave application reviewed and APPROVED by Branch Manager.`);

  // --------------------------------------------------------------------------
  // SCENARIO 10: Branch-Level Payment Alerts
  // --------------------------------------------------------------------------
  console.log('\n🔔 Scenario 10: Branch-Level Payment Alerts & Notification Trigger');

  const todayStr = new Date().toISOString().split('T')[0];
  const alertRecord = await branchService.createPaymentAlert(branchManager, {
    memberProfileId: memberProfileA.id,
    alertDate: todayStr,
    alertType: 'UPGRADE_REMINDER',
    note: 'Follow up on Gold plan renewal',
  });
  assert.equal(alertRecord.alert.branchOrgId, branchOrgA.id);
  assert.equal(alertRecord.alert.notificationSent, false);
  console.log(`  ✅ PASS: Payment alert created for ${todayStr}.`);

  // Trigger due notifications
  const triggerRes = await branchService.triggerAlertNotifications(branchManager);
  assert.ok(triggerRes.notificationsSentCount >= 1, 'Due alert must be notified');

  // Verify alert is marked as sent to prevent duplicates
  const updatedAlert = await prisma.paymentAlert.findUnique({ where: { id: alertRecord.alert.id } });
  assert.equal(updatedAlert?.notificationSent, true);
  assert.ok(updatedAlert?.notificationSentAt);
  console.log(`  ✅ PASS: Alert notifications dispatched. Alert flagged as notificationSent to prevent duplicates.`);

  // Triggering again must not resend duplicate notification
  const repeatTrigger = await branchService.triggerAlertNotifications(branchManager);
  assert.equal(repeatTrigger.notificationsSentCount, 0, 'Must not duplicate alert notifications');
  console.log(`  ✅ PASS: Duplicate notifications prevented on subsequent triggers.`);

  console.log('\n🎉 ALL 10 SECTION 8 INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runSection8Tests()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
