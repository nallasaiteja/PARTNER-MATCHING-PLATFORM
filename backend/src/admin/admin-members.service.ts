import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { Role, RoleType } from '../common/constants/roles.constants';
import { EventNotificationsService } from '../notifications/event-notifications.service';

@Injectable()
export class AdminMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventNotificationsService?: EventNotificationsService,
  ) {}

  /**
   * Helper to check staff access rules for permitted profiles.
   * Super Admin & Admin can access all profiles.
   * Other staff can only access within their configured StaffAccessRule boundaries,
   * branch boundaries, or profiles they created/are assigned to.
   */
  private async getStaffProfileFilter(actor: any): Promise<any> {
    const role = actor.role as RoleType;
    if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      return {}; // Global access
    }

    // Check custom StaffAccessRule configured by Admin
    const accessRule = await this.prisma.staffAccessRule.findFirst({
      where: { staffId: actor.id },
    });

    const conditions: any[] = [];

    // Branch boundary check
    if (actor.organizationId) {
      conditions.push({ ownerOrgId: actor.organizationId });
    }

    // Profiles created by or assigned to staff
    conditions.push({ createdByStaffId: actor.id });
    conditions.push({ assignedToId: actor.id });

    // ID Range restriction
    if (accessRule?.idRangeStart && accessRule?.idRangeEnd) {
      conditions.push({
        memberId: {
          gte: accessRule.idRangeStart,
          lte: accessRule.idRangeEnd,
        },
      });
    }

    // Caste restriction
    if (accessRule?.allowedCastes && Array.isArray(accessRule.allowedCastes) && accessRule.allowedCastes.length > 0) {
      const casteStrings = accessRule.allowedCastes as string[];
      conditions.push({
        profileData: {
          path: ['caste'],
          string_contains: casteStrings[0], // Postgres JSON check
        },
      });
    }

    // Gender restriction
    if (accessRule?.allowedGenders && Array.isArray(accessRule.allowedGenders) && accessRule.allowedGenders.length > 0) {
      conditions.push({
        gender: { in: accessRule.allowedGenders as string[] },
      });
    }

    return { OR: conditions };
  }

  /**
   * 5.3 Member List Views:
   * ALL, FREE, PAID, BLOCKED, TERMINATED, CONVERTED
   */
  async listMembers(
    actor: any,
    options: {
      type?: 'ALL' | 'FREE' | 'PAID' | 'BLOCKED' | 'TERMINATED' | 'CONVERTED' | 'PENDING_VERIFICATION';
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const staffFilter = await this.getStaffProfileFilter(actor);
    const where: any = { ...staffFilter };

    const type = options.type || 'ALL';
    const now = new Date();

    if (type === 'FREE') {
      where.packageType = 'FREE';
      where.isBlocked = false;
    } else if (type === 'PAID') {
      where.packageType = 'PAID';
      where.isBlocked = false;
    } else if (type === 'BLOCKED') {
      where.isBlocked = true;
    } else if (type === 'TERMINATED') {
      where.packageExpiresAt = { lt: now };
      where.packageType = 'PAID';
    } else if (type === 'CONVERTED') {
      where.profileData = {
        path: ['isCasteConverted'],
        equals: true,
      };
    } else if (type === 'PENDING_VERIFICATION') {
      where.OR = [
        { profileData: { path: ['step5', 'verificationStatus'], equals: 'PENDING_VERIFICATION' } },
        { profileData: { path: ['step5', 'idProofStatus'], equals: 'PENDING_REVIEW' } },
        {
          AND: [
            { idProofFileUrl: { not: null } },
            { profileData: { path: ['step5', 'idProofVerified'], not: true } },
          ],
        },
      ];
      where.isBlocked = false;
    }

    if (options.search) {
      const q = options.search.trim();
      where.AND = [
        {
          OR: [
            { memberId: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { user: { mobile: { contains: q } } },
          ],
        },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, members] = await Promise.all([
      this.prisma.memberProfile.count({ where }),
      this.prisma.memberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { mobile: true, email: true, status: true } },
          currentPackage: { select: { id: true, name: true, cost: true } },
          ownerOrg: { select: { id: true, name: true, type: true } },
          blockedBy: { select: { id: true, employeeId: true, fullName: true, mobile: true } },
          createdByStaff: { select: { id: true, employeeId: true, fullName: true } },
          _count: {
            select: {
              internalNotes: true,
              updateRequests: { where: { status: 'PENDING' } },
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
      members: members.map((m) => {
        const pData = (m.profileData as Record<string, any>) || {};
        const step5 = pData.step5 || {};
        const completedSteps = Array.isArray(m.completedSteps) ? m.completedSteps : [];
        const isComplete = completedSteps.length >= 5 || m.currentStep >= 5;
        const verificationStatus = step5.verificationStatus || (isComplete ? 'PENDING_VERIFICATION' : 'DRAFT');
        const idProofStatus = step5.idProofStatus || (step5.idProofVerified ? 'VERIFIED' : (m.idProofFileUrl ? 'PENDING_REVIEW' : 'NOT_UPLOADED'));

        return {
          id: m.id,
          memberId: m.memberId,
          firstName: m.firstName,
          lastName: m.lastName,
          gender: m.gender,
          dateOfBirth: m.dateOfBirth,
          mobile: m.user?.mobile,
          email: m.user?.email,
          packageType: m.packageType,
          packageName: m.currentPackage?.name || (m.packageType === 'PAID' ? 'Paid Plan' : 'Free'),
          packageExpiresAt: m.packageExpiresAt,
          branchName: m.ownerOrg?.name || 'HQ Central',
          branchId: m.ownerOrgId,
          isBlocked: m.isBlocked,
          blockedAt: m.blockedAt,
          blockedReason: m.blockedReason,
          blockedByStaff: m.blockedBy?.fullName || m.blockedBy?.employeeId || m.blockedBy?.mobile,
          closureRequested: m.closureRequested,
          closureReason: m.closureReason,
          isFeatured: m.isFeatured,
          featuredUntil: m.featuredUntil,
          notesCount: m._count.internalNotes,
          pendingUpdateRequests: m._count.updateRequests,
          createdAt: m.createdAt,
          idProofStatus,
          idProofType: m.idProofType,
          idProofNumber: m.idProofNumber,
          idProofFileUrl: m.idProofFileUrl,
          idProofRejectionReason: step5.idProofRejectionReason || step5.rejectionReason || null,
          idProofVerifiedAt: step5.idProofVerifiedAt || null,
          idProofVerifiedBy: step5.idProofVerifiedBy || null,
          verificationStatus,
          submittedForVerificationAt: step5.submittedForVerificationAt || m.updatedAt || m.createdAt,
          completedSteps,
          currentStep: m.currentStep,
        };
      }),
    };
  }

  /**
   * Block a member profile.
   * Any staff can block. Records Staff ID, Date, Time, Reason.
   * Simulates/triggers SMS notification mechanism.
   */
  async blockMember(
    actor: any,
    memberProfileId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { user: true },
    });

    if (!profile) throw new NotFoundException('Member profile not found');

    const blockedAt = new Date();

    const updated = await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        isBlocked: true,
        blockedById: actor.id,
        blockedAt,
        blockedReason: reason || 'Not Specified',
      },
      include: {
        blockedBy: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    // Section 10: Automated SMS Notification to blocked member
    if (this.eventNotificationsService) {
      await this.eventNotificationsService.onProfileBlocked(profile.id, actor.id, reason);
    }

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_BLOCK,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      metadata: {
        memberId: profile.memberId,
        blockedReason: reason,
        blockedAt,
        smsSent: true,
      },
      ipAddress,
    });

    return {
      message: 'Member profile blocked successfully and notification dispatched',
      profile: updated,
    };
  }

  /**
   * Unblock a member profile.
   * Strictly reserved for Super Admin and Admin only.
   */
  async unblockMember(actor: any, memberProfileId: string, ipAddress?: string) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('UNBLOCKING is strictly reserved for Super Admin and Admin only');
    }

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });
    if (!profile) throw new NotFoundException('Member profile not found');

    const updated = await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        isBlocked: false,
        blockedById: null,
        blockedAt: null,
        blockedReason: null,
        closureRequested: false,
        closureReason: null,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_UNBLOCK,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      metadata: { memberId: profile.memberId },
      ipAddress,
    });

    return {
      message: 'Member profile unblocked successfully by Admin',
      profile: updated,
    };
  }

  /**
   * Request profile closure (by member or staff).
   * Profile closure requires staff/admin approval; data is NEVER permanently deleted.
   */
  async requestProfileClosure(
    actor: any,
    memberProfileId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });
    if (!profile) throw new NotFoundException('Member profile not found');

    const updated = await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        closureRequested: true,
        closureReason: reason || 'Marriage Settled',
      },
    });

    return {
      message: 'Closure request submitted and queued for staff/admin approval',
      profile: updated,
    };
  }

  /**
   * Approve profile closure request.
   * Closes/blocks profile permanently while retaining all records.
   */
  async approveProfileClosure(
    actor: any,
    memberProfileId: string,
    ipAddress?: string,
  ) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });
    if (!profile) throw new NotFoundException('Member profile not found');

    const updated = await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        isBlocked: true,
        blockedById: actor.id,
        blockedAt: new Date(),
        blockedReason: profile.closureReason || 'Profile Closed (Approved)',
        closureRequested: false,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_BLOCK,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      metadata: { closureApproved: true, reason: profile.closureReason },
      ipAddress,
    });

    return {
      message: 'Profile closure approved; member safely closed without data deletion',
      profile: updated,
    };
  }

  /**
   * Marking a Member as Paid (Facilitated by Staff).
   * Select package, select facilitating staff (Active shown first).
   */
  async markMemberAsPaid(
    actor: any,
    memberProfileId: string,
    dto: {
      packageId: string;
      facilitatingStaffId: string;
      paymentMode?: string;
      notes?: string;
    },
    ipAddress?: string,
  ) {
    const [profile, pkg, staff] = await Promise.all([
      this.prisma.memberProfile.findUnique({ where: { id: memberProfileId } }),
      this.prisma.packageMaster.findUnique({ where: { id: dto.packageId } }),
      this.prisma.user.findUnique({ where: { id: dto.facilitatingStaffId } }),
    ]);

    if (!profile) throw new NotFoundException('Member profile not found');
    if (!pkg) throw new NotFoundException('Selected package not found');
    if (!staff) throw new NotFoundException('Facilitating staff not found');

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000);

    // Create approved invoice
    const invoice = await this.prisma.memberInvoice.create({
      data: {
        invoiceNumber,
        memberProfileId: profile.id,
        packageId: pkg.id,
        amount: pkg.cost,
        paymentMode: dto.paymentMode || 'ONLINE',
        status: 'APPROVED',
        notes: dto.notes || `Paid conversion facilitated by ${staff.fullName || staff.employeeId || staff.mobile}`,
      },
    });

    // Update member profile to paid & transfer to HQ ownership
    const updatedProfile = await this.prisma.memberProfile.update({
      where: { id: profile.id },
      data: {
        packageType: 'PAID',
        currentPackageId: pkg.id,
        packageExpiresAt: expiresAt,
        contactsQuota: profile.contactsQuota + pkg.contactReveals,
        assignedToId: staff.id,
      },
    });

    // Log commission / activity record
    await this.prisma.salesCommissionRecord.create({
      data: {
        memberProfileId: profile.id,
        agentId: staff.id,
        originatingOrgId: profile.ownerOrgId,
        commissionNotes: `Facilitated conversion to ${pkg.name}. Invoice: ${invoiceNumber}`,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PACKAGE_UPGRADE,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      metadata: {
        packageId: pkg.id,
        packageName: pkg.name,
        facilitatingStaffId: staff.id,
        facilitatingStaffName: staff.fullName,
        invoiceNumber,
        amount: pkg.cost,
      },
      ipAddress,
    });

    return {
      message: `Member successfully marked as Paid (${pkg.name})`,
      invoice,
      profile: updatedProfile,
    };
  }

  /**
   * CRM & Internal Notes (visible ONLY to authorized Staff and Admins).
   */
  async getInternalNotes(actor: any, memberProfileId: string) {
    if (actor.role === Role.MEMBER) {
      throw new ForbiddenException('Access denied: Internal notes are confidential to staff and admin only');
    }

    return this.prisma.memberInternalNote.findMany({
      where: { memberProfileId },
      orderBy: { createdAt: 'desc' },
      include: {
        staff: {
          select: { id: true, employeeId: true, fullName: true, role: true, mobile: true },
        },
      },
    });
  }

  async addInternalNote(actor: any, memberProfileId: string, note: string) {
    if (actor.role === Role.MEMBER) {
      throw new ForbiddenException('Access denied');
    }

    if (!note || note.trim() === '') {
      throw new BadRequestException('Note content is required');
    }

    const created = await this.prisma.memberInternalNote.create({
      data: {
        memberProfileId,
        staffId: actor.id,
        note: note.trim(),
      },
      include: {
        staff: {
          select: { id: true, employeeId: true, fullName: true, role: true },
        },
      },
    });

    return created;
  }

  /**
   * Profile Update Requests.
   * Immutable fields (mobile, DOB, name, religion, caste, email) CANNOT be altered directly.
   */
  async submitUpdateRequest(actor: any, memberProfileId: string, requestedData: any) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });
    if (!profile) throw new NotFoundException('Member profile not found');

    const request = await this.prisma.profileUpdateRequest.create({
      data: {
        memberProfileId,
        requestedData: requestedData || {},
        status: 'PENDING',
      },
    });

    return request;
  }

  async listUpdateRequests(actor: any, status?: string) {
    if (actor.role === Role.MEMBER) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    return this.prisma.profileUpdateRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            packageType: true,
            user: { select: { mobile: true, email: true } },
          },
        },
        reviewedBy: {
          select: { id: true, employeeId: true, fullName: true },
        },
      },
    });
  }

  async reviewUpdateRequest(
    actor: any,
    requestId: string,
    action: 'APPROVED' | 'DISMISSED',
    dismissReason?: string,
    ipAddress?: string,
  ) {
    if (actor.role === Role.MEMBER) {
      throw new ForbiddenException('Access denied');
    }

    const updateReq = await this.prisma.profileUpdateRequest.findUnique({
      where: { id: requestId },
      include: { memberProfile: true },
    });

    if (!updateReq) throw new NotFoundException('Update request not found');

    if (action === 'APPROVED') {
      const data = updateReq.requestedData as Record<string, any>;
      // Sanitize against immutable fields:
      delete data.firstName;
      delete data.lastName;
      delete data.dateOfBirth;
      delete data.gender;
      delete data.religion;
      delete data.caste;
      delete data.mobile;
      delete data.email;

      await this.prisma.memberProfile.update({
        where: { id: updateReq.memberProfileId },
        data: {
          profileData: {
            ...((updateReq.memberProfile.profileData as object) || {}),
            ...data,
          },
        },
      });
    }

    const reviewed = await this.prisma.profileUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        dismissReason: action === 'DISMISSED' ? dismissReason : null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'ProfileUpdateRequest',
      resourceId: requestId,
      metadata: { action, dismissReason },
      ipAddress,
    });

    return reviewed;
  }
}
