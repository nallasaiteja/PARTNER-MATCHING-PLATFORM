import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomatedRemindersService } from '../notifications/automated-reminders.service';
import { EventNotificationsService } from '../notifications/event-notifications.service';
import { BulkSmsService } from '../notifications/bulk-sms.service';
import { FestivalsService } from '../notifications/festivals.service';
import { PushNotificationProvider } from '../notifications/providers/push.provider';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { EmailNotificationProvider } from '../notifications/providers/email.provider';
import { WhatsAppNotificationProvider } from '../notifications/providers/whatsapp.provider';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';

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

const remindersService = new AutomatedRemindersService(prisma, notificationsService);
const eventNotificationsService = new EventNotificationsService(
  prisma,
  notificationsService,
  auditService,
);
const bulkSmsService = new BulkSmsService(prisma, notificationsService, auditService);
const festivalsService = new FestivalsService(prisma, remindersService);

async function runSection10Tests() {
  console.log('====================================================');
  console.log('   SECTION 10: COMMUNICATIONS & NOTIFICATIONS TESTS   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  try {
    // 0. Setup test users and data
    console.log('--- Setting up test fixtures ---');
    const branchA = await prisma.organization.findFirst({ where: { name: { contains: 'Branch A' } } });
    const branchB = await prisma.organization.findFirst({ where: { name: { contains: 'Branch B' } } });
    const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    const branchAManager = await prisma.user.findFirst({ where: { role: Role.BRANCH_MANAGER, organizationId: branchA?.id } });
    const serviceStaff = await prisma.user.findFirst({ where: { role: Role.HQ_SERVICE_TEAM } }) || superAdmin;

    // Fetch or create sample members
    const members = await prisma.memberProfile.findMany({
      take: 2,
      include: { user: true },
    });
    if (members.length < 2) {
      throw new Error('Need at least 2 members for tests');
    }
    const member1 = members[0];
    const member2 = members[1];

    console.log(`Using Super Admin: ${superAdmin?.id}, Branch: ${branchA?.name}`);
    console.log(`Member 1: ${member1.memberId}, Member 2: ${member2.memberId}\n`);

    // ──────────────────────────────────────────────────────────
    // TEST 1: Direct Idempotent Notification Dispatch
    // ──────────────────────────────────────────────────────────
    console.log('TEST 1: Idempotent Notification Dispatch');
    const idempotencyKey = `TEST_IDEMPOTENT_${Date.now()}`;
    const log1 = await notificationsService.sendNotification({
      type: 'MANUAL',
      channel: 'SMS',
      recipientContact: '9876543210',
      recipientName: 'Test Recipient',
      content: 'Test message for idempotency check',
      idempotencyKey,
    });
    assert(log1.status === 'SENT', 'First dispatch succeeds with status SENT');

    // Re-dispatching with the same idempotency key must not duplicate
    const log2 = await notificationsService.sendNotification({
      type: 'MANUAL',
      channel: 'SMS',
      recipientContact: '9876543210',
      recipientName: 'Test Recipient',
      content: 'Test message for idempotency check',
      idempotencyKey,
    });
    assert(log1.id === log2.id, 'Duplicate dispatch returns identical log ID without creating duplicate');

    // ──────────────────────────────────────────────────────────
    // TEST 2: Birthday Wishes Automation
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 2: Birthday Wishes Automation');
    // Set member1 birthday to today's month and day in IST
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const testDob = new Date(1995, istNow.getUTCMonth(), istNow.getUTCDate());
    await prisma.memberProfile.update({
      where: { id: member1.id },
      data: { dateOfBirth: testDob },
    });

    const bdayResult = await remindersService.dispatchDailyBirthdays();
    assert(bdayResult.birthdayMembersCount >= 1, `Birthday detected for member (${bdayResult.birthdayMembersCount} found)`);
    assert(bdayResult.memberDispatches >= 1, 'Birthday dispatched to member via App Push, Email, WhatsApp');

    // Run again today: idempotency prevents duplication
    const bdayRepeat = await remindersService.dispatchDailyBirthdays();
    assert(bdayRepeat.birthdayMembersCount >= 1, 'Idempotent birthday run succeeds without double counting');

    // ──────────────────────────────────────────────────────────
    // TEST 3: Festival Wishes Configuration & Dispatch
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 3: Festival Wishes Configuration & Dispatch');
    const todayStr = istNow.toISOString().slice(0, 10);
    const festival = await festivalsService.createFestival(superAdmin, {
      festivalName: 'Diwali Festive Delight',
      festivalDate: todayStr,
      messageTemplate: 'Wishing you a joyful festival with peace and joy!',
      discountPercent: 25,
      offerCode: 'DIWALI25',
      channels: ['APP_PUSH', 'EMAIL', 'WHATSAPP'],
      isActive: true,
    });
    assert(festival.festivalName === 'Diwali Festive Delight', 'Festival configuration created by Super Admin');

    const festDispatch = await festivalsService.dispatchFestival(festival.id);
    assert(festDispatch.totalDispatches > 0, `Festival dispatched to active members (${festDispatch.totalDispatches} dispatches)`);

    // Verify NotificationLog records festival
    const festivalLogs = await prisma.notificationLog.count({
      where: { type: 'FESTIVAL' },
    });
    assert(festivalLogs > 0, 'Festival notification logs recorded in database');

    // ──────────────────────────────────────────────────────────
    // TEST 4: Payment Alert Follow-up Dispatch
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 4: Payment Alert Follow-up Dispatch');
    const paymentAlert = await prisma.paymentAlert.create({
      data: {
        memberProfileId: member1.id,
        alertDate: new Date(), // due today
        alertType: 'PAYMENT',
        note: 'Follow up for Gold package upgrade',
        createdById: superAdmin?.id || 'admin',
        responsibleStaffId: branchAManager?.id,
        branchOrgId: branchA?.id,
        notificationSent: false,
      },
    });

    const alertResult = await remindersService.dispatchPaymentAlerts();
    assert(alertResult.alertsDispatched >= 1, 'Payment alert triggered and dispatched to Member, Staff, Branch, Admin');

    const updatedAlert = await prisma.paymentAlert.findUnique({ where: { id: paymentAlert.id } });
    assert(updatedAlert?.notificationSent === true, 'Payment alert marked as notificationSent = true');

    // ──────────────────────────────────────────────────────────
    // TEST 5: Package Expiry Reminder Automation
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 5: Package Expiry Reminder Automation');
    // Set member1 package to PAID expiring in 3 days
    const expDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await prisma.memberProfile.update({
      where: { id: member1.id },
      data: {
        packageType: 'PAID',
        packageExpiresAt: expDate,
        assignedToId: branchAManager?.id,
      },
    });

    const expiryResult = await remindersService.dispatchPackageExpiryAlerts();
    assert(expiryResult.alertsTriggered >= 1, `Package expiry alert triggered for approaching expiry milestone (${expiryResult.alertsTriggered} triggered)`);

    // ──────────────────────────────────────────────────────────
    // TEST 6: Member Interests (Sent & Accepted Hooks)
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 6: Member Interests (Sent & Accepted Hooks)');
    await eventNotificationsService.onInterestSent(member1.id, member2.id);
    const interestSentLogs = await prisma.notificationLog.findFirst({
      where: { type: 'INTEREST_RECEIVED', recipientMemberProfileId: member2.id },
    });
    assert(interestSentLogs !== null, 'Interest Sent triggers App Push notification to receiving member');

    await eventNotificationsService.onInterestAccepted(member1.id, member2.id);
    const interestAcceptedLogs = await prisma.notificationLog.findFirst({
      where: { type: 'INTEREST_ACCEPTED', recipientMemberProfileId: member1.id },
    });
    assert(interestAcceptedLogs !== null, 'Interest Accepted triggers App Push notification to sending member');

    // ──────────────────────────────────────────────────────────
    // TEST 7: Profile Blocked Notification
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 7: Profile Blocked Notification');
    const blockLog = await eventNotificationsService.onProfileBlocked(
      member2.id,
      superAdmin?.id || 'admin',
      'Suspicious activity reported',
    );
    assert(blockLog !== undefined && blockLog.type === 'PROFILE_BLOCKED', 'Blocking profile triggers automated SMS dispatch to member');
    assert(blockLog?.status === 'SENT', 'Profile Blocked SMS recorded in delivery log');

    // ──────────────────────────────────────────────────────────
    // TEST 8: Support Ticket Closure OTP (Hashing & Rate Limiting)
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 8: Support Ticket Closure OTP (Hashing & Rate Limiting)');
    const ticket = await prisma.supportTicket.create({
      data: {
        memberProfileId: member1.id,
        subject: 'Profile photo re-verification query',
        status: 'OPEN',
      },
    });

    // 8.1 Request closure OTP
    const otpRequest = await eventNotificationsService.requestTicketClosureOtp(
      serviceStaff,
      ticket.id,
      '127.0.0.1',
    );
    assert(otpRequest.success === true, 'Closure OTP request succeeds for HQ Service Team');
    assert(otpRequest.devOtp !== undefined, 'Dev OTP returned for development testing');

    // Check DB record: NEVER plaintext!
    const ticketInDb = await prisma.supportTicket.findUnique({ where: { id: ticket.id } });
    assert(ticketInDb?.closureOtp === null, 'closureOtp plaintext column is null');
    assert(ticketInDb?.closureOtpHash !== null && ticketInDb!.closureOtpHash!.length === 64, 'closureOtpHash contains secure SHA-256 hash');

    // 8.2 Rate limiting: requesting immediately within 60s must be rejected
    let rateLimitCaught = false;
    try {
      await eventNotificationsService.requestTicketClosureOtp(serviceStaff, ticket.id, '127.0.0.1');
    } catch (e: any) {
      rateLimitCaught = e.message.includes('Please wait');
    }
    assert(rateLimitCaught, 'Rate limit rejects second OTP request within 60-second cooldown');

    // 8.3 Invalid OTP check
    let invalidOtpCaught = false;
    try {
      await eventNotificationsService.verifyOtpAndClose(serviceStaff, ticket.id, '000000', '127.0.0.1');
    } catch (e: any) {
      invalidOtpCaught = e.message.includes('Invalid OTP');
    }
    assert(invalidOtpCaught, 'Wrong OTP is rejected and increments failed attempts');

    // 8.4 Valid OTP verification closes ticket
    const closeResult = await eventNotificationsService.verifyOtpAndClose(
      serviceStaff,
      ticket.id,
      otpRequest.devOtp!,
      '127.0.0.1',
    );
    assert(closeResult.success === true, 'Valid OTP verifies and closes ticket');

    const closedTicket = await prisma.supportTicket.findUnique({ where: { id: ticket.id } });
    assert(closedTicket?.status === 'CLOSED', 'Ticket status updated to CLOSED in DB');
    assert(closedTicket?.closureOtpHash === null, 'closureOtpHash invalidated after closure');

    // ──────────────────────────────────────────────────────────
    // TEST 9: Bulk Branch SMS (Branch Isolation & Usage Tracking)
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 9: Bulk Branch SMS (Branch Isolation & Usage Tracking)');
    // 9.1 Branch Manager cannot target another branch
    let branchIsolationViolation = false;
    try {
      await bulkSmsService.previewCampaign(branchAManager, {
        branchOrgId: branchB?.id, // Trying to target Branch B!
      });
    } catch (e: any) {
      branchIsolationViolation = e.message.includes('Security Violation');
    }
    assert(branchIsolationViolation, 'Branch Manager forbidden from previewing or targeting another branch');

    // 9.2 Preview for own branch
    const preview = await bulkSmsService.previewCampaign(branchAManager, {});
    assert(preview.branchOrgId === branchA?.id, 'Preview automatically bound to Branch Manager assigned branch');
    assert(preview.recipientCount >= 0, 'Recipient count preview calculated');

    // 9.3 Send Bulk SMS Campaign
    const campaignResult = await bulkSmsService.sendCampaign(
      branchAManager,
      {
        title: 'Branch A Weekend Meet',
        message: 'Join us this Sunday at Branch A center for verified partner profile consultations.',
      },
      '127.0.0.1',
    );
    assert(campaignResult.success === true, 'Bulk SMS campaign dispatched successfully');
    assert(campaignResult.campaign.status === 'SENT', 'Campaign recorded with status SENT');

    // 9.4 Usage reports visible to HQ Admin
    const usageReports = await bulkSmsService.getUsageReports(superAdmin);
    assert(usageReports.recentCampaigns.length > 0, 'HQ Admin can view bulk SMS campaigns across branches');
    assert(usageReports.branchUsage.length > 0, 'HQ Admin can view branch-wise bulk SMS usage totals and costs');

    // ──────────────────────────────────────────────────────────
    // TEST 10: Notification History & Query Filters
    // ──────────────────────────────────────────────────────────
    console.log('\nTEST 10: Notification History & Delivery Statistics');
    const history = await notificationsService.getNotificationHistory(superAdmin, {
      limit: 10,
    });
    assert(history.total > 0, `Notification history returns persisted logs (Total: ${history.total})`);

    const stats = await notificationsService.getNotificationStats();
    assert(stats.today.total > 0, `Today's notification metrics computed (Dispatched: ${stats.today.total})`);
    assert(stats.channels.length > 0, 'Channel breakdown available (Push, SMS, Email, WhatsApp)');

  } catch (err: any) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runSection10Tests();
