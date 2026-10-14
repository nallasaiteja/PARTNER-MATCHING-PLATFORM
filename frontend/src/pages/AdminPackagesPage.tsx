import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchAllAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  deleteAdminPackage,
} from '../services/adminApi';
import './AdminPackagesPage.css';

interface PackageItem {
  id: string;
  name: string;
  validityDays: number;
  contactReveals: number;
  ticketQuota: number;
  emiEligible: boolean;
  cost: number;
  servicesProvided: string;
  featuredProfileEligible: boolean;
  isActive?: boolean;
}

export const AdminPackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    validityDays: 90,
    contactReveals: 50,
    ticketQuota: 5,
    emiEligible: false,
    cost: 5000,
    servicesProvided: 'Profile Highlights, Kundali matching, Dedicated Relationship Manager',
    featuredProfileEligible: true,
  });

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchAllAdminPackages();
      setPackages(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      validityDays: 90,
      contactReveals: 50,
      ticketQuota: 5,
      emiEligible: false,
      cost: 5000,
      servicesProvided: '',
      featuredProfileEligible: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: PackageItem) => {
    setEditingId(pkg.id);
    setFormData({
      name: pkg.name,
      validityDays: pkg.validityDays,
      contactReveals: pkg.contactReveals,
      ticketQuota: pkg.ticketQuota || 0,
      emiEligible: pkg.emiEligible || false,
      cost: pkg.cost,
      servicesProvided: pkg.servicesProvided || '',
      featuredProfileEligible: pkg.featuredProfileEligible || false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAdminPackage(editingId, formData);
      } else {
        await createAdminPackage(formData);
      }
      setIsModalOpen(false);
      loadPackages();
    } catch (err: any) {
      alert(err.message || 'Error saving package');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate package "${name}"?`)) return;
    try {
      await deleteAdminPackage(id);
      loadPackages();
    } catch (err: any) {
      alert(err.message || 'Error deleting package');
    }
  };

  return (
    <div className="admin-packages-page">
      <div className="packages-header">
        <div>
          <h1>📦 Membership Packages Management</h1>
          <p>Configure subscription plans, contact quotas, EMI options, and feature privileges.</p>
        </div>
        <button className="primary-btn" onClick={handleOpenCreate}>
          + Create New Package
        </button>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {loading ? (
        <div className="loading-state">Loading packages...</div>
      ) : packages.length === 0 ? (
        <div className="empty-state">No packages configured yet. Click above to create one.</div>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`package-card ${pkg.isActive === false ? 'inactive' : ''}`}>
              <div className="package-badge-row">
                <span className={`badge-tag ${pkg.isActive !== false ? 'active' : 'inactive'}`}>
                  {pkg.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {pkg.featuredProfileEligible && (
                  <span className="badge-tag featured">⭐ Featured Eligible</span>
                )}
                {pkg.emiEligible && (
                  <span className="badge-tag emi">💳 EMI Available</span>
                )}
              </div>

              <div className="package-title-row">
                <h3 className="package-title">{pkg.name}</h3>
                <span className="package-cost">₹{pkg.cost.toLocaleString('en-IN')}</span>
              </div>

              <ul className="package-features-list">
                <li>
                  <span className="icon">⏳</span>
                  <strong>Validity:</strong> {pkg.validityDays} Days
                </li>
                <li>
                  <span className="icon">📞</span>
                  <strong>Contact Reveals:</strong> {pkg.contactReveals} Contacts
                </li>
                <li>
                  <span className="icon">🎫</span>
                  <strong>Support Tickets:</strong> {pkg.ticketQuota || 0} Tickets
                </li>
                <li>
                  <span className="icon">📋</span>
                  <strong>Services:</strong> {pkg.servicesProvided || 'Standard Membership'}
                </li>
              </ul>

              <div className="package-card-footer">
                <button className="secondary-btn" onClick={() => handleOpenEdit(pkg)}>
                  ✏️ Edit
                </button>
                <button className="danger-btn" onClick={() => handleDelete(pkg.id, pkg.name)}>
                  🗑️ Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h2>{editingId ? 'Edit Package' : 'Create New Package'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group-full">
                <label>Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Plus, Platinum Royal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>Validity (Days) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-grid-2col">
                <div>
                  <label>Contact Reveals Quota *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.contactReveals}
                    onChange={(e) => setFormData({ ...formData, contactReveals: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>Support Ticket Quota</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ticketQuota}
                    onChange={(e) => setFormData({ ...formData, ticketQuota: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group-full">
                <label>Services & Perks Included</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Astro Match, Relationship Manager, VIP verification"
                  value={formData.servicesProvided}
                  onChange={(e) => setFormData({ ...formData, servicesProvided: e.target.value })}
                />
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.emiEligible}
                    onChange={(e) => setFormData({ ...formData, emiEligible: e.target.checked })}
                  />
                  Allow EMI Installments
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.featuredProfileEligible}
                    onChange={(e) => setFormData({ ...formData, featuredProfileEligible: e.target.checked })}
                  />
                  Featured Profile Badge Allowed
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
