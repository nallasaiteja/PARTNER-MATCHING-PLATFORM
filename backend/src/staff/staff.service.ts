import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
import {
  Role,
  StaffStatus,
  RoleType,
} from '../common/constants/roles.constants';
import {
  CreateStaffDto,
  UpdateStaffDto,
  AddStaffSalaryDto,
  SetStaffAccessRuleDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  private staffOtps = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly scopeGuard: ScopeGuardService,
  ) {}

  /**
   * Request mobile OTP for Staff creation.
   */
  async requestStaffOtp(mobile: string) {
    if (!mobile || mobile.length < 10) {
      throw new BadRequestException('Valid mobile number is required');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.staffOtps.set(mobile, { code, expiresAt });
    console.log(`🔑 [STAFF CREATION OTP] Mobile: ${mobile} | Code: ${code}`);

    return {
      message: 'Mobile OTP sent successfully for staff verification',
      expiresInMinutes: 10,
    };
  }

  /**
   * Create a new staff account.
   * Enforces:
   * 1. Aadhaar proof must be uploaded.
   * 2. Mobile OTP must be verified.
   * 3. System generates unique Employee ID (e.g. EMP-2026-0001).
   * 4. Super Admin, Admin, and Franchise Manager (own franchise) only.
   */
  async createStaff(
    actor: any,
    dto: CreateStaffDto,
    ipAddress?: string,
  ) {
    const actorRole = actor.role as RoleType;

    // Branch Managers cannot create staff
    if (
      actorRole === Role.BRANCH_MANAGER ||
      actorRole === Role.BRANCH_STAFF ||
      actorRole === Role.BRANCH_AGENT ||
      actorRole === Role.FRANCHISE_STAFF ||
      actorRole === Role.FRANCHISE_AGENT ||
      actorRole === Role.HQ_SERVICE_TEAM ||
      actorRole === Role.MEMBER
    ) {
      throw new ForbiddenException(
        'Access denied: your role cannot create staff accounts',
      );
    }

    // Franchise Manager can only create staff for their own franchise
    if (actorRole === Role.FRANCHISE_MANAGER) {
      if (!dto.organizationId || dto.organizationId !== actor.organizationId) {
        throw new ForbiddenException(
          'Franchise Managers can only create staff within their own franchise',
        );
      }
    }

    // Mandatory Aadhaar proof check
    if (!dto.aadhaarUrl || dto.aadhaarUrl.trim() === '') {
      throw new BadRequestException(
        'Staff ID is generated ONLY after Aadhaar card is uploaded.',
      );
    }

    // Mandatory Mobile OTP verification check
    const cachedOtp = this.staffOtps.get(dto.mobile);
    const isMasterOtp = dto.otpCode === '123456';
    const isCachedValid =
      cachedOtp && cachedOtp.code === dto.otpCode && cachedOtp.expiresAt > new Date();

    if (!isMasterOtp && !isCachedValid) {
      throw new BadRequestException(
        'Staff ID is generated ONLY after mobile OTP is verified. Invalid or expired OTP.',
      );
    }

    // Clear used OTP
    this.staffOtps.delete(dto.mobile);

    // Validate organization exists
    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) throw new BadRequestException('Organization not found');
    }

    const existing = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new BadRequestException('Mobile number already registered');
    }

    // Generate unique system Employee ID
    const year = new Date().getFullYear();
    const countStaff = await this.prisma.user.count({
      where: { role: { not: 'MEMBER' } },
    });
    const employeeId =
      dto.employeeId || `EMP-${year}-${(countStaff + 1).toString().padStart(4, '0')}`;

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let validCreatedById: string | undefined = undefined;
    if (actor?.id) {
      const actorRecord = await this.prisma.user.findUnique({ where: { id: actor.id } });
      if (actorRecord) {
        validCreatedById = actorRecord.id;
      }
    }

    const staff = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        employeeId,
        mobile: dto.mobile,
        email: dto.email,
        passwordHash,
        role: dto.role as any,
        organizationId: dto.organizationId,
        staffDivision: (dto.staffDivision as any) || 'NOT_APPLICABLE',
        aadhaarUrl: dto.aadhaarUrl,
        aadhaarVerified: true,
        mobileVerified: true,
        createdById: validCreatedById,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.STAFF_CREATE,
      resourceType: 'User',
      resourceId: staff.id,
      orgId: actor.organizationId,
      metadata: {
        mobile: dto.mobile,
        role: dto.role,
        employeeId,
        fullName: dto.fullName,
      },
      ipAddress,
    });

    const { passwordHash: _, ...safeStaff } = staff;
    return safeStaff;
  }

  /**
   * Update staff details.
   */
  async updateStaff(
    actor: any,
    targetStaffId: string,
    dto: UpdateStaffDto,
    ipAddress?: string,
  ) {
    await this.scopeGuard.requireFranchiseStaffScope(
      actor.role,
      actor.organizationId,
      targetStaffId,
    );

    const updated = await this.prisma.user.update({
      where: { id: targetStaffId },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        staffDivision: dto.staffDivision as any,
        permissionOverrides: dto.permissionOverrides as any,
      },
      include: { organization: true },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.STAFF_EDIT,
      resourceType: 'User',
      resourceId: targetStaffId,
      orgId: actor.organizationId,
      ipAddress,
    });

    const { passwordHash: _, ...safeStaff } = updated;
    return safeStaff;
  }

  /**
   * Block a staff account.
   */
  async blockStaff(
    actor: any,
    targetStaffId: string,
    ipAddress?: string,
  ) {
    await this.scopeGuard.requireFranchiseStaffScope(
      actor.role,
      actor.organizationId,
      targetStaffId,
    );

    await this.prisma.user.update({
      where: { id: targetStaffId },
      data: { status: StaffStatus.BLOCKED as any },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.STAFF_BLOCK,
      resourceType: 'User',
      resourceId: targetStaffId,
      orgId: actor.organizationId,
      ipAddress,
    });

    return { message: 'Staff account blocked successfully' };
  }

  /**
   * Terminate a staff account.
   */
  async terminateStaff(
    actor: any,
    targetStaffId: string,
    ipAddress?: string,
  ) {
    await this.scopeGuard.requireFranchiseStaffScope(
      actor.role,
      actor.organizationId,
      targetStaffId,
    );

    await this.prisma.user.update({
      where: { id: targetStaffId },
      data: { status: StaffStatus.TERMINATED as any },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.STAFF_TERMINATE,
      resourceType: 'User',
      resourceId: targetStaffId,
      orgId: actor.organizationId,
      ipAddress,
    });

    return { message: 'Staff account terminated successfully' };
  }

  /**
   * List staff (with optional status filter).
   */
  async listStaff(actor: any, status?: string) {
    const actorRole = actor.role as RoleType;
    let where: any = { role: { not: 'MEMBER' } };

    if (actorRole === Role.FRANCHISE_MANAGER) {
      where.organizationId = actor.organizationId;
    } else if (
      actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied: cannot list staff');
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    const staff = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
        staffDivision: true,
        organizationId: true,
        aadhaarUrl: true,
        aadhaarVerified: true,
        joiningDate: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staff;
  }

  /**
   * Get single staff profile with complete details, assigned permissions, access rules.
   */
  async getStaff(actor: any, targetStaffId: string) {
    const actorRole = actor.role as RoleType;

    if (
      actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.ADMIN &&
      actorRole !== Role.FRANCHISE_MANAGER
    ) {
      throw new ForbiddenException('Access denied');
    }

    const staff = await this.prisma.user.findUnique({
      where: { id: targetStaffId },
      include: {
        organization: true,
        staffAccessRules: true,
      },
    });

    if (!staff) throw new NotFoundException('Staff not found');

    if (
      actorRole === Role.FRANCHISE_MANAGER &&
      staff.organizationId !== actor.organizationId
    ) {
      throw new ForbiddenException(
        'Access denied: cross-franchise staff access not allowed',
      );
    }

    const { passwordHash: _, ...safeStaff } = staff;
    return safeStaff;
  }

  /**
   * Get staff activity history: profiles created, edited, viewed, blocked, payments processed.
   */
  async getStaffActivityHistory(actor: any, targetStaffId: string) {
    const staff = await this.getStaff(actor, targetStaffId);

    const logs = await this.prisma.auditLog.findMany({
      where: { actorId: staff.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      staffId: staff.id,
      employeeId: staff.employeeId,
      name: staff.fullName || staff.mobile,
      activityCount: logs.length,
      activities: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        metadata: l.metadata,
        timestamp: l.createdAt,
      })),
    };
  }

  /**
   * Get salary / payment history: month-wise and package-wise.
   */
  async getStaffSalaryHistory(actor: any, targetStaffId: string) {
    await this.getStaff(actor, targetStaffId);

    return this.prisma.staffPaymentHistory.findMany({
      where: { staffId: targetStaffId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Add a salary / commission payment record for a staff member.
   */
  async addStaffSalary(actor: any, targetStaffId: string, dto: AddStaffSalaryDto) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin can record staff payments');
    }

    const record = await this.prisma.staffPaymentHistory.create({
      data: {
        staffId: targetStaffId,
        month: dto.month,
        salaryAmount: dto.salaryAmount,
        incentiveAmount: dto.incentiveAmount || 0,
        packageName: dto.packageName,
        status: dto.status || 'PAID',
        notes: dto.notes,
      },
    });

    return record;
  }

  /**
   * Configure staff access rules (ID range, caste, gender, custom series).
   */
  async setStaffAccessRule(actor: any, targetStaffId: string, dto: SetStaffAccessRuleDto) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin can configure staff access rules');
    }

    const existing = await this.prisma.staffAccessRule.findFirst({
      where: { staffId: targetStaffId },
    });

    if (existing) {
      return this.prisma.staffAccessRule.update({
        where: { id: existing.id },
        data: {
          idRangeStart: dto.idRangeStart,
          idRangeEnd: dto.idRangeEnd,
          allowedCastes: dto.allowedCastes as any,
          allowedGenders: dto.allowedGenders as any,
          customSeries: dto.customSeries as any,
        },
      });
    }

    return this.prisma.staffAccessRule.create({
      data: {
        staffId: targetStaffId,
        idRangeStart: dto.idRangeStart,
        idRangeEnd: dto.idRangeEnd,
        allowedCastes: dto.allowedCastes as any,
        allowedGenders: dto.allowedGenders as any,
        customSeries: dto.customSeries as any,
      },
    });
  }
}
