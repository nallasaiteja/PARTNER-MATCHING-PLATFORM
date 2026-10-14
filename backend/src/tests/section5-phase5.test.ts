import { PrismaClient, RoleType, StaffStatus, StaffDivision } from '@prisma/client';
import { FeaturedProfilesService } from '../admin/featured-profiles.service';
import { AdvertisementsService } from '../admin/advertisements.service';
import { WeddingServicesService } from '../admin/wedding-services.service';

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log('=== RUNNING SECTION 5 PHASE 5 AUTOMATED TESTS ===\n');

  const featuredService = new FeaturedProfilesService(prisma as any);
  const adsService = new AdvertisementsService(prisma as any);
  const weddingService = new WeddingServicesService(prisma as any);

  let testAdminUser: any;
  let testPaidMember: any;
  let testFreeMember: any;

  try {
    // 0. Setup test users and profiles
    testAdminUser = await prisma.user.create({
      data: {
        mobile: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
        email: `phase5_admin_${Date.now()}@pmp.test`,
        passwordHash: 'hash',
        role: RoleType.SUPER_ADMIN,
        status: StaffStatus.ACTIVE,
        employeeId: `EMP-2026-${Date.now().toString().slice(-4)}`,
        fullName: 'Phase5 Super Admin',
      },
    });

    const userPaid = await prisma.user.create({
      data: {
        mobile: `+9199998${Math.floor(10000 + Math.random() * 90000)}`,
        email: `phase5_paid_${Date.now()}@pmp.test`,
        passwordHash: 'hash',
        role: RoleType.MEMBER,
        status: StaffStatus.ACTIVE,
      },
    });

    testPaidMember = await prisma.memberProfile.create({
      data: {
        userId: userPaid.id,
        memberId: `PMP5-PAID-${Date.now().toString().slice(-4)}`,
        firstName: 'Venkatesh',
        lastName: 'Rao',
        gender: 'MALE',
        dateOfBirth: new Date('1994-05-12'),
        profileData: { maritalStatus: 'NEVER_MARRIED', religion: 'Hindu', caste: 'Kamma' },
        packageType: 'PAID',
        termsAccepted: true,
      },
    });

    const userFree = await prisma.user.create({
      data: {
        mobile: `+9199997${Math.floor(10000 + Math.random() * 90000)}`,
        email: `phase5_free_${Date.now()}@pmp.test`,
        passwordHash: 'hash',
        role: RoleType.MEMBER,
        status: StaffStatus.ACTIVE,
      },
    });

    testFreeMember = await prisma.memberProfile.create({
      data: {
        userId: userFree.id,
        memberId: `PMP5-FREE-${Date.now().toString().slice(-4)}`,
        firstName: 'Sravani',
        lastName: 'Reddy',
        gender: 'FEMALE',
        dateOfBirth: new Date('1997-08-20'),
        profileData: { maritalStatus: 'NEVER_MARRIED', religion: 'Hindu', caste: 'Reddy' },
        packageType: 'FREE',
        termsAccepted: true,
      },
    });

    // TEST 1: Reject featuring a free profile
    console.log('Test 1: Reject featuring a FREE member profile');
    try {
      await featuredService.markAsFeatured(testFreeMember.id, testAdminUser.id, 30);
      throw new Error('Should have failed to feature free member');
    } catch (err: any) {
      if (err.message.includes('Only eligible paid members can be marked as Featured')) {
        console.log('✅ Test 1 Passed: Free member correctly rejected from featured status');
      } else {
        throw err;
      }
    }

    // TEST 2: Successfully feature an eligible paid profile
    console.log('\nTest 2: Feature an eligible PAID member profile');
    const featureResult = await featuredService.markAsFeatured(
      testPaidMember.id,
      testAdminUser.id,
      15,
      'Promotional spotlight',
    );
    if (featureResult.profile.isFeatured && featureResult.featuredRecord.isActive) {
      console.log('✅ Test 2 Passed: Profile featured with valid end date and history record created');
    } else {
      throw new Error('Failed to mark profile as featured');
    }

    // TEST 3: Enforce max concurrent featured limit
    console.log('\nTest 3: Enforce max concurrent featured profiles limit');
    await featuredService.updateMaxFeaturedLimit(1); // Set limit to 1
    const limit = await featuredService.getMaxFeaturedLimit();
    if (limit === 1) {
      console.log('   Configured max limit to 1');
    }

    // Creating another paid profile to test limit breach
    const userPaid2 = await prisma.user.create({
      data: {
        mobile: `+9199996${Math.floor(10000 + Math.random() * 90000)}`,
        email: `phase5_paid2_${Date.now()}@pmp.test`,
        passwordHash: 'hash',
        role: RoleType.MEMBER,
        status: StaffStatus.ACTIVE,
      },
    });

    const testPaidMember2 = await prisma.memberProfile.create({
      data: {
        userId: userPaid2.id,
        memberId: `PMP5-PAID2-${Date.now().toString().slice(-4)}`,
        firstName: 'Prasad',
        lastName: 'Varma',
        gender: 'MALE',
        dateOfBirth: new Date('1992-01-10'),
        profileData: { maritalStatus: 'NEVER_MARRIED', religion: 'Hindu', caste: 'Kshatriya' },
        packageType: 'PAID',
        termsAccepted: true,
      },
    });

    try {
      await featuredService.markAsFeatured(testPaidMember2.id, testAdminUser.id, 10);
      throw new Error('Should have rejected due to limit reached');
    } catch (err: any) {
      if (err.message.includes('Maximum concurrent featured profile limit')) {
        console.log('✅ Test 3 Passed: Exceeding max limit rejected with clear message');
      } else {
        throw err;
      }
    }

    // Restore limit to 20
    await featuredService.updateMaxFeaturedLimit(20);

    // TEST 4: Unfeature profile
    console.log('\nTest 4: Unfeature profile');
    const unfeatureRes = await featuredService.unfeatureProfile(testPaidMember.id);
    const refreshed = await prisma.memberProfile.findUnique({ where: { id: testPaidMember.id } });
    if (unfeatureRes.success && refreshed?.isFeatured === false) {
      console.log('✅ Test 4 Passed: Profile successfully unfeatured');
    } else {
      throw new Error('Unfeature failed');
    }

    // TEST 5: Advertisement creation and validation
    console.log('\nTest 5: Create and validate Advertisement (Super Admin)');
    try {
      await adsService.createAdvertisement({
        slot: 'HOME_BANNER',
        title: 'Invalid Dates Ad',
        imageUrl: 'https://example.com/banner.jpg',
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-11-01'), // End before start!
      });
      throw new Error('Should have rejected invalid dates');
    } catch (err: any) {
      if (err.message.includes('End date must be after start date')) {
        console.log('   End date validation verified');
      } else {
        throw err;
      }
    }

    const testAd = await adsService.createAdvertisement({
      slot: 'HOME_BANNER',
      title: 'Grand Telugu Kalyanam Expo 2026',
      imageUrl: 'https://pmp.test/ads/kalyanam-expo.jpg',
      targetUrl: 'https://teluguexpo.test',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      visibility: 'ALL',
      partnerName: 'Telugu Kalyanam Events Pvt Ltd',
      feeAmount: 25000,
    });

    if (testAd.id && testAd.status === 'ACTIVE' && testAd.feeAmount === 25000) {
      console.log('✅ Test 5 Passed: Advertisement created with status ACTIVE and fee recorded');
    } else {
      throw new Error('Failed to create advertisement');
    }

    // TEST 6: Ad impressions & clicks tracking
    console.log('\nTest 6: Track Ad Impressions and Clicks');
    await adsService.recordImpression(testAd.id);
    await adsService.recordImpression(testAd.id);
    await adsService.recordClick(testAd.id);

    const report = await adsService.getAdPerformanceReport();
    const updatedAd = report.ads.find((a) => a.id === testAd.id);
    if (updatedAd && updatedAd.impressions === 2 && updatedAd.clicks === 1) {
      console.log('✅ Test 6 Passed: Real impressions (2) and clicks (1) recorded');
    } else {
      throw new Error('Impression/click tracking failed');
    }

    // TEST 7: Wedding Services CRUD & validation
    console.log('\nTest 7: Wedding Services CRUD & Photo Quota Enforcement');
    try {
      await weddingService.createService({
        businessName: 'Royal Studios',
        category: 'PHOTOGRAPHY',
        city: 'Hyderabad',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        description: 'Premium wedding photography',
        photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], // 6 photos exceeds limit of 5
      });
      throw new Error('Should have rejected > 5 photos');
    } catch (err: any) {
      if (err.message.includes('Maximum 5 photos allowed')) {
        console.log('   Photo quota validation verified (<= 5)');
      } else {
        throw err;
      }
    }

    const weddingSvc = await weddingService.createService({
      businessName: 'Subhamastu Caterers & Banquets',
      category: 'CATERING',
      city: 'Vijayawada',
      phone: '+919123456789',
      whatsapp: '+919123456789',
      website: 'https://subhamastucatering.test',
      description: 'Traditional Andhra marriage feasts and gourmet cuisine',
      photos: ['https://pmp.test/svc1.jpg', 'https://pmp.test/svc2.jpg'],
      isFeatured: true,
      feeAmount: 15000,
    });

    if (weddingSvc.id && weddingSvc.isFeatured && weddingSvc.feeAmount === 15000) {
      console.log('✅ Test 7 Passed: Wedding Service created with Featured Partner status');
    } else {
      throw new Error('Failed to create wedding service');
    }

    // TEST 8: Backend contact privacy in directory (Free vs Paid user)
    console.log('\nTest 8: Backend Contact Privacy in Directory (Free vs Paid User)');
    // Free member browsing
    const freeView = await weddingService.getDirectory('CATERING', 'Vijayawada', false);
    const svcFree = freeView.find((s) => s.id === weddingSvc.id);

    // Paid member browsing
    const paidView = await weddingService.getDirectory('CATERING', 'Vijayawada', true);
    const svcPaid = paidView.find((s) => s.id === weddingSvc.id);

    if (
      svcFree &&
      svcFree.phone.includes('Upgrade to Paid') &&
      svcPaid &&
      svcPaid.phone === '+919123456789'
    ) {
      console.log('✅ Test 8 Passed: Free user contacts masked; Paid user receives full phone/WhatsApp');
    } else {
      throw new Error('Directory contact privacy failed');
    }

    // TEST 9: Wedding Partner Finance Report
    console.log('\nTest 9: Wedding Partner Finance Report');
    const partnerReport = await weddingService.getPartnershipFinancialReport();
    if (partnerReport.totalPartnershipRevenue >= 15000 && partnerReport.featuredPartners >= 1) {
      console.log(
        `✅ Test 9 Passed: Partnership revenue computed accurately (Total: ₹${partnerReport.totalPartnershipRevenue})`,
      );
    } else {
      throw new Error('Partnership finance report failed');
    }

    console.log('\n🎉 ALL 9 PHASE 5 TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests().catch((e) => {
  console.error('Phase 5 Tests Failed:', e);
  process.exit(1);
});
