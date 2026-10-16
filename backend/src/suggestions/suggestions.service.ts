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
  CreateSuggestionDto,
  UpdateSuggestionStatusDto,
  SuggestionQueryDto,
} from './dto/suggestions.dto';
import { SuggestionStatus } from '@prisma/client';

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Verify staff has authority to make suggestions
   */
  private verifyStaffAccess(actor: { id: string; role: string }) {
    const allowed = [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.BRANCH_MANAGER,
      Role.BRANCH_STAFF,
      Role.HQ_SERVICE_TEAM,
    ];
    if (!allowed.includes(actor.role as any)) {
      throw new ForbiddenException(
        'Access denied: Only authorized staff and admins can suggest member profiles.',
      );
    }
  }

  /**
   * Check if a member's package is currently eligible for staff suggestions
   */
  async checkMemberEligibility(memberProfileId: string): Promise<{
    eligible: boolean;
    reason?: string;
    package?: any;
  }> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { currentPackage: true },
    });

    if (!profile) {
      return { eligible: false, reason: 'Member profile not found' };
    }

    if (profile.isBlocked) {
      return { eligible: false, reason: 'Member account is currently blocked' };
    }

    if (profile.packageType !== 'PAID') {
      return {
        eligible: false,
        reason: 'Free tier members are not eligible for Suggested Profiles. Upgrade required.',
      };
    }

    if (!profile.currentPackageId || !profile.currentPackage) {
      return {
        eligible: false,
        reason: 'No active package configured for this member.',
      };
    }

    if (!profile.currentPackage.suggestedProfilesEligible) {
      return {
        eligible: false,
        reason: `Current package (${profile.currentPackage.name}) is not configured for Suggested Profiles.`,
        package: profile.currentPackage,
      };
    }

    if (profile.packageExpiresAt && new Date(profile.packageExpiresAt) < new Date()) {
      return {
        eligible: false,
        reason: 'Member package has expired. Renewal required.',
      };
    }

    return {
      eligible: true,
      package: profile.currentPackage,
    };
  }

  /**
   * Create profile suggestion by staff
   */
  async createSuggestion(
    actor: { id: string; role: string; organizationId?: string },
    dto: CreateSuggestionDto,
  ) {
    this.verifyStaffAccess(actor);

    // 1. Resolve receiving member profile
    const receivingProfile = await this.prisma.memberProfile.findFirst({
      where: {
        OR: [
          { id: dto.receivingMemberProfileId },
          { memberId: dto.receivingMemberProfileId },
        ],
      },
      include: { currentPackage: true },
    });
    if (!receivingProfile) {
      throw new NotFoundException(`Receiving member not found for ID: ${dto.receivingMemberProfileId}`);
    }

    // 2. Resolve suggested profile
    const suggestedProfile = await this.prisma.memberProfile.findFirst({
      where: {
        OR: [
          { id: dto.suggestedProfileId },
          { memberId: dto.suggestedProfileId },
        ],
      },
    });
    if (!suggestedProfile) {
      throw new NotFoundException(`Suggested profile not found for ID: ${dto.suggestedProfileId}`);
    }

    // 3. Validation: cannot suggest to self
    if (receivingProfile.id === suggestedProfile.id) {
      throw new BadRequestException('Cannot suggest a member profile to themselves.');
    }

    // 4. Validation: neither profile can be blocked
    if (suggestedProfile.isBlocked) {
      throw new BadRequestException('Cannot suggest a blocked profile.');
    }
    if (receivingProfile.isBlocked) {
      throw new BadRequestException('Cannot suggest to a blocked member.');
    }

    // 5. Validation: Backend check of package eligibility
    const eligibility = await this.checkMemberEligibility(receivingProfile.id);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Package Ineligibility: ${eligibility.reason || 'Member package does not qualify for Suggested Profiles.'}`,
      );
    }

    // 6. Check duplicate active suggestion
    const existing = await this.prisma.profileSuggestion.findUnique({
      where: {
        suggestedProfileId_receivingMemberProfileId: {
          suggestedProfileId: suggestedProfile.id,
          receivingMemberProfileId: receivingProfile.id,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `A suggestion for this profile has already been submitted (Status: ${existing.status}).`,
      );
    }

    // 7. Create suggestion
    const suggestion = await this.prisma.profileSuggestion.create({
      data: {
        staffId: actor.id,
        suggestedProfileId: suggestedProfile.id,
        receivingMemberProfileId: receivingProfile.id,
        status: SuggestionStatus.PENDING,
        notes: dto.notes || null,
      },
      include: {
        suggestedProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            photoUrl: true,
            profileData: true,
          },
        },
        receivingMemberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
          },
        },
        staff: {
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
        actorRole: (actor.role as any) || 'BRANCH_STAFF',
        action: AuditAction.PROFILE_EDIT,
        resourceType: 'ProfileSuggestion',
        resourceId: suggestion.id,
        metadata: {
          suggestedProfileId: suggestedProfile.id,
          receivingMemberProfileId: receivingProfile.id,
        },
      });
    }

    return {
      success: true,
      message: 'Profile suggested successfully to member',
      suggestion,
    };
  }

  /**
   * Member retrieves suggestions directed to them with strict privacy rules
   * NEVER reveals private phone numbers, emails, addresses, or ID proofs.
   */
  async getMemberSuggestions(user: { id: string }) {
    const memberProfile = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id },
      include: { currentPackage: true },
    });

    if (!memberProfile) {
      throw new NotFoundException('Member profile not found for this account.');
    }

    // Recheck package eligibility
    const eligibility = await this.checkMemberEligibility(memberProfile.id);
    if (!eligibility.eligible) {
      return {
        eligible: false,
        reason: eligibility.reason,
        suggestions: [],
      };
    }

    const suggestions = await this.prisma.profileSuggestion.findMany({
      where: {
        receivingMemberProfileId: memberProfile.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        suggestedProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            photoUrl: true,
            profileData: true,
            // SENSITIVE CONTACT DETAILS (phone, email, address, ID proof) ARE EXCLUDED HERE!
          },
        },
        staff: {
          select: {
            fullName: true,
            employeeId: true,
          },
        },
      },
    });

    return {
      eligible: true,
      package: eligibility.package,
      suggestions,
    };
  }

  /**
   * Member updates suggestion status (VIEWED, INTERESTED, DECLINED)
   */
  async updateMemberSuggestionStatus(
    user: { id: string },
    suggestionId: string,
    dto: UpdateSuggestionStatusDto,
  ) {
    const memberProfile = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id },
    });
    if (!memberProfile) {
      throw new NotFoundException('Member profile not found.');
    }

    const suggestion = await this.prisma.profileSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) {
      throw new NotFoundException('Suggestion record not found.');
    }

    if (suggestion.receivingMemberProfileId !== memberProfile.id) {
      throw new ForbiddenException('Access denied: You can only update your own suggestions.');
    }

    const updated = await this.prisma.profileSuggestion.update({
      where: { id: suggestionId },
      data: { status: dto.status },
    });

    return {
      success: true,
      suggestion: updated,
    };
  }

  /**
   * Admin toggles package eligibility for Suggested Profiles
   */
  async togglePackageEligibility(
    actor: { id: string; role: string },
    packageId: string,
    eligible: boolean,
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Admins can configure package eligibility.');
    }

    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: packageId },
    });
    if (!pkg) {
      throw new NotFoundException(`Package not found for ID: ${packageId}`);
    }

    const updated = await this.prisma.packageMaster.update({
      where: { id: packageId },
      data: { suggestedProfilesEligible: eligible },
    });

    return {
      success: true,
      message: `Package ${pkg.name} suggested profiles eligibility updated to ${eligible}`,
      package: updated,
    };
  }

  /**
   * List all packages with eligibility status
   */
  async listPackagesWithEligibility() {
    return this.prisma.packageMaster.findMany({
      orderBy: { cost: 'asc' },
      select: {
        id: true,
        name: true,
        cost: true,
        validityDays: true,
        suggestedProfilesEligible: true,
        featuredProfileEligible: true,
        isActive: true,
      },
    });
  }

  /**
   * Suggestion History for Reports
   * Scoped to authorized roles (Admin, Super Admin, Branch Manager)
   */
  async getSuggestionHistory(
    actor: { id: string; role: string; organizationId?: string },
    query: SuggestionQueryDto,
  ) {
    const isHQAdmin = actor.role === Role.SUPER_ADMIN || actor.role === Role.ADMIN;
    const isBranchManager = actor.role === Role.BRANCH_MANAGER;

    if (!isHQAdmin && !isBranchManager) {
      throw new ForbiddenException('Access denied: Report access requires Manager or Admin privileges.');
    }

    const where: any = {};

    // Branch isolation for Branch Managers
    if (isBranchManager && actor.organizationId) {
      where.staff = {
        organizationId: actor.organizationId,
      };
    }

    if (query.staffId) where.staffId = query.staffId;
    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [total, suggestions] = await Promise.all([
      this.prisma.profileSuggestion.count({ where }),
      this.prisma.profileSuggestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          staff: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              organization: {
                select: { id: true, name: true },
              },
            },
          },
          suggestedProfile: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              gender: true,
              photoUrl: true,
            },
          },
          receivingMemberProfile: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              packageType: true,
              currentPackage: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      suggestions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
