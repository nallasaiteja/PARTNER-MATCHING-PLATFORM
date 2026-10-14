import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { StaffService } from '../staff/staff.service';
import { AuditService } from '../common/audit/audit.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
import { AdminDashboardService } from '../admin/admin-dashboard.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const scopeGuard = new ScopeGuardService(prisma);
const staffService = new StaffService(prisma, auditService, scopeGuard);
const dashboardService = new AdminDashboardService(prisma);

async function runTests() {
  console.log('🧪 Starting Section 5 — Phase 1: Admin Dashboard & Staff Management Tests\n');

  let adminUser = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        mobile: `99900${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: 'dummy-hash',
        role: Role.SUPER_ADMIN,
        fullName: 'Super Administrator',
        status: 'ACTIVE',
      },
    });
  }

  const superAdmin = {
    id: adminUser.id,
    role: adminUser.role,
    organizationId: adminUser.organizationId,
  };

  // Test 1: Staff OTP Request
  console.log('📋 Test 1: Request Mobile OTP for Staff Creation');
  const testStaffMobile = `97777${Math.floor(10000 + Math.random() * 90000)}`;
  const otpRes = await staffService.requestStaffOtp(testStaffMobile);
  assert.ok(otpRes.message, 'OTP response message returned');
  console.log('  ✅ PASS: Mobile OTP generated');

  // Test 2: Aadhaar Card Mandatory requirement
  console.log('\n📋 Test 2: Mandatory Aadhaar Card requirement');
  await assert.rejects(
    async () => {
      await staffService.createStaff(superAdmin, {
        fullName: 'Test Staff Without Aadhaar',
        mobile: testStaffMobile,
        password: 'Password@123',
        role: Role.BRANCH_STAFF,
        aadhaarUrl: '', // missing!
        otpCode: '123456',
      });
    },
    /Aadhaar card is uploaded/,
    'Should reject creation without Aadhaar',
  );
  console.log('  ✅ PASS: Staff creation rejected without Aadhaar card');

  // Test 3: OTP Verification requirement
  console.log('\n📋 Test 3: Mandatory Mobile OTP verification requirement');
  await assert.rejects(
    async () => {
      await staffService.createStaff(superAdmin, {
        fullName: 'Test Staff Invalid OTP',
        mobile: testStaffMobile,
        password: 'Password@123',
        role: Role.BRANCH_STAFF,
        aadhaarUrl: 'https://storage.supabase.co/aadhaar-sample.jpg',
        otpCode: '000000', // invalid!
      });
    },
    /mobile OTP is verified/,
    'Should reject creation with invalid OTP',
  );
  console.log('  ✅ PASS: Staff creation rejected with invalid OTP');

  // Test 4: Create Staff with Aadhaar + OTP -> System Employee ID generation
  console.log('\n📋 Test 4: Staff ID generation upon valid Aadhaar & OTP verification');
  const staff = await staffService.createStaff(superAdmin, {
    fullName: 'Venkat Rao',
    mobile: testStaffMobile,
    password: 'Password@123',
    role: Role.BRANCH_STAFF,
    aadhaarUrl: 'https://storage.supabase.co/aadhaar-verified.jpg',
    otpCode: '123456', // development master code
  });

  assert.ok(staff.id, 'Staff created with database ID');
  assert.ok(staff.employeeId?.startsWith('EMP-'), `Employee ID must start with EMP-, got: ${staff.employeeId}`);
  assert.strictEqual(staff.aadhaarVerified, true, 'Aadhaar must be verified');
  assert.strictEqual(staff.mobileVerified, true, 'Mobile must be verified');
  console.log(`  ✅ PASS: Staff created with system Employee ID: ${staff.employeeId}`);

  // Test 5: Staff Status filtering
  console.log('\n📋 Test 5: Staff list filtered by status');
  const activeStaff = await staffService.listStaff(superAdmin, 'ACTIVE');
  assert.ok(activeStaff.length > 0, 'Active staff found');
  console.log(`  ✅ PASS: Found ${activeStaff.length} active staff accounts`);

  // Test 6: Block & Terminate staff
  console.log('\n📋 Test 6: Block staff account');
  await staffService.blockStaff(superAdmin, staff.id);
  const blockedStaff = await staffService.getStaff(superAdmin, staff.id);
  assert.strictEqual(blockedStaff.status, 'BLOCKED', 'Staff status must be BLOCKED');
  console.log('  ✅ PASS: Staff successfully blocked');

  // Test 7: Staff Activity history
  console.log('\n📋 Test 7: Retrieve Staff Activity History');
  const activity = await staffService.getStaffActivityHistory(superAdmin, staff.id);
  assert.ok(Array.isArray(activity.activities), 'Activities list returned');
  console.log(`  ✅ PASS: Activity log retrieved (${activity.activityCount} recorded actions)`);

  // Test 8: Staff Salary & Payment History
  console.log('\n📋 Test 8: Record & Retrieve Staff Salary / Payment History');
  await staffService.addStaffSalary(superAdmin, staff.id, {
    month: '2026-10',
    salaryAmount: 35000,
    incentiveAmount: 5000,
    packageName: 'Gold',
    notes: 'October monthly salary and conversion bonus',
  });
  const salaries = await staffService.getStaffSalaryHistory(superAdmin, staff.id);
  assert.strictEqual(salaries.length, 1, 'One salary record expected');
  assert.strictEqual(salaries[0].salaryAmount, 35000);
  assert.strictEqual(salaries[0].packageName, 'Gold');
  console.log('  ✅ PASS: Salary and commission payment recorded and retrieved');

  // Test 9: Staff Access Rules
  console.log('\n📋 Test 9: Configure Staff Profile Access Rules (ID range, Caste, Gender)');
  const rule = await staffService.setStaffAccessRule(superAdmin, staff.id, {
    idRangeStart: 'M20260001',
    idRangeEnd: 'M20265000',
    allowedCastes: ['Brahmin', 'Kamma', 'Reddy'],
    allowedGenders: ['Female'],
    customSeries: ['TELUGU-HYD'],
  });
  assert.strictEqual(rule.idRangeStart, 'M20260001');
  assert.deepStrictEqual(rule.allowedCastes, ['Brahmin', 'Kamma', 'Reddy']);
  console.log('  ✅ PASS: Staff access rules configured successfully');

  // Test 10: Real Dashboard Aggregated Metrics
  console.log('\n📋 Test 10: HQ Admin Dashboard Metrics Aggregation');
  const dashboard = await dashboardService.getDashboardMetrics(superAdmin);
  assert.ok(dashboard.profileCounts.totalRegistered >= 0, 'Total registered profiles is non-negative');
  assert.ok(Array.isArray(dashboard.profileCounts.packageBreakdown), 'Package breakdown is array');
  assert.ok(typeof dashboard.dailyLiveMetrics.todayRegistrations === 'number');
  assert.ok(Array.isArray(dashboard.charts.revenueTrend));
  assert.ok(Array.isArray(dashboard.charts.memberGrowthTrend));
  assert.ok(Array.isArray(dashboard.charts.orgPerformance));
  assert.ok(Array.isArray(dashboard.alerts.recentActivity));
  console.log(`  ✅ PASS: Dashboard data aggregated live: ${dashboard.profileCounts.totalRegistered} total profiles, ${dashboard.profileCounts.packageBreakdown.length} packages`);

  console.log('\n🎉 ALL 10 SECTION 5 PHASE 1 TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
