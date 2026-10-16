import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  leaveApi,
  LeaveApplication,
  StaffAttendanceRecord,
  ApplyLeavePayload,
} from '../services/leaveApi';
import './LeaveManagementPage.css';

export const LeaveManagementPage: React.FC = () => {
  const { user } = useAuth();

  const isManagerOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'BRANCH_MANAGER';

  // Tabs: 'MY_LEAVES' | 'MANAGE_LEAVES' | 'ATTENDANCE'
  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'MANAGE_LEAVES' | 'ATTENDANCE'>(
    isManagerOrAdmin ? 'MANAGE_LEAVES' : 'MY_LEAVES',
  );

  // --- MY LEAVES STATE ---
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [myLeavesLoading, setMyLeavesLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState<ApplyLeavePayload>({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // --- MANAGE LEAVES STATE (Manager/Admin) ---
  const [allLeaves, setAllLeaves] = useState<LeaveApplication[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModalLeave, setReviewModalLeave] = useState<LeaveApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // --- ATTENDANCE STATE (Manager/Admin) ---
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualModalRecord, setManualModalRecord] = useState<StaffAttendanceRecord | null>(null);
  const [manualForm, setManualForm] = useState({
    staffId: '',
    date: '',
    status: 'PRESENT' as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY',
    workingHours: 8,
    notes: '',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Load My Leaves
  const loadMyLeaves = async () => {
    try {
      setMyLeavesLoading(true);
      const res = await leaveApi.getMyLeaves();
      setMyLeaves(res.leaves);
    } catch (err: any) {
      console.error('Failed to load personal leaves:', err);
    } finally {
      setMyLeavesLoading(false);
    }
  };

  // Load All Leaves (Manager / Admin)
  const loadAllLeaves = async () => {
    try {
      setManageLoading(true);
      const res = await leaveApi.listLeaves({
        status: statusFilter || undefined,
      });
      setAllLeaves(res.leaves);
    } catch (err: any) {
      console.error('Failed to load leave records:', err);
    } finally {
      setManageLoading(false);
    }
  };

  // Load Attendance (Manager / Admin)
  const loadAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const res = await leaveApi.listAttendance({
        date: attendanceDate || undefined,
      });
      setAttendanceRecords(res.records);
    } catch (err: any) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MY_LEAVES') {
      loadMyLeaves();
    } else if (activeTab === 'MANAGE_LEAVES' && isManagerOrAdmin) {
      loadAllLeaves();
    } else if (activeTab === 'ATTENDANCE' && isManagerOrAdmin) {
      loadAttendance();
    }
  }, [activeTab, statusFilter, attendanceDate]);

  // Apply Leave Handler
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setApplySuccess(null);

    if (!applyForm.startDate || !applyForm.endDate) {
      setApplyError('Please provide both start date and end date.');
      return;
    }
    if (applyForm.startDate > applyForm.endDate) {
      setApplyError('Start date cannot be after end date.');
      return;
    }
    if (!applyForm.reason.trim()) {
      setApplyError('Please provide a reason for the leave.');
      return;
    }

    try {
      setApplySubmitting(true);
      await leaveApi.applyLeave(applyForm);
      setApplySuccess('Leave application submitted successfully!');
      setApplyForm({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess(null);
        loadMyLeaves();
      }, 1200);
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setApplySubmitting(false);
    }
  };

  // Cancel Personal Leave Handler
  const handleCancelLeave = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await leaveApi.cancelLeave(id);
      loadMyLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel leave application');
    }
  };

  // Review Leave Handler (Approve / Reject)
  const handleReviewLeave = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewModalLeave) return;
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      alert('Please state a reason for rejecting this leave application.');
      return;
    }

    try {
      setReviewSubmitting(true);
      await leaveApi.reviewLeave(reviewModalLeave.id, {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
      });
      setReviewModalLeave(null);
      setRejectionReason('');
      loadAllLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to update leave application');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Open Manual Attendance Modal
  const openManualModal = (record?: StaffAttendanceRecord) => {
    if (record) {
      setManualModalRecord(record);
      setManualForm({
        staffId: record.staffId,
        date: record.date,
        status: record.status,
        workingHours: record.workingHours || 8,
        notes: record.notes || '',
      });
    } else {
      setManualModalRecord(null);
      setManualForm({
        staffId: '',
        date: attendanceDate,
        status: 'PRESENT',
        workingHours: 8,
        notes: '',
      });
    }
  };

  // Submit Manual Attendance
  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.staffId || !manualForm.date) {
      alert('Staff and Date are required.');
      return;
    }

    try {
      setManualSubmitting(true);
      await leaveApi.manualCorrectAttendance(manualForm);
      setManualModalRecord(null);
      loadAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust attendance.');
    } finally {
      setManualSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PRESENT':
        return 'badge-success';
      case 'PENDING':
      case 'HALF_DAY':
        return 'badge-warning';
      case 'REJECTED':
      case 'ABSENT':
        return 'badge-danger';
      case 'ON_LEAVE':
        return 'badge-info';
      case 'CANCELLED':
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="leave-page-container">
      {/* Header Banner */}
      <div className="leave-page-header">
        <div className="header-left">
          <h1>📅 Leave Management & Attendance</h1>
          <p className="subtitle">
            Manage staff leave requests, automated login activity tracking, and authorized attendance adjustments.
          </p>
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={() => setShowApplyModal(true)}
          >
            + Apply for Leave
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="leave-nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'MY_LEAVES' ? 'active' : ''}`}
          onClick={() => setActiveTab('MY_LEAVES')}
        >
          My Leave History
        </button>

        {isManagerOrAdmin && (
          <>
            <button
              className={`nav-tab ${activeTab === 'MANAGE_LEAVES' ? 'active' : ''}`}
              onClick={() => setActiveTab('MANAGE_LEAVES')}
            >
              Leave Applications Review
            </button>
            <button
              className={`nav-tab ${activeTab === 'ATTENDANCE' ? 'active' : ''}`}
              onClick={() => setActiveTab('ATTENDANCE')}
            >
              Login Activity Attendance
            </button>
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: MY LEAVE APPLICATIONS */}
      {/* ============================================================== */}
      {activeTab === 'MY_LEAVES' && (
        <div className="leave-tab-content">
          <div className="section-title-bar">
            <h2>My Submitted Leave Requests</h2>
            <button className="btn btn-sm btn-outline" onClick={loadMyLeaves}>
              🔄 Refresh
            </button>
          </div>

          {myLeavesLoading ? (
            <div className="loading-state">Loading your leave requests...</div>
          ) : myLeaves.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏖️</span>
              <h3>No Leave Applications Found</h3>
              <p>You have not submitted any leave applications yet.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowApplyModal(true)}
              >
                Apply Now
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                    <th>Applied On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <strong>{leave.leaveType}</strong>
                      </td>
                      <td>{leave.startDate}</td>
                      <td>{leave.endDate}</td>
                      <td className="cell-reason">{leave.reason}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                        {leave.rejectionReason && (
                          <div className="text-danger small mt-1">
                            Note: {leave.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {leave.reviewedBy
                          ? `${leave.reviewedBy.fullName || 'Manager'} (${leave.reviewedBy.employeeId || 'Staff'})`
                          : '—'}
                      </td>
                      <td>{new Date(leave.createdAt).toLocaleDateString()}</td>
                      <td>
                        {leave.status === 'PENDING' ? (
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => handleCancelLeave(leave.id)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MANAGE LEAVE APPLICATIONS (Manager / Admin) */}
      {/* ============================================================== */}
      {activeTab === 'MANAGE_LEAVES' && isManagerOrAdmin && (
        <div className="leave-tab-content">
          <div className="filter-bar">
            <div className="filter-group">
              <label>Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button className="btn btn-sm btn-outline" onClick={loadAllLeaves}>
              🔄 Refresh List
            </button>
          </div>

          {manageLoading ? (
            <div className="loading-state">Loading branch leave records...</div>
          ) : allLeaves.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <h3>No Leave Applications Found</h3>
              <p>There are no leave applications matching your current filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Employee ID</th>
                    <th>Branch</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <strong>{leave.staff?.fullName || 'Staff Member'}</strong>
                        <div className="text-muted small">{leave.staff?.mobile}</div>
                      </td>
                      <td>{leave.staff?.employeeId || '—'}</td>
                      <td>{leave.staff?.organization?.name || 'HQ / Branch'}</td>
                      <td>
                        <strong>{leave.leaveType}</strong>
                      </td>
                      <td>
                        {leave.startDate} to {leave.endDate}
                      </td>
                      <td className="cell-reason">{leave.reason}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                          {leave.status}
                        </span>
                        {leave.rejectionReason && (
                          <div className="text-danger small mt-1">
                            Reason: {leave.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {leave.status === 'PENDING' ? (
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => {
                              setReviewModalLeave(leave);
                              setRejectionReason('');
                            }}
                          >
                            Review / Decision
                          </button>
                        ) : (
                          <span className="text-muted small">
                            {leave.reviewedBy?.fullName
                              ? `Reviewed by ${leave.reviewedBy.fullName}`
                              : 'Closed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LOGIN ACTIVITY ATTENDANCE (Manager / Admin) */}
      {/* ============================================================== */}
      {activeTab === 'ATTENDANCE' && isManagerOrAdmin && (
        <div className="leave-tab-content">
          <div className="filter-bar">
            <div className="filter-group">
              <label>Attendance Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
            <div className="filter-actions">
              <button className="btn btn-sm btn-outline" onClick={loadAttendance}>
                🔄 Refresh
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => openManualModal()}
              >
                ✏️ Manual Correction
              </button>
            </div>
          </div>

          <div className="attendance-info-banner">
            ℹ️ <strong>Automated Login Attendance:</strong> Recorded automatically during office hours.
            Multiple logins on the same day accumulate working hours without creating duplicate records.
            Staff with approved leave are protected and marked as <code>ON_LEAVE</code>.
          </div>

          {attendanceLoading ? (
            <div className="loading-state">Loading staff attendance records...</div>
          ) : attendanceRecords.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">⏱️</span>
              <h3>No Attendance Records Found</h3>
              <p>No login or leave records recorded for {attendanceDate}.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Employee ID</th>
                    <th>Branch</th>
                    <th>First Login</th>
                    <th>Last Active</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                    <th>Source / Audit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.staff?.fullName || 'Staff Member'}</strong>
                        <div className="text-muted small">{record.staff?.mobile}</div>
                      </td>
                      <td>{record.staff?.employeeId || '—'}</td>
                      <td>{record.staff?.organization?.name || 'Branch'}</td>
                      <td>
                        {record.firstLoginAt
                          ? new Date(record.firstLoginAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td>
                        {record.lastActiveAt
                          ? new Date(record.lastActiveAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td>
                        <strong>{record.workingHours != null ? `${record.workingHours} hrs` : '—'}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        {record.isManualAdjustment ? (
                          <div className="audit-tag manual">
                            ⚠️ Adjusted by {record.adjustedBy?.fullName || 'Manager'}
                            {record.notes && <div className="notes-text">"{record.notes}"</div>}
                          </div>
                        ) : (
                          <div className="audit-tag auto">🤖 Calculated from Login Activity</div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => openManualModal(record)}
                        >
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: APPLY FOR LEAVE */}
      {/* ============================================================== */}
      {showApplyModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📝 Submit Leave Application</h3>
              <button
                className="close-btn"
                onClick={() => setShowApplyModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="modal-body">
                {applyError && <div className="alert alert-danger">{applyError}</div>}
                {applySuccess && <div className="alert alert-success">{applySuccess}</div>}

                <div className="form-group">
                  <label>Leave Type *</label>
                  <select
                    value={applyForm.leaveType}
                    onChange={(e) =>
                      setApplyForm({ ...applyForm, leaveType: e.target.value })
                    }
                    required
                  >
                    <option value="CASUAL">Casual Leave (CL)</option>
                    <option value="SICK">Sick / Medical Leave (SL)</option>
                    <option value="EARNED">Earned Leave (EL)</option>
                    <option value="MATERNITY">Maternity / Paternity Leave</option>
                    <option value="EMERGENCY">Emergency Leave</option>
                    <option value="UNPAID">Loss of Pay (LWP)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group col-half">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={applyForm.startDate}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, startDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group col-half">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={applyForm.endDate}
                      onChange={(e) =>
                        setApplyForm({ ...applyForm, endDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason for Leave *</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details regarding your leave request..."
                    value={applyForm.reason}
                    onChange={(e) =>
                      setApplyForm({ ...applyForm, reason: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowApplyModal(false)}
                  disabled={applySubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={applySubmitting}
                >
                  {applySubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REVIEW LEAVE (Approve / Reject) */}
      {/* ============================================================== */}
      {reviewModalLeave && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📋 Review Leave Application</h3>
              <button
                className="close-btn"
                onClick={() => setReviewModalLeave(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="review-details">
                <p>
                  <strong>Staff:</strong> {reviewModalLeave.staff?.fullName || 'Staff'} (
                  {reviewModalLeave.staff?.employeeId || 'ID'})
                </p>
                <p>
                  <strong>Branch:</strong> {reviewModalLeave.staff?.organization?.name || 'Branch'}
                </p>
                <p>
                  <strong>Leave Type:</strong> {reviewModalLeave.leaveType}
                </p>
                <p>
                  <strong>Duration:</strong> {reviewModalLeave.startDate} to{' '}
                  {reviewModalLeave.endDate}
                </p>
                <p>
                  <strong>Reason:</strong> {reviewModalLeave.reason}
                </p>
              </div>

              <div className="form-group mt-3">
                <label>Rejection Reason (Required only if rejecting):</label>
                <textarea
                  rows={2}
                  placeholder="Provide reason if rejecting..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleReviewLeave('REJECTED')}
                disabled={reviewSubmitting}
              >
                Reject Request
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleReviewLeave('APPROVED')}
                disabled={reviewSubmitting}
              >
                Approve & Sync Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MANUAL ATTENDANCE CORRECTION */}
      {/* ============================================================== */}
      {manualModalRecord !== null && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>✏️ Manual Attendance Correction</h3>
              <button
                className="close-btn"
                onClick={() => setManualModalRecord(null)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleManualAttendance}>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Manual adjustments are tracked with an audit trail, recording your user ID and
                  reason.
                </p>

                <div className="form-group">
                  <label>Staff ID *</label>
                  <input
                    type="text"
                    value={manualForm.staffId}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, staffId: e.target.value })
                    }
                    placeholder="Staff User ID"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group col-half">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={manualForm.date}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group col-half">
                    <label>Status *</label>
                    <select
                      value={manualForm.status}
                      onChange={(e: any) =>
                        setManualForm({ ...manualForm, status: e.target.value })
                      }
                      required
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="HALF_DAY">HALF_DAY</option>
                      <option value="ON_LEAVE">ON_LEAVE</option>
                      <option value="HOLIDAY">HOLIDAY</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Working Hours (0 - 24)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={manualForm.workingHours}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        workingHours: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Audit Notes / Justification *</label>
                  <textarea
                    rows={2}
                    placeholder="Provide reason for manual correction..."
                    value={manualForm.notes}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, notes: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setManualModalRecord(null)}
                  disabled={manualSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={manualSubmitting}
                >
                  {manualSubmitting ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
