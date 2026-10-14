import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class MobileRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 5.4 Mobile Requests Table:
   * Sender ID, gender, marital status, contacts revealed count, package
   * Receiver ID, gender, marital status, contacts revealed count, package
   * Requested date/time, status, action date/time, action by Staff/Member ID
   */
  async listMobileRequests(options: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (options.status) {
      where.status = options.status.toUpperCase();
    }

    if (options.search) {
      const q = options.search.trim();
      where.OR = [
        { sender: { memberId: { contains: q, mode: 'insensitive' } } },
        { receiver: { memberId: { contains: q, mode: 'insensitive' } } },
        { sender: { firstName: { contains: q, mode: 'insensitive' } } },
        { receiver: { firstName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, requests] = await Promise.all([
      this.prisma.contactRevealRequest.count({ where }),
      this.prisma.contactRevealRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              gender: true,
              packageType: true,
              contactsRevealedCount: true,
              currentPackage: { select: { name: true } },
              profileData: true,
            },
          },
          receiver: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              gender: true,
              packageType: true,
              contactsRevealedCount: true,
              currentPackage: { select: { name: true } },
              profileData: true,
              user: { select: { mobile: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      requests: requests.map((r) => {
        const senderData = (r.sender.profileData as Record<string, any>) || {};
        const receiverData = (r.receiver.profileData as Record<string, any>) || {};

        return {
          id: r.id,
          revealType: r.revealType,
          status: r.status,
          createdAt: r.createdAt,
          actionDate: r.actionDate,
          actionById: r.actionById,
          actionByType: r.actionByType,
          unlocksAt: r.unlocksAt,
          revealedAt: r.revealedAt,
          sender: {
            id: r.sender.id,
            memberId: r.sender.memberId,
            name: `${r.sender.firstName} ${r.sender.lastName}`,
            gender: r.sender.gender,
            maritalStatus: senderData.maritalStatus || 'Unmarried',
            contactsRevealedCount: r.sender.contactsRevealedCount,
            package: r.sender.currentPackage?.name || r.sender.packageType,
          },
          receiver: {
            id: r.receiver.id,
            memberId: r.receiver.memberId,
            name: `${r.receiver.firstName} ${r.receiver.lastName}`,
            gender: r.receiver.gender,
            maritalStatus: receiverData.maritalStatus || 'Unmarried',
            contactsRevealedCount: r.receiver.contactsRevealedCount,
            package: r.receiver.currentPackage?.name || r.receiver.packageType,
          },
        };
      }),
    };
  }

  /**
   * Authorized staff can accept or reject contact reveal requests on behalf of members.
   * Action date and Staff ID are recorded.
   */
  async respondOnBehalfOfMember(
    actor: any,
    requestId: string,
    action: 'ACCEPTED' | 'REJECTED',
    ipAddress?: string,
  ) {
    const request = await this.prisma.contactRevealRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: true,
        receiver: { include: { user: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Contact reveal request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const actionDate = new Date();

    const updated = await this.prisma.contactRevealRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'ACCEPTED' ? 'REVEALED' : 'REJECTED',
        actionDate,
        actionById: actor.id,
        actionByType: 'STAFF',
        revealedAt: action === 'ACCEPTED' ? actionDate : null,
      },
    });

    // If accepted, increment sender's revealed contacts count
    if (action === 'ACCEPTED') {
      await this.prisma.memberProfile.update({
        where: { id: request.senderProfileId },
        data: {
          contactsRevealedCount: { increment: 1 },
        },
      });

      // Log contact reveal log in profile views
      await this.prisma.profileViewLog.create({
        data: {
          viewerProfileId: request.senderProfileId,
          viewedProfileId: request.receiverProfileId,
        },
      });
    }

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: action === 'ACCEPTED' ? AuditAction.CONTACT_REVEALED : AuditAction.PROFILE_EDIT,
      resourceType: 'ContactRevealRequest',
      resourceId: requestId,
      metadata: {
        senderMemberId: request.sender.memberId,
        receiverMemberId: request.receiver.memberId,
        action,
        onBehalfOfMember: true,
      },
      ipAddress,
    });

    return {
      message: `Contact request ${action.toLowerCase()} by staff on behalf of member`,
      request: updated,
    };
  }
}
