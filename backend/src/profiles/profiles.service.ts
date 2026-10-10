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
import { validateStep1Address } from '../locations/location-address.validation';
import { validateAndSanitizeStep1Community } from '../community/community-profile.validation';
import { validateAndSanitizeStep1Lifestyle } from './lifestyle-profile.validation';
import { validateAndSanitizeStep4 } from './partner-preferences.validation';
import { applyPaymentInterestDateAttribution } from './payment-interest-date';
import { validateAndSanitizeStep5 } from './verification-settings.validation';
import { applyProfilePaymentDate } from './profile-payment-date';
import { assertImmutableProfileFields } from './immutable-profile.validation';

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
          select: { id: true, mobile: true, email: true, role: true, mobileVerified: true, emailVerified: true },
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

    return profiles.map((profile) => this.serializeProfileForActor(profile, actor));
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
        user: { select: { id: true, mobile: true, email: true, role: true, mobileVerified: true, emailVerified: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    if (actorRole === Role.MEMBER) {
      if (profile.userId !== actor.id) {
        throw new ForbiddenException(
          'Access denied: members can only view their own profile',
        );
      }
      return this.serializeProfileForActor(profile, actor);
    }

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

    return this.serializeProfileForActor(profile, actor);
  }

  /**
   * Get current authenticated user's member profile.
   */
  async getMyProfile(actor: any) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId: actor.id },
      include: {
        user: { select: { id: true, mobile: true, email: true, role: true, mobileVerified: true, emailVerified: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for current user');
    }

    return this.serializeProfileForActor(profile, actor);
  }

  async getContactRevealPackages() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'CONTACT_REVEAL_ACCEPTANCE_PACKAGES' },
    });
    const stored = setting?.value;
    const packageTypes = Array.isArray(stored)
      ? stored.filter((value): value is string => value === 'PAID')
      : ['PAID'];
    return { packageTypes };
  }

  async setContactRevealPackages(actor: any, packageTypes: string[]) {
    const setting = await this.prisma.platformSetting.upsert({
      where: { key: 'CONTACT_REVEAL_ACCEPTANCE_PACKAGES' },
      create: {
        key: 'CONTACT_REVEAL_ACCEPTANCE_PACKAGES',
        value: packageTypes,
        updatedById: actor.id,
      },
      update: { value: packageTypes, updatedById: actor.id },
    });
    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'PlatformSetting',
      resourceId: setting.key,
      orgId: actor.organizationId,
      metadata: { setting: 'CONTACT_REVEAL_ACCEPTANCE_PACKAGES', packageTypes },
    });
    return { packageTypes };
  }

  private serializeProfileForActor(profile: any, actor: any) {
    const profileData = (profile.profileData as Record<string, any>) || {};
    const step5 = {
      ...(profileData.step5 || {}),
      mobileVerified: Boolean(profile.user?.mobileVerified),
      emailVerified: Boolean(profile.user?.emailVerified),
      idProofUploaded: Boolean(profile.idProofFileUrl),
    };
    const serialized: any = {
      ...profile,
      profileData: { ...profileData, step5 },
    };
    if (actor.role !== Role.MEMBER || profile.userId === actor.id) return serialized;

    const step1 = { ...(profileData.step1 || {}) };
    delete step1.mobile;
    serialized.user = profile.user ? { ...profile.user, mobile: null } : profile.user;
    serialized.profileData = {
      ...serialized.profileData,
      step1,
    };
    return {
      ...serialized,
    };
  }

  /**
   * Create a new member profile.
   */
  async createProfile(
    actor: any,
    dto: CreateProfileDto,
    ipAddress?: string,
  ) {
    let profileData = await this.validateAndSanitizeProfileData(dto.profileData);
    const actorRole = actor.role as RoleType;
    if (profileData?.step5?.mobileRevelationPreference === 'Acceptance Preference') {
      throw new ForbiddenException('Acceptance Preference requires a qualifying paid package');
    }
    const paymentDateUpdate = applyPaymentInterestDateAttribution(
      profileData,
      null,
      actor,
      undefined,
      true,
    );
    profileData = paymentDateUpdate.profileData;
    const profilePaymentDateUpdate = applyProfilePaymentDate(
      profileData,
      null,
      actor,
      undefined,
      true,
    );
    profileData = profilePaymentDateUpdate.profileData;

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
        email: dto.email || null,
        passwordHash: tempPassword,
        role: 'MEMBER',
        organizationId: actor.organizationId,
      },
    });

    const memberId = `M${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    const profile = await this.prisma.memberProfile.create({
      data: {
        memberId,
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        currentStep: dto.currentStep || 1,
        completedSteps: dto.completedSteps ? (dto.completedSteps as any) : [1],
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
        timeOfBirth: dto.timeOfBirth,
        birthPlace: dto.birthPlace,
        photoUrl: dto.photoUrl,
        idProofFileUrl: dto.idProofFileUrl,
        profileData: profileData as any,
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
      metadata: {
        ...(paymentDateUpdate.auditMetadata || {}),
        ...(profilePaymentDateUpdate.auditMetadata || {}),
      },
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
    const profileData = await this.validateAndSanitizeProfileData(dto.profileData);
    await this.scopeGuard.requireProfileOwnership(
      actor.id,
      actor.role,
      profileId,
    );
    await this.scopeGuard.requireOrganizationScope(
      actor.role,
      actor.organizationId,
      profileId,
      actor.id,
    );

    const existing = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { mobile: true, email: true, mobileVerified: true, emailVerified: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    assertImmutableProfileFields(existing, existing.user, dto, profileData);

    if (profileData?.step5?.mobileRevelationPreference === 'Acceptance Preference') {
      const eligiblePackages = await this.getContactRevealPackages();
      if (!eligiblePackages.packageTypes.includes(existing.packageType)) {
        throw new ForbiddenException('Acceptance Preference requires a qualifying paid package');
      }
    }

    const paymentDateUpdate = applyPaymentInterestDateAttribution(
      profileData,
      (existing.profileData as Record<string, any>) || {},
      actor,
      existing.userId,
    );

    const profilePaymentDateUpdate = applyProfilePaymentDate(
      paymentDateUpdate.profileData,
      (existing.profileData as Record<string, any>) || {},
      actor,
      existing.userId,
    );

    const existingProfileData = (existing.profileData as Record<string, any>) || {};
    const mergedProfileData = (profilePaymentDateUpdate.profileData
      ? { ...existingProfileData, ...profilePaymentDateUpdate.profileData }
      : existing.profileData) as Record<string, any> | null;
    if (mergedProfileData && profileData?.step5) {
      const storedStep5 = existingProfileData.step5 || {};
      mergedProfileData.step5 = {
        ...mergedProfileData.step5,
        mobileVerified: Boolean(existing.user?.mobileVerified),
        emailVerified: Boolean(existing.user?.emailVerified),
        idProofUploaded: Boolean(existing.idProofFileUrl),
        idProofVerified: storedStep5.idProofVerified || false,
        idProofVerifiedAt: storedStep5.idProofVerifiedAt,
        idProofVerifiedBy: storedStep5.idProofVerifiedBy,
      };
    }

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        currentStep: dto.currentStep,
        completedSteps: dto.completedSteps ? (dto.completedSteps as any) : undefined,
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
        timeOfBirth: dto.timeOfBirth,
        birthPlace: dto.birthPlace,
        photoUrl: dto.photoUrl,
        idProofFileUrl: dto.idProofFileUrl,
        profileData: mergedProfileData as any,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
      metadata: {
        ...(paymentDateUpdate.auditMetadata || {}),
        ...(profilePaymentDateUpdate.auditMetadata || {}),
      },
      ipAddress,
    });

    return updated;
  }

  private async validateAndSanitizeProfileData(profileData?: Record<string, any>) {
    if (!profileData || typeof profileData !== 'object' || Array.isArray(profileData)) {
      return profileData;
    }

    const step1 = profileData?.step1;
    let sanitizedProfileData = { ...profileData };

    if (step1 && typeof step1 === 'object') {
      const locations = await this.prisma.locationMaster.findMany({
        where: { isActive: true },
        select: { id: true, name: true, level: true, parentId: true, isActive: true },
      });
      validateStep1Address(step1, locations);

      const communityOptions = await this.prisma.communityMaster.findMany({
        where: { isActive: true },
        select: { id: true, name: true, level: true, parentId: true, isActive: true },
      });
      const sanitizedCommunity = validateAndSanitizeStep1Community(step1, communityOptions);
      sanitizedProfileData.step1 = validateAndSanitizeStep1Lifestyle(sanitizedCommunity);
    }

    if (sanitizedProfileData.step4 && typeof sanitizedProfileData.step4 === 'object') {
      sanitizedProfileData.step4 = validateAndSanitizeStep4(sanitizedProfileData.step4);
    }
    if (sanitizedProfileData.step5 && typeof sanitizedProfileData.step5 === 'object') {
      sanitizedProfileData.step5 = validateAndSanitizeStep5(sanitizedProfileData.step5);
    }
    return sanitizedProfileData;
  }

  async verifyIdProof(
    actor: any,
    profileId: string,
    verified: boolean,
    ipAddress?: string,
  ) {
    const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER];
    if (!allowedRoles.includes(actor.role)) {
      throw new ForbiddenException('Only Admin or Branch Manager can verify ID proof');
    }

    const existing = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });
    if (!existing) throw new NotFoundException('Profile not found');
    if (!existing.idProofFileUrl) {
      throw new BadRequestException('Upload an ID proof before reviewing it');
    }
    if (actor.role === Role.BRANCH_MANAGER) {
      await this.scopeGuard.requireOrganizationScope(
        actor.role,
        actor.organizationId,
        profileId,
        actor.id,
      );
    }

    const profileData = (existing.profileData as Record<string, any>) || {};
    const step5 = {
      ...(profileData.step5 || {}),
      idProofUploaded: true,
      idProofVerified: verified,
      idProofVerifiedAt: new Date().toISOString(),
      idProofVerifiedBy: actor.id,
    };
    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: { profileData: { ...profileData, step5 } as any },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: actor.organizationId,
      metadata: {
        idProofVerified: verified,
        idProofVerifiedAt: step5.idProofVerifiedAt,
        idProofVerifiedBy: actor.id,
      },
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
