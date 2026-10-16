import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  suggestionsApi,
  ProfileSuggestionItem,
} from '../services/suggestionsApi';
import './MemberSuggestedProfilesSection.css';

export const MemberSuggestedProfilesSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [packageName, setPackageName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileSuggestionItem[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const res = await suggestionsApi.getMySuggestions();
      setEligible(res.eligible);
      setEligibilityReason(res.reason || null);
      setPackageName(res.package?.name || null);
      setSuggestions(res.suggestions || []);
    } catch (err: any) {
      console.error('Failed to load member suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleUpdateStatus = async (
    suggestionId: string,
    status: 'INTERESTED' | 'DECLINED',
  ) => {
    try {
      setActionLoadingId(suggestionId);
      await suggestionsApi.updateStatus(suggestionId, status);
      // Update local state
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status } : s)),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update suggestion status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="suggested-profiles-container loading-box">
        <div className="spinner-small"></div>
        <span>Loading handpicked suggestions from our relationship managers...</span>
      </div>
    );
  }

  // If member is not eligible for Suggested Profiles (e.g. Free tier or non-qualifying package)
  if (!eligible) {
    return (
      <div className="suggested-profiles-container ineligibility-card">
        <div className="ineligibility-header">
          <div className="ineligibility-icon">✨</div>
          <div className="ineligibility-content">
            <h3>Staff Suggested Profiles</h3>
            <p className="ineligibility-sub">
              {eligibilityReason ||
                'Personalized partner suggestions curated by dedicated relationship managers are available on select premium packages.'}
            </p>
          </div>
        </div>
        <div className="ineligibility-footer">
          <span className="perk-note">
            💎 Upgrade to a qualifying package to receive handpicked match recommendations.
          </span>
          <Link to="/member/upgrade" className="btn btn-sm btn-upgrade">
            Upgrade Package →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="suggested-profiles-container">
      <div className="section-head-row">
        <div>
          <h3>✨ Staff Suggested Matches</h3>
          <p className="subtitle">
            Curated partner profiles handpicked for your package ({packageName || 'Premium'}) by our matchmaking team.
          </p>
        </div>
        <button className="btn btn-xs btn-outline" onClick={loadSuggestions}>
          🔄 Refresh
        </button>
      </div>

      <div className="privacy-reminder-banner">
        🔒 <strong>Privacy Protected:</strong> Suggested profiles show community, lifestyle, and educational highlights.
        Direct contact numbers and confidential addresses remain protected and can only be unlocked through formal contact requests.
      </div>

      {suggestions.length === 0 ? (
        <div className="suggestions-empty-box">
          <span className="empty-icon">🤝</span>
          <h4>No Suggestions at the Moment</h4>
          <p>
            Our relationship managers are actively reviewing compatible profiles based on your community,
            education, and horoscope criteria. Check back shortly!
          </p>
        </div>
      ) : (
        <div className="suggestions-grid">
          {suggestions.map((item) => {
            const profile = item.suggestedProfile;
            const age = calculateAge(profile.dateOfBirth);
            const data = profile.profileData || {};

            return (
              <div key={item.id} className="suggestion-card">
                <div className="card-top">
                  <div className="avatar-wrapper">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.firstName}
                        className="member-avatar"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {profile.gender === 'FEMALE' ? '👰' : '🤵'}
                      </div>
                    )}
                  </div>
                  <div className="profile-quick-info">
                    <h4>
                      {profile.firstName} {profile.lastName?.charAt(0)}.
                    </h4>
                    <span className="member-id-tag">ID: {profile.memberId || 'PMP-MBR'}</span>
                    <div className="demographics-tag">
                      {age ? `${age} yrs` : ''} {profile.gender ? `• ${profile.gender}` : ''}
                    </div>
                  </div>
                </div>

                <div className="card-attributes">
                  {data.religion && (
                    <div className="attribute-row">
                      <span className="attr-label">Community:</span>
                      <span className="attr-val">
                        {data.religion} {data.caste ? `• ${data.caste}` : ''}
                      </span>
                    </div>
                  )}
                  {data.education && (
                    <div className="attribute-row">
                      <span className="attr-label">Education:</span>
                      <span className="attr-val">{data.education}</span>
                    </div>
                  )}
                  {data.profession && (
                    <div className="attribute-row">
                      <span className="attr-label">Profession:</span>
                      <span className="attr-val">{data.profession}</span>
                    </div>
                  )}
                  {data.city && (
                    <div className="attribute-row">
                      <span className="attr-label">Location:</span>
                      <span className="attr-val">
                        {data.city} {data.state ? `, ${data.state}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <div className="staff-note-block">
                    <strong>💡 Matchmaker Note:</strong>
                    <p>"{item.notes}"</p>
                    {item.staff && (
                      <span className="staff-attribution">
                        — Recommended by {item.staff.fullName || 'Relationship Manager'}
                      </span>
                    )}
                  </div>
                )}

                <div className="card-actions-row">
                  <div className="status-label">
                    Status:{' '}
                    <span className={`status-pill ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="action-buttons">
                    {item.status === 'PENDING' || item.status === 'VIEWED' ? (
                      <>
                        <button
                          className="btn btn-xs btn-outline-danger"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, 'DECLINED')}
                        >
                          Decline
                        </button>
                        <button
                          className="btn btn-xs btn-success"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, 'INTERESTED')}
                        >
                          ❤️ Interested
                        </button>
                      </>
                    ) : item.status === 'INTERESTED' ? (
                      <span className="interest-sent-badge">✅ Interest Logged</span>
                    ) : (
                      <span className="declined-badge">Closed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
