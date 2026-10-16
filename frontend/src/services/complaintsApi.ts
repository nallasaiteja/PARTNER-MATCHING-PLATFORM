import { API_BASE_URL, getAuthHeaders } from './apiConfig';

const API_BASE = `${API_BASE_URL}/complaints`;

export interface ComplaintHistoryItem {
  status: string;
  changedById: string;
  timestamp: string;
  notes?: string;
}

export interface InternalComplaintData {
  id: string;
  complaintNumber: string;
  type: 'MEMBER' | 'STAFF';
  relatedMemberId?: string | null;
  relatedStaffId?: string | null;
  subject: string;
  description: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  internalNotes?: string | null;
  createdById: string;
  statusHistory: ComplaintHistoryItem[];
  createdAt: string;
  updatedAt: string;
  relatedMember?: {
    id: string;
    memberId: string | null;
    firstName: string;
    lastName: string;
    user?: {
      mobile: string;
      email: string | null;
    } | null;
  } | null;
  relatedStaff?: {
    id: string;
    fullName: string | null;
    employeeId: string | null;
    email: string | null;
    mobile: string;
    role: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string | null;
    employeeId: string | null;
    role: string;
  } | null;
}

export interface CreateComplaintPayload {
  type: 'MEMBER' | 'STAFF';
  relatedMemberId?: string;
  relatedStaffId?: string;
  subject: string;
  description: string;
  internalNotes?: string;
}

export interface UpdateComplaintPayload {
  status?: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  internalNotes?: string;
  historyNote?: string;
}

export const complaintsApi = {
  async createComplaint(data: CreateComplaintPayload): Promise<{
    success: boolean;
    message: string;
    complaint: InternalComplaintData;
  }> {
    const res = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create complaint record');
    return json;
  },

  async listComplaints(params?: {
    type?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    complaints: InternalComplaintData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch complaints');
    return json;
  },

  async getComplaintById(id: string): Promise<InternalComplaintData> {
    const res = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch complaint details');
    return json;
  },

  async updateComplaint(
    id: string,
    data: UpdateComplaintPayload,
  ): Promise<{
    success: boolean;
    message: string;
    complaint: InternalComplaintData;
  }> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update complaint');
    return json;
  },
};
