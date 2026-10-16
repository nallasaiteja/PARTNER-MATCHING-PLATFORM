import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchNotificationHistory,
  fetchNotificationStats,
  fetchFestivals,
  createFestival,
  updateFestival,
  deleteFestival,
  triggerFestivalDispatch,
  triggerRunBirthdays,
  triggerRunPaymentAlerts,
  triggerRunPackageExpiry,
  previewBulkSms,
  sendBulkSmsCampaign,
  fetchBulkSmsReports,
  sendTestNotification,
  NotificationLogItem,
  NotificationStatsResponse,
  FestivalWishItem,
  BulkSmsPreviewResponse,
  BulkSmsUsageReportResponse,
} from '../services/notificationsApi';
import { useAuth } from '../auth/AuthProvider';
import './NotificationsCenterPage.css';

export const NotificationsCenterPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isBranchManager = user?.role === 'BRANCH_MANAGER';

  const [activeTab, setActiveTab] = useState<'LOGS' | 'FESTIVALS' | 'AUTOMATION' | 'BULK_SMS' | 'REPORTS'>('LOGS');

  // Stats State
  const [stats, setStats] = useState<NotificationStatsResponse | null>(null);

  // Delivery Logs State
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilterType, setLogFilterType] = useState('');
  const [logFilterChannel, setLogFilterChannel] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<NotificationLogItem | null>(null);

  // Festivals State
  const [festivals, setFestivals] = useState<FestivalWishItem[]>([]);
  const [festivalsLoading, setFestivalsLoading] = useState(false);
  const [showAddFestivalModal, setShowAddFestivalModal] = useState(false);
  const [festivalForm, setFestivalForm] = useState({
    festivalName: '',
    festivalDate: '',
    messageTemplate: '',
    discountPercent: 20,
    offerCode: '',
    channels: ['APP_PUSH', 'EMAIL', 'WHATSAPP'],
  });

  // Automation Triggers State
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  // Test Dispatch Form
  const [testForm, setTestForm] = useState({
    channel: 'SMS' as 'APP_PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP',
    recipientContact: '',
    recipientName: '',
    title: 'Platform Test Alert',
    content: 'This is a test notification from Partner Matching Platform.',
  });

  // Bulk SMS State
  const [bulkSmsForm, setBulkSmsForm] = useState({
    title: 'Weekend Member Consultation Meet',
    message: 'Visit our branch center this Saturday for exclusive verified profiles and direct matchmaking assistance.',
    targetIdRangeStart: '',
    targetIdRangeEnd: '',
  });
  const [bulkPreview, setBulkPreview] = useState<BulkSmsPreviewResponse | null>(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkSendLoading, setBulkSendLoading] = useState(false);

  // Reports State
  const [smsReports, setSmsReports] = useState<BulkSmsUsageReportResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchNotificationStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching notification stats:', err);
    }
  }, []);

  // Load Logs
  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const data = await fetchNotificationHistory({
        type: logFilterType || undefined,
        channel: logFilterChannel || undefined,
        status: logFilterStatus || undefined,
        search: logSearch || undefined,
        page: logsPage,
        limit: 15,
      });
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch (err) {
      console.error('Error loading notification logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [logFilterType, logFilterChannel, logFilterStatus, logSearch, logsPage]);

  // Load Festivals
  const loadFestivals = useCallback(async () => {
    try {
      setFestivalsLoading(true);
      const data = await fetchFestivals();
      setFestivals(data);
    } catch (err) {
      console.error('Error loading festivals:', err);
    } finally {
      setFestivalsLoading(false);
    }
  }, []);

  // Load SMS Reports
  const loadReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const data = await fetchBulkSmsReports();
      setSmsReports(data);
    } catch (err) {
      console.error('Error loading SMS reports:', err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'LOGS') loadLogs();
    if (activeTab === 'FESTIVALS') loadFestivals();
    if (activeTab === 'REPORTS') loadReports();
  }, [activeTab, loadLogs, loadFestivals, loadReports]);

  // Handle Add Festival
  const handleCreateFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFestival(festivalForm);
      setShowAddFestivalModal(false);
      setFestivalForm({
        festivalName: '',
        festivalDate: '',
        messageTemplate: '',
        discountPercent: 20,
        offerCode: '',
        channels: ['APP_PUSH', 'EMAIL', 'WHATSAPP'],
      });
      loadFestivals();
      setTriggerMessage('Festival configuration saved successfully!');
    } catch (err: any) {
      alert(`Error creating festival: ${err.message}`);
    }
  };

  // Toggle Festival Active
  const handleToggleFestival = async (fest: FestivalWishItem) => {
    try {
      await updateFestival(fest.id, { isActive: !fest.isActive });
      loadFestivals();
    } catch (err: any) {
      alert(`Error updating festival: ${err.message}`);
    }
  };

  // Dispatch Festival Now
  const handleDispatchFestivalNow = async (id: string, name: string) => {
    if (!window.confirm(`Trigger immediate festival greetings broadcast for "${name}" to all active members?`)) return;
    try {
      setTriggerLoading(id);
      const res = await triggerFestivalDispatch(id);
      setTriggerMessage(`Dispatched festival greetings: ${res.message || 'Complete'}`);
      loadStats();
      loadFestivals();
    } catch (err: any) {
      alert(`Error triggering festival: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  // Delete Festival
  const handleDeleteFestival = async (id: string) => {
    if (!window.confirm('Delete this festival configuration?')) return;
    try {
      await deleteFestival(id);
      loadFestivals();
    } catch (err: any) {
      alert(`Error deleting festival: ${err.message}`);
    }
  };

  // Trigger Automation Runners
  const handleRunAutomation = async (runnerType: 'birthdays' | 'payment-alerts' | 'package-expiry') => {
    try {
      setTriggerLoading(runnerType);
      setTriggerMessage(null);
      let resultMsg = '';

      if (runnerType === 'birthdays') {
        const res = await triggerRunBirthdays();
        resultMsg = `Birthday wishes run complete for ${res.istDate}. Found ${res.birthdayMembersCount} birthday(s). Member dispatches: ${res.memberDispatches}, Staff alerts: ${res.staffDispatches}.`;
      } else if (runnerType === 'payment-alerts') {
        const res = await triggerRunPaymentAlerts();
        resultMsg = `${res.message}. Dispatched ${res.alertsDispatched} alert(s) across member, staff, branch, and HQ.`;
      } else if (runnerType === 'package-expiry') {
        const res = await triggerRunPackageExpiry();
        resultMsg = `${res.message}. Processed ${res.alertsTriggered} upcoming expiration reminder(s).`;
      }

      setTriggerMessage(resultMsg);
      loadStats();
    } catch (err: any) {
      alert(`Automation error: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  // Test Dispatch
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTriggerLoading('TEST');
      await sendTestNotification(testForm);
      setTriggerMessage(`Test notification sent successfully to ${testForm.recipientContact} via ${testForm.channel}!`);
      loadStats();
    } catch (err: any) {
      alert(`Error sending test: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  // Bulk SMS Preview
  const handlePreviewBulkSms = async () => {
    try {
      setBulkPreviewLoading(true);
      const res = await previewBulkSms({
        targetIdRangeStart: bulkSmsForm.targetIdRangeStart || undefined,
        targetIdRangeEnd: bulkSmsForm.targetIdRangeEnd || undefined,
      });
      setBulkPreview(res);
    } catch (err: any) {
      alert(`Error previewing bulk SMS: ${err.message}`);
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  // Send Bulk SMS Campaign
  const handleSendBulkSms = async () => {
    if (!window.confirm(`Are you sure you want to dispatch bulk SMS to ${bulkPreview?.recipientCount || 0} members?`)) return;
    try {
      setBulkSendLoading(true);
      const res = await sendBulkSmsCampaign({
        title: bulkSmsForm.title,
        message: bulkSmsForm.message,
        targetIdRangeStart: bulkSmsForm.targetIdRangeStart || undefined,
        targetIdRangeEnd: bulkSmsForm.targetIdRangeEnd || undefined,
      });
      setTriggerMessage(res.message);
      setBulkPreview(null);
      loadStats();
    } catch (err: any) {
      alert(`Error sending bulk SMS: ${err.message}`);
    } finally {
      setBulkSendLoading(false);
    }
  };

  return (
    <div className="notif-center-container">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-title-group">
          <h1>
            <span>📡</span> Communications & Notifications Center
          </h1>
          <p>
            Automated member lifecycle alerts, festival wishes, WhatsApp Business integration, and branch bulk SMS campaigns.
          </p>
        </div>
        {isAdmin && (
          <button
            className="notif-btn notif-btn-primary"
            onClick={() => setShowAddFestivalModal(true)}
          >
            <span>✨</span> Add Festival Greeting
          </button>
        )}
      </div>

      {/* Global Alerts / Toasts */}
      {triggerMessage && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{triggerMessage}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setTriggerMessage(null)}>✕</button>
        </div>
      )}

      {/* Key Metrics Summary Cards */}
      <div className="notif-stats-grid">
        <div className="notif-stat-card">
          <div className="notif-stat-icon icon-blue">📨</div>
          <div className="notif-stat-info">
            <h3>Dispatched Today</h3>
            <p>{stats?.today.total ?? 0}</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="notif-stat-icon icon-green">✅</div>
          <div className="notif-stat-info">
            <h3>Delivery Rate</h3>
            <p>{stats?.today.deliveryRate ?? 100}%</p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="notif-stat-icon icon-purple">💬</div>
          <div className="notif-stat-info">
            <h3>WhatsApp & Push</h3>
            <p>
              {(stats?.channels.find((c) => c.channel === 'WHATSAPP')?.count ?? 0) +
                (stats?.channels.find((c) => c.channel === 'APP_PUSH')?.count ?? 0)}
            </p>
          </div>
        </div>
        <div className="notif-stat-card">
          <div className="notif-stat-icon icon-amber">📱</div>
          <div className="notif-stat-info">
            <h3>SMS Dispatches</h3>
            <p>{stats?.channels.find((c) => c.channel === 'SMS')?.count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="notif-tabs">
        <button
          className={`notif-tab-btn ${activeTab === 'LOGS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LOGS')}
        >
          <span>📋</span> Delivery Logs
        </button>
        {isAdmin && (
          <button
            className={`notif-tab-btn ${activeTab === 'FESTIVALS' ? 'active' : ''}`}
            onClick={() => setActiveTab('FESTIVALS')}
          >
            <span>🎊</span> Festival Wishes
          </button>
        )}
        <button
          className={`notif-tab-btn ${activeTab === 'AUTOMATION' ? 'active' : ''}`}
          onClick={() => setActiveTab('AUTOMATION')}
        >
          <span>⚙️</span> Automated Reminders & Triggers
        </button>
        <button
          className={`notif-tab-btn ${activeTab === 'BULK_SMS' ? 'active' : ''}`}
          onClick={() => setActiveTab('BULK_SMS')}
        >
          <span>📢</span> Bulk Branch SMS
        </button>
        {isAdmin && (
          <button
            className={`notif-tab-btn ${activeTab === 'REPORTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('REPORTS')}
          >
            <span>📊</span> Branch Usage Analytics
          </button>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: DELIVERY LOGS                                      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'LOGS' && (
        <div>
          {/* Filters */}
          <div className="notif-filter-bar">
            <input
              type="text"
              className="notif-search-input"
              placeholder="Search recipient name, mobile, or text..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
            <select
              className="notif-select"
              value={logFilterChannel}
              onChange={(e) => setLogFilterChannel(e.target.value)}
            >
              <option value="">All Channels</option>
              <option value="APP_PUSH">App Push</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <select
              className="notif-select"
              value={logFilterType}
              onChange={(e) => setLogFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="BIRTHDAY">Birthday Wishes</option>
              <option value="FESTIVAL">Festival Wishes</option>
              <option value="PAYMENT_ALERT">Payment Alert</option>
              <option value="PACKAGE_EXPIRY">Package Expiry</option>
              <option value="INTEREST_RECEIVED">Interest Sent</option>
              <option value="INTEREST_ACCEPTED">Interest Accepted</option>
              <option value="PROFILE_BLOCKED">Profile Blocked</option>
              <option value="TICKET_CLOSURE_OTP">Ticket OTP</option>
              <option value="BULK_BRANCH_SMS">Bulk SMS</option>
            </select>
            <select
              className="notif-select"
              value={logFilterStatus}
              onChange={(e) => setLogFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SENT">Sent / Delivered</option>
              <option value="FAILED">Failed</option>
            </select>
            <button className="notif-btn notif-btn-secondary" onClick={() => loadLogs()}>
              <span>🔄</span> Refresh
            </button>
          </div>

          {/* Logs Table */}
          <div className="notif-table-wrapper">
            <table className="notif-table">
              <thead>
                <tr>
                  <th>Timestamp (IST)</th>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Content Preview</th>
                  <th>Status</th>
                  <th>Provider Ref</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                      Loading delivery records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No notification delivery records match your current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#64748b' }}>
                        {new Date(item.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td>
                        <strong>{item.recipientName || 'Member'}</strong>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {item.recipientContact}
                          {item.recipientMemberProfile?.memberId ? ` (${item.recipientMemberProfile.memberId})` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge-type">{item.type}</span>
                      </td>
                      <td>
                        <span className={`badge-channel ${item.channel}`}>
                          {item.channel === 'APP_PUSH' && '🔔 Push'}
                          {item.channel === 'SMS' && '📱 SMS'}
                          {item.channel === 'EMAIL' && '📧 Email'}
                          {item.channel === 'WHATSAPP' && '💬 WhatsApp'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title ? <strong>{item.title}: </strong> : null}
                        {item.content}
                      </td>
                      <td>
                        <span className={`badge-status ${item.status}`}>{item.status}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                        {item.provider || 'Gateway'}
                      </td>
                      <td>
                        <button
                          className="notif-btn notif-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => setSelectedLog(item)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>
              Showing {logs.length} of {logsTotal} delivery log(s)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="notif-btn notif-btn-secondary"
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="notif-btn notif-btn-secondary"
                disabled={logs.length < 15}
                onClick={() => setLogsPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: FESTIVAL WISHES                                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'FESTIVALS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#64748b' }}>
              Configure festivals and pre-approved greeting templates. Automated dispatches trigger on festival date to all active members via App Push, Email, and WhatsApp.
            </p>
            <button className="notif-btn notif-btn-primary" onClick={() => setShowAddFestivalModal(true)}>
              + Add Festival
            </button>
          </div>

          {festivalsLoading ? (
            <p>Loading festival configurations...</p>
          ) : festivals.length === 0 ? (
            <div className="preview-box" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#64748b' }}>No festivals configured yet. Click "+ Add Festival" to create one.</p>
            </div>
          ) : (
            <div className="notif-cards-grid">
              {festivals.map((fest) => (
                <div key={fest.id} className="festival-card">
                  <div>
                    <div className="festival-header">
                      <div className="festival-title">{fest.festivalName}</div>
                      <div className="festival-date">📅 {fest.festivalDate}</div>
                    </div>
                    <div className="festival-msg">"{fest.messageTemplate}"</div>
                    {fest.offerCode && (
                      <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#059669', fontWeight: 600 }}>
                        🏷️ Offer Code: {fest.offerCode} ({fest.discountPercent}% Off)
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {fest.channels.map((ch) => (
                        <span key={ch} className={`badge-channel ${ch}`}>
                          {ch}
                        </span>
                      ))}
                    </div>
                    {fest.lastDispatchedAt && (
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 12px 0' }}>
                        Last dispatched: {new Date(fest.lastDispatchedAt).toLocaleDateString('en-IN')} (Reached {fest.dispatchCount} members)
                      </p>
                    )}
                  </div>
                  <div className="festival-footer">
                    <label className="notif-checkbox-label" style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={fest.isActive}
                        onChange={() => handleToggleFestival(fest)}
                      />
                      {fest.isActive ? 'Active' : 'Disabled'}
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="notif-btn notif-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={triggerLoading === fest.id}
                        onClick={() => handleDispatchFestivalNow(fest.id, fest.festivalName)}
                      >
                        {triggerLoading === fest.id ? 'Sending...' : 'Broadcast Now'}
                      </button>
                      <button
                        className="notif-btn notif-btn-danger"
                        style={{ padding: '6px 10px', fontSize: 13 }}
                        onClick={() => handleDeleteFestival(fest.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: AUTOMATED REMINDERS & TRIGGERS                      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'AUTOMATION' && (
        <div>
          {/* Birthday Wishes Box */}
          <div className="automation-box">
            <div className="automation-info">
              <h3><span>🎂</span> Daily Birthday Wishes Automation</h3>
              <p>
                Automatically identifies members whose birth date matches today in Indian Standard Time (IST UTC+05:30).
                Dispatches warm personalized birthday wishes to the member via App Push, Email, and WhatsApp, and sends an alert to their assigned relationship staff. Idempotency guarantees no member receives duplicate wishes.
              </p>
            </div>
            <button
              className="notif-btn notif-btn-primary"
              disabled={triggerLoading === 'birthdays'}
              onClick={() => handleRunAutomation('birthdays')}
            >
              {triggerLoading === 'birthdays' ? 'Running...' : 'Run Birthday Wishes Now'}
            </button>
          </div>

          {/* Payment Alerts Box */}
          <div className="automation-box">
            <div className="automation-info">
              <h3><span>🔔</span> Scheduled Payment Date Reminders</h3>
              <p>
                Scans all scheduled payment and visit follow-ups due today. Dispatches simultaneous notifications to the Member, Assigned Staff, Branch Manager, and HQ Admin through App Push, SMS, and Email.
              </p>
            </div>
            <button
              className="notif-btn notif-btn-primary"
              disabled={triggerLoading === 'payment-alerts'}
              onClick={() => handleRunAutomation('payment-alerts')}
            >
              {triggerLoading === 'payment-alerts' ? 'Running...' : 'Run Payment Alerts Now'}
            </button>
          </div>

          {/* Package Expiry Box */}
          <div className="automation-box">
            <div className="automation-info">
              <h3><span>⏳</span> Approaching Package Expiry Alerts</h3>
              <p>
                Detects paid memberships reaching expiration milestones (7 days, 3 days, 1 day, and on expiry day). Dispatches urgent renewal notifications through App Push and SMS to both the member and assigned staff.
              </p>
            </div>
            <button
              className="notif-btn notif-btn-primary"
              disabled={triggerLoading === 'package-expiry'}
              onClick={() => handleRunAutomation('package-expiry')}
            >
              {triggerLoading === 'package-expiry' ? 'Running...' : 'Run Expiry Reminders Now'}
            </button>
          </div>

          {/* Manual Test Dispatch Tool */}
          {isAdmin && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginTop: 24 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a' }}>
                🛠️ Gateway Test Dispatch Tool
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0' }}>
                Test any communication provider integration (Firebase App Push, Fast2SMS / Twilio, Email, WhatsApp Business API).
              </p>
              <form onSubmit={handleSendTest} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Channel</label>
                  <select
                    className="notif-form-control"
                    value={testForm.channel}
                    onChange={(e: any) => setTestForm({ ...testForm, channel: e.target.value })}
                  >
                    <option value="SMS">SMS</option>
                    <option value="APP_PUSH">App Push</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Recipient Contact</label>
                  <input
                    type="text"
                    className="notif-form-control"
                    placeholder="Mobile (+91...) or Email"
                    required
                    value={testForm.recipientContact}
                    onChange={(e) => setTestForm({ ...testForm, recipientContact: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Recipient Name</label>
                  <input
                    type="text"
                    className="notif-form-control"
                    placeholder="e.g. John Doe"
                    value={testForm.recipientName}
                    onChange={(e) => setTestForm({ ...testForm, recipientName: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Message Content</label>
                  <input
                    type="text"
                    className="notif-form-control"
                    required
                    value={testForm.content}
                    onChange={(e) => setTestForm({ ...testForm, content: e.target.value })}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="notif-btn notif-btn-primary"
                    disabled={triggerLoading === 'TEST'}
                  >
                    {triggerLoading === 'TEST' ? 'Dispatching...' : 'Dispatch Test Notification'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: BULK BRANCH SMS                                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'BULK_SMS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {/* Composer Form */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a' }}>
              📢 Compose Bulk Branch SMS Campaign
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0' }}>
              {isBranchManager
                ? 'Target members belonging strictly to your branch. Branch data isolation is enforced.'
                : 'Target members within a branch and optional member ID range.'}
            </p>

            <div className="notif-form-group">
              <label>Campaign Title</label>
              <input
                type="text"
                className="notif-form-control"
                value={bulkSmsForm.title}
                onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, title: e.target.value })}
                placeholder="e.g. Bangalore Center Profile Matching Meet"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="notif-form-group">
                <label>Member ID Range Start (Optional)</label>
                <input
                  type="text"
                  className="notif-form-control"
                  placeholder="e.g. M20260001"
                  value={bulkSmsForm.targetIdRangeStart}
                  onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, targetIdRangeStart: e.target.value })}
                />
              </div>
              <div className="notif-form-group">
                <label>Member ID Range End (Optional)</label>
                <input
                  type="text"
                  className="notif-form-control"
                  placeholder="e.g. M20261000"
                  value={bulkSmsForm.targetIdRangeEnd}
                  onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, targetIdRangeEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="notif-form-group">
              <label>SMS Message Body</label>
              <textarea
                className="notif-form-control"
                rows={4}
                value={bulkSmsForm.message}
                onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, message: e.target.value })}
                placeholder="Enter SMS text..."
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#64748b' }}>
                <span>Length: {bulkSmsForm.message.length} chars</span>
                <span>Credits: {Math.ceil(bulkSmsForm.message.length / 160) || 1} SMS unit(s)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                className="notif-btn notif-btn-secondary"
                disabled={bulkPreviewLoading}
                onClick={handlePreviewBulkSms}
              >
                {bulkPreviewLoading ? 'Calculating...' : 'Preview Recipients'}
              </button>

              {bulkPreview && bulkPreview.recipientCount > 0 && (
                <button
                  type="button"
                  className="notif-btn notif-btn-success"
                  disabled={bulkSendLoading}
                  onClick={handleSendBulkSms}
                >
                  {bulkSendLoading ? 'Dispatching Campaign...' : `Broadcast to ${bulkPreview.recipientCount} Member(s)`}
                </button>
              )}
            </div>
          </div>

          {/* Preview Results Panel */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a' }}>
              🔍 Campaign Target Preview
            </h3>

            {!bulkPreview ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                Configure ID range and click "Preview Recipients" to see targeted member count and sample details before sending.
              </div>
            ) : (
              <div>
                <div className="preview-box">
                  <div className="preview-stat">
                    <span>Target Branch:</span>
                    <strong>{bulkPreview.branchName}</strong>
                  </div>
                  <div className="preview-stat">
                    <span>ID Range:</span>
                    <strong>{bulkPreview.idRange.start} → {bulkPreview.idRange.end}</strong>
                  </div>
                  <div className="preview-stat">
                    <span>Active Member Recipients:</span>
                    <strong style={{ color: '#2563eb', fontSize: 16 }}>{bulkPreview.recipientCount} members</strong>
                  </div>
                  <div className="preview-stat">
                    <span>Estimated Campaign Cost:</span>
                    <strong>₹{bulkPreview.estimatedCost} (@ ₹0.25/SMS)</strong>
                  </div>
                </div>

                {bulkPreview.recipientCount === 0 ? (
                  <p style={{ color: '#dc2626', fontSize: 14 }}>
                    ⚠️ No active members found matching this ID range in the branch. Please adjust the range.
                  </p>
                ) : (
                  <div>
                    <h4 style={{ fontSize: 14, margin: '12px 0 8px 0', color: '#475569' }}>
                      Sample Targeted Members (Masked):
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#334155' }}>
                      {bulkPreview.sampleRecipients.map((s) => (
                        <li key={s.memberId} style={{ marginBottom: 4 }}>
                          <strong>{s.memberId}</strong> — {s.name} ({s.maskedMobile}) [{s.branch}]
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: HQ USAGE & REPORTS                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'REPORTS' && (
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a' }}>
            📊 Branch-wise Bulk SMS Usage & Cost Summary (HQ View)
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px 0' }}>
            Audited breakdown of SMS campaigns, message delivery volume, and expenses billed per branch.
          </p>

          <div className="notif-table-wrapper" style={{ marginBottom: 30 }}>
            <table className="notif-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Total Campaigns Dispatched</th>
                  <th>Total SMS Sent</th>
                  <th>Success Rate</th>
                  <th>Total Cost Incurred</th>
                </tr>
              </thead>
              <tbody>
                {reportsLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Loading usage records...</td></tr>
                ) : !smsReports?.branchUsage?.length ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No branch usage records logged yet.</td></tr>
                ) : (
                  smsReports.branchUsage.map((row) => (
                    <tr key={row.branchId}>
                      <td><strong>{row.branchName}</strong></td>
                      <td>{row.totalCampaigns}</td>
                      <td>{row.totalSmsSent}</td>
                      <td>
                        {row.totalSmsSent > 0
                          ? `${Math.round((row.successCount / row.totalSmsSent) * 100)}%`
                          : '100%'}
                      </td>
                      <td><strong>₹{row.totalCost.toFixed(2)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a' }}>
            📜 Recent Bulk SMS Campaigns
          </h3>
          <div className="notif-table-wrapper">
            <table className="notif-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campaign Title</th>
                  <th>Branch</th>
                  <th>ID Range</th>
                  <th>Recipients</th>
                  <th>Success / Failed</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!smsReports?.recentCampaigns?.length ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No campaigns found.</td></tr>
                ) : (
                  smsReports.recentCampaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontSize: 13, color: '#64748b' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td><strong>{c.title}</strong></td>
                      <td>{c.branchName}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.idRange}</td>
                      <td>{c.recipientCount}</td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>{c.successCount}</span> /{' '}
                        <span style={{ color: '#dc2626' }}>{c.failedCount}</span>
                      </td>
                      <td>₹{c.totalCost.toFixed(2)}</td>
                      <td>
                        <span className={`badge-status ${c.status}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD FESTIVAL                                        */}
      {/* ────────────────────────────────────────────────────────── */}
      {showAddFestivalModal && (
        <div className="notif-modal-overlay">
          <div className="notif-modal">
            <div className="notif-modal-header">
              <h2>Configure Festival Greeting</h2>
              <button className="notif-modal-close" onClick={() => setShowAddFestivalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateFestival}>
              <div className="notif-form-group">
                <label>Festival Name</label>
                <input
                  type="text"
                  required
                  className="notif-form-control"
                  placeholder="e.g. Sankranti Special"
                  value={festivalForm.festivalName}
                  onChange={(e) => setFestivalForm({ ...festivalForm, festivalName: e.target.value })}
                />
              </div>

              <div className="notif-form-group">
                <label>Festival Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  className="notif-form-control"
                  value={festivalForm.festivalDate}
                  onChange={(e) => setFestivalForm({ ...festivalForm, festivalDate: e.target.value })}
                />
              </div>

              <div className="notif-form-group">
                <label>Greeting Template Message</label>
                <textarea
                  required
                  rows={3}
                  className="notif-form-control"
                  placeholder="Wishing you a prosperous festival! Find your life partner with exclusive festive discounts."
                  value={festivalForm.messageTemplate}
                  onChange={(e) => setFestivalForm({ ...festivalForm, messageTemplate: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="notif-form-group">
                  <label>Discount % (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="notif-form-control"
                    value={festivalForm.discountPercent}
                    onChange={(e) => setFestivalForm({ ...festivalForm, discountPercent: Number(e.target.value) })}
                  />
                </div>
                <div className="notif-form-group">
                  <label>Offer Code (Optional)</label>
                  <input
                    type="text"
                    className="notif-form-control"
                    placeholder="e.g. FESTIVE25"
                    value={festivalForm.offerCode}
                    onChange={(e) => setFestivalForm({ ...festivalForm, offerCode: e.target.value })}
                  />
                </div>
              </div>

              <div className="notif-form-group">
                <label>Broadcast Channels</label>
                <div className="notif-checkbox-group">
                  {['APP_PUSH', 'EMAIL', 'WHATSAPP'].map((ch) => (
                    <label key={ch} className="notif-checkbox-label">
                      <input
                        type="checkbox"
                        checked={festivalForm.channels.includes(ch)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFestivalForm({ ...festivalForm, channels: [...festivalForm.channels, ch] });
                          } else {
                            setFestivalForm({
                              ...festivalForm,
                              channels: festivalForm.channels.filter((c) => c !== ch),
                            });
                          }
                        }}
                      />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="notif-btn notif-btn-secondary"
                  onClick={() => setShowAddFestivalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="notif-btn notif-btn-primary">
                  Save Festival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: LOG DETAILS                                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div className="notif-modal-overlay">
          <div className="notif-modal">
            <div className="notif-modal-header">
              <h2>Notification Delivery Audit</h2>
              <button className="notif-modal-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="preview-box">
              <div className="preview-stat">
                <span>Message ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedLog.id}</span>
              </div>
              <div className="preview-stat">
                <span>Type:</span>
                <strong>{selectedLog.type}</strong>
              </div>
              <div className="preview-stat">
                <span>Channel:</span>
                <span className={`badge-channel ${selectedLog.channel}`}>{selectedLog.channel}</span>
              </div>
              <div className="preview-stat">
                <span>Recipient:</span>
                <strong>{selectedLog.recipientName || 'Member'} ({selectedLog.recipientContact})</strong>
              </div>
              <div className="preview-stat">
                <span>Status:</span>
                <span className={`badge-status ${selectedLog.status}`}>{selectedLog.status}</span>
              </div>
              <div className="preview-stat">
                <span>Provider:</span>
                <span>{selectedLog.provider || 'Gateway'}</span>
              </div>
              <div className="preview-stat">
                <span>Dispatched At:</span>
                <span>{new Date(selectedLog.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                Message Content Dispatched:
              </label>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 14, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {selectedLog.title ? <strong>{selectedLog.title}{'\n\n'}</strong> : null}
                {selectedLog.content}
              </div>
            </div>

            {selectedLog.error && (
              <div style={{ color: '#dc2626', background: '#fee2e2', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
                <strong>Error:</strong> {selectedLog.error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="notif-btn notif-btn-secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
