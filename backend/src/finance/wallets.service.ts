import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopupWalletDto, SetWalletLimitDto } from './dto/finance.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 6.8 Super Admin / Admin: List all franchise wallets
   */
  async listWallets(user: any) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const wallets = await this.prisma.franchiseWallet.findMany({
      include: {
        franchiseOrg: {
          select: { id: true, name: true, type: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      totalWallets: wallets.length,
      totalBalance,
      wallets,
    };
  }

  /**
   * 6.8 Franchise Manager: View own wallet and recent transactions
   */
  async getMyWallet(user: any) {
    if (user.role !== Role.FRANCHISE_MANAGER && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Franchise Managers or Admins can access franchise wallet information');
    }

    if (!user.organizationId) {
      throw new BadRequestException('User does not belong to a franchise organization');
    }

    let wallet = await this.prisma.franchiseWallet.findUnique({
      where: { franchiseOrgId: user.organizationId },
      include: {
        franchiseOrg: { select: { id: true, name: true } },
      },
    });

    // Auto-initialize if not yet created for this franchise
    if (!wallet) {
      wallet = await this.prisma.franchiseWallet.create({
        data: {
          franchiseOrgId: user.organizationId,
          balance: 0,
          creditLimit: 0,
          currency: 'INR',
          isActive: true,
        },
        include: {
          franchiseOrg: { select: { id: true, name: true } },
        },
      });
    }

    const recentTransactions = await this.prisma.franchiseWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        performedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
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
    });

    return {
      wallet,
      recentTransactions,
    };
  }

  /**
   * 6.8 Wallet details by Franchise Organization ID (Admin view)
   */
  async getWalletByOrgId(user: any, franchiseOrgId: string) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isHQ && user.organizationId !== franchiseOrgId) {
      throw new ForbiddenException('Access denied');
    }

    const wallet = await this.prisma.franchiseWallet.findUnique({
      where: { franchiseOrgId },
      include: {
        franchiseOrg: { select: { id: true, name: true, type: true, isActive: true } },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Franchise wallet not found for the specified organization');
    }

    const transactions = await this.prisma.franchiseWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
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
    });

    return { wallet, transactions };
  }

  /**
   * 6.8 Manual Wallet Top-Up by Super Admin
   * Preserves complete audit trail, records Franchise and HQ ledger entries, and updates balance.
   */
  async topupWallet(user: any, franchiseOrgId: string, dto: TopupWalletDto, ipAddress?: string) {
    // Only Super Admin can perform wallet top-ups
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Security restriction: Only Super Admin is authorized to record manual wallet top-ups.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: franchiseOrgId },
    });

    if (!org || org.type !== 'FRANCHISE') {
      throw new NotFoundException('Invalid franchise organization');
    }

    // Atomic transaction for wallet balance update, transaction record, and ledger entry
    const result = await this.prisma.$transaction(async (tx) => {
      let wallet = await tx.franchiseWallet.findUnique({
        where: { franchiseOrgId },
      });

      if (!wallet) {
        wallet = await tx.franchiseWallet.create({
          data: {
            franchiseOrgId,
            balance: 0,
            creditLimit: 0,
            currency: 'INR',
            isActive: true,
          },
        });
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + dto.amount;

      // Update wallet balance
      const updatedWallet = await tx.franchiseWallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // Record wallet transaction
      const txRecord = await tx.franchiseWalletTransaction.create({
        data: {
          walletId: wallet.id,
          franchiseOrgId,
          type: 'TOPUP',
          amount: dto.amount,
          balanceBefore,
          balanceAfter,
          referenceId: dto.referenceId || null,
          performedById: user.id,
          notes: `Manual Top-Up: ${dto.reason}${dto.notes ? ' | ' + dto.notes : ''}`,
        },
      });

      // Record in Franchise Ledger (CREDIT)
      await tx.financialLedgerEntry.create({
        data: {
          ledgerType: 'FRANCHISE',
          ownerOrgId: franchiseOrgId,
          category: 'WALLET_TOPUP',
          entryType: 'CREDIT',
          amount: dto.amount,
          balanceAfter,
          description: `Prepaid wallet top-up recorded by Super Admin: ${dto.reason}`,
          referenceNumber: dto.referenceId || txRecord.id,
          actorId: user.id,
          actorRole: user.role,
        },
      });

      // Record in HQ Ledger (CREDIT received from franchise)
      await tx.financialLedgerEntry.create({
        data: {
          ledgerType: 'HQ',
          ownerOrgId: 'org-hq',
          category: 'WALLET_TOPUP',
          entryType: 'CREDIT',
          amount: dto.amount,
          description: `Top-up payment received from Franchise ${org.name}: ${dto.reason}`,
          referenceNumber: dto.referenceId || txRecord.id,
          actorId: user.id,
          actorRole: user.role,
        },
      });

      // Record Financial Audit Log
      await tx.financialAuditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: 'WALLET_TOPUP',
          resourceType: 'FranchiseWallet',
          resourceId: wallet.id,
          previousValues: { balance: balanceBefore },
          newValues: {
            balance: balanceAfter,
            topupAmount: dto.amount,
            referenceId: dto.referenceId,
          },
          reason: dto.reason,
          ipAddress,
        },
      });

      return { updatedWallet, txRecord };
    });

    return {
      message: `Successfully topped up wallet for ${org.name} with ${dto.amount} INR`,
      wallet: result.updatedWallet,
      transaction: result.txRecord,
    };
  }

  /**
   * Set or adjust franchise credit limit
   */
  async setCreditLimit(user: any, franchiseOrgId: string, dto: SetWalletLimitDto, ipAddress?: string) {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can configure franchise wallet credit limits');
    }

    let wallet = await this.prisma.franchiseWallet.findUnique({
      where: { franchiseOrgId },
    });

    if (!wallet) {
      wallet = await this.prisma.franchiseWallet.create({
        data: {
          franchiseOrgId,
          balance: 0,
          creditLimit: dto.creditLimit,
        },
      });
    } else {
      const prevLimit = wallet.creditLimit;
      wallet = await this.prisma.franchiseWallet.update({
        where: { id: wallet.id },
        data: { creditLimit: dto.creditLimit },
      });

      await this.prisma.financialAuditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: 'WALLET_LIMIT_UPDATED',
          resourceType: 'FranchiseWallet',
          resourceId: wallet.id,
          previousValues: { creditLimit: prevLimit },
          newValues: { creditLimit: dto.creditLimit },
          reason: 'Franchise credit limit updated by Super Admin',
          ipAddress,
        },
      });
    }

    return {
      message: 'Wallet limit updated successfully',
      wallet,
    };
  }
}
