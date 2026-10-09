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
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  currentStep?: number;
  completedSteps?: number[];
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
    dateOfBirth?: string;
    currentStep?: number;
    completedSteps?: number[];
    idProofType?: string;
    idProofNumber?: string;
    timeOfBirth?: string;
    birthPlace?: string;
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
