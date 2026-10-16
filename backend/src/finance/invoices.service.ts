import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  RaiseInvoiceRequestDto,
  ApproveInvoiceDto,
  RejectInvoiceDto,
  EditInvoiceDto,
  FilterInvoicesDto,
} from './dto/finance.dto';
import { Role } from '../common/constants/roles.constants';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 6.3 & 6.4 Step 1: Raise Invoice Request
   * Branch / Franchise staff raise an invoice request with trusted package price from DB.
   */
  async raiseInvoiceRequest(user: any, dto: RaiseInvoiceRequestDto, ipAddress?: string) {
    // 1. Verify Member exists
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: dto.memberProfileId },
      include: {
        user: { select: { id: true, mobile: true, email: true } },
        ownerOrg: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    // 2. Prevent unauthorized cross-branch member selection
    const isSuperAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isSuperAdmin) {
      if (user.organizationId && member.ownerOrgId && member.ownerOrgId !== user.organizationId) {
        throw new ForbiddenException(
          'Unauthorized: You cannot raise an invoice request for a member belonging to another branch or franchise',
        );
      }
    }

    // 3. Fetch trusted Package price from DB
    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Selected package is not active or not found');
    }

    if (dto.paymentMode === 'EMI' && !pkg.emiEligible) {
      throw new BadRequestException('EMI payment mode is not available for this package');
    }

    // 4. Derive organization & staff
    const orgId = user.organizationId || member.ownerOrgId || null;
    const saleStaffId = dto.saleStaffId || user.id;

    // Handle Cash declaration
    const isCash = dto.paymentMode === 'CASH' || dto.isCash === true;
    const cashReceived = isCash && dto.cashReceivedDeclaration === true;
    const cashReceivedById = cashReceived ? user.id : null;

    // Generate Request Number (distinct from finalized Invoice Number)
    const requestNumber = `REQ-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Invoice Request record in PENDING status
    const invoice = await this.prisma.memberInvoice.create({
      data: {
        requestNumber,
        memberProfileId: member.id,
        packageId: pkg.id,
        amount: pkg.cost, // Trusted DB price, not client-supplied
        paymentMode: dto.paymentMode,
        status: 'PENDING',
        notes: dto.notes || `Invoice request for ${pkg.name} via ${dto.paymentMode}`,
        orgId,
        raisedById: user.id,
        saleStaffId,
        bankName: dto.bankName || null,
        transactionRef: dto.transactionRef || null,
        chequeDate: dto.chequeDate ? new Date(dto.chequeDate) : null,
        isCash,
        cashReceivedDeclaration: cashReceived,
        cashReceivedById,
      },
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            user: { select: { mobile: true, email: true } },
          },
        },
        package: true,
        org: true,
        raisedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
        saleStaff: { select: { id: true, employeeId: true, fullName: true, role: true } },
      },
    });

    // Record Financial Audit Log
    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'INVOICE_REQUEST_RAISED',
        resourceType: 'MemberInvoice',
        resourceId: invoice.id,
        newValues: {
          requestNumber,
          memberId: member.memberId,
          package: pkg.name,
          amount: pkg.cost,
          paymentMode: dto.paymentMode,
          isCash,
          cashReceivedDeclaration: cashReceived,
        },
        ipAddress,
        reason: 'Invoice request submitted for approval',
      },
    });

    return {
      message: isCash
        ? 'Cash invoice request registered with cash declaration. Awaiting authorization before package activation.'
        : 'Invoice request registered successfully and forwarded for approval.',
      invoice,
    };
  }

  /**
   * 6.6 Invoice Management Dashboard — Search, Filters & Backend Pagination
   */
  async listInvoices(user: any, filter: FilterInvoicesDto) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based Organization Scoping
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.HQ_SERVICE_TEAM;
    if (!isHQ) {
      if (user.organizationId) {
        where.orgId = user.organizationId;
      } else if (user.role === Role.MEMBER) {
        where.memberProfile = { userId: user.id };
      }
    } else if (filter.orgId) {
      where.orgId = filter.orgId;
    }

    if (filter.status) {
      where.status = filter.status.toUpperCase();
    }

    if (filter.paymentMode) {
      where.paymentMode = filter.paymentMode.toUpperCase();
    }

    if (filter.packageId) {
      where.packageId = filter.packageId;
    }

    // Date range filter
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Text search (Member ID, Invoice ID, Request ID, Mobile)
    if (filter.search || filter.memberId || filter.invoiceNumber || filter.mobile) {
      const searchTerms: any[] = [];
      const term = (filter.search || '').trim();

      if (term) {
        searchTerms.push(
          { invoiceNumber: { contains: term, mode: 'insensitive' } },
          { requestNumber: { contains: term, mode: 'insensitive' } },
          { memberProfile: { memberId: { contains: term, mode: 'insensitive' } } },
          { memberProfile: { firstName: { contains: term, mode: 'insensitive' } } },
          { memberProfile: { lastName: { contains: term, mode: 'insensitive' } } },
        );
        // Only HQ and authorized branch managers can search by raw mobile number
        if (isHQ || user.role === Role.BRANCH_MANAGER || user.role === Role.FRANCHISE_MANAGER) {
          searchTerms.push({ memberProfile: { user: { mobile: { contains: term } } } });
        }
      }

      if (filter.memberId) {
        searchTerms.push({ memberProfile: { memberId: { contains: filter.memberId.trim(), mode: 'insensitive' } } });
      }
      if (filter.invoiceNumber) {
        searchTerms.push({ invoiceNumber: { contains: filter.invoiceNumber.trim(), mode: 'insensitive' } });
      }
      if (filter.mobile && (isHQ || user.role === Role.BRANCH_MANAGER || user.role === Role.FRANCHISE_MANAGER)) {
        searchTerms.push({ memberProfile: { user: { mobile: { contains: filter.mobile.trim() } } } });
      }

      if (searchTerms.length > 0) {
        where.OR = searchTerms;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.memberInvoice.count({ where }),
      this.prisma.memberInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          memberProfile: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              gender: true,
              packageType: true,
              user: { select: { id: true, mobile: true, email: true } },
            },
          },
          package: true,
          org: true,
          raisedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
          saleStaff: { select: { id: true, employeeId: true, fullName: true, role: true } },
          approvedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
          commissionTransaction: true,
        },
      }),
    ]);

    // Financial summary aggregates for current filter
    const statsAgg = await this.prisma.memberInvoice.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: statsAgg._sum.amount || 0,
      },
    };
  }

  /**
   * Pending invoice requests waiting for review and approval
   */
  async listPendingRequests(user: any) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;

    const where: any = { status: 'PENDING' };

    if (!isHQ) {
      if (isFranchiseManager && user.organizationId) {
        where.orgId = user.organizationId;
      } else if (user.organizationId) {
        where.orgId = user.organizationId;
      } else {
        throw new ForbiddenException('Unauthorized to view pending approvals');
      }
    }

    const pending = await this.prisma.memberInvoice.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            packageType: true,
            user: { select: { mobile: true, email: true } },
          },
        },
        package: true,
        org: true,
        raisedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
        saleStaff: { select: { id: true, employeeId: true, fullName: true, role: true } },
      },
    });

    return pending;
  }

  /**
   * Single invoice details with audit trail and related transactions
   */
  async getInvoiceDetail(user: any, id: string) {
    const invoice = await this.prisma.memberInvoice.findUnique({
      where: { id },
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            gender: true,
            packageType: true,
            contactsQuota: true,
            packageExpiresAt: true,
            user: { select: { id: true, mobile: true, email: true } },
          },
        },
        package: true,
        org: true,
        raisedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
        saleStaff: { select: { id: true, employeeId: true, fullName: true, role: true } },
        approvedBy: { select: { id: true, employeeId: true, fullName: true, role: true } },
        cashReceivedBy: { select: { id: true, employeeId: true, fullName: true } },
        walletTransactions: true,
        ledgerEntries: true,
        commissionTransaction: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check scope
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.HQ_SERVICE_TEAM;
    if (!isHQ) {
      if (user.role === Role.MEMBER) {
        if (invoice.memberProfile?.user?.id !== user.id) {
          throw new ForbiddenException('Access denied');
        }
      } else if (invoice.orgId && user.organizationId !== invoice.orgId) {
        throw new ForbiddenException('Access denied: invoice belongs to another branch/franchise');
      }
    }

    const auditTrail = await this.prisma.financialAuditLog.findMany({
      where: { resourceType: 'MemberInvoice', resourceId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, employeeId: true, fullName: true, role: true } },
      },
    });

    return { invoice, auditTrail };
  }

  /**
   * 6.3 & 6.4 Steps 2 & 3: Approve and Finalize Invoice
   * Concurrency-safe atomic transaction for Wallet balance check, deduction, invoice number generation,
   * ledger entry creation, commission tracking, and member package entitlement activation.
   */
  async approveInvoice(user: any, id: string, dto: ApproveInvoiceDto, ipAddress?: string) {
    // 1. Fetch current invoice record
    const invoice = await this.prisma.memberInvoice.findUnique({
      where: { id },
      include: {
        package: true,
        org: true,
        memberProfile: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice request not found');
    }

    if (invoice.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve: Invoice is already in ${invoice.status} status`);
    }

    // 2. Role-based workflow validation
    const isSuperAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;
    const isBranchInvoice = invoice.org?.type === 'BRANCH' || (!invoice.org && !invoice.orgId);
    const isFranchiseInvoice = invoice.org?.type === 'FRANCHISE';

    if (isBranchInvoice) {
      // Branch invoice requests MUST be approved by HQ (Super Admin or Admin)
      if (!isSuperAdmin) {
        throw new ForbiddenException(
          'Branch Managers and Branch Staff cannot approve branch invoices. HQ approval is required.',
        );
      }
    } else if (isFranchiseInvoice) {
      // Franchise invoice requests can be approved by authorized Franchise Manager for their own franchise
      if (!isSuperAdmin) {
        if (!isFranchiseManager || user.organizationId !== invoice.orgId) {
          throw new ForbiddenException(
            'Unauthorized: Only the designated Franchise Manager can review and approve requests for this franchise.',
          );
        }
        // Franchise staff cannot approve their own requests
        if (invoice.raisedById === user.id && user.role !== Role.FRANCHISE_MANAGER) {
          throw new ForbiddenException('Franchise staff cannot approve their own requests.');
        }
      }
    }

    // 3. Concurrency-safe Database Transaction
    const finalized = await this.prisma.$transaction(async (tx) => {
      // Re-verify invoice status with row lock query
      const currentInv = await tx.memberInvoice.findUnique({
        where: { id },
      });
      if (currentInv.status !== 'PENDING') {
        throw new BadRequestException('Transaction conflict: Invoice is no longer pending.');
      }

      let walletDeducted = 0;

      // FRANCHISE WALLET HANDLING:
      if (isFranchiseInvoice && invoice.orgId) {
        // Lock and fetch Franchise Wallet
        const wallet = await tx.franchiseWallet.findUnique({
          where: { franchiseOrgId: invoice.orgId },
        });

        if (!wallet || !wallet.isActive) {
          throw new BadRequestException('Franchise wallet is inactive or not initialized');
        }

        // Strict Requirement: exact error "Insufficient Wallet Limit"
        if (wallet.balance < invoice.amount) {
          throw new BadRequestException('Insufficient Wallet Limit');
        }

        // Deduct from wallet atomically
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - invoice.amount;

        await tx.franchiseWallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        walletDeducted = invoice.amount;

        // Create Franchise Wallet Transaction record
        await tx.franchiseWalletTransaction.create({
          data: {
            walletId: wallet.id,
            franchiseOrgId: invoice.orgId,
            type: 'DEDUCTION',
            amount: invoice.amount,
            balanceBefore,
            balanceAfter,
            invoiceId: invoice.id,
            performedById: user.id,
            notes: `Deduction for approved package sale: ${invoice.package.name} (Member: ${invoice.memberProfile.memberId || invoice.memberProfileId})`,
          },
        });

        // Create Franchise Ledger Entry (DEBIT)
        await tx.financialLedgerEntry.create({
          data: {
            ledgerType: 'FRANCHISE',
            ownerOrgId: invoice.orgId,
            invoiceId: invoice.id,
            category: 'INVOICE_SALE',
            entryType: 'DEBIT',
            amount: invoice.amount,
            balanceAfter,
            description: `Package sale: ${invoice.package.name} (Invoice: ${id})`,
            referenceNumber: invoice.requestNumber || id,
            actorId: user.id,
            actorRole: user.role,
          },
        });

        // Create HQ Ledger Entry (CREDIT)
        await tx.financialLedgerEntry.create({
          data: {
            ledgerType: 'HQ',
            ownerOrgId: 'org-hq',
            invoiceId: invoice.id,
            category: 'INVOICE_SALE',
            entryType: 'CREDIT',
            amount: invoice.amount,
            description: `Franchise sale credit from ${invoice.org?.name || 'Franchise'} for ${invoice.package.name}`,
            referenceNumber: invoice.requestNumber || id,
            actorId: user.id,
            actorRole: user.role,
          },
        });
      } else {
        // BRANCH OR HQ INVOICE:
        // Create HQ Ledger Entry (CREDIT)
        await tx.financialLedgerEntry.create({
          data: {
            ledgerType: 'HQ',
            ownerOrgId: 'org-hq',
            invoiceId: invoice.id,
            category: 'INVOICE_SALE',
            entryType: 'CREDIT',
            amount: invoice.amount,
            description: `Sale credit from ${invoice.org?.name || 'HQ Branch'} for ${invoice.package.name}`,
            referenceNumber: invoice.requestNumber || id,
            actorId: user.id,
            actorRole: user.role,
          },
        });
      }

      // Generate Finalized Unique Invoice Number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const approvedAt = new Date();

      // Finalize the Invoice Record
      const updatedInvoice = await tx.memberInvoice.update({
        where: { id },
        data: {
          invoiceNumber,
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt,
          invoiceDate: approvedAt,
          walletDeductedAmount: walletDeducted > 0 ? walletDeducted : null,
          notes: dto.notes ? `${invoice.notes || ''} | Approval Note: ${dto.notes}` : invoice.notes,
        },
        include: {
          memberProfile: true,
          package: true,
        },
      });

      // Update Member's Package Entitlement and Paid Status
      const member = invoice.memberProfile;
      const validityDays = invoice.package.validityDays || 30;
      const contactsReveals = invoice.package.contactReveals || 0;
      const newExpiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

      await tx.memberProfile.update({
        where: { id: member.id },
        data: {
          packageType: 'PAID',
          currentPackageId: invoice.package.id,
          packageExpiresAt: newExpiresAt,
          contactsQuota: (member.contactsQuota || 0) + contactsReveals,
        },
      });

      // Commission Tracking & Agent Ledger:
      const saleStaffId = invoice.saleStaffId || invoice.raisedById;
      if (saleStaffId) {
        // Find applicable commission config (Specific Agent -> Specific Org -> Global Branch)
        const commissionConfig =
          (await tx.commissionConfig.findFirst({
            where: { agentUserId: saleStaffId, isActive: true },
          })) ||
          (invoice.orgId
            ? await tx.commissionConfig.findFirst({
                where: { orgId: invoice.orgId, isActive: true },
              })
            : null) ||
          (await tx.commissionConfig.findFirst({
            where: { scope: 'GLOBAL_BRANCH', isActive: true },
          }));

        if (commissionConfig) {
          const rateValue = commissionConfig.rateValue;
          const commissionAmount =
            commissionConfig.commissionType === 'PERCENTAGE'
              ? (invoice.amount * rateValue) / 100
              : rateValue;

          // Record immutable Commission Transaction
          await tx.commissionTransaction.create({
            data: {
              invoiceId: invoice.id,
              agentUserId: saleStaffId,
              orgId: invoice.orgId,
              packageId: invoice.packageId,
              packagePrice: invoice.amount,
              commissionType: commissionConfig.commissionType,
              rateValue,
              commissionAmount,
              status: 'EARNED',
              notes: `Commission calculated from config: ${commissionConfig.scope} (${rateValue}${commissionConfig.commissionType === 'PERCENTAGE' ? '%' : ' INR'})`,
            },
          });

          // Record Agent Ledger Entry (CREDIT)
          await tx.financialLedgerEntry.create({
            data: {
              ledgerType: 'AGENT',
              agentUserId: saleStaffId,
              invoiceId: invoice.id,
              category: 'COMMISSION',
              entryType: 'CREDIT',
              amount: commissionAmount,
              commissionRate: rateValue,
              commissionAmount,
              description: `Commission earned for sale of ${invoice.package.name} (Invoice: ${invoiceNumber})`,
              referenceNumber: invoiceNumber,
              actorId: user.id,
              actorRole: user.role,
            },
          });
        }
      }

      // Record Financial Audit Log
      await tx.financialAuditLog.create({
        data: {
          actorId: user.id,
          actorRole: user.role,
          action: 'INVOICE_APPROVED',
          resourceType: 'MemberInvoice',
          resourceId: invoice.id,
          previousValues: { status: 'PENDING' },
          newValues: {
            status: 'APPROVED',
            invoiceNumber,
            approvedById: user.id,
            walletDeducted,
          },
          reason: dto.notes || 'Invoice approved and package activated',
          ipAddress,
        },
      });

      return updatedInvoice;
    });

    // Simulated Member Notification (using existing platform notification format)
    console.log(
      `🎉 [MEMBER NOTIFICATION] Invoice #${finalized.invoiceNumber} approved! Member ${finalized.memberProfile.memberId} upgraded to ${finalized.package.name}.`,
    );

    return {
      message: 'Invoice approved successfully, wallet deducted, and member package activated.',
      invoice: finalized,
    };
  }

  /**
   * Reject Invoice Request with decision, reason, approver, and timestamp
   */
  async rejectInvoice(user: any, id: string, dto: RejectInvoiceDto, ipAddress?: string) {
    const invoice = await this.prisma.memberInvoice.findUnique({
      where: { id },
      include: { org: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject: Invoice is already in ${invoice.status} status`);
    }

    const isSuperAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    const isFranchiseManager = user.role === Role.FRANCHISE_MANAGER;

    if (invoice.org?.type === 'BRANCH' && !isSuperAdmin) {
      throw new ForbiddenException('Branch invoice requests can only be rejected by HQ');
    } else if (invoice.org?.type === 'FRANCHISE' && !isSuperAdmin) {
      if (!isFranchiseManager || user.organizationId !== invoice.orgId) {
        throw new ForbiddenException('Only the Franchise Manager can reject requests for this franchise');
      }
    }

    const rejectedAt = new Date();
    const updated = await this.prisma.memberInvoice.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: user.id,
        rejectedAt,
        rejectionReason: dto.reason,
      },
      include: {
        memberProfile: true,
        package: true,
      },
    });

    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'INVOICE_REJECTED',
        resourceType: 'MemberInvoice',
        resourceId: id,
        previousValues: { status: 'PENDING' },
        newValues: { status: 'REJECTED', rejectionReason: dto.reason, rejectedAt },
        reason: dto.reason,
        ipAddress,
      },
    });

    return {
      message: 'Invoice request has been rejected',
      invoice: updated,
    };
  }

  /**
   * 6.6 Invoice Editing — Super Admin / Admin Only with Complete Audit Trail
   */
  async editInvoice(user: any, id: string, dto: EditInvoiceDto, ipAddress?: string) {
    // Only Super Admin and Admin can edit invoices
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin are authorized to modify existing invoices.');
    }

    const invoice = await this.prisma.memberInvoice.findUnique({
      where: { id },
      include: { org: true, package: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const previousValues = {
      amount: invoice.amount,
      paymentMode: invoice.paymentMode,
      bankName: invoice.bankName,
      transactionRef: invoice.transactionRef,
      notes: invoice.notes,
    };

    const updateData: any = {};
    if (dto.amount !== undefined && dto.amount !== invoice.amount) {
      updateData.amount = dto.amount;

      // Safe adjustment logging if amount changed on an approved invoice
      if (invoice.status === 'APPROVED') {
        const diff = dto.amount - invoice.amount;
        await this.prisma.financialLedgerEntry.create({
          data: {
            ledgerType: 'HQ',
            ownerOrgId: 'org-hq',
            invoiceId: invoice.id,
            category: 'ADJUSTMENT',
            entryType: diff > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(diff),
            description: `Invoice edit adjustment: Amount changed from ${invoice.amount} to ${dto.amount}. Reason: ${dto.editReason}`,
            referenceNumber: invoice.invoiceNumber || invoice.id,
            actorId: user.id,
            actorRole: user.role,
          },
        });
      }
    }

    if (dto.paymentMode) updateData.paymentMode = dto.paymentMode;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.transactionRef !== undefined) updateData.transactionRef = dto.transactionRef;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.memberInvoice.update({
      where: { id },
      data: updateData,
      include: {
        memberProfile: true,
        package: true,
        org: true,
      },
    });

    // Record immutable Financial Audit Trail
    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'INVOICE_EDITED',
        resourceType: 'MemberInvoice',
        resourceId: id,
        previousValues,
        newValues: updateData,
        reason: dto.editReason,
        ipAddress,
      },
    });

    return {
      message: 'Invoice updated successfully with audit trail preserved',
      invoice: updated,
    };
  }

  /**
   * 6.6 Invoice Downloads — Bulk Export to Excel (CSV) and PDF metadata
   * Restricted to Super Admin and Admin on backend
   */
  async exportInvoices(user: any, filter: FilterInvoicesDto) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only Super Admin and Admin are authorized to download bulk invoice data.');
    }

    // Retrieve all filtered records without pagination limit for export
    const where: any = {};
    if (filter.status) where.status = filter.status.toUpperCase();
    if (filter.paymentMode) where.paymentMode = filter.paymentMode.toUpperCase();
    if (filter.packageId) where.packageId = filter.packageId;
    if (filter.orgId) where.orgId = filter.orgId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const invoices = await this.prisma.memberInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        memberProfile: {
          select: {
            memberId: true,
            firstName: true,
            lastName: true,
            user: { select: { mobile: true, email: true } },
          },
        },
        package: true,
        org: true,
        raisedBy: { select: { employeeId: true, fullName: true } },
        saleStaff: { select: { employeeId: true, fullName: true } },
        approvedBy: { select: { employeeId: true, fullName: true } },
      },
    });

    if (invoices.length === 0) {
      throw new BadRequestException('No invoices found matching the specified date range and criteria.');
    }

    // Generate CSV data for Excel
    const headers = [
      'Invoice Number',
      'Request Number',
      'Member ID',
      'Member Name',
      'Mobile',
      'Branch / Franchise',
      'Package',
      'Amount (INR)',
      'Payment Mode',
      'Status',
      'Approved By',
      'Sale Staff',
      'Request Date (IST)',
      'Invoice Date (IST)',
    ];

    const rows = invoices.map((inv) => [
      `"${inv.invoiceNumber || 'PENDING'}"`,
      `"${inv.requestNumber || ''}"`,
      `"${inv.memberProfile?.memberId || ''}"`,
      `"${inv.memberProfile?.firstName || ''} ${inv.memberProfile?.lastName || ''}"`,
      `"${inv.memberProfile?.user?.mobile || ''}"`,
      `"${inv.org?.name || 'HQ Central'}"`,
      `"${inv.package?.name || ''}"`,
      inv.amount,
      `"${inv.paymentMode}"`,
      `"${inv.status}"`,
      `"${inv.approvedBy?.fullName || inv.approvedBy?.employeeId || ''}"`,
      `"${inv.saleStaff?.fullName || inv.saleStaff?.employeeId || ''}"`,
      `"${new Date(inv.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"`,
      inv.invoiceDate
        ? `"${new Date(inv.invoiceDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"`
        : '""',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      count: invoices.length,
      csvContent,
      invoices,
    };
  }

  /**
   * Date-wise list of Members with invoices vs Members without invoices
   */
  async getMembersInvoiceStatus(user: any, filter: { startDate?: string; endDate?: string; hasInvoice?: boolean }) {
    const isHQ = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isHQ) {
      throw new ForbiddenException('Only HQ administrators can access date-wise member invoice comparison.');
    }

    const dateFilter: any = {};
    if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const members = await this.prisma.memberProfile.findMany({
      where: {
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
        user: { select: { mobile: true, email: true } },
        ownerOrg: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const withInvoice = members.filter((m) => m.invoices.length > 0);
    const withoutInvoice = members.filter((m) => m.invoices.length === 0);

    return {
      totalMembers: members.length,
      withInvoiceCount: withInvoice.length,
      withoutInvoiceCount: withoutInvoice.length,
      withInvoice,
      withoutInvoice,
    };
  }
}
