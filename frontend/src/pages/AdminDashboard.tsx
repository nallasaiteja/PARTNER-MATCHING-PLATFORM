import React, { useEffect, useState, useCallback } from 'react';
import { fetchAdminDashboard } from '../services/adminApi';
import './AdminDashboard.css';

interface DashboardData {
  profileCounts: {
    totalRegistered: number;
    freeProfiles: number;
    totalPaidProfiles: number;
    packageBreakdown: Array<{
      packageId: string;
      packageName: string;
      cost: number;
      count: number;
    }>;
    blockedProfiles: number;
    marriageSettledCount: number;
    notInterestedCount: number;
    terminatedProfiles: number;
  };
  dailyLiveMetrics: {
    onlineStaffEstimate: number;
    totalStaff: number;
    todayRegistrations: number;
    todayNewlyJoined: number;
    todayBlocked: number;
    todayPaidConversions: Array<{
      invoiceNumber: string;
      amount: number;
      packageName: string;
      memberId: string;
      memberName: string;
      branchName: string;
      agentOrStaff: string;
      createdAt: string;
    }>;
  };
  charts: {
    revenueTrend: Array<{ date: string; revenue: number }>;
    memberGrowthTrend: Array<{ date: string; total: number; paid: number; free: number }>;
    orgPerformance: Array<{
      id: string;
      name: string;
      type: string;
      totalMembers: number;
      totalStaff: number;
    }>;
    roleDistribution: Array<{ role: string; count: number }>;
    staffWorkOverview: Array<{
      staffId: string;
      employeeId: string;
      name: string;
      role: string;
      profilesCreated: number;
      profilesEdited: number;
      profilesBlocked: number;
      paymentsProcessed: number;
    }>;
  };
  alerts: {
    upcomingPaymentAlerts: any[];
    overdueFollowUps: any[];
    pendingTasks: {
      pendingInvoices: number;
      pendingUpdateRequests: number;
      pendingTickets: number;
    };
    recentActivity: Array<{
      id: string;
      actor: string;
      role: string;
      action: string;
      resourceType: string;
      timestamp: string;
    }>;
  };
}

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminDashboard();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="admin-dashboard-root" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#334155' }}>Loading Real-Time HQ Metrics...</div>
        <p style={{ color: '#64748b' }}>Querying live Supabase PostgreSQL data</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="admin-dashboard-root" style={{ padding: '40px 20px' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: 16, borderRadius: 8 }}>
          <strong>Error loading dashboard:</strong> {error}
        </div>
        <button onClick={() => void loadData()} className="refresh-btn" style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  const counts = data?.profileCounts;
  const metrics = data?.dailyLiveMetrics;
  const charts = data?.charts;
  const alerts = data?.alerts;

  // Max revenue for bar scale
  const maxRevenue = Math.max(...(charts?.revenueTrend.map((r) => r.revenue) || [1]), 1000);

  return (
    <div className="admin-dashboard-root">
      {/* Topbar */}
      <div className="dashboard-topbar">
        <div className="topbar-titles">
          <h2>HQ Operational Dashboard</h2>
          <p>Real-time telemetry, profile demographics, revenue trends, and operational activity</p>
        </div>
        <div className="topbar-actions">
          <span className="live-indicator">
            <span className="live-dot" /> Live DB Telemetry
          </span>
          <button onClick={() => void loadData()} className="refresh-btn">
            🔄 Refresh ({lastRefreshed.toLocaleTimeString()})
          </button>
        </div>
      </div>

      {/* 5.1 PROFILE COUNT BOXES */}
      <section>
        <h3 className="section-heading">📊 Profile Demographic & Registration Metrics</h3>
        <div className="stats-grid">
          {/* Total Registered */}
          <div className="stat-card card-blue">
            <div className="stat-header">
              <span className="stat-label">Total Registered</span>
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-value">{counts?.totalRegistered ?? 0}</div>
            <div className="stat-subtext">All verified member profiles in system</div>
          </div>

          {/* Free Profiles */}
          <div className="stat-card card-cyan">
            <div className="stat-header">
              <span className="stat-label">Free Profiles</span>
              <span className="stat-icon">🆓</span>
            </div>
            <div className="stat-value">{counts?.freeProfiles ?? 0}</div>
            <div className="stat-subtext">Unpaid base registration tier</div>
          </div>

          {/* Paid Profiles & Package-Wise Breakdown */}
          <div className="stat-card card-emerald">
            <div className="stat-header">
              <span className="stat-label">Paid Profiles (Total: {counts?.totalPaidProfiles ?? 0})</span>
              <span className="stat-icon">💎</span>
            </div>
            <div className="package-breakdown-row">
              {counts?.packageBreakdown && counts.packageBreakdown.length > 0 ? (
                counts.packageBreakdown.map((pkg) => (
                  <div key={pkg.packageId} className="pkg-chip">
                    <span className="pkg-chip-name">{pkg.packageName}:</span>
                    <span className="pkg-chip-count">{pkg.count}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>No active package subscriptions</span>
              )}
            </div>
            <div className="stat-subtext">Individual counts per tier (Silver/Gold/Platinum)</div>
          </div>

          {/* Blocked Profiles */}
          <div className="stat-card card-amber">
            <div className="stat-header">
              <span className="stat-label">Blocked Profiles</span>
              <span className="stat-icon">🚫</span>
            </div>
            <div className="stat-value">{counts?.blockedProfiles ?? 0}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="tag-badge tag-warning">Settled: {counts?.marriageSettledCount ?? 0}</span>
              <span className="tag-badge tag-danger">Not Interested: {counts?.notInterestedCount ?? 0}</span>
            </div>
          </div>

          {/* Terminated Profiles */}
          <div className="stat-card card-rose">
            <div className="stat-header">
              <span className="stat-label">Terminated Profiles</span>
              <span className="stat-icon">⌛</span>
            </div>
            <div className="stat-value">{counts?.terminatedProfiles ?? 0}</div>
            <div className="stat-subtext">Profiles with expired paid validity</div>
          </div>
        </div>
      </section>

      {/* 5.1 DAILY LIVE METRICS */}
      <section>
        <h3 className="section-heading">⚡ Daily Operational Live Metrics (Today)</h3>
        <div className="metrics-banner-grid">
          <div className="metric-banner-item">
            <span className="metric-banner-label">New Registrations Today</span>
            <span className="metric-banner-val">{metrics?.todayRegistrations ?? 0}</span>
          </div>
          <div className="metric-banner-item">
            <span className="metric-banner-label">Newly Joined (Completed Step 5)</span>
            <span className="metric-banner-val" style={{ color: '#059669' }}>{metrics?.todayNewlyJoined ?? 0}</span>
          </div>
          <div className="metric-banner-item">
            <span className="metric-banner-label">Members Blocked Today</span>
            <span className="metric-banner-val" style={{ color: '#dc2626' }}>{metrics?.todayBlocked ?? 0}</span>
          </div>
          <div className="metric-banner-item">
            <span className="metric-banner-label">Active Staff (Recent Logins)</span>
            <span className="metric-banner-val" style={{ color: '#2563eb' }}>
              {metrics?.onlineStaffEstimate ?? 0} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ {metrics?.totalStaff ?? 0}</span>
            </span>
          </div>
        </div>

        {/* Today's Paid Conversions Table */}
        <div className="panel-card" style={{ marginTop: 16 }}>
          <h4 className="panel-card-title">
            <span>💳 Today's Paid Conversions</span>
            <span className="tag-badge tag-success">{metrics?.todayPaidConversions?.length ?? 0} conversions today</span>
          </h4>
          {metrics?.todayPaidConversions && metrics.todayPaidConversions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Member</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Branch</th>
                    <th>Agent / Staff</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.todayPaidConversions.map((conv, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{conv.invoiceNumber}</td>
                      <td>
                        {conv.memberName} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({conv.memberId})</span>
                      </td>
                      <td><span className="tag-badge tag-info">{conv.packageName}</span></td>
                      <td style={{ fontWeight: 700 }}>₹{conv.amount.toLocaleString()}</td>
                      <td>{conv.branchName}</td>
                      <td>{conv.agentOrStaff}</td>
                      <td>{new Date(conv.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>
              No paid conversions processed yet today.
            </p>
          )}
        </div>
      </section>

      {/* 5.1 CHARTS & ANALYTICS */}
      <section className="dashboard-grid-2col">
        {/* Left Column: Revenue Trend & Org Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Revenue Trend Visualizer */}
          <div className="panel-card">
            <h4 className="panel-card-title">
              <span>📈 30-Day Revenue Trend (Approved Invoices)</span>
            </h4>
            {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
              <div className="trend-bars-container">
                {charts.revenueTrend.map((pt, idx) => {
                  const heightPercent = Math.max(8, Math.round((pt.revenue / maxRevenue) * 100));
                  return (
                    <div key={idx} className="trend-bar-wrapper">
                      <div
                        className="trend-bar-fill"
                        style={{ height: `${heightPercent}%` }}
                        data-tooltip={`${pt.date}: ₹${pt.revenue.toLocaleString()}`}
                      />
                      <span className="trend-bar-date">{pt.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No approved revenue records in the last 30 days.</p>
            )}
          </div>

          {/* Organization Performance Table */}
          <div className="panel-card">
            <h4 className="panel-card-title">🏢 Organization & Branch Performance</h4>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Unit Name</th>
                  <th>Type</th>
                  <th>Total Members</th>
                  <th>Staff Count</th>
                </tr>
              </thead>
              <tbody>
                {charts?.orgPerformance && charts.orgPerformance.length > 0 ? (
                  charts.orgPerformance.map((org) => (
                    <tr key={org.id}>
                      <td style={{ fontWeight: 600 }}>{org.name}</td>
                      <td><span className="tag-badge tag-info">{org.type}</span></td>
                      <td>{org.totalMembers}</td>
                      <td>{org.totalStaff}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No units recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Staff Work Overview Table */}
          <div className="panel-card">
            <h4 className="panel-card-title">👨‍💼 Staff Work Overview (Last 7 Days Activity)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Edited</th>
                    <th>Blocked</th>
                    <th>Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {charts?.staffWorkOverview && charts.staffWorkOverview.length > 0 ? (
                    charts.staffWorkOverview.map((st) => (
                      <tr key={st.staffId}>
                        <td style={{ fontWeight: 600 }}>{st.employeeId}</td>
                        <td>{st.name}</td>
                        <td><span className="tag-badge tag-info">{st.role}</span></td>
                        <td>{st.profilesCreated}</td>
                        <td>{st.profilesEdited}</td>
                        <td>{st.profilesBlocked}</td>
                        <td>{st.paymentsProcessed}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>No recorded staff activity this week</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Tasks, Alerts & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pending Tasks Panel */}
          <div className="panel-card">
            <h4 className="panel-card-title">📌 Pending Tasks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem' }}>Pending Invoice Approvals</span>
                <span className="pending-counter-badge">{alerts?.pendingTasks?.pendingInvoices ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem' }}>Profile Update Requests</span>
                <span className="pending-counter-badge" style={{ background: '#f59e0b' }}>
                  {alerts?.pendingTasks?.pendingUpdateRequests ?? 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.875rem' }}>Open Support Tickets</span>
                <span className="pending-counter-badge" style={{ background: '#3b82f6' }}>
                  {alerts?.pendingTasks?.pendingTickets ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Role Distribution */}
          <div className="panel-card">
            <h4 className="panel-card-title">👥 Platform Role Distribution</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {charts?.roleDistribution?.map((rd, i) => (
                <div key={i} className="pkg-chip" style={{ background: '#f1f5f9' }}>
                  <span className="pkg-chip-name">{rd.role}:</span>
                  <span className="pkg-chip-count" style={{ background: '#3b82f6' }}>{rd.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit Activity Log */}
          <div className="panel-card">
            <h4 className="panel-card-title">🕒 Recent Platform Activity</h4>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {alerts?.recentActivity && alerts.recentActivity.length > 0 ? (
                alerts.recentActivity.map((act) => (
                  <div key={act.id} className="alert-item">
                    <span className="alert-icon">⚡</span>
                    <div className="alert-content">
                      <p className="alert-title">
                        <strong>{act.actor}</strong> ({act.role}): {act.action}
                      </p>
                      <div className="alert-time">
                        {new Date(act.timestamp).toLocaleString()} • {act.resourceType || 'System'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No recent audit events.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default AdminDashboard;
