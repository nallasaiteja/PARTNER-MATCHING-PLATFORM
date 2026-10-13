import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { MembersService } from '../members/members.service';
import { PackagesService } from '../members/packages.service';
import { AuditService } from '../common/audit/audit.service';
import { calculateProfileCompletion } from '../profiles/profile-completion';
import { isVerifiedMatch, isMutualMatch } from '../profiles/matching-engine';

const prisma = new PrismaService();
const jwtService = new JwtService();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, jwtService, auditService);
const membersService = new MembersService(prisma, auditService);
const packagesService = new PackagesService(prisma, auditService);

async function runTests() {
  console.log('🧪 Starting Section 4 — Member Platform Tests\n');

  // Test 1: Terms & Conditions
  console.log('📋 Test 1: Terms & Conditions config retrieval');
  const terms = await authService.getTermsAndConditions();
  assert.ok(terms, 'Terms should exist');
  console.log('  ✅ PASS: Terms retrieved successfully');

  // Test 2: Registration OTP Request
  console.log('\n📋 Test 2: Registration OTP Request (Development mode safe handling)');
  const testMobile = `98888${Math.floor(10000 + Math.random() * 90000)}`;
  const otpRes = await authService.requestRegistrationOtp({
    recipient: testMobile,
    channel: 'mobile',
  });
  assert.ok(otpRes.message, 'OTP response message returned');
  console.log('  ✅ PASS: OTP requested with safe handling');

  // Test 3: Quick Registration
  console.log('\n📋 Test 3: Member Registration with Quick ID creation & Terms Acceptance');
  // Access internal OTP for test
  const cachedOtp = (authService as any).registrationOtps.get(testMobile);
  assert.ok(cachedOtp, 'Registration challenge must be stored');

  // Emulate valid OTP code verification
  // Instead of guessing hash, set a known code in challenge
  const bcrypt = await import('bcrypt');
  const testCode = '123456';
  cachedOtp.hash = await bcrypt.hash(testCode, 10);

  const regRes = await authService.registerMember({
    firstName: 'Raghav',
    lastName: 'Sharma',
    gender: 'Male',
    dateOfBirth: '1996-06-15',
    maritalStatus: 'Unmarried',
    religion: 'Hindu',
    caste: 'Brahmin',
    mobile: testMobile,
    password: 'Password@123',
    otpCode: testCode,
    channel: 'mobile',
    termsAccepted: true,
  });

  assert.ok(regRes.accessToken, 'Access token issued');
  assert.ok(regRes.memberProfile.memberId, 'Member ID generated');
  assert.equal(regRes.memberProfile.createdByType, 'MEMBER');
  assert.equal(regRes.memberProfile.termsAccepted, true);
  console.log(`  ✅ PASS: Member registered with ID: ${regRes.memberProfile.memberId}`);

  // Test 4: Multi-method Login
  console.log('\n📋 Test 4: Multi-method Login');
  // A. Mobile + Password
  const loginByMobile = await authService.login({
    mobile: testMobile,
    password: 'Password@123',
  });
  assert.ok(loginByMobile.accessToken, 'Login by mobile successful');
  console.log('  ✅ PASS: Login with Mobile + Password');

  // B. Member ID + Password
  const loginById = await authService.login({
    memberId: regRes.memberProfile.memberId,
    password: 'Password@123',
  });
  assert.ok(loginById.accessToken, 'Login by Member ID successful');
  console.log('  ✅ PASS: Login with Member ID + Password');

  // Test 5: Profile Completion calculation
  console.log('\n📋 Test 5: Profile Completion below 70% threshold & missing fields');
  const freshMember = await prisma.memberProfile.findUnique({
    where: { id: regRes.memberProfile.id },
    include: { user: true },
  });
  const completionBelow70 = calculateProfileCompletion(freshMember);
  assert.ok(completionBelow70.percentage < 70, 'Quick ID profile should be below 70%');
  assert.ok(completionBelow70.missingFields.length > 0, 'Missing fields list should be populated');
  assert.equal(completionBelow70.isComplete70Plus, false);
  console.log(`  ✅ PASS: Completion is ${completionBelow70.percentage}%, < 70% properly flagged`);

  // Test 6: Section 4.2 Browse Restriction below 70%
  console.log('\n📋 Test 6: Verified View below 70% restrictions (Count only, no profiles)');
  const verifiedRes = await membersService.getVerifiedMatches(freshMember!.userId, {});
  assert.equal(verifiedRes.isRestricted, true);
  assert.equal(verifiedRes.results.length, 0);
  assert.ok(typeof verifiedRes.compatibleCount === 'number');
  assert.ok(verifiedRes.message.includes('compatible profiles exist'));
  console.log(`  ✅ PASS: Browse restricted with message: "${verifiedRes.message}"`);

  // Test 7: Update profile to reach >= 70%
  console.log('\n📋 Test 7: Profile Completion at >= 70% unlock');
  await prisma.memberProfile.update({
    where: { id: freshMember!.id },
    data: {
      idProofFileUrl: '/uploads/idproof.pdf',
      profileData: {
        step1: {
          maritalStatus: 'Unmarried',
          religion: 'Hindu',
          caste: 'Brahmin',
          height: `5'10"`,
          district: 'Hyderabad',
          mobile: testMobile,
        },
        step2: {
          education: 'B.Tech / B.E.',
          employedIn: 'Private',
          profession: 'Software Engineer',
          annualIncome: '1500000',
        },
        step3: {
          fatherName: 'Venkatesh Sharma',
          fatherStatus: 'Alive',
          motherName: 'Lakshmi Sharma',
          motherStatus: 'Alive',
          familyStatus: 'Middle Class',
        },
        step4: {
          preferredMaritalStatus: ['Unmarried'],
          ageRangeMin: 22,
          ageRangeMax: 30,
          heightRangeMin: `5'2"`,
          heightRangeMax: `5'8"`,
          interCasteAllowed: false,
        },
        step5: {
          idProofUploaded: true,
          mobileVerified: true,
        },
      },
    },
  });

  const updatedProfile = await prisma.memberProfile.findUnique({
    where: { id: freshMember!.id },
    include: { user: true },
  });
  const completionAbove70 = calculateProfileCompletion(updatedProfile);
  assert.ok(completionAbove70.percentage >= 70, 'Updated profile should be >= 70%');
  assert.equal(completionAbove70.isComplete70Plus, true);
  console.log(`  ✅ PASS: Profile completion is now ${completionAbove70.percentage}% (>= 70%)`);

  // Test 8: Free Member Match Listing privacy rules
  console.log('\n📋 Test 8: Free Member Match Privacy (Basic fields only, photo & contact hidden)');
  const unlockedMatches = await membersService.getVerifiedMatches(freshMember!.userId, {});
  assert.equal(unlockedMatches.isRestricted, false);
  if (unlockedMatches.results.length > 0) {
    const firstMatch = unlockedMatches.results[0];
    assert.equal(firstMatch.photoUrl, null, 'Photos must be hidden for Free members');
    assert.equal(firstMatch.isPhotoHidden, true);
    assert.equal(firstMatch.mobile, null, 'Phone must be hidden for Free members');
    assert.ok(firstMatch.name, 'Name must be visible');
    assert.ok(firstMatch.caste, 'Caste must be visible');
    assert.ok(firstMatch.education, 'Education must be visible');
  }
  console.log('  ✅ PASS: Free member cannot see photos or contact details');

  // Test 9: Caste Converted Special Browsing Rule
  console.log('\n📋 Test 9: Caste Converted Verified View rule (Only converted profiles shown)');
  const convertedUser = {
    id: 'converted-1',
    gender: 'Male',
    dateOfBirth: new Date('1995-01-01'),
    isBlocked: false,
    profileData: {
      step1: {
        religion: 'Caste Converted',
        isConverted: true,
        maritalStatus: 'Unmarried',
      },
    },
  };
  const normalCandidate = {
    id: 'cand-1',
    gender: 'Female',
    dateOfBirth: new Date('1997-01-01'),
    isBlocked: false,
    profileData: {
      step1: { religion: 'Hindu', caste: 'Reddy', maritalStatus: 'Unmarried' },
    },
  };
  const convertedCandidate = {
    id: 'cand-2',
    gender: 'Female',
    dateOfBirth: new Date('1997-01-01'),
    isBlocked: false,
    profileData: {
      step1: { religion: 'Caste Converted', isConverted: true, maritalStatus: 'Unmarried' },
    },
  };

  assert.equal(isVerifiedMatch(convertedUser, normalCandidate), false, 'Normal profile must be excluded for converted member');
  assert.equal(isVerifiedMatch(convertedUser, convertedCandidate), true, 'Converted candidate must match converted member');
  console.log('  ✅ PASS: Caste-converted rule verified');

  // Test 10: Matched View Mutual Compatibility Rule
  console.log('\n📋 Test 10: Matched View Mutual Compatibility Rule');
  const userA = {
    id: 'A',
    gender: 'Male',
    dateOfBirth: new Date('1994-01-01'), // Age 32
    isBlocked: false,
    profileData: {
      step1: { caste: 'Kamma', maritalStatus: 'Unmarried' },
      step4: {
        ageRangeMin: 24,
        ageRangeMax: 30,
        preferredMaritalStatus: ['Unmarried'],
        interCasteAllowed: false,
      },
    },
  };
  const userBCompatible = {
    id: 'B',
    gender: 'Female',
    dateOfBirth: new Date('1998-01-01'), // Age 28
    isBlocked: false,
    profileData: {
      step1: { caste: 'Kamma', maritalStatus: 'Unmarried' },
      step4: {
        ageRangeMin: 30,
        ageRangeMax: 35,
        preferredMaritalStatus: ['Unmarried'],
        interCasteAllowed: false,
      },
    },
  };
  const userCIncompatibleAge = {
    id: 'C',
    gender: 'Female',
    dateOfBirth: new Date('2003-01-01'), // Age 23 (A wants min 24)
    isBlocked: false,
    profileData: {
      step1: { caste: 'Kamma', maritalStatus: 'Unmarried' },
      step4: {
        ageRangeMin: 30,
        ageRangeMax: 35,
        preferredMaritalStatus: ['Unmarried'],
        interCasteAllowed: false,
      },
    },
  };

  assert.equal(isMutualMatch(userA, userBCompatible), true, 'Compatible preferences must match');
  assert.equal(isMutualMatch(userA, userCIncompatibleAge), false, 'Age outside bounds must fail');
  console.log('  ✅ PASS: Mutual compatibility matching verified');

  // Test 11: Contact Revelation with Paid Package
  console.log('\n📋 Test 11: Paid Member Contact Revelation (0 Hours preference)');
  const paidMemberUser = await prisma.user.findUnique({
    where: { id: 'user-member-paid' },
  });
  assert.ok(paidMemberUser, 'Paid member user exists');

  const targetForReveal = await prisma.memberProfile.findFirst({
    where: {
      gender: 'Male',
      id: { not: 'profile-paid' },
    },
    include: { user: true },
  });

  if (targetForReveal) {
    const revealRes = await membersService.revealContact(paidMemberUser!.id, targetForReveal.id);
    assert.ok(revealRes.status, 'Status returned');
    assert.ok(revealRes.message, 'Message returned');
    console.log(`  ✅ PASS: Contact reveal executed with status: ${revealRes.status}`);
  }

  // Test 12: Packages & Upgrade Plan
  console.log('\n📋 Test 12: Packages Module & Upgrade Invoice');
  const packages = await packagesService.listActivePackages();
  assert.ok(packages.length >= 4, 'At least 4 packages configured');
  assert.ok(packages.find((p) => p.name === 'Silver'), 'Silver package exists');
  assert.ok(packages.find((p) => p.name === 'Diamond VIP'), 'Diamond VIP package exists');

  const invoiceRes = await packagesService.upgradePackage(
    regRes.memberProfile.id,
    { id: regRes.user.id, role: 'MEMBER' },
    { packageId: packages[0].id, paymentMode: 'UPI' },
  );
  assert.equal(invoiceRes.status, 'PENDING_APPROVAL');
  assert.ok(invoiceRes.invoice.invoiceNumber, 'Unique invoice number generated');
  console.log(`  ✅ PASS: Invoice ${invoiceRes.invoice.invoiceNumber} created in PENDING status`);

  console.log('\n🎉 ALL 12 SECTION 4 BACKEND TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
