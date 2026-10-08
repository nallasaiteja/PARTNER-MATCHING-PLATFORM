import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';
import {
  Role,
  RoleType,
  StaffDivision,
} from '../common/constants/roles.constants';
import {
  CreateProfileDto,
  UpdateProfileDto,
  BlockProfileDto,
} from './dto/profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly scopeGuard: ScopeGuardService,
  ) {}

  /**
   * List profiles accessible to this actor.
   * Scope restrictions applied at DB query level.
   */
  async listProfiles(actor: any, queryId?: string) {
    const actorRole = actor.role as RoleType;

    // FREE_TEAM: sees only free member profiles by default
    // (Paid profiles are hidden UNLESS admin granted override, OR direct ID search)
    let where: any = this.scopeGuard.buildProfileScopeWhere(actor);

    const isFreeTeam =
      actor.staffDivision === StaffDivision.FREE_TEAM;

    // If free team and no direct ID query → hide paid profiles
    if (isFreeTeam && !queryId) {
      where = { ...where, packageType: 'FREE' };
    }

    // If querying by specific ID (free team can access paid by direct ID)
    if (queryId) {
      return this.getProfileById(actor, queryId);
    }

    const profiles = await this.prisma.memberProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, mobile: true, email: true, role: true },
        },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.PROFILE_VIEW,
      resourceType: 'MemberProfile',
      orgId: actor.organizationId,
      metadata: { count: profiles.length },
    });

    return profiles;
  }

  /**
   * Get a single profile by ID.
   * Enforces organization scope and paid-profile ownership rules.
   */
  async getProfileById(actor: any, profileId: string) {
    const actorRole = actor.role as RoleType;
    const isFreeTeam = actor.staffDivision === StaffDivision.FREE_TEAM;
    const hasPaidOverride =
      actor.permissionOverrides?.granted?.includes('PAID_PROFILE_ACCESS');

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { id: true, mobile: true, email: true, role: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    // HQ-owned profiles: only HQ roles can access (or free team with direct ID)
    if (profile.ownershipType === 'HQ') {
      if (
        actorRole !== Role.SUPER_ADMIN &&
        actorRole !== Role.ADMIN &&
        actorRole !== Role.HQ_SERVICE_TEAM &&
        !isFreeTeam // free team can view paid by direct ID
      ) {
        throw new ForbiddenException(
          'Access denied: this profile is owned by HQ',
        );
      }
    } else {
      // Branch/franchise scope check
      if (
        actorRole !== Role.SUPER_ADMIN &&
        actorRole !== Role.ADMIN &&
        actorRole !== Role.HQ_SERVICE_TEAM
      ) {
        if (
          actorRole === Role.BRANCH_AGENT ||
          actorRole === Role.FRANCHISE_AGENT
        ) {
          if (profile.createdByStaffId !== actor.id) {
            throw new ForbiddenException(
              'Access denied: agents can only view profiles they created',
            );
          }
        } else if (
          actor.organizationId &&
          profile.ownerOrgId !== actor.organizationId
        ) {
          throw new ForbiddenException(
            'Access denied: cross-branch/franchise access not allowed',
          );
        }
      }
    }

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.PROFILE_VIEW,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
    });

    return profile;
  }

  /**
   * Create a new member profile.
   */
  async createProfile(
    actor: any,
    dto: CreateProfileDto,
    ipAddress?: string,
  ) {
    const actorRole = actor.role as RoleType;

    // Determine ownership
    let ownershipType: 'BRANCH' | 'FRANCHISE' | 'HQ' = 'BRANCH';
    if (
      actor.organization?.type === 'FRANCHISE' ||
      actorRole === Role.FRANCHISE_MANAGER ||
      actorRole === Role.FRANCHISE_STAFF ||
      actorRole === Role.FRANCHISE_AGENT
    ) {
      ownershipType = 'FRANCHISE';
    } else if (
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.ADMIN ||
      actorRole === Role.HQ_SERVICE_TEAM
    ) {
      ownershipType = 'HQ';
    }

    // Create the user account first
    const tempPassword = await bcrypt.hash(dto.mobile + '_temp', 12);
    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        passwordHash: tempPassword,
        role: 'MEMBER',
        organizationId: actor.organizationId,
      },
    });

    const profile = await this.prisma.memberProfile.create({
      data: {
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        profileData: dto.profileData as any,
        ownershipType: ownershipType as any,
        ownerOrgId: actor.organizationId,
        originatingOrgId: actor.organizationId,
        createdByStaffId: actor.id,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.PROFILE_CREATE,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      orgId: actor.organizationId,
      ipAddress,
    });

    return profile;
  }

  /**
   * Edit an existing member profile.
   * Agents: only own created profiles.
   * Branch/Franchise: only own org profiles.
   */
  async updateProfile(
    actor: any,
    profileId: string,
    dto: UpdateProfileDto,
    ipAddress?: string,
  ) {
    await this.scopeGuard.requireProfileOwnership(
      actor.id,
      actor.role,
      profileId,
    );
    await this.scopeGuard.requireOrganizationScope(
      actor.role,
      actor.organizationId,
      profileId,
    );

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        profileData: dto.profileData as any,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
      ipAddress,
    });

    return updated;
  }

  /**
   * Block a member profile.
   * Branch/Franchise Managers, ADMIN, SUPER_ADMIN can block.
   * Records who/when.
   */
  async blockProfile(
    actor: any,
    profileId: string,
    dto: BlockProfileDto,
    ipAddress?: string,
  ) {
    const actorRole = actor.role as RoleType;

    // Agents and Staff cannot block
    if (
      actorRole === Role.BRANCH_AGENT ||
      actorRole === Role.BRANCH_STAFF ||
      actorRole === Role.FRANCHISE_AGENT ||
      actorRole === Role.FRANCHISE_STAFF ||
      actorRole === Role.HQ_SERVICE_TEAM
    ) {
      throw new ForbiddenException('Access denied: your role cannot block member profiles');
    }

    // Scope check for managers
    if (
      actorRole === Role.BRANCH_MANAGER ||
      actorRole === Role.FRANCHISE_MANAGER
    ) {
      await this.scopeGuard.requireOrganizationScope(
        actorRole,
        actor.organizationId,
        profileId,
      );
    }

    await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        isBlocked: true,
        blockedById: actor.id,
        blockedAt: new Date(),
        blockedReason: dto.reason,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.PROFILE_BLOCK,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
      metadata: { reason: dto.reason },
      ipAddress,
    });

    return { message: 'Profile blocked successfully' };
  }

  /**
   * Unblock a member profile.
   * ONLY SUPER_ADMIN and ADMIN can unblock.
   */
  async unblockProfile(
    actor: any,
    profileId: string,
    ipAddress?: string,
  ) {
    const actorRole = actor.role as RoleType;

    if (actorRole !== Role.SUPER_ADMIN && actorRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: only Super Admin and Admin can unblock member profiles',
      );
    }

    await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        isBlocked: false,
        blockedById: null,
        blockedAt: null,
        blockedReason: null,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.PROFILE_UNBLOCK,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
      ipAddress,
    });

    return { message: 'Profile unblocked successfully' };
  }

  /**
   * Export member data (Excel/PDF).
   * ONLY SUPER_ADMIN and ADMIN.
   */
  async exportProfiles(actor: any, format: string, ipAddress?: string) {
    const actorRole = actor.role as RoleType;

    if (actorRole !== Role.SUPER_ADMIN && actorRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: only Super Admin and Admin can export member data',
      );
    }

    const profiles = await this.prisma.memberProfile.findMany({
      include: {
        user: { select: { id: true, mobile: true, email: true } },
        ownerOrg: { select: { name: true, type: true } },
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actorRole,
      action: AuditAction.MEMBER_EXPORT,
      resourceType: 'MemberProfile',
      orgId: actor.organizationId,
      metadata: { format, count: profiles.length },
      ipAddress,
    });

    // Return structured data (actual file generation in production)
    return {
      format,
      count: profiles.length,
      data: profiles,
      exportedAt: new Date().toISOString(),
      exportedBy: actor.id,
    };
  }

  /**
   * Transfer profile ownership to HQ when a member becomes paid.
   * Creates a read-only SalesCommissionRecord for the originating agent.
   */
  async transferToHq(actor: any, profileId: string, ipAddress?: string) {
    const actorRole = actor.role as RoleType;

    if (actorRole !== Role.SUPER_ADMIN && actorRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: only Admin can transfer profile ownership to HQ',
      );
    }

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    // Create commission record before transfer
    if (profile.createdByStaffId) {
      await this.prisma.salesCommissionRecord.create({
        data: {
          memberProfileId: profile.id,
          agentId: profile.createdByStaffId,
          originatingOrgId: profile.originatingOrgId,
          commissionNotes: `Profile transferred to HQ on ${new Date().toISOString()}`,
        },
      });
    }

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        packageType: 'PAID',
        ownershipType: 'HQ',
        ownerOrgId: null, // HQ doesn't have a branch org ID
      },
    });

    return updated;
  }
}
