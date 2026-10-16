import React, { useState } from 'react';
import { sendInterest, toggleShortlist, toggleBlocklist } from '../services/memberApi';
import { resolveMediaUrl } from '../services/apiConfig';
import './MatchCard.css';

interface MatchCardProps {
  match: any;
  onViewProfile: (matchId: string) => void;
  onRevealContact?: (matchId: string) => void;
}

const DEFAULT_INDIAN_FEMALE = 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600';
const DEFAULT_INDIAN_MALE = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600';

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onViewProfile,
  onRevealContact,
}) => {
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFemale = (match.gender || '').toLowerCase().startsWith('f');
  const defaultIndianPhoto = isFemale ? DEFAULT_INDIAN_FEMALE : DEFAULT_INDIAN_MALE;
  const resolvedPhoto = match.photoUrl ? resolveMediaUrl(match.photoUrl) : defaultIndianPhoto;

  const handleSendInterest = async () => {
    setLoading(true);
    try {
      await sendInterest(match.id);
      setInterestSent(true);
      setActionMsg('💌 Interest Sent');
    } catch (err: any) {
      setActionMsg(`⚠️ ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleToggleShortlist = async () => {
    try {
      const res = await toggleShortlist(match.id);
      setShortlisted(res.shortlisted);
      setActionMsg(res.shortlisted ? '⭐ Shortlisted' : 'Removed from Shortlist');
    } catch (err: any) {
      setActionMsg(`⚠️ ${err.message}`);
    } finally {
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${match.name}? Neither of you will see each other in results.`)) return;
    try {
      await toggleBlocklist(match.id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="match-card match-card-horizontal">
      {/* Photo / Thumbnail Area */}
      <div className="card-media-wrapper">
        {match.isPhotoHidden ? (
          <div className="photo-hidden-placeholder">
            <span className="lock-icon">🔒</span>
            <span className="lock-label">Photo visible to Paid members</span>
          </div>
        ) : (
          <img
            src={resolvedPhoto}
            alt={match.name}
            className="profile-thumbnail"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = defaultIndianPhoto;
            }}
          />
        )}
        <div className="card-top-badges">
          <span className="member-id-tag">{match.memberId}</span>
          <button
            onClick={handleToggleShortlist}
            className={`btn-shortlist-star ${shortlisted ? 'starred' : ''}`}
            title="Shortlist Profile"
          >
            ★
          </button>
        </div>
      </div>

      {/* Profile Details (Horizontal layout) */}
      <div className="card-body">
        <div className="card-header-section">
          <div className="card-title-row">
            <div className="name-and-verified">
              <h3 className="candidate-name">{match.name}</h3>
              <span className="verified-check-badge" title="Verified Telugu Profile">✓ Verified</span>
            </div>
            <span className="candidate-age-gender">
              {match.age} yrs • {match.height || '5\'6"'}
            </span>
          </div>

          <div className="detail-tags-row">
            <span className="detail-pill pill-caste">{match.caste || 'Telugu'} ({match.religion || 'Hindu'})</span>
            <span className="detail-pill pill-marital">{match.maritalStatus || 'Never Married'}</span>
            {match.gothram && <span className="detail-pill pill-sub">Gothram: {match.gothram}</span>}
            {match.star && <span className="detail-pill pill-star">⭐ {match.star}</span>}
          </div>
        </div>

        {/* 2-Column Key Attribute Grid */}
        <div className="candidate-info-list">
          <div className="info-line">
            <span className="info-key">🎓 Education:</span>
            <span className="info-val" title={match.education}>{match.education || 'Graduate'}</span>
          </div>
          <div className="info-line">
            <span className="info-key">💼 Profession:</span>
            <span className="info-val" title={match.profession}>{match.profession || 'Working Professional'}</span>
          </div>
          <div className="info-line">
            <span className="info-key">💰 Annual Income:</span>
            <span className="info-val">{match.salary || 'Disclosed to matches'}</span>
          </div>
          <div className="info-line">
            <span className="info-key">📍 Location:</span>
            <span className="info-val">{match.location || 'Hyderabad, Telangana'}</span>
          </div>
        </div>

        {/* Contact Status & Action Toolbar Row */}
        <div className="card-bottom-row">
          <div className="contact-status-bar">
            {match.mobile ? (
              <div className="revealed-phone-box">
                <span className="phone-icon">📞</span>
                <strong>{match.mobile}</strong>
              </div>
            ) : (
              <div className="hidden-phone-box">
                <span className="phone-icon">🔒</span>
                <span className="phone-text">
                  {match.isPaidOnly ? 'Contact reveals subject to preference' : 'Contact visible to Paid Members'}
                </span>
                {onRevealContact && match.isPaidOnly && (
                  <button onClick={() => onRevealContact(match.id)} className="btn-request-contact">
                    Reveal
                  </button>
                )}
              </div>
            )}
          </div>

          {actionMsg && <div className="card-feedback-banner">{actionMsg}</div>}

          {/* Action Buttons Toolbar */}
          <div className="card-action-buttons">
            <button
              onClick={() => onViewProfile(match.id)}
              className="btn-action-view"
            >
              👁️ View Profile
            </button>
            <button
              onClick={handleSendInterest}
              disabled={loading || interestSent}
              className={`btn-action-interest ${interestSent ? 'sent' : ''}`}
            >
              {interestSent ? '💌 Sent' : '💌 Send Interest'}
            </button>
            <button onClick={handleBlock} className="btn-action-block" title="Block Profile">
              🚫
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
