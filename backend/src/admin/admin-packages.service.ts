import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class AdminPackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAllPackages() {
    return this.prisma.packageMaster.findMany({
      orderBy: { cost: 'asc' },
      include: {
        _count: {
          select: { memberProfiles: true, invoices: true },
        },
      },
    });
  }

  async getPackage(id: string) {
    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id },
      include: {
        _count: { select: { memberProfiles: true, invoices: true } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async createPackage(
    actor: any,
    dto: {
      name: string;
      validityDays: number;
      contactReveals: number;
      ticketQuota?: number;
      emiEligible?: boolean;
      cost: number;
      servicesProvided: string;
      featuredProfileEligible?: boolean;
    },
    ipAddress?: string,
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin can create packages');
    }

    const existing = await this.prisma.packageMaster.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Package named '${dto.name}' already exists`);
    }

    const pkg = await this.prisma.packageMaster.create({
      data: {
        name: dto.name.trim(),
        validityDays: Number(dto.validityDays),
        contactReveals: Number(dto.contactReveals),
        ticketQuota: dto.ticketQuota !== undefined ? Number(dto.ticketQuota) : 5,
        emiEligible: dto.emiEligible || false,
        cost: Number(dto.cost),
        servicesProvided: dto.servicesProvided.trim(),
        featuredProfileEligible: dto.featuredProfileEligible || false,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PERMISSION_OVERRIDE,
      resourceType: 'PackageMaster',
      resourceId: pkg.id,
      metadata: { action: 'PACKAGE_CREATE', name: pkg.name, cost: pkg.cost },
      ipAddress,
    });

    return pkg;
  }

  async updatePackage(
    actor: any,
    id: string,
    dto: {
      name?: string;
      validityDays?: number;
      contactReveals?: number;
      ticketQuota?: number;
      emiEligible?: boolean;
      cost?: number;
      servicesProvided?: string;
      featuredProfileEligible?: boolean;
      isActive?: boolean;
    },
    ipAddress?: string,
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin can update packages');
    }

    const pkg = await this.prisma.packageMaster.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');

    const updated = await this.prisma.packageMaster.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : pkg.name,
        validityDays: dto.validityDays !== undefined ? Number(dto.validityDays) : pkg.validityDays,
        contactReveals: dto.contactReveals !== undefined ? Number(dto.contactReveals) : pkg.contactReveals,
        ticketQuota: dto.ticketQuota !== undefined ? Number(dto.ticketQuota) : pkg.ticketQuota,
        emiEligible: dto.emiEligible !== undefined ? dto.emiEligible : pkg.emiEligible,
        cost: dto.cost !== undefined ? Number(dto.cost) : pkg.cost,
        servicesProvided: dto.servicesProvided !== undefined ? dto.servicesProvided.trim() : pkg.servicesProvided,
        featuredProfileEligible: dto.featuredProfileEligible !== undefined ? dto.featuredProfileEligible : pkg.featuredProfileEligible,
        isActive: dto.isActive !== undefined ? dto.isActive : pkg.isActive,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PERMISSION_OVERRIDE,
      resourceType: 'PackageMaster',
      resourceId: id,
      metadata: { action: 'PACKAGE_UPDATE', changes: dto },
      ipAddress,
    });

    return updated;
  }

  async deleteOrDeactivatePackage(actor: any, id: string, ipAddress?: string) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin can deactivate packages');
    }

    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id },
      include: {
        _count: { select: { memberProfiles: true, invoices: true } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    if (pkg._count.memberProfiles > 0 || pkg._count.invoices > 0) {
      // Soft deactivate
      const deactivated = await this.prisma.packageMaster.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        message: `Package has ${pkg._count.memberProfiles} active profiles and invoices; safely deactivated.`,
        package: deactivated,
      };
    }

    await this.prisma.packageMaster.delete({ where: { id } });
    return { message: 'Package deleted successfully' };
  }
}
