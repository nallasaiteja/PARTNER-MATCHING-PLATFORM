import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchAdminWeddingServices,
  fetchWeddingFinanceReport,
  createWeddingService,
  updateWeddingService,
  deleteWeddingService,
  fetchWeddingDirectory,
} from '../services/adminApi';
import './WeddingServicesPage.css';

const CATEGORIES = [
  { value: 'PHOTOGRAPHY', label: 'Wedding Photographers & Videographers' },
  { value: 'HALLS_VENUES', label: 'Wedding Halls & Banquet Venues' },
  { value: 'CATERING', label: 'Catering & Dining Services' },
  { value: 'BRIDAL_MAKEUP', label: 'Bridal Makeup & Styling' },
  { value: 'PLANNERS', label: 'Wedding Planners & Decorators' },
  { value: 'INVITATION_CARDS', label: 'Invitation Card Designers' },
  { value: 'JEWELLERY', label: 'Jewellery & Bridal Ornaments' },
];

export const WeddingServicesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'DIRECTORY'>('ADMIN');
  const [services, setServices] = useState<any[]>([]);
  const [directoryItems, setDirectoryItems] = useState<any[]>([]);
  const [financeReport, setFinanceReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Directory Simulation Tier
  const [previewTier, setPreviewTier] = useState<'FREE' | 'PAID'>('PAID');

  // Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    businessName: '',
    category: 'PHOTOGRAPHY',
    city: 'Hyderabad',
    phone: '',
    whatsapp: '',
    website: '',
    description: '',
    photos: '',
    isFeatured: false,
    feeAmount: 15000,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'ADMIN') {
        const [listRes, repRes] = await Promise.all([
          fetchAdminWeddingServices(selectedCategory || undefined),
          fetchWeddingFinanceReport(),
        ]);
        setServices(listRes || []);
        setFinanceReport(repRes || null);
      } else {
        const dirRes = await fetchWeddingDirectory(
          selectedCategory || undefined,
          undefined,
          previewTier === 'PAID',
        );
        setDirectoryItems(dirRes || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load wedding services');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, previewTier]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setServiceForm({
      businessName: '',
      category: 'PHOTOGRAPHY',
      city: 'Hyderabad',
      phone: '',
      whatsapp: '',
      website: '',
      description: '',
      photos: '',
      isFeatured: false,
      feeAmount: 15000,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (svc: any) => {
    setEditingId(svc.id);
    const photosStr = Array.isArray(svc.photos) ? svc.photos.join(', ') : '';
    setServiceForm({
      businessName: svc.businessName,
      category: svc.category,
      city: svc.city,
      phone: svc.phone,
      whatsapp: svc.whatsapp,
      website: svc.website || '',
      description: svc.description || '',
      photos: photosStr,
      isFeatured: svc.isFeatured || false,
      feeAmount: svc.feeAmount || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const photosArray = serviceForm.photos
        ? serviceForm.photos.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      if (photosArray.length > 5) {
        alert('Maximum 5 photos allowed');
        return;
      }

      const payload = {
        ...serviceForm,
        photos: photosArray,
      };

      if (editingId) {
        await updateWeddingService(editingId, payload);
      } else {
        await createWeddingService(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving wedding service');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete service "${name}"?`)) return;
    try {
      await deleteWeddingService(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting service');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateWeddingService(id, { isActive: !currentActive });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error toggling service status');
    }
  };

  return (
    <div className="wedding-services-page">
      <div className="page-header-flex">
        <div>
          <h1>💒 Wedding Services & Partner Directory</h1>
          <p>
            Curated matrimony partner directory featuring verified photographers, venues, caterers,
            and planners.
          </p>
        </div>
        <button className="primary-btn" onClick={handleOpenCreate}>
          + Register New Partner Service
        </button>
      </div>

      {/* Finance Stats */}
      {financeReport && activeTab === 'ADMIN' && (
        <div className="stats-card-row">
          <div className="stat-card-mini">
            <div className="label">Total Partnership Revenue</div>
            <div className="value" style={{ color: '#c026d3' }}>
              ₹{financeReport.totalPartnershipRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="label">Registered Partners</div>
            <div className="value" style={{ color: '#2563eb' }}>
              {financeReport.totalPartners}
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="label">Featured Partners</div>
            <div className="value" style={{ color: '#d97706' }}>
              {financeReport.featuredPartners}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav-row">
        <button
          className={`tab-btn ${activeTab === 'ADMIN' ? 'active' : ''}`}
          onClick={() => setActiveTab('ADMIN')}
        >
          Administrative Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'DIRECTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('DIRECTORY')}
        >
          Member-Facing Directory Preview
        </button>
      </div>

      {/* Filter Category */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {activeTab === 'DIRECTORY' && (
        <div className="tier-toggle-bar">
          <span>
            🔒 <strong>Tier Access Simulation:</strong> Testing backend contact-access restrictions
            (Free vs Paid).
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`secondary-btn ${previewTier === 'FREE' ? 'active-nav-link' : ''}`}
              onClick={() => setPreviewTier('FREE')}
            >
              Simulate Free Member (Masked)
            </button>
            <button
              className={`primary-btn ${previewTier === 'PAID' ? 'active-nav-link' : ''}`}
              onClick={() => setPreviewTier('PAID')}
            >
              Simulate Paid Member (Direct Contact)
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading services...</div>
      ) : activeTab === 'ADMIN' ? (
        services.length === 0 ? (
          <div className="empty-state">No wedding services listed. Click above to register one.</div>
        ) : (
          <div className="services-grid">
            {services.map((svc) => (
              <div
                key={svc.id}
                className={`service-card ${svc.isFeatured ? 'featured-partner' : ''}`}
              >
                {svc.photos && svc.photos[0] ? (
                  <img src={svc.photos[0]} alt={svc.businessName} className="service-photo-cover" />
                ) : (
                  <div
                    className="service-photo-cover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                    }}
                  >
                    💒
                  </div>
                )}
                <div className="service-card-body">
                  <div className="service-title-row">
                    <h3 className="service-title">{svc.businessName}</h3>
                    {svc.isFeatured && (
                      <span className="badge-tag featured">⭐ FEATURED PARTNER</span>
                    )}
                  </div>
                  <span className="service-category-tag">{svc.category}</span>

                  <p className="service-desc">{svc.description}</p>

                  <div className="service-contact-box">
                    <div className="contact-item">
                      <span>City:</span>
                      <strong>{svc.city}</strong>
                    </div>
                    <div className="contact-item">
                      <span>Phone:</span>
                      <strong>{svc.phone}</strong>
                    </div>
                    <div className="contact-item">
                      <span>WhatsApp:</span>
                      <strong>{svc.whatsapp}</strong>
                    </div>
                    <div className="contact-item">
                      <span>Fee Recorded:</span>
                      <strong style={{ color: '#c026d3' }}>
                        ₹{svc.feeAmount?.toLocaleString('en-IN') || 0}
                      </strong>
                    </div>
                  </div>

                  <div className="ad-card-actions">
                    <button className="secondary-btn" onClick={() => handleOpenEdit(svc)}>
                      ✏️ Edit
                    </button>
                    <button
                      className="secondary-btn"
                      onClick={() => handleToggleActive(svc.id, svc.isActive)}
                    >
                      {svc.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => handleDelete(svc.id, svc.businessName)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Member-Facing Directory */
        <div className="services-grid">
          {directoryItems.map((svc) => (
            <div
              key={svc.id}
              className={`service-card ${svc.isFeatured ? 'featured-partner' : ''}`}
            >
              {svc.photos && svc.photos[0] ? (
                <img src={svc.photos[0]} alt={svc.businessName} className="service-photo-cover" />
              ) : (
                <div
                  className="service-photo-cover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                  }}
                >
                  💒
                </div>
              )}
              <div className="service-card-body">
                <div className="service-title-row">
                  <h3 className="service-title">{svc.businessName}</h3>
                  {svc.isFeatured && (
                    <span className="badge-tag featured">⭐ FEATURED PARTNER</span>
                  )}
                </div>
                <span className="service-category-tag">{svc.category}</span>
                <p className="service-desc">{svc.description}</p>

                <div className="service-contact-box">
                  <div className="contact-item">
                    <span>Location:</span>
                    <strong>{svc.city}</strong>
                  </div>

                  {previewTier === 'PAID' ? (
                    <>
                      <div className="contact-item">
                        <span>Direct Call:</span>
                        <a href={`tel:${svc.phone}`} className="contact-action-btn call">
                          📞 {svc.phone}
                        </a>
                      </div>
                      <div className="contact-item">
                        <span>WhatsApp:</span>
                        <a
                          href={`https://wa.me/${svc.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-action-btn whatsapp"
                        >
                          💬 Chat on WhatsApp
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="contact-item">
                        <span>Direct Call:</span>
                        <span className="contact-masked">{svc.phone}</span>
                      </div>
                      <div className="contact-item">
                        <span>WhatsApp:</span>
                        <span className="contact-masked">{svc.whatsapp}</span>
                      </div>
                    </>
                  )}
                </div>

                {svc.website && (
                  <a
                    href={svc.website}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-btn"
                    style={{ textAlign: 'center', display: 'block' }}
                  >
                    Visit Website ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h2>{editingId ? 'Edit Wedding Service' : 'Register New Wedding Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group-full">
                <label>Business / Provider Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Grand Banquets"
                  value={serviceForm.businessName}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, businessName: e.target.value })
                  }
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Service Category *</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>City / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad, Vijayawada, Visakhapatnam"
                    value={serviceForm.city}
                    onChange={(e) => setServiceForm({ ...serviceForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91..."
                    value={serviceForm.phone}
                    onChange={(e) => setServiceForm({ ...serviceForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={serviceForm.whatsapp}
                    onChange={(e) => setServiceForm({ ...serviceForm, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-full">
                <label>Website Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={serviceForm.website}
                  onChange={(e) => setServiceForm({ ...serviceForm, website: e.target.value })}
                />
              </div>

              <div className="form-group-full">
                <label>Description of Services & Packages</label>
                <textarea
                  rows={3}
                  placeholder="Describe catering menus, venue capacity, photography gear, etc."
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, description: e.target.value })
                  }
                />
              </div>

              <div className="form-group-full">
                <label>Photo URLs (Comma-separated, up to 5 photos)</label>
                <input
                  type="text"
                  placeholder="https://photo1.jpg, https://photo2.jpg"
                  value={serviceForm.photos}
                  onChange={(e) => setServiceForm({ ...serviceForm, photos: e.target.value })}
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Partnership Fee Collected (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.feeAmount}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, feeAmount: Number(e.target.value) })
                    }
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={serviceForm.isFeatured}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, isFeatured: e.target.checked })
                      }
                    />
                    ⭐ Mark as Featured Partner
                  </label>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'Update Service' : 'Register Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
