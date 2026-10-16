import { API_BASE_URL, getAuthHeaders } from './apiConfig';

const API_BASE = `${API_BASE_URL}/careers`;

export interface EducationQualification {
  qualification: string; // "10TH", "INTERMEDIATE", "DEGREE", "POSTGRADUATE", "ADDITIONAL"
  yearOfPassing: string;
  educationType: 'REGULAR' | 'DISTANCE';
  certificateUrl?: string;
}

export interface CareerApplicationData {
  id: string;
  applicationNumber: string;
  mobile: string;
  name: string;
  surname: string;
  gender: string;
  maritalStatus: string;
  email: string;
  dateOfBirth: string;
  religion: string;
  caste: string;

  state: string;
  district: string;
  mandal: string;
  temporaryAddress: string;
  permanentAddress: string;

  idProofType: string;
  idProofNumber: string;
  idProofUrl: string;
  panCardUrl: string;

  educationDetails: EducationQualification[];
  experienceYears: number;
  fatherName?: string | null;
  fatherProfession?: string | null;
  motherName?: string | null;
  motherProfession?: string | null;

  referenceName?: string | null;
  referenceMobile?: string | null;
  referenceAddress?: string | null;

  photos: string[];
  timeTakenSeconds: number;

  status: 'PENDING' | 'REGISTERED_AS_STAFF' | 'BLOCKED';
  blockedReason?: string | null;
  blockedAt?: string | null;
  blockedById?: string | null;

  registeredStaffId?: string | null;
  registeredAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface SubmitCareerPayload {
  mobile: string;
  otp: string;
  name: string;
  surname: string;
  gender: string;
  maritalStatus: string;
  email: string;
  dateOfBirth: string;
  religion: string;
  caste: string;

  state: string;
  district: string;
  mandal: string;
  temporaryAddress: string;
  permanentAddress: string;

  idProofType: string;
  idProofNumber: string;
  idProofUrl: string;
  panCardUrl: string;

  educationDetails: EducationQualification[];
  experienceYears?: number;
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;

  referenceName?: string;
  referenceMobile?: string;
  referenceAddress?: string;

  photos?: string[];
  timeTakenSeconds?: number;
}

/**
 * Public: Request OTP
 */
export async function sendCareerOtp(mobile: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const res = await fetch(`${API_BASE}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to send OTP');
  }
  return res.json();
}

/**
 * Public: Verify OTP
 */
export async function verifyCareerOtp(mobile: string, otp: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'OTP verification failed');
  }
  return res.json();
}

/**
 * Public: Upload career file (ID proof, PAN, Certificate, Photo)
 */
export async function uploadCareerDocument(file: File): Promise<{ url: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload-document`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Document upload failed');
  }
  return res.json();
}

/**
 * Public: Submit Career Application
 */
export async function submitCareerApplication(payload: SubmitCareerPayload): Promise<{
  success: boolean;
  message: string;
  applicationNumber: string;
  id: string;
}> {
  const res = await fetch(`${API_BASE}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit application');
  }
  return res.json();
}

/**
 * Admin: List career applications
 */
export async function getAdminCareerApplications(
  status = '',
  search = '',
  page = 1,
  limit = 20,
): Promise<{
  applications: CareerApplicationData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  });

  const res = await fetch(`${API_BASE}/applications?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load applications');
  }
  return res.json();
}

/**
 * Admin: Get single application
 */
export async function getAdminCareerApplication(id: string): Promise<CareerApplicationData> {
  const res = await fetch(`${API_BASE}/applications/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch application');
  }
  return res.json();
}

/**
 * Admin: Block application
 */
export async function blockCareerApplication(
  id: string,
  reason: string,
): Promise<CareerApplicationData> {
  const res = await fetch(`${API_BASE}/applications/${id}/block`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to block application');
  }
  return res.json();
}

/**
 * Admin: Register applicant directly as staff
 */
export async function registerCareerApplicantAsStaff(
  id: string,
  payload: {
    role: string;
    organizationId?: string;
    staffDivision?: string;
    temporaryPassword?: string;
  },
): Promise<{
  success: boolean;
  message: string;
  staffUser: any;
  temporaryPassword: string;
  application: CareerApplicationData;
}> {
  const res = await fetch(`${API_BASE}/applications/${id}/register-staff`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to register applicant as staff');
  }
  return res.json();
}
