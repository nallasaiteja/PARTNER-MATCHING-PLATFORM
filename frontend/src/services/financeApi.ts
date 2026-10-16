/**
 * Section 6: Financial Flows, Invoices, Wallets & Ledgers API Client
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

// ─── 6.3 & 6.4 INVOICES & APPROVALS ─────────────────────────

export interface FilterInvoicesParams {
  search?: string;
  memberId?: string;
  invoiceNumber?: string;
  mobile?: string;
  orgId?: string;
  status?: string;
  paymentMode?: string;
  packageId?: string;
  hasInvoice?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function fetchInvoices(params: FilterInvoicesParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/invoices${qs}`);
}

export async function fetchPendingInvoices() {
  return request('/invoices/pending');
}

export async function fetchInvoiceDetail(id: string) {
  return request(`/invoices/${id}`);
}

export async function raiseInvoiceRequest(data: {
  memberProfileId: string;
  packageId: string;
  paymentMode: string;
  bankName?: string;
  transactionRef?: string;
  chequeDate?: string;
  isCash?: boolean;
  cashReceivedDeclaration?: boolean;
  saleStaffId?: string;
  notes?: string;
}) {
  return request('/invoices/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveInvoice(id: string, notes?: string) {
  return request(`/invoices/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function rejectInvoice(id: string, reason: string) {
  return request(`/invoices/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function editInvoice(id: string, data: {
  amount?: number;
  paymentMode?: string;
  bankName?: string;
  transactionRef?: string;
  notes?: string;
  editReason: string;
}) {
  return request(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function exportInvoices(params: FilterInvoicesParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/invoices/export${qs}`);
}

export async function fetchMemberInvoiceStatus(params: { startDate?: string; endDate?: string } = {}) {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/invoices/member-status${qs}`);
}

// ─── 6.8 FRANCHISE WALLETS ──────────────────────────────────

export async function fetchFranchiseWallets() {
  return request('/finance/wallets');
}

export async function fetchMyFranchiseWallet() {
  return request('/finance/wallets/my-wallet');
}

export async function fetchWalletDetail(franchiseOrgId: string) {
  return request(`/finance/wallets/${franchiseOrgId}`);
}

export async function topupFranchiseWallet(franchiseOrgId: string, data: {
  amount: number;
  referenceId?: string;
  reason: string;
  notes?: string;
}) {
  return request(`/finance/wallets/${franchiseOrgId}/topup`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setFranchiseWalletLimit(franchiseOrgId: string, creditLimit: number) {
  return request(`/finance/wallets/${franchiseOrgId}/limit`, {
    method: 'PATCH',
    body: JSON.stringify({ creditLimit }),
  });
}

// ─── 6.7 FINANCIAL LEDGERS ──────────────────────────────────

export async function fetchFinancialLedgers(params: {
  ledgerType?: 'HQ' | 'FRANCHISE' | 'AGENT';
  ownerOrgId?: string;
  agentUserId?: string;
  category?: string;
  entryType?: 'CREDIT' | 'DEBIT';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/finance/ledgers${qs}`);
}

export async function recordExternalRevenue(data: {
  category: 'AD_REVENUE' | 'WEDDING_SERVICE_REVENUE' | 'ADJUSTMENT';
  amount: number;
  description: string;
  referenceNumber?: string;
  sourceEntityId?: string;
}) {
  return request('/finance/ledgers/revenue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── 6.7 COMMISSIONS ────────────────────────────────────────

export async function fetchCommissionConfigs() {
  return request('/finance/commissions/configs');
}

export async function setCommissionConfig(data: {
  scope: string;
  orgId?: string;
  agentUserId?: string;
  packageId?: string;
  commissionType: 'PERCENTAGE' | 'FIXED';
  rateValue: number;
  notes?: string;
}) {
  return request('/finance/commissions/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCommissionReport(params: {
  agentUserId?: string;
  orgId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`/finance/commissions/report${qs}`);
}

// ─── HELPER LOOKUPS ─────────────────────────────────────────

export async function fetchActivePackages() {
  return request('/admin/packages');
}

export async function searchMembersForInvoice(search: string) {
  return request(`/admin/members?search=${encodeURIComponent(search)}&limit=10`);
}

export async function fetchStaffForSales() {
  return request('/staff?status=ACTIVE');
}

// ─── REAL-TIME ONLINE PAYMENT (RAZORPAY) ────────────────────

export async function fetchRazorpayConfig() {
  return request('/payments/razorpay/config');
}

export async function createRazorpayOrder(packageId: string) {
  return request('/payments/razorpay/order', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
}

export async function verifyRazorpayPayment(data: {
  invoiceId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  notes?: string;
}) {
  return request('/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

