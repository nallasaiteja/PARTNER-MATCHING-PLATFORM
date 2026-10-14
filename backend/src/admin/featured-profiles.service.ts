import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeaturedProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically sweeps and deactivates expired featured profiles
   */
  async sweepExpiredProfiles() {
    const now = new Date();
    await this.prisma.memberProfile.updateMany({
      where: {
        isFeatured: true,
        featuredUntil: { lt: now },
      },
      data: {
        isFeatured: false,
      },
    });

    await this.prisma.featuredProfileRecord.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get maximum allowed concurrent featured profiles from MasterData configuration
   */
  async getMaxFeaturedLimit(): Promise<number> {
    const config = await this.prisma.masterData.findUnique({
      where: {
        category_code: {
          category: 'PLATFORM',
          code: 'MAX_FEATURED_PROFILES',
        },
      },
    });
    if (config && config.metadata && typeof (config.metadata as any).limit === 'number') {
      return (config.metadata as any).limit;
    }
    return 20; // Default limit
  }

  /**
   * Update maximum concurrent featured profile limit (Super Admin only)
   */
  async updateMaxFeaturedLimit(limit: number) {
    if (limit < 1) {
      throw new BadRequestException('Max featured limit must be at least 1');
    }

    return this.prisma.masterData.upsert({
      where: {
        category_code: {
          category: 'PLATFORM',
          code: 'MAX_FEATURED_PROFILES',
        },
      },
      create: {
        category: 'PLATFORM',
        code: 'MAX_FEATURED_PROFILES',
        label: 'Maximum Concurrent Featured Profiles',
        metadata: { limit },
      },
      update: {
        metadata: { limit },
      },
    });
  }

  /**
   * Mark an eligible paid member profile as featured
   */
  async markAsFeatured(
    memberProfileId: string,
    assignedById: string,
    validityDays: number,
    notes?: string,
  ) {
    await this.sweepExpiredProfiles();

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      include: { currentPackage: true },
    });

    if (!profile) {
      throw new NotFoundException(`Member profile not found`);
    }

    if (profile.isBlocked) {
      throw new BadRequestException('Cannot feature a blocked profile');
    }

    if (profile.closureRequested) {
      throw new BadRequestException('Cannot feature a profile pending closure');
    }

    // Eligibility check: Must be PAID or current package allows featured profiles
    const isPaid = profile.packageType === 'PAID';
    const packageEligible = profile.currentPackage?.featuredProfileEligible ?? false;

    if (!isPaid && !packageEligible) {
      throw new BadRequestException(
        'Only eligible paid members can be marked as Featured. Upgrade member package first.',
      );
    }

    // Check concurrent limit
    const currentCount = await this.prisma.memberProfile.count({
      where: { isFeatured: true },
    });

    const maxLimit = await this.getMaxFeaturedLimit();
    if (currentCount >= maxLimit && !profile.isFeatured) {
      throw new BadRequestException(
        `Maximum concurrent featured profile limit (${maxLimit}) reached. Unfeature an active profile first or increase the limit.`,
      );
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Deactivate previous active records for this profile
    await this.prisma.featuredProfileRecord.updateMany({
      where: { memberProfileId, isActive: true },
      data: { isActive: false },
    });

    // Create history record
    const record = await this.prisma.featuredProfileRecord.create({
      data: {
        memberProfileId,
        assignedById,
        startDate: now,
        endDate,
        isActive: true,
        notes,
      },
    });

    // Update profile
    const updatedProfile = await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        isFeatured: true,
        featuredAt: now,
        featuredUntil: endDate,
      },
    });

    return {
      success: true,
      profile: updatedProfile,
      featuredRecord: record,
    };
  }

  /**
   * Remove featured status from a member profile
   */
  async unfeatureProfile(memberProfileId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Member profile not found`);
    }

    await this.prisma.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        isFeatured: false,
        featuredUntil: null,
      },
    });

    await this.prisma.featuredProfileRecord.updateMany({
      where: { memberProfileId, isActive: true },
      data: { isActive: false },
    });

    return { success: true, message: 'Profile unfeatured successfully' };
  }

  /**
   * Get active featured profiles list
   */
  async getActiveFeaturedProfiles() {
    await this.sweepExpiredProfiles();

    const profiles = await this.prisma.memberProfile.findMany({
      where: {
        isFeatured: true,
        isBlocked: false,
      },
      include: {
        user: { select: { email: true, mobile: true } },
        currentPackage: { select: { name: true } },
      },
      orderBy: { featuredAt: 'desc' },
    });

    const maxLimit = await this.getMaxFeaturedLimit();

    return {
      activeCount: profiles.length,
      maxLimit,
      profiles,
    };
  }

  /**
   * Get historical / administrative report of all featured assignments
   */
  async getFeaturedReport() {
    await this.sweepExpiredProfiles();

    const records = await this.prisma.featuredProfileRecord.findMany({
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            profileData: true,
            packageType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = records.filter((r) => r.isActive).length;
    const expiredCount = records.filter((r) => !r.isActive).length;
    const maxLimit = await this.getMaxFeaturedLimit();

    return {
      summary: {
        activeCount,
        expiredCount,
        totalHistoricalAssignments: records.length,
        maxLimit,
      },
      records,
    };
  }
}
