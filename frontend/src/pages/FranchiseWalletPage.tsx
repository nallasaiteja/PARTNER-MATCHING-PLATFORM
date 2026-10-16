import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchFranchiseWallets,
  fetchMyFranchiseWallet,
  fetchWalletDetail,
  topupFranchiseWallet,
  setFranchiseWalletLimit,
} from '../services/financeApi';
import { useAuth } from '../auth/AuthProvider';
import { Role } from '../constants/roles';
import './FranchiseWalletPage.css';

export const FranchiseWalletPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === Role.SUPER_ADMIN;
  const isHQ = isSuperAdmin || user?.role === Role.ADMIN;
  const isFranchiseManager = user?.role === Role.FRANCHISE_MANAGER;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Super Admin view: all wallets
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWalletDetail, setSelectedWalletDetail] = useState<{
    wallet: any;
    transactions: any[];
  } | null>(null);

  // Franchise Manager view: own wallet
  const [myWalletData, setMyWalletData] = useState<{
    wallet: any;
    recentTransactions: any[];
  } | null>(null);

  // Top-Up Modal
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupTargetOrg, setTopupTargetOrg] = useState<any | null>(null);
  const [topupForm, setTopupForm] = useState({
    amount: 10000,
    referenceId: '',
    reason: 'Offline payment verified at HQ',
    notes: '',
  });

  // Credit Limit Modal
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [newLimit, setNewLimit] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isHQ) {
        const res = await fetchFranchiseWallets();
        setWallets(res.wallets || []);
      }
      if (isFranchiseManager) {
        const myRes = await fetchMyFranchiseWallet();
        setMyWalletData(myRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [isHQ, isFranchiseManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // View specific wallet detail (for Super Admin)
  const handleSelectWallet = async (franchiseOrgId: string) => {
    try {
      setLoading(true);
      const res = await fetchWalletDetail(franchiseOrgId);
      setSelectedWalletDetail(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet details');
    } finally {
      setLoading(false);
    }
  };

  // Submit Top-Up
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupTargetOrg) return;
    if (topupForm.amount <= 0) {
      alert('Amount must be positive');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await topupFranchiseWallet(topupTargetOrg.franchiseOrgId || topupTargetOrg.id, {
        amount: Number(topupForm.amount),
        referenceId: topupForm.referenceId || undefined,
        reason: topupForm.reason,
        notes: topupForm.notes || undefined,
      });

      setSuccessMsg(res.message || 'Top-up successfully recorded!');
      setTopupModalOpen(false);
      loadData();
      if (selectedWalletDetail) {
        handleSelectWallet(topupTargetOrg.franchiseOrgId || topupTargetOrg.id);
      }
    } catch (err: any) {
      setError(err.message || 'Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  // Submit Credit Limit
  const handleLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupTargetOrg) return;

    try {
      const res = await setFranchiseWalletLimit(topupTargetOrg.franchiseOrgId || topupTargetOrg.id, Number(newLimit));
      setSuccessMsg(res.message || 'Credit limit updated');
      setLimitModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update limit');
    }
  };

  const activeWallet = isFranchiseManager ? myWalletData?.wallet : selectedWalletDetail?.wallet;
  const activeTransactions = isFranchiseManager
    ? myWalletData?.recentTransactions || []
    : selectedWalletDetail?.transactions || [];

  return (
    <div className="wallet-root">
      {/* Header */}
      <div className="wallet-header-panel">
        <div>
          <h2>💼 Franchise Prepaid Wallet Management</h2>
          <p>
            {isFranchiseManager
              ? 'Monitor your franchise prepaid wallet balance, approved package sale deductions, and top-up receipts.'
              : 'HQ Overview: View franchise wallet balances, transaction ledgers, and record manual top-ups.'}
          </p>
        </div>
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

      {/* STATS CARDS */}
      {activeWallet && (
        <div className="wallet-cards-grid">
          <div className="wallet-stat-card primary">
            <span className="stat-label">Current Available Balance</span>
            <span className="stat-val">₹{activeWallet.balance.toLocaleString('en-IN')}</span>
            <span className="stat-sub">
              {activeWallet.balance <= 0 ? '⚠️ Zero Balance — Sales will be blocked' : '✅ Active for package sales'}
            </span>
          </div>

          <div className="wallet-stat-card">
            <span className="stat-label">Configured Credit Limit</span>
            <span className="stat-val">₹{activeWallet.creditLimit.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Configured by Super Admin</span>
          </div>

          <div className="wallet-stat-card">
            <span className="stat-label">Franchise Organization</span>
            <span className="stat-val" style={{ fontSize: '1.4rem' }}>
              {activeWallet.franchiseOrg?.name || 'My Franchise'}
            </span>
            <span className="stat-sub">Status: {activeWallet.isActive ? 'Active' : 'Suspended'}</span>
          </div>
        </div>
      )}

      {/* SUPER ADMIN: ALL WALLETS LIST */}
      {isHQ && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>Franchise Wallets Directory</h3>
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Franchise Name</th>
                  <th>Current Balance</th>
                  <th>Configured Limit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <strong>{w.franchiseOrg?.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {w.franchiseOrgId}</div>
                    </td>
                    <td>
                      <strong style={{ color: w.balance > 0 ? '#15803d' : '#b91c1c' }}>
                        ₹{w.balance.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>₹{w.creditLimit.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`status-chip ${w.isActive ? 'approved' : 'rejected'}`}>
                        {w.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleSelectWallet(w.franchiseOrgId)}
                        >
                          📜 Ledger
                        </button>
                        {isSuperAdmin && (
                          <>
                            <button
                              className="btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => {
                                setTopupTargetOrg(w);
                                setTopupModalOpen(true);
                              }}
                            >
                              ➕ Record Top-Up
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={() => {
                                setTopupTargetOrg(w);
                                setNewLimit(w.creditLimit);
                                setLimitModalOpen(true);
                              }}
                              title="Set Credit Limit"
                            >
                              ⚙️ Limit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WALLET TRANSACTIONS LEDGER */}
      {(isFranchiseManager || selectedWalletDetail) && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>
              Wallet Transaction History {isHQ && selectedWalletDetail && `(${selectedWalletDetail.wallet.franchiseOrg?.name})`}
            </h3>
            {isSuperAdmin && selectedWalletDetail && (
              <button
                className="btn-primary"
                onClick={() => {
                  setTopupTargetOrg(selectedWalletDetail.wallet);
                  setTopupModalOpen(true);
                }}
              >
                ➕ Record Top-Up For This Wallet
              </button>
            )}
          </div>

          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount (INR)</th>
                  <th>Balance Before</th>
                  <th>Balance After</th>
                  <th>Invoice / Reference</th>
                  <th>Performed By</th>
                  <th>Notes</th>
                  <th>Timestamp (IST)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      ⏳ Loading wallet ledger transactions...
                    </td>
                  </tr>
                ) : activeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No wallet transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  activeTransactions.map((tx: any) => (
                    <tr key={tx.id}>
                      <td>
                        <span className={`tx-type-chip ${tx.type === 'TOPUP' ? 'topup' : 'deduction'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: tx.type === 'TOPUP' ? '#15803d' : '#b91c1c' }}>
                          {tx.type === 'TOPUP' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>₹{tx.balanceBefore.toLocaleString('en-IN')}</td>
                      <td><strong>₹{tx.balanceAfter.toLocaleString('en-IN')}</strong></td>
                      <td>
                        {tx.invoice ? (
                          <div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {tx.invoice.invoiceNumber || 'INV-FINAL'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {tx.invoice.memberProfile?.memberId} ({tx.invoice.package?.name})
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                            {tx.referenceId || 'Manual Top-Up'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          {tx.performedBy?.fullName || tx.performedBy?.employeeId} ({tx.performedBy?.role})
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#475569' }}>{tx.notes}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(tx.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: RECORD TOP-UP (SUPER ADMIN ONLY) */}
      {topupModalOpen && topupTargetOrg && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Record Manual Franchise Top-Up</h3>
              <button className="modal-close-btn" onClick={() => setTopupModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleTopupSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                  Record a top-up after verifying that <strong>{topupTargetOrg.franchiseOrg?.name || topupTargetOrg.name}</strong> has deposited funds into the HQ account.
                </p>

                <div className="filter-group">
                  <label>Top-Up Amount (INR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={topupForm.amount}
                    onChange={(e) => setTopupForm({ ...topupForm, amount: Number(e.target.value) })}
                  />
                </div>

                <div className="filter-group">
                  <label>Bank Reference / UTR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982341234 or Cheque #"
                    value={topupForm.referenceId}
                    onChange={(e) => setTopupForm({ ...topupForm, referenceId: e.target.value })}
                  />
                </div>

                <div className="filter-group">
                  <label>Reason / Source of Payment *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IMPS Transfer verified by Accounts Team"
                    value={topupForm.reason}
                    onChange={(e) => setTopupForm({ ...topupForm, reason: e.target.value })}
                  />
                </div>

                <div className="filter-group">
                  <label>Additional Internal Notes</label>
                  <textarea
                    rows={2}
                    value={topupForm.notes}
                    onChange={(e) => setTopupForm({ ...topupForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setTopupModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Credit Franchise Wallet 💳</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SET CREDIT LIMIT */}
      {limitModalOpen && topupTargetOrg && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Configure Franchise Limit</h3>
              <button className="modal-close-btn" onClick={() => setLimitModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleLimitSubmit}>
              <div className="modal-body">
                <div className="filter-group">
                  <label>Credit Limit (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={newLimit}
                    onChange={(e) => setNewLimit(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setLimitModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Limit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
