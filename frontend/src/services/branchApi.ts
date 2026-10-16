/**
 * SECTION 8: BRANCH MANAGER DASHBOARD API CLIENT
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

// ─── 8.1 DASHBOARD & OVERVIEW ───────────────────────────────

export async function fetchBranchDashboard() {
  return request('/branch/dashboard');
}

export async function fetchBranchMembers(params?: {
  search?: string;
  packageType?: string;
  isBlocked?: boolean;
  idProofStatus?: 'PENDING' | 'VERIFIED' | 'MISSING';
  page?: number;
  limit?: number;
}) {
  return request(`/branch/members${buildQuery(params)}`);
}

// ─── 8.4 ID PROOF VERIFICATION ──────────────────────────────

export async function fetchPendingVerifications() {
  const res = await request('/branch/verifications');
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.records)) return res.records;
  return [];
}

export async function verifyMemberIdProof(
  profileId: string,
  data: { verified: boolean; rejectionReason?: string },
) {
  return request(`/branch/verifications/${profileId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── 8.5 BLOCKING & UNBLOCK (STRICT DENIAL) ─────────────────

export async function blockMemberProfile(profileId: string, reason: string) {
  return request(`/branch/members/${profileId}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unblockMemberProfile(profileId: string) {
  return request(`/branch/members/${profileId}/unblock`, {
    method: 'POST',
  });
}

// ─── 8.1 DOB, PHONE & ACCOUNT MANAGEMENT ────────────────────

export async function changeMemberDob(profileId: string, dateOfBirth: string, reason: string) {
  return request(`/branch/members/${profileId}/dob`, {
    method: 'PATCH',
    body: JSON.stringify({ dateOfBirth, reason }),
  });
}

export async function updateMemberMobile(profileId: string, mobile: string, reason: string) {
  return request(`/branch/members/${profileId}/mobile`, {
    method: 'PATCH',
    body: JSON.stringify({ mobile, reason }),
  });
}

export async function fetchMemberAccountInfo(profileId: string) {
  return request(`/branch/members/${profileId}/account-info`);
}

export async function resetMemberPassword(profileId: string, tempPassword?: string) {
  return request(`/branch/members/${profileId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ tempPassword }),
  });
}

// ─── 8.6 BRANCH SALES & STAFF SALES ─────────────────────────

export async function fetchBranchSales(params?: {
  startDate?: string;
  endDate?: string;
  staffId?: string;
}) {
  return request(`/branch/sales${buildQuery(params)}`);
}

// ─── 8.7 INVOICE REQUESTS & 72-HOUR RULE ────────────────────

export async function raiseBranchInvoice(data: {
  memberProfileId: string;
  packageId: string;
  paymentMode: string;
  saleStaffId?: string;
  notes?: string;
  bankName?: string;
  transactionRef?: string;
  chequeDate?: string;
  isCash?: boolean;
}) {
  return request('/branch/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function triggerAutoCancelCheck() {
  return request('/branch/invoices/auto-cancel-check', {
    method: 'POST',
  });
}

// ─── 8.8 STAFF ATTENDANCE & LEAVES ──────────────────────────

export async function fetchStaffAttendance(date?: string) {
  return request(`/branch/attendance${buildQuery({ date })}`);
}

export async function fetchBranchLeaves() {
  return request('/branch/leaves');
}

export async function submitLeaveApplication(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}) {
  return request('/branch/leaves', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reviewLeaveApplication(
  leaveId: string,
  data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
) {
  return request(`/branch/leaves/${leaveId}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── 8.9 BRANCH-LEVEL PAYMENT ALERTS ────────────────────────

export async function fetchBranchPaymentAlerts() {
  return request('/branch/payment-alerts');
}

export async function createPaymentAlert(data: {
  memberProfileId: string;
  alertDate: string;
  alertType?: string;
  packageId?: string;
  responsibleStaffId?: string;
  note?: string;
}) {
  return request('/branch/payment-alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function triggerPaymentAlertNotifications() {
  return request('/branch/payment-alerts/trigger', {
    method: 'POST',
  });
}
