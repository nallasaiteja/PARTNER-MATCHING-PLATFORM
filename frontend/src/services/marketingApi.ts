import { API_BASE_URL, getAuthorizationHeader } from './apiConfig';

const API_BASE = `${API_BASE_URL}/marketing`;

export interface WhatsAppCampaignPayload {
  campaignName: string;
  templateId: string;
  targetAudience: 'ALL_MEMBERS' | 'UNVERIFIED_MEMBERS' | 'EXPIRED_MEMBERS' | 'FREE_MEMBERS' | 'ACTIVE_MEMBERS';
  customMessage?: string;
  templateParams?: string[];
}

export interface MarketingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface AttributionReport {
  totalMembersAnalyzed: number;
  sourceBreakdown: Record<string, number>;
  utmBreakdown: {
    sources: Record<string, number>;
    mediums: Record<string, number>;
    campaigns: Record<string, number>;
  };
  recentAttributions: Array<{
    id: string;
    fullName: string;
    registrationSource: string;
    createdAt: string;
    attributionData: Record<string, any> | null;
  }>;
}

export async function fetchMarketingTemplates(): Promise<MarketingTemplate[]> {
  const res = await fetch(`${API_BASE}/templates`, {
    headers: getAuthorizationHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch marketing templates');
  return res.json();
}

export async function triggerWhatsAppCampaign(payload: WhatsAppCampaignPayload) {
  const res = await fetch(`${API_BASE}/whatsapp-campaign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to dispatch WhatsApp campaign');
  }
  return res.json();
}

export async function fetchAttributionReport(): Promise<AttributionReport> {
  const res = await fetch(`${API_BASE}/attribution-report`, {
    headers: getAuthorizationHeader(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch attribution report');
  }
  return res.json();
}
