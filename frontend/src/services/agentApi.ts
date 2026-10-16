export interface AgentDashboardResponse {
  agent: {
    id: string;
    fullName: string;
    employeeId: string | null;
    mobile: string;
    email: string | null;
    role: string;
    organization: {
      id: string;
      name: string;
      type: string;
    } | null;
  };
  stats: {
    totalProfilesCreated: number;
    pendingInvoices: number;
    approvedInvoices: number;
    rejectedOrCancelledInvoices: number;
    totalInvoices: number;
  };
  commissions: {
    totalEarned: number;
    totalSalesRecorded: number;
    assignedConfig: {
      scope: string;
      commissionType: 'PERCENTAGE' | 'FIXED';
      rateValue: number;
      notes: string | null;
    } | null;
    hasIndependentWallet: boolean;
    walletNotice: string;
  };
}

export interface AgentProfileItem {
  id: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  packageType: 'FREE' | 'PAID';
  ownershipType: string;
  isBlocked: boolean;
  createdAt: string;
  user?: {
    id: string;
    mobile: string;
    email: string | null;
    mobileVerified: boolean;
    emailVerified: boolean;
  };
  ownerOrg?: {
    id: string;
    name: string;
    type: string;
  };
  currentPackage?: {
    id: string;
    name: string;
  };
  profileData?: any;
}

export interface AgentProfilesResponse {
  data: AgentProfileItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AgentInvoiceItem {
  id: string;
  requestNumber: string | null;
  invoiceNumber: string | null;
  amount: number;
  paymentMode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  invoiceDate: string | null;
  memberProfile: {
    id: string;
    memberId: string | null;
    firstName: string;
    lastName: string;
    packageType: string;
    user?: {
      mobile: string;
      email: string | null;
    };
  };
  package: {
    id: string;
    name: string;
    cost: number;
  };
  org?: {
    name: string;
    type: string;
  };
  approvedBy?: {
    fullName: string | null;
    employeeId: string | null;
  };
  commissionTransaction?: any;
}

export interface AgentInvoicesResponse {
  data: AgentInvoiceItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AgentCommissionResponse {
  agentId: string;
  assignedConfiguration: {
    id: string;
    scope: string;
    commissionType: 'PERCENTAGE' | 'FIXED';
    rateValue: number;
    notes: string | null;
    configuredAt: string;
  } | null;
  summary: {
    totalEarned: number;
    totalTransactionsCount: number;
    hasIndependentWallet: boolean;
    settlementModel: string;
  };
  transactions: Array<{
    id: string;
    packagePrice: number;
    commissionType: string;
    rateValue: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
    invoice: {
      id: string;
      invoiceNumber: string | null;
      requestNumber: string | null;
      amount: number;
      status: string;
      invoiceDate: string | null;
      memberProfile: {
        memberId: string | null;
        firstName: string;
        lastName: string;
      };
      package: {
        name: string;
      };
    };
  }>;
}

import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export async function fetchAgentDashboard(): Promise<AgentDashboardResponse> {
  const res = await fetch(`${API_BASE_URL}/agent/dashboard`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load agent dashboard');
  }
  return res.json();
}

export async function fetchAgentProfiles(params?: {
  search?: string;
  packageType?: string;
  isBlocked?: string;
  page?: number;
  limit?: number;
}): Promise<AgentProfilesResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.packageType) query.set('packageType', params.packageType);
  if (params?.isBlocked) query.set('isBlocked', params.isBlocked);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE_URL}/agent/profiles?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load agent profiles');
  }
  return res.json();
}

export async function fetchAgentProfile(id: string): Promise<AgentProfileItem> {
  const res = await fetch(`${API_BASE_URL}/agent/profiles/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load member profile');
  }
  return res.json();
}

export async function createAgentMemberProfile(data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agent/profiles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create member profile');
  }
  return res.json();
}

export async function updateAgentMemberProfile(id: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agent/profiles/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update member profile');
  }
  return res.json();
}

export async function fetchAgentInvoices(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AgentInvoicesResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE_URL}/agent/invoices?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load invoice requests');
  }
  return res.json();
}

export async function raiseAgentInvoice(data: {
  memberProfileId: string;
  packageId: string;
  paymentMode: string;
  bankName?: string;
  transactionRef?: string;
  chequeDate?: string;
  isCash?: boolean;
  cashReceivedDeclaration?: boolean;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agent/invoices`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to raise invoice request');
  }
  return res.json();
}

export async function fetchAgentCommissions(): Promise<AgentCommissionResponse> {
  const res = await fetch(`${API_BASE_URL}/agent/commissions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load commission data');
  }
  return res.json();
}
