import React, { useEffect, useState } from 'react';
import { fetchMatchDetail, revealContact, sendInterest } from '../services/memberApi';
import { resolveMediaUrl } from '../services/apiConfig';
import './MatchDetailModal.css';

interface MatchDetailModalProps {
  profileId: string | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ profileId, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'career' | 'family' | 'prefs'>('personal');
  const [revealMsg, setRevealMsg] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [interestSent, setInterestSent] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    fetchMatchDetail(profileId)
      .then((res) => setProfile(res))
      .catch((err) => setError(err.message || 'Failed to load details'))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (!profileId) return null;

  const handleRevealContact = async () => {
    setRevealing(true);
    setRevealMsg(null);
    try {
      const res = await revealContact(profileId);
      setRevealMsg(res.message);
      // Reload profile to refresh contact state
      const updated = await fetchMatchDetail(profileId);
      setProfile(updated);
    } catch (err: any) {
      setRevealMsg(`⚠️ ${err.message}`);
    } finally {
      setRevealing(false);
    }
  };

  const handleSendInterest = async () => {
    try {
      await sendInterest(profileId);
      setInterestSent(true);
      alert('Interest sent successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pData = profile?.profileData || {};
  const step1 = pData.step1 || {};
  const step2 = pData.step2 || {};
  const step3 = pData.step3 || {};
  const step4 = pData.step4 || {};

  return (
    <div className="match-modal-overlay">
      <div className="match-modal-box">
        <button className="match-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {loading ? (
          <div className="modal-loading-state">
            <div className="spinner"></div>
            <p>Loading member profile details...</p>
          </div>
        ) : error || !profile ? (
          <div className="modal-error-state">
            <h3>Unable to access profile</h3>
            <p>{error}</p>
            <button onClick={onClose} className="btn-modal-close">Close</button>
          </div>
        ) : (
          <div className="modal-inner">
            {/* Header Banner */}
            <div className="modal-header-banner">
              <div className="banner-photo-col">
                {profile.isPhotoHidden ? (
                  <div className="modal-photo-locked">
                    <span>🔒</span>
                    <small>Photo visible to Paid members</small>
                  </div>
                ) : (
                  <img
                    src={profile.photoUrl ? resolveMediaUrl(profile.photoUrl) : ((profile.gender || '').toLowerCase().startsWith('f') ? 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600' : 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600')}
                    alt={profile.name}
                    className="modal-photo-img"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = (profile.gender || '').toLowerCase().startsWith('f')
                        ? 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600'
                        : 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=600';
                    }}
                  />
                )}
              </div>
              <div className="banner-info-col">
                <span className="banner-member-id">ID: {profile.memberId}</span>
                <h2>{profile.name}</h2>
                <p className="banner-sub">
                  {profile.age} Years • {profile.height} • {profile.maritalStatus}
                </p>
                <p className="banner-caste">
                  {profile.caste} ({profile.religion})
                </p>

                {/* Contact Reveal Box */}
                <div className="modal-contact-box">
                  {profile.mobile ? (
                    <div className="contact-revealed-row">
                      <span>📞 Mobile: <strong>{profile.mobile}</strong></span>
                      {profile.email && <span>✉️ Email: <strong>{profile.email}</strong></span>}
                    </div>
                  ) : (
                    <div className="contact-locked-row">
                      <span>🔒 Contact number hidden</span>
                      <button
                        onClick={handleRevealContact}
                        disabled={revealing}
                        className="btn-modal-reveal"
                      >
                        {revealing ? 'Requesting...' : 'Reveal Contact Number'}
                      </button>
                    </div>
                  )}
                  {revealMsg && <div className="reveal-feedback-msg">{revealMsg}</div>}
                </div>
              </div>
            </div>

            {/* Tabs Bar */}
            <div className="modal-tabs-bar">
              <button
                className={`modal-tab ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                Personal Details
              </button>
              <button
                className={`modal-tab ${activeTab === 'career' ? 'active' : ''}`}
                onClick={() => setActiveTab('career')}
              >
                Education & Career
              </button>
              <button
                className={`modal-tab ${activeTab === 'family' ? 'active' : ''}`}
                onClick={() => setActiveTab('family')}
              >
                Family Background
              </button>
              <button
                className={`modal-tab ${activeTab === 'prefs' ? 'active' : ''}`}
                onClick={() => setActiveTab('prefs')}
              >
                Partner Preferences
              </button>
            </div>

            {/* Tab Contents */}
            <div className="modal-tab-content">
              {activeTab === 'personal' && (
                <div className="info-grid-2">
                  <div className="info-item"><label>Date of Birth</label><span>{new Date(profile.dateOfBirth).toLocaleDateString()} ({profile.age} yrs)</span></div>
                  <div className="info-item"><label>Gender</label><span>{profile.gender}</span></div>
                  <div className="info-item"><label>Marital Status</label><span>{profile.maritalStatus}</span></div>
                  <div className="info-item"><label>Height</label><span>{profile.height}</span></div>
                  <div className="info-item"><label>Religion</label><span>{profile.religion}</span></div>
                  <div className="info-item"><label>Caste</label><span>{profile.caste}</span></div>
                  <div className="info-item"><label>Living City / District</label><span>{profile.location}</span></div>
                  <div className="info-item"><label>Complexion</label><span>{step1.complexion || 'Not specified'}</span></div>
                  <div className="info-item"><label>Star / Raasi</label><span>{step1.star ? `${step1.star} / ${step1.moonSign || ''}` : 'Not specified'}</span></div>
                  <div className="info-item"><label>Kuja Dosham</label><span>{step1.kujaDosham || 'None'}</span></div>
                </div>
              )}

              {activeTab === 'career' && (
                <div className="info-grid-2">
                  <div className="info-item"><label>Education</label><span>{profile.education}</span></div>
                  <div className="info-item"><label>Employed In</label><span>{step2.employedIn || 'Private Sector'}</span></div>
                  <div className="info-item"><label>Profession</label><span>{profile.profession}</span></div>
                  <div className="info-item"><label>Annual Salary</label><span>{profile.salary}</span></div>
                  <div className="info-item"><label>Working City</label><span>{step2.workingCity || profile.location}</span></div>
                  <div className="info-item"><label>Working Country</label><span>{step2.workingLocation || 'India'}</span></div>
                </div>
              )}

              {activeTab === 'family' && (
                <div className="info-grid-2">
                  <div className="info-item"><label>Father's Name</label><span>{step3.fatherName || 'Confidential'}</span></div>
                  <div className="info-item"><label>Father's Status</label><span>{step3.fatherStatus || 'Alive'}</span></div>
                  <div className="info-item"><label>Mother's Name</label><span>{step3.motherName || 'Confidential'}</span></div>
                  <div className="info-item"><label>Mother's Status</label><span>{step3.motherStatus || 'Alive'}</span></div>
                  <div className="info-item"><label>Family Status</label><span>{step3.familyStatus || 'Middle Class'}</span></div>
                  <div className="info-item"><label>Family Type</label><span>{step3.familyType || 'Nuclear'}</span></div>
                </div>
              )}

              {activeTab === 'prefs' && (
                <div className="info-grid-2">
                  <div className="info-item"><label>Preferred Age Range</label><span>{step4.ageRangeMin || 21} to {step4.ageRangeMax || 35} yrs</span></div>
                  <div className="info-item"><label>Preferred Height Range</label><span>{step4.heightRangeMin || "5'0\""} to {step4.heightRangeMax || "6'0\""}</span></div>
                  <div className="info-item"><label>Preferred Marital Status</label><span>{step4.preferredMaritalStatus?.join(', ') || 'Unmarried'}</span></div>
                  <div className="info-item"><label>Inter-caste Marriage</label><span>{step4.interCasteAllowed ? 'Accepted' : 'Same Caste Only'}</span></div>
                  <div className="info-item"><label>Kuja Dosham Preference</label><span>{step4.kujaDoshamPreference || 'Any'}</span></div>
                  <div className="info-item"><label>Preferred Location</label><span>{step4.preferredWorkingLocation || 'Any'}</span></div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="modal-footer-bar">
              <button onClick={onClose} className="btn-footer-close">
                Back to Results
              </button>
              <button
                onClick={handleSendInterest}
                disabled={interestSent}
                className="btn-footer-interest"
              >
                {interestSent ? 'Interest Sent' : 'Send Interest'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
