import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { WhatsAppMarketingCampaignDto } from './dto/marketing.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Dispatches WhatsApp marketing campaign to targeted member segment.
   * Admin / Super Admin only.
   */
  async sendWhatsAppCampaign(actor: any, dto: WhatsAppMarketingCampaignDto) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Administrators can dispatch marketing campaigns.');
    }

    // 1. Determine target criteria
    let whereClause: any = {};

    if (dto.targetAudience === 'UNVERIFIED_MEMBERS') {
      whereClause.verificationStatus = { not: 'VERIFIED' };
    } else if (dto.targetAudience === 'ACTIVE_MEMBERS') {
      whereClause.status = 'ACTIVE';
    } else if (dto.targetAudience === 'FREE_MEMBERS') {
      whereClause.packageType = 'FREE';
    }

    // 2. Fetch targeted members
    const members = await this.prisma.memberProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
          },
        },
      },
      take: 200, // Safe batch limit for campaign dispatch
    });

    let dispatchedCount = 0;
    const errors: string[] = [];

    // 3. Dispatch to members
    for (const member of members) {
      const phone = member.user?.mobile;
      if (!phone) continue;

      const memberFullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';

      try {
        await this.notificationsService.sendNotification({
          type: 'MANUAL',
          channel: 'WHATSAPP',
          recipientContact: phone,
          recipientName: memberFullName,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          title: dto.campaignName,
          content:
            dto.customMessage ||
            `Hello ${memberFullName}, exciting new partner matches and updates are waiting for you on Partner Match Platform!`,
          templateId: dto.templateId,
          metadata: {
            campaignName: dto.campaignName,
            templateParams: dto.templateParams || [memberFullName],
          },
          idempotencyKey: `mkt_${dto.campaignName}_${member.userId}_${new Date().toISOString().slice(0, 10)}`,
        });
        dispatchedCount++;
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch campaign message to ${member.id}: ${err.message}`);
        errors.push(err.message);
      }
    }

    // 4. Audit log
    await this.auditService.log({
      actorId: actor.sub || actor.userId || actor.id,
      actorRole: actor.role,
      action: AuditAction.OTP_SENT, // Reusing communication audit action
      resourceType: 'WHATSAPP_CAMPAIGN',
      metadata: {
        campaignName: dto.campaignName,
        templateId: dto.templateId,
        targetAudience: dto.targetAudience,
        dispatchedCount,
      },
    });

    return {
      success: true,
      campaignName: dto.campaignName,
      templateId: dto.templateId,
      targetAudience: dto.targetAudience,
      totalTargeted: members.length,
      dispatchedCount,
      simulated: !process.env.WHATSAPP_API_TOKEN,
      message: `WhatsApp campaign '${dto.campaignName}' successfully processed for ${dispatchedCount} recipients.`,
    };
  }

  /**
   * Aggregates referral and registration source attribution report.
   * Admin / Super Admin only.
   */
  async getAttributionReport(actor: any) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Administrators can view attribution analytics.');
    }

    const members = await this.prisma.memberProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationSource: true,
        attributionData: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const sourceBreakdown: Record<string, number> = {
      DIRECT: 0,
      GOOGLE: 0,
      FACEBOOK: 0,
      WHATSAPP: 0,
      FRIEND_REFERRAL: 0,
      OTHER: 0,
    };

    const utmSources: Record<string, number> = {};
    const utmMediums: Record<string, number> = {};
    const utmCampaigns: Record<string, number> = {};

    for (const m of members) {
      const src = (m.registrationSource || 'DIRECT').toUpperCase();
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;

      if (m.attributionData && typeof m.attributionData === 'object') {
        const attr = m.attributionData as any;
        if (attr.utm_source) {
          const s = String(attr.utm_source).toLowerCase();
          utmSources[s] = (utmSources[s] || 0) + 1;
        }
        if (attr.utm_medium) {
          const med = String(attr.utm_medium).toLowerCase();
          utmMediums[med] = (utmMediums[med] || 0) + 1;
        }
        if (attr.utm_campaign) {
          const camp = String(attr.utm_campaign).toLowerCase();
          utmCampaigns[camp] = (utmCampaigns[camp] || 0) + 1;
        }
      }
    }

    return {
      totalMembersAnalyzed: members.length,
      sourceBreakdown,
      utmBreakdown: {
        sources: utmSources,
        mediums: utmMediums,
        campaigns: utmCampaigns,
      },
      recentAttributions: members.slice(0, 20).map((m) => ({
        id: m.id,
        fullName: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member',
        registrationSource: m.registrationSource || 'DIRECT',
        createdAt: m.createdAt,
        attributionData: m.attributionData,
      })),
    };
  }

  /**
   * Returns list of approved WhatsApp marketing templates.
   */
  getApprovedTemplates() {
    return [
      {
        id: 'festival_wishes_v1',
        name: 'Festive Matchmaker Greetings',
        description: 'Send festival celebrations & auspicious matchmaking wishes to members.',
        category: 'MARKETING',
      },
      {
        id: 'welcome_message_v1',
        name: 'Welcome & Profile Activation',
        description: 'Welcomes newly registered members and guides them to complete their profiles.',
        category: 'ONBOARDING',
      },
      {
        id: 'package_expiry_v1',
        name: 'Package Renewal & Festive Offer',
        description: 'Alerts members about package expiration with renewal discounts.',
        category: 'RETENTION',
      },
      {
        id: 'promotional_offer_v1',
        name: 'Exclusive Matchmaking Upgrade Offer',
        description: 'Promotional discount message for VIP/Gold packages.',
        category: 'PROMOTION',
      },
      {
        id: 'biodata_share_v1',
        name: 'Suggested Profile Discovery Update',
        description: 'Notifies members of hand-curated suggested matches from relationship managers.',
        category: 'MATCHMAKING',
      },
    ];
  }
}
