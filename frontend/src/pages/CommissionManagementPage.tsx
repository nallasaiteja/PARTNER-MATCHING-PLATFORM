import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchCommissionConfigs,
  setCommissionConfig,
  fetchCommissionReport,
  fetchStaffForSales,
} from '../services/financeApi';
import { useAuth } from '../auth/AuthProvider';
import { Role } from '../constants/roles';
import './CommissionManagementPage.css';

export const CommissionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isHQ = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;
  const isFranchiseManager = user?.role === Role.FRANCHISE_MANAGER;

  const [activeTab, setActiveTab] = useState<'report' | 'config'>('report');
  const [configs, setConfigs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCommissionEarned: 0,
  });

  // Filter
  const [filter, setFilter] = useState({
    agentUserId: '',
    startDate: '',
    endDate: '',
  });

  // New Config Modal
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    scope: isHQ ? 'GLOBAL_BRANCH' : 'ORG_FRANCHISE',
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    rateValue: 10,
    agentUserId: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgs, rpt] = await Promise.all([
        fetchCommissionConfigs(),
        fetchCommissionReport({
          agentUserId: filter.agentUserId || undefined,
          startDate: filter.startDate || undefined,
          endDate: filter.endDate || undefined,
          page: meta.page,
          limit: meta.limit,
        }),
      ]);

      setConfigs(cfgs || []);
      setTransactions(rpt.transactions || []);
      setMeta(rpt.meta || { total: 0, page: 1, limit: 20, totalPages: 1, totalCommissionEarned: 0 });
    } catch (err: any) {
      setError(err.message || 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [filter, meta.page, meta.limit]);

  useEffect(() => {
    loadData();
    fetchStaffForSales().then(setStaffList).catch(console.error);
  }, [loadData]);

  // Submit Config
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.rateValue < 0) {
      alert('Rate cannot be negative');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await setCommissionConfig({
        scope: configForm.scope,
        commissionType: configForm.commissionType,
        rateValue: Number(configForm.rateValue),
        agentUserId: configForm.agentUserId || undefined,
        notes: configForm.notes || undefined,
      });

      setSuccessMsg(res.message || 'Commission rule saved successfully!');
      setConfigModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="commission-root">
      {/* Header */}
      <div className="invoice-header-panel">
        <div>
          <h2>🎖️ Agent Commission Rules & Earnings</h2>
          <p>
            Configure immutable commission percentages / fixed incentives and review earned commissions. All monetary settlements are handled offline.
          </p>
        </div>
        {(isHQ || isFranchiseManager) && (
          <button className="btn-primary" onClick={() => setConfigModalOpen(true)}>
            ⚙️ Configure Commission Rule
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontWeight: 600 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="invoice-tabs-bar">
        <button
          className={`invoice-tab-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📈 Commission Transactions & Earnings
        </button>
        <button
          className={`invoice-tab-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configured Rules ({configs.length})
        </button>
      </div>

      {activeTab === 'report' && (
        <>
          {/* Summary */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Filtered Commissions Earned
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                ₹{meta.totalCommissionEarned.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              ℹ️ Payouts are reconciled manually and paid offline.
            </div>
          </div>

          {/* Filter */}
          <div className="invoice-filter-card">
            <div className="filter-grid">
              {isHQ && (
                <div className="filter-group">
                  <label>Filter by Agent / Staff</label>
                  <select
                    value={filter.agentUserId}
                    onChange={(e) => setFilter({ ...filter, agentUserId: e.target.value })}
                  >
                    <option value="">All Agents</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName || st.employeeId} ({st.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Agent / Staff</th>
                  <th>Sale Package</th>
                  <th>Package Price</th>
                  <th>Rule Applied</th>
                  <th>Commission Earned</th>
                  <th>Invoice #</th>
                  <th>Status</th>
                  <th>Date (IST)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                      ⏳ Loading commission records...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No commission transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <strong>{tx.agentUser?.fullName || tx.agentUser?.employeeId}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tx.agentUser?.role}</div>
                      </td>
                      <td>
                        <strong>{tx.invoice?.package?.name}</strong>
                      </td>
                      <td>₹{tx.packagePrice?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {tx.rateValue}
                          {tx.commissionType === 'PERCENTAGE' ? '%' : ' INR Fixed'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#16a34a', fontSize: '1rem' }}>
                          ₹{tx.commissionAmount?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {tx.invoice?.invoiceNumber || 'INV-FINAL'}
                        </span>
                      </td>
                      <td>
                        <span className="status-chip approved">
                          {tx.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {configs.map((c) => (
            <div key={c.id} className="config-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="status-chip approved">{c.scope}</span>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>
                  {c.rateValue}
                  {c.commissionType === 'PERCENTAGE' ? '% Rate' : ' INR Fixed'}
                </span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '8px' }}>
                {c.notes || 'Default commission rule'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                Configured by: {c.configuredBy?.fullName || c.configuredBy?.employeeId} on{' '}
                {new Date(c.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CONFIGURE COMMISSION RULE */}
      {configModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Configure Commission Rule</h3>
              <button className="modal-close-btn" onClick={() => setConfigModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleConfigSubmit}>
              <div className="modal-body">
                <div className="filter-group">
                  <label>Rule Scope *</label>
                  <select
                    value={configForm.scope}
                    onChange={(e) => setConfigForm({ ...configForm, scope: e.target.value })}
                  >
                    {isHQ && <option value="GLOBAL_BRANCH">Global Branch Agents (Default)</option>}
                    <option value="ORG_FRANCHISE">Franchise-Wide Agents</option>
                    <option value="AGENT_SPECIFIC">Specific Agent Custom Rate</option>
                  </select>
                </div>

                {configForm.scope === 'AGENT_SPECIFIC' && (
                  <div className="filter-group">
                    <label>Select Agent</label>
                    <select
                      value={configForm.agentUserId}
                      onChange={(e) => setConfigForm({ ...configForm, agentUserId: e.target.value })}
                    >
                      <option value="">-- Choose Agent --</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName || st.employeeId} ({st.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="filter-group">
                  <label>Commission Type *</label>
                  <select
                    value={configForm.commissionType}
                    onChange={(e: any) => setConfigForm({ ...configForm, commissionType: e.target.value })}
                  >
                    <option value="PERCENTAGE">Percentage (%) of Package Price</option>
                    <option value="FIXED">Fixed Amount (INR) per Conversion</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Rate Value *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={configForm.rateValue}
                    onChange={(e) => setConfigForm({ ...configForm, rateValue: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {configForm.commissionType === 'PERCENTAGE'
                      ? 'e.g. 10.0 for 10% commission on the sale amount'
                      : 'e.g. 500 for ₹500 flat incentive per sale'}
                  </div>
                </div>

                <div className="filter-group">
                  <label>Notes / Description</label>
                  <textarea
                    rows={2}
                    placeholder="Q4 Incentive scheme..."
                    value={configForm.notes}
                    onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setConfigModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Commission Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
