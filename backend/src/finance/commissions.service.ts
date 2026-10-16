import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetCommissionConfigDto } from './dto/finance.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List Commission Configurations
   */
  async listConfigurations(user: any) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;

    const where: any = {};
    if (!isHQ) {
      if (isFranchiseManager && user.organizationId) {
        where.orgId = user.organizationId;
      } else {
        where.agentUserId = user.id;
      }
    }

    const configs = await this.prisma.commissionConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        configuredBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
      },
    });

    return configs;
  }

  /**
   * 6.7 Set Commission Configuration
   * Super Admin configures for Branch Agents; Franchise Manager for Franchise Agents.
   */
  async setCommissionConfig(user: any, dto: SetCommissionConfigDto, ipAddress?: string) {
    const isSuperAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;

    if (!isSuperAdmin && !isFranchiseManager) {
      throw new ForbiddenException('Only Super Admin or Franchise Manager can configure commission rules');
    }

    // Franchise Manager can configure only for their own franchise
    if (isFranchiseManager && !isSuperAdmin) {
      if (dto.scope === 'GLOBAL_BRANCH') {
        throw new ForbiddenException('Franchise Managers cannot configure global branch commission rates');
      }
      dto.orgId = user.organizationId;
    }

    if (dto.rateValue < 0) {
      throw new BadRequestException('Commission rate cannot be negative');
    }
    if (dto.commissionType === 'PERCENTAGE' && dto.rateValue > 100) {
      throw new BadRequestException('Percentage commission cannot exceed 100%');
    }

    const config = await this.prisma.commissionConfig.create({
      data: {
        scope: dto.scope,
        orgId: dto.orgId || null,
        agentUserId: dto.agentUserId || null,
        packageId: dto.packageId || null,
        commissionType: dto.commissionType,
        rateValue: dto.rateValue,
        configuredById: user.id,
        notes: dto.notes || null,
      },
      include: {
        configuredBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
      },
    });

    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'COMMISSION_CONFIG_CREATED',
        resourceType: 'CommissionConfig',
        resourceId: config.id,
        newValues: {
          scope: dto.scope,
          commissionType: dto.commissionType,
          rateValue: dto.rateValue,
          orgId: dto.orgId,
          agentUserId: dto.agentUserId,
        },
        reason: 'Configured commission rule',
        ipAddress,
      },
    });

    return {
      message: 'Commission configuration saved successfully',
      config,
    };
  }

  /**
   * 6.7 Commission Reporting by Agent, Branch, Franchise, and Date Range
   */
  async getCommissionReport(
    user: any,
    query: {
      agentUserId?: string;
      orgId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (!isHQ) {
      if (isFranchiseManager && user.organizationId) {
        where.orgId = user.organizationId;
      } else {
        where.agentUserId = user.id;
      }
    } else {
      if (query.agentUserId) where.agentUserId = query.agentUserId;
      if (query.orgId) where.orgId = query.orgId;
    }

    if (query.status) where.status = query.status.toUpperCase();

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, transactions] = await Promise.all([
      this.prisma.commissionTransaction.count({ where }),
      this.prisma.commissionTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agentUser: { select: { id: true, employeeId: true, fullName: true, mobile: true, role: true } },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              package: { select: { name: true } },
              memberProfile: { select: { memberId: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const totalEarnedAgg = await this.prisma.commissionTransaction.aggregate({
      where,
      _sum: { commissionAmount: true },
      _count: { id: true },
    });

    return {
      transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalCommissionEarned: totalEarnedAgg._sum.commissionAmount || 0,
      },
    };
  }
}
