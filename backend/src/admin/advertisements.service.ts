import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdvertisementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sweeps and updates advertisement status based on current date
   */
  async sweepAdStatuses() {
    const now = new Date();

    // Expired ads
    await this.prisma.advertisement.updateMany({
      where: {
        endDate: { lt: now },
        status: { not: 'EXPIRED' },
      },
      data: { status: 'EXPIRED' },
    });

    // Scheduled ads that should now be active
    await this.prisma.advertisement.updateMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: 'SCHEDULED',
      },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Create a new advertisement (Super Admin exclusive)
   */
  async createAdvertisement(data: {
    slot: string;
    title: string;
    imageUrl: string;
    targetUrl?: string;
    startDate: string | Date;
    endDate: string | Date;
    visibility?: string;
    partnerName?: string;
    feeAmount?: number;
  }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }

    if (start >= end) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    let initialStatus = 'ACTIVE';
    if (start > now) {
      initialStatus = 'SCHEDULED';
    } else if (end < now) {
      initialStatus = 'EXPIRED';
    }

    return this.prisma.advertisement.create({
      data: {
        slot: data.slot,
        title: data.title,
        imageUrl: data.imageUrl,
        targetUrl: data.targetUrl,
        startDate: start,
        endDate: end,
        visibility: data.visibility || 'ALL',
        partnerName: data.partnerName,
        feeAmount: data.feeAmount || 0,
        status: initialStatus,
        isActive: true,
      },
    });
  }

  /**
   * List all advertisements for Super Admin dashboard with filters
   */
  async getAllAdvertisements(slot?: string, status?: string) {
    await this.sweepAdStatuses();

    const where: any = {};
    if (slot) where.slot = slot;
    if (status) where.status = status;

    return this.prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update advertisement details
   */
  async updateAdvertisement(
    id: string,
    data: {
      title?: string;
      imageUrl?: string;
      targetUrl?: string;
      startDate?: string | Date;
      endDate?: string | Date;
      visibility?: string;
      partnerName?: string;
      feeAmount?: number;
      isActive?: boolean;
    },
  ) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    const updatePayload: any = { ...data };

    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate) updatePayload.endDate = new Date(data.endDate);

    const now = new Date();
    const effectiveStart = updatePayload.startDate || ad.startDate;
    const effectiveEnd = updatePayload.endDate || ad.endDate;

    if (effectiveStart > now) {
      updatePayload.status = 'SCHEDULED';
    } else if (effectiveEnd < now) {
      updatePayload.status = 'EXPIRED';
    } else {
      updatePayload.status = 'ACTIVE';
    }

    return this.prisma.advertisement.update({
      where: { id },
      data: updatePayload,
    });
  }

  /**
   * Delete an advertisement
   */
  async deleteAdvertisement(id: string) {
    return this.prisma.advertisement.delete({
      where: { id },
    });
  }

  /**
   * Track ad impression
   */
  async recordImpression(id: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });
  }

  /**
   * Track ad click
   */
  async recordClick(id: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  }

  /**
   * Public / Member endpoint to fetch active ads for a slot
   */
  async getActiveAdsForSlot(slot: string, userTier: 'FREE' | 'PAID' | 'ANONYMOUS' = 'ANONYMOUS') {
    await this.sweepAdStatuses();

    const visibilityFilter =
      userTier === 'PAID'
        ? { in: ['ALL', 'PAID_ONLY'] }
        : userTier === 'FREE'
        ? { in: ['ALL', 'FREE_ONLY'] }
        : { in: ['ALL'] };

    return this.prisma.advertisement.findMany({
      where: {
        slot,
        isActive: true,
        status: 'ACTIVE',
        visibility: visibilityFilter,
      },
      select: {
        id: true,
        slot: true,
        title: true,
        imageUrl: true,
        targetUrl: true,
        partnerName: true,
      },
    });
  }

  /**
   * Financial and performance report for Super Admin
   */
  async getAdPerformanceReport() {
    await this.sweepAdStatuses();

    const ads = await this.prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = ads.reduce((acc, curr) => acc + (curr.feeAmount || 0), 0);
    const totalImpressions = ads.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalClicks = ads.reduce((acc, curr) => acc + curr.clicks, 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalAds: ads.length,
      totalRevenue,
      totalImpressions,
      totalClicks,
      overallCTR: Number(avgCTR.toFixed(2)),
      ads,
    };
  }
}
