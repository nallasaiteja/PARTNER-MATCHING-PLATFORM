import { API_BASE_URL, getAuthHeaders, getAuthorizationHeader } from './apiConfig';

const API_BASE = `${API_BASE_URL}/success-stories`;

export interface SuccessStoryPublicItem {
  id: string;
  title: string | null;
  story: string | null;
  partner1Name: string | null;
  partner2Name: string | null;
  engagementDate: string | null;
  marriageDate: string;
  couplePhotos: string[];
  youtubeVideoUrl: string | null;
  createdAt: string;
}

export interface SuccessStoryAdminItem extends SuccessStoryPublicItem {
  partner1MemberId: string;
  partner2MemberId: string;
  partner1ProfileId?: string;
  partner2ProfileId?: string;
  isPublished: boolean;
  createdById?: string;
  updatedAt: string;
}

export interface SuccessStoriesResponse<T> {
  stories: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSuccessStoryPayload {
  partner1MemberId: string;
  partner2MemberId: string;
  partner1Name?: string;
  partner2Name?: string;
  title?: string;
  story?: string;
  engagementDate?: string;
  marriageDate: string;
  couplePhotos: string[];
  youtubeVideoUrl?: string;
  isPublished?: boolean;
}

export interface UpdateSuccessStoryPayload {
  partner1MemberId?: string;
  partner2MemberId?: string;
  partner1Name?: string;
  partner2Name?: string;
  title?: string;
  story?: string;
  engagementDate?: string;
  marriageDate?: string;
  couplePhotos?: string[];
  youtubeVideoUrl?: string;
  isPublished?: boolean;
}

/**
 * Public: Fetch published success stories
 */
export async function getPublicSuccessStories(
  page = 1,
  limit = 12,
  search = '',
): Promise<SuccessStoriesResponse<SuccessStoryPublicItem>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
  });

  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch success stories');
  }
  return res.json();
}

/**
 * Public: Get single story by ID
 */
export async function getPublicSuccessStory(id: string): Promise<SuccessStoryPublicItem> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch success story details');
  }
  return res.json();
}

/**
 * Admin: Fetch all stories (with filter and member IDs)
 */
export async function getAdminSuccessStories(
  page = 1,
  limit = 20,
  isPublished = '',
  search = '',
): Promise<SuccessStoriesResponse<SuccessStoryAdminItem>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(isPublished !== '' ? { isPublished } : {}),
    ...(search ? { search } : {}),
  });

  const res = await fetch(`${API_BASE}/admin/all?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch admin success stories');
  }
  return res.json();
}

/**
 * Admin: Create success story
 */
export async function createSuccessStory(
  payload: CreateSuccessStoryPayload,
): Promise<SuccessStoryAdminItem> {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create success story');
  }
  return res.json();
}

/**
 * Admin: Update success story
 */
export async function updateSuccessStory(
  id: string,
  payload: UpdateSuccessStoryPayload,
): Promise<SuccessStoryAdminItem> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update success story');
  }
  return res.json();
}

/**
 * Admin: Toggle publication status
 */
export async function togglePublishSuccessStory(
  id: string,
  isPublished: boolean,
): Promise<SuccessStoryAdminItem> {
  const res = await fetch(`${API_BASE}/${id}/publish`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isPublished }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to toggle publication status');
  }
  return res.json();
}

/**
 * Admin: Delete success story
 */
export async function deleteSuccessStory(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete success story');
  }
  return res.json();
}

/**
 * Admin: Upload couple photo
 */
export async function uploadSuccessStoryPhoto(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_BASE}/upload-photo`, {
    method: 'POST',
    headers: getAuthorizationHeader(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Photo upload failed');
  }
  return res.json();
}
