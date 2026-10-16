import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class EventNotificationsService {
  private readonly logger = new Logger(EventNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to hash an OTP string with SHA-256 (Never store plaintext)
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  // ──────────────────────────────────────────────────────────
  // E. INTEREST NOTIFICATIONS
  // ──────────────────────────────────────────────────────────

  /**
   * Triggered when Member A sends interest to Member B.
   * Notifies Member B through App Push.
   */
  async onInterestSent(senderProfileId: string, receiverProfileId: string) {
    const [sender, receiver] = await Promise.all([
      this.prisma.memberProfile.findUnique({
        where: { id: senderProfileId },
        select: { memberId: true, firstName: true, lastName: true },
      }),
      this.prisma.memberProfile.findUnique({
        where: { id: receiverProfileId },
        include: { user: { select: { id: true, mobile: true } } },
      }),
    ]);

    if (!sender || !receiver) return;

    const senderName = `${sender.firstName} ${sender.lastName}`;
    const pushMsg = `💖 Someone liked your profile! ${senderName} (${sender.memberId}) has sent you an expression of interest. Open the app to view their profile.`;

    if (receiver.user?.mobile) {
      await this.notificationsService.sendNotification({
        type: 'INTEREST_RECEIVED',
        channel: 'APP_PUSH',
        recipientContact: receiver.user.mobile,
        recipientName: `${receiver.firstName} ${receiver.lastName}`,
        recipientUserId: receiver.userId,
        recipientMemberProfileId: receiver.id,
        title: 'New Interest Received! 💖',
        content: pushMsg,
        metadata: { senderProfileId, senderMemberId: sender.memberId },
        idempotencyKey: `INTEREST_SENT_${senderProfileId}_${receiverProfileId}`,
      });
    }
  }

  /**
   * Triggered when Member B accepts Member A's interest.
   * Notifies Member A through App Push.
   */
  async onInterestAccepted(senderProfileId: string, receiverProfileId: string) {
    const [sender, receiver] = await Promise.all([
      this.prisma.memberProfile.findUnique({
        where: { id: senderProfileId },
        include: { user: { select: { id: true, mobile: true } } },
      }),
      this.prisma.memberProfile.findUnique({
        where: { id: receiverProfileId },
        select: { memberId: true, firstName: true, lastName: true },
      }),
    ]);

    if (!sender || !receiver) return;

    const receiverName = `${receiver.firstName} ${receiver.lastName}`;
    const pushMsg = `🎉 Great news! ${receiverName} (${receiver.memberId}) has accepted your expression of interest! You can now request their verified contact details.`;

    if (sender.user?.mobile) {
      await this.notificationsService.sendNotification({
        type: 'INTEREST_ACCEPTED',
        channel: 'APP_PUSH',
        recipientContact: sender.user.mobile,
        recipientName: `${sender.firstName} ${sender.lastName}`,
        recipientUserId: sender.userId,
        recipientMemberProfileId: sender.id,
        title: 'Interest Accepted! 🎉',
        content: pushMsg,
        metadata: { receiverProfileId, receiverMemberId: receiver.memberId },
        idempotencyKey: `INTEREST_ACCEPTED_${senderProfileId}_${receiverProfileId}_${Date.now()}`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // F. PROFILE BLOCKED NOTIFICATION
  // ──────────────────────────────────────────────────────────

  /**
   * Automatically send SMS to the member when authorised staff blocks their profile.
   * Records staff ID, member ID, date, time, and notification status.
   */
  async onProfileBlocked(
    memberProfileId: string,
    blockedByStaffId: string,
    reason?: string,
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: {
        user: { select: { id: true, mobile: true } },
        blockedBy: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    if (!profile || !profile.user?.mobile) return;

    const memberName = `${profile.firstName} ${profile.lastName}`;
    const reasonText = reason ? ` Reason: ${reason}.` : '';
    const smsMsg = `Dear ${profile.firstName}, your profile (${profile.memberId}) on Partner Matching Platform has been temporarily suspended.${reasonText} Please contact our support team at support@partnermatching.com or call HQ for assistance.`;

    const log = await this.notificationsService.sendNotification({
      type: 'PROFILE_BLOCKED',
      channel: 'SMS',
      recipientContact: profile.user.mobile,
      recipientName: memberName,
      recipientUserId: profile.userId,
      recipientMemberProfileId: profile.id,
      title: 'Profile Status Alert',
      content: smsMsg,
      metadata: {
        blockedById: blockedByStaffId,
        blockedByEmployeeId: profile.blockedBy?.employeeId,
        blockedAt: profile.blockedAt || new Date(),
        reason: reason || 'Not Specified',
      },
      idempotencyKey: `PROFILE_BLOCK_${profile.id}_${Date.now()}`,
    });

    this.logger.log(
      `🔒 [PROFILE BLOCK SMS NOTIFIED] Member: ${profile.memberId} | BlockedBy: ${blockedByStaffId} | LogID: ${log.id}`,
    );

    return log;
  }

  // ──────────────────────────────────────────────────────────
  // G. SUPPORT TICKET CLOSURE OTP
  // ──────────────────────────────────────────────────────────

  /**
   * When Service Team requests ticket closure, generate and send an OTP
   * to the member's registered mobile number through SMS.
   * Rate limited: 60s cooldown between OTP requests.
   * Securely hashes OTP before storage.
   */
  async requestTicketClosureOtp(actor: any, ticketId: string, ipAddress?: string) {
    if (
      actor.role !== Role.HQ_SERVICE_TEAM &&
      actor.role !== Role.SUPER_ADMIN &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied: only HQ Service Team or Admins can close support tickets');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        memberProfile: {
          include: { user: { select: { id: true, mobile: true } } },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Ticket is already closed');
    }

    // Rate limiting: 60 seconds cooldown
    if (ticket.closureOtpSentAt) {
      const cooldown = 60 * 1000;
      const elapsed = Date.now() - ticket.closureOtpSentAt.getTime();
      if (elapsed < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - elapsed) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        );
      }
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save hashed OTP (Never plaintext)
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'PENDING_OTP',
        closureOtp: null, // Clear legacy plaintext field
        closureOtpHash: otpHash,
        closureOtpSentAt: new Date(),
        closureOtpExpiresAt: expiresAt,
        closureOtpFailedAttempts: 0, // Reset failed attempts on new OTP
      },
    });

    // Send OTP through SMS
    const mobile = ticket.memberProfile?.user?.mobile;
    const memberName = ticket.memberProfile
      ? `${ticket.memberProfile.firstName} ${ticket.memberProfile.lastName}`
      : 'Member';

    if (mobile) {
      await this.notificationsService.sendNotification({
        type: 'TICKET_CLOSURE_OTP',
        channel: 'SMS',
        recipientContact: mobile,
        recipientName: memberName,
        recipientUserId: ticket.memberProfile?.userId,
        recipientMemberProfileId: ticket.memberProfileId,
        title: 'Support Ticket Closure OTP',
        content: `Your OTP for closing Partner Matching Support Ticket #${ticketId.slice(0, 8).toUpperCase()} is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone unless you confirm your issue is resolved.`,
        metadata: { ticketId, staffId: actor.id },
        idempotencyKey: `TICKET_OTP_${ticketId}_${Date.now()}`,
      });
    }

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.OTP_SENT,
      resourceType: 'SupportTicket',
      resourceId: ticketId,
      orgId: actor.organizationId,
      metadata: { mobile: mobile ? `${mobile.slice(0, 3)}****${mobile.slice(-3)}` : 'N/A' },
      ipAddress,
    });

    return {
      success: true,
      message: 'Closure OTP securely dispatched to member registered mobile number',
      ticketId,
      expiresInMinutes: 10,
      // Dev OTP provided ONLY in development/testing mode for automated verification
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Verify OTP securely and close ticket.
   * Validates hash, checks 10m expiry, and enforces max 3 retry attempts limit.
   */
  async verifyOtpAndClose(
    actor: any,
    ticketId: string,
    otp: string,
    ipAddress?: string,
  ) {
    if (
      actor.role !== Role.HQ_SERVICE_TEAM &&
      actor.role !== Role.SUPER_ADMIN &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied: only HQ Service Team or Admins can close support tickets');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');
    if (ticket.status !== 'PENDING_OTP') {
      throw new BadRequestException('Ticket is not awaiting OTP verification');
    }

    // Expiry validation (10 minutes)
    if (!ticket.closureOtpExpiresAt || Date.now() > ticket.closureOtpExpiresAt.getTime()) {
      throw new BadRequestException('OTP has expired. Please request a new closure OTP.');
    }

    // Retry limit check (Max 3 failed attempts)
    if (ticket.closureOtpFailedAttempts >= 3) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded for this OTP. Please request a new closure OTP.',
      );
    }

    // Hash check
    const suppliedHash = this.hashOtp(otp.trim());
    const isMatch = ticket.closureOtpHash
      ? ticket.closureOtpHash === suppliedHash
      : ticket.closureOtp === otp; // Fallback for legacy

    if (!isMatch) {
      // Increment failed attempts
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { closureOtpFailedAttempts: { increment: 1 } },
      });

      const remaining = 3 - (ticket.closureOtpFailedAttempts + 1);
      throw new ForbiddenException(
        `Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining before OTP invalidation.`,
      );
    }

    // OTP Validated: Close Ticket and invalidate OTP
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closureOtpVerifiedAt: new Date(),
        closureOtp: null,
        closureOtpHash: null,
        closureOtpExpiresAt: null,
        closureOtpFailedAttempts: 0,
        resolvedById: actor.id,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.TICKET_CLOSE,
      resourceType: 'SupportTicket',
      resourceId: ticketId,
      orgId: actor.organizationId,
      metadata: { closedBy: actor.id },
      ipAddress,
    });

    return {
      success: true,
      message: 'Support ticket verified and closed successfully',
      ticket: updated,
    };
  }
}
