import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';
import {
  PreviewBulkSmsDto,
  SendBulkSmsCampaignDto,
} from './dto/notifications.dto';

@Injectable()
export class BulkSmsService {
  private readonly logger = new Logger(BulkSmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to resolve and validate target branch for an actor
   */
  private resolveBranchOrgId(actor: any, requestedBranchOrgId?: string): string | null {
    if (actor.role === Role.BRANCH_MANAGER) {
      if (!actor.organizationId) {
        throw new ForbiddenException('Branch Manager is not associated with any branch organization');
      }
      // Branch Manager MUST strictly use their own branch
      if (requestedBranchOrgId && requestedBranchOrgId !== actor.organizationId) {
        throw new ForbiddenException(
          'Security Violation: Branch Manager cannot target members outside their assigned branch',
        );
      }
      return actor.organizationId;
    }

    // Admin / Super Admin can specify any branch, or all branches if null
    return requestedBranchOrgId || null;
  }

  /**
   * Helper to build member filtering query
   */
  private buildQuery(branchOrgId: string | null, idRangeStart?: string, idRangeEnd?: string) {
    const where: any = { isBlocked: false };

    if (branchOrgId) {
      where.ownerOrgId = branchOrgId;
    }

    if (idRangeStart && idRangeEnd) {
      where.memberId = {
        gte: idRangeStart.trim(),
        lte: idRangeEnd.trim(),
      };
    } else if (idRangeStart) {
      where.memberId = { gte: idRangeStart.trim() };
    } else if (idRangeEnd) {
      where.memberId = { lte: idRangeEnd.trim() };
    }

    return where;
  }

  /**
   * 1. Preview Bulk SMS Campaign (with recipient count & branch isolation preview)
   */
  async previewCampaign(actor: any, dto: PreviewBulkSmsDto) {
    const branchOrgId = this.resolveBranchOrgId(actor, dto.branchOrgId);
    const where = this.buildQuery(branchOrgId, dto.targetIdRangeStart, dto.targetIdRangeEnd);

    const [recipientCount, sampleMembers, branchInfo] = await Promise.all([
      this.prisma.memberProfile.count({ where }),
      this.prisma.memberProfile.findMany({
        where,
        take: 5,
        orderBy: { memberId: 'asc' },
        include: {
          user: { select: { mobile: true } },
          ownerOrg: { select: { id: true, name: true } },
        },
      }),
      branchOrgId
        ? this.prisma.organization.findUnique({
            where: { id: branchOrgId },
            select: { id: true, name: true },
          })
        : null,
    ]);

    const estimatedCost = Math.round(recipientCount * 0.25 * 100) / 100; // 0.25 INR per SMS

    return {
      branchName: branchInfo?.name || 'All Branches (HQ)',
      branchOrgId,
      recipientCount,
      estimatedCost,
      idRange: {
        start: dto.targetIdRangeStart || 'Beginning',
        end: dto.targetIdRangeEnd || 'End',
      },
      sampleRecipients: sampleMembers.map((m) => ({
        memberId: m.memberId,
        name: `${m.firstName} ${m.lastName}`,
        maskedMobile: m.user?.mobile
          ? `${m.user.mobile.slice(0, 3)}****${m.user.mobile.slice(-3)}`
          : 'N/A',
        branch: m.ownerOrg?.name || 'Unassigned',
      })),
    };
  }

  /**
   * 2. Send Bulk SMS Campaign
   * Enforces branch isolation, creates campaign record, dispatches via notification service,
   * tracks delivery metrics and costs.
   */
  async sendCampaign(actor: any, dto: SendBulkSmsCampaignDto, ipAddress?: string) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('Campaign title and message content are required');
    }

    const branchOrgId = this.resolveBranchOrgId(actor, dto.branchOrgId);
    const where = this.buildQuery(branchOrgId, dto.targetIdRangeStart, dto.targetIdRangeEnd);

    // Fetch targeted members with their registered mobile numbers
    const targetMembers = await this.prisma.memberProfile.findMany({
      where,
      include: {
        user: { select: { id: true, mobile: true } },
        ownerOrg: { select: { id: true, name: true } },
      },
      orderBy: { memberId: 'asc' },
    });

    const recipientCount = targetMembers.length;
    if (recipientCount === 0) {
      throw new BadRequestException('No active members found within the specified branch and ID range');
    }

    const costPerSms = 0.25;
    const totalCost = Math.round(recipientCount * costPerSms * 100) / 100;

    // Create Campaign record
    const campaign = await this.prisma.smsCampaign.create({
      data: {
        branchOrgId,
        title: dto.title,
        message: dto.message,
        targetIdRangeStart: dto.targetIdRangeStart,
        targetIdRangeEnd: dto.targetIdRangeEnd,
        recipientCount,
        successCount: 0,
        failedCount: 0,
        costPerSms,
        totalCost,
        createdById: actor.id,
        status: 'PROCESSING',
      },
    });

    // Execute SMS Dispatch per member
    let successCount = 0;
    let failedCount = 0;

    for (const member of targetMembers) {
      const mobile = member.user?.mobile;
      if (!mobile) {
        failedCount++;
        continue;
      }

      try {
        const log = await this.notificationsService.sendNotification({
          type: 'BULK_BRANCH_SMS',
          channel: 'SMS',
          recipientContact: mobile,
          recipientName: `${member.firstName} ${member.lastName}`,
          recipientUserId: member.userId,
          recipientMemberProfileId: member.id,
          title: dto.title,
          content: dto.message,
          metadata: {
            campaignId: campaign.id,
            branchOrgId,
            branchName: member.ownerOrg?.name,
          },
          idempotencyKey: `BULK_SMS_${campaign.id}_${member.id}`,
        });

        if (log.status === 'SENT') {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    // Update Campaign with final metrics
    const updatedCampaign = await this.prisma.smsCampaign.update({
      where: { id: campaign.id },
      data: {
        successCount,
        failedCount,
        status: 'SENT',
        deliveryDetails: {
          dispatchedAt: new Date(),
          successRate: Math.round((successCount / recipientCount) * 100),
        },
      },
    });

    // Audit Log
    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.OTP_SENT, // bulk communication
      resourceType: 'SmsCampaign',
      resourceId: campaign.id,
      orgId: branchOrgId,
      metadata: {
        title: dto.title,
        recipientCount,
        successCount,
        failedCount,
        branchOrgId,
      },
      ipAddress,
    });

    this.logger.log(
      `📨 [BULK SMS DISPATCHED] Campaign: "${dto.title}" | Branch: ${branchOrgId || 'All'} | Sent: ${successCount}/${recipientCount}`,
    );

    return {
      success: true,
      message: `Bulk SMS campaign successfully dispatched to ${successCount} member(s)`,
      campaign: updatedCampaign,
    };
  }

  /**
   * 3. HQ Admin & Branch Manager Campaign History & Usage Reports
   */
  async getUsageReports(actor: any) {
    const where: any = {};
    if (actor.role === Role.BRANCH_MANAGER) {
      where.branchOrgId = actor.organizationId;
    }

    const campaigns = await this.prisma.smsCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const orgs = await this.prisma.organization.findMany();
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    const branchUsageMap: Record<
      string,
      {
        branchId: string;
        branchName: string;
        totalCampaigns: number;
        totalSmsSent: number;
        successCount: number;
        totalCost: number;
      }
    > = {};

    for (const c of campaigns) {
      const branchKey = c.branchOrgId || 'HQ_GLOBAL';
      const branchName = c.branchOrgId ? orgMap.get(c.branchOrgId) || 'Branch' : 'HQ Central';

      if (!branchUsageMap[branchKey]) {
        branchUsageMap[branchKey] = {
          branchId: branchKey,
          branchName,
          totalCampaigns: 0,
          totalSmsSent: 0,
          successCount: 0,
          totalCost: 0,
        };
      }
      branchUsageMap[branchKey].totalCampaigns += 1;
      branchUsageMap[branchKey].totalSmsSent += c.recipientCount;
      branchUsageMap[branchKey].successCount += c.successCount;
      branchUsageMap[branchKey].totalCost += c.totalCost;
    }

    return {
      branchUsage: Object.values(branchUsageMap),
      recentCampaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        message: c.message,
        branchName: c.branchOrgId ? orgMap.get(c.branchOrgId) || 'Branch' : 'HQ Central',
        recipientCount: c.recipientCount,
        successCount: c.successCount,
        failedCount: c.failedCount,
        totalCost: c.totalCost,
        idRange:
          c.targetIdRangeStart && c.targetIdRangeEnd
            ? `${c.targetIdRangeStart} - ${c.targetIdRangeEnd}`
            : 'All Members',
        status: c.status,
        createdAt: c.createdAt,
      })),
    };
  }
}
