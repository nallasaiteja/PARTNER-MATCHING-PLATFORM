import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchAdminMemberList,
  verifyAdminIdProof,
  blockMember,
  unblockMember,
  approveProfileClosure,
  markMemberAsPaid,
  fetchInternalNotes,
  addInternalNote,
  fetchStaffList,
  fetchUpdateRequests,
  reviewUpdateRequest,
} from '../services/adminApi';
import { fetchPackages } from '../services/memberApi';
import { useAuth } from '../auth/AuthProvider';
import { Role } from '../constants/roles';
import './MemberManagementPage.css';

interface MemberItem {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email?: string;
  packageType: string;
  packageName: string;
  packageExpiresAt?: string;
  branchName: string;
  branchId?: string;
  isBlocked: boolean;
  blockedAt?: string;
  blockedReason?: string;
  blockedByStaff?: string;
  closureRequested: boolean;
  closureReason?: string;
  isFeatured: boolean;
  notesCount: number;
  pendingUpdateRequests: number;
  createdAt: string;
  idProofStatus?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofFileUrl?: string;
  idProofRejectionReason?: string;
  idProofVerifiedAt?: string;
  idProofVerifiedBy?: string;
  verificationStatus?: string;
  submittedForVerificationAt?: string;
  completedSteps?: number[];
  currentStep?: number;
}

export const MemberManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;

  const [activeTab, setActiveTab] = useState<
    'ALL' | 'PENDING_VERIFICATION' | 'FREE' | 'PAID' | 'BLOCKED' | 'TERMINATED' | 'CONVERTED' | 'UPDATE_REQUESTS'
  >('ALL');

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ID Proof Verification Modal
  const [verifyModalMember, setVerifyModalMember] = useState<MemberItem | null>(null);
  const [verifyActionType, setVerifyActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [verifyRejectionReason, setVerifyRejectionReason] = useState<string>('');
  const [verifySubmitting, setVerifySubmitting] = useState<boolean>(false);

  // Modals & Panels
  const [blockModalMember, setBlockModalMember] = useState<MemberItem | null>(null);
  const [blockReason, setBlockReason] = useState<string>('Marriage Settled');
  const [blockCustomReason, setBlockCustomReason] = useState<string>('');

  const [markPaidMember, setMarkPaidMember] = useState<MemberItem | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paidNotes, setPaidNotes] = useState<string>('');

  // CRM Notes Drawer
  const [notesMember, setNotesMember] = useState<MemberItem | null>(null);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [notesLoading, setNotesLoading] = useState<boolean>(false);

  // Update Requests Queue
  const [updateRequests, setUpdateRequests] = useState<any[]>([]);
  const [updateReqLoading, setUpdateReqLoading] = useState<boolean>(false);

  // Load Members
  const loadMembers = useCallback(async () => {
    if (activeTab === 'UPDATE_REQUESTS') {
      try {
        setUpdateReqLoading(true);
        const res = await fetchUpdateRequests('PENDING');
        setUpdateRequests(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load update requests');
      } finally {
        setUpdateReqLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminMemberList({
        type: activeTab,
        search: search.trim() || undefined,
        page,
        limit: 20,
      });
      setMembers(res.members || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, page]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Load Packages and Staff for Mark As Paid
  useEffect(() => {
    void fetchPackages().then(setPackages).catch(console.error);
    void fetchStaffList().then(setStaffList).catch(console.error);
  }, []);

  // Handle Blocking
  const handleConfirmBlock = async () => {
    if (!blockModalMember) return;
    const finalReason = blockReason === 'Other' ? blockCustomReason : blockReason;
    try {
      await blockMember(blockModalMember.id, finalReason || 'Not Specified');
      setBlockModalMember(null);
      setBlockCustomReason('');
      void loadMembers();
      alert('Member profile blocked. SMS dispatch triggered.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error blocking member');
    }
  };

  // Handle Unblocking
  const handleUnblock = async (member: MemberItem) => {
    if (!window.confirm(`Are you sure you want to unblock member ${member.firstName} (${member.memberId})?`)) return;
    try {
      await unblockMember(member.id);
      void loadMembers();
      alert('Member profile successfully unblocked by Admin.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error unblocking member');
    }
  };

  // Handle Closure Approval
  const handleApproveClosure = async (member: MemberItem) => {
    if (!window.confirm(`Approve permanent profile closure for ${member.firstName}? Record will be preserved.`)) return;
    try {
      await approveProfileClosure(member.id);
      void loadMembers();
      alert('Profile closure approved. Member safely closed without data deletion.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving closure');
    }
  };

  // Handle Mark as Paid
  const handleConfirmMarkPaid = async () => {
    if (!markPaidMember || !selectedPackageId || !selectedStaffId) {
      alert('Please select both a Package and the Facilitating Staff member.');
      return;
    }
    try {
      await markMemberAsPaid(markPaidMember.id, {
        packageId: selectedPackageId,
        facilitatingStaffId: selectedStaffId,
        paymentMode,
        notes: paidNotes,
      });
      setMarkPaidMember(null);
      void loadMembers();
      alert('Member successfully converted to Paid tier and invoice approved!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error marking member as paid');
    }
  };

  // Open Notes Drawer
  const handleOpenNotes = async (member: MemberItem) => {
    setNotesMember(member);
    setNotesLoading(true);
    try {
      const notes = await fetchInternalNotes(member.id);
      setNotesList(notes);
    } catch (err) {
      console.error(err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Submit Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesMember || !newNoteText.trim()) return;
    try {
      await addInternalNote(notesMember.id, newNoteText);
      setNewNoteText('');
      const updatedNotes = await fetchInternalNotes(notesMember.id);
      setNotesList(updatedNotes);
      void loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding note');
    }
  };

  // Review Update Request
  const handleReviewRequest = async (requestId: string, action: 'APPROVED' | 'DISMISSED') => {
    const reason = action === 'DISMISSED' ? prompt('Enter reason for dismissing request:') || 'Dismissed by Admin' : undefined;
    try {
      await reviewUpdateRequest(requestId, action, reason);
      const res = await fetchUpdateRequests('PENDING');
      setUpdateRequests(res);
      alert(`Profile update request ${action.toLowerCase()} successfully.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error processing update request');
    }
  };

  const handleVerifyIdProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalMember) return;
    if (verifyActionType === 'REJECT' && (!verifyRejectionReason || verifyRejectionReason.trim().length < 5)) {
      alert('A rejection reason of at least 5 characters is required.');
      return;
    }
    try {
      setVerifySubmitting(true);
      await verifyAdminIdProof(verifyModalMember.id, {
        verified: verifyActionType === 'APPROVE',
        rejectionReason: verifyActionType === 'REJECT' ? verifyRejectionReason.trim() : undefined,
      });
      alert(verifyActionType === 'APPROVE' ? 'ID Proof Approved and Verified!' : 'ID Proof Rejected with reason.');
      setVerifyModalMember(null);
      setVerifyRejectionReason('');
      await loadMembers();
    } catch (err: any) {
      alert(err.message || 'Verification decision failed');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // Separate staff into active and inactive
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');
  const inactiveStaff = staffList.filter((s) => s.status !== 'ACTIVE');

  return (
    <div className="member-mgmt-root">
      {/* Header Panel */}
      <div className="member-header-panel">
        <div>
          <h2>Member Management & CRM (Section 5.3)</h2>
          <p>Full member directory, free/paid classification, blocking/unblocking, closure requests, and CRM logs</p>
        </div>
        <div className="search-input-wrapper">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            placeholder="Search by ID, Name, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Sub-view Tabs */}
      <div className="member-sub-tabs">
        <button
          className={`member-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ALL'); setPage(1); }}
        >
          All Members {activeTab === 'ALL' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'PENDING_VERIFICATION' ? 'active' : ''}`}
          onClick={() => { setActiveTab('PENDING_VERIFICATION'); setPage(1); }}
          style={{ fontWeight: 700 }}
        >
          🛡️ Pending Verification {activeTab === 'PENDING_VERIFICATION' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'FREE' ? 'active' : ''}`}
          onClick={() => { setActiveTab('FREE'); setPage(1); }}
        >
          Free Members {activeTab === 'FREE' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'PAID' ? 'active' : ''}`}
          onClick={() => { setActiveTab('PAID'); setPage(1); }}
        >
          Paid Members {activeTab === 'PAID' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'BLOCKED' ? 'active' : ''}`}
          onClick={() => { setActiveTab('BLOCKED'); setPage(1); }}
        >
          Blocked Members {activeTab === 'BLOCKED' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'TERMINATED' ? 'active' : ''}`}
          onClick={() => { setActiveTab('TERMINATED'); setPage(1); }}
        >
          Terminated (Expired) {activeTab === 'TERMINATED' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'CONVERTED' ? 'active' : ''}`}
          onClick={() => { setActiveTab('CONVERTED'); setPage(1); }}
        >
          Caste Converted {activeTab === 'CONVERTED' && `(${total})`}
        </button>
        <button
          className={`member-tab-btn ${activeTab === 'UPDATE_REQUESTS' ? 'active' : ''}`}
          onClick={() => { setActiveTab('UPDATE_REQUESTS'); }}
        >
          Pending Profile Updates ({updateRequests.length})
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'UPDATE_REQUESTS' ? (
        <div className="staff-table-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Pending Member Profile Update Requests</h3>
          {updateReqLoading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Loading requests...</p>
          ) : updateRequests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>No pending update requests.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Submitted At</th>
                  <th>Requested Changes (JSON)</th>
                  <th>Immutable Fields Check</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {updateRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.memberProfile.firstName} {req.memberProfile.lastName}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.memberProfile.memberId}</div>
                    </td>
                    <td>{new Date(req.createdAt).toLocaleString()}</td>
                    <td>
                      <pre style={{ fontSize: '0.75rem', margin: 0, maxHeight: 80, overflowY: 'auto' }}>
                        {JSON.stringify(req.requestedData, null, 2)}
                      </pre>
                    </td>
                    <td>
                      <span className="tag-badge tag-success">Protected (Sanitized on Approve)</span>
                    </td>
                    <td>
                      <button
                        onClick={() => void handleReviewRequest(req.id, 'APPROVED')}
                        className="action-btn"
                        style={{ color: '#059669', borderColor: '#86efac' }}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => void handleReviewRequest(req.id, 'DISMISSED')}
                        className="action-btn danger"
                      >
                        ✕ Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="staff-table-card">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Querying member directory...</p>
          ) : error ? (
            <p style={{ color: '#dc2626', padding: '20px 0' }}>{error}</p>
          ) : members.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No member profiles found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  {activeTab === 'PENDING_VERIFICATION' ? (
                    <tr>
                      <th>Member ID</th>
                      <th>Name & Mobile</th>
                      <th>Branch</th>
                      <th>Submitted Date</th>
                      <th>Profile Progress</th>
                      <th>ID Proof Status</th>
                      <th>CRM Notes</th>
                      <th>Verification Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Member ID</th>
                      <th>Name</th>
                      <th>Gender & Age</th>
                      <th>Tier / Package</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>CRM Notes</th>
                      <th>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>{m.memberId}</td>
                      <td>
                        <strong>{m.firstName} {m.lastName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.mobile || 'Confidential'}</div>
                      </td>
                      {activeTab === 'PENDING_VERIFICATION' ? (
                        <>
                          <td>{m.branchName}</td>
                          <td>
                            {m.submittedForVerificationAt
                              ? new Date(m.submittedForVerificationAt).toLocaleDateString()
                              : new Date(m.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <span className="tag-badge tag-info">
                              {m.completedSteps && m.completedSteps.length >= 5
                                ? '5/5 Steps Done'
                                : `${m.completedSteps?.length || m.currentStep || 1}/5 Steps`}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tag-badge ${
                                m.idProofStatus === 'VERIFIED'
                                  ? 'tag-success'
                                  : m.idProofStatus === 'REJECTED'
                                  ? 'tag-danger'
                                  : 'tag-warning'
                              }`}
                            >
                              {m.idProofStatus || (m.idProofFileUrl ? 'PENDING_REVIEW' : 'NOT_UPLOADED')}
                            </span>
                            {m.idProofRejectionReason && (
                              <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: 2 }}>
                                Reason: {m.idProofRejectionReason}
                              </div>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {m.gender} • {new Date().getFullYear() - new Date(m.dateOfBirth).getFullYear()} yrs
                          </td>
                          <td>
                            <span className={`tag-badge ${m.packageType === 'PAID' ? 'tag-success' : 'tag-info'}`}>
                              {m.packageName}
                            </span>
                          </td>
                          <td>{m.branchName}</td>
                          <td>
                            {m.isBlocked ? (
                              <div>
                                <span className="tag-badge tag-danger">BLOCKED</span>
                                <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: 2 }}>
                                  {m.blockedReason}
                                </div>
                                {m.blockedByStaff && (
                                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    by {m.blockedByStaff}
                                  </div>
                                )}
                              </div>
                            ) : m.closureRequested ? (
                              <div>
                                <span className="tag-badge tag-warning">Closure Requested</span>
                                <div style={{ fontSize: '0.7rem', color: '#854d0e' }}>{m.closureReason}</div>
                              </div>
                            ) : (
                              <span className="tag-badge tag-success">ACTIVE</span>
                            )}
                          </td>
                        </>
                      )}
                      <td>
                        <button onClick={() => void handleOpenNotes(m)} className="action-btn">
                          💬 Notes ({m.notesCount})
                        </button>
                      </td>
                      <td>
                        {/* ID Proof Review Action */}
                        <button
                          onClick={() => {
                            setVerifyModalMember(m);
                            setVerifyActionType('APPROVE');
                            setVerifyRejectionReason(m.idProofRejectionReason || '');
                          }}
                          className="action-btn"
                          style={{ color: '#0284c7', borderColor: '#7dd3fc', fontWeight: 600 }}
                          title="Review submitted ID proof document and approve or reject"
                        >
                          🔍 Review ID
                        </button>

                        {/* Block / Unblock Actions */}
                        {!m.isBlocked ? (
                          <button
                            onClick={() => {
                              setBlockModalMember(m);
                              setBlockReason('Marriage Settled');
                            }}
                            className="action-btn danger"
                          >
                            🚫 Block
                          </button>
                        ) : (
                          isAdminOrSuper && (
                            <button
                              onClick={() => void handleUnblock(m)}
                              className="action-btn"
                              style={{ color: '#059669', borderColor: '#86efac' }}
                            >
                              🔓 Unblock
                            </button>
                          )
                        )}

                        {/* Closure Approval Action */}
                        {m.closureRequested && (
                          <button
                            onClick={() => void handleApproveClosure(m)}
                            className="action-btn"
                            style={{ color: '#b45309', borderColor: '#fde047' }}
                          >
                            ✓ Approve Closure
                          </button>
                        )}

                        {/* Mark As Paid Action (if Free) */}
                        {m.packageType === 'FREE' && !m.isBlocked && (
                          <button
                            onClick={() => {
                              setMarkPaidMember(m);
                              setSelectedPackageId(packages[0]?.id || '');
                              setSelectedStaffId(activeStaff[0]?.id || '');
                            }}
                            className="action-btn"
                            style={{ color: '#2563eb', borderColor: '#93c5fd' }}
                          >
                            💎 Mark Paid
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
      )}

      {/* BLOCK MODAL */}
      {blockModalMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Block Member Profile</h3>
              <button onClick={() => setBlockModalMember(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Blocking <strong>{blockModalMember.firstName} {blockModalMember.lastName}</strong> ({blockModalMember.memberId}).
                An SMS will be dispatched automatically to the member.
              </p>
              <div className="form-group">
                <label>Blocking Category / Reason *</label>
                <select
                  className="form-select"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                >
                  <option value="Marriage Settled">Marriage Settled</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Inappropriate Conduct">Inappropriate Conduct / Fake Profile</option>
                  <option value="Other">Other Reason (Specify)</option>
                </select>
              </div>
              {blockReason === 'Other' && (
                <div className="form-group">
                  <label>Specific Reason Details *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Enter blocking reason..."
                    value={blockCustomReason}
                    onChange={(e) => setBlockCustomReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setBlockModalMember(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => void handleConfirmBlock()} className="btn-primary" style={{ background: '#dc2626' }}>
                Confirm & Block Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK AS PAID MODAL */}
      {markPaidMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h3>Mark Member as Paid (Section 5.3)</h3>
              <button onClick={() => setMarkPaidMember(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Converting <strong>{markPaidMember.firstName} {markPaidMember.lastName}</strong> ({markPaidMember.memberId})
                to a Paid Subscription tier.
              </p>

              <div className="form-group">
                <label>Select Membership Package *</label>
                <select
                  className="form-select"
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ₹{pkg.cost.toLocaleString()} ({pkg.validityDays} days, {pkg.contactReveals} contacts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Facilitating Agent / Staff ID * (Active shown first)</label>
                <select
                  className="form-select"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                >
                  <optgroup label="Active Staff">
                    {activeStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.employeeId || 'STAFF'} — {st.fullName || st.mobile} ({st.organization?.name || 'HQ'})
                      </option>
                    ))}
                  </optgroup>
                  {inactiveStaff.length > 0 && (
                    <optgroup label="Inactive / Suspended Staff">
                      {inactiveStaff.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.employeeId || 'STAFF'} — {st.fullName || st.mobile} [{st.status}]
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Mode</label>
                <select
                  className="form-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="ONLINE">Net Banking</option>
                  <option value="CASH">Branch Cash Deposit</option>
                  <option value="EMI">EMI</option>
                </select>
              </div>

              <div className="form-group">
                <label>Internal Notes / Voucher Reference</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Branch walk-in transaction #49102"
                  value={paidNotes}
                  onChange={(e) => setPaidNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setMarkPaidMember(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => void handleConfirmMarkPaid()} className="btn-primary">
                Confirm & Activate Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRM & INTERNAL NOTES DRAWER */}
      {notesMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h3>CRM Internal Notes</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {notesMember.firstName} {notesMember.lastName} ({notesMember.memberId}) • Strictly confidential to staff
                </span>
              </div>
              <button onClick={() => setNotesMember(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              {/* Add Note Form */}
              <form onSubmit={(e) => void handleAddNote(e)} className="crm-add-note-box">
                <textarea
                  required
                  placeholder="Record communication history, follow-up conversation logs, or member requirements..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                  ➕ Save Private Note
                </button>
              </form>

              {/* Notes History */}
              <h4 style={{ margin: '14px 0 6px', fontSize: '0.9rem' }}>Communication History</h4>
              <div className="crm-notes-container">
                {notesLoading ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading confidential notes...</p>
                ) : notesList.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No internal notes on file for this member yet.
                  </p>
                ) : (
                  notesList.map((n) => (
                    <div key={n.id} className="crm-note-bubble">
                      <div className="crm-note-header">
                        <strong>{n.staff.fullName || n.staff.employeeId || n.staff.mobile} ({n.staff.role})</strong>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="crm-note-body">{n.note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setNotesMember(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ID PROOF REVIEW & VERIFICATION MODAL */}
      {verifyModalMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>🪪 ID Proof Verification Review</h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Member: {verifyModalMember.firstName} {verifyModalMember.lastName} ({verifyModalMember.memberId})
                </span>
              </div>
              <button onClick={() => setVerifyModalMember(null)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body">
              {/* Member & ID Details Summary Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.88rem' }}>
                  <div><strong style={{ color: '#475569' }}>Member ID:</strong> {verifyModalMember.memberId}</div>
                  <div><strong style={{ color: '#475569' }}>Branch:</strong> {verifyModalMember.branchName}</div>
                  <div><strong style={{ color: '#475569' }}>Mobile:</strong> {verifyModalMember.mobile || 'Confidential'}</div>
                  <div><strong style={{ color: '#475569' }}>Submitted:</strong> {verifyModalMember.submittedForVerificationAt ? new Date(verifyModalMember.submittedForVerificationAt).toLocaleDateString() : 'N/A'}</div>
                  <div><strong style={{ color: '#475569' }}>Document Type:</strong> {verifyModalMember.idProofType || 'Government ID'}</div>
                  <div><strong style={{ color: '#475569' }}>Document Number:</strong> {verifyModalMember.idProofNumber || 'N/A'}</div>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#475569' }}>Verification Status:</strong>{' '}
                  <span className={`tag-badge ${
                    verifyModalMember.idProofStatus === 'VERIFIED'
                      ? 'tag-success'
                      : verifyModalMember.idProofStatus === 'REJECTED'
                      ? 'tag-danger'
                      : 'tag-warning'
                  }`}>
                    {verifyModalMember.idProofStatus || (verifyModalMember.idProofFileUrl ? 'PENDING_REVIEW' : 'NOT_UPLOADED')}
                  </span>
                  {verifyModalMember.idProofRejectionReason && (
                    <div style={{ marginTop: 4, color: '#b91c1c' }}>
                      Prior Rejection Reason: {verifyModalMember.idProofRejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Link */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
                  Submitted Document File:
                </label>
                {verifyModalMember.idProofFileUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ fontSize: '1.4rem' }}>📄</span>
                      <span style={{ fontSize: '0.84rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {verifyModalMember.idProofFileUrl}
                      </span>
                    </div>
                    <a
                      href={verifyModalMember.idProofFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn"
                      style={{ background: '#0284c7', color: '#fff', borderColor: '#0284c7', padding: '4px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      Open Document ↗
                    </a>
                  </div>
                ) : (
                  <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.85rem' }}>
                    No ID proof document file uploaded by member.
                  </div>
                )}
              </div>

              {/* Review Decision Form */}
              <form onSubmit={handleVerifyIdProofSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 8 }}>
                    Select Action:
                  </label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, color: '#059669' }}>
                      <input
                        type="radio"
                        name="verifyActionType"
                        checked={verifyActionType === 'APPROVE'}
                        onChange={() => setVerifyActionType('APPROVE')}
                      />
                      ✅ Approve ID Proof (Mark Verified)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}>
                      <input
                        type="radio"
                        name="verifyActionType"
                        checked={verifyActionType === 'REJECT'}
                        onChange={() => setVerifyActionType('REJECT')}
                      />
                      ❌ Reject ID Proof
                    </label>
                  </div>
                </div>

                {verifyActionType === 'REJECT' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#b91c1c', marginBottom: 6 }}>
                      Mandatory Rejection Reason (at least 5 characters):
                    </label>
                    <textarea
                      rows={3}
                      required
                      minLength={5}
                      value={verifyRejectionReason}
                      onChange={(e) => setVerifyRejectionReason(e.target.value)}
                      placeholder="e.g. Document image is illegible or name does not match profile..."
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #f87171', borderRadius: 6, fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      This feedback is communicated directly to the member on their dashboard to prompt resubmission.
                    </small>
                  </div>
                )}

                <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setVerifyModalMember(null)}
                    className="btn-secondary"
                    disabled={verifySubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      background: verifyActionType === 'APPROVE' ? '#059669' : '#dc2626',
                      borderColor: verifyActionType === 'APPROVE' ? '#059669' : '#dc2626',
                    }}
                    disabled={
                      verifySubmitting ||
                      (verifyActionType === 'REJECT' && (!verifyRejectionReason || verifyRejectionReason.trim().length < 5))
                    }
                  >
                    {verifySubmitting
                      ? 'Saving...'
                      : verifyActionType === 'APPROVE'
                      ? 'Confirm & Verify'
                      : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MemberManagementPage;
