import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  fetchAgentInvoices,
  fetchAgentProfiles,
  raiseAgentInvoice,
  fetchAgentDashboard,
  AgentInvoiceItem,
  AgentProfileItem,
} from '../services/agentApi';
import { fetchActivePackages } from '../services/financeApi';
import './AgentInvoicesPage.css';

export const AgentInvoicesPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paramMemberProfileId = searchParams.get('memberProfileId') || '';

  const [activeTab, setActiveTab] = useState<'raise' | 'history'>(
    paramMemberProfileId ? 'raise' : 'history',
  );

  // Agent & Role Info
  const [agentRole, setAgentRole] = useState<string>('BRANCH_AGENT');

  // Invoices List State
  const [invoices, setInvoices] = useState<AgentInvoiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [myProfiles, setMyProfiles] = useState<AgentProfileItem[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    memberProfileId: paramMemberProfileId,
    packageId: '',
    paymentMode: 'ONLINE',
    bankName: '',
    transactionRef: '',
    chequeDate: '',
    isCash: false,
    cashReceivedDeclaration: false,
    notes: '',
  });

  // Selected Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<AgentInvoiceItem | null>(null);

  // 1. Load Agent role, packages, and own profiles
  useEffect(() => {
    async function init() {
      try {
        const [dashRes, pkgRes, profRes] = await Promise.all([
          fetchAgentDashboard(),
          fetchActivePackages(),
          fetchAgentProfiles({ limit: 100 }),
        ]);
        setAgentRole(dashRes.agent.role);
        setPackages(pkgRes || []);
        setMyProfiles(profRes.data || []);

        if (pkgRes && pkgRes.length > 0 && !formData.packageId) {
          setFormData((prev) => ({ ...prev, packageId: pkgRes[0].id }));
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // 2. Load Invoices
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAgentInvoices({
        status: statusFilter,
        page,
        limit: 10,
      });
      setInvoices(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Selected package details
  const selectedPkg = packages.find((p) => p.id === formData.packageId);

  // Submit Handler
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.memberProfileId) {
      setError('Please select a member profile from your created profiles list.');
      return;
    }
    if (!formData.packageId) {
      setError('Please select an active package.');
      return;
    }

    if (formData.paymentMode === 'CASH' && !formData.cashReceivedDeclaration) {
      setError('You must confirm the Cash Received Declaration for cash payments.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await raiseAgentInvoice({
        memberProfileId: formData.memberProfileId,
        packageId: formData.packageId,
        paymentMode: formData.paymentMode,
        bankName: formData.bankName || undefined,
        transactionRef: formData.transactionRef || undefined,
        chequeDate: formData.chequeDate || undefined,
        isCash: formData.paymentMode === 'CASH',
        cashReceivedDeclaration: formData.cashReceivedDeclaration,
        notes: formData.notes || undefined,
      });

      setSuccessMessage(res.message || 'Invoice request successfully submitted!');
      // Reset form and reload invoices
      setFormData({
        memberProfileId: '',
        packageId: packages[0]?.id || '',
        paymentMode: 'ONLINE',
        bankName: '',
        transactionRef: '',
        chequeDate: '',
        isCash: false,
        cashReceivedDeclaration: false,
        notes: '',
      });
      setActiveTab('history');
      loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to raise invoice request');
    } finally {
      setSubmitting(false);
    }
  };

  const isBranchAgent = agentRole === 'BRANCH_AGENT';

  return (
    <div className="agent-invoices-page">
      {/* Header */}
      <div className="agent-invoices-header">
        <div>
          <h2 className="agent-invoices-title">Invoice Requests & Submissions</h2>
          <p className="agent-invoices-subtitle">
            {isBranchAgent
              ? 'Raise package invoice requests directly to HQ Admin for approval and package activation.'
              : 'Raise package invoice requests to your Franchise Manager for wallet deduction and approval.'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="agent-invoices-tabs">
        <button
          className={`agent-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            setError(null);
          }}
        >
          📋 My Raised Requests ({totalCount})
        </button>
        <button
          className={`agent-tab-btn ${activeTab === 'raise' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('raise');
            setError(null);
          }}
        >
          ➕ Raise New Invoice Request
        </button>
      </div>

      {successMessage && (
        <div className="agent-info-banner">
          <div className="agent-info-icon">✅</div>
          <div className="agent-info-text">
            <h4>Success</h4>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="agent-warning-banner">
          <div>⚠️ {error}</div>
        </div>
      )}

      {/* ─── TAB 1: RAISE INVOICE REQUEST ─── */}
      {activeTab === 'raise' && (
        <div className="agent-form-container">
          <div className="agent-form-section-title">
            Raise Package Invoice Request ({isBranchAgent ? 'Routing to HQ Central' : 'Routing to Franchise Manager'})
          </div>

          {/* Workflow Routing Banner */}
          <div className="agent-info-banner" style={{ marginBottom: '20px' }}>
            <div className="agent-info-icon">{isBranchAgent ? '🏢' : '💼'}</div>
            <div className="agent-info-text">
              <h4>{isBranchAgent ? 'Super Admin HQ Approval Required' : 'Franchise Manager Approval Required'}</h4>
              <p>
                {isBranchAgent
                  ? 'As a Branch Agent, your invoice requests are routed directly to Super Admin at HQ. Branch Agents cannot approve their own requests or mark profiles as Paid.'
                  : 'As a Franchise Agent, your invoice requests are routed to your designated Franchise Manager. The Franchise Manager approves requests using the franchise wallet.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleRaiseSubmit}>
            <div className="agent-form-grid">
              {/* Member Selection */}
              <div className="agent-form-group">
                <label>Select Member Profile *</label>
                <select
                  required
                  className="agent-form-select"
                  value={formData.memberProfileId}
                  onChange={(e) =>
                    setFormData({ ...formData, memberProfileId: e.target.value })
                  }
                >
                  <option value="">-- Choose from your created profiles --</option>
                  {myProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.memberId || 'Pending ID'} - {p.firstName} {p.lastName} (
                      {p.user?.mobile || 'No Mobile'}) [{p.packageType}]
                    </option>
                  ))}
                </select>
                <span className="agent-form-help">
                  Only profiles personally created by your agent account can be selected.
                </span>
              </div>

              {/* Package Selection */}
              <div className="agent-form-group">
                <label>Select Membership Package *</label>
                <select
                  required
                  className="agent-form-select"
                  value={formData.packageId}
                  onChange={(e) =>
                    setFormData({ ...formData, packageId: e.target.value })
                  }
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ₹{pkg.cost.toLocaleString('en-IN')} ({pkg.validityDays} Days,{' '}
                      {pkg.contactReveals} Contacts)
                    </option>
                  ))}
                </select>

                {selectedPkg && (
                  <div className="package-cost-badge">
                    <span>Trusted Package Amount:</span>
                    <span className="package-cost-val">
                      ₹{selectedPkg.cost.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div className="agent-form-group">
                <label>Payment Mode *</label>
                <select
                  required
                  className="agent-form-select"
                  value={formData.paymentMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setFormData({
                      ...formData,
                      paymentMode: mode,
                      isCash: mode === 'CASH',
                      cashReceivedDeclaration: false,
                    });
                  }}
                >
                  <option value="ONLINE">Online Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Debit / Credit Card</option>
                  {selectedPkg?.emiEligible && <option value="EMI">EMI Payment</option>}
                </select>
              </div>

              {/* Transaction Ref / Cheque No */}
              {(formData.paymentMode === 'ONLINE' ||
                formData.paymentMode === 'UPI' ||
                formData.paymentMode === 'CARD') && (
                <div className="agent-form-group">
                  <label>Transaction UTR / Reference ID</label>
                  <input
                    type="text"
                    className="agent-form-input"
                    placeholder="e.g. UTR20261015123456"
                    value={formData.transactionRef}
                    onChange={(e) =>
                      setFormData({ ...formData, transactionRef: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Bank Name */}
              {(formData.paymentMode === 'ONLINE' ||
                formData.paymentMode === 'CHEQUE') && (
                <div className="agent-form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    className="agent-form-input"
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Cheque Date */}
              {formData.paymentMode === 'CHEQUE' && (
                <div className="agent-form-group">
                  <label>Cheque Date</label>
                  <input
                    type="date"
                    className="agent-form-input"
                    value={formData.chequeDate}
                    onChange={(e) =>
                      setFormData({ ...formData, chequeDate: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Cash Declaration Checkbox */}
            {formData.paymentMode === 'CASH' && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#92400e' }}>
                  <input
                    type="checkbox"
                    checked={formData.cashReceivedDeclaration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cashReceivedDeclaration: e.target.checked,
                      })
                    }
                  />
                  I confirm that cash payment of ₹{selectedPkg?.cost.toLocaleString('en-IN')} has been collected from the member and recorded in hand.
                </label>
              </div>
            )}

            {/* Company Bank Details info box for reference */}
            <div className="bank-info-box">
              <div className="bank-info-title">🏦 Company Account Details for Verification:</div>
              <div className="bank-info-details">
                <div><strong>Account Name:</strong> Partner Matching Platform Pvt Ltd</div>
                <div><strong>Bank:</strong> HDFC Bank, Banjara Hills</div>
                <div><strong>Account No:</strong> 50200012345678</div>
                <div><strong>IFSC Code:</strong> HDFC0001234</div>
                <div><strong>UPI ID:</strong> partnermatch@hdfcbank</div>
              </div>
            </div>

            {/* Notes */}
            <div className="agent-form-group" style={{ marginBottom: '24px' }}>
              <label>Notes / Submission Remarks (Optional)</label>
              <textarea
                className="agent-form-textarea"
                placeholder="Add any relevant information about this payment or package request..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-action-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            >
              {submitting
                ? 'Submitting Invoice Request...'
                : `Submit Invoice Request to ${isBranchAgent ? 'HQ Admin' : 'Franchise Manager'}`}
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 2: INVOICES HISTORY TABLE ─── */}
      {activeTab === 'history' && (
        <div className="agent-profile-table-card">
          {/* Filter Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Filter by Status:</span>
            <select
              className="agent-filter-select"
              style={{ minWidth: '140px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved / Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              <p>Loading invoice requests...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="agent-empty-state">
              <div className="agent-empty-icon">💳</div>
              <h3>No invoice requests found</h3>
              <p>You have not raised any invoice requests matching this filter.</p>
              <button
                className="btn-action-primary"
                style={{ display: 'inline-flex', marginTop: '12px' }}
                onClick={() => setActiveTab('raise')}
              >
                Raise an Invoice Request
              </button>
            </div>
          ) : (
            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Request / Inv No.</th>
                    <th>Member ID & Name</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.invoiceNumber || inv.requestNumber || 'PENDING'}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {inv.memberProfile?.memberId || 'N/A'}
                        </div>
                        <small style={{ color: '#64748b' }}>
                          {inv.memberProfile?.firstName} {inv.memberProfile?.lastName}
                        </small>
                      </td>
                      <td>{inv.package?.name}</td>
                      <td>
                        <strong>₹{inv.amount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>{inv.paymentMode}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            inv.status === 'APPROVED'
                              ? 'status-approved'
                              : inv.status === 'REJECTED'
                              ? 'status-rejected'
                              : inv.status === 'CANCELLED'
                              ? 'status-cancelled'
                              : 'status-pending'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <small style={{ color: '#64748b' }}>
                          {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="agent-pagination">
            <span>
              Total: <strong>{totalCount}</strong> requests | Page <strong>{page}</strong> of{' '}
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
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="agent-modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="agent-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-header">
              <h3 className="agent-modal-title">Invoice Request Details</h3>
              <button
                className="agent-modal-close-btn"
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Request Number:</span>
                  <div style={{ fontWeight: 700 }}>{selectedInvoice.requestNumber || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Invoice Number:</span>
                  <div style={{ fontWeight: 700, color: selectedInvoice.invoiceNumber ? '#0284c7' : '#64748b' }}>
                    {selectedInvoice.invoiceNumber || 'Not Yet Finalized (Pending)'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Status:</span>
                  <div>
                    <span
                      className={`status-pill ${
                        selectedInvoice.status === 'APPROVED'
                          ? 'status-approved'
                          : selectedInvoice.status === 'REJECTED'
                          ? 'status-rejected'
                          : 'status-pending'
                      }`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Amount:</span>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#166534' }}>
                    ₹{selectedInvoice.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Member ID:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.memberProfile?.memberId}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Member Name:</span>
                  <div>
                    {selectedInvoice.memberProfile?.firstName} {selectedInvoice.memberProfile?.lastName}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Package:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.package?.name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Payment Mode:</span>
                  <div>{selectedInvoice.paymentMode}</div>
                </div>
              </div>

              {selectedInvoice.approvedBy && (
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <strong>Reviewed by:</strong> {selectedInvoice.approvedBy.fullName || selectedInvoice.approvedBy.employeeId}
                </div>
              )}

              {selectedInvoice.notes && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <strong>Notes:</strong> {selectedInvoice.notes}
                </div>
              )}

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-action-secondary"
                  style={{ display: 'inline-block', color: '#0f172a' }}
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
