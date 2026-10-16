import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  suggestionsApi,
  ProfileSuggestionItem,
  PackageEligibilityItem,
} from '../services/suggestionsApi';
import './StaffSuggestionsPage.css';

export const StaffSuggestionsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'HISTORY' | 'PACKAGES'>('HISTORY');

  // Suggestions history state
  const [suggestions, setSuggestions] = useState<ProfileSuggestionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Suggest Modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    suggestedProfileId: '',
    receivingMemberProfileId: '',
    notes: '',
  });
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestSuccess, setSuggestSuccess] = useState<string | null>(null);

  // Packages state (Admin tab)
  const [packages, setPackages] = useState<PackageEligibilityItem[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [togglingPackageId, setTogglingPackageId] = useState<string | null>(null);

  const loadHistory = async (targetPage = 1) => {
    try {
      setHistoryLoading(true);
      const res = await suggestionsApi.getHistory({
        status: statusFilter || undefined,
        page: targetPage,
        limit: 15,
      });
      setSuggestions(res.suggestions);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setPage(res.page);
    } catch (err: any) {
      console.error('Failed to load suggestion history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      setPackagesLoading(true);
      const res = await suggestionsApi.listPackages();
      setPackages(res);
    } catch (err: any) {
      console.error('Failed to load packages:', err);
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadHistory(1);
    } else if (activeTab === 'PACKAGES' && isAdmin) {
      loadPackages();
    }
  }, [activeTab, statusFilter]);

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestError(null);
    setSuggestSuccess(null);

    if (!suggestForm.suggestedProfileId.trim() || !suggestForm.receivingMemberProfileId.trim()) {
      setSuggestError('Both Suggested Profile ID and Receiving Member ID are required.');
      return;
    }

    try {
      setSuggestSubmitting(true);
      await suggestionsApi.createSuggestion({
        suggestedProfileId: suggestForm.suggestedProfileId.trim(),
        receivingMemberProfileId: suggestForm.receivingMemberProfileId.trim(),
        notes: suggestForm.notes.trim() || undefined,
      });
      setSuggestSuccess('Profile suggested successfully to receiving member!');
      setSuggestForm({
        suggestedProfileId: '',
        receivingMemberProfileId: '',
        notes: '',
      });
      setTimeout(() => {
        setShowSuggestModal(false);
        setSuggestSuccess(null);
        loadHistory(1);
      }, 1200);
    } catch (err: any) {
      setSuggestError(err.message || 'Failed to submit profile suggestion.');
    } finally {
      setSuggestSubmitting(false);
    }
  };

  const handleTogglePackage = async (packageId: string, currentStatus: boolean) => {
    try {
      setTogglingPackageId(packageId);
      await suggestionsApi.togglePackageEligibility(packageId, !currentStatus);
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === packageId
            ? { ...pkg, suggestedProfilesEligible: !currentStatus }
            : pkg,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle package eligibility');
    } finally {
      setTogglingPackageId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning">Pending</span>;
      case 'VIEWED':
        return <span className="badge badge-info">Viewed</span>;
      case 'INTERESTED':
        return <span className="badge badge-success">❤️ Interested</span>;
      case 'DECLINED':
        return <span className="badge badge-secondary">Declined</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="staff-suggestions-container">
      {/* Header Banner */}
      <div className="suggestions-page-header">
        <div className="header-info">
          <h1>🤝 Suggested Profiles Module</h1>
          <p className="subtitle">
            Curate partner recommendations for eligible paid members, track matchmaker activity, and manage package eligibility.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowSuggestModal(true);
            setSuggestError(null);
            setSuggestSuccess(null);
          }}
        >
          + Suggest Profile to Member
        </button>
      </div>

      {/* Tabs */}
      <div className="suggestions-tabs">
        <button
          className={`tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          📋 Suggestion History & Reports
        </button>
        {isAdmin && (
          <button
            className={`tab-btn ${activeTab === 'PACKAGES' ? 'active' : ''}`}
            onClick={() => setActiveTab('PACKAGES')}
          >
            ⚙️ Package Eligibility Settings
          </button>
        )}
      </div>

      {/* TAB 1: HISTORY & REPORT */}
      {activeTab === 'HISTORY' && (
        <div className="tab-card">
          <div className="filter-row">
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Member Review</option>
                <option value="VIEWED">Viewed</option>
                <option value="INTERESTED">Interested</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => loadHistory(1)}>
              🔄 Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="loading-state">Loading suggestion records...</div>
          ) : suggestions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🤝</span>
              <h3>No Suggestion Records</h3>
              <p>No profile suggestions found matching the selected criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="suggestions-table">
                <thead>
                  <tr>
                    <th>Suggested Candidate</th>
                    <th>Receiving Member</th>
                    <th>Receiving Package</th>
                    <th>Staff / Matchmaker</th>
                    <th>Recommendation Note</th>
                    <th>Status</th>
                    <th>Suggested On</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.suggestedProfile.firstName} {item.suggestedProfile.lastName}
                        </strong>
                        <div className="text-muted small">
                          ID: {item.suggestedProfile.memberId || item.suggestedProfile.id}
                        </div>
                      </td>
                      <td>
                        <strong>
                          {item.receivingMemberProfile
                            ? `${item.receivingMemberProfile.firstName} ${item.receivingMemberProfile.lastName}`
                            : 'Member'}
                        </strong>
                        <div className="text-muted small">
                          ID: {item.receivingMemberProfile?.memberId || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="package-tag">
                          {item.receivingMemberProfile?.currentPackage?.name ||
                            item.receivingMemberProfile?.packageType ||
                            'PAID'}
                        </span>
                      </td>
                      <td>
                        <strong>{item.staff?.fullName || 'Staff Member'}</strong>
                        <div className="text-muted small">
                          {item.staff?.organization?.name || 'Branch'}
                        </div>
                      </td>
                      <td className="cell-note">{item.notes ? `"${item.notes}"` : '—'}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span>
                Showing Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-xs btn-outline"
                  disabled={page <= 1}
                  onClick={() => loadHistory(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-xs btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => loadHistory(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PACKAGE ELIGIBILITY (ADMIN ONLY) */}
      {activeTab === 'PACKAGES' && isAdmin && (
        <div className="tab-card">
          <div className="info-callout">
            ℹ️ <strong>Package Eligibility Control:</strong> Admin/Super Admin can configure which membership packages
            qualify for <em>Suggested Profiles</em>. Free tier and non-qualifying package members will be prompted to upgrade.
          </div>

          {packagesLoading ? (
            <div className="loading-state">Loading packages...</div>
          ) : (
            <div className="table-responsive">
              <table className="suggestions-table">
                <thead>
                  <tr>
                    <th>Package Name</th>
                    <th>Cost (₹)</th>
                    <th>Validity</th>
                    <th>Suggested Profiles Eligible?</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>
                        <strong>{pkg.name}</strong>
                      </td>
                      <td>₹{pkg.cost}</td>
                      <td>{pkg.validityDays} Days</td>
                      <td>
                        <span
                          className={`eligibility-badge ${
                            pkg.suggestedProfilesEligible ? 'eligible' : 'ineligible'
                          }`}
                        >
                          {pkg.suggestedProfilesEligible
                            ? '✅ Enabled (Qualifies)'
                            : '❌ Disabled'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-xs ${
                            pkg.suggestedProfilesEligible
                              ? 'btn-outline-danger'
                              : 'btn-success'
                          }`}
                          disabled={togglingPackageId === pkg.id}
                          onClick={() =>
                            handleTogglePackage(
                              pkg.id,
                              pkg.suggestedProfilesEligible,
                            )
                          }
                        >
                          {togglingPackageId === pkg.id
                            ? 'Updating...'
                            : pkg.suggestedProfilesEligible
                            ? 'Disable Eligibility'
                            : 'Enable Eligibility'}
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
      {/* MODAL: SUGGEST PROFILE TO MEMBER */}
      {/* ============================================================== */}
      {showSuggestModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🤝 Suggest Profile to Member</h3>
              <button
                className="close-btn"
                onClick={() => setShowSuggestModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSuggestion}>
              <div className="modal-body">
                {suggestError && <div className="alert alert-danger">{suggestError}</div>}
                {suggestSuccess && <div className="alert alert-success">{suggestSuccess}</div>}

                <div className="form-group">
                  <label>Receiving Member ID (or UUID) *</label>
                  <input
                    type="text"
                    placeholder="e.g. M2026001 or member UUID"
                    value={suggestForm.receivingMemberProfileId}
                    onChange={(e) =>
                      setSuggestForm({
                        ...suggestForm,
                        receivingMemberProfileId: e.target.value,
                      })
                    }
                    required
                  />
                  <small className="form-text text-muted">
                    Must be a paid member on a package configured for Suggested Profiles.
                  </small>
                </div>

                <div className="form-group">
                  <label>Suggested Candidate Profile ID (or UUID) *</label>
                  <input
                    type="text"
                    placeholder="e.g. M2026002 or candidate UUID"
                    value={suggestForm.suggestedProfileId}
                    onChange={(e) =>
                      setSuggestForm({
                        ...suggestForm,
                        suggestedProfileId: e.target.value,
                      })
                    }
                    required
                  />
                  <small className="form-text text-muted">
                    Candidate profile must be active and not blocked.
                  </small>
                </div>

                <div className="form-group">
                  <label>Matchmaker Recommendation Notes (Visible to Member)</label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this profile is a great match (e.g. horoscope, education, location alignment)..."
                    value={suggestForm.notes}
                    onChange={(e) =>
                      setSuggestForm({ ...suggestForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSuggestModal(false)}
                  disabled={suggestSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={suggestSubmitting}
                >
                  {suggestSubmitting ? 'Submitting...' : 'Send Suggestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
