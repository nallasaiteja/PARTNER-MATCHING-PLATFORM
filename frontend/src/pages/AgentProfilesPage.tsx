import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchAgentProfiles,
  AgentProfileItem,
} from '../services/agentApi';
import './AgentProfilesPage.css';

export const AgentProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<AgentProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [packageType, setPackageType] = useState('');
  const [isBlocked, setIsBlocked] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const navigate = useNavigate();

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAgentProfiles({
        search,
        packageType,
        isBlocked,
        page,
        limit: 10,
      });
      setProfiles(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load member profiles');
    } finally {
      setLoading(false);
    }
  }, [search, packageType, isBlocked, page]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <div className="agent-profiles-page">
      {/* Header */}
      <div className="agent-profiles-header">
        <div>
          <h2 className="agent-profiles-title">My Created Member Profiles</h2>
          <p className="agent-profiles-subtitle">
            Showing only member profiles personally created and registered by your agent account.
          </p>
        </div>
        <Link to="/agent/profiles/new" className="btn-action-primary">
          <span>➕</span> Register New Member
        </Link>
      </div>

      {/* Scope Disclaimer Banner */}
      <div className="agent-info-banner">
        <div className="agent-info-icon">🔒</div>
        <div className="agent-info-text">
          <h4>Profile Privacy & Ownership Rules</h4>
          <p>
            You can view and edit <strong>only the member profiles you personally created</strong>.
            Cross-agent profile access is strictly blocked at the database level. Permanent profile
            deletion is disabled.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="agent-filter-bar">
        <input
          type="text"
          className="agent-filter-input"
          placeholder="🔍 Search by Member ID, Name, or Mobile..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="agent-filter-select"
          value={packageType}
          onChange={(e) => {
            setPackageType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Package Types</option>
          <option value="FREE">Free Profiles</option>
          <option value="PAID">Paid Profiles</option>
        </select>

        <select
          className="agent-filter-select"
          value={isBlocked}
          onChange={(e) => {
            setIsBlocked(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="false">Active Only</option>
          <option value="true">Blocked Only</option>
        </select>

        <button
          className="btn-page-nav"
          onClick={() => {
            setSearch('');
            setPackageType('');
            setIsBlocked('');
            setPage(1);
          }}
        >
          Clear Filters
        </button>
      </div>

      {error && (
        <div className="agent-warning-banner">
          <div>⚠️ {error}</div>
        </div>
      )}

      {/* Table Card */}
      <div className="agent-profile-table-card">
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <p>Loading member profiles...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="agent-empty-state">
            <div className="agent-empty-icon">📂</div>
            <h3>No profiles found</h3>
            <p>
              {search || packageType || isBlocked
                ? 'No created profiles match your search criteria.'
                : 'You have not registered any member profiles yet.'}
            </p>
          </div>
        ) : (
          <div className="agent-table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Gender / DOB</th>
                  <th>Mobile Number</th>
                  <th>Package</th>
                  <th>Branch / Franchise</th>
                  <th>Status</th>
                  <th>Registered Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.memberId || 'PENDING'}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.firstName} {p.lastName}
                      </div>
                    </td>
                    <td>
                      <div>{p.gender}</div>
                      <small style={{ color: '#94a3b8' }}>
                        {new Date(p.dateOfBirth).toLocaleDateString('en-IN')}
                      </small>
                    </td>
                    <td>
                      <span>{p.user?.mobile || 'N/A'}</span>
                    </td>
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
                      <small style={{ color: '#475569' }}>
                        {p.ownerOrg?.name || p.ownershipType}
                      </small>
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
                      <small style={{ color: '#64748b' }}>
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </small>
                    </td>
                    <td>
                      <div className="agent-table-actions">
                        <Link
                          to={`/agent/profiles/${p.id}`}
                          className="btn-table-edit"
                          title="View / Edit Profile Details"
                        >
                          ✏️ Edit
                        </Link>
                        <button
                          type="button"
                          className="btn-table-invoice"
                          title="Raise Invoice Request for this Member"
                          onClick={() => {
                            navigate(`/agent/invoices?memberProfileId=${p.id}&memberId=${p.memberId || ''}&memberName=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}`);
                          }}
                        >
                          💳 Raise Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="agent-pagination">
          <span>
            Total: <strong>{totalCount}</strong> profiles | Page <strong>{page}</strong> of{' '}
            <strong>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-page-nav"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <button
              className="btn-page-nav"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
