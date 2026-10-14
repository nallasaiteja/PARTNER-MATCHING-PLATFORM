import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchAllAds,
  fetchAdReport,
  createAd,
  updateAd,
  deleteAd,
} from '../services/adminApi';
import './AdvertisementsPage.css';

export const AdvertisementsPage: React.FC = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSlot, setFilterSlot] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adForm, setAdForm] = useState({
    slot: 'HOME_BANNER',
    title: '',
    imageUrl: '',
    targetUrl: '',
    startDate: '',
    endDate: '',
    visibility: 'ALL',
    partnerName: '',
    feeAmount: 10000,
  });

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, repRes] = await Promise.all([
        fetchAllAds(filterSlot || undefined, filterStatus || undefined),
        fetchAdReport(),
      ]);
      setAds(listRes || []);
      setReport(repRes || null);
    } catch (err: any) {
      alert(err.message || 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  }, [filterSlot, filterStatus]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setAdForm({
      slot: 'HOME_BANNER',
      title: '',
      imageUrl: '',
      targetUrl: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      visibility: 'ALL',
      partnerName: '',
      feeAmount: 15000,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (ad: any) => {
    setEditingId(ad.id);
    setAdForm({
      slot: ad.slot,
      title: ad.title,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl || '',
      startDate: new Date(ad.startDate).toISOString().slice(0, 10),
      endDate: new Date(ad.endDate).toISOString().slice(0, 10),
      visibility: ad.visibility,
      partnerName: ad.partnerName || '',
      feeAmount: ad.feeAmount || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAd(editingId, adForm);
      } else {
        await createAd(adForm);
      }
      setShowModal(false);
      loadAds();
    } catch (err: any) {
      alert(err.message || 'Error saving advertisement');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete ad "${title}"?`)) return;
    try {
      await deleteAd(id);
      loadAds();
    } catch (err: any) {
      alert(err.message || 'Error deleting ad');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateAd(id, { isActive: !currentActive });
      loadAds();
    } catch (err: any) {
      alert(err.message || 'Error toggling ad status');
    }
  };

  return (
    <div className="advertisements-page">
      <div className="page-header-flex">
        <div>
          <h1>📢 Platform Advertisement Management</h1>
          <p>Super Admin control for homepage banners, browse sidebars, and sponsor placements.</p>
        </div>
        <button className="primary-btn" onClick={handleOpenCreate}>
          + Create New Advertisement
        </button>
      </div>

      {/* KPI Stats */}
      {report && (
        <div className="stats-card-row">
          <div className="stat-card-mini">
            <div className="label">Total Ad Revenue</div>
            <div className="value" style={{ color: '#c026d3' }}>
              ₹{report.totalRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="label">Total Impressions</div>
            <div className="value" style={{ color: '#2563eb' }}>
              {report.totalImpressions.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="label">Total Clicks</div>
            <div className="value" style={{ color: '#059669' }}>
              {report.totalClicks.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="label">Avg Click-Through Rate</div>
            <div className="value" style={{ color: '#d97706' }}>
              {report.overallCTR}%
            </div>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <select
          value={filterSlot}
          onChange={(e) => setFilterSlot(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        >
          <option value="">All Banner Slots</option>
          <option value="HOME_BANNER">Home Page Banner</option>
          <option value="BROWSE_SIDEBAR">Browse Page Sidebar</option>
          <option value="AFTER_LOGIN_BANNER">After-Login Banner</option>
          <option value="MOBILE_BANNER">Mobile App Banner</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading advertisements...</div>
      ) : ads.length === 0 ? (
        <div className="empty-state">No advertisements found. Click above to create one.</div>
      ) : (
        <div className="ads-grid">
          {ads.map((ad) => (
            <div key={ad.id} className="ad-card">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="ad-banner-preview"
                onError={(e) => {
                  (e.target as any).src =
                    'https://placehold.co/600x200/e2e8f0/475569?text=Banner+Preview';
                }}
              />
              <div className="ad-card-body">
                <div className="ad-title-row">
                  <h3 className="ad-title">{ad.title}</h3>
                  <span className={`badge-tag ${ad.status.toLowerCase()}`}>{ad.status}</span>
                </div>

                {ad.partnerName && (
                  <div className="ad-partner-tag">Partner: {ad.partnerName}</div>
                )}

                <div className="ad-stats-bar">
                  <div className="stat-item">
                    <span>Views</span>
                    <span className="stat-val">{ad.impressions}</span>
                  </div>
                  <div className="stat-item">
                    <span>Clicks</span>
                    <span className="stat-val">{ad.clicks}</span>
                  </div>
                  <div className="stat-item">
                    <span>CTR</span>
                    <span className="stat-val">
                      {ad.impressions > 0
                        ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span>Fee</span>
                    <span className="stat-val" style={{ color: '#c026d3' }}>
                      ₹{ad.feeAmount?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                </div>

                <ul className="ad-details-compact">
                  <li>
                    <span>Slot:</span>
                    <strong>{ad.slot}</strong>
                  </li>
                  <li>
                    <span>Audience:</span>
                    <strong>{ad.visibility}</strong>
                  </li>
                  <li>
                    <span>Period:</span>
                    <span>
                      {new Date(ad.startDate).toLocaleDateString()} –{' '}
                      {new Date(ad.endDate).toLocaleDateString()}
                    </span>
                  </li>
                  {ad.targetUrl && (
                    <li>
                      <span>Link:</span>
                      <a href={ad.targetUrl} target="_blank" rel="noreferrer">
                        Visit URL ↗
                      </a>
                    </li>
                  )}
                </ul>

                <div className="ad-card-actions">
                  <button className="secondary-btn" onClick={() => handleOpenEdit(ad)}>
                    ✏️ Edit
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => handleToggleActive(ad.id, ad.isActive)}
                  >
                    {ad.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="danger-btn"
                    onClick={() => handleDelete(ad.id, ad.title)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h2>{editingId ? 'Edit Advertisement' : 'Create Advertisement'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group-full">
                <label>Advertisement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Photography Mega Offer"
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Display Slot *</label>
                  <select
                    value={adForm.slot}
                    onChange={(e) => setAdForm({ ...adForm, slot: e.target.value })}
                  >
                    <option value="HOME_BANNER">Home Page Banner</option>
                    <option value="BROWSE_SIDEBAR">Browse Page Sidebar</option>
                    <option value="AFTER_LOGIN_BANNER">After-Login Banner</option>
                    <option value="MOBILE_BANNER">Mobile App Banner</option>
                  </select>
                </div>
                <div>
                  <label>Audience Visibility *</label>
                  <select
                    value={adForm.visibility}
                    onChange={(e) => setAdForm({ ...adForm, visibility: e.target.value })}
                  >
                    <option value="ALL">All Users (Public + Members)</option>
                    <option value="FREE_ONLY">Free Members Only</option>
                    <option value="PAID_ONLY">Paid Members Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group-full">
                <label>Banner Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={adForm.imageUrl}
                  onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                />
              </div>

              <div className="form-group-full">
                <label>External Target URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://partner-website.com"
                  value={adForm.targetUrl}
                  onChange={(e) => setAdForm({ ...adForm, targetUrl: e.target.value })}
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={adForm.startDate}
                    onChange={(e) => setAdForm({ ...adForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label>End Date *</label>
                  <input
                    type="date"
                    required
                    value={adForm.endDate}
                    onChange={(e) => setAdForm({ ...adForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Partner / Sponsor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Subhamastu Caterers"
                    value={adForm.partnerName}
                    onChange={(e) => setAdForm({ ...adForm, partnerName: e.target.value })}
                  />
                </div>
                <div>
                  <label>Advertising Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={adForm.feeAmount}
                    onChange={(e) => setAdForm({ ...adForm, feeAmount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'Update Advertisement' : 'Publish Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
