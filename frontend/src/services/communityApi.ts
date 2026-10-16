import { API_BASE_URL, getAuthorizationHeader } from './apiConfig';

const API_BASE = `${API_BASE_URL}/community`;

export type CommunityLevel = 'RELIGION' | 'CASTE' | 'SUB_CASTE' | 'STAR' | 'MOON_SIGN' | 'PADAM' | 'GOTHRAM';

export interface CommunityOption {
  id: string;
  name: string;
  level: CommunityLevel;
  parentId: string | null;
}

export async function fetchCommunityOptions(options: {
  parentId?: string;
  level?: CommunityLevel;
}): Promise<CommunityOption[]> {
  const query = new URLSearchParams();
  if (options.parentId) query.set('parentId', options.parentId);
  if (options.level) query.set('level', options.level);

  const response = await fetch(`${API_BASE}?${query}`, {
    headers: getAuthorizationHeader(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Unable to load community options (${response.status})`);
  }
  return response.json();
}