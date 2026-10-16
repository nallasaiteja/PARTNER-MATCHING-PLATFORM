import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { CareersService } from '../careers/careers.service';
import { Role } from '../common/constants/roles.constants';
import * as assert from 'assert';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING SECTION 11.2 — CAREERS MODULE TESTS');
  console.log('====================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const smsProvider = new SmsNotificationProvider();
  const service = new CareersService(prisma, auditService, smsProvider);

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    const adminActor = { id: adminUser?.id || 'user-super-admin', role: 'SUPER_ADMIN' };

    const testMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testIdProofNumber = `TESTAADHAAR${Date.now()}`;
    const testEmail = `applicant_${Date.now()}@pmp.test`;

    // 1. Test: Mobile OTP request & verification
    console.log('TEST 1: Career application mobile OTP generation & verification');
    const otpRes = await service.sendOtp({ mobile: testMobile });
    assert.strictEqual(otpRes.success, true);
    assert.ok(otpRes.devOtp, 'Development OTP should be returned for test runner');
    console.log(`  [PASS] OTP generated successfully for ${testMobile}: ${otpRes.devOtp}`);

    const verifyRes = await service.verifyOtp({ mobile: testMobile, otp: otpRes.devOtp! });
    assert.strictEqual(verifyRes.success, true);
    console.log('  [PASS] Mobile OTP verified and marked in database');

    // 2. Test: Submit full application with all required fields
    console.log('\nTEST 2: Submit comprehensive career application');
    const appPayload = {
      mobile: testMobile,
      otp: otpRes.devOtp!,
      name: 'Ravi',
      surname: 'Kiran',
      gender: 'MALE',
      maritalStatus: 'NEVER_MARRIED',
      email: testEmail,
      dateOfBirth: '1996-05-14',
      religion: 'Hindu',
      caste: 'Kapu',

      state: 'Andhra Pradesh',
      district: 'Krishna',
      mandal: 'Vijayawada Urban',
      temporaryAddress: 'Flat 402, Sai Residency, Benz Circle, Vijayawada',
      permanentAddress: 'H.No 3-12, Main Road, Gudiwada, Krishna District',

      idProofType: 'AADHAAR',
      idProofNumber: testIdProofNumber,
      idProofUrl: '/uploads/careers/aadhaar-doc-sample.pdf',
      panCardUrl: '/uploads/careers/pancard-sample.jpg',

      educationDetails: [
        { qualification: '10TH', yearOfPassing: '2012', educationType: 'REGULAR', certificateUrl: '/uploads/careers/10th.pdf' },
        { qualification: 'INTERMEDIATE', yearOfPassing: '2014', educationType: 'REGULAR', certificateUrl: '/uploads/careers/inter.pdf' },
        { qualification: 'DEGREE', yearOfPassing: '2017', educationType: 'REGULAR', certificateUrl: '/uploads/careers/degree.pdf' },
      ],
      experienceYears: 4.5,
      fatherName: 'Venkata Rao',
      fatherProfession: 'Retired Teacher',
      motherName: 'Lakshmi',
      motherProfession: 'Homemaker',

      referenceName: 'Narayana Murthy',
      referenceMobile: '9848022338',
      referenceAddress: 'Vijayawada',

      photos: [
        '/uploads/careers/photo1.jpg',
        '/uploads/careers/photo2.jpg',
      ],
      timeTakenSeconds: 345, // ~5 minutes 45 seconds
    };

    const submitRes = await service.submitApplication(appPayload);
    assert.strictEqual(submitRes.success, true);
    assert.ok(submitRes.applicationNumber.startsWith('CAR-'), 'Application number should be formatted CAR-YYYY-XXXX');
    console.log(`  [PASS] Career application submitted: ${submitRes.applicationNumber} (ID: ${submitRes.id})`);

    // 3. Test: Prevent duplicate applications with the same ID Proof Number
    console.log('\nTEST 3: Prevent duplicate applications by ID Proof Number');
    try {
      await service.submitApplication({
        ...appPayload,
        email: `another_${Date.now()}@pmp.test`,
        mobile: `919988776655`,
      });
      assert.fail('Should have rejected duplicate ID proof number');
    } catch (err: any) {
      console.log('Test 3 caught:', err?.message || err);
      assert.strictEqual(err.status, 400);
      assert.ok(
        (err.message || '').includes('already exists') || (err.message || '').includes('already been submitted'),
        'Must specify duplicate ID proof constraint',
      );
      console.log('  [PASS] Rejected duplicate application with matching ID Proof Number:', err.message);
    }

    // 4. Test: Admin application listing & multi-field search
    console.log('\nTEST 4: Admin application listing & search by mobile/name/ID proof');
    const searchByName = await service.listApplications({ search: 'Ravi' });
    const foundByName = searchByName.applications.find((a) => a.id === submitRes.id);
    assert.ok(foundByName, 'Search by name must find application');
    assert.strictEqual(foundByName.timeTakenSeconds, 345);

    const searchByMobile = await service.listApplications({ search: testMobile });
    assert.ok(searchByMobile.applications.some((a) => a.id === submitRes.id), 'Search by mobile must find application');

    const searchByIdProof = await service.listApplications({ search: testIdProofNumber });
    assert.ok(searchByIdProof.applications.some((a) => a.id === submitRes.id), 'Search by ID proof must find application');
    console.log('  [PASS] Application searchable by name, mobile, and ID proof number');

    // 5. Test: View full application
    console.log('\nTEST 5: View full application details');
    const fullApp = await service.getApplication(submitRes.id);
    assert.strictEqual(fullApp.email, testEmail);
    assert.strictEqual(fullApp.name, 'Ravi');
    assert.strictEqual(fullApp.surname, 'Kiran');
    assert.strictEqual(fullApp.experienceYears, 4.5);
    assert.ok(Array.isArray(fullApp.educationDetails as any), 'Education details must be an array');
    console.log('  [PASS] Full application retrieved with all education and document links');

    // 6. Test: Block Application
    console.log('\nTEST 6: Block application with reason');
    const blockReason = 'Incomplete certificate documents provided during preliminary screening.';
    const blockedApp = await service.blockApplication(submitRes.id, { reason: blockReason }, adminActor);
    assert.strictEqual(blockedApp.status, 'BLOCKED');
    assert.strictEqual(blockedApp.blockedReason, blockReason);
    assert.ok(blockedApp.blockedAt);
    assert.strictEqual(blockedApp.blockedById, adminActor.id);
    console.log('  [PASS] Application successfully blocked with audit details');

    // 7. Test: Blocked application cannot be registered as staff
    console.log('\nTEST 7: Reject staff registration for blocked application');
    try {
      await service.registerAsStaff(
        submitRes.id,
        { role: Role.BRANCH_STAFF },
        adminActor,
      );
      assert.fail('Should not allow registering blocked application');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Blocked application prevented from staff registration:', err.message);
    }

    // 8. Test: Reset status to PENDING & Register as Staff
    console.log('\nTEST 8: Register eligible applicant as staff');
    await prisma.careerApplication.update({
      where: { id: submitRes.id },
      data: { status: 'PENDING', blockedReason: null, blockedAt: null, blockedById: null },
    });

    const regStaffRes = await service.registerAsStaff(
      submitRes.id,
      {
        role: Role.BRANCH_STAFF,
        staffDivision: 'HQ_SERVICE_TEAM',
        temporaryPassword: 'TempStaffPassword@2026',
      },
      adminActor,
    );

    assert.strictEqual(regStaffRes.success, true);
    assert.ok(regStaffRes.staffUser.id, 'Staff user account created');
    assert.ok(regStaffRes.staffUser.employeeId.startsWith('EMP-'), 'Employee ID generated');
    assert.strictEqual(regStaffRes.staffUser.mobile, testMobile);
    assert.strictEqual(regStaffRes.staffUser.role, Role.BRANCH_STAFF);

    // Verify application status updated to REGISTERED_AS_STAFF
    const appAfterReg = await prisma.careerApplication.findUnique({ where: { id: submitRes.id } });
    assert.strictEqual(appAfterReg?.status, 'REGISTERED_AS_STAFF');
    assert.strictEqual(appAfterReg?.registeredStaffId, regStaffRes.staffUser.id);
    assert.ok(appAfterReg?.registeredAt);
    console.log(`  [PASS] Applicant successfully registered as staff: ${regStaffRes.staffUser.employeeId} (${regStaffRes.staffUser.id})`);

    // 9. Test: Prevent duplicate repeated registration
    console.log('\nTEST 9: Prevent repeated registration of already registered application');
    try {
      await service.registerAsStaff(
        submitRes.id,
        { role: Role.BRANCH_STAFF },
        adminActor,
      );
      assert.fail('Should prevent duplicate registration');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      console.log('  [PASS] Accidental duplicate staff registration prevented:', err.message);
    }

    // Clean up created test staff user and career application
    await prisma.user.delete({ where: { id: regStaffRes.staffUser.id } });
    await prisma.careerApplication.delete({ where: { id: submitRes.id } });
    await prisma.careerOtpVerification.deleteMany({ where: { mobile: testMobile } });

    console.log('\n====================================================');
    console.log('🎉 SECTION 11.2 BACKEND TESTS PASSED (9/9)');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
