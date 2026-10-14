import React, { useEffect, useState, useCallback } from 'react';
import { fetchAdminMobileRequests, respondToMobileRequest } from '../services/adminApi';
import './MobileRequestsPage.css';

interface MobileRequestItem {
  id: string;
  revealType: string;
  status: string;
  createdAt: string;
  actionDate?: string;
  actionById?: string;
  actionByType?: string;
  unlocksAt?: string;
  revealedAt?: string;
  sender: {
    id: string;
    memberId: string;
    name: string;
    gender: string;
    maritalStatus: string;
    contactsRevealedCount: number;
    package: string;
  };
  receiver: {
    id: string;
    memberId: string;
    name: string;
    gender: string;
    maritalStatus: string;
    contactsRevealedCount: number;
    package: string;
  };
}

export const MobileRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<MobileRequestItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminMobileRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 30,
      });
      setRequests(res.requests || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contact requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleRespond = async (requestId: string, action: 'ACCEPTED' | 'REJECTED') => {
    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this contact reveal request on behalf of the member?`)) {
      return;
    }
    try {
      await respondToMobileRequest(requestId, action);
      void loadRequests();
      alert(`Contact reveal request successfully ${action.toLowerCase()} on behalf of member.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error processing request');
    }
  };

  return (
    <div className="mobile-req-root">
      <div className="member-header-panel">
        <div>
          <h2>Mobile Requests Module (Section 5.4)</h2>
          <p>Contact reveal requests between members, staff proxy approval, revelation timers, and privacy logs</p>
        </div>
        <div className="search-input-wrapper">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            placeholder="Search by Sender or Receiver ID / Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="member-sub-tabs">
        <button
          className={`member-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          All Requests ({total})
        </button>
        <button
          className={`member-tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending Review
        </button>
        <button
          className={`member-tab-btn ${statusFilter === 'REVEALED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('REVEALED')}
        >
          Accepted / Revealed
        </button>
        <button
          className={`member-tab-btn ${statusFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          Rejected
        </button>
      </div>

      <div className="staff-table-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading contact requests...</p>
        ) : error ? (
          <p style={{ color: '#dc2626', padding: '20px 0' }}>{error}</p>
        ) : requests.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No mobile reveal requests found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Request Sender (ID / Demographics)</th>
                  <th>Request Receiver (Target Member)</th>
                  <th>Request Date & Time</th>
                  <th>Status</th>
                  <th>Action Date & Performed By</th>
                  <th>Staff Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="req-party-box">
                        <span className="req-party-id">{r.sender.name} ({r.sender.memberId})</span>
                        <span className="req-party-meta">
                          {r.sender.gender} • {r.sender.maritalStatus} • Package: <strong>{r.sender.package}</strong>
                        </span>
                        <span className="req-party-quota">
                          Revealed so far: {r.sender.contactsRevealedCount}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="req-party-box">
                        <span className="req-party-id">{r.receiver.name} ({r.receiver.memberId})</span>
                        <span className="req-party-meta">
                          {r.receiver.gender} • {r.receiver.maritalStatus} • Package: <strong>{r.receiver.package}</strong>
                        </span>
                      </div>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <span
                        className={`tag-badge ${
                          r.status === 'REVEALED' || r.status === 'ACCEPTED'
                            ? 'tag-success'
                            : r.status === 'PENDING'
                            ? 'tag-warning'
                            : 'tag-danger'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.actionDate ? (
                        <div>
                          <div>{new Date(r.actionDate).toLocaleString()}</div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            By {r.actionByType || 'Staff'}: {r.actionById || 'Direct'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Decision</span>
                      )}
                    </td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => void handleRespond(r.id, 'ACCEPTED')}
                            className="action-btn"
                            style={{ color: '#059669', borderColor: '#86efac' }}
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => void handleRespond(r.id, 'REJECTED')}
                            className="action-btn danger"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Action Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default MobileRequestsPage;
