/**
 * Profile API Service
 * Handles communication with backend /api/v1/profiles endpoints.
 */

import {
  API_BASE_URL,
  getAuthHeaders,
  getAuthorizationHeader,
  validateUploadFile,
  uploadWithProgress,
} from './apiConfig';

const API_BASE = API_BASE_URL;

export async function uploadIdProof(
  profileId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; filename: string }> {
  const validation = validateUploadFile(file, {
    maxBytes: 5 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    label: 'ID proof document',
  });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const body = new FormData();
  body.append('idProof', file);

  return uploadWithProgress<{ url: string; filename: string }>(
    `${API_BASE}/uploads/id-proof/${profileId}`,
    body,
    onProgress,
  );
}

export async function uploadProfilePhoto(
  profileId: string,
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; filename: string }> {
  const validation = validateUploadFile(file, {
    maxBytes: 500 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'Profile photo',
  });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const body = new FormData();
  body.append('photo', file, 'profile-photo.jpg');

  return uploadWithProgress<{ url: string; filename: string }>(
    `${API_BASE}/uploads/photo/${profileId}`,
    body,
    onProgress,
  );
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

export async function verifyIdProof(
  profileId: string,
  verified: boolean,
  rejectionReason?: string,
): Promise<any> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}/id-proof/verification`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ verified, rejectionReason }),
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
