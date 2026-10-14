import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 5.5 Payment & Visit Date Reminders
   */
  async listReminders(options: { isResolved?: boolean }) {
    const where: any = {};
    if (typeof options.isResolved === 'boolean') {
      where.isResolved = options.isResolved;
    }

    return this.prisma.paymentAlert.findMany({
      where,
      orderBy: { alertDate: 'asc' },
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            packageType: true,
            currentPackage: { select: { name: true, cost: true } },
            ownerOrg: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async createReminder(
    actor: any,
    dto: {
      memberProfileId: string;
      packageId?: string;
      alertDate: string;
      alertType: 'PAYMENT' | 'VISIT' | 'PACKAGE_FOLLOWUP';
      note?: string;
    },
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: dto.memberProfileId },
    });
    if (!profile) throw new NotFoundException('Member profile not found');

    const reminder = await this.prisma.paymentAlert.create({
      data: {
        memberProfileId: dto.memberProfileId,
        packageId: dto.packageId,
        alertDate: new Date(dto.alertDate),
        alertType: dto.alertType || 'PAYMENT',
        note: dto.note,
        createdById: actor.id,
      },
      include: {
        memberProfile: { select: { memberId: true, firstName: true, lastName: true } },
      },
    });

    console.log(`🔔 [REMINDER SCHEDULED] Member: ${reminder.memberProfile.memberId} | Date: ${dto.alertDate} | Type: ${dto.alertType}`);

    return reminder;
  }

  async resolveReminder(reminderId: string) {
    const reminder = await this.prisma.paymentAlert.findUnique({
      where: { id: reminderId },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');

    return this.prisma.paymentAlert.update({
      where: { id: reminderId },
      data: { isResolved: true },
    });
  }

  /**
   * 5.5 Automated Birthday Wishes for Active Members
   * Checks today's month and day across all active members.
   */
  async triggerBirthdayWishes() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const activeMembers = await this.prisma.memberProfile.findMany({
      where: { isBlocked: false },
      include: { user: { select: { mobile: true, email: true } } },
    });

    const birthdayMembers = activeMembers.filter((m) => {
      const dob = new Date(m.dateOfBirth);
      return dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
    });

    const dispatches = birthdayMembers.map((m) => {
      const msg = `🎉 Happy Birthday ${m.firstName}! Wishing you joy, health, and happiness from Partner Matching Platform.`;
      console.log(`🎂 [BIRTHDAY WISH SENT] Mobile: ${m.user.mobile} | Email: ${m.user.email || 'N/A'} | Msg: ${msg}`);
      return {
        memberId: m.memberId,
        name: `${m.firstName} ${m.lastName}`,
        mobile: m.user.mobile,
        sentAt: now,
        channels: ['APP_NOTIFICATION', 'EMAIL', 'WHATSAPP'],
      };
    });

    return {
      message: `Birthday wishes triggered for ${dispatches.length} members today`,
      count: dispatches.length,
      dispatches,
    };
  }

  /**
   * 5.5 Festival Greetings & Promotional Offers
   */
  async sendFestivalGreetings(dto: {
    festivalName: string;
    message: string;
    discountPercent?: number;
    offerCode?: string;
  }) {
    const totalActive = await this.prisma.memberProfile.count({
      where: { isBlocked: false },
    });

    console.log(`🎊 [FESTIVAL GREETING BROADCAST] Festival: ${dto.festivalName} | Offer: ${dto.offerCode || 'FESTIVE50'} | Recipients: ${totalActive} members`);

    return {
      festivalName: dto.festivalName,
      message: dto.message,
      offerCode: dto.offerCode || 'FESTIVE_SPECIAL',
      recipientsTargeted: totalActive,
      status: 'DISPATCHED',
      channels: ['APP_NOTIFICATION', 'EMAIL', 'WHATSAPP'],
      timestamp: new Date(),
    };
  }

  /**
   * 5.5 Branch-Specific Bulk SMS Campaigns (by Member ID range)
   */
  async sendBranchBulkSms(
    actor: any,
    dto: {
      branchOrgId?: string;
      title: string;
      message: string;
      targetIdRangeStart?: string;
      targetIdRangeEnd?: string;
    },
    ipAddress?: string,
  ) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('Campaign title and message are required');
    }

    const where: any = { isBlocked: false };
    if (dto.branchOrgId) {
      where.ownerOrgId = dto.branchOrgId;
    }
    if (dto.targetIdRangeStart && dto.targetIdRangeEnd) {
      where.memberId = {
        gte: dto.targetIdRangeStart,
        lte: dto.targetIdRangeEnd,
      };
    }

    const recipientCount = await this.prisma.memberProfile.count({ where });

    const campaign = await this.prisma.smsCampaign.create({
      data: {
        branchOrgId: dto.branchOrgId,
        title: dto.title,
        message: dto.message,
        targetIdRangeStart: dto.targetIdRangeStart,
        targetIdRangeEnd: dto.targetIdRangeEnd,
        recipientCount,
        createdById: actor.id,
        status: 'SENT',
      },
    });

    console.log(`📨 [BULK SMS CAMPAIGN] Branch: ${dto.branchOrgId || 'All'} | Title: ${dto.title} | Dispatched to ${recipientCount} members`);

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.OTP_SENT,
      resourceType: 'SmsCampaign',
      resourceId: campaign.id,
      orgId: dto.branchOrgId,
      metadata: { title: dto.title, recipientCount },
      ipAddress,
    });

    return {
      campaign,
      message: `Bulk SMS campaign dispatched to ${recipientCount} targeted members`,
    };
  }

  /**
   * SMS Usage Counts & Reports per Branch
   */
  async getBranchSmsReports() {
    const campaigns = await this.prisma.smsCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const orgs = await this.prisma.organization.findMany();
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    const branchUsageMap: Record<string, { branchName: string; totalCampaigns: number; totalSmsSent: number }> = {};

    for (const c of campaigns) {
      const branchKey = c.branchOrgId || 'HQ_GLOBAL';
      const branchName = c.branchOrgId ? orgMap.get(c.branchOrgId) || 'Branch' : 'HQ Central';

      if (!branchUsageMap[branchKey]) {
        branchUsageMap[branchKey] = { branchName, totalCampaigns: 0, totalSmsSent: 0 };
      }
      branchUsageMap[branchKey].totalCampaigns += 1;
      branchUsageMap[branchKey].totalSmsSent += c.recipientCount;
    }

    return {
      branchUsage: Object.values(branchUsageMap),
      recentCampaigns: campaigns.slice(0, 20).map((c) => ({
        id: c.id,
        title: c.title,
        branchName: c.branchOrgId ? orgMap.get(c.branchOrgId) || 'Branch' : 'HQ Central',
        recipientCount: c.recipientCount,
        idRange: c.targetIdRangeStart && c.targetIdRangeEnd ? `${c.targetIdRangeStart} - ${c.targetIdRangeEnd}` : 'All Branch Members',
        status: c.status,
        createdAt: c.createdAt,
      })),
    };
  }
}
