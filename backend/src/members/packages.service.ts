import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { UpgradePackageDto } from './dto/member-actions.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listActivePackages() {
    return this.prisma.packageMaster.findMany({
      where: { isActive: true },
      orderBy: { cost: 'asc' },
    });
  }

  async getPaymentDetails() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'PAYMENT_BANK_DETAILS' },
    });

    if (setting?.value) {
      return setting.value;
    }

    return {
      accountHolder: 'Partner Matching Platform Pvt Ltd',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank, Banjara Hills Branch',
      upiId: 'partnermatch@hdfcbank',
      upiQrUrl: '/assets/upi-qr-sample.png',
    };
  }

  async upgradePackage(memberProfileId: string, actor: any, dto: UpgradePackageDto, ipAddress?: string) {
    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Selected package is not available');
    }

    if (dto.paymentMode === 'EMI' && !pkg.emiEligible) {
      throw new BadRequestException('EMI is not available for this package');
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = await this.prisma.memberInvoice.create({
      data: {
        invoiceNumber,
        memberProfileId,
        packageId: pkg.id,
        amount: pkg.cost,
        paymentMode: dto.paymentMode,
        status: 'PENDING',
        notes: dto.notes || `Requested upgrade to ${pkg.name} via ${dto.paymentMode}`,
      },
      include: {
        package: true,
      },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.INVOICE_RAISE,
      resourceType: 'MemberInvoice',
      resourceId: invoice.id,
      metadata: {
        invoiceNumber,
        packageId: pkg.id,
        packageName: pkg.name,
        amount: pkg.cost,
        paymentMode: dto.paymentMode,
      },
      ipAddress,
    });

    return {
      invoice,
      status: 'PENDING_APPROVAL',
      message:
        dto.paymentMode === 'CASH'
          ? 'Cash upgrade request registered. Please visit your nearest branch to complete the payment.'
          : 'Payment request initiated. Your package will be activated upon gateway confirmation or admin verification.',
    };
  }
}
