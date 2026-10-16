import { API_BASE_URL, getAuthorizationHeader } from './apiConfig';

const API_BASE = `${API_BASE_URL}/locations`;

export interface LocationOption {
  id: string;
  name: string;
  level: 'COUNTRY' | 'STATE' | 'DISTRICT' | 'MANDAL' | 'VILLAGE';
  parentId: string | null;
}

export async function fetchLocationChildren(parentId?: string): Promise<LocationOption[]> {
  const query = new URLSearchParams();
  if (parentId) query.set('parentId', parentId);

  const response = await fetch(`${API_BASE}${query.size ? `?${query}` : ''}`, {
    headers: getAuthorizationHeader(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Unable to load location options (${response.status})`);
  }

  return response.json();
}