import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
import { AuditService } from '../common/audit/audit.service';
import { UploadService } from '../upload/upload.service';
import { MembersService } from '../members/members.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomatedRemindersService } from '../notifications/automated-reminders.service';
import { PushNotificationProvider } from '../notifications/providers/push.provider';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { EmailNotificationProvider } from '../notifications/providers/email.provider';
import { WhatsAppNotificationProvider } from '../notifications/providers/whatsapp.provider';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '../common/constants/roles.constants';
import * as fs from 'node:fs';
import * as path from 'node:path';

const prisma = new PrismaService();
const scopeGuard = new ScopeGuardService(prisma);
const auditService = new AuditService(prisma);
const profilesService = new ProfilesService(prisma, auditService, scopeGuard);
const uploadService = new UploadService(prisma, scopeGuard);
const membersService = new MembersService(prisma, auditService);

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

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('       PHASE 1: OPERATIONAL POLISH TEST SUITE       ');
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
    // 0. Locate test actors
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN, status: 'ACTIVE' },
    });
    const branchAgent = await prisma.user.findFirst({
      where: { role: Role.BRANCH_AGENT, status: 'ACTIVE' },
    });

    if (!adminUser) throw new Error('No ADMIN user found in database');

    // 1. Locate test member profile
    let testProfile = await prisma.memberProfile.findFirst({
      where: { isBlocked: false },
      include: { user: true },
    });

    if (!testProfile || !testProfile.user) {
      throw new Error('No test member profile found in database');
    }

    // Ensure the test profile has an uploaded ID proof file url so review can proceed
    if (!testProfile.idProofFileUrl) {
      testProfile = await prisma.memberProfile.update({
        where: { id: testProfile.id },
        data: {
          idProofFileUrl: '/uploads/id-proofs/sample-aadhaar-test.pdf',
          profileData: {
            step5: {
              idProofUploaded: true,
              idProofVerified: false,
              idProofStatus: 'PENDING_REVIEW',
            },
          },
        },
        include: { user: true },
      });
    }

    const memberActor = {
      id: testProfile.user.id,
      role: Role.MEMBER,
      organizationId: testProfile.ownerOrgId,
    };
    const adminActor = {
      id: adminUser.id,
      role: Role.ADMIN,
      organizationId: null,
    };
    const agentActor = branchAgent
      ? { id: branchAgent.id, role: Role.BRANCH_AGENT, organizationId: branchAgent.organizationId }
      : { id: 'fake-agent-id', role: Role.BRANCH_AGENT, organizationId: null };

    console.log(`Test Subject: Profile ${testProfile.memberId} (ID: ${testProfile.id})\n`);

    // ----------------------------------------------------
    // TEST GROUP 1: ID PROOF REJECTION MODAL & VALIDATION
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: ID Proof Rejection & Validation ---');

    // Test 1.1: Rejection without a reason should throw BadRequestException
    let threwWithoutReason = false;
    try {
      await profilesService.verifyIdProof(adminActor, testProfile.id, false, '');
    } catch (err: any) {
      threwWithoutReason = err instanceof BadRequestException;
    }
    assert(threwWithoutReason, 'Rejection without reason throws BadRequestException');

    // Test 1.2: Rejection with reason < 5 chars should throw BadRequestException
    let threwShortReason = false;
    try {
      await profilesService.verifyIdProof(adminActor, testProfile.id, false, ' bad');
    } catch (err: any) {
      threwShortReason = err instanceof BadRequestException;
    }
    assert(threwShortReason, 'Rejection with reason < 5 chars throws BadRequestException');

    // Test 1.3: MEMBER or AGENT cannot verify/reject ID proof (403 Forbidden)
    let threwMemberUnauthorized = false;
    try {
      await profilesService.verifyIdProof(memberActor, testProfile.id, false, 'Legitimate reason but member');
    } catch (err: any) {
      threwMemberUnauthorized = err instanceof ForbiddenException;
    }
    assert(threwMemberUnauthorized, 'MEMBER attempting to verify/reject ID proof gets ForbiddenException');

    let threwAgentUnauthorized = false;
    try {
      await profilesService.verifyIdProof(agentActor, testProfile.id, false, 'Legitimate reason but agent');
    } catch (err: any) {
      threwAgentUnauthorized = err instanceof ForbiddenException;
    }
    assert(threwAgentUnauthorized, 'BRANCH_AGENT attempting to verify/reject ID proof gets ForbiddenException');

    // Test 1.4: Reviewer confirms rejection with meaningful reason
    const validReason = 'Document image is blurred and Aadhaar number cannot be verified.';
    const rejectionResult = await profilesService.verifyIdProof(adminActor, testProfile.id, false, validReason);

    const step5AfterRejection = (rejectionResult.profileData as any)?.step5;
    assert(
      step5AfterRejection?.idProofStatus === 'REJECTED' &&
        step5AfterRejection?.idProofRejectionReason === validReason &&
        step5AfterRejection?.idProofVerified === false &&
        Boolean(step5AfterRejection?.idProofRejectedBy) &&
        Boolean(step5AfterRejection?.idProofRejectedAt),
      'Reviewer can reject ID proof; rejection reason, status, reviewer ID, and timestamp saved in Supabase',
    );

    // Test 1.5: Rejection notification created for member
    const memberNotification = await prisma.notificationLog.findFirst({
      where: {
        recipientMemberProfileId: testProfile.id,
        type: 'ID_PROOF_VERIFICATION',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      Boolean(memberNotification) && memberNotification?.content?.includes('rejected'),
      'Member receives notification explaining that ID proof was rejected with reason',
    );

    // ----------------------------------------------------
    // TEST GROUP 2: MEMBER VISIBILITY & RESUBMISSION
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Member Visibility & Resubmission ---');

    // Test 2.1: Member dashboard displays rejection status & reason
    const memberDashboard = await membersService.getDashboard(testProfile.user.id);
    assert(
      memberDashboard.verification?.idProofStatus === 'REJECTED' &&
        memberDashboard.verification?.idProofRejectionReason === validReason,
      'Member dashboard returns idProofStatus: REJECTED and rejectionReason to member',
    );

    // Test 2.2: Member can correct and resubmit ID proof
    const proofDirectory = path.join(process.cwd(), 'uploads', 'id-proofs');
    fs.mkdirSync(proofDirectory, { recursive: true });
    const dummyProofPath = path.join(proofDirectory, `resubmitted-test-${Date.now()}.png`);
    fs.writeFileSync(dummyProofPath, 'test-proof-content');

    const fakeMulterFile = {
      path: dummyProofPath,
      filename: path.basename(dummyProofPath),
      mimetype: 'image/png',
      size: 18,
    } as Express.Multer.File;

    await uploadService.saveIdProof(fakeMulterFile, testProfile.id, memberActor);

    // Fetch updated profile
    const profileAfterResubmit = await prisma.memberProfile.findUnique({
      where: { id: testProfile.id },
    });
    const step5AfterResubmit = (profileAfterResubmit?.profileData as any)?.step5;

    assert(
      step5AfterResubmit?.idProofStatus === 'PENDING_REVIEW' &&
        step5AfterResubmit?.idProofRejectionReason === null &&
        Boolean(step5AfterResubmit?.idProofResubmittedAt),
      'Member can resubmit proof: status resets to PENDING_REVIEW and rejection reason cleared',
    );

    // Test 2.3: Staff alert dispatched upon member resubmission
    const staffResubmitAlert = await prisma.notificationLog.findFirst({
      where: {
        recipientMemberProfileId: testProfile.id,
        type: 'ID_PROOF_RESUBMITTED',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      Boolean(staffResubmitAlert) && staffResubmitAlert?.channel === 'APP_PUSH',
      'Responsible staff or Branch Manager is alerted when member resubmits corrected ID proof',
    );

    // Clean up temporary file
    try {
      if (fs.existsSync(dummyProofPath)) fs.unlinkSync(dummyProofPath);
    } catch {}

    // ----------------------------------------------------
    // TEST GROUP 3: DAILY MEMBERSHIP EXPIRY SCHEDULER
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Daily Membership Expiry Scheduler ---');

    // Create a temporary user and profile for expired package test
    const testStamp = Date.now().toString().slice(-7);
    const expiredUser = await prisma.user.create({
      data: {
        email: `expired_test_${testStamp}@example.com`,
        mobile: `99${testStamp.padStart(8, '0')}`,
        passwordHash: 'dummy-hash',
        role: Role.MEMBER,
        status: 'ACTIVE',
      },
    });

    const expiredProfile = await prisma.memberProfile.create({
      data: {
        userId: expiredUser.id,
        firstName: 'TestExpired',
        lastName: 'Member',
        memberId: `EXP${testStamp}`,
        packageType: 'PAID',
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        contactsQuota: 50,
        contactsRevealedCount: 2,
        gender: 'MALE',
        dateOfBirth: new Date('1995-01-01'),
        termsAccepted: true,
      } as any,
    });

    // Run Daily Membership Expiry Scheduler
    const expiryRun1 = await remindersService.executeDailyMembershipExpiryCheck();
    assert(expiryRun1.success === true, 'Daily expiry scheduler runs successfully');

    // Verify expired profile status transition
    const profileAfterExpiry = await prisma.memberProfile.findUnique({
      where: { id: expiredProfile.id },
    });
    assert(
      profileAfterExpiry?.packageType === 'FREE' && profileAfterExpiry?.contactsQuota === 0,
      'Expired membership reverted to FREE and contactsQuota set to 0',
    );

    // Verify member expiry notification created
    const expiryNotification = await prisma.notificationLog.findFirst({
      where: {
        recipientMemberProfileId: expiredProfile.id,
        type: 'PACKAGE_EXPIRY',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(expiryNotification), 'Member receives package expiry notification');

    // Test 3.2: Idempotency & Safe Retry
    const expiryRun2 = await remindersService.executeDailyMembershipExpiryCheck();
    assert(
      expiryRun2.profilesUpdatedToFree === 0,
      'Scheduler repeated run is idempotent: already-reverted profiles are not modified again',
    );

    // Clean up test expired records
    await prisma.notificationLog.deleteMany({ where: { recipientMemberProfileId: expiredProfile.id } });
    await prisma.memberProfile.delete({ where: { id: expiredProfile.id } });
    await prisma.user.delete({ where: { id: expiredUser.id } });

    // ----------------------------------------------------
    // TEST GROUP 4: LEAD FOLLOW-UP REMINDER SCHEDULER
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Lead Follow-Up Reminder Scheduler ---');

    // Create a controlled due follow-up alert
    const leadAlert = await prisma.paymentAlert.create({
      data: {
        memberProfileId: testProfile.id,
        alertDate: new Date(), // Due today
        alertType: 'PAYMENT',
        note: 'Phase 1 test lead follow-up reminder',
        createdById: adminUser.id,
        responsibleStaffId: adminUser.id,
        isResolved: false,
        notificationSent: false,
      },
    });

    // Run Lead Follow-up Reminder sweep
    const followUpRun1 = await remindersService.executeLeadFollowupReminders();
    assert(followUpRun1.success === true, 'Lead follow-up scheduler runs successfully');

    const alertAfterSweep = await prisma.paymentAlert.findUnique({
      where: { id: leadAlert.id },
    });
    assert(alertAfterSweep?.notificationSent === true, 'PaymentAlert notificationSent marked true after sweep');

    // Check reminder in NotificationLog
    const followUpNotif = await prisma.notificationLog.findFirst({
      where: {
        recipientUserId: adminUser.id,
        type: 'PAYMENT_ALERT',
        idempotencyKey: { contains: leadAlert.id },
      },
    });
    assert(Boolean(followUpNotif), 'Staff receives follow-up reminder in notification system');

    // Test 4.2: Idempotency test (repeat execution today shouldn't dispatch duplicate)
    const notificationsCountBefore = await prisma.notificationLog.count({
      where: {
        recipientUserId: adminUser.id,
        type: 'PAYMENT_ALERT',
        idempotencyKey: { contains: leadAlert.id },
      },
    });

    await remindersService.executeLeadFollowupReminders();

    const notificationsCountAfter = await prisma.notificationLog.count({
      where: {
        recipientUserId: adminUser.id,
        type: 'PAYMENT_ALERT',
        idempotencyKey: { contains: leadAlert.id },
      },
    });

    assert(
      notificationsCountBefore === notificationsCountAfter,
      'Lead follow-up scheduler is idempotent: no duplicate reminders sent on repeat runs today',
    );

    // Clean up test alert
    await prisma.alertNotificationLog.deleteMany({ where: { paymentAlertId: leadAlert.id } });
    await prisma.paymentAlert.delete({ where: { id: leadAlert.id } });

    // ----------------------------------------------------
    // TEST GROUP 5: SCHEDULER STATUS & AUDIT LOGS
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Scheduler Status & Health ---');
    const schedulerStatus = remindersService.getSchedulerStatus();

    assert(
      schedulerStatus.active === true &&
        schedulerStatus.timezone.includes('Asia/Kolkata') &&
        schedulerStatus.schedulers.length >= 2 &&
        schedulerStatus.recentExecutions.length > 0,
      'Scheduler status endpoint returns active state, IST timezone, configured jobs, and execution logs',
    );

    // Summary
    console.log('\n====================================================');
    console.log(`Phase 1 Test Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1Tests();
