import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchStaffList,
  fetchStaffDetail,
  fetchStaffActivity,
  fetchStaffSalary,
  requestStaffOtp,
  createStaff,
  blockStaff,
  terminateStaff,
  addStaffSalary,
  setStaffAccessRules,
} from '../services/adminApi';
import { Role } from '../constants/roles';
import './StaffManagementPage.css';

interface StaffUser {
  id: string;
  employeeId?: string;
  fullName?: string;
  mobile: string;
  email?: string;
  role: string;
  status: string;
  staffDivision?: string;
  aadhaarUrl?: string;
  aadhaarVerified?: boolean;
  joiningDate?: string;
  createdAt: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  };
}

export const StaffManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'SUSPENDED'>('ACTIVE');
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [staffDetailTab, setStaffDetailTab] = useState<'DETAILS' | 'SALARY' | 'ACTIVITY' | 'ACCESS_RULES'>('DETAILS');

  // Sub-data for detail drawer
  const [activities, setActivities] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Create Staff Form State
  const [createForm, setCreateForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    role: Role.BRANCH_STAFF as string,
    staffDivision: 'NOT_APPLICABLE',
    aadhaarUrl: '',
    otpCode: '',
  });
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpMessage, setOtpMessage] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

  // Salary addition form state
  const [salaryForm, setSalaryForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    salaryAmount: 30000,
    incentiveAmount: 0,
    packageName: 'Gold',
    notes: '',
  });

  // Access rules form state
  const [accessRuleForm, setAccessRuleForm] = useState({
    idRangeStart: '',
    idRangeEnd: '',
    allowedCastes: '',
    allowedGenders: '',
    customSeries: '',
  });

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryStatus = activeTab === 'ALL' ? undefined : activeTab;
      const res = await fetchStaffList(queryStatus);
      setStaffList(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  // Request Mobile OTP for Staff Creation
  const handleRequestOtp = async () => {
    if (!createForm.mobile || createForm.mobile.length < 10) {
      setCreateError('Please enter a valid 10-digit mobile number first');
      return;
    }
    setCreateError(null);
    try {
      const res = await requestStaffOtp(createForm.mobile);
      setOtpSent(true);
      setOtpMessage(res.message || 'OTP sent! Use master code 123456 or check server log in dev mode.');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  };

  // Submit Create Staff
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.aadhaarUrl) {
      setCreateError('Aadhaar card upload is mandatory before Staff ID can be generated.');
      return;
    }
    if (!createForm.otpCode) {
      setCreateError('Mobile OTP verification is mandatory before Staff ID can be generated.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await createStaff(createForm);
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        mobile: '',
        email: '',
        password: '',
        role: Role.BRANCH_STAFF,
        staffDivision: 'NOT_APPLICABLE',
        aadhaarUrl: '',
        otpCode: '',
      });
      setOtpSent(false);
      void loadStaff();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create staff account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Staff Profile Detail Drawer
  const handleOpenStaffDetail = async (staff: StaffUser) => {
    setSelectedStaff(staff);
    setStaffDetailTab('DETAILS');
    setDetailLoading(true);
    try {
      const [fullStaff, actRes, salRes] = await Promise.all([
        fetchStaffDetail(staff.id),
        fetchStaffActivity(staff.id).catch(() => ({ activities: [] })),
        fetchStaffSalary(staff.id).catch(() => []),
      ]);
      setSelectedStaff(fullStaff);
      setActivities(actRes.activities || []);
      setSalaries(salRes || []);
    } catch (err) {
      console.error('Error fetching staff details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Block staff
  const handleBlockStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to block this staff member?')) return;
    try {
      await blockStaff(staffId);
      void loadStaff();
      if (selectedStaff?.id === staffId) setSelectedStaff(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error blocking staff');
    }
  };

  // Terminate staff
  const handleTerminateStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to terminate this staff account?')) return;
    try {
      await terminateStaff(staffId);
      void loadStaff();
      if (selectedStaff?.id === staffId) setSelectedStaff(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error terminating staff');
    }
  };

  // Add salary record
  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await addStaffSalary(selectedStaff.id, salaryForm);
      const salRes = await fetchStaffSalary(selectedStaff.id);
      setSalaries(salRes);
      alert('Salary / Commission payment recorded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error recording payment');
    }
  };

  // Set access rules
  const handleSaveAccessRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await setStaffAccessRules(selectedStaff.id, {
        idRangeStart: accessRuleForm.idRangeStart || undefined,
        idRangeEnd: accessRuleForm.idRangeEnd || undefined,
        allowedCastes: accessRuleForm.allowedCastes
          ? accessRuleForm.allowedCastes.split(',').map((s) => s.trim())
          : undefined,
        allowedGenders: accessRuleForm.allowedGenders
          ? accessRuleForm.allowedGenders.split(',').map((s) => s.trim())
          : undefined,
        customSeries: accessRuleForm.customSeries
          ? accessRuleForm.customSeries.split(',').map((s) => s.trim())
          : undefined,
      });
      alert('Staff access rules updated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving rules');
    }
  };

  return (
    <div className="staff-mgmt-root">
      {/* Top Header */}
      <div className="staff-header-panel">
        <div>
          <h2>Staff & User Management (Section 5.2)</h2>
          <p>Global staff directory, system employee IDs, Aadhaar verification, salary, and operational logs</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="create-staff-btn">
          ➕ Create Staff ID
        </button>
      </div>

      {/* Tabs */}
      <div className="staff-tabs">
        <button
          className={`staff-tab ${activeTab === 'ACTIVE' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          Active Staff <span className="tab-count-badge">{activeTab === 'ACTIVE' ? staffList.length : '•'}</span>
        </button>
        <button
          className={`staff-tab ${activeTab === 'BLOCKED' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('BLOCKED')}
        >
          Blocked Staff <span className="tab-count-badge">{activeTab === 'BLOCKED' ? staffList.length : '•'}</span>
        </button>
        <button
          className={`staff-tab ${activeTab === 'SUSPENDED' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('SUSPENDED')}
        >
          Suspended Staff <span className="tab-count-badge">{activeTab === 'SUSPENDED' ? staffList.length : '•'}</span>
        </button>
        <button
          className={`staff-tab ${activeTab === 'ALL' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All Staff Directory
        </button>
      </div>

      {/* Staff Table Card */}
      <div className="staff-table-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>Loading staff records...</p>
        ) : error ? (
          <p style={{ color: '#dc2626', padding: '20px 0' }}>{error}</p>
        ) : staffList.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
            No staff accounts found in this category.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Staff Name</th>
                  <th>Assigned Branch</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Aadhaar</th>
                  <th>Joining Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((st) => (
                  <tr key={st.id}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>
                      {st.employeeId || <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                    </td>
                    <td>
                      <strong>{st.fullName || 'N/A'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{st.mobile}</div>
                    </td>
                    <td>{st.organization?.name || 'HQ Central'}</td>
                    <td>
                      <span className="tag-badge tag-info">{st.role}</span>
                    </td>
                    <td>
                      <span
                        className={`tag-badge ${
                          st.status === 'ACTIVE'
                            ? 'tag-success'
                            : st.status === 'BLOCKED'
                            ? 'tag-danger'
                            : 'tag-warning'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td>
                      {st.aadhaarVerified ? (
                        <span className="tag-badge tag-success">✓ Verified</span>
                      ) : (
                        <span className="tag-badge tag-warning">Pending</span>
                      )}
                    </td>
                    <td>{new Date(st.joiningDate || st.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => void handleOpenStaffDetail(st)} className="action-btn">
                        👁️ Profile
                      </button>
                      {st.status === 'ACTIVE' && (
                        <button onClick={() => void handleBlockStaff(st.id)} className="action-btn danger">
                          🚫 Block
                        </button>
                      )}
                      {st.status !== 'TERMINATED' && (
                        <button onClick={() => void handleTerminateStaff(st.id)} className="action-btn danger">
                          ❌ Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF MODAL (With Aadhaar + Mobile OTP enforcement) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Staff Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateSubmit(e)}>
              <div className="modal-body">
                <div className="verification-callout">
                  <span>ℹ️</span>
                  <span>
                    <strong>Mandatory Requirement:</strong> Staff ID is generated ONLY after Aadhaar proof is
                    uploaded and mobile OTP is verified.
                  </span>
                </div>

                {createError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem' }}>
                    {createError}
                  </div>
                )}

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Mobile Number *</label>
                  <div className="otp-row">
                    <input
                      type="tel"
                      required
                      className="form-input"
                      placeholder="10-digit mobile"
                      value={createForm.mobile}
                      onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => void handleRequestOtp()}
                      className="btn-secondary"
                    >
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                  {otpMessage && <span style={{ fontSize: '0.75rem', color: '#059669' }}>{otpMessage}</span>}
                </div>

                <div className="form-group">
                  <label>Enter Mobile OTP Code *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="6-digit OTP (or master 123456)"
                    value={createForm.otpCode}
                    onChange={(e) => setCreateForm({ ...createForm, otpCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Upload Aadhaar Card Proof (URL / Document) *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="https://storage.supabase.co/proofs/aadhaar-sample.jpg"
                    value={createForm.aadhaarUrl}
                    onChange={(e) => setCreateForm({ ...createForm, aadhaarUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="staff@partnermatch.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="form-input"
                    placeholder="Minimum 8 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Role Assignment *</label>
                  <select
                    className="form-select"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value={Role.BRANCH_STAFF}>Branch Staff</option>
                    <option value={Role.BRANCH_MANAGER}>Branch Manager</option>
                    <option value={Role.BRANCH_AGENT}>Branch Agent</option>
                    <option value={Role.HQ_SERVICE_TEAM}>HQ Service Team</option>
                    <option value={Role.FRANCHISE_MANAGER}>Franchise Manager</option>
                    <option value={Role.FRANCHISE_STAFF}>Franchise Staff</option>
                    <option value={Role.ADMIN}>Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Staff Division</label>
                  <select
                    className="form-select"
                    value={createForm.staffDivision}
                    onChange={(e) => setCreateForm({ ...createForm, staffDivision: e.target.value })}
                  >
                    <option value="NOT_APPLICABLE">Not Applicable (General)</option>
                    <option value="FREE_TEAM">Free Team (Free Profiles)</option>
                    <option value="HQ_SERVICE_TEAM">HQ Service Team (Paid Profiles)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createSubmitting} className="btn-primary">
                  {createSubmitting ? 'Generating Staff ID...' : 'Generate Staff ID & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF PROFILE & ACTIVITY DRAWER / MODAL */}
      {selectedStaff && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <div>
                <h3>{selectedStaff.fullName || 'Staff Profile'}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: {selectedStaff.employeeId || 'N/A'} • Role: {selectedStaff.role}
                </span>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="modal-close-btn">
                ✕
              </button>
            </div>

            {/* Sub-nav tabs */}
            <div className="staff-tabs" style={{ padding: '0 24px', marginTop: 12 }}>
              <button
                className={`staff-tab ${staffDetailTab === 'DETAILS' ? 'active-tab' : ''}`}
                onClick={() => setStaffDetailTab('DETAILS')}
              >
                Profile & Info
              </button>
              <button
                className={`staff-tab ${staffDetailTab === 'SALARY' ? 'active-tab' : ''}`}
                onClick={() => setStaffDetailTab('SALARY')}
              >
                Salary / Payment History ({salaries.length})
              </button>
              <button
                className={`staff-tab ${staffDetailTab === 'ACTIVITY' ? 'active-tab' : ''}`}
                onClick={() => setStaffDetailTab('ACTIVITY')}
              >
                Activity History ({activities.length})
              </button>
              <button
                className={`staff-tab ${staffDetailTab === 'ACCESS_RULES' ? 'active-tab' : ''}`}
                onClick={() => setStaffDetailTab('ACCESS_RULES')}
              >
                Access Rules
              </button>
            </div>

            <div className="modal-body">
              {detailLoading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Loading details...</p>
              ) : (
                <>
                  {/* TAB 1: DETAILS */}
                  {staffDetailTab === 'DETAILS' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <strong>Mobile:</strong> {selectedStaff.mobile}
                      </div>
                      <div>
                        <strong>Email:</strong> {selectedStaff.email || 'N/A'}
                      </div>
                      <div>
                        <strong>Branch:</strong> {selectedStaff.organization?.name || 'HQ Central'}
                      </div>
                      <div>
                        <strong>Division:</strong> {selectedStaff.staffDivision || 'General'}
                      </div>
                      <div>
                        <strong>Joining Date:</strong>{' '}
                        {new Date(selectedStaff.joiningDate || selectedStaff.createdAt).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        <span className="tag-badge tag-success">{selectedStaff.status}</span>
                      </div>
                      <div>
                        <strong>Aadhaar Card:</strong>{' '}
                        {selectedStaff.aadhaarUrl ? (
                          <a
                            href={selectedStaff.aadhaarUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#2563eb', textDecoration: 'underline' }}
                          >
                            View Document
                          </a>
                        ) : (
                          'Not uploaded'
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SALARY & PAYMENT HISTORY */}
                  {staffDetailTab === 'SALARY' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <form
                        onSubmit={(e) => void handleAddSalary(e)}
                        style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      >
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Record Salary / Incentive Payment</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Month</label>
                            <input
                              type="month"
                              className="form-input"
                              value={salaryForm.month}
                              onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Salary (₹)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={salaryForm.salaryAmount}
                              onChange={(e) => setSalaryForm({ ...salaryForm, salaryAmount: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Incentive (₹)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={salaryForm.incentiveAmount}
                              onChange={(e) => setSalaryForm({ ...salaryForm, incentiveAmount: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Package Facilitated</label>
                            <input
                              type="text"
                              className="form-input"
                              value={salaryForm.packageName}
                              onChange={(e) => setSalaryForm({ ...salaryForm, packageName: e.target.value })}
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>
                          Record Payment
                        </button>
                      </form>

                      {salaries.length > 0 ? (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Salary</th>
                              <th>Incentive</th>
                              <th>Package</th>
                              <th>Payment Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salaries.map((sal) => (
                              <tr key={sal.id}>
                                <td>{sal.month}</td>
                                <td>₹{sal.salaryAmount.toLocaleString()}</td>
                                <td>₹{sal.incentiveAmount.toLocaleString()}</td>
                                <td>{sal.packageName || '-'}</td>
                                <td>{new Date(sal.paymentDate).toLocaleDateString()}</td>
                                <td><span className="tag-badge tag-success">{sal.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No salary records on file.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ACTIVITY HISTORY */}
                  {staffDetailTab === 'ACTIVITY' && (
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                      {activities.length > 0 ? (
                        activities.map((act) => (
                          <div key={act.id} className="alert-item">
                            <span className="alert-icon">⚡</span>
                            <div className="alert-content">
                              <p className="alert-title">
                                <strong>{act.action}</strong> • {act.resourceType || 'General'}
                              </p>
                              <div className="alert-time">{new Date(act.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No platform actions logged for this staff member.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 4: ACCESS RULES */}
                  {staffDetailTab === 'ACCESS_RULES' && (
                    <form onSubmit={(e) => void handleSaveAccessRules(e)}>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 14px' }}>
                        Configure member access boundaries for this staff account by Member ID ranges, Caste, Gender, or Custom Series.
                      </p>
                      <div className="form-group">
                        <label>ID Range Start (e.g. M20260001)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={accessRuleForm.idRangeStart}
                          onChange={(e) => setAccessRuleForm({ ...accessRuleForm, idRangeStart: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <label>ID Range End (e.g. M20265000)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={accessRuleForm.idRangeEnd}
                          onChange={(e) => setAccessRuleForm({ ...accessRuleForm, idRangeEnd: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <label>Allowed Castes (comma separated)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Brahmin, Reddy, Kamma"
                          value={accessRuleForm.allowedCastes}
                          onChange={(e) => setAccessRuleForm({ ...accessRuleForm, allowedCastes: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <label>Allowed Genders (comma separated)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Female, Male"
                          value={accessRuleForm.allowedGenders}
                          onChange={(e) => setAccessRuleForm({ ...accessRuleForm, allowedGenders: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <label>Custom ID Series (comma separated)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. TELUGU-HYD, AP-VIZAG"
                          value={accessRuleForm.customSeries}
                          onChange={(e) => setAccessRuleForm({ ...accessRuleForm, customSeries: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>
                        Save Access Rules
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedStaff(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffManagementPage;
