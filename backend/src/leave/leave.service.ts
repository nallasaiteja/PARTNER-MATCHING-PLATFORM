import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditAction, AttendanceStatus, LeaveStatus } from '@prisma/client';
import { Role, RoleType } from '../common/constants/roles.constants';
import {
  ApplyLeaveDto,
  ReviewLeaveDto,
  ManualAttendanceCorrectionDto,
  QueryLeaveDto,
  QueryAttendanceDto,
} from './dto/leave-management.dto';

// Configurable office hours defaults
export interface OfficeHoursConfig {
  officeStartHour: number; // e.g. 9
  officeStartMinute: number; // e.g. 30
  halfDayThresholdHours: number; // e.g. 4.0
  fullDayThresholdHours: number; // e.g. 7.5
}

const DEFAULT_OFFICE_HOURS: OfficeHoursConfig = {
  officeStartHour: 9,
  officeStartMinute: 30,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 7.5,
};

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to format Date to YYYY-MM-DD
   */
  private formatDateToYMD(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  // ==========================================================================
  // A. STAFF PORTAL — LEAVE APPLICATION
  // ==========================================================================

  /**
   * Submit a new leave application
   */
  async applyLeave(staffUser: any, dto: ApplyLeaveDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Valid start and end dates are required.');
    }

    if (start > end) {
      throw new BadRequestException('Leave start date cannot be after end date.');
    }

    // Check for conflicting / overlapping active leave requests for this staff
    const overlapping = await this.prisma.staffLeaveApplication.findFirst({
      where: {
        staffId: staffUser.id,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        `You already have an active leave application (${overlapping.leaveType} - ${overlapping.status}) covering this date range (${overlapping.startDate.toISOString().slice(0, 10)} to ${overlapping.endDate.toISOString().slice(0, 10)}). Duplicate or conflicting applications are not permitted.`,
      );
    }

    const application = await this.prisma.staffLeaveApplication.create({
      data: {
        staffId: staffUser.id,
        branchOrgId: staffUser.organizationId || null,
        leaveType: dto.leaveType.toUpperCase(),
        startDate: start,
        endDate: end,
        reason: dto.reason.trim(),
        status: LeaveStatus.PENDING,
      },
      include: {
        staff: {
          select: { id: true, employeeId: true, fullName: true, mobile: true },
        },
      },
    });

    return {
      success: true,
      message: 'Leave application submitted successfully.',
      leave: application,
    };
  }

  /**
   * View logged-in staff member's leave applications
   */
  async getMyLeaves(staffUser: any, query: QueryLeaveDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = { staffId: staffUser.id };
    if (query.status) where.status = query.status as LeaveStatus;

    const [total, items] = await Promise.all([
      this.prisma.staffLeaveApplication.count({ where }),
      this.prisma.staffLeaveApplication.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          reviewedBy: {
            select: { id: true, employeeId: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      leaves: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel own pending leave application
   */
  async cancelMyLeave(staffUser: any, leaveId: string) {
    const leave = await this.prisma.staffLeaveApplication.findUnique({
      where: { id: leaveId },
    });

    if (!leave) throw new NotFoundException('Leave application not found.');
    if (leave.staffId !== staffUser.id) {
      throw new ForbiddenException('You can only cancel your own leave applications.');
    }
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave applications can be cancelled.');
    }

    const updated = await this.prisma.staffLeaveApplication.update({
      where: { id: leaveId },
      data: { status: LeaveStatus.CANCELLED },
    });

    return { success: true, message: 'Leave application cancelled.', leave: updated };
  }

  // ==========================================================================
  // B. LEAVE MANAGEMENT DASHBOARD (BRANCH & HQ SCOPED)
  // ==========================================================================

  /**
   * List leave applications with role-based scoping
   */
  async listLeaves(actor: any, query: QueryLeaveDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch scoping: Branch Managers can ONLY view staff in their own branch
    if (actor.role === Role.BRANCH_MANAGER) {
      if (!actor.organizationId) {
        throw new ForbiddenException('Branch Manager has no assigned branch organization.');
      }
      where.branchOrgId = actor.organizationId;
    } else if (actor.role === Role.SUPER_ADMIN || actor.role === Role.ADMIN) {
      if (query.branchOrgId) {
        where.branchOrgId = query.branchOrgId;
      }
    } else {
      throw new ForbiddenException('Access denied to leave management records.');
    }

    if (query.status) {
      where.status = query.status as LeaveStatus;
    }

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.startDate && query.endDate) {
      where.startDate = { lte: new Date(query.endDate) };
      where.endDate = { gte: new Date(query.startDate) };
    }

    const [total, items] = await Promise.all([
      this.prisma.staffLeaveApplication.count({ where }),
      this.prisma.staffLeaveApplication.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              fullName: true,
              mobile: true,
              role: true,
              organizationId: true,
            },
          },
          reviewedBy: {
            select: { id: true, employeeId: true, fullName: true },
          },
          branchOrg: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      leaves: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Review leave application (Approve / Reject)
   */
  async reviewLeave(actor: any, leaveId: string, dto: ReviewLeaveDto) {
    const leave = await this.prisma.staffLeaveApplication.findUnique({
      where: { id: leaveId },
      include: {
        staff: true,
      },
    });

    if (!leave) throw new NotFoundException('Leave application not found.');

    // Branch scoping
    if (actor.role === Role.BRANCH_MANAGER) {
      if (!actor.organizationId || leave.branchOrgId !== actor.organizationId) {
        throw new ForbiddenException(
          'Branch Managers can only review leave applications for their assigned branch.',
        );
      }
    } else if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied to review leave applications.');
    }

    if (dto.status === LeaveStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('A reason must be provided when rejecting a leave application.');
    }

    const updated = await this.prisma.staffLeaveApplication.update({
      where: { id: leaveId },
      data: {
        status: dto.status,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: dto.status === LeaveStatus.REJECTED ? dto.rejectionReason?.trim() : null,
      },
    });

    // If APPROVED: automatically mark attendance for dates in range as ON_LEAVE
    if (dto.status === LeaveStatus.APPROVED) {
      await this.syncApprovedLeaveToAttendance(leave.staffId, leave.branchOrgId, leave.startDate, leave.endDate);
    }

    // Notify staff member using notification module
    if (leave.staff) {
      const msg =
        dto.status === LeaveStatus.APPROVED
          ? `Your leave request for ${leave.startDate.toISOString().slice(0, 10)} to ${leave.endDate.toISOString().slice(0, 10)} has been APPROVED.`
          : `Your leave request was REJECTED. Reason: ${dto.rejectionReason}`;

      try {
        await this.notificationsService.sendNotification({
          type: 'STAFF_ANNOUNCEMENT' as any,
          channel: 'APP_PUSH',
          recipientUserId: leave.staff.id,
          recipientContact: leave.staff.mobile,
          recipientName: leave.staff.fullName || 'Staff Member',
          title: `Leave Application ${dto.status}`,
          content: msg,
        });
      } catch (err) {
        console.warn('Could not dispatch leave review notification:', err);
      }
    }

    return {
      success: true,
      message: `Leave application marked as ${dto.status}.`,
      leave: updated,
    };
  }

  /**
   * Sync approved leave range to StaffAttendance so staff is marked ON_LEAVE, not absent
   */
  private async syncApprovedLeaveToAttendance(
    staffId: string,
    branchOrgId: string | null,
    startDate: Date,
    endDate: Date,
  ) {
    const cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      await this.prisma.staffAttendance.upsert({
        where: {
          staffId_date: { staffId, date: dateStr },
        },
        create: {
          staffId,
          branchOrgId,
          date: dateStr,
          status: AttendanceStatus.ON_LEAVE,
          notes: 'Approved Leave',
        },
        update: {
          status: AttendanceStatus.ON_LEAVE,
          notes: 'Approved Leave',
        },
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  // ==========================================================================
  // C. ATTENDANCE BASED ON LOGIN ACTIVITY
  // ==========================================================================

  /**
   * Compute / record attendance when staff logs in or acts during office hours.
   * Avoids counting multiple logins as multiple attendance records.
   * Does NOT mark absent if on approved leave.
   */
  async recordStaffLogin(staffUser: any, timestamp = new Date(), config = DEFAULT_OFFICE_HOURS) {
    const dateStr = this.formatDateToYMD(timestamp);

    // 1. Check if staff is on approved leave today
    const onLeave = await this.prisma.staffLeaveApplication.findFirst({
      where: {
        staffId: staffUser.id,
        status: LeaveStatus.APPROVED,
        startDate: { lte: timestamp },
        endDate: { gte: timestamp },
      },
    });

    const existing = await this.prisma.staffAttendance.findUnique({
      where: {
        staffId_date: {
          staffId: staffUser.id,
          date: dateStr,
        },
      },
    });

    if (existing) {
      // If manually adjusted or already marked ON_LEAVE, do not overwrite status
      if (existing.isManualAdjustment || existing.status === AttendanceStatus.ON_LEAVE) {
        await this.prisma.staffAttendance.update({
          where: { id: existing.id },
          data: { lastActiveAt: timestamp },
        });
        return existing;
      }

      // Compute elapsed hours between firstLoginAt and current timestamp
      const firstLogin = existing.firstLoginAt || timestamp;
      const elapsedHours = Math.max(
        0,
        Math.round(((timestamp.getTime() - firstLogin.getTime()) / (1000 * 60 * 60)) * 10) / 10,
      );

      let status = existing.status;
      if (elapsedHours >= config.fullDayThresholdHours) {
        status = AttendanceStatus.PRESENT;
      } else if (elapsedHours >= config.halfDayThresholdHours) {
        status = AttendanceStatus.HALF_DAY;
      } else {
        status = AttendanceStatus.PRESENT; // Logged in
      }

      return this.prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          lastActiveAt: timestamp,
          workingHours: elapsedHours,
          status,
        },
      });
    }

    // New daily attendance entry
    const initialStatus = onLeave ? AttendanceStatus.ON_LEAVE : AttendanceStatus.PRESENT;

    return this.prisma.staffAttendance.create({
      data: {
        staffId: staffUser.id,
        branchOrgId: staffUser.organizationId || null,
        date: dateStr,
        status: initialStatus,
        firstLoginAt: timestamp,
        lastActiveAt: timestamp,
        workingHours: 0,
        isManualAdjustment: false,
        notes: onLeave ? 'Logged in during approved leave' : 'Computed from login activity',
      },
    });
  }

  /**
   * Manual attendance correction (Restricted to Admins & Branch Managers for their branch)
   */
  async manualCorrectAttendance(actor: any, dto: ManualAttendanceCorrectionDto) {
    const targetStaff = await this.prisma.user.findUnique({
      where: { id: dto.staffId },
      select: { id: true, organizationId: true, role: true, fullName: true },
    });

    if (!targetStaff) throw new NotFoundException('Staff member not found.');

    // Branch scoping
    if (actor.role === Role.BRANCH_MANAGER) {
      if (!actor.organizationId || targetStaff.organizationId !== actor.organizationId) {
        throw new ForbiddenException(
          'Branch Managers can only correct attendance for their own branch staff.',
        );
      }
    } else if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied to correct attendance.');
    }

    const record = await this.prisma.staffAttendance.upsert({
      where: {
        staffId_date: {
          staffId: dto.staffId,
          date: dto.date,
        },
      },
      create: {
        staffId: dto.staffId,
        branchOrgId: targetStaff.organizationId || null,
        date: dto.date,
        status: dto.status,
        workingHours: dto.workingHours,
        isManualAdjustment: true,
        adjustedById: actor.id,
        notes: dto.notes.trim(),
      },
      update: {
        status: dto.status,
        workingHours: dto.workingHours,
        isManualAdjustment: true,
        adjustedById: actor.id,
        notes: dto.notes.trim(),
      },
    });

    if (actor?.id) {
      await this.auditService.log({
        actorId: actor.id,
        actorRole: (actor.role as any) || 'SUPER_ADMIN',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'StaffAttendance',
        resourceId: record.id,
        metadata: {
          staffId: dto.staffId,
          date: dto.date,
          status: dto.status,
          workingHours: dto.workingHours,
          notes: dto.notes,
        },
      });
    }

    return {
      success: true,
      message: 'Attendance record manually corrected with audit trail.',
      record,
    };
  }

  /**
   * List attendance records with branch scoping
   */
  async listAttendance(actor: any, query: QueryAttendanceDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Branch scoping
    if (actor.role === Role.BRANCH_MANAGER) {
      if (!actor.organizationId) {
        throw new ForbiddenException('Branch Manager has no assigned branch organization.');
      }
      where.branchOrgId = actor.organizationId;
    } else if (actor.role === Role.SUPER_ADMIN || actor.role === Role.ADMIN) {
      if (query.branchOrgId) {
        where.branchOrgId = query.branchOrgId;
      }
    } else {
      throw new ForbiddenException('Access denied to attendance records.');
    }

    if (query.staffId) where.staffId = query.staffId;
    if (query.status) where.status = query.status as AttendanceStatus;

    if (query.date) {
      where.date = query.date;
    } else if (query.startDate && query.endDate) {
      where.date = {
        gte: query.startDate,
        lte: query.endDate,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.staffAttendance.count({ where }),
      this.prisma.staffAttendance.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              fullName: true,
              mobile: true,
              role: true,
            },
          },
          branchOrg: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      attendance: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
