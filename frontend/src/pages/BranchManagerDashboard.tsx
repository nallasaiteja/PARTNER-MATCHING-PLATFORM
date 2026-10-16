import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBranchDashboard,
  fetchBranchMembers,
  fetchPendingVerifications,
  verifyMemberIdProof,
  blockMemberProfile,
  unblockMemberProfile,
  changeMemberDob,
  updateMemberMobile,
  fetchMemberAccountInfo,
  resetMemberPassword,
  fetchBranchSales,
  raiseBranchInvoice,
  triggerAutoCancelCheck,
  fetchStaffAttendance,
  fetchBranchLeaves,
  submitLeaveApplication,
  reviewLeaveApplication,
  fetchBranchPaymentAlerts,
  createPaymentAlert,
  triggerPaymentAlertNotifications,
} from '../services/branchApi';
import './BranchManagerDashboard.css';

type DashboardTab =
  | 'overview'
  | 'members'
  | 'verifications'
  | 'blocked'
  | 'sales'
  | 'attendance'
  | 'leaves'
  | 'invoices'
  | 'alerts';

export const BranchManagerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [leavesData, setLeavesData] = useState<any[]>([]);
  const [alertsData, setAlertsData] = useState<any[]>([]);

  // Modals & Action States
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [modalType, setModalType] = useState<
    'dob' | 'mobile' | 'account' | 'block' | 'verify' | 'invoice' | 'leave' | 'reviewLeave' | 'alert' | null
  >(null);

  // Form states
  const [dobValue, setDobValue] = useState('');
  const [dobReason, setDobReason] = useState('');
  const [mobileValue, setMobileValue] = useState('');
  const [mobileReason, setMobileReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [verifyAction, setVerifyAction] = useState<{ profileId: string; verified: boolean; rejectionReason?: string } | null>(null);

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    memberProfileId: '',
    packageId: '',
    paymentMode: 'UPI',
    saleStaffId: '',
    transactionRef: '',
    bankName: '',
    chequeDate: '',
    notes: '',
  });

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [leaveReviewStatus, setLeaveReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [leaveRejectionReason, setLeaveRejectionReason] = useState('');

  // Payment Alert form state
  const [alertForm, setAlertForm] = useState({
    memberProfileId: '',
    alertDate: '',
    alertType: 'UPGRADE_REMINDER',
    packageId: '',
    responsibleStaffId: '',
    note: '',
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ─── Initial Loaders ──────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBranchDashboard();
      setDashboardData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load branch dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const res = await fetchBranchMembers({ search: searchQuery });
      setMembers(res.data || []);
      setMembersTotal(res.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch branch members', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPendingVerifications();
      const list = Array.isArray(res) ? res : (res?.records || []);
      setVerifications(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch pending ID verifications', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBranchSales();
      setSalesData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch branch sales', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStaffAttendance();
      setAttendanceData(res || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch staff attendance', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBranchLeaves();
      setLeavesData(res || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch staff leaves', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBranchPaymentAlerts();
      setAlertsData(res || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch payment alerts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'members') loadMembers(memberSearch);
    if (activeTab === 'verifications') loadVerifications();
    if (activeTab === 'blocked') loadMembers('');
    if (activeTab === 'sales') loadSales();
    if (activeTab === 'attendance') loadAttendance();
    if (activeTab === 'leaves') loadLeaves();
    if (activeTab === 'invoices') {
      loadDashboard();
      loadMembers('');
    }
    if (activeTab === 'alerts') {
      loadAlerts();
      loadMembers('');
    }
  }, [activeTab, loadMembers, loadVerifications, loadSales, loadAttendance, loadLeaves, loadAlerts, loadDashboard, memberSearch]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleTriggerAutoCancel = async () => {
    try {
      const res = await triggerAutoCancelCheck();
      showToast(res.message, res.cancelledCount > 0 ? 'info' : 'success');
      loadDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditDobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !dobValue) return;
    try {
      await changeMemberDob(selectedMember.id, dobValue, dobReason);
      showToast(`Date of Birth successfully updated for ${selectedMember.memberId}`, 'success');
      setModalType(null);
      loadMembers(memberSearch);
      loadDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !mobileValue) return;
    try {
      await updateMemberMobile(selectedMember.id, mobileValue, mobileReason);
      showToast(`Phone number updated for ${selectedMember.memberId}`, 'success');
      setModalType(null);
      loadMembers(memberSearch);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBlockProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      await blockMemberProfile(selectedMember.id, blockReason);
      showToast(`Profile ${selectedMember.memberId} has been BLOCKED. (Unblock restricted to HQ)`, 'info');
      setModalType(null);
      setBlockReason('');
      loadMembers(memberSearch);
      loadDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUnblockAttempt = async (profileId: string) => {
    try {
      await unblockMemberProfile(profileId);
      showToast('Profile unblocked successfully', 'success');
      loadMembers('');
    } catch (err: any) {
      // Per Section 8 specification, Branch Manager is strictly forbidden to unblock.
      showToast(err.message || 'Access Denied: Branch Managers cannot unblock member profiles. Restricted to Super Admin / Admin.', 'error');
    }
  };

  const handleOpenAccountModal = async (member: any) => {
    setSelectedMember(member);
    setModalType('account');
    try {
      const info = await fetchMemberAccountInfo(member.id);
      setAccountInfo(info);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedMember) return;
    try {
      const res = await resetMemberPassword(selectedMember.id, tempPasswordInput || undefined);
      showToast(res.message || 'Password reset link sent securely to member.', 'success');
      setTempPasswordInput('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyAction) return;
    try {
      await verifyMemberIdProof(verifyAction.profileId, {
        verified: verifyAction.verified,
        rejectionReason: verifyAction.rejectionReason,
      });
      showToast(
        verifyAction.verified ? 'ID Proof Document marked as VERIFIED.' : 'ID Proof Document marked as REJECTED with reason.',
        verifyAction.verified ? 'success' : 'info',
      );
      setVerifyAction(null);
      setModalType(null);
      loadVerifications();
      loadDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRaiseInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.memberProfileId || !invoiceForm.packageId) {
      showToast('Please select both Member and Package', 'error');
      return;
    }
    try {
      const res = await raiseBranchInvoice(invoiceForm);
      showToast(`Invoice Request ${res.invoice?.invoiceNumber || ''} submitted to HQ Admin. Subject to 72h auto-cancel rule.`, 'success');
      setModalType(null);
      setInvoiceForm({
        memberProfileId: '',
        packageId: '',
        paymentMode: 'UPI',
        saleStaffId: '',
        transactionRef: '',
        bankName: '',
        chequeDate: '',
        notes: '',
      });
      loadDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      showToast('Please fill all required leave fields', 'error');
      return;
    }
    try {
      await submitLeaveApplication(leaveForm);
      showToast('Leave application submitted successfully for review', 'success');
      setModalType(null);
      setLeaveForm({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
      loadLeaves();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReviewLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    try {
      await reviewLeaveApplication(selectedLeave.id, {
        status: leaveReviewStatus,
        rejectionReason: leaveReviewStatus === 'REJECTED' ? leaveRejectionReason : undefined,
      });
      showToast(`Leave application marked as ${leaveReviewStatus}`, 'success');
      setModalType(null);
      setSelectedLeave(null);
      setLeaveRejectionReason('');
      loadLeaves();
      loadAttendance();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.memberProfileId || !alertForm.alertDate) {
      showToast('Please select member and alert date', 'error');
      return;
    }
    try {
      await createPaymentAlert(alertForm);
      showToast('Branch payment alert recorded successfully', 'success');
      setModalType(null);
      setAlertForm({
        memberProfileId: '',
        alertDate: '',
        alertType: 'UPGRADE_REMINDER',
        packageId: '',
        responsibleStaffId: '',
        note: '',
      });
      loadAlerts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTriggerAlertNotifications = async () => {
    try {
      const res = await triggerPaymentAlertNotifications();
      showToast(res.message, res.notificationsSent > 0 ? 'success' : 'info');
      loadAlerts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Blocked members list
  const blockedMembers = members.filter((m) => m.isBlocked);

  return (
    <div className="bm-dashboard-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`bm-toast bm-toast-${toastMessage.type}`}>
          {toastMessage.type === 'error' && '❌ '}
          {toastMessage.type === 'success' && '✅ '}
          {toastMessage.type === 'info' && 'ℹ️ '}
          {toastMessage.text}
        </div>
      )}

      {/* Header Banner */}
      <header className="bm-header">
        <div className="bm-header-titles">
          <div className="bm-branch-badge">
            🏢 {dashboardData?.branch?.name || 'Branch'} ({dashboardData?.branch?.code || 'PMP-BR'})
          </div>
          <h1>Branch Manager Operations Center</h1>
          <p className="bm-subtitle">
            Section 8 Dedicated Branch Management • Authorized: {dashboardData?.manager?.name || 'Manager'} (
            {dashboardData?.manager?.role || 'BRANCH_MANAGER'})
          </p>
        </div>
        <div className="bm-header-actions">
          <button className="bm-btn bm-btn-secondary" onClick={handleTriggerAutoCancel} title="Check and auto-cancel pending invoices older than 72 hours">
            ⏱️ Run 72h Rule Check
          </button>
          <button className="bm-btn bm-btn-primary" onClick={() => setModalType('invoice')}>
            ➕ Raise Invoice Request
          </button>
        </div>
      </header>

      {/* 72-Hour Auto Cancel SLA Notice */}
      <div className="bm-alert-banner">
        <div className="bm-alert-icon">⏳</div>
        <div className="bm-alert-content">
          <strong>Section 8 Financial Compliance Rule:</strong> Invoice requests submitted by Branch Managers require HQ Admin approval. Any invoice request not approved by HQ within <strong>72 hours</strong> is automatically cancelled by the system to maintain transaction integrity.
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="bm-nav-tabs">
        <button className={`bm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 Overview
        </button>
        <button className={`bm-tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          👥 Branch Members ({dashboardData?.stats?.totalMembers ?? 0})
        </button>
        <button className={`bm-tab-btn ${activeTab === 'verifications' ? 'active' : ''}`} onClick={() => setActiveTab('verifications')}>
          🪪 ID Proof Verification
          {dashboardData?.stats?.pendingVerifications > 0 && (
            <span className="bm-tab-counter">{dashboardData.stats.pendingVerifications}</span>
          )}
        </button>
        <button className={`bm-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`} onClick={() => setActiveTab('blocked')}>
          🚫 Blocked Profiles ({dashboardData?.stats?.blockedMembers ?? 0})
        </button>
        <button className={`bm-tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          💰 Branch Sales & Staff
        </button>
        <button className={`bm-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          ⏱️ Staff Attendance
        </button>
        <button className={`bm-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
          📝 Leave Applications
        </button>
        <button className={`bm-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
          🧾 Invoice Requests ({dashboardData?.stats?.pendingInvoices ?? 0})
        </button>
        <button className={`bm-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          🔔 Payment Alerts ({dashboardData?.stats?.paymentAlerts ?? 0})
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="bm-content">
        {loading && <div className="bm-loading-spinner">Loading branch data from database...</div>}

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="bm-tab-section">
            <div className="bm-kpi-grid">
              <div className="bm-kpi-card" onClick={() => setActiveTab('members')}>
                <div className="bm-kpi-icon">👥</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Branch Members</span>
                  <span className="bm-kpi-value">{dashboardData?.stats?.totalMembers ?? 0}</span>
                  <span className="bm-kpi-sub">
                    {dashboardData?.stats?.paidMembers ?? 0} Paid • {dashboardData?.stats?.freeMembers ?? 0} Free
                  </span>
                </div>
              </div>

              <div className="bm-kpi-card" onClick={() => setActiveTab('verifications')}>
                <div className="bm-kpi-icon">🪪</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Pending ID Proofs</span>
                  <span className="bm-kpi-value bm-text-warning">{dashboardData?.stats?.pendingVerifications ?? 0}</span>
                  <span className="bm-kpi-sub">Aadhaar/ID documents to verify</span>
                </div>
              </div>

              <div className="bm-kpi-card" onClick={() => setActiveTab('blocked')}>
                <div className="bm-kpi-icon">🚫</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Blocked Profiles</span>
                  <span className="bm-kpi-value bm-text-danger">{dashboardData?.stats?.blockedMembers ?? 0}</span>
                  <span className="bm-kpi-sub">Unblock restricted to HQ</span>
                </div>
              </div>

              <div className="bm-kpi-card" onClick={() => setActiveTab('sales')}>
                <div className="bm-kpi-icon">💰</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Branch Sales Revenue</span>
                  <span className="bm-kpi-value">₹{(dashboardData?.stats?.totalSalesRevenue ?? 0).toLocaleString()}</span>
                  <span className="bm-kpi-sub">Approved & Paid transactions</span>
                </div>
              </div>

              <div className="bm-kpi-card" onClick={() => setActiveTab('attendance')}>
                <div className="bm-kpi-icon">⏱️</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Staff Present Today</span>
                  <span className="bm-kpi-value">
                    {dashboardData?.stats?.presentStaffToday ?? 0} / {dashboardData?.stats?.totalStaff ?? 0}
                  </span>
                  <span className="bm-kpi-sub">Office hours: 09:30 AM – 06:30 PM</span>
                </div>
              </div>

              <div className="bm-kpi-card" onClick={() => setActiveTab('invoices')}>
                <div className="bm-kpi-icon">🧾</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Pending Invoices</span>
                  <span className="bm-kpi-value">{dashboardData?.stats?.pendingInvoices ?? 0}</span>
                  <span className="bm-kpi-sub">Auto-cancels if &gt; 72 hours</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Pending Invoices Preview */}
            <div className="bm-two-column-layout">
              <div className="bm-panel">
                <div className="bm-panel-header">
                  <h3>🧾 Pending Invoice Requests (72h SLA Monitor)</h3>
                  <button className="bm-btn-sm" onClick={() => setActiveTab('invoices')}>
                    View All
                  </button>
                </div>
                {dashboardData?.pendingInvoices?.length === 0 ? (
                  <p className="bm-empty-state">No pending invoice requests awaiting HQ approval.</p>
                ) : (
                  <div className="bm-table-responsive">
                    <table className="bm-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Member</th>
                          <th>Package</th>
                          <th>Amount</th>
                          <th>Submitted</th>
                          <th>Time Left</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData?.pendingInvoices?.map((inv: any) => {
                          const created = new Date(inv.createdAt).getTime();
                          const now = new Date().getTime();
                          const hoursRemaining = Math.max(0, 72 - Math.floor((now - created) / (1000 * 60 * 60)));
                          return (
                            <tr key={inv.id}>
                              <td className="bm-font-mono">{inv.invoiceNumber}</td>
                              <td>{inv.memberProfile?.memberId} - {inv.memberProfile?.firstName}</td>
                              <td><span className="bm-badge bm-badge-package">{inv.package?.name || 'Package'}</span></td>
                              <td>₹{Number(inv.netAmount).toLocaleString()}</td>
                              <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                              <td>
                                <span className={`bm-time-tag ${hoursRemaining <= 12 ? 'urgent' : ''}`}>
                                  ⏳ {hoursRemaining}h remaining
                                </span>
                              </td>
                              <td><span className="bm-badge bm-badge-warning">{inv.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bm-panel">
                <div className="bm-panel-header">
                  <h3>🔔 Upcoming Payment Alerts</h3>
                  <button className="bm-btn-sm" onClick={() => setActiveTab('alerts')}>
                    Manage Alerts
                  </button>
                </div>
                {dashboardData?.upcomingAlerts?.length === 0 ? (
                  <p className="bm-empty-state">No upcoming payment alerts for this branch.</p>
                ) : (
                  <ul className="bm-alerts-list">
                    {dashboardData?.upcomingAlerts?.map((alert: any) => (
                      <li key={alert.id} className="bm-alert-item">
                        <div className="bm-alert-date">
                          📅 {new Date(alert.alertDate).toLocaleDateString()}
                        </div>
                        <div className="bm-alert-details">
                          <strong>{alert.memberProfile?.firstName} {alert.memberProfile?.lastName} ({alert.memberProfile?.memberId})</strong>
                          <p>{alert.note || alert.alertType}</p>
                          <small>Responsible: {alert.responsibleStaff?.email || 'Branch Team'}</small>
                        </div>
                        <span className={`bm-badge ${alert.notificationSent ? 'bm-badge-success' : 'bm-badge-neutral'}`}>
                          {alert.notificationSent ? 'Sent' : 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: BRANCH MEMBERS ──────────────────────────────────── */}
        {activeTab === 'members' && (
          <div className="bm-tab-section">
            <div className="bm-filter-bar">
              <input
                type="text"
                className="bm-input"
                placeholder="Search member by Name, Member ID, Mobile, or Email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <button className="bm-btn bm-btn-secondary" onClick={() => loadMembers(memberSearch)}>
                🔍 Search
              </button>
            </div>

            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>Assigned Branch Member Profiles ({membersTotal})</h3>
                <span className="bm-subtext">Restricted to your assigned branch organization</span>
              </div>

              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Member ID</th>
                      <th>Full Name</th>
                      <th>Mobile</th>
                      <th>DOB</th>
                      <th>Gender</th>
                      <th>Caste</th>
                      <th>Package</th>
                      <th>Status</th>
                      <th>ID Proof</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="bm-empty-state">No member profiles found in your branch.</td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr key={m.id}>
                          <td className="bm-font-mono"><strong>{m.memberId}</strong></td>
                          <td>{m.firstName} {m.lastName}</td>
                          <td>{m.user?.mobile || 'N/A'}</td>
                          <td>{m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
                          <td>{m.gender || 'N/A'}</td>
                          <td>{m.caste || 'N/A'}</td>
                          <td>
                            <span className={`bm-badge ${m.packageType === 'PAID' ? 'bm-badge-package' : 'bm-badge-neutral'}`}>
                              {m.packageType}
                            </span>
                          </td>
                          <td>
                            <span className={`bm-badge ${m.isBlocked ? 'bm-badge-danger' : 'bm-badge-success'}`}>
                              {m.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                            </span>
                          </td>
                          <td>
                            <span className={`bm-badge ${
                              m.idProofStatus === 'VERIFIED' ? 'bm-badge-success' : m.idProofStatus === 'PENDING' ? 'bm-badge-warning' : 'bm-badge-neutral'
                            }`}>
                              {m.idProofStatus || 'MISSING'}
                            </span>
                          </td>
                          <td className="bm-table-actions">
                            {/* BM Allowed Actions */}
                            <button
                              className="bm-btn-sm"
                              title="Edit Member Date of Birth (Section 8 Allowed)"
                              onClick={() => {
                                setSelectedMember(m);
                                setDobValue(m.dateOfBirth ? m.dateOfBirth.split('T')[0] : '');
                                setModalType('dob');
                              }}
                            >
                              🎂 Edit DOB
                            </button>
                            <button
                              className="bm-btn-sm"
                              title="Update Phone Number (Section 8 Allowed)"
                              onClick={() => {
                                setSelectedMember(m);
                                setMobileValue(m.user?.mobile || '');
                                setModalType('mobile');
                              }}
                            >
                              📞 Phone
                            </button>
                            <button
                              className="bm-btn-sm"
                              title="View Account Info & Password Reset"
                              onClick={() => handleOpenAccountModal(m)}
                            >
                              🔐 Account
                            </button>
                            {!m.isBlocked ? (
                              <button
                                className="bm-btn-sm bm-btn-sm-danger"
                                title="Block Member Profile (Branch Manager allowed to block)"
                                onClick={() => {
                                  setSelectedMember(m);
                                  setModalType('block');
                                }}
                              >
                                🚫 Block
                              </button>
                            ) : (
                              <button
                                className="bm-btn-sm"
                                disabled
                                title="Unblock strictly restricted to Super Admin / Admin per Section 8"
                                onClick={() => handleUnblockAttempt(m.id)}
                              >
                                🔒 Unblock (HQ Only)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: ID PROOF VERIFICATION ─────────────────────────── */}
        {activeTab === 'verifications' && (
          <div className="bm-tab-section">
            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>🪪 Member Aadhaar & ID Proof Verification Queue</h3>
                <span className="bm-subtext">Review uploaded documents, verify identity, or record formal rejection reasons</span>
              </div>

              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Member ID</th>
                      <th>Member Name</th>
                      <th>Doc Type</th>
                      <th>Document / Proof</th>
                      <th>Status</th>
                      <th>Reviewed By</th>
                      <th>Review Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="bm-empty-state">No pending ID proof documents in your branch queue.</td>
                      </tr>
                    ) : (
                      verifications.map((v) => (
                        <tr key={v.id}>
                          <td className="bm-font-mono"><strong>{v.memberId}</strong></td>
                          <td>{v.firstName} {v.lastName}</td>
                          <td>{v.idProofType || 'Aadhaar / ID'}</td>
                          <td>
                            {v.idProofDocumentUrl ? (
                              <a href={v.idProofDocumentUrl} target="_blank" rel="noopener noreferrer" className="bm-link">
                                📄 View Uploaded Document
                              </a>
                            ) : (
                              <span className="bm-subtext">No Document File</span>
                            )}
                          </td>
                          <td>
                            <span className={`bm-badge ${
                              v.idProofStatus === 'VERIFIED' ? 'bm-badge-success' : v.idProofStatus === 'REJECTED' ? 'bm-badge-danger' : 'bm-badge-warning'
                            }`}>
                              {v.idProofStatus}
                            </span>
                          </td>
                          <td>{v.idProofReviewedBy?.email || 'Pending Review'}</td>
                          <td>{v.idProofReviewedAt ? new Date(v.idProofReviewedAt).toLocaleString() : 'N/A'}</td>
                          <td className="bm-table-actions">
                            <button
                              className="bm-btn-sm bm-btn-sm-success"
                              onClick={() => {
                                setVerifyAction({ profileId: v.id, verified: true });
                                setModalType('verify');
                              }}
                            >
                              ✅ Verify
                            </button>
                            <button
                              className="bm-btn-sm bm-btn-sm-danger"
                              onClick={() => {
                                setVerifyAction({ profileId: v.id, verified: false, rejectionReason: '' });
                                setModalType('verify');
                              }}
                            >
                              ❌ Reject
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: BLOCKED PROFILES ───────────────────────────────── */}
        {activeTab === 'blocked' && (
          <div className="bm-tab-section">
            <div className="bm-alert-banner">
              <div className="bm-alert-icon">🛡️</div>
              <div className="bm-alert-content">
                <strong>Section 8 Permission Model:</strong> Branch Managers can block member profiles within their branch for policy violations or fraud, but <strong>CANNOT UNBLOCK</strong> them. Profile unblocking is strictly reserved for Super Admin / Admin at HQ.
              </div>
            </div>

            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>🚫 Blocked Branch Profiles ({blockedMembers.length})</h3>
              </div>

              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Member ID</th>
                      <th>Name</th>
                      <th>Blocked Date</th>
                      <th>Block Reason</th>
                      <th>Status</th>
                      <th>Unblock Permission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="bm-empty-state">No blocked profiles in your branch.</td>
                      </tr>
                    ) : (
                      blockedMembers.map((m) => (
                        <tr key={m.id}>
                          <td className="bm-font-mono"><strong>{m.memberId}</strong></td>
                          <td>{m.firstName} {m.lastName}</td>
                          <td>{m.blockedAt ? new Date(m.blockedAt).toLocaleString() : 'N/A'}</td>
                          <td className="bm-text-danger">{m.blockReason || 'Policy Violation'}</td>
                          <td><span className="bm-badge bm-badge-danger">BLOCKED</span></td>
                          <td>
                            <button
                              className="bm-btn-sm"
                              onClick={() => handleUnblockAttempt(m.id)}
                              title="Unblocking is disabled for Branch Managers per specification"
                            >
                              🔒 Unblock (Restricted to HQ)
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: BRANCH SALES & STAFF SALES ─────────────────────── */}
        {activeTab === 'sales' && (
          <div className="bm-tab-section">
            <div className="bm-kpi-grid">
              <div className="bm-kpi-card">
                <div className="bm-kpi-icon">💵</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Total Branch Revenue</span>
                  <span className="bm-kpi-value">₹{(salesData?.totals?.totalRevenue ?? 0).toLocaleString()}</span>
                  <span className="bm-kpi-sub">Total Paid: {salesData?.totals?.totalCount ?? 0} Invoices</span>
                </div>
              </div>
              <div className="bm-kpi-card">
                <div className="bm-kpi-icon">📅</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Month-to-Date Revenue</span>
                  <span className="bm-kpi-value">₹{(salesData?.totals?.monthlyRevenue ?? 0).toLocaleString()}</span>
                  <span className="bm-kpi-sub">Current calendar month</span>
                </div>
              </div>
              <div className="bm-kpi-card">
                <div className="bm-kpi-icon">⚡</div>
                <div className="bm-kpi-info">
                  <span className="bm-kpi-label">Today's Revenue</span>
                  <span className="bm-kpi-value">₹{(salesData?.totals?.dailyRevenue ?? 0).toLocaleString()}</span>
                  <span className="bm-kpi-sub">Transactions approved today</span>
                </div>
              </div>
            </div>

            {/* Staff-wise Sales Breakdown */}
            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>👥 Staff-Wise Sales Breakdown</h3>
                <span className="bm-subtext">Sales volume and revenue grouped by branch team members</span>
              </div>
              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Staff Name / Email</th>
                      <th>Role</th>
                      <th>Sales Count</th>
                      <th>Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData?.staffWise?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="bm-empty-state">No staff sales records recorded yet.</td>
                      </tr>
                    ) : (
                      salesData?.staffWise?.map((st: any) => (
                        <tr key={st.staffId}>
                          <td><strong>{st.staffName}</strong> ({st.staffEmail})</td>
                          <td><span className="bm-badge bm-badge-neutral">{st.role}</span></td>
                          <td>{st.salesCount} deals</td>
                          <td><strong>₹{st.totalRevenue.toLocaleString()}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Completed Invoices */}
            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>🧾 Recent Approved Branch Invoices</h3>
              </div>
              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Member</th>
                      <th>Package</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Approved At</th>
                      <th>Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData?.invoices?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="bm-empty-state">No approved invoices recorded yet.</td>
                      </tr>
                    ) : (
                      salesData?.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="bm-font-mono">{inv.invoiceNumber}</td>
                          <td>{inv.memberProfile?.memberId} - {inv.memberProfile?.firstName} {inv.memberProfile?.lastName}</td>
                          <td><span className="bm-badge bm-badge-package">{inv.package?.name}</span></td>
                          <td>₹{Number(inv.netAmount).toLocaleString()}</td>
                          <td>{inv.paymentMode}</td>
                          <td>{inv.approvedAt ? new Date(inv.approvedAt).toLocaleString() : 'N/A'}</td>
                          <td>{inv.saleStaff?.email || 'Branch'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: STAFF ATTENDANCE TRACKING ──────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="bm-tab-section">
            <div className="bm-alert-banner">
              <div className="bm-alert-icon">⏱️</div>
              <div className="bm-alert-content">
                <strong>Section 8 Attendance Tracking Rules:</strong> Attendance is determined by staff platform login activity during defined office hours (<strong>09:30 AM – 06:30 PM</strong>). Active login permissions during office hours mark the staff member <strong>PRESENT</strong> with 9.0 working hours. Inactive permissions record <strong>ABSENT</strong>.
              </div>
            </div>

            <div className="bm-panel">
              <div className="bm-panel-header">
                <h3>Staff Attendance Status — Today</h3>
                <button className="bm-btn-sm" onClick={() => loadAttendance()}>
                  🔄 Refresh Status
                </button>
              </div>

              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Date</th>
                      <th>Attendance Status</th>
                      <th>First Login</th>
                      <th>Last Active</th>
                      <th>Working Hours</th>
                      <th>Permission State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="bm-empty-state">No branch staff assigned.</td>
                      </tr>
                    ) : (
                      attendanceData.map((att: any) => (
                        <tr key={att.staffId}>
                          <td><strong>{att.name}</strong><br /><small>{att.email}</small></td>
                          <td><span className="bm-badge bm-badge-neutral">{att.role}</span></td>
                          <td>{att.date}</td>
                          <td>
                            <span className={`bm-badge ${
                              att.status === 'PRESENT' ? 'bm-badge-success' : att.status === 'ON_LEAVE' ? 'bm-badge-warning' : 'bm-badge-danger'
                            }`}>
                              {att.status}
                            </span>
                          </td>
                          <td>{att.firstLogin ? new Date(att.firstLogin).toLocaleTimeString() : 'No activity'}</td>
                          <td>{att.lastActive ? new Date(att.lastActive).toLocaleTimeString() : 'N/A'}</td>
                          <td><strong>{att.workingHours} hrs</strong></td>
                          <td>
                            <span className={`bm-badge ${att.hasActivePermissions ? 'bm-badge-success' : 'bm-badge-danger'}`}>
                              {att.hasActivePermissions ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 7: LEAVE APPLICATIONS ─────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div className="bm-tab-section">
            <div className="bm-filter-bar">
              <h3>Staff Leave Applications</h3>
              <button className="bm-btn bm-btn-primary" onClick={() => setModalType('leave')}>
                ➕ Submit Leave Application
              </button>
            </div>

            <div className="bm-panel">
              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Reviewed By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leavesData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="bm-empty-state">No leave applications found for this branch.</td>
                      </tr>
                    ) : (
                      leavesData.map((lv: any) => (
                        <tr key={lv.id}>
                          <td><strong>{lv.staff?.email}</strong></td>
                          <td><span className="bm-badge bm-badge-neutral">{lv.leaveType}</span></td>
                          <td>{new Date(lv.startDate).toLocaleDateString()}</td>
                          <td>{new Date(lv.endDate).toLocaleDateString()}</td>
                          <td>{lv.reason}</td>
                          <td>
                            <span className={`bm-badge ${
                              lv.status === 'APPROVED' ? 'bm-badge-success' : lv.status === 'REJECTED' ? 'bm-badge-danger' : 'bm-badge-warning'
                            }`}>
                              {lv.status}
                            </span>
                          </td>
                          <td>{lv.reviewedBy?.email || 'Pending'}</td>
                          <td>
                            {lv.status === 'PENDING' && (
                              <button
                                className="bm-btn-sm"
                                onClick={() => {
                                  setSelectedLeave(lv);
                                  setModalType('reviewLeave');
                                }}
                              >
                                ✍️ Review Leave
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 8: INVOICE REQUESTS ───────────────────────────────── */}
        {activeTab === 'invoices' && (
          <div className="bm-tab-section">
            <div className="bm-filter-bar">
              <div className="bm-section-title">
                <h3>Branch Invoice Requests (HQ Approval Queue)</h3>
                <span className="bm-subtext">Raise requests to HQ Admin • Auto-cancelled after 72 hours if unapproved</span>
              </div>
              <button className="bm-btn bm-btn-primary" onClick={() => setModalType('invoice')}>
                ➕ Raise New Invoice Request
              </button>
            </div>

            <div className="bm-panel">
              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Member</th>
                      <th>Package</th>
                      <th>Net Amount</th>
                      <th>Payment Mode</th>
                      <th>Submitted At</th>
                      <th>72h SLA Status</th>
                      <th>Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.pendingInvoices?.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="bm-empty-state">No pending invoice requests.</td>
                      </tr>
                    ) : (
                      dashboardData?.pendingInvoices?.map((inv: any) => {
                        const created = new Date(inv.createdAt).getTime();
                        const now = new Date().getTime();
                        const hoursRemaining = Math.max(0, 72 - Math.floor((now - created) / (1000 * 60 * 60)));
                        return (
                          <tr key={inv.id}>
                            <td className="bm-font-mono"><strong>{inv.invoiceNumber}</strong></td>
                            <td>{inv.memberProfile?.memberId} - {inv.memberProfile?.firstName} {inv.memberProfile?.lastName}</td>
                            <td><span className="bm-badge bm-badge-package">{inv.package?.name}</span></td>
                            <td>₹{Number(inv.netAmount).toLocaleString()}</td>
                            <td>{inv.paymentMode}</td>
                            <td>{new Date(inv.createdAt).toLocaleString()}</td>
                            <td>
                              {hoursRemaining > 0 ? (
                                <span className={`bm-time-tag ${hoursRemaining <= 12 ? 'urgent' : ''}`}>
                                  ⏳ {hoursRemaining}h remaining
                                </span>
                              ) : (
                                <span className="bm-time-tag urgent">Expired (&gt;72h)</span>
                              )}
                            </td>
                            <td>
                              <span className="bm-badge bm-badge-warning">{inv.status}</span>
                              <div className="bm-subtext" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                                Awaiting HQ Admin
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 9: PAYMENT ALERTS ─────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="bm-tab-section">
            <div className="bm-filter-bar">
              <div className="bm-section-title">
                <h3>Branch-Level Payment Alerts</h3>
                <span className="bm-subtext">Alerts trigger notifications on the scheduled date (duplicate dispatches prevented)</span>
              </div>
              <div className="bm-btn-group">
                <button className="bm-btn bm-btn-secondary" onClick={handleTriggerAlertNotifications}>
                  🚀 Trigger Due Alerts Now
                </button>
                <button className="bm-btn bm-btn-primary" onClick={() => setModalType('alert')}>
                  ➕ Set New Payment Alert
                </button>
              </div>
            </div>

            <div className="bm-panel">
              <div className="bm-table-responsive">
                <table className="bm-table">
                  <thead>
                    <tr>
                      <th>Member ID & Name</th>
                      <th>Alert Date</th>
                      <th>Alert Type</th>
                      <th>Responsible Staff</th>
                      <th>Note / Instructions</th>
                      <th>Notification Status</th>
                      <th>Dispatched At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="bm-empty-state">No payment alerts scheduled for this branch.</td>
                      </tr>
                    ) : (
                      alertsData.map((al: any) => (
                        <tr key={al.id}>
                          <td><strong>{al.memberProfile?.memberId}</strong> - {al.memberProfile?.firstName} {al.memberProfile?.lastName}</td>
                          <td>📅 {new Date(al.alertDate).toLocaleDateString()}</td>
                          <td><span className="bm-badge bm-badge-neutral">{al.alertType || 'PAYMENT'}</span></td>
                          <td>{al.responsibleStaff?.email || 'Branch Team'}</td>
                          <td>{al.note || 'None'}</td>
                          <td>
                            <span className={`bm-badge ${al.notificationSent ? 'bm-badge-success' : 'bm-badge-warning'}`}>
                              {al.notificationSent ? 'NOTIFIED' : 'PENDING'}
                            </span>
                          </td>
                          <td>{al.notificationSentAt ? new Date(al.notificationSentAt).toLocaleString() : 'Not sent yet'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODALS ─────────────────────────────────────────────────── */}

      {/* 1. Edit DOB Modal */}
      {modalType === 'dob' && selectedMember && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>🎂 Edit Date of Birth</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleEditDobSubmit}>
              <div className="bm-modal-body">
                <p>
                  Member: <strong>{selectedMember.memberId}</strong> ({selectedMember.firstName} {selectedMember.lastName})
                </p>
                <div className="bm-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    className="bm-input"
                    value={dobValue}
                    required
                    onChange={(e) => setDobValue(e.target.value)}
                  />
                </div>
                <div className="bm-form-group">
                  <label>Audit Reason for Date of Birth Change</label>
                  <input
                    type="text"
                    className="bm-input"
                    placeholder="e.g. Corrected as per Aadhaar Card proof"
                    value={dobReason}
                    required
                    onChange={(e) => setDobReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Update Mobile Modal */}
      {modalType === 'mobile' && selectedMember && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>📞 Update Member Phone Number</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateMobileSubmit}>
              <div className="bm-modal-body">
                <p>
                  Member: <strong>{selectedMember.memberId}</strong> ({selectedMember.firstName} {selectedMember.lastName})
                </p>
                <div className="bm-form-group">
                  <label>New Mobile Number</label>
                  <input
                    type="tel"
                    className="bm-input"
                    placeholder="10-digit mobile number"
                    value={mobileValue}
                    required
                    onChange={(e) => setMobileValue(e.target.value)}
                  />
                </div>
                <div className="bm-form-group">
                  <label>Reason for Mobile Update</label>
                  <input
                    type="text"
                    className="bm-input"
                    placeholder="e.g. Member requested number change via verified call"
                    value={mobileReason}
                    required
                    onChange={(e) => setMobileReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-primary">
                  Update Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Account / Password Assistance Modal */}
      {modalType === 'account' && selectedMember && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>🔐 Member Account & Password Assistance</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <div className="bm-modal-body">
              <div className="bm-account-info-box">
                <p><strong>Member ID:</strong> {selectedMember.memberId}</p>
                <p><strong>Name:</strong> {selectedMember.firstName} {selectedMember.lastName}</p>
                <p><strong>Login Email:</strong> {accountInfo?.user?.email || selectedMember.user?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {accountInfo?.user?.mobile || selectedMember.user?.mobile || 'N/A'}</p>
                <p><strong>Account Status:</strong> {accountInfo?.user?.status || 'ACTIVE'}</p>
              </div>
              <div className="bm-security-note">
                🔒 <strong>Security Policy:</strong> Passwords are cryptographically hashed and never stored or returned in plaintext. You can trigger a secure password reset for the member below.
              </div>
              <div className="bm-form-group" style={{ marginTop: '16px' }}>
                <label>Set Temporary Password (Optional)</label>
                <input
                  type="text"
                  className="bm-input"
                  placeholder="Leave empty to send email/SMS reset link"
                  value={tempPasswordInput}
                  onChange={(e) => setTempPasswordInput(e.target.value)}
                />
              </div>
            </div>
            <div className="bm-modal-footer">
              <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                Close
              </button>
              <button type="button" className="bm-btn bm-btn-primary" onClick={handleResetPasswordSubmit}>
                Trigger Password Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Block Profile Modal */}
      {modalType === 'block' && selectedMember && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>🚫 Block Member Profile</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleBlockProfileSubmit}>
              <div className="bm-modal-body">
                <p className="bm-text-danger">
                  Are you sure you want to block member <strong>{selectedMember.memberId}</strong> ({selectedMember.firstName} {selectedMember.lastName})?
                </p>
                <div className="bm-alert-banner">
                  <div className="bm-alert-content">
                    ⚠️ <strong>Notice:</strong> Once blocked, Branch Managers <strong>cannot unblock</strong> this profile. Only Super Admin / Admin at HQ can unblock member profiles.
                  </div>
                </div>
                <div className="bm-form-group">
                  <label>Mandatory Block Reason</label>
                  <textarea
                    className="bm-textarea"
                    required
                    placeholder="Provide detailed justification for blocking this profile..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-danger">
                  Confirm Profile Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ID Verification Modal */}
      {modalType === 'verify' && verifyAction && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>{verifyAction.verified ? '✅ Confirm ID Document Verification' : '❌ Reject ID Document'}</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <div className="bm-modal-body">
              {verifyAction.verified ? (
                <p>
                  Confirm that you have reviewed the uploaded Aadhaar/ID proof document and verified its authenticity. The member will be marked as <strong>ID VERIFIED</strong>.
                </p>
              ) : (
                <div className="bm-form-group">
                  <label>Rejection Reason</label>
                  <textarea
                    className="bm-textarea"
                    required
                    placeholder="e.g. Document image is blurry / Name does not match profile"
                    value={verifyAction.rejectionReason || ''}
                    onChange={(e) => setVerifyAction({ ...verifyAction, rejectionReason: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="bm-modal-footer">
              <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`bm-btn ${verifyAction.verified ? 'bm-btn-success' : 'bm-btn-danger'}`}
                onClick={handleVerifySubmit}
              >
                {verifyAction.verified ? 'Mark as Verified' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Raise Invoice Request Modal */}
      {modalType === 'invoice' && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>🧾 Raise Branch Invoice Request to HQ</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleRaiseInvoiceSubmit}>
              <div className="bm-modal-body">
                <div className="bm-form-group">
                  <label>Select Member from Branch</label>
                  <select
                    className="bm-select"
                    required
                    value={invoiceForm.memberProfileId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, memberProfileId: e.target.value })}
                  >
                    <option value="">-- Choose Branch Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberId} - {m.firstName} {m.lastName} ({m.packageType})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Select Package</label>
                  <select
                    className="bm-select"
                    required
                    value={invoiceForm.packageId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, packageId: e.target.value })}
                  >
                    <option value="">-- Choose Package --</option>
                    <option value="pkg-silver">Silver Package (₹5,000)</option>
                    <option value="pkg-gold">Gold Package (₹10,000)</option>
                    <option value="pkg-platinum">Platinum Package (₹15,000)</option>
                    <option value="pkg-diamond">Diamond VIP (₹25,000)</option>
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Payment Mode</label>
                  <select
                    className="bm-select"
                    value={invoiceForm.paymentMode}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="POS">POS / Card Terminal</option>
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Transaction Reference / Cheque #</label>
                  <input
                    type="text"
                    className="bm-input"
                    placeholder="UTR / Bank Ref / Cheque No"
                    value={invoiceForm.transactionRef}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, transactionRef: e.target.value })}
                  />
                </div>
                <div className="bm-form-group">
                  <label>Notes / Remarks</label>
                  <input
                    type="text"
                    className="bm-input"
                    placeholder="Additional details for HQ Admin review"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-primary">
                  Submit Request to HQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Submit Leave Modal */}
      {modalType === 'leave' && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>📝 Submit Leave Application</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className="bm-modal-body">
                <div className="bm-form-group">
                  <label>Leave Type</label>
                  <select
                    className="bm-select"
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="EMERGENCY">Emergency Leave</option>
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    className="bm-input"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  />
                </div>
                <div className="bm-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    className="bm-input"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  />
                </div>
                <div className="bm-form-group">
                  <label>Reason for Leave</label>
                  <textarea
                    className="bm-textarea"
                    required
                    placeholder="Provide reason for leave application..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-primary">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Review Leave Modal */}
      {modalType === 'reviewLeave' && selectedLeave && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>✍️ Review Leave Application</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleReviewLeaveSubmit}>
              <div className="bm-modal-body">
                <p>Staff: <strong>{selectedLeave.staff?.email}</strong></p>
                <p>Dates: <strong>{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</strong></p>
                <p>Reason: {selectedLeave.reason}</p>
                <div className="bm-form-group">
                  <label>Decision</label>
                  <select
                    className="bm-select"
                    value={leaveReviewStatus}
                    onChange={(e) => setLeaveReviewStatus(e.target.value as any)}
                  >
                    <option value="APPROVED">APPROVE Leave</option>
                    <option value="REJECTED">REJECT Leave</option>
                  </select>
                </div>
                {leaveReviewStatus === 'REJECTED' && (
                  <div className="bm-form-group">
                    <label>Rejection Reason</label>
                    <input
                      type="text"
                      className="bm-input"
                      required
                      placeholder="Specify reason for rejecting this leave"
                      value={leaveRejectionReason}
                      onChange={(e) => setLeaveRejectionReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className={`bm-btn ${leaveReviewStatus === 'APPROVED' ? 'bm-btn-success' : 'bm-btn-danger'}`}>
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Set Payment Alert Modal */}
      {modalType === 'alert' && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>🔔 Set Branch-Level Payment Alert</h3>
              <button className="bm-modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <form onSubmit={handleCreateAlertSubmit}>
              <div className="bm-modal-body">
                <div className="bm-form-group">
                  <label>Select Member</label>
                  <select
                    className="bm-select"
                    required
                    value={alertForm.memberProfileId}
                    onChange={(e) => setAlertForm({ ...alertForm, memberProfileId: e.target.value })}
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberId} - {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Alert Date</label>
                  <input
                    type="date"
                    className="bm-input"
                    required
                    value={alertForm.alertDate}
                    onChange={(e) => setAlertForm({ ...alertForm, alertDate: e.target.value })}
                  />
                </div>
                <div className="bm-form-group">
                  <label>Alert Type</label>
                  <select
                    className="bm-select"
                    value={alertForm.alertType}
                    onChange={(e) => setAlertForm({ ...alertForm, alertType: e.target.value })}
                  >
                    <option value="UPGRADE_REMINDER">Upgrade Reminder</option>
                    <option value="RENEWAL">Package Renewal</option>
                    <option value="BALANCE_COLLECTION">Balance Collection</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                  </select>
                </div>
                <div className="bm-form-group">
                  <label>Reminder Notes</label>
                  <input
                    type="text"
                    className="bm-input"
                    placeholder="e.g. Follow up on Gold plan discussion"
                    value={alertForm.note}
                    onChange={(e) => setAlertForm({ ...alertForm, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="bm-btn bm-btn-primary">
                  Save Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Verify / Reject ID Proof Modal */}
      {modalType === 'verify' && verifyAction && (
        <div className="bm-modal-overlay">
          <div className="bm-modal">
            <div className="bm-modal-header">
              <h3>{verifyAction.verified ? '✅ Approve ID Proof Verification' : '❌ Reject ID Proof Document'}</h3>
              <button className="bm-modal-close" onClick={() => { setModalType(null); setVerifyAction(null); }}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleVerifySubmit(); }}>
              <div className="bm-modal-body">
                {verifyAction.verified ? (
                  <p>
                    Are you sure you want to approve this member's government ID proof? The member's profile will be marked as verified.
                  </p>
                ) : (
                  <div className="bm-form-group">
                    <label>Mandatory Rejection Reason (at least 5 characters)</label>
                    <textarea
                      className="bm-textarea"
                      required
                      minLength={5}
                      rows={3}
                      placeholder="e.g. Aadhaar card photo is blurry or name doesn't match"
                      value={verifyAction.rejectionReason || ''}
                      onChange={(e) => setVerifyAction({ ...verifyAction, rejectionReason: e.target.value })}
                    />
                    <small className="bm-subtext">The member will be notified with this reason to upload a valid document.</small>
                  </div>
                )}
              </div>
              <div className="bm-modal-footer">
                <button type="button" className="bm-btn bm-btn-secondary" onClick={() => { setModalType(null); setVerifyAction(null); }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bm-btn ${verifyAction.verified ? 'bm-btn-success' : 'bm-btn-danger'}`}
                  disabled={!verifyAction.verified && (!verifyAction.rejectionReason || verifyAction.rejectionReason.trim().length < 5)}
                >
                  {verifyAction.verified ? 'Confirm & Verify' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagerDashboard;
