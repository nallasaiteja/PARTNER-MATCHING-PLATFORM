import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordExternalRevenueDto } from './dto/finance.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class LedgersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 6.7 Query Financial Ledgers (HQ, Franchise, Agent)
   */
  async getLedgerEntries(
    user: any,
    query: {
      ledgerType?: 'HQ' | 'FRANCHISE' | 'AGENT';
      ownerOrgId?: string;
      agentUserId?: string;
      category?: string;
      entryType?: 'CREDIT' | 'DEBIT';
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

    // Role-based scoping
    if (!isHQ) {
      if (isFranchiseManager) {
        // Franchise Manager can view only their own franchise ledger
        where.ledgerType = 'FRANCHISE';
        where.ownerOrgId = user.organizationId;
      } else {
        // Individual Agent / Staff can view only their own Agent ledger
        where.ledgerType = 'AGENT';
        where.agentUserId = user.id;
      }
    } else {
      // HQ Admin can view any ledger requested
      if (query.ledgerType) {
        where.ledgerType = query.ledgerType;
      }
      if (query.ownerOrgId) {
        where.ownerOrgId = query.ownerOrgId;
      }
      if (query.agentUserId) {
        where.agentUserId = query.agentUserId;
      }
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.entryType) {
      where.entryType = query.entryType;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, entries] = await Promise.all([
      this.prisma.financialLedgerEntry.count({ where }),
      this.prisma.financialLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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

    // Financial balance summary aggregates
    const creditsAgg = await this.prisma.financialLedgerEntry.aggregate({
      where: { ...where, entryType: 'CREDIT' },
      _sum: { amount: true },
    });

    const debitsAgg = await this.prisma.financialLedgerEntry.aggregate({
      where: { ...where, entryType: 'DEBIT' },
      _sum: { amount: true },
    });

    const totalCredits = creditsAgg._sum.amount || 0;
    const totalDebits = debitsAgg._sum.amount || 0;
    const netBalance = totalCredits - totalDebits;

    return {
      entries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalCredits,
        totalDebits,
        netBalance,
      },
    };
  }

  /**
   * 6.7 Additional Revenue Tracking for HQ Ledger (Advertisements & Wedding Services)
   * Only Super Admin and Admin can record external revenue into HQ ledger.
   */
  async recordExternalRevenue(user: any, dto: RecordExternalRevenueDto, ipAddress?: string) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only HQ Administrators can record external revenue in the HQ ledger.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const entry = await this.prisma.financialLedgerEntry.create({
      data: {
        ledgerType: 'HQ',
        ownerOrgId: 'org-hq',
        category: dto.category,
        entryType: 'CREDIT',
        amount: dto.amount,
        description: dto.description,
        referenceNumber: dto.referenceNumber || null,
        actorId: user.id,
        actorRole: user.role,
        metadata: dto.sourceEntityId ? { sourceEntityId: dto.sourceEntityId } : undefined,
      },
    });

    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'EXTERNAL_REVENUE_RECORDED',
        resourceType: 'FinancialLedgerEntry',
        resourceId: entry.id,
        newValues: {
          category: dto.category,
          amount: dto.amount,
          description: dto.description,
          referenceNumber: dto.referenceNumber,
        },
        reason: 'Recorded additional revenue in HQ ledger',
        ipAddress,
      },
    });

    return {
      message: 'Revenue line item recorded in HQ ledger successfully',
      entry,
    };
  }
}
