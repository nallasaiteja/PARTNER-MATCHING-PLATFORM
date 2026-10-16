import React, { useEffect, useState } from 'react';
import {
  fetchOrganizations,
  fetchUnverifiedIdProofs,
  fetchProfilesWithoutPhotos,
  fetchProfilesBelow30,
  fetchIncompleteProfileSummary,
  fetchBranchRevenueReport,
  fetchAgentRevenueReport,
  fetchFranchiseRevenueReport,
  fetchInvoiceApprovalReport,
  fetchFeaturedProfileRevenueReport,
  fetchAdvertisementRevenueReport,
  fetchWeddingServicesRevenueReport,
  fetchStaffProfileVisits,
  fetchStaffProfilesCreated,
  fetchStaffProfilesEdited,
  fetchStaffProfilesBlocked,
  fetchStaffPaymentsProcessed,
  fetchStaffCurrencyCollected,
  fetchStaffMessagesReceived,
  fetchStaffTicketsResolved,
  downloadMemberData,
  fetchMemberBiodata,
  fetchPhotosDownloadList,
} from '../services/reportsApi';
import './ReportsAnalyticsPage.css';

type MainTab = 'MEMBER_DATA' | 'SALES_REVENUE' | 'STAFF_ACTIVITY' | 'MEMBER_DOWNLOADS';

type MemberDataSubTab = 'INCOMPLETE_SUMMARY' | 'UNVERIFIED_IDS' | 'NO_PHOTOS' | 'BELOW_30';
type SalesSubTab =
  | 'BRANCH_REVENUE'
  | 'AGENT_REVENUE'
  | 'FRANCHISE_REVENUE'
  | 'INVOICE_APPROVALS'
  | 'FEATURED_PROFILES'
  | 'ADVERTISEMENTS'
  | 'WEDDING_SERVICES';
type StaffSubTab =
  | 'VISITS'
  | 'CREATED'
  | 'EDITED'
  | 'BLOCKED'
  | 'PAYMENTS'
  | 'CASH'
  | 'MESSAGES'
  | 'TICKETS';

export const ReportsAnalyticsPage: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>('MEMBER_DATA');
  const [memberSubTab, setMemberSubTab] = useState<MemberDataSubTab>('INCOMPLETE_SUMMARY');
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('BRANCH_REVENUE');
  const [staffSubTab, setStaffSubTab] = useState<StaffSubTab>('VISITS');

  // Common Filters
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'overall'>('overall');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Member Download Filter
  const [idRangeStart, setIdRangeStart] = useState<string>('');
  const [idRangeEnd, setIdRangeEnd] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<'ALL' | 'FREE' | 'PAID' | 'BLOCKED'>('ALL');

  // Data States
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // Biodata Modal State
  const [biodataModal, setBiodataModal] = useState<any | null>(null);
  const [biodataInputId, setBiodataInputId] = useState<string>('');
  const [loadingBiodata, setLoadingBiodata] = useState<boolean>(false);

  // Photos List Modal State
  const [photosListModal, setPhotosListModal] = useState<any | null>(null);

  // Load organizations for branch filter
  useEffect(() => {
    fetchOrganizations()
      .then((orgs: any[]) => setBranches(orgs || []))
      .catch(() => {});
  }, []);

  // Fetch report when active tab or filters change
  useEffect(() => {
    loadReport();
  }, [
    activeTab,
    memberSubTab,
    salesSubTab,
    staffSubTab,
    selectedBranch,
    startDate,
    endDate,
    period,
  ]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any = null;

      // 1. MEMBER DATA REPORTS
      if (activeTab === 'MEMBER_DATA') {
        if (memberSubTab === 'INCOMPLETE_SUMMARY') {
          data = await fetchIncompleteProfileSummary({
            branchId: selectedBranch,
            search: searchTerm,
            limit: 50,
          });
        } else if (memberSubTab === 'UNVERIFIED_IDS') {
          data = await fetchUnverifiedIdProofs({ branchId: selectedBranch, search: searchTerm });
        } else if (memberSubTab === 'NO_PHOTOS') {
          data = await fetchProfilesWithoutPhotos({ branchId: selectedBranch, search: searchTerm });
        } else if (memberSubTab === 'BELOW_30') {
          data = await fetchProfilesBelow30({ branchId: selectedBranch, search: searchTerm });
        }
      }

      // 2. SALES AND REVENUE REPORTS
      else if (activeTab === 'SALES_REVENUE') {
        if (salesSubTab === 'BRANCH_REVENUE') {
          data = await fetchBranchRevenueReport({
            branchId: selectedBranch,
            startDate,
            endDate,
            period,
          });
        } else if (salesSubTab === 'AGENT_REVENUE') {
          data = await fetchAgentRevenueReport({
            branchId: selectedBranch,
            startDate,
            endDate,
            period,
          });
        } else if (salesSubTab === 'FRANCHISE_REVENUE') {
          data = await fetchFranchiseRevenueReport({
            franchiseId: selectedBranch,
            startDate,
            endDate,
          });
        } else if (salesSubTab === 'INVOICE_APPROVALS') {
          data = await fetchInvoiceApprovalReport({
            branchId: selectedBranch,
            startDate,
            endDate,
          });
        } else if (salesSubTab === 'FEATURED_PROFILES') {
          data = await fetchFeaturedProfileRevenueReport({ startDate, endDate });
        } else if (salesSubTab === 'ADVERTISEMENTS') {
          data = await fetchAdvertisementRevenueReport({ startDate, endDate });
        } else if (salesSubTab === 'WEDDING_SERVICES') {
          data = await fetchWeddingServicesRevenueReport({ startDate, endDate });
        }
      }

      // 3. STAFF ACTIVITY REPORTS
      else if (activeTab === 'STAFF_ACTIVITY') {
        if (staffSubTab === 'VISITS') {
          data = await fetchStaffProfileVisits({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'CREATED') {
          data = await fetchStaffProfilesCreated({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'EDITED') {
          data = await fetchStaffProfilesEdited({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'BLOCKED') {
          data = await fetchStaffProfilesBlocked({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'PAYMENTS') {
          data = await fetchStaffPaymentsProcessed({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'CASH') {
          data = await fetchStaffCurrencyCollected({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'MESSAGES') {
          data = await fetchStaffMessagesReceived({ branchId: selectedBranch, startDate, endDate });
        } else if (staffSubTab === 'TICKETS') {
          data = await fetchStaffTicketsResolved({ branchId: selectedBranch, startDate, endDate });
        }
      }

      // 4. MEMBER DATA DOWNLOADS
      else if (activeTab === 'MEMBER_DOWNLOADS') {
        data = await downloadMemberData({
          idRangeStart,
          idRangeEnd,
          startDate,
          endDate,
          status: downloadStatus,
          branchId: selectedBranch,
        });
      }

      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper to trigger browser CSV download
  const handleDownloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current table to CSV
  const handleExportCurrentTable = () => {
    if (!reportData) return;

    if (reportData.csvContent) {
      handleDownloadCsv(`${activeTab}_${Date.now()}.csv`, reportData.csvContent);
      return;
    }

    // Fallback CSV builder for arbitrary record arrays
    let items = reportData.records || reportData.staff || reportData.branches || reportData.agents || reportData.invoices || [];
    if (!items || items.length === 0) {
      alert('No records available to export.');
      return;
    }

    const keys = Object.keys(items[0]).filter((k) => typeof items[0][k] !== 'object');
    const headerRow = keys.join(',');
    const rows = items.map((row: any) =>
      keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    const csv = [headerRow, ...rows].join('\n');
    handleDownloadCsv(`${activeTab}_report_${Date.now()}.csv`, csv);
  };

  // Fetch individual biodata
  const handleFetchBiodata = async (id: string) => {
    if (!id.trim()) {
      alert('Please enter a Member ID');
      return;
    }
    setLoadingBiodata(true);
    try {
      const res = await fetchMemberBiodata(id.trim());
      setBiodataModal(res);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch member biodata');
    } finally {
      setLoadingBiodata(false);
    }
  };

  // Fetch Photos list
  const handleFetchPhotosList = async (type: 'MEMBERS' | 'STAFF') => {
    try {
      const res = await fetchPhotosDownloadList({ type, branchId: selectedBranch });
      setPhotosListModal(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load photo list');
    }
  };

  return (
    <div className="reports-mgmt-root">
      {/* Header Panel */}
      <div className="reports-header-panel">
        <div>
          <h2>📊 Reports & Analytics</h2>
          <p>Super Admin & Admin operational intelligence, financial flows, member health & staff metrics</p>
        </div>
        <div className="header-action-group">
          <button onClick={handleExportCurrentTable} className="btn-secondary-report">
            📥 Export Excel (CSV)
          </button>
          <button onClick={() => window.print()} className="btn-primary-report">
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main 4 Module Tabs */}
      <div className="reports-nav-tabs">
        <button
          onClick={() => setActiveTab('MEMBER_DATA')}
          className={`reports-tab-btn ${activeTab === 'MEMBER_DATA' ? 'active' : ''}`}
        >
          📋 Member Data Reports
        </button>
        <button
          onClick={() => setActiveTab('SALES_REVENUE')}
          className={`reports-tab-btn ${activeTab === 'SALES_REVENUE' ? 'active' : ''}`}
        >
          📈 Sales & Revenue Reports
        </button>
        <button
          onClick={() => setActiveTab('STAFF_ACTIVITY')}
          className={`reports-tab-btn ${activeTab === 'STAFF_ACTIVITY' ? 'active' : ''}`}
        >
          👥 Staff Activity Reports
        </button>
        <button
          onClick={() => setActiveTab('MEMBER_DOWNLOADS')}
          className={`reports-tab-btn ${activeTab === 'MEMBER_DOWNLOADS' ? 'active' : ''}`}
        >
          💾 Member Data Downloads
        </button>
      </div>

      {/* Sub-pills for TAB 1: MEMBER DATA */}
      {activeTab === 'MEMBER_DATA' && (
        <div className="sub-report-pills">
          <button
            onClick={() => setMemberSubTab('INCOMPLETE_SUMMARY')}
            className={`sub-pill-btn ${memberSubTab === 'INCOMPLETE_SUMMARY' ? 'active' : ''}`}
          >
            📑 Incomplete Profile Summary
          </button>
          <button
            onClick={() => setMemberSubTab('UNVERIFIED_IDS')}
            className={`sub-pill-btn ${memberSubTab === 'UNVERIFIED_IDS' ? 'active' : ''}`}
          >
            ⚠️ Unverified ID Proofs
          </button>
          <button
            onClick={() => setMemberSubTab('NO_PHOTOS')}
            className={`sub-pill-btn ${memberSubTab === 'NO_PHOTOS' ? 'active' : ''}`}
          >
            📷 Profiles Without Photos
          </button>
          <button
            onClick={() => setMemberSubTab('BELOW_30')}
            className={`sub-pill-btn ${memberSubTab === 'BELOW_30' ? 'active' : ''}`}
          >
            📉 Below 30% Completion
          </button>
        </div>
      )}

      {/* Sub-pills for TAB 2: SALES & REVENUE */}
      {activeTab === 'SALES_REVENUE' && (
        <div className="sub-report-pills">
          <button
            onClick={() => setSalesSubTab('BRANCH_REVENUE')}
            className={`sub-pill-btn ${salesSubTab === 'BRANCH_REVENUE' ? 'active' : ''}`}
          >
            🏢 Branch Revenue
          </button>
          <button
            onClick={() => setSalesSubTab('AGENT_REVENUE')}
            className={`sub-pill-btn ${salesSubTab === 'AGENT_REVENUE' ? 'active' : ''}`}
          >
            👤 Agent Revenue
          </button>
          <button
            onClick={() => setSalesSubTab('FRANCHISE_REVENUE')}
            className={`sub-pill-btn ${salesSubTab === 'FRANCHISE_REVENUE' ? 'active' : ''}`}
          >
            🏬 Franchise Revenue & Wallets
          </button>
          <button
            onClick={() => setSalesSubTab('INVOICE_APPROVALS')}
            className={`sub-pill-btn ${salesSubTab === 'INVOICE_APPROVALS' ? 'active' : ''}`}
          >
            🧾 Invoice Approvals
          </button>
          <button
            onClick={() => setSalesSubTab('FEATURED_PROFILES')}
            className={`sub-pill-btn ${salesSubTab === 'FEATURED_PROFILES' ? 'active' : ''}`}
          >
            ⭐ Featured Profiles
          </button>
          <button
            onClick={() => setSalesSubTab('ADVERTISEMENTS')}
            className={`sub-pill-btn ${salesSubTab === 'ADVERTISEMENTS' ? 'active' : ''}`}
          >
            📢 Advertisements
          </button>
          <button
            onClick={() => setSalesSubTab('WEDDING_SERVICES')}
            className={`sub-pill-btn ${salesSubTab === 'WEDDING_SERVICES' ? 'active' : ''}`}
          >
            💍 Wedding Services
          </button>
        </div>
      )}

      {/* Sub-pills for TAB 3: STAFF ACTIVITY */}
      {activeTab === 'STAFF_ACTIVITY' && (
        <div className="sub-report-pills">
          <button
            onClick={() => setStaffSubTab('VISITS')}
            className={`sub-pill-btn ${staffSubTab === 'VISITS' ? 'active' : ''}`}
          >
            👁️ Profile Visits
          </button>
          <button
            onClick={() => setStaffSubTab('CREATED')}
            className={`sub-pill-btn ${staffSubTab === 'CREATED' ? 'active' : ''}`}
          >
            ✍️ Profiles Created
          </button>
          <button
            onClick={() => setStaffSubTab('EDITED')}
            className={`sub-pill-btn ${staffSubTab === 'EDITED' ? 'active' : ''}`}
          >
            ✏️ Profiles Edited
          </button>
          <button
            onClick={() => setStaffSubTab('BLOCKED')}
            className={`sub-pill-btn ${staffSubTab === 'BLOCKED' ? 'active' : ''}`}
          >
            🚫 Profiles Blocked
          </button>
          <button
            onClick={() => setStaffSubTab('PAYMENTS')}
            className={`sub-pill-btn ${staffSubTab === 'PAYMENTS' ? 'active' : ''}`}
          >
            💳 Payments Processed
          </button>
          <button
            onClick={() => setStaffSubTab('CASH')}
            className={`sub-pill-btn ${staffSubTab === 'CASH' ? 'active' : ''}`}
          >
            💵 Cash Collected
          </button>
          <button
            onClick={() => setStaffSubTab('MESSAGES')}
            className={`sub-pill-btn ${staffSubTab === 'MESSAGES' ? 'active' : ''}`}
          >
            💬 Messages Received
          </button>
          <button
            onClick={() => setStaffSubTab('TICKETS')}
            className={`sub-pill-btn ${staffSubTab === 'TICKETS' ? 'active' : ''}`}
          >
            🎫 Tickets Resolved
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar-card">
        {activeTab === 'MEMBER_DATA' && (
          <div className="filter-item">
            <label>Search Member</label>
            <input
              type="text"
              placeholder="Name or Member ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReport()}
            />
          </div>
        )}

        <div className="filter-item">
          <label>Filter by Branch / Org</label>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">All Branches & Franchises</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.type})
              </option>
            ))}
          </select>
        </div>

        {activeTab !== 'MEMBER_DATA' && (
          <>
            <div className="filter-item">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="filter-item">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="filter-item">
              <label>Aggregation Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as any)}>
                <option value="overall">Overall Total</option>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </>
        )}

        {/* Member Download Specific Filters */}
        {activeTab === 'MEMBER_DOWNLOADS' && (
          <>
            <div className="filter-item">
              <label>ID Range Start</label>
              <input
                type="text"
                placeholder="e.g. M20260001"
                value={idRangeStart}
                onChange={(e) => setIdRangeStart(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>ID Range End</label>
              <input
                type="text"
                placeholder="e.g. M20261000"
                value={idRangeEnd}
                onChange={(e) => setIdRangeEnd(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>Member Status</label>
              <select
                value={downloadStatus}
                onChange={(e) => setDownloadStatus(e.target.value as any)}
              >
                <option value="ALL">All Statuses</option>
                <option value="FREE">Free Members Only</option>
                <option value="PAID">Paid Members Only</option>
                <option value="BLOCKED">Blocked Members Only</option>
              </select>
            </div>
          </>
        )}

        <button onClick={loadReport} className="btn-primary-report" style={{ height: '38px' }}>
          🔍 Apply Filters
        </button>
      </div>

      {/* KPI Overview Cards */}
      {reportData?.kpi && (
        <div className="kpi-report-grid">
          <div className="kpi-report-card">
            <span className="kpi-report-label">Total Profiles Evaluated</span>
            <span className="kpi-report-val">{reportData.kpi.totalMembers}</span>
            <span className="kpi-report-sub">Across designated branches</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label" style={{ color: '#dc2626' }}>
              Below 30% Completion
            </span>
            <span className="kpi-report-val" style={{ color: '#dc2626' }}>
              {reportData.kpi.below30Count}
            </span>
            <span className="kpi-report-sub">Action required by branch staff</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label" style={{ color: '#ea580c' }}>
              Missing Profile Photos
            </span>
            <span className="kpi-report-val" style={{ color: '#ea580c' }}>
              {reportData.kpi.missingPhotosCount}
            </span>
            <span className="kpi-report-sub">Awaiting photo upload</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label" style={{ color: '#d97706' }}>
              Unverified / Missing IDs
            </span>
            <span className="kpi-report-val" style={{ color: '#d97706' }}>
              {reportData.kpi.missingIdProofsCount}
            </span>
            <span className="kpi-report-sub">Pending document verification</span>
          </div>
        </div>
      )}

      {/* Revenue Totals KPI Cards */}
      {reportData?.totals && (
        <div className="kpi-report-grid">
          <div className="kpi-report-card">
            <span className="kpi-report-label">Total Sales Revenue</span>
            <span className="kpi-report-val" style={{ color: '#16a34a' }}>
              ₹{reportData.totals.totalRevenue?.toLocaleString('en-IN') || 0}
            </span>
            <span className="kpi-report-sub">Approved invoice revenue</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label">Invoices Approved</span>
            <span className="kpi-report-val">{reportData.totals.profilesApproved || 0}</span>
            <span className="kpi-report-sub">Finalized sales transactions</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label">Paid Profiles</span>
            <span className="kpi-report-val">{reportData.totals.profilesPaid || 0}</span>
            <span className="kpi-report-sub">Active membership packages</span>
          </div>
          <div className="kpi-report-card">
            <span className="kpi-report-label">Profiles Created</span>
            <span className="kpi-report-val">{reportData.totals.profilesCreated || 0}</span>
            <span className="kpi-report-sub">During selected period</span>
          </div>
        </div>
      )}

      {/* Extra Action Cards for Member Downloads Tab */}
      {activeTab === 'MEMBER_DOWNLOADS' && (
        <div className="kpi-report-grid" style={{ marginBottom: '10px' }}>
          {/* Individual Biodata Download Card */}
          <div className="kpi-report-card" style={{ gap: '10px' }}>
            <span className="kpi-report-label">📄 Individual Member Biodata</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Download official matrimonial biodata in Excel (CSV) or PDF format:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter Member ID (e.g. M2026001)"
                value={biodataInputId}
                onChange={(e) => setBiodataInputId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
              <button
                onClick={() => handleFetchBiodata(biodataInputId)}
                disabled={loadingBiodata}
                className="btn-primary-report"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {loadingBiodata ? 'Loading...' : 'Preview Biodata'}
              </button>
            </div>
          </div>

          {/* Photo Batch Download Card */}
          <div className="kpi-report-card" style={{ gap: '10px' }}>
            <span className="kpi-report-label">📷 Staff & Member Photos Download</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Download authorized photo files named with Staff ID or Member ID for external backup:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleFetchPhotosList('MEMBERS')}
                className="btn-secondary-report"
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
              >
                👤 Member Photos List
              </button>
              <button
                onClick={() => handleFetchPhotosList('STAFF')}
                className="btn-secondary-report"
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
              >
                🪪 Staff ID Proofs List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="reports-table-card">
        <div className="reports-table-header">
          <h3>{reportData?.title || 'Report Results'}</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {reportData?.totalCount !== undefined
              ? `${reportData.totalCount} records found`
              : reportData?.pagination?.totalRecords !== undefined
              ? `${reportData.pagination.totalRecords} members evaluated`
              : ''}
          </span>
        </div>

        {loading ? (
          <div className="reports-empty-state">
            <span>⏳</span>
            <p>Generating report from database records...</p>
          </div>
        ) : error ? (
          <div className="reports-empty-state" style={{ color: '#dc2626' }}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : (
          <div className="reports-table-container">
            {/* 1. MEMBER DATA: INCOMPLETE SUMMARY */}
            {activeTab === 'MEMBER_DATA' && memberSubTab === 'INCOMPLETE_SUMMARY' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Gender</th>
                    <th>Package</th>
                    <th>Photo Uploaded</th>
                    <th>ID Proof Uploaded</th>
                    <th>Completion %</th>
                    <th>Branch</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((m: any) => (
                    <tr key={m.profileId}>
                      <td>
                        <strong>{m.memberId}</strong>
                      </td>
                      <td>{m.memberName}</td>
                      <td>{m.gender}</td>
                      <td>
                        <span className={m.packageType === 'PAID' ? 'badge-paid' : 'badge-free'}>
                          {m.packageType}
                        </span>
                      </td>
                      <td>
                        <span
                          className={m.photoUploaded === 'Yes' ? 'badge-success' : 'badge-danger'}
                        >
                          {m.photoUploaded}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            m.idProofUploaded === 'Yes' ? 'badge-success' : 'badge-danger'
                          }
                        >
                          {m.idProofUploaded}
                        </span>
                      </td>
                      <td>
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${m.completionPercentage}%`,
                              background:
                                m.completionPercentage < 30
                                  ? '#ef4444'
                                  : m.completionPercentage < 70
                                  ? '#f59e0b'
                                  : '#10b981',
                            }}
                          />
                        </div>
                        <strong>{m.completionPercentage}%</strong>
                      </td>
                      <td>{m.branchName}</td>
                      <td>
                        <a
                          href={`/profiles/${m.profileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-action"
                        >
                          View Profile ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. MEMBER DATA: UNVERIFIED ID PROOFS */}
            {activeTab === 'MEMBER_DATA' && memberSubTab === 'UNVERIFIED_IDS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Free / Paid</th>
                    <th>Gender</th>
                    <th>ID Document Type</th>
                    <th>Uploaded Date & Time</th>
                    <th>Uploaded By</th>
                    <th>Branch</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((m: any) => (
                    <tr key={m.profileId}>
                      <td>
                        <strong>{m.memberId}</strong>
                      </td>
                      <td>{m.fullName}</td>
                      <td>
                        <span className={m.packageType === 'PAID' ? 'badge-paid' : 'badge-free'}>
                          {m.packageType}
                        </span>
                      </td>
                      <td>{m.gender}</td>
                      <td>
                        <span className="badge-warning">{m.idProofType}</span>
                      </td>
                      <td>{new Date(m.uploadedAt).toLocaleString('en-IN')}</td>
                      <td>{m.uploadedBy}</td>
                      <td>{m.branchName}</td>
                      <td>
                        <a
                          href={`/profiles/${m.profileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-action"
                        >
                          Review & Verify ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. MEMBER DATA: PROFILES WITHOUT PHOTOS */}
            {activeTab === 'MEMBER_DATA' && memberSubTab === 'NO_PHOTOS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Free / Paid</th>
                    <th>Gender</th>
                    <th>Branch</th>
                    <th>Registered Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((m: any) => (
                    <tr key={m.profileId}>
                      <td>
                        <strong>{m.memberId}</strong>
                      </td>
                      <td>{m.fullName}</td>
                      <td>
                        <span className={m.packageType === 'PAID' ? 'badge-paid' : 'badge-free'}>
                          {m.packageType}
                        </span>
                      </td>
                      <td>{m.gender}</td>
                      <td>{m.branchName}</td>
                      <td>{new Date(m.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <a
                          href={`/profiles/${m.profileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-action"
                        >
                          Open Profile ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. MEMBER DATA: PROFILES BELOW 30% */}
            {activeTab === 'MEMBER_DATA' && memberSubTab === 'BELOW_30' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Free / Paid</th>
                    <th>Gender</th>
                    <th>Completion %</th>
                    <th>Missing Fields Count</th>
                    <th>Branch</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((m: any) => (
                    <tr key={m.profileId}>
                      <td>
                        <strong>{m.memberId}</strong>
                      </td>
                      <td>{m.fullName}</td>
                      <td>
                        <span className={m.packageType === 'PAID' ? 'badge-paid' : 'badge-free'}>
                          {m.packageType}
                        </span>
                      </td>
                      <td>{m.gender}</td>
                      <td>
                        <span className="badge-danger">{m.completionPercentage}%</span>
                      </td>
                      <td>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                          {m.missingFieldsCount} fields missing
                        </span>
                      </td>
                      <td>{m.branchName}</td>
                      <td>
                        <a
                          href={`/profiles/${m.profileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-action"
                        >
                          Help Member Complete ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. SALES: BRANCH REVENUE */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'BRANCH_REVENUE' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Profiles Created</th>
                    <th>Profiles Paid</th>
                    <th>Profiles Blocked</th>
                    <th>Terminated</th>
                    <th>Renewed</th>
                    <th>Invoices Approved</th>
                    <th>Total Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.branches || []).map((b: any) => (
                    <tr key={b.branchId}>
                      <td>
                        <strong>{b.branchName}</strong>
                      </td>
                      <td>{b.profilesCreated}</td>
                      <td>
                        <span className="badge-paid">{b.profilesPaid}</span>
                      </td>
                      <td>{b.profilesBlocked}</td>
                      <td>{b.profilesTerminated}</td>
                      <td>{b.profilesRenewed}</td>
                      <td>{b.profilesApproved}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{b.totalRevenue?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. SALES: AGENT REVENUE */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'AGENT_REVENUE' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Employee ID</th>
                    <th>Organization</th>
                    <th>Profiles Created</th>
                    <th>Profiles Paid</th>
                    <th>Approved Sales</th>
                    <th>Total Revenue</th>
                    <th>Commission Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.agents || []).map((a: any) => (
                    <tr key={a.agentId}>
                      <td>
                        <strong>{a.agentName}</strong>
                      </td>
                      <td>{a.employeeId}</td>
                      <td>{a.organizationName}</td>
                      <td>{a.profilesCreated}</td>
                      <td>{a.profilesPaid}</td>
                      <td>{a.profilesApproved}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{a.totalRevenue?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className="badge-success">
                          ₹{a.totalCommission?.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 7. SALES: FRANCHISE REVENUE */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'FRANCHISE_REVENUE' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Franchise Name</th>
                    <th>Wallet Balance</th>
                    <th>Credit Limit</th>
                    <th>Approved Sales Count</th>
                    <th>Total Sales Revenue</th>
                    <th>Total Wallet Deductions</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.franchises || []).map((f: any) => (
                    <tr key={f.franchiseId}>
                      <td>
                        <strong>{f.franchiseName}</strong>
                      </td>
                      <td>
                        <strong style={{ color: f.currentWalletBalance < 1000 ? '#dc2626' : '#16a34a' }}>
                          ₹{f.currentWalletBalance?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>₹{f.creditLimit?.toLocaleString('en-IN')}</td>
                      <td>{f.approvedSalesCount}</td>
                      <td>₹{f.totalSalesRevenue?.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          -₹{f.totalWalletDeductions?.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 8. SALES: INVOICE APPROVALS */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'INVOICE_APPROVALS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Branch / Franchise</th>
                    <th>Package</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Approved Date</th>
                    <th>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.invoices || []).map((inv: any) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.invoiceNumber}</strong>
                      </td>
                      <td>{inv.memberId}</td>
                      <td>{inv.memberName}</td>
                      <td>{inv.organization}</td>
                      <td>{inv.packageName}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{inv.amount?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className="badge-free">{inv.paymentMode}</span>
                      </td>
                      <td>{new Date(inv.approvedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        {inv.approvedBy} ({inv.approverRole})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 9. SALES: FEATURED PROFILES */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'FEATURED_PROFILES' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Member Name</th>
                    <th>Branch</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Placement Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.memberId}</strong>
                      </td>
                      <td>{r.memberName}</td>
                      <td>{r.branchName}</td>
                      <td>{new Date(r.startDate).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(r.endDate).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={r.isActive ? 'badge-success' : 'badge-free'}>
                          {r.isActive ? 'ACTIVE' : 'EXPIRED'}
                        </span>
                      </td>
                      <td>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 10. SALES: ADVERTISEMENTS */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'ADVERTISEMENTS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Partner / Advertiser</th>
                    <th>Campaign Title</th>
                    <th>Ad Slot</th>
                    <th>Fee Collected</th>
                    <th>Impressions</th>
                    <th>Clicks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.advertisements || []).map((ad: any) => (
                    <tr key={ad.id}>
                      <td>
                        <strong>{ad.partnerName}</strong>
                      </td>
                      <td>{ad.title}</td>
                      <td>
                        <span className="badge-free">{ad.slot}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{ad.feeAmount?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>{ad.impressions?.toLocaleString('en-IN')}</td>
                      <td>{ad.clicks?.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={ad.status === 'ACTIVE' ? 'badge-success' : 'badge-free'}>
                          {ad.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 11. SALES: WEDDING SERVICES */}
            {activeTab === 'SALES_REVENUE' && salesSubTab === 'WEDDING_SERVICES' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Category</th>
                    <th>City</th>
                    <th>Partnership Fee</th>
                    <th>Featured</th>
                    <th>Contact Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.services || []).map((s: any) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.businessName}</strong>
                      </td>
                      <td>
                        <span className="badge-free">{s.category}</span>
                      </td>
                      <td>{s.city}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{s.feeAmount?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <span className={s.isFeatured ? 'badge-paid' : 'badge-free'}>
                          {s.isFeatured ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td>{s.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 12. STAFF: PROFILE VISITS */}
            {activeTab === 'STAFF_ACTIVITY' && staffSubTab === 'VISITS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Staff ID</th>
                    <th>Staff Name</th>
                    <th>Branch</th>
                    <th>Member Profile Visited</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.visits || []).map((v: any) => (
                    <tr key={v.id}>
                      <td>{new Date(v.visitedAt).toLocaleString('en-IN')}</td>
                      <td>
                        <strong>{v.staffId}</strong>
                      </td>
                      <td>{v.staffName}</td>
                      <td>{v.branchName}</td>
                      <td>
                        {v.memberName} (<strong>{v.memberId}</strong>)
                      </td>
                      <td>
                        <a
                          href={`/profiles/${v.memberProfileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-table-action"
                        >
                          View Member ➔
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 13. STAFF: PROFILES CREATED / EDITED / BLOCKED */}
            {activeTab === 'STAFF_ACTIVITY' &&
              (staffSubTab === 'CREATED' || staffSubTab === 'EDITED' || staffSubTab === 'BLOCKED') && (
                <table className="reports-data-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Staff Name</th>
                      <th>Role</th>
                      <th>Branch</th>
                      <th>Today</th>
                      <th>This Month</th>
                      <th>Overall Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData?.staff || []).map((s: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <strong>{s.staffId}</strong>
                        </td>
                        <td>{s.staffName}</td>
                        <td>{s.role}</td>
                        <td>{s.branchName}</td>
                        <td>
                          <span className="badge-free">{s.dailyCount}</span>
                        </td>
                        <td>
                          <span className="badge-paid">{s.monthlyCount}</span>
                        </td>
                        <td>
                          <strong style={{ color: '#2563eb' }}>{s.overallCount}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            {/* 14. STAFF: PAYMENTS PROCESSED */}
            {activeTab === 'STAFF_ACTIVITY' && staffSubTab === 'PAYMENTS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Today (Count / ₹)</th>
                    <th>This Month (Count / ₹)</th>
                    <th>Overall Total (Count / ₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.staff || []).map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <strong>{s.staffId}</strong>
                      </td>
                      <td>{s.staffName}</td>
                      <td>{s.role}</td>
                      <td>{s.branchName}</td>
                      <td>
                        {s.dailyCount} (₹{s.dailyValue?.toLocaleString('en-IN')})
                      </td>
                      <td>
                        {s.monthlyCount} (₹{s.monthlyValue?.toLocaleString('en-IN')})
                      </td>
                      <td>
                        <strong>
                          {s.overallCount} (₹{s.overallValue?.toLocaleString('en-IN')})
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 15. STAFF: CASH COLLECTED */}
            {activeTab === 'STAFF_ACTIVITY' && staffSubTab === 'CASH' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Today Cash</th>
                    <th>This Month Cash</th>
                    <th>Total Cash Collected</th>
                    <th>Cash Collections Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.staff || []).map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <strong>{s.staffId}</strong>
                      </td>
                      <td>{s.staffName}</td>
                      <td>{s.role}</td>
                      <td>{s.branchName}</td>
                      <td>₹{s.dailyCash?.toLocaleString('en-IN')}</td>
                      <td>₹{s.monthlyCash?.toLocaleString('en-IN')}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>
                          ₹{s.overallCash?.toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>{s.cashCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 16. STAFF: MESSAGES RECEIVED */}
            {activeTab === 'STAFF_ACTIVITY' && staffSubTab === 'MESSAGES' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Staff Name</th>
                    <th>Branch</th>
                    <th>Inbound Messages Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.staff || []).map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <strong>{s.staffId}</strong>
                      </td>
                      <td>{s.staffName}</td>
                      <td>{s.branchName}</td>
                      <td>
                        <span className="badge-paid">{s.inboundMessageCount} messages</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 17. STAFF: TICKETS RESOLVED */}
            {activeTab === 'STAFF_ACTIVITY' && staffSubTab === 'TICKETS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Staff Name</th>
                    <th>Branch / Team</th>
                    <th>Tickets Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.staff || []).map((s: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <strong>{s.staffId}</strong>
                      </td>
                      <td>{s.staffName}</td>
                      <td>{s.branchName}</td>
                      <td>
                        <span className="badge-success">{s.resolvedCount} resolved</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 18. MEMBER DATA DOWNLOADS PREVIEW TABLE */}
            {activeTab === 'MEMBER_DOWNLOADS' && (
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Customer ID</th>
                    <th>Gender</th>
                    <th>Package Type</th>
                    <th>Photo Uploaded</th>
                    <th>ID Proof Uploaded</th>
                    <th>Profile Completion %</th>
                    <th>Branch</th>
                    <th>Individual Biodata</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData?.records || []).map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <strong>{r.customerName}</strong>
                      </td>
                      <td>{r.customerId}</td>
                      <td>{r.gender}</td>
                      <td>
                        <span className={r.packageType === 'PAID' ? 'badge-paid' : 'badge-free'}>
                          {r.packageType}
                        </span>
                      </td>
                      <td>
                        <span
                          className={r.photoUploaded === 'Yes' ? 'badge-success' : 'badge-danger'}
                        >
                          {r.photoUploaded}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            r.idProofUploaded === 'Yes' ? 'badge-success' : 'badge-danger'
                          }
                        >
                          {r.idProofUploaded}
                        </span>
                      </td>
                      <td>
                        <strong>{r.completionPercentage}</strong>
                      </td>
                      <td>{r.branchName}</td>
                      <td>
                        <button
                          onClick={() => handleFetchBiodata(r.customerId)}
                          className="btn-table-action"
                        >
                          📄 Biodata
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* BIODATA PREVIEW MODAL */}
      {biodataModal && (
        <div className="report-modal-overlay">
          <div className="report-modal-box">
            <div className="report-modal-header">
              <h3>
                Official Member Biodata: {biodataModal.biodata?.fullName} (
                {biodataModal.biodata?.memberId})
              </h3>
              <button
                onClick={() => setBiodataModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="report-modal-body">
              <div className="biodata-grid">
                <div className="biodata-item">
                  <span>Full Name</span>
                  <strong>{biodataModal.biodata?.fullName}</strong>
                </div>
                <div className="biodata-item">
                  <span>Member ID</span>
                  <strong>{biodataModal.biodata?.memberId}</strong>
                </div>
                <div className="biodata-item">
                  <span>Age / Gender</span>
                  <strong>
                    {biodataModal.biodata?.age} Yrs / {biodataModal.biodata?.gender}
                  </strong>
                </div>
                <div className="biodata-item">
                  <span>Marital Status</span>
                  <strong>{biodataModal.biodata?.maritalStatus}</strong>
                </div>
                <div className="biodata-item">
                  <span>Religion & Caste</span>
                  <strong>
                    {biodataModal.biodata?.religion} — {biodataModal.biodata?.caste}
                  </strong>
                </div>
                <div className="biodata-item">
                  <span>Sub-Caste & Gothram</span>
                  <strong>
                    {biodataModal.biodata?.subCaste} / {biodataModal.biodata?.gothram}
                  </strong>
                </div>
                <div className="biodata-item">
                  <span>Education</span>
                  <strong>{biodataModal.biodata?.education}</strong>
                </div>
                <div className="biodata-item">
                  <span>Profession / Occupation</span>
                  <strong>{biodataModal.biodata?.profession}</strong>
                </div>
                <div className="biodata-item">
                  <span>Annual Income</span>
                  <strong>{biodataModal.biodata?.annualIncome}</strong>
                </div>
                <div className="biodata-item">
                  <span>Work Location</span>
                  <strong>{biodataModal.biodata?.workLocation}</strong>
                </div>
                <div className="biodata-item">
                  <span>Package Tier</span>
                  <strong>{biodataModal.biodata?.package}</strong>
                </div>
                <div className="biodata-item">
                  <span>Profile Completion</span>
                  <strong style={{ color: '#10b981' }}>
                    {biodataModal.biodata?.completionPercentage}
                  </strong>
                </div>
              </div>
            </div>
            <div className="report-modal-footer">
              <button
                onClick={() =>
                  handleDownloadCsv(
                    `Biodata_${biodataModal.biodata?.memberId}.csv`,
                    biodataModal.csvContent,
                  )
                }
                className="btn-primary-report"
              >
                📥 Download Biodata CSV / Excel
              </button>
              <button onClick={() => window.print()} className="btn-secondary-report">
                🖨️ Print Biodata PDF
              </button>
              <button onClick={() => setBiodataModal(null)} className="btn-secondary-report">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTOS LIST MODAL */}
      {photosListModal && (
        <div className="report-modal-overlay">
          <div className="report-modal-box">
            <div className="report-modal-header">
              <h3>
                Authorized {photosListModal.type === 'MEMBERS' ? 'Member Photos' : 'Staff ID Proofs'} ({photosListModal.count} files)
              </h3>
              <button
                onClick={() => setPhotosListModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="report-modal-body">
              <p style={{ margin: '0 0 16px', color: '#64748b' }}>
                Files are named with their respective Staff ID or Member ID for external backup:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {photosListModal.photos.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <strong>{p.name}</strong> ({p.identifier})
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        File: {p.downloadFileName}
                      </div>
                    </div>
                    <a
                      href={p.fileUrl}
                      download={p.downloadFileName}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary-report"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      💾 Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
            <div className="report-modal-footer">
              <button onClick={() => setPhotosListModal(null)} className="btn-secondary-report">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalyticsPage;
