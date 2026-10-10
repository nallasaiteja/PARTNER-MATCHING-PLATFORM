import React, { useEffect, useState } from 'react';
import { Step5Data, StepValidationErrors } from '../../types/profile';
import { useAuth } from '../../auth/AuthProvider';
import {
  changePassword,
  forgotPassword,
  requestEmailOtp,
  requestMobileOtp,
  verifyEmailOtp,
  verifyMobileOtp,
} from '../../services/authApi';
import { downloadIdProof, fetchContactRevealPackages, uploadIdProof, verifyIdProof } from '../../services/profileApi';
import './StepFormStyles.css';

interface Step5Props {
  data: Step5Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
  profileId?: string;
  profileUserId?: string;
  registeredEmail?: string;
  idProofUrl?: string;
  packageType?: 'FREE' | 'PAID';
  onIdProofUploaded: (url: string) => void;
}

export const Step5VerificationSettings: React.FC<Step5Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
  profileId,
  profileUserId,
  registeredEmail = '',
  idProofUrl,
  packageType = 'FREE',
  onIdProofUploaded,
}) => {
  const { user } = useAuth();
  const isOwnMemberProfile = user?.role === 'MEMBER' && user.id === profileUserId;
  const canReviewIdProof = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  const storedProofUrl = idProofUrl && !idProofUrl.startsWith('blob:') ? idProofUrl : '';
  const [mobileCode, setMobileCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState(registeredEmail);
  const [uploadError, setUploadError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [mobileMessage, setMobileMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [acceptancePreferencePackages, setAcceptancePreferencePackages] = useState<string[]>(['PAID']);

  useEffect(() => {
    fetchContactRevealPackages()
      .then((settings) => setAcceptancePreferencePackages(settings.packageTypes))
      .catch(() => setAcceptancePreferencePackages([]));
  }, []);

  const canUseAcceptancePreference = acceptancePreferencePackages.includes(packageType);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setErrorMessage('');
    setPasswordMessage('');
    setIsBusy(true);
    try {
      await action();
      setPasswordMessage(success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleIdProofUpload = async (file?: File) => {
    if (!file || !profileId) return;
    setUploadError('');
    setIsBusy(true);
    try {
      const result = await uploadIdProof(profileId, file);
      onIdProofUploaded(result.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload ID proof');
    } finally {
      setIsBusy(false);
    }
  };

  const handleIdProofReview = async () => {
    if (!profileId) return;
    setIsBusy(true);
    setErrorMessage('');
    try {
      const result = await verifyIdProof(profileId, true);
      onChange('idProofVerified', result.profileData?.step5?.idProofVerified ?? true);
      onChange('idProofVerifiedAt', result.profileData?.step5?.idProofVerifiedAt || new Date().toISOString());
      onChange('idProofVerifiedBy', result.profileData?.step5?.idProofVerifiedBy || user?.id || '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify ID proof');
    } finally {
      setIsBusy(false);
    }
  };

  const handleIdProofDownload = async () => {
    if (!profileId) return;
    setDownloadError('');
    try {
      const blob = await downloadIdProof(profileId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = idProofUrl?.split('/').pop() || 'id-proof';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Unable to download ID proof');
    }
  };

  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 5</span>
        <h2 className="step-panel-title">Verification & Settings</h2>
        <p className="step-panel-desc">
          ID verification, privacy settings, and package preferences. (Section 3 — Page 11)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">🔒</span>
        <div>
          <strong>Architecture Scope:</strong> Verification hooks trigger OTP generation for Mobile and Email.
          Mobile revelation controls privacy visibility on matches.
        </div>
      </div>

      <div className="form-field-group" style={{ marginBottom: '22px' }}>
        <label className="form-label">
          Mobile Number Revelation Preference <span className="required-star">*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '6px' }}>
          {[
            { id: '0 Hours', label: '0 Hours', desc: 'Auto reveal immediately to all matching members' },
            { id: '24 Hours', label: '24 Hours', desc: 'Auto reveal after 24 hours' },
            { id: '72 Hours', label: '72 Hours', desc: 'Auto reveal after 72 hours' },
            { id: 'Acceptance Preference', label: 'Acceptance Preference', desc: 'Reveal only after acceptance' },
          ].map((item) => {
            const isSelected = data.mobileRevelationPreference === item.id;
            return (
              <label
                key={item.id}
                style={{
                  border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                  background: isSelected ? 'rgba(233, 30, 99, 0.04)' : '#ffffff',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="mobileRevelationPreference"
                    value={item.id}
                    checked={isSelected}
                    onChange={() => onChange('mobileRevelationPreference', item.id)}
                    disabled={readOnly || (item.id === 'Acceptance Preference' && !canUseAcceptancePreference)}
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>{item.desc}</span>
              </label>
            );
          })}
        </div>
        {errors.mobileRevelationPreference && (
          <span className="form-error-msg">{errors.mobileRevelationPreference}</span>
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Willing to Take Package?</label>
          <div className="radio-group-row">
            <label className="radio-label">
              <input
                type="radio"
                name="willingPackage"
                checked={data.willingToTakePackage === true}
                onChange={() => onChange('willingToTakePackage', true)}
                disabled={readOnly}
              />
              Yes
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="willingPackage"
                checked={data.willingToTakePackage === false}
                onChange={() => onChange('willingToTakePackage', false)}
                disabled={readOnly}
              />
              No
            </label>
          </div>
        </div>
        <div className="form-field-group">
          <label className="form-label">Profile Payment Date</label>
          <input type="date" className="form-input" value={data.profilePaymentDate || ''}
            onChange={(event) => onChange('profilePaymentDate', event.target.value)} disabled={readOnly} />
          {data.profilePaymentDateSetBy && (
            <span className="form-helper-text">
              Set by {data.profilePaymentDateSetBy === 'MEMBER' ? 'member' : `staff${data.profilePaymentDateSetByStaffId ? ` (${data.profilePaymentDateSetByStaffId})` : ''}`}
            </span>
          )}
        </div>
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">ID Proof</h3>
        {storedProofUrl ? (
          <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy || !profileId}
            onClick={() => void handleIdProofDownload()}>Download uploaded ID proof</button>
        ) : (
          <div className="form-field-group">
            <label className="form-label" htmlFor="step5-id-proof">Upload ID proof</label>
            <input id="step5-id-proof" type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={readOnly || isBusy || !profileId}
              onChange={(event) => void handleIdProofUpload(event.target.files?.[0])} />
            {!profileId && <span className="form-helper-text">Save the profile before uploading a document.</span>}
            {uploadError && <span className="form-error-msg">{uploadError}</span>}
          </div>
        )}
        <div className="radio-group-row">
          <span className="form-helper-text">
            ID proof review: {data.idProofVerified ? 'Verified' : storedProofUrl ? 'Pending review' : 'Not uploaded'}
          </span>
          {canReviewIdProof && storedProofUrl && !data.idProofVerified && (
            <button type="button" className="btn-nav btn-nav-draft" onClick={() => void handleIdProofReview()}
              disabled={isBusy}>Mark verified</button>
          )}
        </div>
        {downloadError && <span className="form-error-msg">{downloadError}</span>}
      </div>

      {isOwnMemberProfile && (
        <div className="profile-address-section">
          <h3 className="address-section-title">Contact Verification</h3>
          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-label">Mobile OTP</label>
              <div className="radio-group-row">
                <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy}
                  onClick={() => void runAction(requestMobileOtp, 'Mobile verification code sent')}>
                  Send / Resend code
                </button>
                <span>{data.mobileVerified ? 'Verified' : 'Not verified'}</span>
              </div>
              {!data.mobileVerified && <div className="radio-group-row">
                <input className="form-input" inputMode="numeric" maxLength={6} value={mobileCode}
                  onChange={(event) => setMobileCode(event.target.value)} aria-label="Mobile verification code" />
                <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy || mobileCode.length !== 6}
                  onClick={() => void runAction(async () => {
                    await verifyMobileOtp(mobileCode);
                    onChange('mobileVerified', true);
                    setMobileCode('');
                    setMobileMessage('Mobile verified');
                  }, 'Mobile verified')}>Verify</button>
              </div>}
              {mobileMessage && <span className="form-helper-text">{mobileMessage}</span>}
            </div>
            <div className="form-field-group">
              <label className="form-label">Email OTP</label>
              <div className="radio-group-row">
                <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy}
                  onClick={() => void runAction(requestEmailOtp, 'Email verification code sent')}>
                  Send / Resend code
                </button>
                <span>{data.emailVerified ? 'Verified' : 'Not verified'}</span>
              </div>
              {!data.emailVerified && <div className="radio-group-row">
                <input className="form-input" inputMode="numeric" maxLength={6} value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value)} aria-label="Email verification code" />
                <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy || emailCode.length !== 6}
                  onClick={() => void runAction(async () => {
                    await verifyEmailOtp(emailCode);
                    onChange('emailVerified', true);
                    setEmailCode('');
                    setEmailMessage('Email verified');
                  }, 'Email verified')}>Verify</button>
              </div>}
              {emailMessage && <span className="form-helper-text">{emailMessage}</span>}
            </div>
          </div>
        </div>
      )}

      {isOwnMemberProfile && (
        <div className="profile-address-section">
          <h3 className="address-section-title">Password</h3>
          <details>
            <summary>Change password</summary>
            <div className="form-grid-2" style={{ marginTop: '12px' }}>
              <input className="form-input" type="password" autoComplete="current-password"
                value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password" />
              <input className="form-input" type="password" autoComplete="new-password"
                value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password (12 characters minimum)" />
              <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy || !currentPassword || newPassword.length < 12}
                onClick={() => void runAction(async () => {
                  await changePassword(currentPassword, newPassword);
                  setCurrentPassword('');
                  setNewPassword('');
                }, 'Password changed')}>Change password</button>
            </div>
          </details>
          <details style={{ marginTop: '12px' }}>
            <summary>Forgot password</summary>
            <div className="radio-group-row" style={{ marginTop: '12px' }}>
              <input className="form-input" type="email" autoComplete="email" value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)} placeholder="Registered email" />
              <button type="button" className="btn-nav btn-nav-draft" disabled={isBusy || !resetEmail}
                onClick={() => void runAction(() => forgotPassword(resetEmail), 'If the account exists, reset instructions will be sent.')}>Send reset link</button>
            </div>
          </details>
        </div>
      )}

      {errorMessage && <span className="form-error-msg">{errorMessage}</span>}
      {passwordMessage && <span className="form-helper-text">{passwordMessage}</span>}

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
          Verification Status Checklist
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.mobileVerified ? '✅' : '⏳'}</span>
            <span>Mobile OTP Verification: <strong>{data.mobileVerified ? 'Verified' : 'Pending Verification'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.emailVerified ? '✅' : '⏳'}</span>
            <span>Email Verification: <strong>{data.emailVerified ? 'Verified' : 'Pending Verification'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.idProofVerified ? '✅' : '⏳'}</span>
            <span>ID Proof Admin Audit: <strong>{data.idProofVerified ? 'Approved' : 'Pending Admin Verification'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
