import { API_BASE_URL, getAuthHeaders } from './apiConfig';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export interface NotificationLogItem {
  id: string;
  type: string;
  channel: 'APP_PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
  recipientUserId?: string;
  recipientMemberProfileId?: string;
  recipientContact: string;
  recipientName?: string;
  title?: string;
  content: string;
  templateId?: string;
  status: 'SENT' | 'FAILED' | 'PENDING' | 'DELIVERED';
  provider?: string;
  providerMessageId?: string;
  error?: string;
  metadata?: any;
  sentAt: string;
  recipientUser?: {
    id: string;
    mobile: string;
    email: string;
    role: string;
  };
  recipientMemberProfile?: {
    id: string;
    memberId: string;
    firstName: string;
    lastName: string;
  };
}

export interface NotificationStatsResponse {
  today: {
    total: number;
    sent: number;
    failed: number;
    deliveryRate: number;
  };
  channels: { channel: string; count: number }[];
  types: { type: string; count: number }[];
  recentFailures: NotificationLogItem[];
}

export interface FestivalWishItem {
  id: string;
  festivalName: string;
  festivalDate: string;
  messageTemplate: string;
  discountPercent?: number;
  offerCode?: string;
  channels: string[];
  isActive: boolean;
  createdById?: string;
  lastDispatchedAt?: string;
  dispatchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSmsPreviewResponse {
  branchName: string;
  branchOrgId: string | null;
  recipientCount: number;
  estimatedCost: number;
  idRange: { start: string; end: string };
  sampleRecipients: {
    memberId: string;
    name: string;
    maskedMobile: string;
    branch: string;
  }[];
}

export interface BulkSmsUsageReportResponse {
  branchUsage: {
    branchId: string;
    branchName: string;
    totalCampaigns: number;
    totalSmsSent: number;
    successCount: number;
    totalCost: number;
  }[];
  recentCampaigns: {
    id: string;
    title: string;
    message: string;
    branchName: string;
    recipientCount: number;
    successCount: number;
    failedCount: number;
    totalCost: number;
    idRange: string;
    status: string;
    createdAt: string;
  }[];
}

// ────────────────────────────────────────────────────────────
// API FUNCTIONS
// ────────────────────────────────────────────────────────────

export const fetchNotificationHistory = async (params: {
  type?: string;
  channel?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.channel) query.append('channel', params.channel);
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));

  return request<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    logs: NotificationLogItem[];
  }>(`/notifications/history?${query.toString()}`);
};

export const fetchNotificationStats = async () => {
  return request<NotificationStatsResponse>('/notifications/stats');
};

export const registerPushToken = async (token: string, platform = 'WEB') => {
  return request('/notifications/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
};

export const sendTestNotification = async (payload: {
  channel: 'APP_PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
  type?: string;
  recipientContact: string;
  recipientName?: string;
  title?: string;
  content: string;
  templateId?: string;
}) => {
  return request('/notifications/test-dispatch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Festivals
export const fetchFestivals = async () => {
  return request<FestivalWishItem[]>('/notifications/festivals');
};

export const createFestival = async (payload: {
  festivalName: string;
  festivalDate: string;
  messageTemplate: string;
  discountPercent?: number;
  offerCode?: string;
  channels?: string[];
  isActive?: boolean;
}) => {
  return request<FestivalWishItem>('/notifications/festivals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateFestival = async (
  id: string,
  payload: Partial<FestivalWishItem>,
) => {
  return request<FestivalWishItem>(`/notifications/festivals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const deleteFestival = async (id: string) => {
  return request(`/notifications/festivals/${id}`, {
    method: 'DELETE',
  });
};

export const triggerFestivalDispatch = async (id: string) => {
  return request<any>(`/notifications/festivals/${id}/dispatch`, {
    method: 'POST',
  });
};

// Automated Trigger Actions
export const triggerRunBirthdays = async () => {
  return request<{
    success: boolean;
    istDate: string;
    birthdayMembersCount: number;
    memberDispatches: number;
    staffDispatches: number;
  }>('/notifications/automated/run-birthdays', {
    method: 'POST',
  });
};

export const triggerRunFestivals = async () => {
  return request<any>('/notifications/automated/run-festivals', {
    method: 'POST',
  });
};

export const triggerRunPaymentAlerts = async () => {
  return request<{
    message: string;
    alertsDispatched: number;
  }>('/notifications/automated/run-payment-alerts', {
    method: 'POST',
  });
};

export const triggerRunPackageExpiry = async () => {
  return request<{
    message: string;
    alertsTriggered: number;
  }>('/notifications/automated/run-package-expiry', {
    method: 'POST',
  });
};

// Bulk SMS
export const previewBulkSms = async (params: {
  branchOrgId?: string;
  targetIdRangeStart?: string;
  targetIdRangeEnd?: string;
}) => {
  return request<BulkSmsPreviewResponse>('/notifications/bulk-sms/preview', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const sendBulkSmsCampaign = async (payload: {
  branchOrgId?: string;
  title: string;
  message: string;
  targetIdRangeStart?: string;
  targetIdRangeEnd?: string;
}) => {
  return request<{
    success: boolean;
    message: string;
    campaign: any;
  }>('/notifications/bulk-sms/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchBulkSmsReports = async () => {
  return request<BulkSmsUsageReportResponse>('/notifications/bulk-sms/reports');
};

// Ticket Closure OTP
export const requestTicketClosureOtp = async (ticketId: string) => {
  return request<{
    success: boolean;
    message: string;
    ticketId: string;
    expiresInMinutes: number;
    devOtp?: string;
  }>(`/notifications/tickets/${ticketId}/request-closure-otp`, {
    method: 'POST',
  });
};

export const verifyTicketClosureOtp = async (ticketId: string, otp: string) => {
  return request<{
    success: boolean;
    message: string;
    ticket: any;
  }>(`/notifications/tickets/${ticketId}/verify-closure-otp`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
};
