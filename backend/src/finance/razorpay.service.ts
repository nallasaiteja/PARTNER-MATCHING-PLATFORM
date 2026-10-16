import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } from './dto/razorpay.dto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_sampleKey123';
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'sampleRazorpaySecretKey123';
  }

  /**
   * Get public configuration for frontend checkout
   */
  getConfig() {
    return {
      keyId: this.keyId,
      currency: 'INR',
      name: 'Partner Matching Platform',
      isTestMode: this.keyId.startsWith('rzp_test'),
    };
  }

  /**
   * Create Razorpay Order & Pending MemberInvoice
   */
  async createOrder(user: any, dto: CreateRazorpayOrderDto) {
    // 1. Find Member Profile
    const member = await this.prisma.memberProfile.findUnique({
      where: { userId: user.id },
      include: { user: true, ownerOrg: true },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found for authenticated user');
    }

    // 2. Find Package from trusted DB
    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Package is not active or available');
    }

    const amountInPaise = Math.round(pkg.cost * 100);
    const receipt = `RCPT_${Date.now().toString(36).toUpperCase()}`;

    let razorpayOrderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // If real Razorpay credentials are set, call Razorpay Orders API
    if (this.keyId && !this.keyId.includes('sampleKey') && this.keySecret && !this.keySecret.includes('sampleSecret')) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            notes: {
              memberProfileId: member.id,
              memberId: member.memberId || '',
              packageId: pkg.id,
              packageName: pkg.name,
            },
          }),
        });

        if (response.ok) {
          const orderData = await response.json();
          razorpayOrderId = orderData.id;
        } else {
          this.logger.warn(`Razorpay API order creation failed, falling back to secure local test order: ${response.statusText}`);
        }
      } catch (err: any) {
        this.logger.warn(`Razorpay network call failed, falling back to secure local test order: ${err.message}`);
      }
    }

    // Generate Request Number
    const requestNumber = `REQ-RZP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Invoice in PENDING status
    const invoice = await this.prisma.memberInvoice.create({
      data: {
        requestNumber,
        memberProfileId: member.id,
        packageId: pkg.id,
        amount: pkg.cost,
        paymentMode: 'ONLINE_RAZORPAY',
        status: 'PENDING',
        transactionRef: razorpayOrderId,
        orgId: member.ownerOrgId || null,
        raisedById: user.id,
        notes: `Online checkout initiated via Razorpay for package ${pkg.name}`,
      },
    });

    return {
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.keyId,
      invoiceId: invoice.id,
      package: {
        id: pkg.id,
        name: pkg.name,
        cost: pkg.cost,
        validityDays: pkg.validityDays,
        contactReveals: pkg.contactReveals,
      },
      prefill: {
        name: `${member.firstName} ${member.lastName}`,
        contact: member.user?.mobile || '',
        email: member.user?.email || '',
      },
    };
  }

  /**
   * Cryptographically verify Razorpay Payment & activate member immediately
   */
  async verifyPayment(user: any, dto: VerifyRazorpayPaymentDto, ipAddress?: string) {
    const invoice = await this.prisma.memberInvoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        memberProfile: { include: { user: true } },
        package: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'APPROVED') {
      return {
        success: true,
        message: 'Payment already verified and package is active!',
        invoiceNumber: invoice.invoiceNumber,
        invoice,
      };
    }

    // Signature Verification: enforce HMAC-SHA256 unless in explicit mock fallback mode
    const isMock = dto.razorpay_signature === 'mock_signature' && (!this.keyId || this.keyId.includes('sampleKey'));
    if (!isMock) {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== dto.razorpay_signature) {
        throw new BadRequestException('Cryptographic payment signature mismatch: Payment verification failed.');
      }
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const approvedAt = new Date();

    // Atomic Finalization
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Finalize Invoice
      const finalizedInvoice = await tx.memberInvoice.update({
        where: { id: invoice.id },
        data: {
          invoiceNumber,
          status: 'APPROVED',
          approvedAt,
          invoiceDate: approvedAt,
          transactionRef: dto.razorpay_payment_id,
          bankName: 'Razorpay Gateway',
          notes: `${invoice.notes || ''} | Captured payment ${dto.razorpay_payment_id}`,
        },
      });

      // 2. Activate Member Package Entitlement
      const member = invoice.memberProfile;
      const validityDays = invoice.package.validityDays || 30;
      const contactReveals = invoice.package.contactReveals || 0;
      const newExpiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

      const updatedMember = await tx.memberProfile.update({
        where: { id: member.id },
        data: {
          packageType: 'PAID',
          currentPackageId: invoice.package.id,
          packageExpiresAt: newExpiresAt,
          contactsQuota: (member.contactsQuota || 0) + contactReveals,
        },
      });

      // 3. Post to HQ Central Ledger (CREDIT)
      await tx.financialLedgerEntry.create({
        data: {
          ledgerType: 'HQ',
          ownerOrgId: 'org-hq',
          invoiceId: invoice.id,
          category: 'INVOICE_SALE',
          entryType: 'CREDIT',
          amount: invoice.amount,
          description: `Direct online Razorpay payment for ${invoice.package.name}`,
          referenceNumber: dto.razorpay_payment_id,
          actorId: user.id,
          actorRole: user.role,
        },
      });

      // 4. Financial Audit Log
      await tx.financialAuditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: 'ONLINE_PAYMENT_CAPTURED',
          resourceType: 'MemberInvoice',
          resourceId: invoice.id,
          previousValues: { status: 'PENDING' },
          newValues: {
            status: 'APPROVED',
            invoiceNumber,
            paymentId: dto.razorpay_payment_id,
            orderId: dto.razorpay_order_id,
          },
          reason: 'Online payment captured and verified via Razorpay',
          ipAddress,
        },
      });

      return { finalizedInvoice, updatedMember };
    });

    this.logger.log(`🎉 Instant activation successful! Member ${invoice.memberProfile.memberId} upgraded to ${invoice.package.name} via Razorpay (Payment #${dto.razorpay_payment_id})`);

    return {
      success: true,
      message: `Payment successful! Your ${invoice.package.name} plan has been instantly activated.`,
      invoiceNumber,
      invoice: result.finalizedInvoice,
      member: result.updatedMember,
    };
  }
}
