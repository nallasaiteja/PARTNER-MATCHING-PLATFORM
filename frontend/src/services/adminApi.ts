/**
 * HQ Admin Panel API Service — Section 5
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

// ─── 5.1 DASHBOARD ──────────────────────────────────────────

export async function fetchAdminDashboard() {
  return request('/admin/dashboard');
}

// ─── 5.2 STAFF MANAGEMENT ───────────────────────────────────

export async function fetchStaffList(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/staff${query}`);
}

export async function fetchStaffDetail(staffId: string) {
  return request(`/staff/${staffId}`);
}

export async function fetchStaffActivity(staffId: string) {
  return request(`/staff/${staffId}/activity`);
}

export async function fetchStaffSalary(staffId: string) {
  return request(`/staff/${staffId}/salary`);
}

export async function requestStaffOtp(mobile: string) {
  return request('/staff/request-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

export async function createStaff(data: {
  fullName: string;
  mobile: string;
  email?: string;
  password: string;
  role: string;
  organizationId?: string;
  staffDivision?: string;
  aadhaarUrl: string;
  otpCode: string;
  employeeId?: string;
}) {
  return request('/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStaff(staffId: string, data: any) {
  return request(`/staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function blockStaff(staffId: string) {
  return request(`/staff/${staffId}/block`, {
    method: 'PATCH',
  });
}

export async function terminateStaff(staffId: string) {
  return request(`/staff/${staffId}/terminate`, {
    method: 'PATCH',
  });
}

export async function addStaffSalary(staffId: string, data: {
  month: string;
  salaryAmount: number;
  incentiveAmount?: number;
  packageName?: string;
  notes?: string;
}) {
  return request(`/staff/${staffId}/salary`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setStaffAccessRules(staffId: string, data: {
  idRangeStart?: string;
  idRangeEnd?: string;
  allowedCastes?: string[];
  allowedGenders?: string[];
  customSeries?: string[];
}) {
  return request(`/staff/${staffId}/access-rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── 5.3 MEMBER MANAGEMENT ───────────────────────────────────

export async function fetchAdminMemberList(params: {
  type?: 'ALL' | 'FREE' | 'PAID' | 'BLOCKED' | 'TERMINATED' | 'CONVERTED';
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  return request(`/admin/members?${query.toString()}`);
}

export async function blockMember(memberProfileId: string, reason: string) {
  return request(`/admin/members/${memberProfileId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function unblockMember(memberProfileId: string) {
  return request(`/admin/members/${memberProfileId}/unblock`, {
    method: 'PATCH',
  });
}

export async function requestProfileClosure(memberProfileId: string, reason: string) {
  return request(`/admin/members/${memberProfileId}/request-closure`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function approveProfileClosure(memberProfileId: string) {
  return request(`/admin/members/${memberProfileId}/approve-closure`, {
    method: 'PATCH',
  });
}

export async function markMemberAsPaid(
  memberProfileId: string,
  data: {
    packageId: string;
    facilitatingStaffId: string;
    paymentMode?: string;
    notes?: string;
  },
) {
  return request(`/admin/members/${memberProfileId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchInternalNotes(memberProfileId: string) {
  return request(`/admin/members/${memberProfileId}/notes`);
}

export async function addInternalNote(memberProfileId: string, note: string) {
  return request(`/admin/members/${memberProfileId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function fetchUpdateRequests(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/members/update-requests/list${q}`);
}

export async function reviewUpdateRequest(
  requestId: string,
  action: 'APPROVED' | 'DISMISSED',
  dismissReason?: string,
) {
  return request(`/admin/members/update-requests/${requestId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ action, dismissReason }),
  });
}

// ─── 5.4 MOBILE REQUESTS ────────────────────────────────────

export async function fetchAdminMobileRequests(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  return request(`/admin/mobile-requests?${query.toString()}`);
}

export async function respondToMobileRequest(
  requestId: string,
  action: 'ACCEPTED' | 'REJECTED',
) {
  return request(`/admin/mobile-requests/${requestId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

// ─── 5.5 ALERTS MODULE ──────────────────────────────────────

export async function fetchAdminReminders(isResolved?: boolean) {
  const q = isResolved !== undefined ? `?isResolved=${isResolved}` : '';
  return request(`/admin/alerts/reminders${q}`);
}

export async function createAdminReminder(data: {
  memberProfileId: string;
  packageId?: string;
  alertDate: string;
  alertType: 'PAYMENT' | 'VISIT' | 'PACKAGE_FOLLOWUP';
  note?: string;
}) {
  return request('/admin/alerts/reminders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resolveAdminReminder(id: string) {
  return request(`/admin/alerts/reminders/${id}/resolve`, {
    method: 'PATCH',
  });
}

export async function triggerBirthdayWishes() {
  return request('/admin/alerts/greetings/trigger-birthdays', {
    method: 'POST',
  });
}

export async function sendFestivalGreetings(data: {
  festivalName: string;
  message: string;
  discountPercent?: number;
  offerCode?: string;
}) {
  return request('/admin/alerts/greetings/send-festival', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendBranchBulkSms(data: {
  branchOrgId?: string;
  title: string;
  message: string;
  targetIdRangeStart?: string;
  targetIdRangeEnd?: string;
}) {
  return request('/admin/alerts/bulk-sms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBranchSmsReports() {
  return request('/admin/alerts/bulk-sms/reports');
}

// ─── 5.6 MASTER DATA & SETTINGS ─────────────────────────────

export async function fetchMasterData(category?: string) {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/admin/master-data${q}`);
}

export async function createMasterDataOption(data: {
  category: string;
  code: string;
  label: string;
  parentCode?: string;
  sortOrder?: number;
  metadata?: any;
}) {
  return request('/admin/master-data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMasterDataOption(
  id: string,
  data: {
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
    metadata?: any;
  },
) {
  return request(`/admin/master-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMasterDataOption(id: string) {
  return request(`/admin/master-data/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchTermsAndConditions() {
  return request('/admin/master-data/terms');
}

export async function updateTermsAndConditions(content: string) {
  return request('/admin/master-data/terms', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ─── 5.7 PACKAGES MODULE ────────────────────────────────────

export async function fetchAllAdminPackages() {
  return request('/admin/packages');
}

export async function createAdminPackage(data: {
  name: string;
  validityDays: number;
  contactReveals: number;
  ticketQuota?: number;
  emiEligible?: boolean;
  cost: number;
  servicesProvided: string;
  featuredProfileEligible?: boolean;
}) {
  return request('/admin/packages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminPackage(id: string, data: any) {
  return request(`/admin/packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminPackage(id: string) {
  return request(`/admin/packages/${id}`, {
    method: 'DELETE',
  });
}

// ─── 5.8 ADVANCED SEARCH MODULE ─────────────────────────────

export async function executeAdvancedSearch(filters: any) {
  return request('/admin/search', {
    method: 'POST',
    body: JSON.stringify(filters),
  });
}

// ─── 5.9 FEATURED PROFILES ──────────────────────────────────

export async function fetchActiveFeaturedProfiles() {
  return request('/admin/featured-profiles/active');
}

export async function fetchFeaturedReport() {
  return request('/admin/featured-profiles/report');
}

export async function markProfileAsFeatured(
  profileId: string,
  data: { validityDays: number; notes?: string },
) {
  return request(`/admin/featured-profiles/${profileId}/feature`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function unfeatureProfile(profileId: string) {
  return request(`/admin/featured-profiles/${profileId}/unfeature`, {
    method: 'PATCH',
  });
}

export async function updateMaxFeaturedLimit(limit: number) {
  return request('/admin/featured-profiles/settings/limit', {
    method: 'PATCH',
    body: JSON.stringify({ limit }),
  });
}

// ─── 5.10 ADVERTISEMENTS ────────────────────────────────────

export async function fetchAllAds(slot?: string, status?: string) {
  const query = new URLSearchParams();
  if (slot) query.set('slot', slot);
  if (status) query.set('status', status);
  return request(`/admin/advertisements?${query.toString()}`);
}

export async function fetchAdReport() {
  return request('/admin/advertisements/report');
}

export async function createAd(data: any) {
  return request('/admin/advertisements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAd(id: string, data: any) {
  return request(`/admin/advertisements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAd(id: string) {
  return request(`/admin/advertisements/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdsForSlot(slotName: string, tier?: string) {
  const q = tier ? `?tier=${encodeURIComponent(tier)}` : '';
  return request(`/admin/advertisements/slot/${encodeURIComponent(slotName)}${q}`);
}

export async function recordAdImpression(id: string) {
  return request(`/admin/advertisements/${id}/impression`, {
    method: 'POST',
  });
}

export async function recordAdClick(id: string) {
  return request(`/admin/advertisements/${id}/click`, {
    method: 'POST',
  });
}

// ─── 5.11 WEDDING SERVICES ──────────────────────────────────

export async function fetchAdminWeddingServices(category?: string, isFeatured?: boolean) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (isFeatured !== undefined) query.set('isFeatured', String(isFeatured));
  return request(`/admin/wedding-services/list?${query.toString()}`);
}

export async function fetchWeddingFinanceReport() {
  return request('/admin/wedding-services/report');
}

export async function createWeddingService(data: any) {
  return request('/admin/wedding-services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWeddingService(id: string, data: any) {
  return request(`/admin/wedding-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWeddingService(id: string) {
  return request(`/admin/wedding-services/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchWeddingDirectory(category?: string, city?: string, isPaid?: boolean) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (city) query.set('city', city);
  if (isPaid !== undefined) query.set('isPaid', String(isPaid));
  return request(`/admin/wedding-services/directory?${query.toString()}`);
}


