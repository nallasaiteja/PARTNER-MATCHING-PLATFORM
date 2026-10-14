import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchAdminReminders,
  createAdminReminder,
  resolveAdminReminder,
  triggerBirthdayWishes,
  sendFestivalGreetings,
  sendBranchBulkSms,
  fetchBranchSmsReports,
  fetchAdminMemberList,
} from '../services/adminApi';
import './AlertsModulePage.css';

export const AlertsModulePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REMINDERS' | 'BIRTHDAYS' | 'FESTIVALS' | 'BULK_SMS'>('REMINDERS');

  // Reminders State
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState<boolean>(true);
  const [showAddReminderModal, setShowAddReminderModal] = useState<boolean>(false);
  const [reminderForm, setReminderForm] = useState({
    memberProfileId: '',
    alertDate: '',
    alertType: 'PAYMENT' as 'PAYMENT' | 'VISIT' | 'PACKAGE_FOLLOWUP',
    note: '',
  });

  // Birthday Wishes State
  const [birthdayResult, setBirthdayResult] = useState<any | null>(null);
  const [birthdayLoading, setBirthdayLoading] = useState<boolean>(false);

  // Festival Greetings State
  const [festivalForm, setFestivalForm] = useState({
    festivalName: 'Diwali Festive Special',
    message: 'Wishing you a prosperous Diwali! Find your life partner with exclusive festival discounts on all plans.',
    discountPercent: 30,
    offerCode: 'DIWALI30',
  });
  const [festivalResult, setFestivalResult] = useState<any | null>(null);

  // Bulk SMS State
  const [smsReports, setSmsReports] = useState<{ branchUsage: any[]; recentCampaigns: any[] }>({
    branchUsage: [],
    recentCampaigns: [],
  });
  const [bulkSmsForm, setBulkSmsForm] = useState({
    title: 'Hyderabad Branch Walk-in Consultation',
    message: 'Visit our Banjara Hills center this Saturday for exclusive verified Telugu profiles and live matchmaking.',
    targetIdRangeStart: '',
    targetIdRangeEnd: '',
  });
  const [bulkSmsLoading, setBulkSmsLoading] = useState<boolean>(false);

  // Member search for reminder modal
  const [memberOptions, setMemberOptions] = useState<any[]>([]);

  // Load Reminders
  const loadReminders = useCallback(async () => {
    try {
      setRemindersLoading(true);
      const res = await fetchAdminReminders();
      setReminders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRemindersLoading(false);
    }
  }, []);

  // Load SMS Reports
  const loadSmsReports = useCallback(async () => {
    try {
      const res = await fetchBranchSmsReports();
      setSmsReports(res);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'REMINDERS') void loadReminders();
    if (activeTab === 'BULK_SMS') void loadSmsReports();
  }, [activeTab, loadReminders, loadSmsReports]);

  // Load members for dropdown
  useEffect(() => {
    void fetchAdminMemberList({ limit: 50 }).then((res) => {
      setMemberOptions(res.members || []);
      if (res.members?.length > 0) {
        setReminderForm((prev) => ({ ...prev, memberProfileId: res.members[0].id }));
      }
    }).catch(console.error);
  }, []);

  // Resolve reminder
  const handleResolveReminder = async (id: string) => {
    try {
      await resolveAdminReminder(id);
      void loadReminders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error resolving reminder');
    }
  };

  // Submit reminder
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.memberProfileId || !reminderForm.alertDate) {
      alert('Please select a member and scheduled alert date');
      return;
    }
    try {
      await createAdminReminder(reminderForm);
      setShowAddReminderModal(false);
      setReminderForm({
        memberProfileId: memberOptions[0]?.id || '',
        alertDate: '',
        alertType: 'PAYMENT',
        note: '',
      });
      void loadReminders();
      alert('Reminder scheduled successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating reminder');
    }
  };

  // Trigger Birthday wishes
  const handleTriggerBirthdays = async () => {
    try {
      setBirthdayLoading(true);
      const res = await triggerBirthdayWishes();
      setBirthdayResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error triggering birthday scanner');
    } finally {
      setBirthdayLoading(false);
    }
  };

  // Dispatch Festival Greeting
  const handleSendFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sendFestivalGreetings(festivalForm);
      setFestivalResult(res);
      alert(`Festival greeting dispatched to ${res.recipientsTargeted} active members!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error sending greeting');
    }
  };

  // Send Bulk SMS
  const handleSendBulkSms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBulkSmsLoading(true);
      const res = await sendBranchBulkSms(bulkSmsForm);
      alert(res.message);
      void loadSmsReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error sending bulk SMS');
    } finally {
      setBulkSmsLoading(false);
    }
  };

  return (
    <div className="alerts-root">
      {/* Top Header */}
      <div className="member-header-panel">
        <div>
          <h2>Alerts & Automated Communications (Section 5.5)</h2>
          <p>Payment/visit date alerts, automated birthday greetings, festival offers, and branch bulk SMS campaigns</p>
        </div>
        {activeTab === 'REMINDERS' && (
          <button onClick={() => setShowAddReminderModal(true)} className="create-staff-btn">
            ⏰ Schedule Payment Alert
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="member-sub-tabs">
        <button
          className={`member-tab-btn ${activeTab === 'REMINDERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REMINDERS')}
        >
          ⏰ Payment & Visit Alerts ({reminders.filter((r) => !r.isResolved).length})
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'BIRTHDAYS' ? 'active' : ''}`}
          onClick={() => setActiveTab('BIRTHDAYS')}
        >
          🎂 Birthday Wishes Automation
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'FESTIVALS' ? 'active' : ''}`}
          onClick={() => setActiveTab('FESTIVALS')}
        >
          🎉 Festival Greetings & Offers
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'BULK_SMS' ? 'active' : ''}`}
          onClick={() => setActiveTab('BULK_SMS')}
        >
          📨 Branch Bulk SMS & Reports
        </button>
      </div>

      {/* TAB 1: REMINDERS */}
      {activeTab === 'REMINDERS' && (
        <div className="staff-table-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Active Follow-Up & Payment Alerts</h3>
          {remindersLoading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Loading reminders...</p>
          ) : reminders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
              No pending payment or visit reminders.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminders.map((r) => {
                const isOverdue = new Date(r.alertDate) < new Date() && !r.isResolved;
                return (
                  <div key={r.id} className={`reminder-item-card ${r.isResolved ? 'resolved' : ''}`}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>
                          {r.memberProfile?.firstName} {r.memberProfile?.lastName} ({r.memberProfile?.memberId})
                        </strong>
                        <span className="tag-badge tag-info">{r.alertType}</span>
                        {isOverdue && <span className="tag-badge tag-danger">OVERDUE</span>}
                        {r.isResolved && <span className="tag-badge tag-success">RESOLVED</span>}
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: 4 }}>
                        Scheduled Date: <strong>{new Date(r.alertDate).toLocaleDateString()}</strong> • Branch:{' '}
                        {r.memberProfile?.ownerOrg?.name || 'HQ Central'}
                      </div>
                      {r.note && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                          "{r.note}"
                        </div>
                      )}
                    </div>
                    <div>
                      {!r.isResolved && (
                        <button
                          onClick={() => void handleResolveReminder(r.id)}
                          className="action-btn"
                          style={{ color: '#059669', borderColor: '#86efac' }}
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BIRTHDAYS */}
      {activeTab === 'BIRTHDAYS' && (
        <div className="staff-table-card">
          <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Automated Birthday Greetings (App, Email & WhatsApp)</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
            Scans all active profiles across the database for birthdays matching today's calendar date and triggers
            multi-channel greetings automatically.
          </p>

          <button onClick={() => void handleTriggerBirthdays()} disabled={birthdayLoading} className="create-staff-btn">
            {birthdayLoading ? 'Scanning Database...' : '🚀 Scan & Dispatch Today’s Birthday Wishes'}
          </button>

          {birthdayResult && (
            <div style={{ marginTop: 24, background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px', color: '#059669' }}>✓ {birthdayResult.message}</h4>
              {birthdayResult.dispatches?.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Mobile</th>
                      <th>Channels</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {birthdayResult.dispatches.map((d: any, i: number) => (
                      <tr key={i}>
                        <td>{d.name} ({d.memberId})</td>
                        <td>{d.mobile}</td>
                        <td><span className="tag-badge tag-success">App • Email • WhatsApp</span></td>
                        <td>{new Date(d.sentAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  No active members have a birthday registered for today's date.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FESTIVALS */}
      {activeTab === 'FESTIVALS' && (
        <div className="staff-table-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Broadcast Festival Greetings & Promotional Offers</h3>
          <form onSubmit={(e) => void handleSendFestival(e)} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>Festival Occasion *</label>
              <input
                type="text"
                required
                className="form-input"
                value={festivalForm.festivalName}
                onChange={(e) => setFestivalForm({ ...festivalForm, festivalName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Greeting & Promotional Message *</label>
              <textarea
                required
                className="form-input"
                style={{ minHeight: 90 }}
                value={festivalForm.message}
                onChange={(e) => setFestivalForm({ ...festivalForm, message: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Discount Percentage (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={festivalForm.discountPercent}
                  onChange={(e) => setFestivalForm({ ...festivalForm, discountPercent: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Offer Promo Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={festivalForm.offerCode}
                  onChange={(e) => setFestivalForm({ ...festivalForm, offerCode: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="create-staff-btn" style={{ alignSelf: 'flex-start' }}>
              📢 Broadcast Festival Campaign
            </button>
          </form>

          {festivalResult && (
            <div style={{ marginTop: 24, background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #86efac' }}>
              <strong style={{ color: '#166534' }}>✓ Campaign Dispatched Successfully!</strong>
              <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: 4 }}>
                Targeted: <strong>{festivalResult.recipientsTargeted} active members</strong> via Push, Email, and WhatsApp.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BULK SMS */}
      {activeTab === 'BULK_SMS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Dispatch Form */}
          <div className="staff-table-card">
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Dispatch Branch Bulk SMS Campaign</h3>
            <form onSubmit={(e) => void handleSendBulkSms(e)} style={{ maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Campaign Title *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={bulkSmsForm.title}
                  onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>SMS Body *</label>
                <textarea
                  required
                  className="form-input"
                  style={{ minHeight: 80 }}
                  value={bulkSmsForm.message}
                  onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, message: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Target ID Range Start (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. M20260001"
                    value={bulkSmsForm.targetIdRangeStart}
                    onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, targetIdRangeStart: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Target ID Range End (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. M20265000"
                    value={bulkSmsForm.targetIdRangeEnd}
                    onChange={(e) => setBulkSmsForm({ ...bulkSmsForm, targetIdRangeEnd: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" disabled={bulkSmsLoading} className="create-staff-btn" style={{ alignSelf: 'flex-start' }}>
                {bulkSmsLoading ? 'Dispatching...' : '📨 Dispatch SMS Campaign'}
              </button>
            </form>
          </div>

          {/* SMS Reports & Usage Table */}
          <div className="staff-table-card">
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem' }}>Branch-Wise SMS Usage Reports</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {smsReports.branchUsage.map((bu, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{bu.branchName}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                    {bu.totalSmsSent.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SMS sent</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{bu.totalCampaigns} total campaigns</div>
                </div>
              ))}
            </div>

            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Recent Dispatched Campaigns</h4>
            {smsReports.recentCampaigns.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Branch</th>
                    <th>Target ID Range</th>
                    <th>Recipients Count</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {smsReports.recentCampaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
                      <td>{c.branchName}</td>
                      <td>{c.idRange}</td>
                      <td style={{ fontWeight: 700 }}>{c.recipientCount}</td>
                      <td><span className="tag-badge tag-success">{c.status}</span></td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No campaigns dispatched yet.</p>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE REMINDER MODAL */}
      {showAddReminderModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Schedule Payment / Follow-up Alert</h3>
              <button onClick={() => setShowAddReminderModal(false)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={(e) => void handleCreateReminder(e)}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Member *</label>
                  <select
                    className="form-select"
                    value={reminderForm.memberProfileId}
                    onChange={(e) => setReminderForm({ ...reminderForm, memberProfileId: e.target.value })}
                  >
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberId} — {m.firstName} {m.lastName} ({m.mobile})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Scheduled Alert Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={reminderForm.alertDate}
                    onChange={(e) => setReminderForm({ ...reminderForm, alertDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Alert Type</label>
                  <select
                    className="form-select"
                    value={reminderForm.alertType}
                    onChange={(e) => setReminderForm({ ...reminderForm, alertType: e.target.value as any })}
                  >
                    <option value="PAYMENT">Payment Promised Date</option>
                    <option value="VISIT">Branch Visit Scheduled</option>
                    <option value="PACKAGE_FOLLOWUP">Package Renewal Follow-up</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Internal Follow-up Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Member requested callback at 3 PM regarding Gold tier"
                    value={reminderForm.note}
                    onChange={(e) => setReminderForm({ ...reminderForm, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddReminderModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Schedule Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AlertsModulePage;
