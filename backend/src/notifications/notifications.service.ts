import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationProvider } from './providers/push.provider';
import { SmsNotificationProvider } from './providers/sms.provider';
import { EmailNotificationProvider } from './providers/email.provider';
import { WhatsAppNotificationProvider } from './providers/whatsapp.provider';
import {
  NotificationPayload,
  ProviderDispatchResult,
} from './providers/interfaces';
import {
  QueryNotificationHistoryDto,
  RegisterPushTokenDto,
  SendTestNotificationDto,
} from './dto/notifications.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushProvider: PushNotificationProvider,
    private readonly smsProvider: SmsNotificationProvider,
    private readonly emailProvider: EmailNotificationProvider,
    private readonly whatsappProvider: WhatsAppNotificationProvider,
  ) {}

  /**
   * Central idempotent notification dispatch method.
   * Dispatches via provider and persists immutable delivery audit record.
   */
  async sendNotification(payload: NotificationPayload) {
    // 1. Idempotency Check (prevent duplicate scheduled reminders)
    if (payload.idempotencyKey) {
      const existing = await this.prisma.notificationLog.findUnique({
        where: { idempotencyKey: payload.idempotencyKey },
      });
      if (existing && existing.status === 'SENT') {
        this.logger.debug(
          `[IDEMPOTENT SKIP] Notification ${payload.idempotencyKey} already dispatched at ${existing.sentAt.toISOString()}`,
        );
        return existing;
      }
    }

    // 2. Select Provider based on channel
    let result: ProviderDispatchResult;
    try {
      switch (payload.channel) {
        case 'APP_PUSH':
          result = await this.pushProvider.dispatch(payload);
          break;
        case 'SMS':
          result = await this.smsProvider.dispatch(payload);
          break;
        case 'EMAIL':
          result = await this.emailProvider.dispatch(payload);
          break;
        case 'WHATSAPP':
          result = await this.whatsappProvider.dispatch(payload);
          break;
        default:
          throw new BadRequestException(`Unsupported notification channel: ${payload.channel}`);
      }
    } catch (err: any) {
      this.logger.error(`Dispatch failure for channel ${payload.channel}: ${err.message}`);
      result = {
        success: false,
        provider: 'UNKNOWN',
        error: err.message,
      };
    }

    // 3. Persist log record in database
    const log = await this.prisma.notificationLog.upsert({
      where: {
        idempotencyKey: payload.idempotencyKey || `auto_${Date.now()}_${Math.random()}`,
      },
      create: {
        type: payload.type,
        channel: payload.channel,
        recipientUserId: payload.recipientUserId,
        recipientMemberProfileId: payload.recipientMemberProfileId,
        recipientContact: payload.recipientContact,
        recipientName: payload.recipientName,
        title: payload.title,
        content: payload.content,
        templateId: payload.templateId,
        status: result.success ? 'SENT' : 'FAILED',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        error: result.error,
        metadata: {
          ...payload.metadata,
          simulated: result.simulated ?? false,
        },
        idempotencyKey: payload.idempotencyKey,
        scheduledFor: payload.scheduledFor,
        sentAt: new Date(),
      },
      update: {
        status: result.success ? 'SENT' : 'FAILED',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        error: result.error,
        sentAt: new Date(),
      },
    });

    return log;
  }

  /**
   * List notification delivery logs with role-based scoping and filters
   */
  async getNotificationHistory(actor: any, query: QueryNotificationHistoryDto) {
    const where: any = {};

    // Role-based visibility
    if (actor.role === Role.MEMBER) {
      where.recipientUserId = actor.id;
    } else if (actor.role === Role.BRANCH_MANAGER && actor.organizationId) {
      // Branch Manager sees notifications for members in their branch
      where.OR = [
        { recipientUserId: actor.id },
        { recipientMemberProfile: { ownerOrgId: actor.organizationId } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.sentAt = {};
      if (query.startDate) where.sentAt.gte = new Date(query.startDate);
      if (query.endDate) where.sentAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { recipientContact: { contains: q, mode: 'insensitive' } },
            { recipientName: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          recipientUser: {
            select: { id: true, mobile: true, email: true, role: true },
          },
          recipientMemberProfile: {
            select: { id: true, memberId: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }

  /**
   * Aggregate statistics for communications dashboard
   */
  async getNotificationStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalToday,
      sentToday,
      failedToday,
      channelBreakdown,
      typeBreakdown,
      recentFailures,
    ] = await Promise.all([
      this.prisma.notificationLog.count({
        where: { sentAt: { gte: startOfToday } },
      }),
      this.prisma.notificationLog.count({
        where: { sentAt: { gte: startOfToday }, status: 'SENT' },
      }),
      this.prisma.notificationLog.count({
        where: { sentAt: { gte: startOfToday }, status: 'FAILED' },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['channel'],
        _count: { _all: true },
        where: { sentAt: { gte: startOfToday } },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['type'],
        _count: { _all: true },
        where: { sentAt: { gte: startOfToday } },
      }),
      this.prisma.notificationLog.findMany({
        where: { status: 'FAILED' },
        take: 5,
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    return {
      today: {
        total: totalToday,
        sent: sentToday,
        failed: failedToday,
        deliveryRate: totalToday > 0 ? Math.round((sentToday / totalToday) * 100) : 100,
      },
      channels: channelBreakdown.map((c) => ({
        channel: c.channel,
        count: c._count._all,
      })),
      types: typeBreakdown.map((t) => ({
        type: t.type,
        count: t._count._all,
      })),
      recentFailures,
    };
  }

  /**
   * Register or update a device FCM push token for a user
   */
  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    return this.prisma.userPushToken.upsert({
      where: {
        userId_token: {
          userId,
          token: dto.token,
        },
      },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform || 'WEB',
        isActive: true,
      },
      update: {
        platform: dto.platform || 'WEB',
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Dispatch a manual test message (Admin / Super Admin)
   */
  async sendTestNotification(actor: any, dto: SendTestNotificationDto) {
    return this.sendNotification({
      type: 'MANUAL',
      channel: dto.channel,
      recipientContact: dto.recipientContact,
      recipientName: dto.recipientName || 'Test Recipient',
      recipientUserId: actor.id,
      title: dto.title || 'Platform Test Dispatch',
      content: dto.content,
      templateId: dto.templateId,
      metadata: { dispatchedBy: actor.id, role: actor.role },
      idempotencyKey: `TEST_${Date.now()}_${Math.random()}`,
    });
  }
}
