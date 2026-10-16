import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAgentDashboard,
  fetchAgentProfiles,
  fetchAgentInvoices,
  AgentDashboardResponse,
  AgentProfileItem,
  AgentInvoiceItem,
} from '../services/agentApi';
import { useAuth } from '../auth/AuthProvider';
import './AgentDashboardPage.css';

export const AgentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<AgentDashboardResponse | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<AgentProfileItem[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<AgentInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [dashRes, profRes, invRes] = await Promise.all([
          fetchAgentDashboard(),
          fetchAgentProfiles({ limit: 5 }),
          fetchAgentInvoices({ limit: 5 }),
        ]);
        setDashboardData(dashRes);
        setRecentProfiles(profRes.data || []);
        setRecentInvoices(invRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load Agent Dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="agent-dashboard">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <h3>Loading Agent Portal...</h3>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="agent-dashboard">
        <div className="agent-warning-banner">
          <div className="agent-info-icon">⚠️</div>
          <div>
            <h4>Unable to Load Agent Portal</h4>
            <p>{error || 'An error occurred while loading your agent data.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isBranchAgent = dashboardData.agent.role === 'BRANCH_AGENT';

  return (
    <div className="agent-dashboard">
      {/* Top Hero Banner */}
      <div className="agent-hero-card">
        <div>
          <span
            className={`agent-badge-tag ${
              isBranchAgent ? 'agent-badge-branch' : 'agent-badge-franchise'
            }`}
          >
            {isBranchAgent ? '🏢 Branch Agent' : '💼 Franchise Agent'}
          </span>
          <h2 className="agent-title">
            Welcome, {dashboardData.agent.fullName || user?.mobile}
          </h2>
          <p className="agent-subtitle">
            {dashboardData.agent.organization?.name || 'Assigned Organization'} | ID:{' '}
            {dashboardData.agent.employeeId || dashboardData.agent.id.slice(0, 8)}
          </p>
        </div>
        <div className="agent-quick-actions">
          <Link to="/agent/profiles/new" className="btn-action-primary">
            <span>➕</span> Register New Member
          </Link>
          <Link to="/agent/invoices" className="btn-action-secondary">
            <span>💳</span> Raise Invoice Request
          </Link>
        </div>
      </div>

      {/* Role Notice Banner */}
      {isBranchAgent ? (
        <div className="agent-info-banner">
          <div className="agent-info-icon">🏢</div>
          <div className="agent-info-text">
            <h4>Branch Agent Scope Notice</h4>
            <p>
              You have access <strong>strictly to member profiles you personally created</strong>.
              Invoice requests raised by you are forwarded <strong>directly to HQ Admin</strong> for
              review and package activation.
            </p>
          </div>
        </div>
      ) : (
        <div className="agent-info-banner">
          <div className="agent-info-icon">💼</div>
          <div className="agent-info-text">
            <h4>Franchise Agent Scope Notice</h4>
            <p>
              You have access <strong>strictly to member profiles you personally created</strong>.
              Invoice requests raised by you are routed to your{' '}
              <strong>assigned Franchise Manager</strong> for wallet validation & approval.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="agent-stats-grid">
        <div className="agent-stat-card">
          <div className="agent-stat-icon icon-blue">👥</div>
          <div className="agent-stat-title">Created Profiles</div>
          <div className="agent-stat-value">{dashboardData.stats.totalProfilesCreated}</div>
          <div className="agent-stat-desc">Personally registered by you</div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon icon-amber">⏳</div>
          <div className="agent-stat-title">Pending Invoices</div>
          <div className="agent-stat-value">{dashboardData.stats.pendingInvoices}</div>
          <div className="agent-stat-desc">Awaiting management approval</div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon icon-emerald">✅</div>
          <div className="agent-stat-title">Approved Invoices</div>
          <div className="agent-stat-value">{dashboardData.stats.approvedInvoices}</div>
          <div className="agent-stat-desc">Successfully activated packages</div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon icon-rose">❌</div>
          <div className="agent-stat-title">Rejected / Cancelled</div>
          <div className="agent-stat-value">
            {dashboardData.stats.rejectedOrCancelledInvoices}
          </div>
          <div className="agent-stat-desc">Declined or expired requests</div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon icon-violet">💰</div>
          <div className="agent-stat-title">Commissions Earned</div>
          <div className="agent-stat-value">
            ₹{dashboardData.commissions.totalEarned.toLocaleString('en-IN')}
          </div>
          <div className="agent-stat-desc">
            {dashboardData.commissions.assignedConfig
              ? `${dashboardData.commissions.assignedConfig.rateValue}${
                  dashboardData.commissions.assignedConfig.commissionType === 'PERCENTAGE'
                    ? '%'
                    : ' INR'
                } configured rate`
              : 'Standard platform rate'}
          </div>
        </div>
      </div>

      {/* Content Columns */}
      <div className="agent-content-grid">
        {/* Left Column: Recent Member Profiles */}
        <div>
          <div className="agent-card-section">
            <div className="agent-card-header">
              <h3 className="agent-card-title">Recent Created Profiles</h3>
              <Link to="/agent/profiles" className="agent-card-link">
                View All ({dashboardData.stats.totalProfilesCreated}) →
              </Link>
            </div>

            {recentProfiles.length === 0 ? (
              <div className="agent-empty-state">
                <div className="agent-empty-icon">📝</div>
                <p>No member profiles created yet.</p>
                <Link to="/agent/profiles/new" className="btn-action-primary" style={{ display: 'inline-flex', marginTop: '12px' }}>
                  Register Your First Member
                </Link>
              </div>
            ) : (
              <div className="agent-table-wrapper">
                <table className="agent-table">
                  <thead>
                    <tr>
                      <th>Member ID</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Package</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProfiles.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.memberId || 'N/A'}</strong>
                        </td>
                        <td>
                          {p.firstName} {p.lastName}
                        </td>
                        <td>{p.gender}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              p.packageType === 'PAID' ? 'status-approved' : 'status-active'
                            }`}
                          >
                            {p.packageType}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              p.isBlocked ? 'status-blocked' : 'status-active'
                            }`}
                          >
                            {p.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td>
                          <Link
                            to={`/agent/profiles/${p.id}`}
                            className="agent-card-link"
                          >
                            View / Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Invoices Table */}
          <div className="agent-card-section">
            <div className="agent-card-header">
              <h3 className="agent-card-title">Recent Invoice Requests</h3>
              <Link to="/agent/invoices" className="agent-card-link">
                View All Requests →
              </Link>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="agent-empty-state">
                <div className="agent-empty-icon">💳</div>
                <p>No invoice requests raised yet.</p>
              </div>
            ) : (
              <div className="agent-table-wrapper">
                <table className="agent-table">
                  <thead>
                    <tr>
                      <th>Request / Inv No.</th>
                      <th>Member</th>
                      <th>Package</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <div>
                            <strong>{inv.invoiceNumber || inv.requestNumber || 'PENDING'}</strong>
                          </div>
                          <small style={{ color: '#94a3b8' }}>
                            {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                          </small>
                        </td>
                        <td>
                          <div>{inv.memberProfile?.memberId || 'N/A'}</div>
                          <small style={{ color: '#64748b' }}>
                            {inv.memberProfile?.firstName} {inv.memberProfile?.lastName}
                          </small>
                        </td>
                        <td>{inv.package?.name}</td>
                        <td>₹{inv.amount.toLocaleString('en-IN')}</td>
                        <td>{inv.paymentMode}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              inv.status === 'APPROVED'
                                ? 'status-approved'
                                : inv.status === 'REJECTED'
                                ? 'status-rejected'
                                : inv.status === 'CANCELLED'
                                ? 'status-cancelled'
                                : 'status-pending'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Commission & Wallet Policy Card */}
        <div>
          <div className="agent-card-section">
            <div className="agent-card-header">
              <h3 className="agent-card-title">🎖️ Commission Summary</h3>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0 20px 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>
                ₹{dashboardData.commissions.totalEarned.toLocaleString('en-IN')}
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                Total Commission Earned
              </p>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Assigned Rate:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {dashboardData.commissions.assignedConfig
                    ? `${dashboardData.commissions.assignedConfig.rateValue}${
                        dashboardData.commissions.assignedConfig.commissionType === 'PERCENTAGE'
                          ? '%'
                          : ' INR Fixed'
                      }`
                    : 'Global Default'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Recorded Sales:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {dashboardData.commissions.totalSalesRecorded} Invoices
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Settlement:</span>
                <span style={{ fontWeight: 600, color: '#0284c7' }}>Offline Manual</span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                🔒 <strong>Wallet Policy:</strong> Branch Agents do not have an independent wallet.
                Commission figures are for auditing and reporting purposes. Payouts are settled
                offline through administration.
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link
                  to="/agent/commissions"
                  className="agent-card-link"
                  style={{ display: 'inline-block', fontWeight: 700 }}
                >
                  View Full Commission Ledger →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
