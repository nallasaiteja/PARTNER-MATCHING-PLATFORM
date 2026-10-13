import React, { useState } from 'react';
import { sendInterest, toggleShortlist, toggleBlocklist } from '../services/memberApi';
import './MatchCard.css';

interface MatchCardProps {
  match: any;
  onViewProfile: (matchId: string) => void;
  onRevealContact?: (matchId: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onViewProfile,
  onRevealContact,
}) => {
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="match-card">
      {/* Photo / Thumbnail Area */}
      <div className="card-media-wrapper">
        {match.isPhotoHidden || !match.photoUrl ? (
          <div className="photo-hidden-placeholder">
            <span className="lock-icon">🔒</span>
            <span className="lock-label">Photo visible to Paid members</span>
          </div>
        ) : (
          <img src={match.photoUrl} alt={match.name} className="profile-thumbnail" />
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

      {/* Profile Details */}
      <div className="card-body">
        <div className="card-title-row">
          <h3 className="candidate-name">{match.name}</h3>
          <span className="candidate-age-gender">
            {match.age} yrs, {match.height}
          </span>
        </div>

        <div className="detail-tags-row">
          <span className="detail-pill pill-caste">{match.caste} ({match.religion})</span>
          <span className="detail-pill pill-marital">{match.maritalStatus}</span>
        </div>

        <div className="candidate-info-list">
          <div className="info-line">
            <span className="info-key">Education:</span>
            <span className="info-val">{match.education}</span>
          </div>
          <div className="info-line">
            <span className="info-key">Profession:</span>
            <span className="info-val">{match.profession}</span>
          </div>
          <div className="info-line">
            <span className="info-key">Salary / Income:</span>
            <span className="info-val">{match.salary}</span>
          </div>
          <div className="info-line">
            <span className="info-key">Location:</span>
            <span className="info-val">{match.location}</span>
          </div>
        </div>

        {/* Contact Status */}
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
                {match.isPaidOnly ? 'Contact reveals subject to preference' : 'Contact for Paid Members'}
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

        {/* Action Buttons */}
        <div className="card-action-buttons">
          <button
            onClick={() => onViewProfile(match.id)}
            className="btn-action-view"
          >
            View Profile
          </button>
          <button
            onClick={handleSendInterest}
            disabled={loading || interestSent}
            className={`btn-action-interest ${interestSent ? 'sent' : ''}`}
          >
            {interestSent ? 'Interest Sent' : 'Send Interest'}
          </button>
          <button onClick={handleBlock} className="btn-action-block" title="Block Profile">
            🚫
          </button>
        </div>
      </div>
    </div>
  );
};
