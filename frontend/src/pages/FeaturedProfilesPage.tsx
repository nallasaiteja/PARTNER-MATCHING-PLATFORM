import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchActiveFeaturedProfiles,
  fetchFeaturedReport,
  markProfileAsFeatured,
  unfeatureProfile,
  updateMaxFeaturedLimit,
} from '../services/adminApi';
import './FeaturedProfilesPage.css';

export const FeaturedProfilesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'REPORT'>('ACTIVE');
  const [activeData, setActiveData] = useState<{ activeCount: number; maxLimit: number; profiles: any[] }>({
    activeCount: 0,
    maxLimit: 20,
    profiles: [],
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Feature Modal State
  const [showFeatureModal, setShowFeatureModal] = useState<boolean>(false);
  const [featureForm, setFeatureForm] = useState({
    profileId: '',
    validityDays: 30,
    notes: '',
  });

  // Limit Modal State
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [newLimit, setNewLimit] = useState<number>(20);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'ACTIVE') {
        const res = await fetchActiveFeaturedProfiles();
        setActiveData(res);
        setNewLimit(res.maxLimit || 20);
      } else {
        const res = await fetchFeaturedReport();
        setReportData(res);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load featured profile data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnfeature = async (profileId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove featured spotlight from ${name}?`)) return;
    try {
      await unfeatureProfile(profileId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error unfeaturing profile');
    }
  };

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markProfileAsFeatured(featureForm.profileId, {
        validityDays: Number(featureForm.validityDays),
        notes: featureForm.notes,
      });
      setShowFeatureModal(false);
      setFeatureForm({ profileId: '', validityDays: 30, notes: '' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error featuring profile');
    }
  };

  const handleLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMaxFeaturedLimit(newLimit);
      setShowLimitModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating maximum featured limit');
    }
  };

  return (
    <div className="featured-profiles-page">
      <div className="page-header-flex">
        <div>
          <h1>⭐ Featured Profiles Management</h1>
          <p>
            Spotlight premium paid member profiles on the homepage and at the top of member match
            results.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary-btn" onClick={() => setShowLimitModal(true)}>
            ⚙️ Max Limit: {activeData.maxLimit}
          </button>
          <button className="primary-btn" onClick={() => setShowFeatureModal(true)}>
            + Spotlight Member Profile
          </button>
        </div>
      </div>

      <div className="stats-card-row">
        <div className="stat-card-mini">
          <div className="label">Currently Active Featured</div>
          <div className="value" style={{ color: '#d97706' }}>
            {activeData.activeCount} / {activeData.maxLimit}
          </div>
        </div>
        <div className="stat-card-mini">
          <div className="label">Slots Available</div>
          <div className="value" style={{ color: '#16a34a' }}>
            {Math.max(0, activeData.maxLimit - activeData.activeCount)}
          </div>
        </div>
        <div className="stat-card-mini">
          <div className="label">Historical Feature Events</div>
          <div className="value" style={{ color: '#2563eb' }}>
            {reportData?.summary?.totalHistoricalAssignments || '—'}
          </div>
        </div>
      </div>

      <div className="tab-nav-row">
        <button
          className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          Active Spotlight ({activeData.activeCount})
        </button>
        <button
          className={`tab-btn ${activeTab === 'REPORT' ? 'active' : ''}`}
          onClick={() => setActiveTab('REPORT')}
        >
          Historical Expiry & Audit Report
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading featured profile records...</div>
      ) : activeTab === 'ACTIVE' ? (
        activeData.profiles.length === 0 ? (
          <div className="empty-state">
            No profiles are currently featured. Click "+ Spotlight Member Profile" above.
          </div>
        ) : (
          <div className="featured-grid">
            {activeData.profiles.map((profile) => (
              <div key={profile.id} className="featured-card">
                <div className="featured-card-header">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.firstName}
                      className="featured-avatar"
                    />
                  ) : (
                    <div className="featured-avatar-placeholder">⭐</div>
                  )}
                  <div className="featured-meta">
                    <h3>
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <span className="featured-badge">⭐ FEATURED</span>
                  </div>
                </div>

                <ul className="featured-details-list">
                  <li>
                    <span>Member ID:</span>
                    <strong>{profile.memberId}</strong>
                  </li>
                  <li>
                    <span>Package:</span>
                    <strong>{profile.currentPackage?.name || profile.packageType}</strong>
                  </li>
                  <li>
                    <span>Featured On:</span>
                    <span>{new Date(profile.featuredAt).toLocaleDateString()}</span>
                  </li>
                  <li>
                    <span>Featured Until:</span>
                    <span className="expiry-countdown">
                      {new Date(profile.featuredUntil).toLocaleDateString()}
                    </span>
                  </li>
                </ul>

                <button
                  className="danger-btn"
                  onClick={() =>
                    handleUnfeature(profile.id, `${profile.firstName} ${profile.lastName}`)
                  }
                >
                  Unfeature Spotlight
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="results-card">
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Member Name</th>
                  <th>Gender</th>
                  <th>Package</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Spotlight Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.records?.map((record: any) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.memberProfile?.memberId}</strong>
                    </td>
                    <td>
                      {record.memberProfile?.firstName} {record.memberProfile?.lastName}
                    </td>
                    <td>{record.memberProfile?.gender}</td>
                    <td>{record.memberProfile?.packageType}</td>
                    <td>{new Date(record.startDate).toLocaleDateString()}</td>
                    <td>{new Date(record.endDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge-tag ${record.isActive ? 'active' : 'inactive'}`}>
                        {record.isActive ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                    </td>
                    <td>{record.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Modal */}
      {showFeatureModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h2>⭐ Spotlight Paid Member Profile</h2>
            <form onSubmit={handleFeatureSubmit}>
              <div className="form-group-full">
                <label>Member Profile ID (UUID) *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste member profile UUID here..."
                  value={featureForm.profileId}
                  onChange={(e) => setFeatureForm({ ...featureForm, profileId: e.target.value })}
                />
              </div>

              <div className="form-group-full">
                <label>Spotlight Validity (Days) *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={featureForm.validityDays}
                  onChange={(e) =>
                    setFeatureForm({ ...featureForm, validityDays: Number(e.target.value) })
                  }
                />
              </div>

              <div className="form-group-full">
                <label>Administrative Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP promotional upgrade requested by branch"
                  value={featureForm.notes}
                  onChange={(e) => setFeatureForm({ ...featureForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowFeatureModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  ⭐ Confirm Spotlight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h2>Configure Concurrent Featured Limit</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Maximum number of profiles that can simultaneously have the Featured badge active on
              the platform.
            </p>
            <form onSubmit={handleLimitSubmit}>
              <div className="form-group-full">
                <label>Maximum Simultaneous Limit *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowLimitModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
