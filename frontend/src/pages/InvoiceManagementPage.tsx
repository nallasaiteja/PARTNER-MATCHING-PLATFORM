import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchInvoices,
  fetchPendingInvoices,
  fetchInvoiceDetail,
  raiseInvoiceRequest,
  approveInvoice,
  rejectInvoice,
  editInvoice,
  exportInvoices,
  fetchMemberInvoiceStatus,
  fetchActivePackages,
  searchMembersForInvoice,
  fetchStaffForSales,
  FilterInvoicesParams,
} from '../services/financeApi';
import { useAuth } from '../auth/AuthProvider';
import { Role } from '../constants/roles';
import './InvoiceManagementPage.css';

export const InvoiceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isHQ = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;
  const isFranchiseManager = user?.role === Role.FRANCHISE_MANAGER;
  const isApprover = isHQ || isFranchiseManager;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'raise' | 'members'>(
    'all',
  );

  // Invoices list state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Metadata / stats
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
    totalAmount: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<FilterInvoicesParams>({
    search: '',
    status: '',
    paymentMode: '',
    packageId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 15,
  });

  // Selected item & Modals
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [receiptPrintModalOpen, setReceiptPrintModalOpen] = useState(false);
  const [approveModalItem, setApproveModalItem] = useState<any | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectModalItem, setRejectModalItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editModalItem, setEditModalItem] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    paymentMode: 'ONLINE',
    bankName: '',
    transactionRef: '',
    notes: '',
    editReason: '',
  });

  // Export Date Range modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Raise Request form state
  const [packages, setPackages] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [foundMembers, setFoundMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [raiseForm, setRaiseForm] = useState({
    packageId: '',
    paymentMode: 'ONLINE',
    bankName: '',
    transactionRef: '',
    chequeDate: '',
    isCash: false,
    cashReceivedDeclaration: false,
    saleStaffId: '',
    notes: '',
  });

  // Date-wise member comparison state
  const [memberComparison, setMemberComparison] = useState<{
    totalMembers: number;
    withInvoiceCount: number;
    withoutInvoiceCount: number;
    withInvoice: any[];
    withoutInvoice: any[];
  } | null>(null);
  const [compDateRange, setCompDateRange] = useState({ startDate: '', endDate: '' });

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInvoices(filters);
      setInvoices(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 15, totalPages: 1, totalAmount: 0 });
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load Pending Requests
  const loadPending = useCallback(async () => {
    try {
      const res = await fetchPendingInvoices();
      setPendingRequests(res || []);
    } catch (err: any) {
      console.error('Error fetching pending invoices:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadInvoices();
    loadPending();
  }, [loadInvoices, loadPending]);

  // Load packages & staff when opening raise tab
  useEffect(() => {
    if (activeTab === 'raise') {
      fetchActivePackages().then(setPackages).catch(console.error);
      fetchStaffForSales().then(setStaffList).catch(console.error);
    } else if (activeTab === 'members' && isHQ) {
      fetchMemberInvoiceStatus().then(setMemberComparison).catch(console.error);
    }
  }, [activeTab, isHQ]);

  // Member search handler in raise form
  const handleSearchMembers = async () => {
    if (!memberSearchTerm.trim()) return;
    try {
      const res = await searchMembersForInvoice(memberSearchTerm.trim());
      setFoundMembers(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error searching members');
    }
  };

  // Submit Raise Invoice Request
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a member first');
      return;
    }
    if (!raiseForm.packageId) {
      alert('Please select a package');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        memberProfileId: selectedMember.id,
        packageId: raiseForm.packageId,
        paymentMode: raiseForm.paymentMode,
        bankName: raiseForm.bankName || undefined,
        transactionRef: raiseForm.transactionRef || undefined,
        chequeDate: raiseForm.chequeDate || undefined,
        isCash: raiseForm.paymentMode === 'CASH',
        cashReceivedDeclaration: raiseForm.cashReceivedDeclaration,
        saleStaffId: raiseForm.saleStaffId || undefined,
        notes: raiseForm.notes || undefined,
      };

      const res = await raiseInvoiceRequest(payload);
      setSuccessMsg(res.message || 'Invoice request submitted successfully!');
      setSelectedMember(null);
      setMemberSearchTerm('');
      setRaiseForm({
        packageId: '',
        paymentMode: 'ONLINE',
        bankName: '',
        transactionRef: '',
        chequeDate: '',
        isCash: false,
        cashReceivedDeclaration: false,
        saleStaffId: '',
        notes: '',
      });
      loadInvoices();
      loadPending();
      setActiveTab('pending');
    } catch (err: any) {
      setError(err.message || 'Failed to submit invoice request');
    } finally {
      setLoading(false);
    }
  };

  // Approve action
  const handleApproveConfirm = async () => {
    if (!approveModalItem) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approveInvoice(approveModalItem.id, approveNotes);
      setSuccessMsg(res.message || 'Invoice approved successfully!');
      setApproveModalItem(null);
      setApproveNotes('');
      loadInvoices();
      loadPending();
    } catch (err: any) {
      // Catch exact error like "Insufficient Wallet Limit"
      setError(err.message || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  // Reject action
  const handleRejectConfirm = async () => {
    if (!rejectModalItem || !rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await rejectInvoice(rejectModalItem.id, rejectReason.trim());
      setSuccessMsg(res.message || 'Invoice request rejected');
      setRejectModalItem(null);
      setRejectReason('');
      loadInvoices();
      loadPending();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  // View Details
  const handleOpenDetail = async (id: string) => {
    try {
      const res = await fetchInvoiceDetail(id);
      setSelectedInvoiceDetail(res);
      setDetailModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch invoice details');
    }
  };

  // Print Receipt View
  const handleOpenReceipt = async (id: string) => {
    try {
      const res = await fetchInvoiceDetail(id);
      setSelectedInvoiceDetail(res);
      setReceiptPrintModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch invoice for print');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (inv: any) => {
    setEditModalItem(inv);
    setEditFormData({
      amount: inv.amount,
      paymentMode: inv.paymentMode,
      bankName: inv.bankName || '',
      transactionRef: inv.transactionRef || '',
      notes: inv.notes || '',
      editReason: '',
    });
  };

  // Submit Edit Invoice
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;
    if (!editFormData.editReason.trim()) {
      alert('Edit reason is mandatory for financial audit trail.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await editInvoice(editModalItem.id, {
        amount: Number(editFormData.amount),
        paymentMode: editFormData.paymentMode,
        bankName: editFormData.bankName,
        transactionRef: editFormData.transactionRef,
        notes: editFormData.notes,
        editReason: editFormData.editReason.trim(),
      });
      setSuccessMsg(res.message || 'Invoice updated successfully');
      setEditModalItem(null);
      loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  // Export Bulk Excel / CSV
  const handleExportSubmit = async () => {
    try {
      const res = await exportInvoices({
        ...filters,
        startDate: exportRange.startDate || undefined,
        endDate: exportRange.endDate || undefined,
      });

      // Trigger browser CSV download
      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Invoices_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  // Filter date-wise comparison
  const handleFilterComparison = async () => {
    try {
      const res = await fetchMemberInvoiceStatus(compDateRange);
      setMemberComparison(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load member comparison');
    }
  };

  const selectedPkgCost = packages.find((p) => p.id === raiseForm.packageId)?.cost || 0;

  return (
    <div className="invoice-mgmt-root">
      {/* Header Panel */}
      <div className="invoice-header-panel">
        <div>
          <h2>💳 Approvals, Invoices & Financial Management</h2>
          <p>
            Process branch and franchise invoice approvals, cash receipts, package conversions, and financial audits.
          </p>
        </div>
        <div className="header-action-group">
          {isHQ && (
            <button className="btn-secondary" onClick={() => setExportModalOpen(true)}>
              📥 Export Excel (CSV)
            </button>
          )}
          <button className="btn-primary" onClick={() => setActiveTab('raise')}>
            ➕ Raise Invoice Request
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
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

      {/* Tabs Bar */}
      <div className="invoice-tabs-bar">
        <button
          className={`invoice-tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 All Invoices
        </button>
        {isApprover && (
          <button
            className={`invoice-tab-item ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="tab-badge badge-pending">{pendingRequests.length}</span>
            )}
          </button>
        )}
        <button
          className={`invoice-tab-item ${activeTab === 'raise' ? 'active' : ''}`}
          onClick={() => setActiveTab('raise')}
        >
          📝 Raise Invoice Request
        </button>
        {isHQ && (
          <button
            className={`invoice-tab-item ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            📊 Member Invoice Audit
          </button>
        )}
      </div>

      {/* TAB 1: ALL INVOICES */}
      {activeTab === 'all' && (
        <>
          {/* Filters Card */}
          <div className="invoice-filter-card">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Member ID, Inv #, Mobile..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Payment Mode</label>
                <select
                  value={filters.paymentMode}
                  onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value, page: 1 })}
                >
                  <option value="">All Modes</option>
                  <option value="ONLINE">Online</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="EMI">EMI</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                />
              </div>

              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                />
              </div>
            </div>

            <div className="filter-action-row">
              <div className="filter-stats-text">
                Showing <strong>{invoices.length}</strong> of <strong>{meta.total}</strong> records | Filtered Total: <strong>₹{meta.totalAmount.toLocaleString('en-IN')}</strong>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setFilters({ search: '', status: '', paymentMode: '', packageId: '', startDate: '', endDate: '', page: 1, limit: 15 })}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Invoice / Request #</th>
                  <th>Branch / Franchise</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Sale Staff</th>
                  <th>Date (IST)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '30px' }}>
                      ⏳ Loading financial records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No invoices found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.memberProfile?.firstName} {inv.memberProfile?.lastName}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          ID: {inv.memberProfile?.memberId || 'N/A'}
                        </div>
                      </td>
                      <td>
                        {inv.invoiceNumber ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e40af' }}>
                            {inv.invoiceNumber}
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'monospace', color: '#d97706', fontSize: '0.82rem' }}>
                            {inv.requestNumber || 'REQ-PENDING'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{inv.org?.name || 'HQ Central'}</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.org?.type || 'HQ'}</div>
                      </td>
                      <td>
                        <strong>{inv.package?.name}</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>₹{inv.amount.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>
                        <span>{inv.paymentMode}</span>
                        {inv.isCash && <span className="cash-tag">CASH</span>}
                        {inv.cashReceivedDeclaration && (
                          <div className="cash-declared-tag">Cash Received</div>
                        )}
                      </td>
                      <td>
                        <span className={`status-chip ${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {inv.approvedBy ? (
                          <span style={{ fontSize: '0.82rem' }}>
                            {inv.approvedBy.fullName || inv.approvedBy.employeeId}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          {inv.saleStaff?.fullName || inv.saleStaff?.employeeId || inv.raisedBy?.fullName || 'Direct'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenDetail(inv.id)}
                            title="View Breakdown & Audit Log"
                          >
                            👁️
                          </button>
                          {inv.status === 'APPROVED' && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleOpenReceipt(inv.id)}
                              title="Print / Download PDF"
                            >
                              🖨️
                            </button>
                          )}
                          {isHQ && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleOpenEdit(inv)}
                              title="Edit Invoice"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-pagination-bar">
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Page {meta.page} of {meta.totalPages} ({meta.total} items)
            </span>
            <div className="pagination-controls">
              <button
                className="btn-secondary"
                disabled={meta.page <= 1}
                onClick={() => setFilters({ ...filters, page: meta.page - 1 })}
              >
                ◀ Previous
              </button>
              <button
                className="btn-secondary"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setFilters({ ...filters, page: meta.page + 1 })}
              >
                Next ▶
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '14px 18px', borderRadius: '8px', fontSize: '0.88rem', color: '#854d0e' }}>
            ℹ️ <strong>Approval Workflow Instructions:</strong> Branch invoice requests require HQ Approval. Franchise invoice requests require Franchise Manager Approval, which verifies the franchise wallet balance and deducts the trusted package amount atomically.
          </div>

          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Member Name & ID</th>
                  <th>Branch / Franchise</th>
                  <th>Package & Trusted Amount</th>
                  <th>Payment Mode & Ref</th>
                  <th>Requesting Staff</th>
                  <th>Sale Staff</th>
                  <th>Request Date (IST)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      🎉 No pending invoice requests waiting for approval!
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#b45309' }}>
                          {req.requestNumber || req.id.slice(0, 8)}
                        </strong>
                      </td>
                      <td>
                        <strong>{req.memberProfile?.firstName} {req.memberProfile?.lastName}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ID: {req.memberProfile?.memberId}</div>
                      </td>
                      <td>
                        <span>{req.org?.name || 'HQ Central'}</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.org?.type || 'BRANCH'}</div>
                      </td>
                      <td>
                        <div><strong>{req.package?.name}</strong></div>
                        <div style={{ color: '#0f172a', fontWeight: 700 }}>₹{req.amount.toLocaleString('en-IN')}</div>
                      </td>
                      <td>
                        <div>{req.paymentMode}</div>
                        {req.isCash && <span className="cash-tag">Cash</span>}
                        {req.cashReceivedDeclaration && <div className="cash-declared-tag">Cash Received</div>}
                        {req.transactionRef && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: {req.transactionRef}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          {req.raisedBy?.fullName || req.raisedBy?.employeeId}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem' }}>
                          {req.saleStaff?.fullName || req.saleStaff?.employeeId || 'Direct'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {new Date(req.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-success"
                            onClick={() => {
                              setApproveModalItem(req);
                              setApproveNotes('');
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => {
                              setRejectModalItem(req);
                              setRejectReason('');
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RAISE INVOICE REQUEST FORM */}
      {activeTab === 'raise' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '26px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', color: '#0f172a' }}>
            📝 Raise New Invoice Request
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 20px' }}>
            Prices are derived automatically from the trusted database. Submitting a cash declaration registers receipt of cash and queues the request for official review.
          </p>

          <form onSubmit={handleRaiseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Member Selection */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px', color: '#1e293b' }}>
                1. Select Member
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Search by Member ID, Name, or Mobile..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                <button type="button" className="btn-secondary" onClick={handleSearchMembers}>
                  🔍 Search Member
                </button>
              </div>

              {foundMembers.length > 0 && !selectedMember && (
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
                  {foundMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span><strong>{m.firstName} {m.lastName}</strong> ({m.memberId || 'Pending ID'})</span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{m.user?.mobile}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedMember && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#065f46' }}>Selected Member:</span>{' '}
                    {selectedMember.firstName} {selectedMember.lastName} (ID: {selectedMember.memberId}) — Mobile: {selectedMember.user?.mobile}
                  </div>
                  <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.78rem' }} onClick={() => setSelectedMember(null)}>
                    Change Member
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Package & Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="filter-group">
                <label>2. Select Package</label>
                <select
                  required
                  value={raiseForm.packageId}
                  onChange={(e) => setRaiseForm({ ...raiseForm, packageId: e.target.value })}
                >
                  <option value="">-- Choose Package --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ₹{pkg.cost.toLocaleString('en-IN')} ({pkg.validityDays} Days, {pkg.contactReveals} Reveals)
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Trusted Package Amount (INR)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`₹${selectedPkgCost.toLocaleString('en-IN')}`}
                  style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Step 3: Payment Mode & Cash Declaration */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="filter-group">
                <label>3. Payment Mode</label>
                <select
                  value={raiseForm.paymentMode}
                  onChange={(e) => setRaiseForm({ ...raiseForm, paymentMode: e.target.value })}
                >
                  <option value="ONLINE">Online Payment (UPI/NetBanking)</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="UPI">UPI Direct</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="EMI">EMI</option>
                </select>
              </div>

              {raiseForm.paymentMode !== 'CASH' && (
                <>
                  <div className="filter-group">
                    <label>Bank Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC, SBI..."
                      value={raiseForm.bankName}
                      onChange={(e) => setRaiseForm({ ...raiseForm, bankName: e.target.value })}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Transaction / Cheque Reference</label>
                    <input
                      type="text"
                      placeholder="UTR # or Cheque Number"
                      value={raiseForm.transactionRef}
                      onChange={(e) => setRaiseForm({ ...raiseForm, transactionRef: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="filter-group">
                <label>Sale Facilitated By (Staff)</label>
                <select
                  value={raiseForm.saleStaffId}
                  onChange={(e) => setRaiseForm({ ...raiseForm, saleStaffId: e.target.value })}
                >
                  <option value="">-- Self / Direct --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName || st.employeeId || st.mobile} ({st.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 6.5: Cash Payment Declaration */}
            {raiseForm.paymentMode === 'CASH' && (
              <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', padding: '14px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#6b21a8' }}>
                  <input
                    type="checkbox"
                    checked={raiseForm.cashReceivedDeclaration}
                    onChange={(e) => setRaiseForm({ ...raiseForm, cashReceivedDeclaration: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  I declare that Cash has been physically received from the member.
                </label>
                <div style={{ fontSize: '0.8rem', color: '#7e22ce', marginTop: '6px' }}>
                  * Declaration records your staff ID as the receiver. Cash requests require formal authorization before member activation.
                </div>
              </div>
            )}

            <div className="filter-group">
              <label>Additional Notes / Remarks</label>
              <textarea
                rows={2}
                placeholder="Walk-in conversion, festival offer applied..."
                value={raiseForm.notes}
                onChange={(e) => setRaiseForm({ ...raiseForm, notes: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '12px 20px', fontSize: '1rem', alignSelf: 'flex-start' }}>
              Submit Invoice Request for Approval 🚀
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: DATE-WISE MEMBER INVOICE AUDIT */}
      {activeTab === 'members' && isHQ && memberComparison && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="invoice-filter-card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="filter-group">
                <label>Registered Start Date</label>
                <input
                  type="date"
                  value={compDateRange.startDate}
                  onChange={(e) => setCompDateRange({ ...compDateRange, startDate: e.target.value })}
                />
              </div>
              <div className="filter-group">
                <label>Registered End Date</label>
                <input
                  type="date"
                  value={compDateRange.endDate}
                  onChange={(e) => setCompDateRange({ ...compDateRange, endDate: e.target.value })}
                />
              </div>
              <button className="btn-primary" style={{ alignSelf: 'flex-end' }} onClick={handleFilterComparison}>
                Filter Comparison
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 6px', color: '#166534' }}>✅ Members With Finalized Invoices ({memberComparison.withInvoiceCount})</h4>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {memberComparison.withInvoice.map((m) => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #dcfce7', fontSize: '0.85rem' }}>
                    <strong>{m.firstName} {m.lastName}</strong> (ID: {m.memberId}) — Invoices: {m.invoices.length}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '18px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 6px', color: '#9f1239' }}>⏳ Members Without Invoices ({memberComparison.withoutInvoiceCount})</h4>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {memberComparison.withoutInvoice.map((m) => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #ffe4e6', fontSize: '0.85rem' }}>
                    <strong>{m.firstName} {m.lastName}</strong> (ID: {m.memberId || 'Draft'}) — Phone: {m.user?.mobile}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW INVOICE DETAIL & AUDIT LOG */}
      {detailModalOpen && selectedInvoiceDetail && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Invoice & Request Details</h3>
              <button className="modal-close-btn" onClick={() => setDetailModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
                <div><strong>Invoice #:</strong> {selectedInvoiceDetail.invoice.invoiceNumber || 'PENDING'}</div>
                <div><strong>Request #:</strong> {selectedInvoiceDetail.invoice.requestNumber || 'N/A'}</div>
                <div><strong>Member:</strong> {selectedInvoiceDetail.invoice.memberProfile?.firstName} {selectedInvoiceDetail.invoice.memberProfile?.lastName} ({selectedInvoiceDetail.invoice.memberProfile?.memberId})</div>
                <div><strong>Package:</strong> {selectedInvoiceDetail.invoice.package?.name}</div>
                <div><strong>Amount:</strong> ₹{selectedInvoiceDetail.invoice.amount.toLocaleString('en-IN')}</div>
                <div><strong>Payment Mode:</strong> {selectedInvoiceDetail.invoice.paymentMode}</div>
                <div><strong>Branch / Franchise:</strong> {selectedInvoiceDetail.invoice.org?.name || 'HQ Central'}</div>
                <div><strong>Status:</strong> {selectedInvoiceDetail.invoice.status}</div>
                <div><strong>Request Date:</strong> {new Date(selectedInvoiceDetail.invoice.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                <div><strong>Invoice Date:</strong> {selectedInvoiceDetail.invoice.invoiceDate ? new Date(selectedInvoiceDetail.invoice.invoiceDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Pending Approval'}</div>
              </div>

              {selectedInvoiceDetail.invoice.rejectionReason && (
                <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
                  <strong>Rejection Reason:</strong> {selectedInvoiceDetail.invoice.rejectionReason}
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
              <h4 style={{ margin: '0 0 10px', color: '#0f172a' }}>Financial Audit Trail</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.82rem' }}>
                {selectedInvoiceDetail.auditTrail?.map((log: any) => (
                  <div key={log.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>{log.action}</span> by{' '}
                    <strong>{log.actor?.fullName || log.actor?.employeeId}</strong> ({log.actorRole}) on{' '}
                    {new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    {log.reason && <div style={{ color: '#64748b' }}>Reason: {log.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE INVOICE RECEIPT VIEW */}
      {receiptPrintModalOpen && selectedInvoiceDetail && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Official Tax Invoice / Receipt</h3>
              <button className="modal-close-btn" onClick={() => setReceiptPrintModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="invoice-receipt-paper" id="printable-receipt">
                <div className="receipt-header">
                  <div>
                    <h1>Partner Matching Platform</h1>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Telugu Matrimony & Global Community Matchmaking HQ
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e40af' }}>
                      {selectedInvoiceDetail.invoice.invoiceNumber}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Date: {new Date(selectedInvoiceDetail.invoice.invoiceDate || selectedInvoiceDetail.invoice.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </div>
                  </div>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-box">
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#1e3a8a' }}>BILLED TO:</strong>
                    <div>{selectedInvoiceDetail.invoice.memberProfile?.firstName} {selectedInvoiceDetail.invoice.memberProfile?.lastName}</div>
                    <div>Member ID: {selectedInvoiceDetail.invoice.memberProfile?.memberId}</div>
                    <div>Mobile: {selectedInvoiceDetail.invoice.memberProfile?.user?.mobile}</div>
                  </div>
                  <div className="receipt-box">
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#1e3a8a' }}>ISSUED BY:</strong>
                    <div>{selectedInvoiceDetail.invoice.org?.name || 'Headquarters'}</div>
                    <div>Mode: {selectedInvoiceDetail.invoice.paymentMode}</div>
                    <div>Approved By: {selectedInvoiceDetail.invoice.approvedBy?.fullName || 'Authorized Signatory'}</div>
                  </div>
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Validity</th>
                      <th>Reveals</th>
                      <th>Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{selectedInvoiceDetail.invoice.package?.name} Package</strong> Entitlement</td>
                      <td>{selectedInvoiceDetail.invoice.package?.validityDays} Days</td>
                      <td>{selectedInvoiceDetail.invoice.package?.contactReveals} Contacts</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{selectedInvoiceDetail.invoice.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <div className="receipt-stamp">PAID & ACTIVATED</div>
                  <div style={{ textAlign: 'right', fontSize: '1.2rem', fontWeight: 800 }}>
                    Total: ₹{selectedInvoiceDetail.invoice.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => window.print()}>
                🖨️ Print Receipt
              </button>
              <button className="btn-secondary" onClick={() => setReceiptPrintModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APPROVE CONFIRMATION */}
      {approveModalItem && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Confirm Invoice Approval</h3>
              <button className="modal-close-btn" onClick={() => setApproveModalItem(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to approve invoice request <strong>{approveModalItem.requestNumber}</strong> for{' '}
                <strong>{approveModalItem.memberProfile?.firstName} {approveModalItem.memberProfile?.lastName}</strong>?
              </p>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '0.88rem' }}>
                <div>Package: <strong>{approveModalItem.package?.name}</strong></div>
                <div>Amount: <strong>₹{approveModalItem.amount.toLocaleString('en-IN')}</strong></div>
                <div>Branch / Franchise: <strong>{approveModalItem.org?.name || 'HQ Central'}</strong></div>
              </div>

              <div className="filter-group">
                <label>Approval Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Verified payment via bank / wallet..."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setApproveModalItem(null)}>Cancel</button>
              <button className="btn-success" onClick={handleApproveConfirm}>Confirm & Activate Package</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REJECT CONFIRMATION */}
      {rejectModalItem && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Reject Invoice Request</h3>
              <button className="modal-close-btn" onClick={() => setRejectModalItem(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Rejecting request <strong>{rejectModalItem.requestNumber}</strong> will record the decision and notify the requesting staff.
              </p>
              <div className="filter-group">
                <label>Mandatory Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Payment not received in branch account / invalid transaction..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRejectModalItem(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleRejectConfirm}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT INVOICE (SUPER ADMIN & ADMIN ONLY) */}
      {editModalItem && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Edit Invoice (Admin Only)</h3>
              <button className="modal-close-btn" onClick={() => setEditModalItem(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="filter-group">
                  <label>Amount (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                  />
                </div>

                <div className="filter-group">
                  <label>Payment Mode</label>
                  <select
                    value={editFormData.paymentMode}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentMode: e.target.value })}
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    value={editFormData.bankName}
                    onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                  />
                </div>

                <div className="filter-group">
                  <label>Transaction / Cheque Reference</label>
                  <input
                    type="text"
                    value={editFormData.transactionRef}
                    onChange={(e) => setEditFormData({ ...editFormData, transactionRef: e.target.value })}
                  />
                </div>

                <div className="filter-group">
                  <label>Mandatory Audit Reason for Edit *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Customer bank adjustment / Cheque clearance update..."
                    value={editFormData.editReason}
                    onChange={(e) => setEditFormData({ ...editFormData, editReason: e.target.value })}
                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditModalItem(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes & Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: BULK EXCEL EXPORT DATE RANGE */}
      {exportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Bulk Export Invoices</h3>
              <button className="modal-close-btn" onClick={() => setExportModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                Select an optional date range to download filtered financial invoice records in CSV / Excel format.
              </p>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={exportRange.startDate}
                  onChange={(e) => setExportRange({ ...exportRange, startDate: e.target.value })}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={exportRange.endDate}
                  onChange={(e) => setExportRange({ ...exportRange, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setExportModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleExportSubmit}>📥 Download CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
