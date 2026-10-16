import { API_BASE_URL, getAuthHeaders } from './apiConfig';

const API_BASE = `${API_BASE_URL}/leave`;

export interface LeaveApplication {
  id: string;
  staffId: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'EMERGENCY' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  staff?: {
    id: string;
    fullName: string | null;
    email: string | null;
    mobile: string;
    employeeId: string | null;
    organization?: {
      id: string;
      name: string;
    } | null;
  };
  reviewedBy?: {
    id: string;
    fullName: string | null;
    employeeId: string | null;
  } | null;
}

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  firstLoginAt?: string | null;
  lastActiveAt?: string | null;
  workingHours?: number | null;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
  isManualAdjustment: boolean;
  adjustedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  staff?: {
    id: string;
    fullName: string | null;
    employeeId: string | null;
    mobile: string;
    organization?: {
      id: string;
      name: string;
    } | null;
  };
  adjustedBy?: {
    id: string;
    fullName: string | null;
  } | null;
}

export interface ApplyLeavePayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ReviewLeavePayload {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface ManualAttendancePayload {
  staffId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
  workingHours?: number;
  notes?: string;
}

export const leaveApi = {
  async applyLeave(data: ApplyLeavePayload): Promise<{ success: boolean; leave: LeaveApplication }> {
    const res = await fetch(`${API_BASE}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to submit leave application');
    return json;
  },

  async getMyLeaves(params?: { status?: string; page?: number; limit?: number }): Promise<{
    leaves: LeaveApplication[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/my-leaves?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch personal leaves');
    return json;
  },

  async cancelLeave(id: string): Promise<{ success: boolean; leave: LeaveApplication }> {
    const res = await fetch(`${API_BASE}/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to cancel leave application');
    return json;
  },

  async listLeaves(params?: {
    branchId?: string;
    staffId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    leaves: LeaveApplication[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.staffId) query.append('staffId', params.staffId);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/all?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch leave records');
    return json;
  },

  async reviewLeave(id: string, data: ReviewLeavePayload): Promise<{ success: boolean; leave: LeaveApplication }> {
    const res = await fetch(`${API_BASE}/${id}/review`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to review leave application');
    return json;
  },

  async listAttendance(params?: {
    branchId?: string;
    staffId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    records: StaffAttendanceRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.staffId) query.append('staffId', params.staffId);
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/attendance?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch attendance records');
    return json;
  },

  async manualCorrectAttendance(data: ManualAttendancePayload): Promise<{ success: boolean; record: StaffAttendanceRecord }> {
    const res = await fetch(`${API_BASE}/attendance/manual-adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to adjust attendance');
    return json;
  },
};
