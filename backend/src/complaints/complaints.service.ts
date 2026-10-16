import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  ComplaintQueryDto,
} from './dto/complaint.dto';
import { ComplaintType, ComplaintStatus } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Enforce strict admin access checks.
   * Specification Requirement: Complaints must be visible ONLY to Admin-level users (SUPER_ADMIN, ADMIN).
   * Members, agents, and normal staff are strictly denied at the API and DB level.
   */
  private verifyAdminAccess(actor: { id: string; role: string }) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Complaints are strictly restricted to authorized Admin users.',
      );
    }
  }

  /**
   * Generate sequential complaint reference number CMP-YYYY-XXXX
   */
  private async generateComplaintNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.internalComplaint.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    return `CMP-${year}-${seq}`;
  }

  /**
   * Create an internal complaint
   */
  async createComplaint(actor: { id: string; role: string }, dto: CreateComplaintDto) {
    this.verifyAdminAccess(actor);

    // Validate related IDs
    if (dto.type === ComplaintType.MEMBER) {
      if (!dto.relatedMemberId) {
        throw new BadRequestException('relatedMemberId is required for MEMBER complaints.');
      }
      const member = await this.prisma.memberProfile.findFirst({
        where: {
          OR: [
            { id: dto.relatedMemberId },
            { memberId: dto.relatedMemberId },
          ],
        },
      });
      if (!member) {
        throw new NotFoundException(`Member record not found for ID: ${dto.relatedMemberId}`);
      }
      dto.relatedMemberId = member.id;
    } else if (dto.type === ComplaintType.STAFF) {
      if (!dto.relatedStaffId) {
        throw new BadRequestException('relatedStaffId is required for STAFF complaints.');
      }
      const staff = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: dto.relatedStaffId },
            { employeeId: dto.relatedStaffId },
          ],
        },
      });
      if (!staff) {
        throw new NotFoundException(`Staff record not found for ID: ${dto.relatedStaffId}`);
      }
      dto.relatedStaffId = staff.id;
    }

    const complaintNumber = await this.generateComplaintNumber();

    const initialHistory = [
      {
        status: ComplaintStatus.OPEN,
        changedById: actor.id,
        timestamp: new Date().toISOString(),
        notes: 'Complaint logged into internal records',
      },
    ];

    const complaint = await this.prisma.internalComplaint.create({
      data: {
        complaintNumber,
        type: dto.type,
        relatedMemberId: dto.relatedMemberId || null,
        relatedStaffId: dto.relatedStaffId || null,
        subject: dto.subject,
        description: dto.description,
        status: ComplaintStatus.OPEN,
        internalNotes: dto.internalNotes || null,
        createdById: actor.id,
        statusHistory: initialHistory,
      },
      include: {
        relatedMember: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                mobile: true,
                email: true,
              },
            },
          },
        },
        relatedStaff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            mobile: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
          },
        },
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'InternalComplaint',
        resourceId: complaint.id,
        metadata: {
          complaintNumber: complaint.complaintNumber,
          type: complaint.type,
          subject: complaint.subject,
        },
      });
    }

    return {
      success: true,
      message: 'Complaint logged successfully',
      complaint,
    };
  }

  /**
   * List complaints with filtering and search
   */
  async listComplaints(actor: { id: string; role: string }, query: ComplaintQueryDto) {
    this.verifyAdminAccess(actor);

    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { complaintNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          relatedMember: {
            OR: [
              { memberId: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          relatedStaff: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { employeeId: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [total, complaints] = await Promise.all([
      this.prisma.internalComplaint.count({ where }),
      this.prisma.internalComplaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          relatedMember: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              user: {
                select: {
                  mobile: true,
                  email: true,
                },
              },
            },
          },
          relatedStaff: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              email: true,
              mobile: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      complaints,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(actor: { id: string; role: string }, id: string) {
    this.verifyAdminAccess(actor);

    const complaint = await this.prisma.internalComplaint.findUnique({
      where: { id },
      include: {
        relatedMember: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                mobile: true,
                email: true,
              },
            },
          },
        },
        relatedStaff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            email: true,
            mobile: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint record not found for ID: ${id}`);
    }

    return complaint;
  }

  /**
   * Update complaint status or internal notes
   */
  async updateComplaint(
    actor: { id: string; role: string },
    id: string,
    dto: UpdateComplaintDto,
  ) {
    this.verifyAdminAccess(actor);

    const existing = await this.prisma.internalComplaint.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Complaint record not found for ID: ${id}`);
    }

    const data: any = {};
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes;
    }

    if (dto.status && dto.status !== existing.status) {
      data.status = dto.status;
      const history = Array.isArray(existing.statusHistory)
        ? [...(existing.statusHistory as any[])]
        : [];
      history.push({
        status: dto.status,
        changedById: actor.id,
        timestamp: new Date().toISOString(),
        notes: dto.historyNote || dto.internalNotes || `Status changed to ${dto.status}`,
      });
      data.statusHistory = history;
    }

    const updated = await this.prisma.internalComplaint.update({
      where: { id },
      data,
      include: {
        relatedMember: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
          },
        },
        relatedStaff: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'InternalComplaint',
        resourceId: id,
        metadata: {
          previousStatus: existing.status,
          newStatus: updated.status,
        },
      });
    }

    return {
      success: true,
      message: 'Complaint updated successfully',
      complaint: updated,
    };
  }
}
