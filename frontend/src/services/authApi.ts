import { API_BASE_URL, getAuthorizationHeader } from './apiConfig';

const API_BASE = `${API_BASE_URL}/auth`;

async function post(path: string, data?: Record<string, string>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthorizationHeader() },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`);
  return result;
}

export const requestMobileOtp = () => post('/verification/mobile/request');
export const verifyMobileOtp = (code: string) => post('/verification/mobile/verify', { code });
export const requestEmailOtp = () => post('/verification/email/request');
export const verifyEmailOtp = (code: string) => post('/verification/email/verify', { code });
export const forgotPassword = (email: string) => post('/password/forgot', { email });
export const resetPassword = (token: string, newPassword: string) => post('/password/reset', { token, newPassword });

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await fetch(`${API_BASE}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthorizationHeader() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`);
  return result;
}