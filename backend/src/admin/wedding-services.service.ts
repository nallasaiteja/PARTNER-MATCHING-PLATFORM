import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeddingServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new wedding service listing (Admin / Super Admin)
   */
  async createService(data: {
    businessName: string;
    category: string;
    city: string;
    phone: string;
    whatsapp: string;
    website?: string;
    description: string;
    photos?: string[];
    isFeatured?: boolean;
    feeAmount?: number;
  }) {
    if (!data.businessName || !data.category || !data.city || !data.phone) {
      throw new BadRequestException('Business name, category, city, and phone are required');
    }

    if (data.photos && data.photos.length > 5) {
      throw new BadRequestException('Maximum 5 photos allowed per listing');
    }

    return this.prisma.weddingService.create({
      data: {
        businessName: data.businessName,
        category: data.category.toUpperCase(),
        city: data.city,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        website: data.website,
        description: data.description || '',
        photos: data.photos || [],
        isFeatured: data.isFeatured ?? false,
        feeAmount: data.feeAmount || 0,
        isActive: true,
      },
    });
  }

  /**
   * Update an existing wedding service listing
   */
  async updateService(
    id: string,
    data: {
      businessName?: string;
      category?: string;
      city?: string;
      phone?: string;
      whatsapp?: string;
      website?: string;
      description?: string;
      photos?: string[];
      isFeatured?: boolean;
      feeAmount?: number;
      isActive?: boolean;
    },
  ) {
    const service = await this.prisma.weddingService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Wedding service not found');
    }

    if (data.photos && data.photos.length > 5) {
      throw new BadRequestException('Maximum 5 photos allowed per listing');
    }

    const payload: any = { ...data };
    if (data.category) payload.category = data.category.toUpperCase();

    return this.prisma.weddingService.update({
      where: { id },
      data: payload,
    });
  }

  /**
   * Delete or deactivate a wedding service listing
   */
  async deleteService(id: string) {
    return this.prisma.weddingService.delete({
      where: { id },
    });
  }

  /**
   * Administrative view: Get all services with fee amounts and internal metrics
   */
  async getAllServicesAdmin(category?: string, isFeatured?: boolean) {
    const where: any = {};
    if (category) where.category = category.toUpperCase();
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    return this.prisma.weddingService.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Member-facing directory:
   * Enforces backend security:
   * - Featured partners appear first.
   * - Only PAID members see unmasked phone and WhatsApp.
   * - Free members and unauthenticated guests see masked contact details.
   */
  async getDirectory(
    category?: string,
    city?: string,
    isPaidUser = false,
  ) {
    const where: any = { isActive: true };
    if (category) where.category = category.toUpperCase();
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const services = await this.prisma.weddingService.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return services.map((svc) => {
      if (isPaidUser) {
        return svc;
      }
      // Mask contact details for free members / guests
      return {
        ...svc,
        phone: '🔒 Upgrade to Paid to Call',
        whatsapp: '🔒 Upgrade to Paid to WhatsApp',
        canContactDirectly: false,
      };
    });
  }

  /**
   * Finance reporting: Total wedding partnership fees collected
   */
  async getPartnershipFinancialReport() {
    const services = await this.prisma.weddingService.findMany({
      select: {
        id: true,
        businessName: true,
        category: true,
        city: true,
        feeAmount: true,
        isFeatured: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { feeAmount: 'desc' },
    });

    const totalFees = services.reduce((acc, curr) => acc + (curr.feeAmount || 0), 0);
    const featuredCount = services.filter((s) => s.isFeatured).length;

    return {
      totalPartners: services.length,
      featuredPartners: featuredCount,
      totalPartnershipRevenue: totalFees,
      services,
    };
  }
}
