import React, { useEffect, useState } from 'react';
import { changePassword } from '../services/authApi';
import { fetchMyProfile, updateProfile } from '../services/profileApi';
import { fetchTerms } from '../services/memberApi';
import './AccountSettingsPage.css';

export const AccountSettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Preference state (Section 3 Mobile revelation)
  const [revelationPref, setRevelationPref] = useState('0 Hours');
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefLoading, setPrefLoading] = useState(false);

  // Terms state
  const [terms, setTerms] = useState<any>(null);

  useEffect(() => {
    Promise.all([fetchMyProfile(), fetchTerms()])
      .then(([prof, t]) => {
        setProfile(prof);
        setTerms(t);
        const storedPref = prof?.profileData?.step5?.mobileRevelationPreference || '0 Hours';
        setRevelationPref(storedPref);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPwLoading(false);
    }
  };

  const handlePrefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setPrefLoading(true);
    setPrefMsg(null);
    try {
      const existingData = profile.profileData || {};
      const updatedData = {
        ...existingData,
        step5: {
          ...(existingData.step5 || {}),
          mobileRevelationPreference: revelationPref,
        },
      };

      await updateProfile(profile.id, { profileData: updatedData });
      setPrefMsg('Privacy preference saved successfully');
    } catch (err: any) {
      setPrefMsg(`⚠️ ${err.message}`);
    } finally {
      setPrefLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <div className="spinner"></div>
        <p>Loading account settings...</p>
      </div>
    );
  }

  return (
    <div className="account-settings-container">
      <div className="settings-header">
        <h2>⚙️ Account & Privacy Settings</h2>
        <p>Manage your login credentials, contact revelation preferences, and review platform terms.</p>
      </div>

      <div className="settings-grid">
        {/* Mobile Number Revelation Preference (Section 3 & 4.8) */}
        <div className="settings-card">
          <h3>📱 Mobile Number Revelation Preference</h3>
          <p className="card-sub">
            Control when your contact number is revealed to matching profiles when they request it.
          </p>

          <form onSubmit={handlePrefSubmit} className="pref-form">
            <div className="pref-options-list">
              <label className={`pref-option-label ${revelationPref === '0 Hours' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="revPref"
                  value="0 Hours"
                  checked={revelationPref === '0 Hours'}
                  onChange={() => setRevelationPref('0 Hours')}
                />
                <div>
                  <strong>0 Hours (Auto Reveal)</strong>
                  <p>Auto reveal immediately to all matching members.</p>
                </div>
              </label>

              <label className={`pref-option-label ${revelationPref === '24 Hours' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="revPref"
                  value="24 Hours"
                  checked={revelationPref === '24 Hours'}
                  onChange={() => setRevelationPref('24 Hours')}
                />
                <div>
                  <strong>24 Hours (Scheduled Delay)</strong>
                  <p>Auto reveal after 24 hours. You can review and block the request during the waiting period.</p>
                </div>
              </label>

              <label className={`pref-option-label ${revelationPref === '72 Hours' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="revPref"
                  value="72 Hours"
                  checked={revelationPref === '72 Hours'}
                  onChange={() => setRevelationPref('72 Hours')}
                />
                <div>
                  <strong>72 Hours (Extended Delay)</strong>
                  <p>Auto reveal after 72 hours. You can review and block the request during the waiting period.</p>
                </div>
              </label>

              <label className={`pref-option-label ${revelationPref === 'Acceptance Preference' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="revPref"
                  value="Acceptance Preference"
                  checked={revelationPref === 'Acceptance Preference'}
                  onChange={() => setRevelationPref('Acceptance Preference')}
                />
                <div>
                  <strong>Acceptance Preference</strong>
                  <p>Reveal ONLY after you explicitly accept the request. (Requires qualifying paid package)</p>
                </div>
              </label>
            </div>

            {prefMsg && <div className="settings-alert-info">{prefMsg}</div>}

            <button type="submit" disabled={prefLoading} className="btn-save-pref">
              {prefLoading ? 'Saving...' : 'Save Privacy Preference'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <h3>🔒 Change Password</h3>
          <p className="card-sub">Ensure your account remains safe with a strong password.</p>

          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                required
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {pwMsg && (
              <div className={`settings-alert-${pwMsg.type === 'success' ? 'success' : 'error'}`}>
                {pwMsg.text}
              </div>
            )}

            <button type="submit" disabled={pwLoading} className="btn-change-password">
              {pwLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Security & Permanent Data Retention Policy (Section 10) */}
        <div className="settings-card security-policy-card">
          <h3>🛡️ Data Retention & Safety Policy</h3>
          <p>
            In accordance with platform security protocols and Section 10 regulatory guidelines,
            member accounts cannot be permanently deleted from the database.
          </p>
          <div className="policy-bullet-points">
            <div>
              <strong>🔒 Immutable Fields:</strong> Full Name, Mobile, Date of Birth, Religion, and Caste
              are preserved permanently.
            </div>
            <div>
              <strong>🚫 Account Closure:</strong> If you wish to suspend search activity (e.g. Marriage
              Settled), you may request your profile to be blocked by administration.
            </div>
            <div>
              <strong>📜 Terms Accepted:</strong>{' '}
              {profile?.termsAccepted ? '✅ Accepted at registration' : 'Pending acceptance'}
            </div>
          </div>
        </div>

        {/* Terms Viewer Card */}
        {terms && (
          <div className="settings-card">
            <h3>📜 Platform Terms & Conditions</h3>
            <div className="terms-viewer-box">
              <pre>{terms.content || JSON.stringify(terms)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
