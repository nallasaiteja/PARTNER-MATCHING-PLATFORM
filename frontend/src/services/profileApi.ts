/**
 * Profile API Service
 * Handles communication with backend /api/v1/profiles endpoints.
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAuthorizationHeader(): HeadersInit {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadIdProof(profileId: string, file: File): Promise<{ url: string; filename: string }> {
  const body = new FormData();
  body.append('idProof', file);
  const response = await fetch(`${API_BASE}/uploads/id-proof/${profileId}`, {
    method: 'POST',
    headers: getAuthorizationHeader(),
    body,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to upload ID proof (${response.status})`);
  }
  return response.json();
}

export async function downloadIdProof(profileId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/uploads/id-proof/${profileId}`, {
    headers: getAuthorizationHeader(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to download ID proof (${response.status})`);
  }
  return response.blob();
}

export async function verifyIdProof(profileId: string, verified: boolean): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}/id-proof/verification`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ verified }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update ID proof review (${response.status})`);
  }
  return response.json();
}

export async function fetchContactRevealPackages(): Promise<{ packageTypes: string[] }> {
  const response = await fetch(`${API_BASE}/profiles/settings/contact-reveal`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Unable to load contact reveal eligibility');
  return response.json();
}

export async function setContactRevealPackages(packageTypes: string[]): Promise<{ packageTypes: string[] }> {
  const response = await fetch(`${API_BASE}/profiles/settings/contact-reveal`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ packageTypes }),
  });
  const errorData = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorData.message || 'Unable to save contact reveal eligibility');
  return errorData;
}

export async function fetchProfileById(profileId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch profile (${response.status})`);
  }

  return response.json();
}

export async function fetchMyProfile(): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch user profile (${response.status})`);
  }

  return response.json();
}

export async function createProfile(data: {
  mobile: string;
  email?: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  currentStep?: number;
  completedSteps?: number[];
  idProofType?: string;
  idProofNumber?: string;
  timeOfBirth?: string;
  birthPlace?: string;
  photoUrl?: string;
  idProofFileUrl?: string;
  profileData?: Record<string, any>;
}): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create profile (${response.status})`);
  }

  return response.json();
}

export async function updateProfile(
  profileId: string,
  data: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    mobile?: string;
    email?: string;
    dateOfBirth?: string;
    currentStep?: number;
    completedSteps?: number[];
    idProofType?: string;
    idProofNumber?: string;
    timeOfBirth?: string;
    birthPlace?: string;
    photoUrl?: string;
    idProofFileUrl?: string;
    profileData?: Record<string, any>;
  },
): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update profile (${response.status})`);
  }

  return response.json();
}
