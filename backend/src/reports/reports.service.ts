import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { Role } from '../common/constants/roles.constants';
import { calculateProfileCompletion } from '../profiles/profile-completion';
import {
  DateFilterDto,
  MemberDataFilterDto,
  MemberDownloadFilterDto,
  SalesRevenueFilterDto,
  StaffActivityFilterDto,
} from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to assert that caller has Super Admin or Admin role
   */
  private assertAdminRole(user: any) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access Denied: Only Super Admin and Admin can access Reports & Analytics and download data.',
      );
    }
  }

  /**
   * Helper to fetch organizations for dropdown filter
   */
  async getOrganizations() {
    return this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Parse date boundaries safely
   */
  private buildDateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    const filter: any = {};
    if (startDate) {
      filter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }

  // ==========================================================================
  // 1. MEMBER DATA REPORTS
  // ==========================================================================

  /**
   * A. Unverified ID Proofs Report
   * Only include records whose ID proofs are awaiting verification.
   */
  async getUnverifiedIdProofs(user: any, filter: MemberDataFilterDto) {
    this.assertAdminRole(user);

    const members = await this.prisma.memberProfile.findMany({
      where: {
        idProofFileUrl: { not: null },
        ownerOrgId: filter.branchId || undefined,
      },
      include: {
        user: { select: { email: true, mobile: true } },
        ownerOrg: { select: { id: true, name: true, type: true } },
        createdByStaff: { select: { id: true, employeeId: true, fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filter only those awaiting verification (not yet verified)
    const unverified = members
      .filter((m) => {
        if (!m.idProofFileUrl || m.idProofFileUrl.trim() === '') return false;
        const profileData = (m.profileData as Record<string, any>) || {};
        const isVerified = profileData?.step5?.idProofVerified === true;
        return !isVerified;
      })
      .map((m) => {
        const profileData = (m.profileData as Record<string, any>) || {};
        const step1 = profileData?.step1 || {};
        return {
          profileId: m.id,
          memberId: m.memberId || 'PENDING',
          fullName: `${m.firstName} ${m.lastName}`.trim(),
          gender: m.gender,
          packageType: m.packageType,
          idProofType: m.idProofType || step1.idProofType || 'Identity Proof',
          idProofNumber: m.idProofNumber || step1.idProofNumber || 'N/A',
          idProofFileUrl: m.idProofFileUrl,
          uploadedAt: m.updatedAt,
          uploadedBy: m.createdByStaff
            ? `Staff [${m.createdByStaff.employeeId || m.createdByStaff.fullName}]`
            : `Member [${m.memberId || 'Self'}]`,
          branchName: m.ownerOrg?.name || 'HQ Central',
        };
      });

    return {
      title: 'Unverified ID Proofs Report',
      totalCount: unverified.length,
      records: unverified,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * B. Profiles Without Photos Report
   * Show members who have not uploaded a profile photo.
   */
  async getProfilesWithoutPhotos(user: any, filter: MemberDataFilterDto) {
    this.assertAdminRole(user);

    const members = await this.prisma.memberProfile.findMany({
      where: {
        OR: [{ photoUrl: null }, { photoUrl: '' }],
        ownerOrgId: filter.branchId || undefined,
      },
      include: {
        user: { select: { email: true, mobile: true } },
        ownerOrg: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const records = members.map((m) => ({
      profileId: m.id,
      memberId: m.memberId || 'PENDING',
      fullName: `${m.firstName} ${m.lastName}`.trim(),
      gender: m.gender,
      packageType: m.packageType,
      branchName: m.ownerOrg?.name || 'HQ Central',
      createdAt: m.createdAt,
    }));

    return {
      title: 'Profiles Without Photos Report',
      totalCount: records.length,
      records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * C. Profiles Below 30% Completion Report
   * Calculate profile completion using existing profile-completion logic.
   */
  async getProfilesBelow30(user: any, filter: MemberDataFilterDto) {
    this.assertAdminRole(user);

    const members = await this.prisma.memberProfile.findMany({
      where: {
        ownerOrgId: filter.branchId || undefined,
      },
      include: {
        ownerOrg: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const below30List = members
      .map((m) => {
        const comp = calculateProfileCompletion(m);
        return {
          profileId: m.id,
          memberId: m.memberId || 'PENDING',
          fullName: `${m.firstName} ${m.lastName}`.trim(),
          gender: m.gender,
          packageType: m.packageType,
          completionPercentage: comp.percentage,
          missingFieldsCount: comp.missingFields.length,
          missingFields: comp.missingFields,
          branchName: m.ownerOrg?.name || 'HQ Central',
          createdAt: m.createdAt,
        };
      })
      .filter((m) => m.completionPercentage < 30);

    return {
      title: 'Profiles Below 30% Completion Report',
      totalCount: below30List.length,
      records: below30List,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * D. Incomplete Profile Summary
   * Search, sorting, pagination, and filters.
   */
  async getIncompleteProfileSummary(user: any, filter: MemberDataFilterDto) {
    this.assertAdminRole(user);

    const where: any = {};
    if (filter.branchId) {
      where.ownerOrgId = filter.branchId;
    }
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { memberId: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      include: {
        ownerOrg: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Evaluate completion for each member
    let summaryList = members.map((m) => {
      const comp = calculateProfileCompletion(m);
      const hasPhoto = Boolean(m.photoUrl && m.photoUrl.trim() !== '');
      const hasIdProof = Boolean(m.idProofFileUrl && m.idProofFileUrl.trim() !== '');

      return {
        profileId: m.id,
        memberId: m.memberId || 'PENDING',
        memberName: `${m.firstName} ${m.lastName}`.trim(),
        gender: m.gender,
        packageType: m.packageType,
        photoUploaded: hasPhoto ? 'Yes' : 'No',
        idProofUploaded: hasIdProof ? 'Yes' : 'No',
        completionPercentage: comp.percentage,
        isUnder30: comp.percentage < 30,
        branchName: m.ownerOrg?.name || 'HQ Central',
        createdAt: m.createdAt,
      };
    });

    // KPI Counters
    const totalMembers = summaryList.length;
    const below30Count = summaryList.filter((m) => m.completionPercentage < 30).length;
    const missingPhotosCount = summaryList.filter((m) => m.photoUploaded === 'No').length;
    const missingIdProofsCount = summaryList.filter((m) => m.idProofUploaded === 'No').length;

    // Sorting
    if (filter.sortBy === 'completion') {
      summaryList.sort((a, b) =>
        filter.sortOrder === 'asc'
          ? a.completionPercentage - b.completionPercentage
          : b.completionPercentage - a.completionPercentage,
      );
    } else if (filter.sortBy === 'name') {
      summaryList.sort((a, b) =>
        filter.sortOrder === 'asc'
          ? a.memberName.localeCompare(b.memberName)
          : b.memberName.localeCompare(a.memberName),
      );
    }

    // Pagination
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 25;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = summaryList.slice(startIndex, startIndex + limit);

    return {
      title: 'Incomplete Profile Summary',
      kpi: {
        totalMembers,
        below30Count,
        missingPhotosCount,
        missingIdProofsCount,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalMembers / limit),
        totalRecords: totalMembers,
      },
      records: paginatedRecords,
      generatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // 2. SALES AND REVENUE REPORTS
  // ==========================================================================

  /**
   * A. Branch Revenue Report
   * Shows branch-wise metrics for:
   * Profiles created, paid, blocked, terminated, renewed, approved, total revenue.
   * Daily, monthly, and overall totals.
   */
  async getBranchRevenueReport(user: any, filter: SalesRevenueFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const branches = await this.prisma.organization.findMany({
      where: {
        type: 'BRANCH',
        id: filter.branchId || undefined,
      },
      include: {
        memberProfiles: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: {
            id: true,
            packageType: true,
            isBlocked: true,
            closureRequested: true,
            createdAt: true,
          },
        },
        invoices: {
          where: {
            status: 'APPROVED',
            createdAt: dateFilter,
          },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            memberProfileId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const branchReports = branches.map((branch) => {
      const created = branch.memberProfiles.length;
      const paid = branch.memberProfiles.filter((m) => m.packageType === 'PAID').length;
      const blocked = branch.memberProfiles.filter((m) => m.isBlocked).length;
      const terminated = branch.memberProfiles.filter((m) => m.closureRequested).length;
      const approved = branch.invoices.length;
      const revenue = branch.invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);

      // Renewed calculation (members with more than 1 invoice)
      const memberInvoiceCounts: Record<string, number> = {};
      branch.invoices.forEach((inv) => {
        memberInvoiceCounts[inv.memberProfileId] = (memberInvoiceCounts[inv.memberProfileId] || 0) + 1;
      });
      const renewed = Object.values(memberInvoiceCounts).filter((c) => c > 1).length;

      return {
        branchId: branch.id,
        branchName: branch.name,
        profilesCreated: created,
        profilesPaid: paid,
        profilesBlocked: blocked,
        profilesTerminated: terminated,
        profilesRenewed: renewed,
        profilesApproved: approved,
        totalRevenue: revenue,
      };
    });

    // Summary Totals
    const totals = branchReports.reduce(
      (acc, b) => ({
        profilesCreated: acc.profilesCreated + b.profilesCreated,
        profilesPaid: acc.profilesPaid + b.profilesPaid,
        profilesBlocked: acc.profilesBlocked + b.profilesBlocked,
        profilesTerminated: acc.profilesTerminated + b.profilesTerminated,
        profilesRenewed: acc.profilesRenewed + b.profilesRenewed,
        profilesApproved: acc.profilesApproved + b.profilesApproved,
        totalRevenue: acc.totalRevenue + b.totalRevenue,
      }),
      {
        profilesCreated: 0,
        profilesPaid: 0,
        profilesBlocked: 0,
        profilesTerminated: 0,
        profilesRenewed: 0,
        profilesApproved: 0,
        totalRevenue: 0,
      },
    );

    return {
      title: 'Branch Revenue Report',
      period: filter.period || 'overall',
      filters: {
        startDate: filter.startDate || null,
        endDate: filter.endDate || null,
        branchId: filter.branchId || null,
      },
      totals,
      branches: branchReports,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * B. Agent Revenue Report
   * Individual metrics for each agent with date filters and totals.
   */
  async getAgentRevenueReport(user: any, filter: SalesRevenueFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const agents = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.BRANCH_AGENT, Role.FRANCHISE_AGENT, Role.BRANCH_STAFF, Role.FRANCHISE_STAFF] },
        id: filter.agentId || undefined,
        organizationId: filter.branchId || filter.franchiseId || undefined,
      },
      include: {
        organization: { select: { id: true, name: true, type: true } },
        createdProfiles: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: { id: true, packageType: true, isBlocked: true, closureRequested: true },
        },
        saleInvoices: {
          where: {
            status: 'APPROVED',
            createdAt: dateFilter,
          },
          select: { id: true, amount: true },
        },
        commissionTransactions: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: { id: true, commissionAmount: true, status: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const agentReports = agents.map((agent) => {
      const created = agent.createdProfiles.length;
      const paid = agent.createdProfiles.filter((m) => m.packageType === 'PAID').length;
      const blocked = agent.createdProfiles.filter((m) => m.isBlocked).length;
      const terminated = agent.createdProfiles.filter((m) => m.closureRequested).length;
      const approved = agent.saleInvoices.length;
      const totalRevenue = agent.saleInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
      const totalCommission = agent.commissionTransactions.reduce(
        (acc, c) => acc + (c.commissionAmount || 0),
        0,
      );

      return {
        agentId: agent.id,
        agentName: agent.fullName || 'Agent',
        employeeId: agent.employeeId || 'N/A',
        role: agent.role,
        organizationName: agent.organization?.name || 'HQ',
        profilesCreated: created,
        profilesPaid: paid,
        profilesBlocked: blocked,
        profilesTerminated: terminated,
        profilesApproved: approved,
        totalRevenue,
        totalCommission,
      };
    });

    const totals = agentReports.reduce(
      (acc, a) => ({
        profilesCreated: acc.profilesCreated + a.profilesCreated,
        profilesPaid: acc.profilesPaid + a.profilesPaid,
        profilesBlocked: acc.profilesBlocked + a.profilesBlocked,
        profilesApproved: acc.profilesApproved + a.profilesApproved,
        totalRevenue: acc.totalRevenue + a.totalRevenue,
        totalCommission: acc.totalCommission + a.totalCommission,
      }),
      {
        profilesCreated: 0,
        profilesPaid: 0,
        profilesBlocked: 0,
        profilesApproved: 0,
        totalRevenue: 0,
        totalCommission: 0,
      },
    );

    return {
      title: 'Agent Revenue Report',
      filters: filter,
      totals,
      agents: agentReports,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * C. Franchise Revenue Report
   * Revenue per franchise, relevant approved sales, wallet deduction history, date-wise details.
   */
  async getFranchiseRevenueReport(user: any, filter: SalesRevenueFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const franchises = await this.prisma.organization.findMany({
      where: {
        type: 'FRANCHISE',
        id: filter.franchiseId || undefined,
      },
      include: {
        franchiseWallet: {
          include: {
            transactions: {
              where: dateFilter ? { createdAt: dateFilter } : undefined,
              orderBy: { createdAt: 'desc' },
              include: {
                performedBy: { select: { fullName: true, employeeId: true } },
              },
            },
          },
        },
        invoices: {
          where: {
            status: 'APPROVED',
            createdAt: dateFilter,
          },
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            walletDeductedAmount: true,
            createdAt: true,
            approvedAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const reports = franchises.map((f) => {
      const wallet = f.franchiseWallet;
      const approvedSales = f.invoices.length;
      const totalSalesRevenue = f.invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
      const totalWalletDeductions = (wallet?.transactions || [])
        .filter((t) => t.type === 'DEDUCTION')
        .reduce((acc, t) => acc + (t.amount || 0), 0);

      return {
        franchiseId: f.id,
        franchiseName: f.name,
        currentWalletBalance: wallet?.balance || 0,
        creditLimit: wallet?.creditLimit || 0,
        approvedSalesCount: approvedSales,
        totalSalesRevenue,
        totalWalletDeductions,
        transactions: (wallet?.transactions || []).map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceBefore: t.balanceBefore,
          balanceAfter: t.balanceAfter,
          performedBy: t.performedBy?.fullName || t.performedBy?.employeeId || 'System',
          notes: t.notes,
          date: t.createdAt,
        })),
      };
    });

    return {
      title: 'Franchise Revenue & Wallet Report',
      franchises: reports,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * D. Invoice Approval Report
   * Approved invoice requests with approving admin/agent, approval date, invoice details, summaries.
   */
  async getInvoiceApprovalReport(user: any, filter: SalesRevenueFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const invoices = await this.prisma.memberInvoice.findMany({
      where: {
        status: 'APPROVED',
        orgId: filter.branchId || filter.franchiseId || undefined,
        approvedAt: dateFilter,
      },
      include: {
        package: true,
        org: { select: { id: true, name: true, type: true } },
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: { select: { id: true, fullName: true, employeeId: true, role: true } },
        raisedBy: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { approvedAt: 'desc' },
    });

    const totalAmount = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);

    const records = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || 'N/A',
      requestNumber: inv.requestNumber || 'N/A',
      memberId: inv.memberProfile?.memberId || 'N/A',
      memberName: `${inv.memberProfile?.firstName} ${inv.memberProfile?.lastName}`.trim(),
      organization: inv.org?.name || 'HQ Central',
      packageName: inv.package.name,
      amount: inv.amount,
      paymentMode: inv.paymentMode,
      approvedAt: inv.approvedAt,
      approvedBy: inv.approvedBy?.fullName || inv.approvedBy?.employeeId || 'Admin',
      approverRole: inv.approvedBy?.role || 'HQ',
      raisedBy: inv.raisedBy?.fullName || inv.raisedBy?.employeeId || 'Staff',
      bankName: inv.bankName,
      transactionRef: inv.transactionRef,
    }));

    return {
      title: 'Invoice Approval Report',
      totalCount: records.length,
      totalAmount,
      invoices: records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * E. Featured Profile Revenue Report
   * Track revenue through Featured Profile add-ons grouped by member & reporting period.
   */
  async getFeaturedProfileRevenueReport(user: any, filter: DateFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const featuredRecords = await this.prisma.featuredProfileRecord.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      include: {
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            packageType: true,
            ownerOrg: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const records = featuredRecords.map((rec) => ({
      id: rec.id,
      memberId: rec.memberProfile.memberId || 'N/A',
      memberName: `${rec.memberProfile.firstName} ${rec.memberProfile.lastName}`.trim(),
      branchName: rec.memberProfile.ownerOrg?.name || 'HQ',
      startDate: rec.startDate,
      endDate: rec.endDate,
      isActive: rec.isActive,
      notes: rec.notes || 'Featured Placement',
      createdAt: rec.createdAt,
    }));

    return {
      title: 'Featured Profile Revenue & Placement Report',
      totalCount: records.length,
      records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * F. Advertisement Revenue Report
   * Advertisement fees collected grouped by partner, slot, reporting period.
   */
  async getAdvertisementRevenueReport(user: any, filter: DateFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const ads = await this.prisma.advertisement.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const totalFees = ads.reduce((acc, ad) => acc + (ad.feeAmount || 0), 0);

    const records = ads.map((ad) => ({
      id: ad.id,
      partnerName: ad.partnerName || 'Direct Advertiser',
      title: ad.title,
      slot: ad.slot,
      feeAmount: ad.feeAmount,
      status: ad.status,
      startDate: ad.startDate,
      endDate: ad.endDate,
      impressions: ad.impressions,
      clicks: ad.clicks,
      createdAt: ad.createdAt,
    }));

    return {
      title: 'Advertisement Revenue Report',
      totalCount: records.length,
      totalFeesCollected: totalFees,
      advertisements: records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * G. Wedding Services Revenue Report
   * Partnership fees and referral revenue from wedding service providers.
   */
  async getWeddingServicesRevenueReport(user: any, filter: DateFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const vendors = await this.prisma.weddingService.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const totalFees = vendors.reduce((acc, v) => acc + (v.feeAmount || 0), 0);

    const records = vendors.map((v) => ({
      id: v.id,
      businessName: v.businessName,
      category: v.category,
      city: v.city,
      feeAmount: v.feeAmount,
      isFeatured: v.isFeatured,
      isActive: v.isActive,
      phone: v.phone,
      createdAt: v.createdAt,
    }));

    return {
      title: 'Wedding Services Partnership Revenue Report',
      totalPartners: records.length,
      totalPartnershipFees: totalFees,
      services: records,
      generatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // 3. STAFF ACTIVITY REPORTS
  // ==========================================================================

  /**
   * A. Profile Visits
   * Record & retrieve staff profile visits: Date/time, Staff ID, Staff Name, Branch, Member profile visited.
   */
  async getStaffProfileVisits(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const visits = await this.prisma.staffProfileVisit.findMany({
      where: {
        staffId: filter.staffId || undefined,
        branchOrgId: filter.branchId || undefined,
        visitedAt: dateFilter,
      },
      include: {
        staff: { select: { id: true, employeeId: true, fullName: true, role: true } },
        branchOrg: { select: { id: true, name: true } },
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { visitedAt: 'desc' },
      take: 200,
    });

    const records = visits.map((v) => ({
      id: v.id,
      visitedAt: v.visitedAt,
      staffId: v.staff.employeeId || v.staff.id,
      staffName: v.staff.fullName || 'Staff Member',
      role: v.staff.role,
      branchName: v.branchOrg?.name || 'HQ Central',
      memberId: v.memberProfile.memberId || 'N/A',
      memberName: `${v.memberProfile.firstName} ${v.memberProfile.lastName}`.trim(),
      memberProfileId: v.memberProfile.id,
    }));

    return {
      title: 'Staff Profile Visits Report',
      totalCount: records.length,
      visits: records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Log a staff profile visit in real-time
   */
  async recordStaffProfileVisit(staffUser: any, memberProfileId: string) {
    // Only record for staff roles, not members
    if (staffUser.role === Role.MEMBER) return;

    try {
      await this.prisma.staffProfileVisit.create({
        data: {
          staffId: staffUser.id,
          memberProfileId,
          branchOrgId: staffUser.organizationId || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log staff profile visit: ${err.message}`);
    }
  }

  /**
   * B. Profiles Created per Staff Member
   */
  async getStaffProfilesCreated(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const staffMembers = await this.prisma.user.findMany({
      where: {
        role: { not: Role.MEMBER },
        id: filter.staffId || undefined,
        organizationId: filter.branchId || undefined,
      },
      include: {
        organization: { select: { name: true } },
        createdProfiles: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: { id: true, createdAt: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const records = staffMembers.map((s) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const dailyCount = s.createdProfiles.filter((p) => new Date(p.createdAt) >= today).length;
      const monthlyCount = s.createdProfiles.filter((p) => new Date(p.createdAt) >= firstDayOfMonth).length;
      const overallCount = s.createdProfiles.length;

      return {
        staffId: s.employeeId || s.id,
        staffName: s.fullName || 'Staff Member',
        role: s.role,
        branchName: s.organization?.name || 'HQ Central',
        dailyCount,
        monthlyCount,
        overallCount,
      };
    });

    return {
      title: 'Profiles Created by Staff Report',
      staff: records,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * C. Profiles Edited per Staff Member (from AuditLog)
   */
  async getStaffProfilesEdited(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const editLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'PROFILE_EDIT',
        actorId: filter.staffId || undefined,
        createdAt: dateFilter,
      },
      include: {
        actor: {
          select: { id: true, employeeId: true, fullName: true, role: true, organization: { select: { name: true } } },
        },
      },
    });

    // Group by staff
    const staffMap: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const log of editLogs) {
      const sid = log.actorId;
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: log.actor.employeeId || log.actor.id,
          staffName: log.actor.fullName || 'Staff Member',
          role: log.actor.role,
          branchName: log.actor.organization?.name || 'HQ Central',
          dailyCount: 0,
          monthlyCount: 0,
          overallCount: 0,
        };
      }
      staffMap[sid].overallCount++;
      const logDate = new Date(log.createdAt);
      if (logDate >= today) staffMap[sid].dailyCount++;
      if (logDate >= firstDayOfMonth) staffMap[sid].monthlyCount++;
    }

    return {
      title: 'Profiles Edited by Staff Report',
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * D. Profiles Blocked per Staff Member (from AuditLog)
   */
  async getStaffProfilesBlocked(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const blockLogs = await this.prisma.auditLog.findMany({
      where: {
        action: 'PROFILE_BLOCK',
        actorId: filter.staffId || undefined,
        createdAt: dateFilter,
      },
      include: {
        actor: {
          select: { id: true, employeeId: true, fullName: true, role: true, organization: { select: { name: true } } },
        },
      },
    });

    const staffMap: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const log of blockLogs) {
      const sid = log.actorId;
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: log.actor.employeeId || log.actor.id,
          staffName: log.actor.fullName || 'Staff Member',
          role: log.actor.role,
          branchName: log.actor.organization?.name || 'HQ Central',
          dailyCount: 0,
          monthlyCount: 0,
          overallCount: 0,
        };
      }
      staffMap[sid].overallCount++;
      const logDate = new Date(log.createdAt);
      if (logDate >= today) staffMap[sid].dailyCount++;
      if (logDate >= firstDayOfMonth) staffMap[sid].monthlyCount++;
    }

    return {
      title: 'Profiles Blocked by Staff Report',
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * E. Payments Processed per Staff Member
   */
  async getStaffPaymentsProcessed(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const invoices = await this.prisma.memberInvoice.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: dateFilter,
        approvedById: filter.staffId || undefined,
      },
      include: {
        approvedBy: {
          select: { id: true, employeeId: true, fullName: true, role: true, organization: { select: { name: true } } },
        },
      },
    });

    const staffMap: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const inv of invoices) {
      if (!inv.approvedBy) continue;
      const sid = inv.approvedBy.id;
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: inv.approvedBy.employeeId || inv.approvedBy.id,
          staffName: inv.approvedBy.fullName || 'Staff Member',
          role: inv.approvedBy.role,
          branchName: inv.approvedBy.organization?.name || 'HQ Central',
          dailyCount: 0,
          dailyValue: 0,
          monthlyCount: 0,
          monthlyValue: 0,
          overallCount: 0,
          overallValue: 0,
        };
      }

      const val = inv.amount || 0;
      staffMap[sid].overallCount++;
      staffMap[sid].overallValue += val;

      const dt = inv.approvedAt ? new Date(inv.approvedAt) : new Date(inv.createdAt);
      if (dt >= today) {
        staffMap[sid].dailyCount++;
        staffMap[sid].dailyValue += val;
      }
      if (dt >= firstDayOfMonth) {
        staffMap[sid].monthlyCount++;
        staffMap[sid].monthlyValue += val;
      }
    }

    return {
      title: 'Payments Processed by Staff Report',
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * F. Currency Collected per Staff Member (Cash vs Online)
   */
  async getStaffCurrencyCollected(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const cashInvoices = await this.prisma.memberInvoice.findMany({
      where: {
        status: 'APPROVED',
        isCash: true,
        cashReceivedById: filter.staffId || undefined,
        createdAt: dateFilter,
      },
      include: {
        cashReceivedBy: {
          select: { id: true, employeeId: true, fullName: true, role: true, organization: { select: { name: true } } },
        },
      },
    });

    const staffMap: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const inv of cashInvoices) {
      if (!inv.cashReceivedBy) continue;
      const sid = inv.cashReceivedBy.id;
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: inv.cashReceivedBy.employeeId || inv.cashReceivedBy.id,
          staffName: inv.cashReceivedBy.fullName || 'Staff Member',
          role: inv.cashReceivedBy.role,
          branchName: inv.cashReceivedBy.organization?.name || 'Branch',
          dailyCash: 0,
          monthlyCash: 0,
          overallCash: 0,
          cashCount: 0,
        };
      }

      const val = inv.amount || 0;
      staffMap[sid].overallCash += val;
      staffMap[sid].cashCount++;

      const dt = new Date(inv.createdAt);
      if (dt >= today) staffMap[sid].dailyCash += val;
      if (dt >= firstDayOfMonth) staffMap[sid].monthlyCash += val;
    }

    return {
      title: 'Currency (Cash) Collected by Staff Report',
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * G. Messages Received per Staff Member and Branch
   */
  async getStaffMessagesReceived(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const messages = await this.prisma.staffMessageLog.findMany({
      where: {
        direction: 'INBOUND',
        staffId: filter.staffId || undefined,
        branchOrgId: filter.branchId || undefined,
        createdAt: dateFilter,
      },
      include: {
        staff: { select: { id: true, employeeId: true, fullName: true, organization: { select: { name: true } } } },
        branchOrg: { select: { id: true, name: true } },
      },
    });

    const staffMap: Record<string, any> = {};
    for (const msg of messages) {
      const sid = msg.staffId;
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: msg.staff.employeeId || msg.staff.id,
          staffName: msg.staff.fullName || 'Staff Member',
          branchName: msg.branchOrg?.name || msg.staff.organization?.name || 'HQ Central',
          inboundMessageCount: 0,
        };
      }
      staffMap[sid].inboundMessageCount++;
    }

    return {
      title: 'Messages Received by Staff & Branch Report',
      totalMessages: messages.length,
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * H. Tickets Resolved per Staff Member
   */
  async getStaffTicketsResolved(user: any, filter: StaffActivityFilterDto) {
    this.assertAdminRole(user);

    const dateFilter = this.buildDateRange(filter.startDate, filter.endDate);

    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        status: 'CLOSED',
        resolvedById: filter.staffId || undefined,
        resolvedAt: dateFilter,
      },
      include: {
        resolvedBy: { select: { id: true, employeeId: true, fullName: true, organization: { select: { name: true } } } },
        org: { select: { id: true, name: true } },
      },
    });

    const staffMap: Record<string, any> = {};
    for (const t of tickets) {
      const sid = t.resolvedById || 'Unassigned';
      if (!staffMap[sid]) {
        staffMap[sid] = {
          staffId: t.resolvedBy?.employeeId || sid,
          staffName: t.resolvedBy?.fullName || 'Support Staff',
          branchName: t.org?.name || t.resolvedBy?.organization?.name || 'HQ Support',
          resolvedCount: 0,
        };
      }
      staffMap[sid].resolvedCount++;
    }

    return {
      title: 'Tickets Resolved by Staff Report',
      totalTicketsResolved: tickets.length,
      staff: Object.values(staffMap),
      generatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // 4. MEMBER DATA DOWNLOAD OPTIONS & BIODATA EXPORT
  // ==========================================================================

  /**
   * Secure Member Data Download with range and status filters
   */
  async downloadMemberData(user: any, filter: MemberDownloadFilterDto, ipAddress?: string) {
    this.assertAdminRole(user);

    const where: any = {};

    if (filter.branchId) {
      where.ownerOrgId = filter.branchId;
    }

    if (filter.status && filter.status !== 'ALL') {
      if (filter.status === 'BLOCKED') {
        where.isBlocked = true;
      } else if (filter.status === 'PAID') {
        where.packageType = 'PAID';
        where.isBlocked = false;
      } else if (filter.status === 'FREE') {
        where.packageType = 'FREE';
        where.isBlocked = false;
      }
    }

    // Date range filter
    const dateRange = this.buildDateRange(filter.startDate, filter.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const members = await this.prisma.memberProfile.findMany({
      where,
      include: {
        ownerOrg: { select: { id: true, name: true } },
      },
      orderBy: { memberId: 'asc' },
    });

    // Filter by memberId range if provided
    let filteredMembers = members;
    if (filter.idRangeStart || filter.idRangeEnd) {
      filteredMembers = members.filter((m) => {
        if (!m.memberId) return false;
        if (filter.idRangeStart && m.memberId < filter.idRangeStart) return false;
        if (filter.idRangeEnd && m.memberId > filter.idRangeEnd) return false;
        return true;
      });
    }

    const reportRecords = filteredMembers.map((m) => {
      const comp = calculateProfileCompletion(m);
      const hasPhoto = Boolean(m.photoUrl && m.photoUrl.trim() !== '');
      const hasIdProof = Boolean(m.idProofFileUrl && m.idProofFileUrl.trim() !== '');

      return {
        customerName: `${m.firstName} ${m.lastName}`.trim(),
        customerId: m.memberId || 'N/A',
        gender: m.gender,
        packageType: m.packageType,
        photoUploaded: hasPhoto ? 'Yes' : 'No',
        idProofUploaded: hasIdProof ? 'Yes' : 'No',
        completionPercentage: `${comp.percentage}%`,
        branchName: m.ownerOrg?.name || 'HQ Central',
      };
    });

    // Generate CSV if requested
    const headers = [
      'Customer Name',
      'Customer ID',
      'Gender',
      'Package Type',
      'Photo Uploaded',
      'ID Proof Uploaded',
      'Profile Completion',
      'Branch',
    ];

    const rows = reportRecords.map((r) => [
      `"${r.customerName}"`,
      `"${r.customerId}"`,
      `"${r.gender}"`,
      `"${r.packageType}"`,
      `"${r.photoUploaded}"`,
      `"${r.idProofUploaded}"`,
      `"${r.completionPercentage}"`,
      `"${r.branchName}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Audit Log the export event
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'MEMBER_EXPORT' as any,
      resourceType: 'MemberProfile',
      metadata: {
        recordCount: reportRecords.length,
        filter,
      },
      ipAddress,
    });

    return {
      title: 'Member Data Download Report',
      recordCount: reportRecords.length,
      csvContent,
      records: reportRecords,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Individual Member Biodata download (Excel / PDF formatted view)
   */
  async getMemberBiodata(user: any, memberId: string) {
    this.assertAdminRole(user);

    const member = await this.prisma.memberProfile.findFirst({
      where: {
        OR: [{ id: memberId }, { memberId: memberId }],
      },
      include: {
        user: { select: { email: true, mobile: true } },
        ownerOrg: true,
        currentPackage: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Member not found for ID: ${memberId}`);
    }

    const comp = calculateProfileCompletion(member);
    const profileData = (member.profileData as Record<string, any>) || {};
    const step1 = profileData.step1 || {};
    const step2 = profileData.step2 || {};
    const step3 = profileData.step3 || {};
    const step4 = profileData.step4 || {};

    const biodata = {
      memberId: member.memberId,
      fullName: `${member.firstName} ${member.lastName}`,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      age: Math.floor(
        (Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      ),
      maritalStatus: step1.maritalStatus || 'Never Married',
      height: step1.height || 'N/A',
      religion: step1.religion || 'N/A',
      caste: step1.caste || 'N/A',
      subCaste: step1.subCaste || 'N/A',
      gothram: step1.gothram || 'N/A',
      star: step1.star || 'N/A',
      raasi: step1.raasi || 'N/A',
      education: step2.education || 'N/A',
      profession: step2.occupation || step2.profession || 'N/A',
      annualIncome: step2.income || step2.annualIncome || 'N/A',
      workLocation: step2.workLocation || step2.city || 'N/A',
      familyStatus: step3.familyType || 'N/A',
      fatherName: step3.fatherName || 'N/A',
      motherName: step3.motherName || 'N/A',
      partnerPreferences: step4 || {},
      package: member.currentPackage?.name || member.packageType,
      completionPercentage: `${comp.percentage}%`,
      photoUrl: member.photoUrl,
      branch: member.ownerOrg?.name || 'HQ Central',
    };

    // CSV format of biodata
    const csvRows = [
      ['FIELD', 'VALUE'],
      ['Member ID', biodata.memberId || ''],
      ['Full Name', biodata.fullName],
      ['Gender', biodata.gender],
      ['Age / DOB', `${biodata.age} years (${new Date(biodata.dateOfBirth).toLocaleDateString('en-IN')})`],
      ['Marital Status', biodata.maritalStatus],
      ['Height', biodata.height],
      ['Religion / Caste', `${biodata.religion} - ${biodata.caste}`],
      ['Sub-Caste', biodata.subCaste],
      ['Gothram', biodata.gothram],
      ['Education', biodata.education],
      ['Profession', biodata.profession],
      ['Annual Income', biodata.annualIncome],
      ['Work City', biodata.workLocation],
      ['Branch', biodata.branch],
      ['Package Type', biodata.package],
      ['Profile Completion', biodata.completionPercentage],
    ];

    const csvContent = csvRows.map((r) => `"${r[0]}","${r[1]}"`).join('\n');

    return {
      biodata,
      csvContent,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Staff and Member Photos listing for authorized download to external drive
   */
  async getPhotosDownloadList(user: any, filter: { type?: 'MEMBERS' | 'STAFF'; branchId?: string }) {
    this.assertAdminRole(user);

    const type = filter.type || 'MEMBERS';

    if (type === 'STAFF') {
      const staff = await this.prisma.user.findMany({
        where: {
          role: { not: Role.MEMBER },
          organizationId: filter.branchId || undefined,
          aadhaarUrl: { not: null },
        },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          role: true,
          aadhaarUrl: true,
        },
      });

      const photos = staff
        .filter((s) => s.aadhaarUrl)
        .map((s) => ({
          id: s.id,
          identifier: s.employeeId || s.id,
          name: s.fullName,
          downloadFileName: `${s.employeeId || s.id}_id_proof.jpg`,
          fileUrl: s.aadhaarUrl,
        }));

      return { type: 'STAFF', count: photos.length, photos };
    }

    // Default: Member Photos
    const members = await this.prisma.memberProfile.findMany({
      where: {
        photoUrl: { not: null },
        ownerOrgId: filter.branchId || undefined,
      },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
      },
    });

    const photos = members
      .filter((m) => m.photoUrl && m.photoUrl.trim() !== '')
      .map((m) => ({
        id: m.id,
        identifier: m.memberId || m.id,
        name: `${m.firstName} ${m.lastName}`.trim(),
        downloadFileName: `${m.memberId || m.id}_photo.jpg`,
        fileUrl: m.photoUrl,
      }));

    return {
      type: 'MEMBERS',
      count: photos.length,
      photos,
    };
  }
}
