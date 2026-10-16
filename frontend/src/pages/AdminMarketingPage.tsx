import React, { useState, useEffect } from 'react';
import {
  fetchMarketingTemplates,
  fetchAttributionReport,
  triggerWhatsAppCampaign,
  MarketingTemplate,
  AttributionReport,
} from '../services/marketingApi';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import './AdminMarketingPage.css';

export const AdminMarketingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attribution' | 'whatsapp' | 'media'>('attribution');
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [attribution, setAttribution] = useState<AttributionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // WhatsApp Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('festival_wishes_v1');
  const [targetAudience, setTargetAudience] = useState<'ALL_MEMBERS' | 'UNVERIFIED_MEMBERS' | 'EXPIRED_MEMBERS' | 'FREE_MEMBERS' | 'ACTIVE_MEMBERS'>('ALL_MEMBERS');
  const [customMessage, setCustomMessage] = useState('');
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  // Media preview
  const [testVideoUrl, setTestVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tmplData, attrData] = await Promise.all([
        fetchMarketingTemplates(),
        fetchAttributionReport(),
      ]);
      setTemplates(tmplData);
      setAttribution(attrData);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load marketing dashboard' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a campaign name.' });
      return;
    }

    setSubmittingCampaign(true);
    setFeedback(null);
    try {
      const result = await triggerWhatsAppCampaign({
        campaignName: campaignName.trim(),
        templateId: selectedTemplate,
        targetAudience,
        customMessage: customMessage.trim() || undefined,
      });

      const modeNotice = result.simulated
        ? ' (Simulated Dev Mode - safe testing dispatch)'
        : ' (Dispatched via WhatsApp Business Cloud API)';

      setFeedback({
        type: 'success',
        message: `${result.message}${modeNotice}`,
      });
      setCampaignName('');
      setCustomMessage('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source.toUpperCase()) {
      case 'GOOGLE': return 'badge-source badge-google';
      case 'FACEBOOK': return 'badge-source badge-facebook';
      case 'WHATSAPP': return 'badge-source badge-whatsapp';
      case 'FRIEND_REFERRAL': return 'badge-source badge-friend_referral';
      case 'OTHER': return 'badge-source badge-other';
      default: return 'badge-source badge-direct';
    }
  };

  return (
    <div className="marketing-page-container">
      <div className="marketing-header">
        <h1>🎯 Marketing & SEO Integration</h1>
        <p>Manage WhatsApp marketing campaigns, traffic source attribution, conversion tracking, and media embeds.</p>
      </div>

      <div className="marketing-tabs">
        <button
          className={`marketing-tab-btn ${activeTab === 'attribution' ? 'active' : ''}`}
          onClick={() => setActiveTab('attribution')}
        >
          📊 Referral & Source Attribution
        </button>
        <button
          className={`marketing-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          💬 WhatsApp Marketing Campaigns
        </button>
        <button
          className={`marketing-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          🎬 Media & SEO Preview
        </button>
      </div>

      {feedback && (
        <div className={`feedback-banner ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {loading && <p>Loading marketing insights...</p>}

      {!loading && activeTab === 'attribution' && attribution && (
        <div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Total Analyzed Registrations</div>
              <div className="stat-val">{attribution.totalMembersAnalyzed}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Google Ads / Organic</div>
              <div className="stat-val">{attribution.sourceBreakdown.GOOGLE || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Facebook / Instagram</div>
              <div className="stat-val">{attribution.sourceBreakdown.FACEBOOK || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">WhatsApp Referral</div>
              <div className="stat-val">{attribution.sourceBreakdown.WHATSAPP || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Friend Referrals</div>
              <div className="stat-val">{attribution.sourceBreakdown.FRIEND_REFERRAL || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Direct & Organic</div>
              <div className="stat-val">{attribution.sourceBreakdown.DIRECT || 0}</div>
            </div>
          </div>

          <div className="marketing-card">
            <h2>Acquisition Channels Breakdown</h2>
            <table className="attribution-table">
              <thead>
                <tr>
                  <th>Acquisition Channel</th>
                  <th>Total Registered</th>
                  <th>Share of Acquisition</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(attribution.sourceBreakdown).map(([source, count]) => {
                  const pct = attribution.totalMembersAnalyzed > 0
                    ? ((count / attribution.totalMembersAnalyzed) * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={source}>
                      <td><span className={getSourceBadgeClass(source)}>{source}</span></td>
                      <td><strong>{count}</strong> members</td>
                      <td>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="marketing-card">
            <h2>Campaign UTM Breakdown</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>UTM Sources</h4>
                {Object.keys(attribution.utmBreakdown.sources).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No UTM sources captured yet</p>
                ) : (
                  Object.entries(attribution.utmBreakdown.sources).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <strong>{k}</strong>: {v}
                    </div>
                  ))
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>UTM Mediums</h4>
                {Object.keys(attribution.utmBreakdown.mediums).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No UTM mediums captured yet</p>
                ) : (
                  Object.entries(attribution.utmBreakdown.mediums).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <strong>{k}</strong>: {v}
                    </div>
                  ))
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>UTM Campaigns</h4>
                {Object.keys(attribution.utmBreakdown.campaigns).length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>No UTM campaigns captured yet</p>
                ) : (
                  Object.entries(attribution.utmBreakdown.campaigns).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <strong>{k}</strong>: {v}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="marketing-card">
            <h2>Recent Member Registrations & Acquisition Source</h2>
            <table className="attribution-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Source</th>
                  <th>Registration Date</th>
                  <th>Attribution Metadata</th>
                </tr>
              </thead>
              <tbody>
                {attribution.recentAttributions.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.fullName}</strong></td>
                    <td><span className={getSourceBadgeClass(item.registrationSource)}>{item.registrationSource}</span></td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      {item.attributionData ? (
                        <code style={{ fontSize: '11px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                          {JSON.stringify(item.attributionData)}
                        </code>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>Direct Visit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'whatsapp' && (
        <div className="marketing-card">
          <h2>💬 Dispatch WhatsApp Business Campaign</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
            Trigger platform-branded message templates to targeted member groups. Uses WhatsApp Business API credentials when configured; safely simulates test dispatch in development mode.
          </p>

          <form onSubmit={handleSendCampaign}>
            <div className="form-grid">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Matchmaking Special 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Approved Template *</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Target Audience *</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                >
                  <option value="ALL_MEMBERS">All Active Members</option>
                  <option value="FREE_MEMBERS">Free Members (Upgrade Campaign)</option>
                  <option value="EXPIRED_MEMBERS">Expired Packages (Renewal Campaign)</option>
                  <option value="UNVERIFIED_MEMBERS">Unverified Profiles (Verification Reminder)</option>
                  <option value="ACTIVE_MEMBERS">Active Paid Members</option>
                </select>
              </div>

              <div className="form-group">
                <label>Custom Body / Fallback Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Custom greetings or additional details"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submittingCampaign}
              >
                {submittingCampaign ? 'Dispatching...' : '🚀 Dispatch WhatsApp Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && activeTab === 'media' && (
        <div className="marketing-card">
          <h2>🎬 YouTube Embed & XSS Protection Validator</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Safely render video embeds for introductory guides and success stories. The component enforces strict domain and identifier regex checks, blocking arbitrary iframe injection.
          </p>

          <div className="form-group" style={{ maxWidth: '600px', marginBottom: '20px' }}>
            <label>YouTube Video URL</label>
            <input
              type="text"
              value={testVideoUrl}
              onChange={(e) => setTestVideoUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            />
          </div>

          <div style={{ maxWidth: '640px' }}>
            <YouTubeEmbed url={testVideoUrl} title="Marketing Video Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarketingPage;
