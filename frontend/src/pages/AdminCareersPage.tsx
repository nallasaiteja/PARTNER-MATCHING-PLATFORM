import React, { useState, useEffect } from 'react';
import {
  getAdminCareerApplications,
  blockCareerApplication,
  registerCareerApplicantAsStaff,
  CareerApplicationData,
} from '../services/careersApi';
import './AdminCareersPage.css';

export const AdminCareersPage: React.FC = () => {
  const [applications, setApplications] = useState<CareerApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [statusTab, setStatusTab] = useState<string>(''); // '' = All, 'PENDING', 'REGISTERED_AS_STAFF', 'BLOCKED'
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [viewApp, setViewApp] = useState<CareerApplicationData | null>(null);
  const [blockingApp, setBlockingApp] = useState<CareerApplicationData | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Register Staff Modal
  const [registeringApp, setRegisteringApp] = useState<CareerApplicationData | null>(null);
  const [staffRole, setStaffRole] = useState('BRANCH_STAFF');
  const [staffDivision, setStaffDivision] = useState('NOT_APPLICABLE');
  const [tempPassword, setTempPassword] = useState('Staff@2026#');
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<{
    employeeId: string;
    mobile: string;
    tempPass: string;
  } | null>(null);

  const loadApplications = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminCareerApplications(statusTab, search, targetPage, 15);
      setApplications(res.applications || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      setPage(res.page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications(page);
  }, [page, statusTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadApplications(1);
  };

  const formatTimer = (totalSeconds?: number) => {
    if (!totalSeconds) return '—';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
  };

  // Block handler
  const handleConfirmBlock = async () => {
    if (!blockingApp) return;
    if (!blockReason.trim()) {
      alert('Please provide a reason for blocking this application.');
      return;
    }

    try {
      setBlockSubmitting(true);
      await blockCareerApplication(blockingApp.id, blockReason.trim());
      setBlockingApp(null);
      setBlockReason('');
      loadApplications(page);
    } catch (err: any) {
      alert(err.message || 'Failed to block application');
    } finally {
      setBlockSubmitting(false);
    }
  };

  // Register staff handler
  const handleConfirmRegisterStaff = async () => {
    if (!registeringApp) return;

    try {
      setRegisterSubmitting(true);
      const res = await registerCareerApplicantAsStaff(registeringApp.id, {
        role: staffRole,
        staffDivision,
        temporaryPassword: tempPassword,
      });

      setRegisterSuccessMsg({
        employeeId: res.staffUser.employeeId,
        mobile: res.staffUser.mobile,
        tempPass: res.temporaryPassword,
      });
      loadApplications(page);
    } catch (err: any) {
      alert(err.message || 'Failed to register applicant as staff');
    } finally {
      setRegisterSubmitting(false);
    }
  };

  return (
    <div className="admin-careers-page">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1>💼 Careers &amp; Recruitment Management</h1>
          <p className="subtitle">
            Manage incoming staff applications, verify ID proofs, and onboard verified applicants directly into staff accounts.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${statusTab === '' ? 'active' : ''}`}
          onClick={() => {
            setStatusTab('');
            setPage(1);
          }}
        >
          All Applications ({totalCount})
        </button>
        <button
          className={`tab-btn ${statusTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => {
            setStatusTab('PENDING');
            setPage(1);
          }}
        >
          ⏳ Pending Review
        </button>
        <button
          className={`tab-btn ${statusTab === 'REGISTERED_AS_STAFF' ? 'active' : ''}`}
          onClick={() => {
            setStatusTab('REGISTERED_AS_STAFF');
            setPage(1);
          }}
        >
          ✅ Registered as Staff
        </button>
        <button
          className={`tab-btn ${statusTab === 'BLOCKED' ? 'active' : ''}`}
          onClick={() => {
            setStatusTab('BLOCKED');
            setPage(1);
          }}
        >
          🚫 Blocked Applications
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-search-card">
        <form onSubmit={handleSearchSubmit} className="career-search-form">
          <input
            type="text"
            placeholder="Search by Mobile, Applicant Name, or ID Proof Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">
            🔍 Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-clear"
              onClick={() => {
                setSearch('');
                loadApplications(1);
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Applications Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="table-state">
            <div className="spinner"></div>
            <p>Loading applications...</p>
          </div>
        ) : error ? (
          <div className="table-state error">
            <p>⚠️ {error}</p>
            <button onClick={() => loadApplications(page)}>Retry</button>
          </div>
        ) : applications.length === 0 ? (
          <div className="table-state empty">
            <p>No career applications found matching the selected filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Application No</th>
                  <th>Applicant Name</th>
                  <th>Mobile &amp; Email</th>
                  <th>Gender</th>
                  <th>Time Taken</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong className="app-no">{app.applicationNumber}</strong>
                    </td>
                    <td>
                      <div className="applicant-name-cell">
                        <strong>
                          {app.name} {app.surname}
                        </strong>
                        <small className="id-proof-badge">
                          {app.idProofType}: {app.idProofNumber}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span>📱 {app.mobile}</span>
                        <small>✉️ {app.email}</small>
                      </div>
                    </td>
                    <td>{app.gender}</td>
                    <td>
                      <span className="time-badge">
                        ⏱️ {formatTimer(app.timeTakenSeconds)}
                      </span>
                    </td>
                    <td>{formatDate(app.createdAt)}</td>
                    <td>
                      <span
                        className={`status-pill pill-${app.status.toLowerCase()}`}
                      >
                        {app.status === 'PENDING'
                          ? '⏳ Pending'
                          : app.status === 'REGISTERED_AS_STAFF'
                          ? '✅ Staff Member'
                          : '🚫 Blocked'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => setViewApp(app)}
                        className="btn-view"
                        title="View Full Application"
                      >
                        👁️ View
                      </button>

                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setRegisteringApp(app);
                              setRegisterSuccessMsg(null);
                            }}
                            className="btn-register"
                            title="Register Directly as Staff"
                          >
                            ➕ Staff
                          </button>
                          <button
                            onClick={() => {
                              setBlockingApp(app);
                              setBlockReason('');
                            }}
                            className="btn-block"
                            title="Block Application"
                          >
                            🚫 Block
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="table-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* VIEW FULL APPLICATION MODAL */}
      {viewApp && (
        <div className="modal-backdrop" onClick={() => setViewApp(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Application Details: {viewApp.applicationNumber} ({viewApp.name}{' '}
                {viewApp.surname})
              </h2>
              <button onClick={() => setViewApp(null)} className="btn-close">
                ✕
              </button>
            </div>

            <div className="modal-scroll-body">
              {/* Status Banner */}
              <div className={`status-banner banner-${viewApp.status.toLowerCase()}`}>
                <strong>Status: {viewApp.status}</strong>
                {viewApp.blockedReason && (
                  <p>
                    <strong>Reason for blocking:</strong> {viewApp.blockedReason} (On{' '}
                    {formatDate(viewApp.blockedAt)})
                  </p>
                )}
                {viewApp.registeredAt && (
                  <p>
                    <strong>Registered as Staff on:</strong>{' '}
                    {formatDate(viewApp.registeredAt)} (Staff ID: {viewApp.registeredStaffId})
                  </p>
                )}
              </div>

              {/* 1. Personal Details */}
              <div className="detail-section">
                <h3>1. Personal &amp; Contact Details</h3>
                <div className="detail-grid">
                  <div>
                    <label>Full Name:</label>
                    <p>
                      {viewApp.name} {viewApp.surname}
                    </p>
                  </div>
                  <div>
                    <label>Mobile Number:</label>
                    <p>📱 {viewApp.mobile}</p>
                  </div>
                  <div>
                    <label>Email Address:</label>
                    <p>✉️ {viewApp.email}</p>
                  </div>
                  <div>
                    <label>Gender &amp; Marital Status:</label>
                    <p>
                      {viewApp.gender} • {viewApp.maritalStatus}
                    </p>
                  </div>
                  <div>
                    <label>Date of Birth:</label>
                    <p>📅 {formatDate(viewApp.dateOfBirth)}</p>
                  </div>
                  <div>
                    <label>Religion &amp; Caste:</label>
                    <p>
                      {viewApp.religion} — {viewApp.caste}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Address Details */}
              <div className="detail-section">
                <h3>2. Address Details</h3>
                <div className="detail-grid">
                  <div>
                    <label>State, District, Mandal:</label>
                    <p>
                      {viewApp.state}, {viewApp.district}, {viewApp.mandal}
                    </p>
                  </div>
                  <div>
                    <label>Temporary Address:</label>
                    <p>{viewApp.temporaryAddress}</p>
                  </div>
                  <div className="grid-full">
                    <label>Permanent Address:</label>
                    <p>{viewApp.permanentAddress}</p>
                  </div>
                </div>
              </div>

              {/* 3. Identity Verification & Documents */}
              <div className="detail-section">
                <h3>3. Identity Verification</h3>
                <div className="detail-grid">
                  <div>
                    <label>ID Proof Type &amp; Number:</label>
                    <p>
                      <strong>{viewApp.idProofType}:</strong> {viewApp.idProofNumber}
                    </p>
                  </div>
                  <div>
                    <label>ID Proof Document:</label>
                    <p>
                      <a
                        href={viewApp.idProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="doc-link"
                      >
                        📄 Open ID Proof Document
                      </a>
                    </p>
                  </div>
                  <div>
                    <label>PAN Card Document:</label>
                    <p>
                      <a
                        href={viewApp.panCardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="doc-link"
                      >
                        📄 Open PAN Card
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Education Qualifications */}
              <div className="detail-section">
                <h3>4. Education Qualifications</h3>
                <table className="modal-edu-table">
                  <thead>
                    <tr>
                      <th>Qualification</th>
                      <th>Passing Year</th>
                      <th>Education Type</th>
                      <th>Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewApp.educationDetails && viewApp.educationDetails.length > 0 ? (
                      viewApp.educationDetails.map((edu, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{edu.qualification}</strong>
                          </td>
                          <td>{edu.yearOfPassing}</td>
                          <td>{edu.educationType}</td>
                          <td>
                            {edu.certificateUrl ? (
                              <a
                                href={edu.certificateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="doc-link"
                              >
                                📄 View Certificate
                              </a>
                            ) : (
                              'Not Uploaded'
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>No education details recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Experience & Family Details */}
              <div className="detail-section">
                <h3>5. Experience and Family</h3>
                <div className="detail-grid">
                  <div>
                    <label>Past Experience:</label>
                    <p>{viewApp.experienceYears} Years</p>
                  </div>
                  <div>
                    <label>Father's Name &amp; Profession:</label>
                    <p>
                      {viewApp.fatherName || '—'} (
                      {viewApp.fatherProfession || 'Not specified'})
                    </p>
                  </div>
                  <div>
                    <label>Mother's Name &amp; Profession:</label>
                    <p>
                      {viewApp.motherName || '—'} (
                      {viewApp.motherProfession || 'Not specified'})
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. References */}
              {(viewApp.referenceName || viewApp.referenceMobile) && (
                <div className="detail-section">
                  <h3>6. Reference Details</h3>
                  <div className="detail-grid">
                    <div>
                      <label>Reference Name:</label>
                      <p>{viewApp.referenceName || '—'}</p>
                    </div>
                    <div>
                      <label>Reference Mobile:</label>
                      <p>{viewApp.referenceMobile || '—'}</p>
                    </div>
                    <div>
                      <label>Reference Address:</label>
                      <p>{viewApp.referenceAddress || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Photos */}
              {viewApp.photos && viewApp.photos.length > 0 && (
                <div className="detail-section">
                  <h3>7. Uploaded Photos ({viewApp.photos.length})</h3>
                  <div className="modal-photos-grid">
                    {viewApp.photos.map((p, idx) => (
                      <a key={idx} href={p} target="_blank" rel="noreferrer">
                        <img src={p} alt={`Photo ${idx + 1}`} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setViewApp(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCK APPLICATION MODAL */}
      {blockingApp && (
        <div className="modal-backdrop" onClick={() => setBlockingApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Block Application: {blockingApp.applicationNumber}</h2>
              <button onClick={() => setBlockingApp(null)} className="btn-close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to block <strong>{blockingApp.name} {blockingApp.surname}</strong>?
                This will reject the application and move it to the Blocked list.
              </p>
              <div className="form-group">
                <label>
                  Reason for blocking / rejection <span className="req">*</span>:
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Ineligible qualification, duplicate submission, or document mismatch..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setBlockingApp(null)}
                className="btn-secondary"
                disabled={blockSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                className="btn-danger"
                disabled={blockSubmitting}
              >
                {blockSubmitting ? 'Blocking...' : 'Confirm Block Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER AS STAFF MODAL */}
      {registeringApp && (
        <div className="modal-backdrop" onClick={() => setRegisteringApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Onboard as Staff: {registeringApp.name} {registeringApp.surname}</h2>
              <button onClick={() => setRegisteringApp(null)} className="btn-close">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {registerSuccessMsg ? (
                <div className="register-success-card">
                  <div className="success-icon">🎉</div>
                  <h3>Staff Account Created!</h3>
                  <p>The applicant has been successfully onboarded into the staff system.</p>
                  <div className="credentials-box">
                    <div>
                      <strong>Employee ID:</strong> {registerSuccessMsg.employeeId}
                    </div>
                    <div>
                      <strong>Login Mobile:</strong> {registerSuccessMsg.mobile}
                    </div>
                    <div>
                      <strong>Temporary Password:</strong>{' '}
                      <code>{registerSuccessMsg.tempPass}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => setRegisteringApp(null)}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="staff-onboard-form">
                  <p>
                    This will create a new staff authentication record with their verified mobile (
                    <strong>{registeringApp.mobile}</strong>) and identity documents.
                  </p>

                  <div className="form-group">
                    <label>Assign Role:</label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                    >
                      <option value="BRANCH_STAFF">Branch Staff (Data Entry &amp; Service)</option>
                      <option value="HQ_SERVICE_TEAM">HQ Service Team (Global Matchmaker)</option>
                      <option value="BRANCH_MANAGER">Branch Manager</option>
                      <option value="BRANCH_AGENT">Branch Agent</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Staff Division:</label>
                    <select
                      value={staffDivision}
                      onChange={(e) => setStaffDivision(e.target.value)}
                    >
                      <option value="NOT_APPLICABLE">Not Applicable (Standard Branch)</option>
                      <option value="FREE_TEAM">Free Profile Operations Team</option>
                      <option value="HQ_SERVICE_TEAM">HQ Premium Service Team</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Initial Temporary Password:</label>
                    <input
                      type="text"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                    />
                    <small>Staff can change their password after first login.</small>
                  </div>
                </div>
              )}
            </div>

            {!registerSuccessMsg && (
              <div className="modal-footer">
                <button
                  onClick={() => setRegisteringApp(null)}
                  className="btn-secondary"
                  disabled={registerSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegisterStaff}
                  className="btn-primary"
                  disabled={registerSubmitting}
                >
                  {registerSubmitting ? 'Creating Staff Account...' : 'Confirm Staff Registration'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCareersPage;
