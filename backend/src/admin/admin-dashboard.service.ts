import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, RoleType } from '../common/constants/roles.constants';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all real-data administrative dashboard metrics for Super Admin & Admin.
   */
  async getDashboardMetrics(user: any) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Access denied: Dashboard is restricted to Super Admin and Admin');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Profile Count Boxes
    const [
      totalRegistered,
      freeProfiles,
      blockedProfiles,
      marriageSettledCount,
      notInterestedCount,
      terminatedProfiles,
      allPackages,
      paidProfilesByPackage,
    ] = await Promise.all([
      this.prisma.memberProfile.count(),
      this.prisma.memberProfile.count({ where: { packageType: 'FREE' } }),
      this.prisma.memberProfile.count({ where: { isBlocked: true } }),
      this.prisma.memberProfile.count({
        where: {
          isBlocked: true,
          blockedReason: { contains: 'Marriage Settled', mode: 'insensitive' },
        },
      }),
      this.prisma.memberProfile.count({
        where: {
          isBlocked: true,
          blockedReason: { contains: 'Not Interested', mode: 'insensitive' },
        },
      }),
      this.prisma.memberProfile.count({
        where: {
          packageExpiresAt: { lt: now },
          packageType: 'PAID',
        },
      }),
      this.prisma.packageMaster.findMany({
        where: { isActive: true },
        select: { id: true, name: true, cost: true },
      }),
      this.prisma.memberProfile.groupBy({
        by: ['currentPackageId'],
        where: { packageType: 'PAID', currentPackageId: { not: null } },
        _count: { id: true },
      }),
    ]);

    // Map package counts
    const packageCountsMap = new Map<string, number>();
    for (const group of paidProfilesByPackage) {
      if (group.currentPackageId) {
        packageCountsMap.set(group.currentPackageId, group._count.id);
      }
    }

    const packageBreakdown = allPackages.map((pkg) => ({
      packageId: pkg.id,
      packageName: pkg.name,
      cost: pkg.cost,
      count: packageCountsMap.get(pkg.id) || 0,
    }));

    // 2. Daily Live Metrics
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const [
      todayRegistrations,
      todayNewlyJoined,
      todayBlocked,
      todayPaidInvoices,
      recentActiveStaffCount,
      totalStaffCount,
    ] = await Promise.all([
      this.prisma.memberProfile.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.memberProfile.count({
        where: {
          createdAt: { gte: todayStart },
          currentStep: 5,
        },
      }),
      this.prisma.memberProfile.count({
        where: {
          isBlocked: true,
          blockedAt: { gte: todayStart },
        },
      }),
      this.prisma.memberInvoice.findMany({
        where: {
          createdAt: { gte: todayStart },
          status: 'APPROVED',
        },
        include: {
          memberProfile: {
            select: {
              id: true,
              memberId: true,
              firstName: true,
              lastName: true,
              ownerOrg: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, employeeId: true, mobile: true, fullName: true } },
              createdByStaff: { select: { id: true, employeeId: true, mobile: true, fullName: true } },
            },
          },
          package: { select: { id: true, name: true, cost: true } },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorId'],
        where: {
          createdAt: { gte: fifteenMinutesAgo },
          actorRole: { not: 'MEMBER' },
        },
      }),
      this.prisma.user.count({
        where: { role: { not: 'MEMBER' } },
      }),
    ]);

    const todayPaidConversions = todayPaidInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      packageName: inv.package.name,
      memberId: inv.memberProfile.memberId,
      memberName: `${inv.memberProfile.firstName} ${inv.memberProfile.lastName}`,
      branchName: inv.memberProfile.ownerOrg?.name || 'HQ Central',
      agentOrStaff:
        inv.memberProfile.assignedTo?.employeeId ||
        inv.memberProfile.createdByStaff?.employeeId ||
        inv.memberProfile.assignedTo?.fullName ||
        inv.memberProfile.createdByStaff?.fullName ||
        'Direct HQ',
      createdAt: inv.createdAt,
    }));

    // 3. Charts & Analytics
    // Revenue trend (Approved invoices grouped by date)
    const recentInvoices = await this.prisma.memberInvoice.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'APPROVED',
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenueMap: Record<string, number> = {};
    for (const inv of recentInvoices) {
      const dateKey = inv.createdAt.toISOString().slice(0, 10);
      dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + inv.amount;
    }

    const revenueTrend = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    // Member growth trend
    const recentProfiles = await this.prisma.memberProfile.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, packageType: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyGrowthMap: Record<string, { total: number; paid: number; free: number }> = {};
    for (const prof of recentProfiles) {
      const dateKey = prof.createdAt.toISOString().slice(0, 10);
      if (!dailyGrowthMap[dateKey]) {
        dailyGrowthMap[dateKey] = { total: 0, paid: 0, free: 0 };
      }
      dailyGrowthMap[dateKey].total += 1;
      if (prof.packageType === 'PAID') {
        dailyGrowthMap[dateKey].paid += 1;
      } else {
        dailyGrowthMap[dateKey].free += 1;
      }
    }

    const memberGrowthTrend = Object.entries(dailyGrowthMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Organization Performance
    const organizations = await this.prisma.organization.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            memberProfiles: true,
            users: true,
          },
        },
      },
    });

    const orgPerformance = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      type: org.type,
      totalMembers: org._count.memberProfiles,
      totalStaff: org._count.users,
    }));

    // Role Distribution
    const roleGroups = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const roleDistribution = roleGroups.map((rg) => ({
      role: rg.role,
      count: rg._count.id,
    }));

    // Staff Work Overview (actions in last 7 days)
    const staffActivityGroups = await this.prisma.auditLog.groupBy({
      by: ['actorId', 'action'],
      where: {
        createdAt: { gte: sevenDaysAgo },
        actorRole: { not: 'MEMBER' },
      },
      _count: { id: true },
    });

    const staffWorkMap = new Map<string, Record<string, number>>();
    for (const item of staffActivityGroups) {
      if (!staffWorkMap.has(item.actorId)) {
        staffWorkMap.set(item.actorId, {});
      }
      staffWorkMap.get(item.actorId)![item.action] = item._count.id;
    }

    const staffUsers = await this.prisma.user.findMany({
      where: { id: { in: Array.from(staffWorkMap.keys()) } },
      select: { id: true, fullName: true, employeeId: true, role: true, mobile: true },
    });

    const staffWorkOverview = staffUsers.map((staff) => {
      const actions = staffWorkMap.get(staff.id) || {};
      return {
        staffId: staff.id,
        employeeId: staff.employeeId || 'N/A',
        name: staff.fullName || staff.mobile,
        role: staff.role,
        profilesCreated: actions['PROFILE_CREATE'] || 0,
        profilesEdited: actions['PROFILE_EDIT'] || 0,
        profilesBlocked: actions['PROFILE_BLOCK'] || 0,
        paymentsProcessed: actions['INVOICE_APPROVE'] || actions['PACKAGE_UPGRADE'] || 0,
      };
    });

    // 4. Alerts & Action Panels
    const upcomingAlerts = await this.prisma.paymentAlert.findMany({
      where: {
        isResolved: false,
        alertDate: { gte: now },
      },
      take: 10,
      orderBy: { alertDate: 'asc' },
      include: {
        memberProfile: {
          select: { id: true, memberId: true, firstName: true, lastName: true },
        },
      },
    });

    const overdueFollowUps = await this.prisma.paymentAlert.findMany({
      where: {
        isResolved: false,
        alertDate: { lt: now },
      },
      take: 10,
      orderBy: { alertDate: 'desc' },
      include: {
        memberProfile: {
          select: { id: true, memberId: true, firstName: true, lastName: true },
        },
      },
    });

    // Pending tasks
    const [pendingInvoicesCount, pendingUpdateRequestsCount, pendingTicketsCount] = await Promise.all([
      this.prisma.memberInvoice.count({ where: { status: 'PENDING' } }),
      this.prisma.profileUpdateRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    // Recent activity log
    const recentActivity = await this.prisma.auditLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, fullName: true, employeeId: true, role: true, mobile: true },
        },
      },
    });

    return {
      profileCounts: {
        totalRegistered,
        freeProfiles,
        totalPaidProfiles: packageBreakdown.reduce((sum, p) => sum + p.count, 0),
        packageBreakdown,
        blockedProfiles,
        marriageSettledCount,
        notInterestedCount,
        terminatedProfiles,
      },
      dailyLiveMetrics: {
        onlineStaffEstimate: recentActiveStaffCount.length,
        totalStaff: totalStaffCount,
        todayRegistrations,
        todayNewlyJoined,
        todayBlocked,
        todayPaidConversions,
      },
      charts: {
        revenueTrend,
        memberGrowthTrend,
        orgPerformance,
        roleDistribution,
        staffWorkOverview,
      },
      alerts: {
        upcomingPaymentAlerts: upcomingAlerts,
        overdueFollowUps: overdueFollowUps,
        pendingTasks: {
          pendingInvoices: pendingInvoicesCount,
          pendingUpdateRequests: pendingUpdateRequestsCount,
          pendingTickets: pendingTicketsCount,
        },
        recentActivity: recentActivity.map((log) => ({
          id: log.id,
          actor: log.actor.fullName || log.actor.employeeId || log.actor.mobile,
          role: log.actorRole,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          timestamp: log.createdAt,
        })),
      },
    };
  }
}
