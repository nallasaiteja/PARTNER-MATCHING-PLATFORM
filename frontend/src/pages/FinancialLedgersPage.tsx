import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchFinancialLedgers,
  recordExternalRevenue,
  fetchFranchiseWallets,
} from '../services/financeApi';
import { useAuth } from '../auth/AuthProvider';
import { Role } from '../constants/roles';
import './FinancialLedgersPage.css';

export const FinancialLedgersPage: React.FC = () => {
  const { user } = useAuth();
  const isHQ = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;
  const isFranchiseManager = user?.role === Role.FRANCHISE_MANAGER;

  // Active ledger type
  const [selectedLedgerType, setSelectedLedgerType] = useState<'HQ' | 'FRANCHISE' | 'AGENT'>(
    isHQ ? 'HQ' : isFranchiseManager ? 'FRANCHISE' : 'AGENT',
  );

  const [franchises, setFranchises] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    totalCredits: 0,
    totalDebits: 0,
    netBalance: 0,
  });

  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    category: '',
  });

  // Modal: Record Revenue Entry for HQ
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [revenueForm, setRevenueForm] = useState({
    category: 'AD_REVENUE' as 'AD_REVENUE' | 'WEDDING_SERVICE_REVENUE' | 'ADJUSTMENT',
    amount: 5000,
    description: '',
    referenceNumber: '',
  });

  // Load Franchises for selector
  useEffect(() => {
    if (isHQ) {
      fetchFranchiseWallets().then((res) => {
        setFranchises(res.wallets || []);
      }).catch(console.error);
    }
  }, [isHQ]);

  // Load Ledgers
  const loadLedgers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFinancialLedgers({
        ledgerType: selectedLedgerType,
        ownerOrgId: selectedLedgerType === 'FRANCHISE' ? (selectedOrgId || undefined) : undefined,
        category: dateFilter.category || undefined,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined,
        page: meta.page,
        limit: meta.limit,
      });

      setEntries(res.entries || []);
      setMeta(res.meta || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        totalCredits: 0,
        totalDebits: 0,
        netBalance: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ledger entries');
    } finally {
      setLoading(false);
    }
  }, [selectedLedgerType, selectedOrgId, dateFilter, meta.page, meta.limit]);

  useEffect(() => {
    loadLedgers();
  }, [loadLedgers]);

  // Submit External Revenue
  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revenueForm.amount <= 0 || !revenueForm.description.trim()) {
      alert('Please provide valid amount and description.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await recordExternalRevenue({
        category: revenueForm.category,
        amount: Number(revenueForm.amount),
        description: revenueForm.description.trim(),
        referenceNumber: revenueForm.referenceNumber || undefined,
      });

      setSuccessMsg(res.message || 'Revenue recorded successfully');
      setRevenueModalOpen(false);
      setRevenueForm({
        category: 'AD_REVENUE',
        amount: 5000,
        description: '',
        referenceNumber: '',
      });
      loadLedgers();
    } catch (err: any) {
      setError(err.message || 'Failed to record revenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ledgers-root">
      {/* Header */}
      <div className="invoice-header-panel">
        <div>
          <h2>📊 Financial Ledgers & Revenue Tracking</h2>
          <p>
            Audit and track credits, debits, package sales, manual wallet settlements, and partnership revenues.
          </p>
        </div>
        {isHQ && (
          <button className="btn-primary" onClick={() => setRevenueModalOpen(true)}>
            ➕ Record HQ Revenue (Ads / Wedding Services)
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
        {isHQ && (
          <button
            className={`invoice-tab-item ${selectedLedgerType === 'HQ' ? 'active' : ''}`}
            onClick={() => {
              setSelectedLedgerType('HQ');
              setSelectedOrgId('');
            }}
          >
            🏛️ HQ / Firm Central Ledger
          </button>
        )}
        {(isHQ || isFranchiseManager) && (
          <button
            className={`invoice-tab-item ${selectedLedgerType === 'FRANCHISE' ? 'active' : ''}`}
            onClick={() => setSelectedLedgerType('FRANCHISE')}
          >
            🏪 Franchise Ledgers
          </button>
        )}
        <button
          className={`invoice-tab-item ${selectedLedgerType === 'AGENT' ? 'active' : ''}`}
          onClick={() => setSelectedLedgerType('AGENT')}
        >
          👤 Agent Commission Ledgers
        </button>
      </div>

      {/* Summary Boxes */}
      <div className="ledger-summary-banner">
        <div className="ledger-summary-box credit">
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Credits
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>
            +₹{meta.totalCredits.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="ledger-summary-box debit">
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Debits
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626' }}>
            -₹{meta.totalDebits.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="ledger-summary-box net">
          <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
            Net Ledger Position
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: meta.netBalance >= 0 ? '#2563eb' : '#dc2626' }}>
            ₹{meta.netBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="invoice-filter-card">
        <div className="filter-grid">
          {selectedLedgerType === 'FRANCHISE' && isHQ && (
            <div className="filter-group">
              <label>Select Franchise</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                <option value="">All Franchises</option>
                {franchises.map((f) => (
                  <option key={f.franchiseOrgId} value={f.franchiseOrgId}>
                    {f.franchiseOrg?.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Category</label>
            <select
              value={dateFilter.category}
              onChange={(e) => setDateFilter({ ...dateFilter, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="INVOICE_SALE">Invoice Sale</option>
              <option value="WALLET_TOPUP">Wallet Top-Up</option>
              <option value="COMMISSION">Commission</option>
              <option value="AD_REVENUE">Advertisement Revenue</option>
              <option value="WEDDING_SERVICE_REVENUE">Wedding Service Fee</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="invoice-table-wrapper">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Date & Time (IST)</th>
              <th>Category</th>
              <th>Entry Type</th>
              <th>Amount (INR)</th>
              <th>Description</th>
              <th>Reference #</th>
              <th>Invoice / Member</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  ⏳ Loading ledger entries...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No ledger transactions found matching criteria.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {new Date(entry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                      {entry.category}
                    </span>
                  </td>
                  <td>
                    <span className={`entry-badge ${entry.entryType.toLowerCase()}`}>
                      {entry.entryType}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: entry.entryType === 'CREDIT' ? '#16a34a' : '#dc2626' }}>
                      {entry.entryType === 'CREDIT' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.88rem' }}>{entry.description}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {entry.referenceNumber || '—'}
                    </span>
                  </td>
                  <td>
                    {entry.invoice ? (
                      <div>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>
                          {entry.invoice.invoiceNumber || 'Pending'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {entry.invoice.memberProfile?.memberId} ({entry.invoice.package?.name})
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: RECORD HQ REVENUE ENTRY */}
      {revenueModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Record External Revenue in HQ Ledger</h3>
              <button className="modal-close-btn" onClick={() => setRevenueModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRevenueSubmit}>
              <div className="modal-body">
                <div className="filter-group">
                  <label>Revenue Category *</label>
                  <select
                    value={revenueForm.category}
                    onChange={(e: any) => setRevenueForm({ ...revenueForm, category: e.target.value })}
                  >
                    <option value="AD_REVENUE">Advertisement Banner Revenue (Section 5.8)</option>
                    <option value="WEDDING_SERVICE_REVENUE">Wedding Service Vendor Partnership Fee (Section 5.9)</option>
                    <option value="ADJUSTMENT">Accounting Adjustment Credit</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Amount (INR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={revenueForm.amount}
                    onChange={(e) => setRevenueForm({ ...revenueForm, amount: Number(e.target.value) })}
                  />
                </div>

                <div className="filter-group">
                  <label>Description / Partner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad Catering Co — Annual Vendor Listing Fee"
                    value={revenueForm.description}
                    onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                  />
                </div>

                <div className="filter-group">
                  <label>Bank Reference / Cheque / UTR #</label>
                  <input
                    type="text"
                    placeholder="UTR-20261015-XYZ"
                    value={revenueForm.referenceNumber}
                    onChange={(e) => setRevenueForm({ ...revenueForm, referenceNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setRevenueModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Post Credit to HQ Ledger 💰</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
