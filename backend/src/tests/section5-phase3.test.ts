import * as assert from 'node:assert/strict';
import { PrismaService } from '../prisma/prisma.service';
import { MobileRequestsService } from '../admin/mobile-requests.service';
import { AlertsService } from '../admin/alerts.service';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';

const prisma = new PrismaService();
const auditService = new AuditService(prisma);
const mobileRequestsService = new MobileRequestsService(prisma, auditService);
const alertsService = new AlertsService(prisma, auditService);

async function runTests() {
  console.log('🧪 Starting Section 5 — Phase 3: Mobile Requests & Alerts Module Tests\n');

  // Ensure Admin & Staff actors exist
  let adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        mobile: `99555${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: 'dummy',
        role: Role.ADMIN,
        fullName: 'HQ Admin Officer',
        status: 'ACTIVE',
      },
    });
  }

  // Ensure two member profiles for contact reveal testing
  const user1 = await prisma.user.create({
    data: { mobile: `99444${Math.floor(10000 + Math.random() * 90000)}`, passwordHash: 'dummy', role: Role.MEMBER },
  });
  const senderProfile = await prisma.memberProfile.create({
    data: {
      userId: user1.id,
      memberId: `M2026${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: 'Karthik',
      lastName: 'Varma',
      gender: 'Male',
      dateOfBirth: new Date('1995-03-12'),
      packageType: 'PAID',
      contactsQuota: 50,
      contactsRevealedCount: 0,
      profileData: { maritalStatus: 'Never Married' },
    },
  });

  const user2 = await prisma.user.create({
    data: { mobile: `99555${Math.floor(10000 + Math.random() * 90000)}`, passwordHash: 'dummy', role: Role.MEMBER },
  });
  const receiverProfile = await prisma.memberProfile.create({
    data: {
      userId: user2.id,
      memberId: `M2026${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: 'Pooja',
      lastName: 'Hegde',
      gender: 'Female',
      dateOfBirth: new Date('1997-08-20'),
      packageType: 'FREE',
      profileData: { maritalStatus: 'Never Married' },
    },
  });

  // Create pending contact reveal request
  const contactReq = await prisma.contactRevealRequest.create({
    data: {
      senderProfileId: senderProfile.id,
      receiverProfileId: receiverProfile.id,
      revealType: 'REQUEST_ACCEPTANCE',
      status: 'PENDING',
    },
  });

  // Test 1: List Mobile Requests
  console.log('📋 Test 1: List Mobile Requests across platform');
  const reqList = await mobileRequestsService.listMobileRequests({ status: 'PENDING' });
  assert.ok(reqList.total >= 1, 'At least 1 pending mobile request');
  const foundReq = reqList.requests.find((r) => r.id === contactReq.id);
  assert.ok(foundReq, 'Created request found in list');
  assert.strictEqual(foundReq?.sender.memberId, senderProfile.memberId);
  assert.strictEqual(foundReq?.receiver.memberId, receiverProfile.memberId);
  console.log('  ✅ PASS: Mobile requests listed with sender & receiver demographics');

  // Test 2: Staff accepts request on behalf of member
  console.log('\n📋 Test 2: Staff accepts contact reveal request on behalf of member');
  const acceptRes = await mobileRequestsService.respondOnBehalfOfMember(
    adminUser,
    contactReq.id,
    'ACCEPTED',
  );
  assert.strictEqual(acceptRes.request.status, 'REVEALED');
  assert.strictEqual(acceptRes.request.actionById, adminUser.id);
  assert.strictEqual(acceptRes.request.actionByType, 'STAFF');
  assert.ok(acceptRes.request.revealedAt);

  const updatedSender = await prisma.memberProfile.findUnique({ where: { id: senderProfile.id } });
  assert.strictEqual(updatedSender?.contactsRevealedCount, 1, 'Revealed count incremented');
  console.log('  ✅ PASS: Request accepted by staff; contacts revealed count updated');

  // Test 3: Staff rejects second request
  console.log('\n📋 Test 3: Staff rejects contact reveal request on behalf of member');
  const contactReq2 = await prisma.contactRevealRequest.create({
    data: {
      senderProfileId: receiverProfile.id,
      receiverProfileId: senderProfile.id,
      revealType: 'REQUEST_ACCEPTANCE',
      status: 'PENDING',
    },
  });
  const rejectRes = await mobileRequestsService.respondOnBehalfOfMember(
    adminUser,
    contactReq2.id,
    'REJECTED',
  );
  assert.strictEqual(rejectRes.request.status, 'REJECTED');
  assert.strictEqual(rejectRes.request.actionById, adminUser.id);
  console.log('  ✅ PASS: Request rejected by staff with timestamp and Staff ID');

  // Test 4: Create Payment & Visit Date Reminder
  console.log('\n📋 Test 4: Create Payment & Visit Date Reminder (Alerts Module)');
  const alertDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const reminder = await alertsService.createReminder(adminUser, {
    memberProfileId: senderProfile.id,
    alertDate,
    alertType: 'PAYMENT',
    note: 'Member promised renewal of Gold package on Monday',
  });
  assert.ok(reminder.id);
  assert.strictEqual(reminder.memberProfileId, senderProfile.id);
  assert.strictEqual(reminder.isResolved, false);
  console.log(`  ✅ PASS: Reminder created for member ${reminder.memberProfile.memberId}`);

  // Test 5: List & Resolve Reminder
  console.log('\n📋 Test 5: List and Resolve Reminder');
  const reminders = await alertsService.listReminders({ isResolved: false });
  assert.ok(reminders.length >= 1);
  await alertsService.resolveReminder(reminder.id);
  const resolved = await prisma.paymentAlert.findUnique({ where: { id: reminder.id } });
  assert.strictEqual(resolved?.isResolved, true);
  console.log('  ✅ PASS: Reminder resolved successfully');

  // Test 6: Automated Birthday Wishes Trigger
  console.log('\n📋 Test 6: Automated Birthday Wishes Trigger');
  const bdayRes = await alertsService.triggerBirthdayWishes();
  assert.ok(typeof bdayRes.count === 'number');
  console.log(`  ✅ PASS: Birthday scanner executed successfully (${bdayRes.count} wishes sent)`);

  // Test 7: Festival Greetings Broadcast
  console.log('\n📋 Test 7: Festival Greetings Broadcast & Promotional Offers');
  const festRes = await alertsService.sendFestivalGreetings({
    festivalName: 'Ugadi Special Offer',
    message: 'Happy Ugadi! Get 25% off on Gold and Diamond packages today.',
    offerCode: 'UGADI25',
    discountPercent: 25,
  });
  assert.strictEqual(festRes.festivalName, 'Ugadi Special Offer');
  assert.strictEqual(festRes.status, 'DISPATCHED');
  console.log(`  ✅ PASS: Festival greeting dispatched to ${festRes.recipientsTargeted} members`);

  // Test 8: Branch-Specific Bulk SMS Campaign
  console.log('\n📋 Test 8: Branch Bulk SMS Campaign by ID Range');
  const smsRes = await alertsService.sendBranchBulkSms(adminUser, {
    title: 'Hyderabad Branch Walk-in Mela',
    message: 'Visit our Banjara Hills branch this weekend for free horoscope consultations.',
    targetIdRangeStart: 'M2026000000',
    targetIdRangeEnd: 'M2026999999',
  });
  assert.ok(smsRes.campaign.id);
  assert.strictEqual(smsRes.campaign.title, 'Hyderabad Branch Walk-in Mela');
  console.log(`  ✅ PASS: Bulk SMS campaign created and logged (recipients: ${smsRes.campaign.recipientCount})`);

  // Test 9: SMS Usage Reports per Branch
  console.log('\n📋 Test 9: SMS Usage Counts and Reports');
  const report = await alertsService.getBranchSmsReports();
  assert.ok(Array.isArray(report.branchUsage));
  assert.ok(Array.isArray(report.recentCampaigns));
  console.log(`  ✅ PASS: SMS reports generated across ${report.branchUsage.length} branches`);

  console.log('\n🎉 ALL 9 SECTION 5 PHASE 3 TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
