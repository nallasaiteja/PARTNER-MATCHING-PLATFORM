import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, RoleType } from '../constants/roles.constants';

/**
 * ScopeGuardService
 * Provides reusable methods to enforce organization scope:
 * - Branch/franchise isolation
 * - Profile ownership (agent can only edit own created profiles)
 * - Staff management scope (Franchise Manager → own franchise only)
 */
@Injectable()
export class ScopeGuardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures a user can only access profiles within their organization scope.
   * Cross-branch access is denied at the DB query level.
   */
  async requireOrganizationScope(
    actorRole: RoleType,
    actorOrgId: string | null,
    profileOwnerId: string,
    actorId?: string,
  ): Promise<void> {
    // HQ roles have global access
    if (
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.ADMIN ||
      actorRole === Role.HQ_SERVICE_TEAM
    ) {
      return;
    }

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileOwnerId },
    });

    if (!profile) {
      throw new ForbiddenException('Profile not found');
    }

    // Members can only access their own profile
    if (actorRole === Role.MEMBER) {
      if (profile.userId !== actorId) {
        throw new ForbiddenException('Access denied: members can only access their own profile');
      }
      return;
    }

    if (!actorOrgId) {
      throw new ForbiddenException('Access denied: no organization assigned');
    }

    // HQ-owned profiles: only HQ roles can access
    if (profile.ownershipType === 'HQ') {
      throw new ForbiddenException(
        'Access denied: this profile is owned by HQ Service Team',
      );
    }

    if (profile.ownerOrgId !== actorOrgId) {
      throw new ForbiddenException(
        'Access denied: cross-branch/franchise profile access is not allowed',
      );
    }

    // Branch/Franchise Staff must be specifically assigned to the profile
    if (
      actorRole === Role.BRANCH_STAFF ||
      actorRole === Role.FRANCHISE_STAFF
    ) {
      // For this check we'll need the assignedToId from profile
      if ((profile as any).assignedToId !== actorId) {
        throw new ForbiddenException(
          'Access denied: staff can only access assigned profiles',
        );
      }
    }
  }

  /**
   * Agents can only edit profiles they personally created.
   */
  async requireProfileOwnership(
    actorId: string,
    actorRole: RoleType,
    profileId: string,
  ): Promise<void> {
    // Managers and HQ can bypass ownership check
    if (
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.ADMIN ||
      actorRole === Role.HQ_SERVICE_TEAM ||
      actorRole === Role.BRANCH_MANAGER ||
      actorRole === Role.FRANCHISE_MANAGER
    ) {
      return;
    }

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new ForbiddenException('Profile not found');
    }

    // Members can only edit their own profile
    if (actorRole === Role.MEMBER) {
      if (profile.userId !== actorId) {
        throw new ForbiddenException(
          'Access denied: members can only edit their own profile',
        );
      }
      return;
    }

    // Agents: must be the creator
    if (
      actorRole === Role.BRANCH_AGENT ||
      actorRole === Role.FRANCHISE_AGENT
    ) {
      if (profile.createdByStaffId !== actorId) {
        throw new ForbiddenException(
          'Access denied: agents can only edit profiles they personally created',
        );
      }
    }
  }

  /**
   * Franchise Managers can only manage staff within their own franchise.
   */
  async requireFranchiseStaffScope(
    actorRole: RoleType,
    actorOrgId: string | null,
    targetStaffId: string,
  ): Promise<void> {
    if (
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.ADMIN
    ) {
      return;
    }

    if (actorRole === Role.FRANCHISE_MANAGER) {
      const targetStaff = await this.prisma.user.findUnique({
        where: { id: targetStaffId },
      });

      if (!targetStaff) {
        throw new ForbiddenException('Staff not found');
      }

      if (targetStaff.organizationId !== actorOrgId) {
        throw new ForbiddenException(
          'Access denied: Franchise Manager can only manage staff within their own franchise',
        );
      }

      return;
    }

    throw new ForbiddenException(
      'Access denied: your role cannot manage staff',
    );
  }

  /**
   * Builds an organization-scoped WHERE clause for Prisma queries.
   * Prevents fetching all profiles and filtering on the frontend.
   */
  buildProfileScopeWhere(user: {
    id: string;
    role: RoleType;
    organizationId: string | null;
  }) {
    const { id, role, organizationId } = user;

    if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      return {}; // global access
    }

    if (role === Role.HQ_SERVICE_TEAM) {
      return {}; // HQ sees all profiles
    }

    if (role === Role.BRANCH_AGENT || role === Role.FRANCHISE_AGENT) {
      return { createdByStaffId: id }; // only own created profiles
    }

    if (role === Role.BRANCH_STAFF || role === Role.FRANCHISE_STAFF) {
      return { assignedToId: id }; // only assigned profiles
    }

    if (organizationId) {
      return { ownerOrgId: organizationId }; // branch/franchise scope
    }

    return { id: 'NEVER' }; // deny all if no org
  }
}
