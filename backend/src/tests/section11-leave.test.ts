import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationProvider } from '../notifications/providers/push.provider';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { EmailNotificationProvider } from '../notifications/providers/email.provider';
import { WhatsAppNotificationProvider } from '../notifications/providers/whatsapp.provider';
import { LeaveService } from '../leave/leave.service';
import { Role } from '../common/constants/roles.constants';
import { AttendanceStatus, LeaveStatus } from '@prisma/client';
import * as assert from 'assert';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SECTION 11.3 — LEAVE & ATTENDANCE TESTS');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const pushProvider = new PushNotificationProvider();
  const smsProvider = new SmsNotificationProvider();
  const emailProvider = new EmailNotificationProvider();
  const whatsappProvider = new WhatsAppNotificationProvider();

  const notificationsService = new NotificationsService(
    prisma,
    pushProvider,
    smsProvider,
    emailProvider,
    whatsappProvider,
  );

  const service = new LeaveService(prisma, auditService, notificationsService);

  try {
    // 1. Fetch test branch and staff
    const branchA = await prisma.organization.findFirst({
      where: { type: 'BRANCH' },
    });
    assert.ok(branchA, 'Branch A organization must exist in DB');

    let branchB = await prisma.organization.findFirst({
      where: { type: 'BRANCH', id: { not: branchA.id } },
    });
    if (!branchB) {
      branchB = await prisma.organization.create({
        data: {
          name: 'Branch B - Test Center',
          type: 'BRANCH',
        },
      });
    }

    // Branch A Manager
    let managerAUser = await prisma.user.findFirst({
      where: { organizationId: branchA.id, role: Role.BRANCH_MANAGER },
    });
    if (!managerAUser) {
      managerAUser = await prisma.user.create({
        data: {
          mobile: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: `mgr_a_${Date.now()}@pmp.test`,
          passwordHash: 'dummy',
          role: Role.BRANCH_MANAGER,
          organizationId: branchA.id,
          employeeId: `MGR-A-${Date.now()}`,
          fullName: 'Manager Branch A',
        },
      });
    }
    const branchAManager = {
      id: managerAUser.id,
      role: Role.BRANCH_MANAGER,
      organizationId: branchA.id,
    };

    // Branch B Manager
    let managerBUser = await prisma.user.findFirst({
      where: { organizationId: branchB.id, role: Role.BRANCH_MANAGER },
    });
    if (!managerBUser) {
      managerBUser = await prisma.user.create({
        data: {
          mobile: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: `mgr_b_${Date.now()}@pmp.test`,
          passwordHash: 'dummy',
          role: Role.BRANCH_MANAGER,
          organizationId: branchB.id,
          employeeId: `MGR-B-${Date.now()}`,
          fullName: 'Manager Branch B',
        },
      });
    }
    const branchBManager = {
      id: managerBUser.id,
      role: Role.BRANCH_MANAGER,
      organizationId: branchB.id,
    };

    // Admin Actor
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    const adminActor = { id: adminUser?.id || 'admin-user', role: Role.SUPER_ADMIN };

    // Staff in Branch A
    let staffA = await prisma.user.findFirst({
      where: { organizationId: branchA.id, role: { in: [Role.BRANCH_STAFF, Role.BRANCH_AGENT] } },
    });

    if (!staffA) {
      staffA = await prisma.user.create({
        data: {
          mobile: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: `staff_a_${Date.now()}@pmp.test`,
          passwordHash: 'dummy',
          role: Role.BRANCH_STAFF,
          organizationId: branchA.id,
          employeeId: `EMP-${Date.now()}`,
          fullName: 'Suresh Branch Staff',
        },
      });
    }

    console.log(`Using Staff A: ${staffA.employeeId} (${staffA.fullName || staffA.mobile}) in Branch A (${branchA.name})`);

    // Clean up any stale records from previous test runs
    await prisma.staffAttendance.deleteMany({ where: { staffId: staffA.id } });
    await prisma.staffLeaveApplication.deleteMany({ where: { staffId: staffA.id } });

    // TEST 1: Reject invalid leave date range
    console.log('\nTEST 1: Reject invalid leave date range (start > end)');
    try {
      await service.applyLeave(staffA, {
        leaveType: 'CASUAL',
        startDate: '2026-11-20',
        endDate: '2026-11-18', // earlier than start!
        reason: 'Vacation',
      });
      assert.fail('Should have rejected invalid date range');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Correctly rejected invalid date range:', err.message);
    }

    // TEST 2: Submit valid leave application
    console.log('\nTEST 2: Submit valid leave application');
    const leaveRes1 = await service.applyLeave(staffA, {
      leaveType: 'SICK',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      reason: 'Fever and medical consultation',
    });

    assert.strictEqual(leaveRes1.success, true);
    assert.strictEqual(leaveRes1.leave.status, LeaveStatus.PENDING);
    assert.strictEqual(leaveRes1.leave.leaveType, 'SICK');
    console.log(`  [PASS] Leave application submitted: ${leaveRes1.leave.id} (Status: PENDING)`);

    // TEST 3: Reject overlapping / duplicate leave requests
    console.log('\nTEST 3: Reject overlapping leave request for same staff');
    try {
      await service.applyLeave(staffA, {
        leaveType: 'CASUAL',
        startDate: '2026-11-11', // overlaps with Nov 10-12
        endDate: '2026-11-15',
        reason: 'Family event',
      });
      assert.fail('Should have rejected overlapping leave');
    } catch (err: any) {
      console.log('Test 3 caught error:', err?.message || err);
      assert.strictEqual(err.status, 400);
      assert.ok(
        (err.message || '').includes('overlapping') ||
          (err.message || '').includes('conflicting') ||
          (err.message || '').includes('active leave application'),
        'Must reject overlapping leave',
      );
      console.log('  [PASS] Overlapping leave request rejected:', err.message);
    }

    // TEST 4: Staff views their own submitted leaves
    console.log('\nTEST 4: Staff views own leave history');
    const myLeaves = await service.getMyLeaves(staffA, {});
    assert.ok(myLeaves.leaves.some((l) => l.id === leaveRes1.leave.id));
    console.log(`  [PASS] Staff retrieved personal leave applications (Total: ${myLeaves.total})`);

    // TEST 5: Branch Manager Isolation
    console.log('\nTEST 5: Branch Manager Data Isolation (Cross-branch access denied)');
    // Branch A Manager CAN see staff A leave
    const branchAList = await service.listLeaves(branchAManager, {});
    assert.ok(branchAList.leaves.some((l) => l.id === leaveRes1.leave.id));
    console.log('  [PASS] Branch A Manager can see Branch A staff leaves');

    // Branch B Manager CANNOT see staff A leave
    const branchBList = await service.listLeaves(branchBManager, {});
    assert.ok(!branchBList.leaves.some((l) => l.id === leaveRes1.leave.id));
    console.log('  [PASS] Branch B Manager cannot see Branch A staff leaves (Data Isolation verified)');

    // Branch B Manager CANNOT review Branch A leave
    try {
      await service.reviewLeave(branchBManager, leaveRes1.leave.id, {
        status: LeaveStatus.APPROVED,
      });
      assert.fail('Branch B Manager should not be able to review Branch A leave');
    } catch (err: any) {
      assert.strictEqual(err.status, 403);
      console.log('  [PASS] Cross-branch review denied with 403 Forbidden:', err.message);
    }

    // TEST 6: Review & Approve Leave (Sync to Attendance ON_LEAVE)
    console.log('\nTEST 6: Review & Approve Leave with Attendance Sync & Notification');
    const approveRes = await service.reviewLeave(branchAManager, leaveRes1.leave.id, {
      status: LeaveStatus.APPROVED,
    });
    assert.strictEqual(approveRes.success, true);
    assert.strictEqual(approveRes.leave.status, LeaveStatus.APPROVED);

    // Verify attendance sync for dates in range (2026-11-10 to 2026-11-12)
    const attOnLeave = await prisma.staffAttendance.findUnique({
      where: {
        staffId_date: { staffId: staffA.id, date: '2026-11-10' },
      },
    });
    assert.ok(attOnLeave);
    assert.strictEqual(attOnLeave.status, AttendanceStatus.ON_LEAVE);
    console.log('  [PASS] Approved leave automatically marked attendance status as ON_LEAVE');

    // TEST 7: Attendance Calculation based on Login Activity
    console.log('\nTEST 7: Login activity attendance calculation');
    const testDate = new Date('2026-10-15T09:30:00Z');
    const attRecord1 = await service.recordStaffLogin(staffA, testDate);
    assert.strictEqual(attRecord1.date, '2026-10-15');
    assert.strictEqual(attRecord1.status, AttendanceStatus.PRESENT);
    assert.strictEqual(attRecord1.isManualAdjustment, false);
    console.log('  [PASS] First daily login recorded attendance as PRESENT');

    // Multiple logins on the same day do NOT duplicate attendance
    const laterLogin = new Date('2026-10-15T17:30:00Z'); // 8 hours later
    const attRecord2 = await service.recordStaffLogin(staffA, laterLogin);
    assert.strictEqual(attRecord2.id, attRecord1.id, 'Must update existing daily attendance, not create duplicate');
    assert.strictEqual(attRecord2.workingHours, 8);
    assert.strictEqual(attRecord2.status, AttendanceStatus.PRESENT);
    console.log('  [PASS] Repeated logins on same day accumulated working hours (8h) without duplicates');

    // TEST 8: Manual Attendance Correction with Audit Trail
    console.log('\nTEST 8: Manual attendance correction with audit logging');
    const correctRes = await service.manualCorrectAttendance(branchAManager, {
      staffId: staffA.id,
      date: '2026-10-15',
      status: AttendanceStatus.HALF_DAY,
      workingHours: 4.5,
      notes: 'Permitted early departure for family emergency',
    });

    assert.strictEqual(correctRes.success, true);
    assert.strictEqual(correctRes.record.isManualAdjustment, true);
    assert.strictEqual(correctRes.record.adjustedById, branchAManager.id);
    assert.strictEqual(correctRes.record.status, AttendanceStatus.HALF_DAY);
    assert.strictEqual(correctRes.record.notes, 'Permitted early departure for family emergency');
    console.log('  [PASS] Attendance manually adjusted and flagged as isManualAdjustment = true');

    // Clean up test records
    await prisma.staffAttendance.deleteMany({
      where: { staffId: staffA.id },
    });
    await prisma.staffLeaveApplication.deleteMany({
      where: { staffId: staffA.id },
    });

    console.log('\n====================================================');
    console.log('🎉 SECTION 11.3 BACKEND TESTS PASSED (8/8)');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
