import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchMasterData,
  createMasterDataOption,
  updateMasterDataOption,
  deleteMasterDataOption,
  fetchTermsAndConditions,
  updateTermsAndConditions,
} from '../services/adminApi';
import './MasterDataPage.css';

const CATEGORIES = [
  { key: 'COMMUNITY', label: 'Community (Religion, Caste, Sub-Caste)' },
  { key: 'LOCATION', label: 'Location (State, District, Mandal, Village)' },
  { key: 'OCCUPATION', label: 'Occupation & Profession' },
  { key: 'EDUCATION', label: 'Education Levels & Universities' },
  { key: 'LANGUAGE', label: 'Spoken Languages & Mother Tongue' },
  { key: 'FINANCE', label: 'Finance & Bank Details' },
  { key: 'PLATFORM', label: 'Platform Sources & Branches' },
  { key: 'TERMS', label: 'Terms & Conditions' },
];

export const MasterDataPage: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<string>('COMMUNITY');
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addForm, setAddForm] = useState({
    code: '',
    label: '',
    parentCode: '',
    sortOrder: 0,
  });

  // Terms State
  const [termsContent, setTermsContent] = useState<string>('');
  const [termsLoading, setTermsLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (selectedCat === 'TERMS') {
      try {
        setTermsLoading(true);
        const res = await fetchTermsAndConditions();
        setTermsContent(res.content || '');
      } catch (err) {
        console.error(err);
      } finally {
        setTermsLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetchMasterData(selectedCat);
      setOptions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code || !addForm.label) {
      alert('Code and Label are required');
      return;
    }
    try {
      await createMasterDataOption({
        category: selectedCat,
        code: addForm.code,
        label: addForm.label,
        parentCode: addForm.parentCode || undefined,
        sortOrder: Number(addForm.sortOrder),
      });
      setShowAddModal(false);
      setAddForm({ code: '', label: '', parentCode: '', sortOrder: 0 });
      void loadData();
      alert('Master data option added successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding master data option');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete '${label}'?`)) return;
    try {
      await deleteMasterDataOption(id);
      void loadData();
      alert(`'${label}' deleted successfully`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting option');
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateMasterDataOption(id, { isActive: !current });
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error toggling option');
    }
  };

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTermsAndConditions(termsContent);
      alert('Terms & Conditions updated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving terms');
    }
  };

  return (
    <div className="master-data-root">
      <div className="member-header-panel">
        <div>
          <h2>Settings & Master Data Management (Section 5.6)</h2>
          <p>Super Admin control over global dropdowns, community taxonomy, location hierarchy, and platform terms</p>
        </div>
        {selectedCat !== 'TERMS' && (
          <button onClick={() => setShowAddModal(true)} className="create-staff-btn">
            ➕ Add {selectedCat} Option
          </button>
        )}
      </div>

      {/* Category Selection Bar */}
      <div className="category-chips-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`category-chip-btn ${selectedCat === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCat(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {selectedCat === 'TERMS' ? (
        <div className="staff-table-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Registration Terms & Conditions Content</h3>
          {termsLoading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading terms & conditions...</p>
          ) : (
            <form onSubmit={(e) => void handleSaveTerms(e)}>
            <div className="form-group">
              <label>Terms & Conditions Markdown / Plain Text</label>
              <textarea
                className="form-input"
                style={{ minHeight: 280, fontFamily: 'monospace', fontSize: '0.9rem' }}
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
              />
            </div>
            <button type="submit" className="create-staff-btn" style={{ marginTop: 14 }}>
              💾 Save Updated Terms
            </button>
          </form>
          )}
        </div>
      ) : (
        <div className="staff-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Configured {selectedCat} Options ({options.length})</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Changes flow immediately into registration, profile-editing, and search filters.
            </span>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading master data...</p>
          ) : options.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <p>No master data items configured for this category yet.</p>
              <button onClick={() => setShowAddModal(true)} className="action-btn">
                ➕ Add First Option
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code (Unique Key)</th>
                    <th>Display Label</th>
                    <th>Parent Code (Hierarchy)</th>
                    <th>Sort Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt) => (
                    <tr key={opt.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{opt.code}</td>
                      <td style={{ fontWeight: 600 }}>{opt.label}</td>
                      <td>{opt.parentCode || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                      <td>{opt.sortOrder}</td>
                      <td>
                        <span className={`tag-badge ${opt.isActive ? 'tag-success' : 'tag-danger'}`}>
                          {opt.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => void handleToggleActive(opt.id, opt.isActive)}
                          className="action-btn"
                        >
                          {opt.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => void handleDelete(opt.id, opt.label)}
                          className="action-btn danger"
                        >
                          🗑️ Delete
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

      {/* ADD OPTION MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Add {selectedCat} Option</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={(e) => void handleCreateSubmit(e)}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Display Label *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Brahmin, Reddy, Mechanical Engineer..."
                    value={addForm.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const code = label.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                      setAddForm({ ...addForm, label, code });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Code (Internal Unique ID) *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Parent Code (Optional for hierarchy, e.g. HINDU for Brahmin)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HINDU, TELANGANA"
                    value={addForm.parentCode}
                    onChange={(e) => setAddForm({ ...addForm, parentCode: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={addForm.sortOrder}
                    onChange={(e) => setAddForm({ ...addForm, sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Option</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MasterDataPage;
