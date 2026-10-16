import { API_BASE_URL, getAuthHeaders } from './apiConfig';

const API_BASE = `${API_BASE_URL}/suggestions`;

export interface SuggestedProfileDetail {
  id: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  photoUrl?: string | null;
  profileData?: any;
}

export interface ProfileSuggestionItem {
  id: string;
  staffId: string;
  suggestedProfileId: string;
  receivingMemberProfileId: string;
  status: 'PENDING' | 'VIEWED' | 'INTERESTED' | 'DECLINED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  suggestedProfile: SuggestedProfileDetail;
  receivingMemberProfile?: {
    id: string;
    memberId: string | null;
    firstName: string;
    lastName: string;
    packageType?: string;
    currentPackage?: { name: string } | null;
  };
  staff?: {
    id?: string;
    fullName: string | null;
    employeeId: string | null;
    organization?: { id: string; name: string } | null;
  };
}

export interface PackageEligibilityItem {
  id: string;
  name: string;
  cost: number;
  validityDays: number;
  suggestedProfilesEligible: boolean;
  featuredProfileEligible: boolean;
  isActive: boolean;
}

export const suggestionsApi = {
  async createSuggestion(data: {
    suggestedProfileId: string;
    receivingMemberProfileId: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; suggestion: ProfileSuggestionItem }> {
    const res = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to submit profile suggestion');
    return json;
  },

  async getMySuggestions(): Promise<{
    eligible: boolean;
    reason?: string;
    package?: any;
    suggestions: ProfileSuggestionItem[];
  }> {
    const res = await fetch(`${API_BASE}/my-suggestions`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch suggested profiles');
    return json;
  },

  async updateStatus(
    id: string,
    status: 'VIEWED' | 'INTERESTED' | 'DECLINED',
  ): Promise<{ success: boolean; suggestion: ProfileSuggestionItem }> {
    const res = await fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update suggestion status');
    return json;
  },

  async listPackages(): Promise<PackageEligibilityItem[]> {
    const res = await fetch(`${API_BASE}/packages`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch packages');
    return json;
  },

  async togglePackageEligibility(
    packageId: string,
    eligible: boolean,
  ): Promise<{ success: boolean; message: string; package: any }> {
    const res = await fetch(`${API_BASE}/packages/${packageId}/eligibility`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eligible }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update package eligibility');
    return json;
  },

  async getHistory(params?: {
    staffId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    suggestions: ProfileSuggestionItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.staffId) query.append('staffId', params.staffId);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/history?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch suggestion history');
    return json;
  },
};
