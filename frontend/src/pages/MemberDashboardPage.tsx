import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMemberDashboard } from '../services/memberApi';
import { MemberSuggestedProfilesSection } from '../components/MemberSuggestedProfilesSection';
import './MemberDashboardPage.css';

export const MemberDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberDashboard()
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <div className="spinner"></div>
        <p>Loading your partner dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-error-state">
        <h3>Unable to load dashboard</h3>
        <p>{error || 'An error occurred'}</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  const completion = data.completion || { percentage: 0, isComplete70Plus: false, missingFields: [] };
  const isComplete = completion.isComplete70Plus;
  const isPaid = data.membership?.packageType === 'PAID';

  return (
    <div className="member-dashboard-page">
      {/* Top Welcome & Meta Bar */}
      <div className="dashboard-hero-card">
        <div className="hero-member-meta">
          <div className="member-id-banner">
            <span className="member-id-badge">ID: {data.memberId}</span>
            <span className={`membership-pill ${isPaid ? 'pill-paid' : 'pill-free'}`}>
              {isPaid ? `PAID (${data.membership.packageName})` : 'FREE MEMBER'}
            </span>
          </div>
          <h2>Welcome back, {data.firstName} {data.lastName}</h2>
          <div className="creator-attribution">
            <span>{data.createdByLabel}</span>
          </div>
        </div>

        <div className="hero-quick-actions">
          <Link to="/member/matches/verified" className="btn-hero-primary">
            💍 Verified View
          </Link>
          <Link to="/member/matches/matched" className="btn-hero-secondary">
            ✨ Matched View
          </Link>
          {!isPaid && (
            <Link to="/member/upgrade" className="btn-hero-upgrade">
              💎 Upgrade Plan
            </Link>
          )}
        </div>
      </div>

      {/* ID Proof Rejection Alert (Task 1) */}
      {data.verification?.idProofStatus === 'REJECTED' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
            border: '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
            <span style={{ fontSize: '28px', lineHeight: 1 }}>⚠️</span>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>
                Action Required: Your ID Proof Verification Was Rejected
              </h4>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#b91c1c', lineHeight: 1.5 }}>
                <strong>Rejection Reason:</strong> {data.verification?.idProofRejectionReason || 'The uploaded document did not meet verification criteria.'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>
                Please review the reason and submit a clear, valid government-issued ID proof document so your profile can be fully verified.
              </p>
            </div>
          </div>
          <Link
            to="/member/profile"
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            Correct & Resubmit Proof →
          </Link>
        </div>
      )}

      {/* Profile Completion Section (Section 4.2) */}
      <div className="completion-card">
        <div className="completion-header">
          <div>
            <h3>Profile Completion: {completion.percentage}%</h3>
            <p className="completion-sub">
              {isComplete
                ? '✅ Your profile is complete and eligible to browse basic match profiles!'
                : '⚠️ Minimum 70% completion is required to view individual match profiles.'}
            </p>
          </div>
          <Link to="/member/profile" className="btn-complete-profile">
            {completion.percentage < 100 ? 'Continue Profile Details' : 'Edit Profile'}
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="progress-track">
          <div
            className={`progress-fill ${isComplete ? 'fill-success' : 'fill-warning'}`}
            style={{ width: `${completion.percentage}%` }}
          ></div>
          <div className="threshold-marker" style={{ left: '70%' }}>
            <span className="marker-label">70% Required</span>
          </div>
        </div>

        {/* Section 4.2: Compatible count banner below 70% */}
        {!isComplete && (
          <div className="incomplete-alert-box">
            <div className="alert-icon">🔒</div>
            <div className="alert-text">
              <h4>{data.communityMessage}</h4>
              <p>
                Profiles are protected by community privacy rules. Complete the missing details
                below to unlock full browsing of compatible profiles in your community.
              </p>
            </div>
          </div>
        )}

        {/* Missing fields checklist */}
        {completion.missingFields?.length > 0 && (
          <div className="missing-fields-box">
            <h4>Checklist to Reach 100%:</h4>
            <div className="missing-tags-grid">
              {completion.missingFields.map((field: string, idx: number) => (
                <div key={idx} className="missing-tag-item">
                  <span className="missing-dot">○</span>
                  <span>{field}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Metrics & Activity Grid */}
      <div className="dashboard-grid">
        {/* Verification Status Card */}
        <div className="metric-box">
          <div className="metric-header">
            <h4>Verification & Trust</h4>
            <span className="metric-icon">🛡️</span>
          </div>
          <div className="verification-badges">
            <div className="badge-row">
              <span>Mobile Verification</span>
              <span className={`status-tag ${data.verification.mobileVerified ? 'verified' : 'pending'}`}>
                {data.verification.mobileVerified ? 'Verified' : 'Pending OTP'}
              </span>
            </div>
            <div className="badge-row">
              <span>Email Verification</span>
              <span className={`status-tag ${data.verification.emailVerified ? 'verified' : 'unverified'}`}>
                {data.verification.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            <div className="badge-row">
              <span>ID Proof Document</span>
              <span className={`status-tag ${data.verification.idProofUploaded ? 'verified' : 'pending'}`}>
                {data.verification.idProofUploaded
                  ? data.verification.idProofVerified
                    ? 'Verified by Staff'
                    : 'Uploaded (Review Pending)'
                  : 'Not Uploaded'}
              </span>
            </div>
          </div>
        </div>

        {/* Package & Quota Card */}
        <div className="metric-box">
          <div className="metric-header">
            <h4>Membership & Reveals</h4>
            <span className="metric-icon">💎</span>
          </div>
          <div className="package-info-block">
            <div className="info-main">
              <span className="pkg-name">{data.membership.packageName}</span>
              {data.membership.packageExpiresAt && (
                <span className="pkg-expiry">
                  Expires on: {new Date(data.membership.packageExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="quota-indicator">
              <span className="quota-number">{data.membership.contactsRemaining}</span>
              <span className="quota-label">
                Contact reveals remaining (Quota: {data.membership.contactsQuota || 0})
              </span>
            </div>
            {!isPaid && (
              <Link to="/member/upgrade" className="btn-card-upgrade">
                Upgrade for Photos & Contacts
              </Link>
            )}
          </div>
        </div>

        {/* Interests & Matches Summary */}
        <div className="metric-box">
          <div className="metric-header">
            <h4>Interests Activity</h4>
            <span className="metric-icon">💌</span>
          </div>
          <div className="stats-trio">
            <div className="stat-unit">
              <span className="stat-num">{data.interestsSummary.receivedCount}</span>
              <span className="stat-desc">Received</span>
            </div>
            <div className="stat-unit">
              <span className="stat-num">{data.interestsSummary.sentCount}</span>
              <span className="stat-desc">Sent</span>
            </div>
            <div className="stat-unit highlight">
              <span className="stat-num">{data.interestsSummary.acceptedCount}</span>
              <span className="stat-desc">Accepted</span>
            </div>
          </div>
          <Link to="/member/interests" className="card-footer-link">
            View Interests Inbox →
          </Link>
        </div>

        {/* Profile Views Activity */}
        <div className="metric-box">
          <div className="metric-header">
            <h4>Profile Activity</h4>
            <span className="metric-icon">👁️</span>
          </div>
          <div className="stats-trio">
            <div className="stat-unit">
              <span className="stat-num">{data.activitySummary.whoViewedMeCount}</span>
              <span className="stat-desc">Seen My Profile</span>
            </div>
            <div className="stat-unit">
              <span className="stat-num">{data.activitySummary.profileViewsCount}</span>
              <span className="stat-desc">Profiles Seen</span>
            </div>
            <div className="stat-unit">
              <span className="stat-num">{data.activitySummary.shortlistsCount}</span>
              <span className="stat-desc">Shortlisted</span>
            </div>
          </div>
          <Link to="/member/activity" className="card-footer-link">
            View Activity History →
          </Link>
        </div>
      </div>

      {/* Section 11.5: Suggested Profiles for Eligible Members */}
      <MemberSuggestedProfilesSection />
    </div>
  );
};
