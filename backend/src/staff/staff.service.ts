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
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly scopeGuard: ScopeGuardService,
  ) {}

  /**
   * Create a new staff account.
   * Only SUPER_ADMIN, ADMIN, and FRANCHISE_MANAGER (own franchise) can create staff.
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

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const staff = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        email: dto.email,
        passwordHash,
        role: dto.role as any,
        organizationId: dto.organizationId,
        staffDivision: (dto.staffDivision as any) || 'NOT_APPLICABLE',
        createdById: actor.id,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.STAFF_CREATE,
      resourceType: 'User',
      resourceId: staff.id,
      orgId: actor.organizationId,
      metadata: { mobile: dto.mobile, role: dto.role },
      ipAddress,
    });

    const { passwordHash: _, ...safeStaff } = staff;
    return safeStaff;
  }

  /**
   * Update staff details.
   * SUPER_ADMIN, ADMIN: global scope.
   * FRANCHISE_MANAGER: own franchise only.
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
        email: dto.email,
        staffDivision: dto.staffDivision as any,
        permissionOverrides: dto.permissionOverrides as any,
      },
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
   * List staff (scoped to organization for franchise managers).
   */
  async listStaff(actor: any) {
    const actorRole = actor.role as RoleType;
    let where: any = {};

    if (actorRole === Role.FRANCHISE_MANAGER) {
      where = { organizationId: actor.organizationId };
    } else if (
      actorRole !== Role.SUPER_ADMIN &&
      actorRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied: cannot list staff');
    }

    const staff = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
        staffDivision: true,
        organizationId: true,
        createdAt: true,
        organization: { select: { id: true, name: true, type: true } },
      },
    });

    return staff;
  }

  /**
   * Get a single staff member (scoped).
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
      include: { organization: true },
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
}
