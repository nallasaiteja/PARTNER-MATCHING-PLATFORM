import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';
import {
  CreateAgentMemberProfileDto,
  UpdateAgentMemberProfileDto,
  RaiseAgentInvoiceRequestDto,
  FilterAgentProfilesDto,
  FilterAgentInvoicesDto,
} from './dto/agent.dto';
import { assertImmutableProfileFields } from '../profiles/immutable-profile.validation';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper: Assert user is Branch Agent, Franchise Agent, or Admin
   */
  private assertAgentRole(user: any) {
    const isAgent =
      user.role === Role.BRANCH_AGENT ||
      user.role === Role.FRANCHISE_AGENT;
    const isAdmin =
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.ADMIN;

    if (!isAgent && !isAdmin) {
      throw new ForbiddenException(
        `Access denied: role ${user.role} is not permitted to access the Agent Portal`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // 1. DASHBOARD & STATISTICS
  // --------------------------------------------------------------------------

  async getDashboard(user: any) {
    this.assertAgentRole(user);

    // 1. Total profiles personally created by this agent
    const totalProfiles = await this.prisma.memberProfile.count({
      where: { createdByStaffId: user.id },
    });

    // 2. Invoice Request status counts
    const [pendingInvoices, approvedInvoices, rejectedInvoices] = await Promise.all([
      this.prisma.memberInvoice.count({
        where: { raisedById: user.id, status: 'PENDING' },
      }),
      this.prisma.memberInvoice.count({
        where: { raisedById: user.id, status: 'APPROVED' },
      }),
      this.prisma.memberInvoice.count({
        where: {
          raisedById: user.id,
          status: { in: ['REJECTED', 'CANCELLED'] },
        },
      }),
    ]);

    // 3. Commission Summary
    const commissionAgg = await this.prisma.commissionTransaction.aggregate({
      where: { agentUserId: user.id },
      _sum: { commissionAmount: true },
      _count: { id: true },
    });

    // Fetch assigned commission configuration
    const activeConfig =
      (await this.prisma.commissionConfig.findFirst({
        where: { agentUserId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      })) ||
      (user.organizationId
        ? await this.prisma.commissionConfig.findFirst({
            where: { orgId: user.organizationId, isActive: true },
            orderBy: { createdAt: 'desc' },
          })
        : null) ||
      (await this.prisma.commissionConfig.findFirst({
        where: { scope: 'GLOBAL_BRANCH', isActive: true },
        orderBy: { createdAt: 'desc' },
      }));

    // Fetch user and organization details
    const userDetail = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organization: { select: { id: true, name: true, type: true } },
      },
    });

    return {
      agent: {
        id: user.id,
        fullName: userDetail?.fullName || 'Agent',
        employeeId: userDetail?.employeeId || null,
        mobile: userDetail?.mobile,
        email: userDetail?.email,
        role: user.role,
        organization: userDetail?.organization || null,
      },
      stats: {
        totalProfilesCreated: totalProfiles,
        pendingInvoices,
        approvedInvoices,
        rejectedOrCancelledInvoices: rejectedInvoices,
        totalInvoices: pendingInvoices + approvedInvoices + rejectedInvoices,
      },
      commissions: {
        totalEarned: commissionAgg._sum.commissionAmount || 0,
        totalSalesRecorded: commissionAgg._count.id || 0,
        assignedConfig: activeConfig
          ? {
              scope: activeConfig.scope,
              commissionType: activeConfig.commissionType,
              rateValue: activeConfig.rateValue,
              notes: activeConfig.notes,
            }
          : null,
        hasIndependentWallet: false,
        walletNotice:
          'Branch and Franchise Agents do not possess independent wallets. Commissions are tracked for reporting and settled offline by management.',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2. MEMBER PROFILES (OWN PROFILES ONLY)
  // --------------------------------------------------------------------------

  async listOwnProfiles(user: any, filter: FilterAgentProfilesDto) {
    this.assertAgentRole(user);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 15));
    const skip = (page - 1) * limit;

    // Strict Scope: Only profiles created by this agent!
    const where: any = {
      createdByStaffId: user.id,
    };

    if (filter.packageType) {
      where.packageType = filter.packageType.toUpperCase();
    }

    if (filter.isBlocked !== undefined && filter.isBlocked !== '') {
      where.isBlocked = filter.isBlocked === 'true';
    }

    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim();
      where.OR = [
        { memberId: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { user: { mobile: { contains: term } } },
      ];
    }

    const [total, profiles] = await Promise.all([
      this.prisma.memberProfile.count({ where }),
      this.prisma.memberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              email: true,
              mobileVerified: true,
              emailVerified: true,
            },
          },
          ownerOrg: { select: { id: true, name: true, type: true } },
          currentPackage: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: profiles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOwnProfile(user: any, profileId: string) {
    this.assertAgentRole(user);

    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            email: true,
            role: true,
            mobileVerified: true,
            emailVerified: true,
          },
        },
        ownerOrg: { select: { id: true, name: true, type: true } },
        currentPackage: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found');
    }

    // Strict Ownership Check
    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isAdmin && profile.createdByStaffId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only view member profiles you personally created',
      );
    }

    return profile;
  }

  async createMemberProfile(
    user: any,
    dto: CreateAgentMemberProfileDto,
    ipAddress?: string,
  ) {
    this.assertAgentRole(user);

    // 1. Duplicate check (mobile and email)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { mobile: dto.mobile.trim() },
          ...(dto.email ? [{ email: dto.email.trim() }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'A user or member with this mobile number or email address already exists in the system',
      );
    }

    // 2. Ownership & Organization derivation
    const isFranchiseAgent = user.role === Role.FRANCHISE_AGENT;
    const ownershipType: 'BRANCH' | 'FRANCHISE' = isFranchiseAgent
      ? 'FRANCHISE'
      : 'BRANCH';

    const branchOrgId = user.organizationId;
    if (!branchOrgId) {
      throw new BadRequestException(
        'Cannot create profile: Logged-in agent is not assigned to any branch or franchise organization',
      );
    }

    // 3. Create member user account with secure hashed password
    const tempPasswordHash = await bcrypt.hash(dto.mobile + '_agent', 12);
    const memberUser = await this.prisma.user.create({
      data: {
        mobile: dto.mobile.trim(),
        email: dto.email ? dto.email.trim() : null,
        passwordHash: tempPasswordHash,
        role: 'MEMBER',
        organizationId: branchOrgId,
        mobileVerified: false,
        emailVerified: false,
      },
    });

    // 4. Generate unique Member ID (e.g. M2026123456)
    const memberId = `M${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    // Prepare profileData step1
    const profileData = dto.profileData || {};
    if (!profileData.step1) {
      profileData.step1 = {
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        mobile: dto.mobile,
        email: dto.email,
        maritalStatus: dto.maritalStatus || 'Unmarried',
        caste: dto.caste || '',
        religion: dto.religion || 'Hindu',
      };
    }

    // 5. Create MemberProfile with explicit creator attribution
    const profile = await this.prisma.memberProfile.create({
      data: {
        memberId,
        userId: memberUser.id,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        currentStep: dto.currentStep || 1,
        completedSteps: dto.completedSteps ? (dto.completedSteps as any) : [1],
        idProofType: dto.idProofType || null,
        idProofNumber: dto.idProofNumber || null,
        timeOfBirth: dto.timeOfBirth || null,
        birthPlace: dto.birthPlace || null,
        photoUrl: dto.photoUrl || null,
        idProofFileUrl: dto.idProofFileUrl || null,
        profileData: profileData as any,
        packageType: 'FREE',
        ownershipType,
        ownerOrgId: branchOrgId,
        originatingOrgId: branchOrgId,
        createdByStaffId: user.id, // Authenticated agent's ID
        createdByType: 'STAFF',
      },
      include: {
        user: { select: { id: true, mobile: true, email: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
    });

    // 6. Audit Trail
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.PROFILE_CREATE,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      orgId: branchOrgId,
      metadata: {
        memberId: profile.memberId,
        createdByName: user.fullName || user.id,
        ownershipType,
      },
      ipAddress,
    });

    return {
      message: 'Member profile created successfully',
      profile,
    };
  }

  async updateOwnProfile(
    user: any,
    profileId: string,
    dto: UpdateAgentMemberProfileDto,
    ipAddress?: string,
  ) {
    this.assertAgentRole(user);

    const existing = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { mobile: true, email: true, mobileVerified: true, emailVerified: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Member profile not found');
    }

    // Strict Ownership Enforcement
    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isAdmin && existing.createdByStaffId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only edit member profiles you personally created',
      );
    }

    // Validate Immutable Fields (First Name, Last Name, Date of Birth, Gender once set)
    assertImmutableProfileFields(existing, existing.user, dto, dto.profileData);

    const existingProfileData = (existing.profileData as Record<string, any>) || {};
    const updatedProfileData = dto.profileData
      ? { ...existingProfileData, ...dto.profileData }
      : existingProfileData;

    const updated = await this.prisma.memberProfile.update({
      where: { id: profileId },
      data: {
        currentStep: dto.currentStep ?? existing.currentStep,
        completedSteps: dto.completedSteps ? (dto.completedSteps as any) : undefined,
        idProofType: dto.idProofType ?? existing.idProofType,
        idProofNumber: dto.idProofNumber ?? existing.idProofNumber,
        timeOfBirth: dto.timeOfBirth ?? existing.timeOfBirth,
        birthPlace: dto.birthPlace ?? existing.birthPlace,
        photoUrl: dto.photoUrl ?? existing.photoUrl,
        idProofFileUrl: dto.idProofFileUrl ?? existing.idProofFileUrl,
        profileData: updatedProfileData as any,
      },
      include: {
        user: { select: { id: true, mobile: true, email: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.PROFILE_EDIT,
      resourceType: 'MemberProfile',
      resourceId: profileId,
      orgId: existing.ownerOrgId,
      metadata: { memberId: existing.memberId },
      ipAddress,
    });

    return {
      message: 'Member profile updated successfully',
      profile: updated,
    };
  }

  async deleteProfile(user: any, profileId: string) {
    this.assertAgentRole(user);
    // Explicit Denial: Section 9 Rule
    throw new ForbiddenException(
      'Access denied: Agents cannot permanently delete member profiles. Member records are permanent.',
    );
  }

  // --------------------------------------------------------------------------
  // 3. INVOICE REQUESTS (BRANCH AGENT -> HQ, FRANCHISE AGENT -> FRANCHISE MGR)
  // --------------------------------------------------------------------------

  async raiseInvoiceRequest(
    user: any,
    dto: RaiseAgentInvoiceRequestDto,
    ipAddress?: string,
  ) {
    this.assertAgentRole(user);

    // 1. Verify Member Profile exists
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

    // Strict Ownership: Agent can only raise requests for profiles they created
    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
    if (!isAdmin && member.createdByStaffId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only raise invoice requests for member profiles you personally created',
      );
    }

    // 2. Fetch trusted Package price from Database
    const pkg = await this.prisma.packageMaster.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Selected package is not active or found');
    }

    if (dto.paymentMode === 'EMI' && !pkg.emiEligible) {
      throw new BadRequestException('EMI payment mode is not available for this package');
    }

    // 3. Workflow routing based on role:
    // - Branch Agent: request routes directly to Super Admin / Admin at HQ
    // - Franchise Agent: request routes to assigned Franchise Manager
    const isBranchAgent = user.role === Role.BRANCH_AGENT;
    const isFranchiseAgent = user.role === Role.FRANCHISE_AGENT;

    const orgId = user.organizationId || member.ownerOrgId;

    const requestNumber = `REQ-${isBranchAgent ? 'BR-AGT' : 'FR-AGT'}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const routingNote = isBranchAgent
      ? 'Branch Agent invoice request forwarded directly to Super Admin / HQ for approval.'
      : 'Franchise Agent invoice request forwarded to Franchise Manager for wallet deduction & approval.';

    const notes = dto.notes ? `${dto.notes} | ${routingNote}` : routingNote;

    const isCash = dto.paymentMode === 'CASH' || dto.isCash === true;
    const cashReceived = isCash && dto.cashReceivedDeclaration === true;

    // 4. Create invoice request with initial status PENDING
    const invoice = await this.prisma.memberInvoice.create({
      data: {
        requestNumber,
        memberProfileId: member.id,
        packageId: pkg.id,
        amount: pkg.cost, // Trusted DB price, never trusted from client
        paymentMode: dto.paymentMode,
        status: 'PENDING',
        notes,
        orgId,
        raisedById: user.id, // Strictly user.id
        saleStaffId: user.id,
        bankName: dto.bankName || null,
        transactionRef: dto.transactionRef || null,
        chequeDate: dto.chequeDate ? new Date(dto.chequeDate) : null,
        isCash,
        cashReceivedDeclaration: cashReceived,
        cashReceivedById: cashReceived ? user.id : null,
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
      },
    });

    // 5. Financial Audit Log
    await this.prisma.financialAuditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'AGENT_INVOICE_REQUEST_RAISED',
        resourceType: 'MemberInvoice',
        resourceId: invoice.id,
        newValues: {
          requestNumber,
          memberId: member.memberId,
          package: pkg.name,
          amount: pkg.cost,
          paymentMode: dto.paymentMode,
          routedTo: isBranchAgent ? 'HQ_SUPER_ADMIN' : 'FRANCHISE_MANAGER',
        },
        ipAddress,
        reason: routingNote,
      },
    });

    return {
      message: isBranchAgent
        ? 'Invoice request submitted successfully and routed directly to Super Admin at HQ for review.'
        : 'Invoice request submitted successfully and routed to Franchise Manager for wallet deduction and approval.',
      invoice,
    };
  }

  async listOwnInvoices(user: any, filter: FilterAgentInvoicesDto) {
    this.assertAgentRole(user);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = {
      raisedById: user.id,
    };

    if (filter.status) {
      where.status = filter.status.toUpperCase();
    }

    const [total, invoices] = await Promise.all([
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
              packageType: true,
              user: { select: { mobile: true, email: true } },
            },
          },
          package: true,
          org: true,
          approvedBy: { select: { fullName: true, employeeId: true } },
          commissionTransaction: true,
        },
      }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveInvoice(user: any, invoiceId: string) {
    this.assertAgentRole(user);
    // Explicit Denial: Section 9 Rule
    throw new ForbiddenException(
      'Access denied: Agents cannot approve invoice requests or directly mark members as Paid. Approval is strictly restricted to HQ Super Admin or Franchise Manager.',
    );
  }

  // --------------------------------------------------------------------------
  // 4. COMMISSION TRACKING & REPORTING
  // --------------------------------------------------------------------------

  async getCommissionView(user: any) {
    this.assertAgentRole(user);

    // 1. Fetch assigned configuration
    const assignedConfig =
      (await this.prisma.commissionConfig.findFirst({
        where: { agentUserId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      })) ||
      (user.organizationId
        ? await this.prisma.commissionConfig.findFirst({
            where: { orgId: user.organizationId, isActive: true },
            orderBy: { createdAt: 'desc' },
          })
        : null) ||
      (await this.prisma.commissionConfig.findFirst({
        where: { scope: 'GLOBAL_BRANCH', isActive: true },
        orderBy: { createdAt: 'desc' },
      }));

    // 2. Fetch all earned commission transactions for this agent
    const transactions = await this.prisma.commissionTransaction.findMany({
      where: { agentUserId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            requestNumber: true,
            amount: true,
            status: true,
            invoiceDate: true,
            memberProfile: {
              select: {
                memberId: true,
                firstName: true,
                lastName: true,
              },
            },
            package: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const totalEarned = transactions.reduce(
      (sum, tx) => (tx.status === 'EARNED' ? sum + tx.commissionAmount : sum),
      0,
    );

    return {
      agentId: user.id,
      assignedConfiguration: assignedConfig
        ? {
            id: assignedConfig.id,
            scope: assignedConfig.scope,
            commissionType: assignedConfig.commissionType,
            rateValue: assignedConfig.rateValue,
            notes: assignedConfig.notes,
            configuredAt: assignedConfig.createdAt,
          }
        : null,
      summary: {
        totalEarned,
        totalTransactionsCount: transactions.length,
        hasIndependentWallet: false,
        settlementModel: 'OFFLINE_MANUAL',
      },
      transactions,
    };
  }

  async configureCommission(user: any) {
    this.assertAgentRole(user);
    // Explicit Denial: Section 9 Rule
    throw new ForbiddenException(
      'Access denied: Agents cannot configure or modify commission settings. Commission rates are manually configured by HQ Super Admin / Franchise Manager.',
    );
  }
}
