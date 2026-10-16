/**
 * SECTION 7 — REPORTS & ANALYTICS API CLIENT
 */

import { API_BASE_URL, getAuthHeaders } from './apiConfig';

const API_BASE = API_BASE_URL;

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = Array.isArray(data.message)
      ? data.message.join(', ')
      : (data.message || `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
  }

  return data;
}

function buildQuery(params: Record<string, any> = {}): string {
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.append(k, String(v));
    }
  }
  const q = searchParams.toString();
  return q ? `?${q}` : '';
}

// ─────────────────────────────────────────────────────────────
// 1. MEMBER DATA REPORTS
// ─────────────────────────────────────────────────────────────

export async function fetchOrganizations() {
  return request('/reports/organizations');
}

export async function fetchUnverifiedIdProofs(params?: { branchId?: string; search?: string }) {
  return request(`/reports/members/unverified-ids${buildQuery(params)}`);
}

export async function fetchProfilesWithoutPhotos(params?: { branchId?: string; search?: string }) {
  return request(`/reports/members/no-photos${buildQuery(params)}`);
}

export async function fetchProfilesBelow30(params?: { branchId?: string; search?: string }) {
  return request(`/reports/members/below-30${buildQuery(params)}`);
}

export async function fetchIncompleteProfileSummary(params?: {
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return request(`/reports/members/incomplete-summary${buildQuery(params)}`);
}

// ─────────────────────────────────────────────────────────────
// 2. SALES AND REVENUE REPORTS
// ─────────────────────────────────────────────────────────────

export async function fetchBranchRevenueReport(params?: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'monthly' | 'overall';
}) {
  return request(`/reports/sales/branch-revenue${buildQuery(params)}`);
}

export async function fetchAgentRevenueReport(params?: {
  agentId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'monthly' | 'overall';
}) {
  return request(`/reports/sales/agent-revenue${buildQuery(params)}`);
}

export async function fetchFranchiseRevenueReport(params?: {
  franchiseId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/sales/franchise-revenue${buildQuery(params)}`);
}

export async function fetchInvoiceApprovalReport(params?: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/sales/invoice-approvals${buildQuery(params)}`);
}

export async function fetchFeaturedProfileRevenueReport(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/sales/featured-profiles${buildQuery(params)}`);
}

export async function fetchAdvertisementRevenueReport(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/sales/advertisements${buildQuery(params)}`);
}

export async function fetchWeddingServicesRevenueReport(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/sales/wedding-services${buildQuery(params)}`);
}

// ─────────────────────────────────────────────────────────────
// 3. STAFF ACTIVITY REPORTS
// ─────────────────────────────────────────────────────────────

export async function fetchStaffProfileVisits(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/visits${buildQuery(params)}`);
}

export async function fetchStaffProfilesCreated(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/created${buildQuery(params)}`);
}

export async function fetchStaffProfilesEdited(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/edited${buildQuery(params)}`);
}

export async function fetchStaffProfilesBlocked(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/blocked${buildQuery(params)}`);
}

export async function fetchStaffPaymentsProcessed(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/payments${buildQuery(params)}`);
}

export async function fetchStaffCurrencyCollected(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/cash${buildQuery(params)}`);
}

export async function fetchStaffMessagesReceived(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/messages${buildQuery(params)}`);
}

export async function fetchStaffTicketsResolved(params?: {
  staffId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request(`/reports/staff/tickets${buildQuery(params)}`);
}

// ─────────────────────────────────────────────────────────────
// 4. MEMBER DATA DOWNLOADS
// ─────────────────────────────────────────────────────────────

export async function downloadMemberData(params?: {
  idRangeStart?: string;
  idRangeEnd?: string;
  startDate?: string;
  endDate?: string;
  status?: 'ALL' | 'FREE' | 'PAID' | 'BLOCKED';
  branchId?: string;
  format?: 'json' | 'csv' | 'pdf';
}) {
  return request(`/reports/downloads/members${buildQuery(params)}`);
}

export async function fetchMemberBiodata(memberId: string) {
  return request(`/reports/downloads/biodata/${encodeURIComponent(memberId)}`);
}

export async function fetchPhotosDownloadList(params?: {
  type?: 'MEMBERS' | 'STAFF';
  branchId?: string;
}) {
  return request(`/reports/downloads/photos${buildQuery(params)}`);
}
