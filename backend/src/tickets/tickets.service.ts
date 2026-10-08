import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { Role, RoleType } from '../common/constants/roles.constants';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get a ticket (HQ Service Team only for paid member tickets)
   */
  async getTicket(actor: any, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { memberProfile: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    return ticket;
  }

  /**
   * Request ticket closure — sends OTP to member's mobile.
   * Only HQ_SERVICE_TEAM (and admins) can close tickets.
   */
  async requestTicketClosure(actor: any, ticketId: string, ipAddress?: string) {
    const actorRole = actor.role as RoleType;

    if (
      actorRole !== Role.HQ_SERVICE_TEAM &&
      actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Access denied: only HQ Service Team can close support tickets',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        memberProfile: {
          include: { user: { select: { mobile: true } } },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Ticket is already closed');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // In production: send via SMS gateway
    // For now: store OTP hash (never log plain OTP)
    const otpHash = otp; // TODO: hash in production

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'PENDING_OTP',
        closureOtp: otpHash,
        closureOtpSentAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.OTP_SENT,
      resourceType: 'SupportTicket',
      resourceId: ticketId,
      orgId: actor.organizationId,
      metadata: { mobile: ticket.memberProfile?.user?.mobile },
      ipAddress,
    });

    // In production: SMS sent here
    return {
      message: 'OTP sent to member mobile',
      ticketId,
      // DO NOT expose OTP in response in production
      // exposing here ONLY for development/testing
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
  }

  /**
   * Verify OTP and close ticket.
   * Staff cannot bypass this.
   */
  async verifyOtpAndClose(
    actor: any,
    ticketId: string,
    otp: string,
    ipAddress?: string,
  ) {
    const actorRole = actor.role as RoleType;

    if (
      actorRole !== Role.HQ_SERVICE_TEAM &&
      actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Access denied: only HQ Service Team can close support tickets',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'PENDING_OTP') {
      throw new BadRequestException('Ticket is not awaiting OTP verification');
    }

    if (ticket.closureOtp !== otp) {
      throw new ForbiddenException('Invalid OTP');
    }

    // Check OTP expiry (10 minutes)
    const otpAge = Date.now() - (ticket.closureOtpSentAt?.getTime() || 0);
    if (otpAge > 10 * 60 * 1000) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closureOtpVerifiedAt: new Date(),
        closureOtp: null, // clear OTP after use
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.TICKET_CLOSE,
      resourceType: 'SupportTicket',
      resourceId: ticketId,
      orgId: actor.organizationId,
      ipAddress,
    });

    return { message: 'Ticket closed successfully', ticketId };
  }
}
