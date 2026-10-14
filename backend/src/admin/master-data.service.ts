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
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 5.6 List Master Data Options by Category
   */
  async listOptions(category?: string) {
    const where: any = { isActive: true };
    if (category) {
      where.category = category.toUpperCase();
    }

    return this.prisma.masterData.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  /**
   * Super Admin Adds Option
   */
  async createOption(
    actor: any,
    dto: {
      category: string;
      code: string;
      label: string;
      parentCode?: string;
      sortOrder?: number;
      metadata?: any;
    },
    ipAddress?: string,
  ) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can modify global Master Data');
    }

    const category = dto.category.toUpperCase();
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await this.prisma.masterData.findUnique({
      where: {
        category_code: {
          category,
          code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Master data code '${code}' already exists in category '${category}'`);
    }

    const created = await this.prisma.masterData.create({
      data: {
        category,
        code,
        label: dto.label.trim(),
        parentCode: dto.parentCode,
        sortOrder: dto.sortOrder || 0,
        metadata: dto.metadata || null,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PERMISSION_OVERRIDE,
      resourceType: 'MasterData',
      resourceId: created.id,
      metadata: { category, code, label: dto.label },
      ipAddress,
    });

    return created;
  }

  /**
   * Super Admin Edits Option
   */
  async updateOption(
    actor: any,
    id: string,
    dto: {
      label?: string;
      sortOrder?: number;
      isActive?: boolean;
      metadata?: any;
    },
    ipAddress?: string,
  ) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can modify global Master Data');
    }

    const item = await this.prisma.masterData.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Master data option not found');

    const updated = await this.prisma.masterData.update({
      where: { id },
      data: {
        label: dto.label !== undefined ? dto.label.trim() : item.label,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : item.sortOrder,
        isActive: dto.isActive !== undefined ? dto.isActive : item.isActive,
        metadata: dto.metadata !== undefined ? dto.metadata : item.metadata,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PERMISSION_OVERRIDE,
      resourceType: 'MasterData',
      resourceId: id,
      metadata: { action: 'UPDATE', changes: dto },
      ipAddress,
    });

    return updated;
  }

  /**
   * Super Admin Deletes Option.
   * Enforces safety: prevents deletion if any profile depends on this option;
   * suggests soft deactivation instead.
   */
  async deleteOption(actor: any, id: string, ipAddress?: string) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can delete global Master Data');
    }

    const item = await this.prisma.masterData.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Master data option not found');

    // Dependency check in MemberProfiles
    const dependentCount = await this.prisma.memberProfile.count({
      where: {
        OR: [
          {
            profileData: {
              path: [item.category.toLowerCase()],
              string_contains: item.label,
            },
          },
          {
            profileData: {
              path: [item.category.toLowerCase()],
              string_contains: item.code,
            },
          },
        ],
      },
    });

    if (dependentCount > 0) {
      throw new BadRequestException(
        `Cannot permanently delete '${item.label}': ${dependentCount} member profiles currently depend on this option. Please deactivate it instead.`,
      );
    }

    await this.prisma.masterData.delete({ where: { id } });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.PERMISSION_OVERRIDE,
      resourceType: 'MasterData',
      resourceId: id,
      metadata: { action: 'DELETE', item },
      ipAddress,
    });

    return { message: `Master data option '${item.label}' deleted successfully` };
  }

  /**
   * Terms & Conditions management
   */
  async getTermsAndConditions() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'TERMS_AND_CONDITIONS' },
    });
    return (
      setting?.value || {
        version: '1.0',
        content: 'Standard terms and privacy policies for Telugu Partner Matching Platform.',
        lastUpdated: new Date().toISOString(),
      }
    );
  }

  async updateTermsAndConditions(actor: any, content: string, ipAddress?: string) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can edit Terms & Conditions');
    }

    const updated = await this.prisma.platformSetting.upsert({
      where: { key: 'TERMS_AND_CONDITIONS' },
      update: {
        value: {
          version: '1.1',
          content: content.trim(),
          lastUpdated: new Date().toISOString(),
          updatedBy: actor.id,
        },
        updatedById: actor.id,
      },
      create: {
        key: 'TERMS_AND_CONDITIONS',
        value: {
          version: '1.0',
          content: content.trim(),
          lastUpdated: new Date().toISOString(),
          updatedBy: actor.id,
        },
        updatedById: actor.id,
      },
    });

    return updated.value;
  }
}
