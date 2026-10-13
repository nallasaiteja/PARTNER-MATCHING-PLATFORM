/**
 * Member API Service — Section 4
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

// ─── AUTH & REGISTRATION (Section 4.1) ──────────────────────

export async function requestRegistrationOtp(recipient: string, channel: 'mobile' | 'email') {
  return request('/auth/register/otp/request', {
    method: 'POST',
    body: JSON.stringify({ recipient, channel }),
  });
}

export async function registerMember(dto: any) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function loginWithCredentials(credentials: {
  identifier?: string;
  mobile?: string;
  email?: string;
  memberId?: string;
  password: string;
}) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function requestLoginOtp(identifier: string, channel: 'mobile' | 'email') {
  return request('/auth/login/otp/request', {
    method: 'POST',
    body: JSON.stringify({ identifier, channel }),
  });
}

export async function verifyLoginOtp(identifier: string, code: string, channel: 'mobile' | 'email') {
  return request('/auth/login/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ identifier, code, channel }),
  });
}

export async function fetchTerms() {
  return request('/auth/terms');
}

export async function acceptTerms() {
  return request('/auth/terms/accept', { method: 'POST' });
}

export async function logoutMember() {
  return request('/auth/logout', { method: 'POST' }).catch(() => ({}));
}

// ─── DASHBOARD & MATCHES (Section 4.2 & 4.3) ────────────────

export async function fetchMemberDashboard() {
  return request('/members/dashboard');
}

export async function fetchVerifiedMatches(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/members/matches/verified?${params}`);
}

export async function fetchMatchedProfiles(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/members/matches/matched?${params}`);
}

export async function fetchMatchDetail(id: string) {
  return request(`/members/matches/${id}`);
}

// ─── CONTACT REVELATION (Section 4.8) ────────────────────────

export async function revealContact(id: string) {
  return request(`/members/matches/${id}/reveal-contact`, { method: 'POST' });
}

export async function fetchContactRequests() {
  return request('/members/contacts/requests');
}

export async function respondContactRequest(id: string, action: 'ACCEPT' | 'REJECT' | 'BLOCK') {
  return request(`/members/contacts/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function fetchRevealedContacts() {
  return request('/members/contacts/revealed');
}

// ─── INTERESTS (Section 4.5 & 6) ────────────────────────────

export async function sendInterest(targetProfileId: string) {
  return request(`/members/interests/${targetProfileId}`, { method: 'POST' });
}

export async function fetchSentInterests() {
  return request('/members/interests/sent');
}

export async function fetchReceivedInterests() {
  return request('/members/interests/received');
}

export async function respondInterest(interestId: string, status: 'ACCEPTED' | 'REJECTED') {
  return request(`/members/interests/${interestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── SHORTLIST, BLOCKLIST, ACTIVITY ─────────────────────────

export async function toggleShortlist(targetProfileId: string) {
  return request(`/members/shortlist/${targetProfileId}`, { method: 'POST' });
}

export async function fetchShortlist() {
  return request('/members/shortlist');
}

export async function toggleBlocklist(targetProfileId: string) {
  return request(`/members/blocklist/${targetProfileId}`, { method: 'POST' });
}

export async function fetchBlocklist() {
  return request('/members/blocklist');
}

export async function fetchActivityViews() {
  return request('/members/activity/views');
}

export async function fetchSuggestedProfiles() {
  return request('/members/suggested');
}

// ─── PACKAGES & UPGRADE (Section 4.10 & 7) ──────────────────

export async function fetchPackages() {
  return request('/packages');
}

export async function fetchPaymentDetails() {
  return request('/packages/payment-details');
}

export async function upgradePackage(packageId: string, paymentMode: string, notes?: string) {
  return request('/packages/upgrade', {
    method: 'POST',
    body: JSON.stringify({ packageId, paymentMode, notes }),
  });
}
