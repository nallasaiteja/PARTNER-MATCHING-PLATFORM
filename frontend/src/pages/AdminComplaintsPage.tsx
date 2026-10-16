import React, { useState, useEffect } from 'react';
import {
  complaintsApi,
  InternalComplaintData,
  CreateComplaintPayload,
  UpdateComplaintPayload,
} from '../services/complaintsApi';
import './AdminComplaintsPage.css';

export const AdminComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<InternalComplaintData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateComplaintPayload>({
    type: 'MEMBER',
    relatedMemberId: '',
    relatedStaffId: '',
    subject: '',
    description: '',
    internalNotes: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View / Update Modal
  const [selectedComplaint, setSelectedComplaint] = useState<InternalComplaintData | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED'
  >('OPEN');
  const [updateInternalNotes, setUpdateInternalNotes] = useState('');
  const [updateHistoryNote, setUpdateHistoryNote] = useState('');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadComplaints = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await complaintsApi.listComplaints({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page: targetPage,
        limit: 15,
      });
      setComplaints(res.complaints);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setPage(res.page);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaints records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints(1);
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints(1);
  };

  // Handle Create Complaint
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (createForm.type === 'MEMBER' && !createForm.relatedMemberId?.trim()) {
      setCreateError('Member ID is required for Member Complaints.');
      return;
    }
    if (createForm.type === 'STAFF' && !createForm.relatedStaffId?.trim()) {
      setCreateError('Staff ID or Employee ID is required for Staff Complaints.');
      return;
    }
    if (!createForm.subject.trim() || !createForm.description.trim()) {
      setCreateError('Subject and Description are mandatory.');
      return;
    }

    try {
      setCreateSubmitting(true);
      await complaintsApi.createComplaint({
        ...createForm,
        relatedMemberId: createForm.type === 'MEMBER' ? createForm.relatedMemberId?.trim() : undefined,
        relatedStaffId: createForm.type === 'STAFF' ? createForm.relatedStaffId?.trim() : undefined,
      });
      setShowCreateModal(false);
      setCreateForm({
        type: 'MEMBER',
        relatedMemberId: '',
        relatedStaffId: '',
        subject: '',
        description: '',
        internalNotes: '',
      });
      loadComplaints(1);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to submit complaint.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Details Modal
  const openDetailsModal = (complaint: InternalComplaintData) => {
    setSelectedComplaint(complaint);
    setUpdateStatus(complaint.status);
    setUpdateInternalNotes(complaint.internalNotes || '');
    setUpdateHistoryNote('');
    setUpdateError(null);
  };

  // Handle Update Complaint
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdateError(null);

    try {
      setUpdateSubmitting(true);
      const payload: UpdateComplaintPayload = {
        status: updateStatus,
        internalNotes: updateInternalNotes,
        historyNote: updateHistoryNote.trim() || undefined,
      };
      const res = await complaintsApi.updateComplaint(selectedComplaint.id, payload);
      setSelectedComplaint(res.complaint);
      setUpdateHistoryNote('');
      loadComplaints(page);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update complaint.');
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="status-badge open">Open</span>;
      case 'UNDER_INVESTIGATION':
        return <span className="status-badge investigating">Investigating</span>;
      case 'RESOLVED':
        return <span className="status-badge resolved">Resolved</span>;
      case 'DISMISSED':
        return <span className="status-badge dismissed">Dismissed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-complaints-container">
      {/* Page Header */}
      <div className="complaints-header">
        <div className="header-info">
          <h1>⚖️ Internal Complaints Module</h1>
          <p className="subtitle">
            Confidential record-management for member and staff complaints. Strictly restricted to Admin users.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
        >
          + Log New Complaint
        </button>
      </div>

      {/* Security Notice */}
      <div className="confidential-banner">
        🔒 <strong>Confidential Access Policy:</strong> In accordance with Platform Specifications, complaints records
        are strictly isolated from regular staff, agents, and public member dashboards.
      </div>

      {/* Filter / Search Bar */}
      <div className="complaints-filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by complaint #, member ID, staff name, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            🔍 Search
          </button>
        </form>

        <div className="filter-dropdowns">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types (Member & Staff)</option>
            <option value="MEMBER">Member Complaints</option>
            <option value="STAFF">Staff Complaints</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          <button
            className="btn btn-sm btn-outline"
            onClick={() => {
              setTypeFilter('');
              setStatusFilter('');
              setSearchTerm('');
              loadComplaints(1);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="complaints-content-box">
        {loading ? (
          <div className="loading-state">Loading complaints records...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📁</span>
            <h3>No Complaints Records Found</h3>
            <p>No complaints match the current filter criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Type</th>
                  <th>Target Party</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Logged By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="complaint-ref">{c.complaintNumber}</span>
                    </td>
                    <td>
                      <span className={`type-tag ${c.type.toLowerCase()}`}>
                        {c.type === 'MEMBER' ? '👤 Member' : '💼 Staff'}
                      </span>
                    </td>
                    <td>
                      {c.type === 'MEMBER' ? (
                        <div>
                          <strong>
                            {c.relatedMember
                              ? `${c.relatedMember.firstName} ${c.relatedMember.lastName}`
                              : 'Member'}
                          </strong>
                          <div className="text-muted small">
                            ID: {c.relatedMember?.memberId || '—'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong>{c.relatedStaff?.fullName || 'Staff Member'}</strong>
                          <div className="text-muted small">
                            Emp ID: {c.relatedStaff?.employeeId || '—'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="cell-subject">
                      <strong>{c.subject}</strong>
                      <div className="text-muted small text-truncate">
                        {c.description}
                      </div>
                    </td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="small">
                        {c.createdBy?.fullName || 'Admin'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => openDetailsModal(c)}
                      >
                        View & Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <span>
              Showing Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-xs btn-outline"
                disabled={page <= 1}
                onClick={() => loadComplaints(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-xs btn-outline"
                disabled={page >= totalPages}
                onClick={() => loadComplaints(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: LOG NEW COMPLAINT */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>📝 Log Internal Complaint</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && <div className="alert alert-danger">{createError}</div>}

                <div className="form-group">
                  <label>Complaint Type *</label>
                  <div className="type-toggle-group">
                    <button
                      type="button"
                      className={`type-btn ${createForm.type === 'MEMBER' ? 'selected' : ''}`}
                      onClick={() => setCreateForm({ ...createForm, type: 'MEMBER' })}
                    >
                      👤 Member Complaint
                    </button>
                    <button
                      type="button"
                      className={`type-btn ${createForm.type === 'STAFF' ? 'selected' : ''}`}
                      onClick={() => setCreateForm({ ...createForm, type: 'STAFF' })}
                    >
                      💼 Staff Complaint
                    </button>
                  </div>
                </div>

                {createForm.type === 'MEMBER' ? (
                  <div className="form-group">
                    <label>Related Member ID (or Member Profile UUID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. M2026001 or member UUID"
                      value={createForm.relatedMemberId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, relatedMemberId: e.target.value })
                      }
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Related Staff Employee ID (or User UUID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-1002 or staff UUID"
                      value={createForm.relatedStaffId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, relatedStaffId: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Complaint Subject *</label>
                  <input
                    type="text"
                    placeholder="Brief summary of the issue..."
                    value={createForm.subject}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, subject: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Full Complaint Description *</label>
                  <textarea
                    rows={4}
                    placeholder="Provide full factual description of the complaint..."
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confidential Internal Notes (Admin only)</label>
                  <textarea
                    rows={2}
                    placeholder="Internal follow-up instructions, branch remarks..."
                    value={createForm.internalNotes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, internalNotes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Logging...' : 'Log Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VIEW / UPDATE COMPLAINT */}
      {/* ============================================================== */}
      {selectedComplaint && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>
                📋 Complaint Details: <span className="ref-highlight">{selectedComplaint.complaintNumber}</span>
              </h3>
              <button
                className="close-btn"
                onClick={() => setSelectedComplaint(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {updateError && <div className="alert alert-danger">{updateError}</div>}

              {/* Read-Only Summary */}
              <div className="complaint-summary-card">
                <div className="summary-row">
                  <div>
                    <span className="summary-label">Type:</span>{' '}
                    <strong>{selectedComplaint.type}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Current Status:</span>{' '}
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                  <div>
                    <span className="summary-label">Date Submitted:</span>{' '}
                    {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="summary-row mt-2">
                  <div>
                    <span className="summary-label">Target Party:</span>{' '}
                    {selectedComplaint.type === 'MEMBER'
                      ? `${selectedComplaint.relatedMember?.firstName || ''} ${selectedComplaint.relatedMember?.lastName || ''} (ID: ${selectedComplaint.relatedMember?.memberId || '—'})`
                      : `${selectedComplaint.relatedStaff?.fullName || 'Staff'} (Emp ID: ${selectedComplaint.relatedStaff?.employeeId || '—'})`}
                  </div>
                  <div>
                    <span className="summary-label">Logged By:</span>{' '}
                    {selectedComplaint.createdBy?.fullName || 'Admin'}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="summary-label">Subject:</div>
                  <div className="summary-subject">{selectedComplaint.subject}</div>
                </div>

                <div className="mt-2">
                  <div className="summary-label">Description:</div>
                  <div className="summary-desc">{selectedComplaint.description}</div>
                </div>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleUpdateSubmit} className="mt-4">
                <h4 className="section-subheading">Update Status & Resolution</h4>

                <div className="form-row">
                  <div className="form-group col-half">
                    <label>Change Status:</label>
                    <select
                      value={updateStatus}
                      onChange={(e: any) => setUpdateStatus(e.target.value)}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
                  </div>

                  <div className="form-group col-half">
                    <label>Action / Decision Note:</label>
                    <input
                      type="text"
                      placeholder="Remarks explaining status transition..."
                      value={updateHistoryNote}
                      onChange={(e) => setUpdateHistoryNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confidential Internal Notes:</label>
                  <textarea
                    rows={2}
                    value={updateInternalNotes}
                    onChange={(e) => setUpdateInternalNotes(e.target.value)}
                    placeholder="Internal investigation notes..."
                  />
                </div>

                <div className="action-row">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={updateSubmitting}
                  >
                    {updateSubmitting ? 'Saving...' : '💾 Save Status & Notes'}
                  </button>
                </div>
              </form>

              {/* Status History Audit Trail */}
              <div className="history-section mt-4">
                <h4 className="section-subheading">📜 Status History & Audit Trail</h4>
                {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 ? (
                  <div className="timeline">
                    {selectedComplaint.statusHistory.map((h, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-status">{h.status}</span>
                            <span className="timeline-time">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {h.notes && <div className="timeline-notes">"{h.notes}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No status change history recorded.</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
