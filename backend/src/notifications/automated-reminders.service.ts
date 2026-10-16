import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class AutomatedRemindersService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AutomatedRemindersService.name);
  private dailyTimer: NodeJS.Timeout | null = null;
  private hourlyTimer: NodeJS.Timeout | null = null;
  private readonly recentExecutions: Array<{
    task: string;
    istDate: string;
    timestamp: string;
    durationMs: number;
    status: 'SUCCESS' | 'FAILED';
    details?: any;
    error?: string;
  }> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Initializing Automated Schedulers (Daily Expiry, Lead Follow-ups, Birthdays)...');
    this.scheduleNextDailyMidnightRun();

    // Periodic sweep for lead follow-ups every hour
    this.hourlyTimer = setInterval(() => {
      this.executeLeadFollowupReminders().catch((err) =>
        this.logger.error(`Periodic lead follow-up sweep error: ${err.message}`),
      );
    }, 60 * 60 * 1000);
  }

  onApplicationShutdown() {
    if (this.dailyTimer) clearTimeout(this.dailyTimer);
    if (this.hourlyTimer) clearInterval(this.hourlyTimer);
  }

  private scheduleNextDailyMidnightRun() {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const nextMidnightIST = new Date(nowIST);
    nextMidnightIST.setUTCDate(nextMidnightIST.getUTCDate() + 1);
    nextMidnightIST.setUTCHours(0, 1, 0, 0); // 00:01:00 IST

    const msUntilMidnight = nextMidnightIST.getTime() - nowIST.getTime();
    this.logger.log(
      `[SCHEDULER] Next daily IST midnight run scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (at ${nextMidnightIST.toISOString().slice(0, 10)} 00:01 IST)`,
    );

    this.dailyTimer = setTimeout(async () => {
      try {
        await this.executeDailyMembershipExpiryCheck();
        await this.executeLeadFollowupReminders();
        await this.dispatchDailyBirthdays();
      } catch (err: any) {
        this.logger.error(`Daily midnight scheduler execution error: ${err.message}`);
      } finally {
        this.scheduleNextDailyMidnightRun();
      }
    }, msUntilMidnight);
  }

  /**
   * Helper to get current Indian Standard Time (UTC+05:30)
   */
  private getISTDate(): { year: number; month: number; day: number; dateStr: string } {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const year = ist.getUTCFullYear();
    const month = ist.getUTCMonth() + 1;
    const day = ist.getUTCDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dateStr };
  }

  /**
   * 1. Birthday Wishes (Daily Automation)
   * Dispatches via App Push, Email, and WhatsApp to:
   * - The Member
   * - Active assigned Staff for that profile
   * Enforces idempotency per recipient, channel, and day.
   */
  async dispatchDailyBirthdays() {
    const { month, day, dateStr } = this.getISTDate();
    this.logger.log(`Running Birthday Wishes automation for IST Date: ${dateStr}`);

    const activeMembers = await this.prisma.memberProfile.findMany({
      where: { isBlocked: false },
      include: {
        user: { select: { id: true, mobile: true, email: true } },
        assignedTo: { select: { id: true, fullName: true, mobile: true, email: true, status: true } },
        createdByStaff: { select: { id: true, fullName: true, mobile: true, email: true, status: true } },
      },
    });

    const birthdayMembers = activeMembers.filter((m) => {
      if (!m.dateOfBirth) return false;
      const dob = new Date(m.dateOfBirth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    let memberDispatches = 0;
    let staffDispatches = 0;

    for (const member of birthdayMembers) {
      const memberName = `${member.firstName} ${member.lastName}`;
      const memberMobile = member.user?.mobile;
      const memberEmail = member.user?.email;

      // Channels for Member: App Push + Email + WhatsApp
      const memberMessage = `🎉 Happy Birthday, ${memberName}! Wishing you a wonderful year filled with love, joy, and success. - Partner Matching Platform`;

      // 1. Member: App Push
      await this.notificationsService.sendNotification({
        type: 'BIRTHDAY',
        channel: 'APP_PUSH',
        recipientContact: memberMobile || member.id,
        recipientName: memberName,
        recipientUserId: member.userId,
        recipientMemberProfileId: member.id,
        title: 'Happy Birthday from Partner Matching!',
        content: memberMessage,
        idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_MEMBER_APP_PUSH`,
      });

      // 2. Member: Email
      if (memberEmail) {
        await this.notificationsService.sendNotification({
          type: 'BIRTHDAY',
          channel: 'EMAIL',
          recipientContact: memberEmail,
          recipientName: memberName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          title: `Happy Birthday, ${member.firstName}! 🎂`,
          content: memberMessage,
          idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_MEMBER_EMAIL`,
        });
      }

      // 3. Member: WhatsApp
      if (memberMobile) {
        await this.notificationsService.sendNotification({
          type: 'BIRTHDAY',
          channel: 'WHATSAPP',
          recipientContact: memberMobile,
          recipientName: memberName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          templateId: 'birthday_wishes_v1',
          content: memberMessage,
          metadata: { templateParams: [member.firstName] },
          idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_MEMBER_WHATSAPP`,
        });
      }
      memberDispatches++;

      // Active Staff assigned to that profile
      const staff = (member.assignedTo?.status === 'ACTIVE' ? member.assignedTo : null) ||
                    (member.createdByStaff?.status === 'ACTIVE' ? member.createdByStaff : null);

      if (staff) {
        const staffMessage = `🎂 Reminder: Today is member ${memberName}'s (${member.memberId}) birthday! Reach out with warm wishes.`;

        // Staff: App Push
        await this.notificationsService.sendNotification({
          type: 'BIRTHDAY',
          channel: 'APP_PUSH',
          recipientContact: staff.mobile || staff.id,
          recipientName: staff.fullName || 'Relationship Staff',
          recipientUserId: staff.id,
          recipientMemberProfileId: member.id,
          title: `Member Birthday Alert: ${member.memberId}`,
          content: staffMessage,
          idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_STAFF_${staff.id}_APP_PUSH`,
        });

        // Staff: Email
        if (staff.email) {
          await this.notificationsService.sendNotification({
            type: 'BIRTHDAY',
            channel: 'EMAIL',
            recipientContact: staff.email,
            recipientName: staff.fullName || 'Relationship Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: member.id,
            title: `Member Birthday Alert: ${memberName} (${member.memberId})`,
            content: staffMessage,
            idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_STAFF_${staff.id}_EMAIL`,
          });
        }

        // Staff: WhatsApp
        if (staff.mobile) {
          await this.notificationsService.sendNotification({
            type: 'BIRTHDAY',
            channel: 'WHATSAPP',
            recipientContact: staff.mobile,
            recipientName: staff.fullName || 'Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: member.id,
            content: staffMessage,
            idempotencyKey: `BIRTHDAY_${dateStr}_${member.id}_STAFF_${staff.id}_WHATSAPP`,
          });
        }
        staffDispatches++;
      }
    }

    return {
      success: true,
      istDate: dateStr,
      birthdayMembersCount: birthdayMembers.length,
      memberDispatches,
      staffDispatches,
    };
  }

  /**
   * 2. Festival Wishes (Automated & Manual)
   * Dispatches via App Push, Email, and WhatsApp to all active members on festival date.
   */
  async dispatchFestivalWishes(festivalId?: string) {
    const { dateStr } = this.getISTDate();

    // Query active festivals for today or specific festival if forced
    const whereFestival: any = { isActive: true };
    if (festivalId) {
      whereFestival.id = festivalId;
    } else {
      whereFestival.festivalDate = dateStr;
    }

    const festivals = await this.prisma.festivalWishConfig.findMany({
      where: whereFestival,
    });

    if (festivals.length === 0) {
      return { message: 'No active festivals configured for today', dispatched: 0 };
    }

    const activeMembers = await this.prisma.memberProfile.findMany({
      where: { isBlocked: false },
      include: { user: { select: { id: true, mobile: true, email: true } } },
    });

    let totalDispatches = 0;

    for (const fest of festivals) {
      const channels = (Array.isArray(fest.channels) && fest.channels.length > 0)
        ? (fest.channels as string[])
        : ['APP_PUSH', 'EMAIL', 'WHATSAPP'];

      for (const member of activeMembers) {
        const memberName = `${member.firstName} ${member.lastName}`;
        const mobile = member.user?.mobile;
        const email = member.user?.email;

        const content = `${fest.messageTemplate} ${
          fest.offerCode ? `Use code ${fest.offerCode} for ${fest.discountPercent || 20}% discount.` : ''
        }`;

        // 1. App Push
        if (channels.includes('APP_PUSH') && mobile) {
          await this.notificationsService.sendNotification({
            type: 'FESTIVAL',
            channel: 'APP_PUSH',
            recipientContact: mobile,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            title: `Happy ${fest.festivalName}! 🎊`,
            content,
            idempotencyKey: `FESTIVAL_${fest.id}_${dateStr}_${member.id}_APP_PUSH`,
          });
          totalDispatches++;
        }

        // 2. Email
        if (channels.includes('EMAIL') && email) {
          await this.notificationsService.sendNotification({
            type: 'FESTIVAL',
            channel: 'EMAIL',
            recipientContact: email,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            title: `Warm Festive Greetings for ${fest.festivalName}!`,
            content,
            idempotencyKey: `FESTIVAL_${fest.id}_${dateStr}_${member.id}_EMAIL`,
          });
          totalDispatches++;
        }

        // 3. WhatsApp
        if (channels.includes('WHATSAPP') && mobile) {
          await this.notificationsService.sendNotification({
            type: 'FESTIVAL',
            channel: 'WHATSAPP',
            recipientContact: mobile,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            templateId: 'festival_wishes_v1',
            content,
            metadata: { templateParams: [fest.festivalName, fest.offerCode || 'FESTIVE'] },
            idempotencyKey: `FESTIVAL_${fest.id}_${dateStr}_${member.id}_WHATSAPP`,
          });
          totalDispatches++;
        }
      }

      // Update festival dispatch audit
      await this.prisma.festivalWishConfig.update({
        where: { id: fest.id },
        data: {
          lastDispatchedAt: new Date(),
          dispatchCount: { increment: activeMembers.length },
        },
      });
    }

    return {
      message: `Festival wishes dispatched for ${festivals.length} festival(s)`,
      festivalsProcessed: festivals.map((f) => f.festivalName),
      recipientsPerFestival: activeMembers.length,
      totalDispatches,
    };
  }

  /**
   * 3. Payment Alerts (Scheduled Date Automation)
   * Dispatches via App Push, SMS, and Email to:
   * - Member
   * - Assigned Staff
   * - Relevant Branch Manager/Staff
   * - HQ Admin
   */
  async dispatchPaymentAlerts() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const pendingAlerts = await this.prisma.paymentAlert.findMany({
      where: {
        alertDate: { lte: today },
        notificationSent: false,
        isResolved: false,
      },
      include: {
        memberProfile: {
          include: {
            user: { select: { id: true, mobile: true, email: true } },
            currentPackage: { select: { name: true, cost: true } },
            ownerOrg: { select: { id: true, name: true } },
          },
        },
        responsibleStaff: { select: { id: true, fullName: true, mobile: true, email: true } },
        branchOrg: {
          include: {
            users: {
              where: { role: Role.BRANCH_MANAGER, status: 'ACTIVE' },
              select: { id: true, fullName: true, mobile: true, email: true },
            },
          },
        },
      },
    });

    const hqAdmins = await this.prisma.user.findMany({
      where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] }, status: 'ACTIVE' },
      select: { id: true, fullName: true, mobile: true, email: true },
    });

    let dispatches = 0;

    for (const alert of pendingAlerts) {
      const member = alert.memberProfile;
      const memberName = `${member.firstName} ${member.lastName}`;
      const packageName = member.currentPackage?.name || 'Membership Package';
      const scheduledDateStr = alert.alertDate.toISOString().slice(0, 10);
      const noteSnippet = alert.note ? ` (Note: ${alert.note})` : '';

      const content = `🔔 Payment Reminder: Member ${memberName} (${member.memberId}) has a payment follow-up scheduled for ${scheduledDateStr} for ${packageName}.${noteSnippet}`;

      // 1. Notify Member (App Push + SMS + Email)
      if (member.user?.mobile) {
        await this.notificationsService.sendNotification({
          type: 'PAYMENT_ALERT',
          channel: 'APP_PUSH',
          recipientContact: member.user.mobile,
          recipientName: memberName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          title: 'Membership Payment Reminder',
          content: `Dear ${member.firstName}, this is a reminder regarding your scheduled payment date of ${scheduledDateStr} for ${packageName}.`,
          idempotencyKey: `PAYMENT_ALERT_${alert.id}_MEMBER_APP_PUSH`,
        });

        await this.notificationsService.sendNotification({
          type: 'PAYMENT_ALERT',
          channel: 'SMS',
          recipientContact: member.user.mobile,
          recipientName: memberName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          content: `Dear ${member.firstName}, your payment follow-up is scheduled for ${scheduledDateStr}. Please contact your relationship executive for assistance.`,
          idempotencyKey: `PAYMENT_ALERT_${alert.id}_MEMBER_SMS`,
        });
      }

      if (member.user?.email) {
        await this.notificationsService.sendNotification({
          type: 'PAYMENT_ALERT',
          channel: 'EMAIL',
          recipientContact: member.user.email,
          recipientName: memberName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          title: `Payment Follow-up: ${packageName}`,
          content: `Dear ${member.firstName},\n\nThis is a scheduled reminder for your payment date on ${scheduledDateStr}.\n\nPackage: ${packageName}\nMember ID: ${member.memberId}\n\nThank you,\nPartner Matching Team`,
          idempotencyKey: `PAYMENT_ALERT_${alert.id}_MEMBER_EMAIL`,
        });
      }

      // 2. Notify Assigned Staff (App Push + SMS + Email)
      if (alert.responsibleStaff) {
        const staff = alert.responsibleStaff;
        if (staff.mobile) {
          await this.notificationsService.sendNotification({
            type: 'PAYMENT_ALERT',
            channel: 'APP_PUSH',
            recipientContact: staff.mobile,
            recipientName: staff.fullName || 'Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: member.id,
            title: `Payment Follow-up Due: ${member.memberId}`,
            content,
            idempotencyKey: `PAYMENT_ALERT_${alert.id}_STAFF_${staff.id}_APP_PUSH`,
          });

          await this.notificationsService.sendNotification({
            type: 'PAYMENT_ALERT',
            channel: 'SMS',
            recipientContact: staff.mobile,
            recipientName: staff.fullName || 'Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: member.id,
            content,
            idempotencyKey: `PAYMENT_ALERT_${alert.id}_STAFF_${staff.id}_SMS`,
          });
        }
      }

      // 3. Notify Relevant Branch Manager (App Push + Email)
      const branchManagers = alert.branchOrg?.users || [];
      for (const bm of branchManagers) {
        if (bm.mobile) {
          await this.notificationsService.sendNotification({
            type: 'PAYMENT_ALERT',
            channel: 'APP_PUSH',
            recipientContact: bm.mobile,
            recipientName: bm.fullName || 'Branch Manager',
            recipientUserId: bm.id,
            recipientMemberProfileId: member.id,
            title: `Branch Payment Alert: ${member.memberId}`,
            content,
            idempotencyKey: `PAYMENT_ALERT_${alert.id}_BM_${bm.id}_APP_PUSH`,
          });
        }
      }

      // 4. Notify HQ Admin (App Push + Email)
      for (const admin of hqAdmins.slice(0, 2)) {
        if (admin.email) {
          await this.notificationsService.sendNotification({
            type: 'PAYMENT_ALERT',
            channel: 'EMAIL',
            recipientContact: admin.email,
            recipientName: admin.fullName || 'Admin',
            recipientUserId: admin.id,
            recipientMemberProfileId: member.id,
            title: `HQ Payment Alert: ${member.memberId} (${member.ownerOrg?.name || 'Branch'})`,
            content,
            idempotencyKey: `PAYMENT_ALERT_${alert.id}_HQ_${admin.id}_EMAIL`,
          });
        }
      }

      // Mark alert as notified
      await this.prisma.paymentAlert.update({
        where: { id: alert.id },
        data: {
          notificationSent: true,
          notificationSentAt: new Date(),
        },
      });

      dispatches++;
    }

    return {
      message: `Processed ${pendingAlerts.length} payment alerts`,
      alertsDispatched: dispatches,
    };
  }

  /**
   * 4. Package Expiry Alerts (Approaching Expiry Automation)
   * Dispatches via App Push and SMS to:
   * - Member
   * - Assigned Staff
   * Milestone reminders at 7 days, 3 days, 1 day, and on expiry date.
   */
  async dispatchPackageExpiryAlerts() {
    const now = new Date();
    const milestones = [7, 3, 1, 0]; // Days remaining
    let totalAlerts = 0;

    for (const days of milestones) {
      // Find members expiring in `days` window
      const targetStart = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      targetStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);

      const expiringProfiles = await this.prisma.memberProfile.findMany({
        where: {
          packageType: 'PAID',
          isBlocked: false,
          packageExpiresAt: {
            gte: targetStart,
            lt: targetEnd,
          },
        },
        include: {
          user: { select: { id: true, mobile: true, email: true } },
          currentPackage: { select: { name: true } },
          assignedTo: { select: { id: true, fullName: true, mobile: true, email: true } },
        },
      });

      for (const profile of expiringProfiles) {
        const memberName = `${profile.firstName} ${profile.lastName}`;
        const packageName = profile.currentPackage?.name || 'Premium Plan';
        const expiryDateStr = profile.packageExpiresAt?.toISOString().slice(0, 10) || 'soon';

        const urgency = days === 0 ? 'expires TODAY' : `expires in ${days} day(s) on ${expiryDateStr}`;
        const memberMsg = `⏳ Package Expiry Alert: Dear ${profile.firstName}, your ${packageName} ${urgency}. Renew now to keep accessing verified partner contacts without interruption.`;

        // 1. Member: App Push + SMS
        if (profile.user?.mobile) {
          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'APP_PUSH',
            recipientContact: profile.user.mobile,
            recipientName: memberName,
            recipientUserId: profile.userId,
            recipientMemberProfileId: profile.id,
            title: `Package Expiry: ${urgency}`,
            content: memberMsg,
            idempotencyKey: `PKG_EXPIRY_${profile.id}_DAYS_${days}_${expiryDateStr}_APP_PUSH`,
          });

          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'SMS',
            recipientContact: profile.user.mobile,
            recipientName: memberName,
            recipientUserId: profile.userId,
            recipientMemberProfileId: profile.id,
            content: memberMsg,
            idempotencyKey: `PKG_EXPIRY_${profile.id}_DAYS_${days}_${expiryDateStr}_SMS`,
          });
        }

        // 2. Assigned Staff: App Push + SMS
        if (profile.assignedTo?.mobile) {
          const staff = profile.assignedTo;
          const staffMsg = `🔔 Client Expiry Alert: Member ${memberName} (${profile.memberId})'s package ${urgency}. Contact member to facilitate renewal.`;

          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'APP_PUSH',
            recipientContact: staff.mobile,
            recipientName: staff.fullName || 'Relationship Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: profile.id,
            title: `Client Expiry: ${profile.memberId}`,
            content: staffMsg,
            idempotencyKey: `PKG_EXPIRY_${profile.id}_STAFF_${staff.id}_DAYS_${days}_${expiryDateStr}_APP_PUSH`,
          });

          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'SMS',
            recipientContact: staff.mobile,
            recipientName: staff.fullName || 'Relationship Staff',
            recipientUserId: staff.id,
            recipientMemberProfileId: profile.id,
            content: staffMsg,
            idempotencyKey: `PKG_EXPIRY_${profile.id}_STAFF_${staff.id}_DAYS_${days}_${expiryDateStr}_SMS`,
          });
        }

        totalAlerts++;
      }
    }

    return {
      message: 'Package expiry checks completed successfully',
      alertsTriggered: totalAlerts,
    };
  }

  /**
   * 5. Daily Membership Expiry Transition (Task 3)
   * Runs daily in Indian Standard Time (IST, UTC+05:30).
   * Identifies all PAID memberships whose packageExpiresAt has passed.
   * Reverts packageType to FREE, zeroes out remaining reveals quota.
   * Dispatches member notification (App push + SMS + Email) and assigned staff alert.
   * Completely idempotent and safe to retry on the same or repeated dates.
   */
  async executeDailyMembershipExpiryCheck() {
    const startTime = Date.now();
    const { dateStr } = this.getISTDate();
    this.logger.log(`[DAILY EXPIRY SCHEDULER] Running membership expiry check for IST Date: ${dateStr}`);

    try {
      const now = new Date();
      // Find all PAID memberships that have passed packageExpiresAt
      const expiredMembers = await this.prisma.memberProfile.findMany({
        where: {
          packageType: 'PAID',
          packageExpiresAt: { lte: now },
        },
        include: {
          user: { select: { id: true, mobile: true, email: true } },
          currentPackage: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, fullName: true, mobile: true, email: true } },
        },
      });

      let updatedCount = 0;
      let notificationsCount = 0;

      for (const member of expiredMembers) {
        const packageName = member.currentPackage?.name || 'Paid Package';
        const memberName = `${member.firstName} ${member.lastName}`;
        const expiryDateIST = member.packageExpiresAt
          ? new Date(member.packageExpiresAt.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : dateStr;

        // 1. Revert to FREE package and lock contact quota
        await this.prisma.memberProfile.update({
          where: { id: member.id },
          data: {
            packageType: 'FREE',
            contactsQuota: 0,
          },
        });
        updatedCount++;

        // 2. Member notification
        const memberTitle = 'Membership Package Expired';
        const memberMsg = `Dear ${member.firstName}, your ${packageName} membership expired on ${expiryDateIST}. Your account has been reverted to Free status. Upgrade to continue revealing verified contacts.`;

        if (member.user?.mobile) {
          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'APP_PUSH',
            recipientContact: member.user.mobile,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            title: memberTitle,
            content: memberMsg,
            idempotencyKey: `PKG_EXPIRED_${member.id}_${dateStr}_APP_PUSH`,
          });
          notificationsCount++;

          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'SMS',
            recipientContact: member.user.mobile,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            content: memberMsg,
            idempotencyKey: `PKG_EXPIRED_${member.id}_${dateStr}_SMS`,
          });
          notificationsCount++;
        }

        if (member.user?.email) {
          await this.notificationsService.sendNotification({
            type: 'PACKAGE_EXPIRY',
            channel: 'EMAIL',
            recipientContact: member.user.email,
            recipientName: memberName,
            recipientUserId: member.userId,
            recipientMemberProfileId: member.id,
            title: memberTitle,
            content: memberMsg,
            idempotencyKey: `PKG_EXPIRED_${member.id}_${dateStr}_EMAIL`,
          });
          notificationsCount++;
        }

        // 3. Staff notification (if assigned)
        if (member.assignedTo) {
          const staff = member.assignedTo;
          const staffTitle = `Member Package Expired: ${member.memberId}`;
          const staffMsg = `Member ${memberName} (${member.memberId})'s ${packageName} has expired. Please initiate renewal follow-up.`;

          if (staff.mobile) {
            await this.notificationsService.sendNotification({
              type: 'PACKAGE_EXPIRY',
              channel: 'APP_PUSH',
              recipientContact: staff.mobile,
              recipientName: staff.fullName || 'Relationship Staff',
              recipientUserId: staff.id,
              recipientMemberProfileId: member.id,
              title: staffTitle,
              content: staffMsg,
              idempotencyKey: `PKG_EXPIRED_STAFF_${member.id}_${staff.id}_${dateStr}_APP_PUSH`,
            });
            notificationsCount++;
          }

          if (staff.email) {
            await this.notificationsService.sendNotification({
              type: 'PACKAGE_EXPIRY',
              channel: 'EMAIL',
              recipientContact: staff.email,
              recipientName: staff.fullName || 'Relationship Staff',
              recipientUserId: staff.id,
              recipientMemberProfileId: member.id,
              title: staffTitle,
              content: staffMsg,
              idempotencyKey: `PKG_EXPIRED_STAFF_${member.id}_${staff.id}_${dateStr}_EMAIL`,
            });
            notificationsCount++;
          }
        }
      }

      // Also trigger upcoming expiry reminders (7, 3, 1, 0 days)
      const advanceResult = await this.dispatchPackageExpiryAlerts();

      const durationMs = Date.now() - startTime;
      const logEntry = {
        task: 'DAILY_MEMBERSHIP_EXPIRY',
        istDate: dateStr,
        timestamp: new Date().toISOString(),
        expiredFound: expiredMembers.length,
        profilesUpdatedToFree: updatedCount,
        notificationsDispatched: notificationsCount,
        advanceAlertsProcessed: advanceResult.alertsTriggered,
        durationMs,
        status: 'SUCCESS' as const,
      };

      await this.recordSchedulerExecution(logEntry);

      return {
        success: true,
        message: `Daily expiry check completed for IST Date ${dateStr}`,
        ...logEntry,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorEntry = {
        task: 'DAILY_MEMBERSHIP_EXPIRY',
        istDate: dateStr,
        timestamp: new Date().toISOString(),
        durationMs,
        status: 'FAILED' as const,
        error: err.message || 'Unknown error occurred during daily expiry check',
      };
      await this.recordSchedulerExecution(errorEntry);
      this.logger.error(`[DAILY EXPIRY SCHEDULER] Failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * 6. Lead Follow-Up Reminder Sweep (Task 4)
   * Sweeps PaymentAlert records whose alertDate is due today or overdue and unresolved.
   * Dispatches reminders to assigned staff and branch managers respecting branch scoping.
   * Prevents duplicate spam via daily idempotency keys per recipient.
   */
  async executeLeadFollowupReminders() {
    const startTime = Date.now();
    const { dateStr } = this.getISTDate();
    this.logger.log(`[LEAD FOLLOW-UP SCHEDULER] Running lead follow-up sweep for IST Date: ${dateStr}`);

    try {
      const now = new Date();
      // End of current IST day
      const endOfTodayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      endOfTodayIST.setUTCHours(23, 59, 59, 999);
      // Convert back to UTC timestamp for DB comparison
      const endOfTodayUtc = new Date(endOfTodayIST.getTime() - 5.5 * 60 * 60 * 1000);

      const dueAlerts = await this.prisma.paymentAlert.findMany({
        where: {
          alertDate: { lte: endOfTodayUtc },
          isResolved: false,
        },
        include: {
          memberProfile: {
            include: {
              user: { select: { id: true, mobile: true, email: true } },
              currentPackage: { select: { name: true, cost: true } },
              ownerOrg: { select: { id: true, name: true } },
            },
          },
          responsibleStaff: { select: { id: true, fullName: true, mobile: true, email: true, status: true } },
          branchOrg: {
            include: {
              users: {
                where: { role: Role.BRANCH_MANAGER, status: 'ACTIVE' },
                select: { id: true, fullName: true, mobile: true, email: true },
              },
            },
          },
        },
      });

      const hqAdmins = await this.prisma.user.findMany({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] }, status: 'ACTIVE' },
        select: { id: true, fullName: true, mobile: true, email: true },
      });

      let remindersDispatched = 0;

      for (const alert of dueAlerts) {
        const member = alert.memberProfile;
        const memberName = `${member.firstName} ${member.lastName}`;
        const scheduledDateStr = alert.alertDate.toISOString().slice(0, 10);
        const isOverdue = alert.alertDate < now;
        const noteSnippet = alert.note ? ` | Note: ${alert.note}` : '';
        const title = isOverdue
          ? `⚠️ Overdue Follow-up: ${member.memberId}`
          : `📅 Follow-up Due Today: ${member.memberId}`;
        const content = `${title} — Member ${memberName} (${alert.alertType}) scheduled for ${scheduledDateStr}.${noteSnippet}`;

        // Recipients list strictly respecting branch / franchise / staff scoping
        const recipientsToNotify: Array<{ user: { id: string; fullName: string | null; mobile: string | null; email: string | null }; roleType: string }> = [];

        // 1. Responsible Staff (if assigned and active)
        if (alert.responsibleStaff && alert.responsibleStaff.status === 'ACTIVE') {
          recipientsToNotify.push({ user: alert.responsibleStaff, roleType: 'STAFF' });
        }

        // 2. Branch Manager (if branch alert, notify only managers of THIS branch)
        if (alert.branchOrg?.users?.length) {
          for (const bm of alert.branchOrg.users) {
            if (!recipientsToNotify.some((r) => r.user.id === bm.id)) {
              recipientsToNotify.push({ user: bm, roleType: 'BRANCH_MANAGER' });
            }
          }
        }

        // 3. If no branch or staff assigned, notify HQ Admin
        if (recipientsToNotify.length === 0) {
          for (const admin of hqAdmins.slice(0, 2)) {
            recipientsToNotify.push({ user: admin, roleType: 'ADMIN' });
          }
        }

        for (const recipient of recipientsToNotify) {
          const u = recipient.user;
          const userContact = u.mobile || u.email || u.id;

          // Dispatch App Push with DAILY IDEMPOTENCY KEY so repeat runs today don't spam
          await this.notificationsService.sendNotification({
            type: 'PAYMENT_ALERT',
            channel: 'APP_PUSH',
            recipientContact: userContact,
            recipientName: u.fullName || 'Staff Member',
            recipientUserId: u.id,
            recipientMemberProfileId: member.id,
            title,
            content,
            idempotencyKey: `LEAD_FOLLOWUP_${alert.id}_${u.id}_${dateStr}_APP_PUSH`,
          });

          // Log in AlertNotificationLog (ignore if already logged for this alert & user & channel)
          try {
            await this.prisma.alertNotificationLog.upsert({
              where: {
                paymentAlertId_recipientId_channel: {
                  paymentAlertId: alert.id,
                  recipientId: u.id,
                  channel: 'IN_APP',
                },
              },
              update: { sentAt: new Date(), status: 'SENT' },
              create: {
                paymentAlertId: alert.id,
                recipientId: u.id,
                channel: 'IN_APP',
                status: 'SENT',
              },
            });
          } catch {
            // Ignore unique constraint race conditions
          }

          remindersDispatched++;
        }

        // Mark alert notificationSent
        await this.prisma.paymentAlert.update({
          where: { id: alert.id },
          data: {
            notificationSent: true,
            notificationSentAt: new Date(),
          },
        });
      }

      const durationMs = Date.now() - startTime;
      const logEntry = {
        task: 'LEAD_FOLLOWUP_REMINDERS',
        istDate: dateStr,
        timestamp: new Date().toISOString(),
        totalDueOrOverdue: dueAlerts.length,
        remindersDispatched,
        durationMs,
        status: 'SUCCESS' as const,
      };

      await this.recordSchedulerExecution(logEntry);

      return {
        success: true,
        message: `Lead follow-up sweep completed for IST Date ${dateStr}`,
        ...logEntry,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorEntry = {
        task: 'LEAD_FOLLOWUP_REMINDERS',
        istDate: dateStr,
        timestamp: new Date().toISOString(),
        durationMs,
        status: 'FAILED' as const,
        error: err.message || 'Unknown error during lead follow-up sweep',
      };
      await this.recordSchedulerExecution(errorEntry);
      this.logger.error(`[LEAD FOLLOW-UP SCHEDULER] Failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Helper to record scheduler execution history in circular memory buffer and Supabase NotificationLog
   */
  private async recordSchedulerExecution(entry: {
    task: string;
    istDate: string;
    timestamp: string;
    durationMs: number;
    status: 'SUCCESS' | 'FAILED';
    [key: string]: any;
  }) {
    // 1. Memory buffer (max 50)
    this.recentExecutions.unshift(entry);
    if (this.recentExecutions.length > 50) {
      this.recentExecutions.pop();
    }

    // 2. Persist in Supabase NotificationLog without secrets
    try {
      await this.prisma.notificationLog.create({
        data: {
          type: `SCHEDULER_${entry.task}`,
          channel: 'SYSTEM_SCHEDULER',
          recipientContact: 'SYSTEM_DAEMON',
          title: `Scheduler [${entry.task}] ${entry.status}`,
          content: `Execution on IST ${entry.istDate} completed with status ${entry.status} in ${entry.durationMs}ms`,
          status: entry.status === 'SUCCESS' ? 'SENT' : 'FAILED',
          metadata: entry,
          idempotencyKey: `SCHEDULER_${entry.task}_${entry.istDate}_${Date.now()}`,
        },
      });
    } catch {
      // Ignore if NotificationLog persistence fails
    }
  }

  /**
   * Status helper for Admin Dashboard and Health Checks
   */
  getSchedulerStatus() {
    const { dateStr } = this.getISTDate();
    const istTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30');
    return {
      active: true,
      timezone: 'Asia/Kolkata (IST, UTC+05:30)',
      currentISTDate: dateStr,
      currentISTTime: istTime,
      schedulers: [
        {
          name: 'DAILY_MEMBERSHIP_EXPIRY',
          frequency: 'Daily at 00:01 IST',
          description: 'Reverts expired PAID packages to FREE, removes contacts quota, notifies member & staff',
        },
        {
          name: 'LEAD_FOLLOWUP_REMINDERS',
          frequency: 'Daily at 00:01 IST & Hourly sweeps',
          description: 'Sweeps due and overdue payment/visit alerts, alerts assigned staff & branch manager',
        },
        {
          name: 'DAILY_BIRTHDAYS',
          frequency: 'Daily at 00:01 IST',
          description: 'Sends birthday wishes to members and reminders to assigned staff',
        },
        {
          name: 'PACKAGE_EXPIRY_ALERTS',
          frequency: 'Daily at 00:01 IST',
          description: 'Advance reminders at 7, 3, 1, 0 days remaining',
        },
      ],
      supabaseIntegration: {
        pgCronCompatible: true,
        httpWebhookEndpoint: '/api/v1/notifications/automated/run-daily-expiry',
        edgeFunctionCompatible: true,
      },
      recentExecutions: this.recentExecutions.slice(0, 20),
    };
  }
}

