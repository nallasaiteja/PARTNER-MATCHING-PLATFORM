import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';
import {
  VerifyMemberIdProofDto,
  BlockMemberProfileDto,
  EditMemberDobDto,
  UpdateMemberMobileDto,
  ResetMemberPasswordDto,
  RaiseBranchInvoiceDto,
  SubmitLeaveApplicationDto,
  ReviewLeaveApplicationDto,
  CreatePaymentAlertDto,
} from './dto/branch.dto';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to ensure user is Branch Manager (or HQ Admin) and has assigned organization
   */
  private assertBranchManager(user: any): string {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isBranchManager = user.role === Role.BRANCH_MANAGER;

    if (!isHQ && !isBranchManager) {
      throw new ForbiddenException(
        'Access Denied: Only Branch Managers and HQ Administrators can access the Branch Manager portal.',
      );
    }

    if (!user.organizationId && !isHQ) {
      throw new BadRequestException('User is not assigned to any branch organization.');
    }

    return user.organizationId;
  }

  // ==========================================================================
  // 1. BRANCH OVERVIEW & DASHBOARD METRICS
  // ==========================================================================

  async getBranchDashboard(user: any) {
    const branchOrgId = this.assertBranchManager(user);

    // Run 72-hour auto-cancel check automatically
    await this.autoCancelExpiredBranchInvoices(user);

    const branch = await this.prisma.organization.findUnique({
      where: { id: branchOrgId },
      include: {
        users: {
          where: { status: 'ACTIVE' },
          select: { id: true, role: true, fullName: true, employeeId: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch organization not found');
    }

    // 1. Members metrics
    const members = await this.prisma.memberProfile.findMany({
      where: { ownerOrgId: branchOrgId },
      select: {
        id: true,
        packageType: true,
        isBlocked: true,
        idProofFileUrl: true,
        profileData: true,
      },
    });

    const totalMembers = members.length;
    const paidMembers = members.filter((m) => m.packageType === 'PAID').length;
    const blockedMembers = members.filter((m) => m.isBlocked).length;

    let pendingIdVerification = 0;
    let verifiedIdProof = 0;
    members.forEach((m) => {
      const pData = (m.profileData as Record<string, any>) || {};
      if (m.idProofFileUrl && m.idProofFileUrl.trim() !== '') {
        if (pData?.step5?.idProofVerified === true) {
          verifiedIdProof++;
        } else {
          pendingIdVerification++;
        }
      }
    });

    // 2. Sales & Invoices
    const invoices = await this.prisma.memberInvoice.findMany({
      where: { orgId: branchOrgId },
      select: { id: true, amount: true, status: true },
    });

    const approvedInvoices = invoices.filter((i) => i.status === 'APPROVED');
    const pendingInvoices = invoices.filter((i) => i.status === 'PENDING');
    const totalSalesRevenue = approvedInvoices.reduce((acc, i) => acc + (i.amount || 0), 0);

    // 3. Staff & Today's Attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const staffCount = branch.users.length;

    const todayAttendances = await this.prisma.staffAttendance.findMany({
      where: {
        branchOrgId,
        date: todayStr,
      },
      select: { status: true },
    });
    const staffPresentToday = todayAttendances.filter((a) => a.status === 'PRESENT').length;

    // 4. Payment Alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const alertsDueToday = await this.prisma.paymentAlert.count({
      where: {
        branchOrgId,
        isResolved: false,
        alertDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const totalPendingAlerts = await this.prisma.paymentAlert.count({
      where: {
        branchOrgId,
        isResolved: false,
      },
    });

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        type: branch.type,
      },
      metrics: {
        totalMembers,
        paidMembers,
        blockedMembers,
        pendingIdVerification,
        verifiedIdProof,
        totalSalesRevenue,
        approvedInvoicesCount: approvedInvoices.length,
        pendingInvoicesCount: pendingInvoices.length,
        staffCount,
        staffPresentToday,
        alertsDueToday,
        totalPendingAlerts,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // 2. BRANCH MEMBERS
  // ==========================================================================

  async getBranchMembers(
    user: any,
    query: {
      search?: string;
      packageType?: string;
      isBlocked?: boolean;
      idProofStatus?: 'PENDING' | 'VERIFIED' | 'MISSING';
      page?: number;
      limit?: number;
    },
  ) {
    const branchOrgId = this.assertBranchManager(user);

    const where: any = {
      ownerOrgId: branchOrgId,
    };

    if (query.packageType) {
      where.packageType = query.packageType.toUpperCase();
    }

    if (query.isBlocked !== undefined) {
      where.isBlocked = query.isBlocked;
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { memberId: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { user: { mobile: { contains: q } } },
      ];
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      include: {
        user: { select: { id: true, mobile: true, email: true, mobileVerified: true, emailVerified: true } },
        currentPackage: true,
        createdByStaff: { select: { employeeId: true, fullName: true } },
        blockedBy: { select: { employeeId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // In-memory filter for idProofStatus if specified
    let filtered = members;
    if (query.idProofStatus) {
      filtered = members.filter((m) => {
        const pData = (m.profileData as Record<string, any>) || {};
        const isVerified = pData?.step5?.idProofVerified === true;
        const hasUpload = Boolean(m.idProofFileUrl && m.idProofFileUrl.trim() !== '');

        if (query.idProofStatus === 'VERIFIED') return hasUpload && isVerified;
        if (query.idProofStatus === 'PENDING') return hasUpload && !isVerified;
        if (query.idProofStatus === 'MISSING') return !hasUpload;
        return true;
      });
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      members: paginated.map((m) => {
        const pData = (m.profileData as Record<string, any>) || {};
        return {
          id: m.id,
          memberId: m.memberId || 'PENDING',
          fullName: `${m.firstName} ${m.lastName}`.trim(),
          gender: m.gender,
          dateOfBirth: m.dateOfBirth,
          mobile: m.user?.mobile || 'N/A',
          email: m.user?.email || 'N/A',
          packageType: m.packageType,
          packageName: m.currentPackage?.name || m.packageType,
          isBlocked: m.isBlocked,
          blockedReason: m.blockedReason,
          blockedAt: m.blockedAt,
          blockedBy: m.blockedBy?.fullName || m.blockedBy?.employeeId,
          hasPhoto: Boolean(m.photoUrl && m.photoUrl.trim() !== ''),
          photoUrl: m.photoUrl,
          hasIdProof: Boolean(m.idProofFileUrl && m.idProofFileUrl.trim() !== ''),
          idProofUrl: m.idProofFileUrl,
          idProofType: m.idProofType,
          idProofVerified: pData?.step5?.idProofVerified === true,
          createdBy: m.createdByStaff?.fullName || m.createdByStaff?.employeeId || 'Member Self',
          createdAt: m.createdAt,
        };
      }),
    };
  }

  // ==========================================================================
  // 3. ID PROOF REVIEW & VERIFICATION
  // ==========================================================================

  async getPendingVerifications(user: any) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    let branchOrgId: string | null = null;
    if (isHQ) {
      branchOrgId = user.organizationId || null;
    } else {
      branchOrgId = this.assertBranchManager(user);
    }

    const where: any = {};
    if (!isHQ || branchOrgId) {
      where.ownerOrgId = branchOrgId;
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      include: {
        user: { select: { mobile: true, email: true } },
        createdByStaff: { select: { employeeId: true, fullName: true } },
        ownerOrg: { select: { name: true, type: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const pending = members.filter((m) => {
      const pData = (m.profileData as Record<string, any>) || {};
      const step5 = pData?.step5 || {};
      if (step5.idProofVerified === true) return false;
      const completedSteps = Array.isArray(m.completedSteps) ? m.completedSteps : [];
      const isComplete = completedSteps.length >= 5 || m.currentStep >= 5;
      const isPending =
        step5.verificationStatus === 'PENDING_VERIFICATION' ||
        Boolean(m.idProofFileUrl) ||
        isComplete;
      return isPending;
    });

    const records = pending.map((m) => {
      const pData = (m.profileData as Record<string, any>) || {};
      const step5 = pData?.step5 || {};
      const docUrl = m.idProofFileUrl || null;
      const idProofStatus =
        step5.idProofStatus ||
        (step5.idProofVerified
          ? 'VERIFIED'
          : docUrl
          ? 'PENDING_REVIEW'
          : 'NOT_UPLOADED');

      return {
        id: m.id,
        memberId: m.memberId || 'PENDING',
        firstName: m.firstName,
        lastName: m.lastName,
        fullName: `${m.firstName} ${m.lastName}`.trim(),
        gender: m.gender,
        packageType: m.packageType,
        branchName: m.ownerOrg?.name || 'Branch',
        idProofType: m.idProofType || 'Identity Document',
        idProofNumber: m.idProofNumber || 'N/A',
        idProofDocumentUrl: docUrl,
        idProofFileUrl: docUrl,
        idProofStatus,
        verificationStatus: step5.verificationStatus || 'PENDING_VERIFICATION',
        idProofReviewedBy: step5.idProofVerifiedBy
          ? { email: step5.idProofVerifiedBy }
          : step5.idProofRejectedBy
          ? { email: step5.idProofRejectedBy }
          : null,
        idProofReviewedAt: step5.idProofVerifiedAt || step5.idProofRejectedAt || null,
        idProofRejectionReason: step5.idProofRejectionReason || step5.rejectionReason || null,
        uploadedAt: step5.submittedForVerificationAt || m.updatedAt,
        uploadedBy: m.createdByStaff?.fullName || m.createdByStaff?.employeeId || 'Member',
        user: m.user,
      };
    });

    return {
      count: records.length,
      records,
    };
  }

  async verifyMemberIdProof(
    user: any,
    profileId: string,
    dto: VerifyMemberIdProofDto,
    ipAddress?: string,
  ) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    let branchOrgId: string | null = null;
    if (isHQ) {
      branchOrgId = user.organizationId || null;
    } else {
      branchOrgId = this.assertBranchManager(user);
    }

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (!isHQ && member.ownerOrgId !== branchOrgId) {
      throw new ForbiddenException('Branch Managers can only verify profiles belonging to their own branch.');
    }

    if (!member.idProofFileUrl) {
      throw new BadRequestException('No ID proof uploaded for this member.');
    }

    if (!dto.verified) {
      if (!dto.rejectionReason || dto.rejectionReason.trim().length < 5) {
        throw new BadRequestException(
          'A meaningful rejection reason (at least 5 characters) is required when rejecting an ID proof',
        );
      }
    }

    const profileData = (member.profileData as Record<string, any>) || {};
    const step5 = {
      ...(profileData.step5 || {}),
      idProofUploaded: true,
      idProofVerified: dto.verified,
      idProofStatus: dto.verified ? 'VERIFIED' : 'REJECTED',
      idProofVerifiedAt: dto.verified ? new Date().toISOString() : undefined,
      idProofVerifiedBy: dto.verified ? user.id : undefined,
      idProofRejectedAt: !dto.verified ? new Date().toISOString() : undefined,
      idProofRejectedBy: !dto.verified ? user.id : undefined,
      idProofRejectionReason: dto.verified ? null : dto.rejectionReason!.trim(),
      rejectionReason: dto.verified ? null : dto.rejectionReason!.trim(),
      verificationStatus: dto.verified ? 'VERIFIED' : 'REJECTED',
    };

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        profileData: { ...profileData, step5 } as any,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PROFILE_EDIT' as any,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      metadata: {
        verificationAction: dto.verified ? 'VERIFIED' : 'REJECTED',
        rejectionReason: dto.verified ? null : dto.rejectionReason?.trim(),
      },
      ipAddress,
    });

    return {
      success: true,
      message: dto.verified
        ? 'ID proof successfully verified.'
        : `ID proof rejected: ${dto.rejectionReason?.trim() || 'Document invalid'}`,
      member: updated,
    };
  }

  // ==========================================================================
  // 4. MEMBER PROFILE BLOCKING & STRICT UNBLOCK FORBIDDEN
  // ==========================================================================

  async blockMemberProfile(
    user: any,
    profileId: string,
    dto: BlockMemberProfileDto,
    ipAddress?: string,
  ) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only block profiles belonging to their own branch.');
    }

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        isBlocked: true,
        blockedById: user.id,
        blockedAt: new Date(),
        blockedReason: dto.reason,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PROFILE_BLOCK' as any,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      metadata: { blockReason: dto.reason },
      ipAddress,
    });

    return {
      success: true,
      message: `Profile ${member.memberId || member.firstName} has been blocked.`,
      member: updated,
    };
  }

  /**
   * PDF RULE: Branch Manager CANNOT unblock member profiles — HQ Super Admin / Admin only
   */
  async unblockMemberProfile(user: any, profileId: string) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isHQ) {
      throw new ForbiddenException(
        'Branch Managers cannot unblock member profiles. Unblocking is strictly restricted to Super Admin / Admin.',
      );
    }

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        isBlocked: false,
        blockedById: null,
        blockedAt: null,
        blockedReason: null,
      },
    });

    return {
      success: true,
      message: 'Profile unblocked successfully by HQ Admin.',
      member: updated,
    };
  }

  // ==========================================================================
  // 5. CHANGE MEMBER DATE OF BIRTH & UPDATE PHONE NUMBER
  // ==========================================================================

  /**
   * PDF RULE: Change member Date of Birth — allowed for Branch Manager
   */
  async changeMemberDob(user: any, profileId: string, dto: EditMemberDobDto, ipAddress?: string) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only edit profiles belonging to their own branch.');
    }

    const previousDob = member.dateOfBirth;
    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        dateOfBirth: new Date(dto.dateOfBirth),
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PROFILE_EDIT' as any,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      metadata: {
        field: 'dateOfBirth',
        previousDob,
        newDob: dto.dateOfBirth,
        reason: dto.reason,
      },
      ipAddress,
    });

    return {
      success: true,
      message: `Date of Birth updated to ${new Date(dto.dateOfBirth).toLocaleDateString('en-IN')}`,
      member: updated,
    };
  }

  /**
   * PDF RULE: Upgrade/change member phone numbers — allowed for Branch Manager
   */
  async updateMemberMobile(user: any, profileId: string, dto: UpdateMemberMobileDto, ipAddress?: string) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only edit profiles belonging to their own branch.');
    }

    // Check if new mobile is already taken by another user
    const existingMobile = await this.prisma.user.findFirst({
      where: {
        mobile: dto.mobile,
        id: { not: member.userId },
      },
    });

    if (existingMobile) {
      throw new BadRequestException('Mobile number is already registered with another account.');
    }

    const previousMobile = member.user?.mobile;
    await this.prisma.user.update({
      where: { id: member.userId },
      data: {
        mobile: dto.mobile,
        mobileVerified: true,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PROFILE_EDIT' as any,
      resourceType: 'User',
      resourceId: member.userId,
      metadata: {
        field: 'mobile',
        previousMobile,
        newMobile: dto.mobile,
        reason: dto.reason,
      },
      ipAddress,
    });

    return {
      success: true,
      message: `Member phone number successfully updated to ${dto.mobile}`,
    };
  }

  // ==========================================================================
  // 6. MEMBER CREDENTIALS & SECURE PASSWORD ASSISTANCE
  // ==========================================================================

  async getMemberAccountInfo(user: any, profileId: string) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only access members of their own branch.');
    }

    return {
      memberId: member.memberId,
      fullName: `${member.firstName} ${member.lastName}`,
      mobile: member.user?.mobile,
      email: member.user?.email || 'N/A',
      mobileVerified: member.user?.mobileVerified,
      emailVerified: member.user?.emailVerified,
      accountStatus: member.user?.status,
      passwordLastResetRequestedAt: member.user?.passwordResetRequestedAt,
      joiningDate: member.createdAt,
    };
  }

  async resetMemberPassword(user: any, profileId: string, dto: ResetMemberPasswordDto, ipAddress?: string) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only manage accounts of their own branch.');
    }

    const tempPassword = dto.tempPassword || `Pass@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id: member.userId },
      data: {
        passwordHash,
        passwordResetRequestedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'STAFF_EDIT' as any,
      resourceType: 'User',
      resourceId: member.userId,
      metadata: { action: 'TEMPORARY_PASSWORD_SET_BY_BRANCH_MANAGER' },
      ipAddress,
    });

    return {
      success: true,
      message: 'Temporary password generated. Please communicate it securely to the member.',
      tempPassword,
    };
  }

  // ==========================================================================
  // 7. RESTRICTED OPERATIONS: STAFF CREATION & DIRECT INVOICE APPROVAL
  // ==========================================================================

  createStaffProfileForbidden() {
    throw new ForbiddenException(
      'Branch Managers cannot create or terminate staff profiles. Staff management is strictly restricted to HQ Admin.',
    );
  }

  terminateStaffProfileForbidden() {
    throw new ForbiddenException(
      'Branch Managers cannot create or terminate staff profiles. Staff management is strictly restricted to HQ Admin.',
    );
  }

  approveInvoiceDirectlyForbidden() {
    throw new ForbiddenException(
      'Branch Managers cannot directly approve invoices. All branch invoice requests must be submitted to HQ for approval.',
    );
  }

  // ==========================================================================
  // 8. BRANCH SALES AND STAFF-WISE SALES
  // ==========================================================================

  async getBranchSales(user: any, filter: { startDate?: string; endDate?: string; staffId?: string }) {
    const branchOrgId = this.assertBranchManager(user);

    const dateFilter: any = {};
    if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const invoices = await this.prisma.memberInvoice.findMany({
      where: {
        orgId: branchOrgId,
        status: 'APPROVED',
        saleStaffId: filter.staffId || undefined,
        approvedAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        package: true,
        memberProfile: { select: { memberId: true, firstName: true, lastName: true } },
        saleStaff: { select: { id: true, employeeId: true, fullName: true, role: true } },
        approvedBy: { select: { employeeId: true, fullName: true } },
      },
      orderBy: { approvedAt: 'desc' },
    });

    const totalSales = invoices.length;
    const totalRevenue = invoices.reduce((acc, i) => acc + (i.amount || 0), 0);

    // Group sales by staff member
    const staffMap: Record<string, any> = {};
    invoices.forEach((inv) => {
      const sid = inv.saleStaffId || 'UNASSIGNED';
      const sName = inv.saleStaff?.fullName || inv.saleStaff?.employeeId || 'Direct / Branch';
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: inv.saleStaff?.employeeId || sid,
          staffName: sName,
          salesCount: 0,
          totalRevenue: 0,
        };
      }
      staffMap[sid].salesCount++;
      staffMap[sid].totalRevenue += inv.amount || 0;
    });

    return {
      totalSales,
      totalRevenue,
      staffBreakdown: Object.values(staffMap),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        memberId: inv.memberProfile.memberId,
        memberName: `${inv.memberProfile.firstName} ${inv.memberProfile.lastName}`.trim(),
        packageName: inv.package.name,
        amount: inv.amount,
        paymentMode: inv.paymentMode,
        approvedAt: inv.approvedAt,
        approvedBy: inv.approvedBy?.fullName || inv.approvedBy?.employeeId,
        saleStaff: inv.saleStaff?.fullName || inv.saleStaff?.employeeId || 'Branch',
      })),
    };
  }

  // ==========================================================================
  // 9. INVOICE REQUEST WORKFLOW & 72-HOUR AUTO-CANCEL RULE
  // ==========================================================================

  async raiseBranchInvoice(user: any, dto: RaiseBranchInvoiceDto, ipAddress?: string) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: dto.memberProfileId },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only raise invoice requests for members of their own branch.');
    }

    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Package not found or inactive.');
    }

    const requestNumber = `REQ-BR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = await this.prisma.memberInvoice.create({
      data: {
        requestNumber,
        memberProfileId: member.id,
        packageId: pkg.id,
        amount: pkg.cost, // Trusted DB cost
        paymentMode: dto.paymentMode,
        status: 'PENDING',
        notes: dto.notes,
        orgId: branchOrgId,
        raisedById: user.id,
        saleStaffId: dto.saleStaffId || user.id,
        bankName: dto.bankName,
        transactionRef: dto.transactionRef,
        chequeDate: dto.chequeDate ? new Date(dto.chequeDate) : null,
        isCash: dto.isCash || dto.paymentMode === 'CASH',
      },
      include: {
        package: true,
        memberProfile: true,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'INVOICE_RAISE' as any,
      resourceType: 'MemberInvoice',
      resourceId: invoice.id,
      orgId: branchOrgId,
      metadata: { requestNumber, amount: pkg.cost },
      ipAddress,
    });

    return {
      success: true,
      message: `Invoice request ${requestNumber} successfully submitted to HQ for approval.`,
      invoice,
    };
  }

  /**
   * PDF RULE: An invoice request that is not approved by HQ within 72 hours must be automatically cancelled.
   */
  async autoCancelExpiredBranchInvoices(user?: any) {
    const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const expiredRequests = await this.prisma.memberInvoice.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: cutoffDate },
        org: { type: 'BRANCH' },
      },
      select: { id: true, requestNumber: true, createdAt: true },
    });

    if (expiredRequests.length === 0) {
      return { cancelledCount: 0 };
    }

    const ids = expiredRequests.map((r) => r.id);
    const now = new Date();

    await this.prisma.memberInvoice.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'CANCELLED',
        autoCancelledAt: now,
        rejectionReason: 'Auto-cancelled: Invoice request was not approved by HQ Admin within the required 72-hour window.',
      },
    });

    // Record audit entries
    for (const req of expiredRequests) {
      try {
        await this.prisma.financialAuditLog.create({
          data: {
            actorId: user?.id || 'system-scheduler',
            actorRole: user?.role || 'SYSTEM',
            action: 'INVOICE_AUTO_CANCELLED',
            resourceType: 'MemberInvoice',
            resourceId: req.id,
            previousValues: { status: 'PENDING' },
            newValues: { status: 'CANCELLED', autoCancelledAt: now },
            reason: '72-Hour HQ approval timeout expired.',
          },
        });
      } catch (err: any) {
        // Non-blocking
      }
    }

    this.logger.log(`⏰ 72-Hour Rule: Auto-cancelled ${expiredRequests.length} expired branch invoice requests.`);
    return { cancelledCount: expiredRequests.length, cancelledRequests: expiredRequests };
  }

  // ==========================================================================
  // 10. STAFF ATTENDANCE TRACKING (8.2)
  // ==========================================================================

  async getStaffAttendance(user: any, dateStr?: string) {
    const branchOrgId = this.assertBranchManager(user);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    const staffMembers = await this.prisma.user.findMany({
      where: {
        organizationId: branchOrgId,
        role: { not: Role.MEMBER },
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        role: true,
        status: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const attendances = await this.prisma.staffAttendance.findMany({
      where: {
        branchOrgId,
        date: targetDate,
      },
    });

    const attendanceMap: Record<string, any> = {};
    attendances.forEach((a) => {
      attendanceMap[a.staffId] = a;
    });

    const records = staffMembers.map((s) => {
      const att = attendanceMap[s.id];
      const hasActivePermissions = s.status === 'ACTIVE';

      // PDF Rule 8.2: If permissions are ACTIVE during office hours -> PRESENT. If NOT active -> ABSENT.
      const status = att?.status || (hasActivePermissions ? 'PRESENT' : 'ABSENT');
      const workingHours = att?.workingHours || (hasActivePermissions ? 9.0 : 0);

      return {
        staffId: s.id,
        employeeId: s.employeeId || s.id,
        fullName: s.fullName || 'Staff Member',
        role: s.role,
        date: targetDate,
        status,
        hasActivePermissions,
        workingHours,
        firstLoginAt: att?.firstLoginAt,
        lastActiveAt: att?.lastActiveAt,
        notes: att?.notes,
      };
    });

    return {
      date: targetDate,
      totalStaff: staffMembers.length,
      presentCount: records.filter((r) => r.status === 'PRESENT').length,
      absentCount: records.filter((r) => r.status === 'ABSENT').length,
      records,
    };
  }

  async logStaffAttendanceActivity(staffUser: any) {
    if (staffUser.role === Role.MEMBER) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hasActivePermissions = staffUser.status === 'ACTIVE';

    try {
      const existing = await this.prisma.staffAttendance.findUnique({
        where: {
          staffId_date: {
            staffId: staffUser.id,
            date: todayStr,
          },
        },
      });

      if (!existing) {
        await this.prisma.staffAttendance.create({
          data: {
            staffId: staffUser.id,
            branchOrgId: staffUser.organizationId || null,
            date: todayStr,
            status: hasActivePermissions ? 'PRESENT' : 'ABSENT',
            firstLoginAt: now,
            lastActiveAt: now,
            workingHours: hasActivePermissions ? 9.0 : 0,
            hasActivePermissions,
          },
        });
      } else {
        await this.prisma.staffAttendance.update({
          where: { id: existing.id },
          data: {
            lastActiveAt: now,
            hasActivePermissions,
            status: hasActivePermissions ? 'PRESENT' : 'ABSENT',
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to log staff attendance: ${err.message}`);
    }
  }

  // ==========================================================================
  // 11. STAFF LEAVE MANAGEMENT (8.2)
  // ==========================================================================

  async getBranchLeaves(user: any) {
    const branchOrgId = this.assertBranchManager(user);

    const leaves = await this.prisma.staffLeaveApplication.findMany({
      where: { branchOrgId },
      include: {
        staff: { select: { employeeId: true, fullName: true, role: true } },
        reviewedBy: { select: { employeeId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      total: leaves.length,
      leaves: leaves.map((l) => ({
        id: l.id,
        staffId: l.staff.employeeId || l.staffId,
        staffName: l.staff.fullName || 'Staff Member',
        role: l.staff.role,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason,
        status: l.status,
        reviewedBy: l.reviewedBy?.fullName || l.reviewedBy?.employeeId,
        reviewedAt: l.reviewedAt,
        rejectionReason: l.rejectionReason,
        createdAt: l.createdAt,
      })),
    };
  }

  async submitLeaveApplication(staffUser: any, dto: SubmitLeaveApplicationDto) {
    const leave = await this.prisma.staffLeaveApplication.create({
      data: {
        staffId: staffUser.id,
        branchOrgId: staffUser.organizationId || null,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Leave application submitted successfully.',
      leave,
    };
  }

  async reviewLeaveApplication(user: any, leaveId: string, dto: ReviewLeaveApplicationDto) {
    const branchOrgId = this.assertBranchManager(user);

    const leave = await this.prisma.staffLeaveApplication.findUnique({
      where: { id: leaveId },
    });

    if (!leave) throw new NotFoundException('Leave application not found');
    if (leave.branchOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only review leave applications for their own branch staff.');
    }

    const updated = await this.prisma.staffLeaveApplication.update({
      where: { id: leaveId },
      data: {
        status: dto.status,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
      },
    });

    return {
      success: true,
      message: `Leave application marked as ${dto.status}.`,
      leave: updated,
    };
  }

  // ==========================================================================
  // 12. BRANCH-LEVEL PAYMENT ALERTS & NOTIFICATIONS (8.3 & 9)
  // ==========================================================================

  async getBranchPaymentAlerts(user: any) {
    const branchOrgId = this.assertBranchManager(user);

    const alerts = await this.prisma.paymentAlert.findMany({
      where: { branchOrgId },
      include: {
        memberProfile: { select: { id: true, memberId: true, firstName: true, lastName: true } },
        responsibleStaff: { select: { id: true, employeeId: true, fullName: true } },
        notifications: true,
      },
      orderBy: { alertDate: 'asc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: alerts.length,
      alerts: alerts.map((a) => {
        const isDueToday = new Date(a.alertDate).toDateString() === today.toDateString();
        return {
          id: a.id,
          memberId: a.memberProfile?.memberId || 'N/A',
          memberName: `${a.memberProfile?.firstName} ${a.memberProfile?.lastName}`.trim(),
          memberProfileId: a.memberProfile?.id,
          alertDate: a.alertDate,
          alertType: a.alertType,
          note: a.note,
          responsibleStaff: a.responsibleStaff?.fullName || a.responsibleStaff?.employeeId || 'Unassigned',
          responsibleStaffId: a.responsibleStaffId,
          isResolved: a.isResolved,
          isDueToday,
          notificationSent: a.notificationSent,
          notificationSentAt: a.notificationSentAt,
          notificationsCount: a.notifications.length,
        };
      }),
    };
  }

  async createPaymentAlert(user: any, dto: CreatePaymentAlertDto) {
    const branchOrgId = this.assertBranchManager(user);

    const member = await this.prisma.memberProfile.findUnique({
      where: { id: dto.memberProfileId },
    });

    if (!member) throw new NotFoundException('Member profile not found');
    if (member.ownerOrgId !== branchOrgId && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Branch Managers can only set payment alerts for members of their own branch.');
    }

    const alert = await this.prisma.paymentAlert.create({
      data: {
        memberProfileId: member.id,
        packageId: dto.packageId,
        alertDate: new Date(dto.alertDate),
        alertType: dto.alertType || 'PAYMENT',
        responsibleStaffId: dto.responsibleStaffId || user.id,
        branchOrgId,
        note: dto.note,
        createdById: user.id,
      },
    });

    return {
      success: true,
      message: 'Payment alert successfully registered.',
      alert,
    };
  }

  /**
   * PDF RULE: On alert day: notification sent to Branch Manager and responsible staff.
   * Prevents duplicate notifications for the same alert.
   */
  async triggerAlertNotifications(user: any) {
    const branchOrgId = this.assertBranchManager(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find alerts due today that have not had notifications sent
    const alertsDue = await this.prisma.paymentAlert.findMany({
      where: {
        branchOrgId,
        isResolved: false,
        alertDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        memberProfile: true,
        responsibleStaff: true,
      },
    });

    let sentCount = 0;
    const now = new Date();

    for (const alert of alertsDue) {
      // 1. Notify Branch Manager
      try {
        await this.prisma.alertNotificationLog.create({
          data: {
            paymentAlertId: alert.id,
            recipientId: user.id,
            channel: 'IN_APP',
            status: 'SENT',
          },
        });
        sentCount++;
      } catch (err: any) {
        // Already sent to manager (unique constraint caught)
      }

      // 2. Notify Responsible Staff (if different from manager)
      if (alert.responsibleStaffId && alert.responsibleStaffId !== user.id) {
        try {
          await this.prisma.alertNotificationLog.create({
            data: {
              paymentAlertId: alert.id,
              recipientId: alert.responsibleStaffId,
              channel: 'IN_APP',
              status: 'SENT',
            },
          });
          sentCount++;
        } catch (err: any) {
          // Already sent to responsible staff
        }
      }

      // Mark notificationSent = true on alert
      await this.prisma.paymentAlert.update({
        where: { id: alert.id },
        data: {
          notificationSent: true,
          notificationSentAt: now,
        },
      });
    }

    return {
      success: true,
      alertsDueCount: alertsDue.length,
      notificationsSentCount: sentCount,
    };
  }
}
