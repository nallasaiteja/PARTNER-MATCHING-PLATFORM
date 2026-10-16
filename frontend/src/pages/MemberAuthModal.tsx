import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  requestRegistrationOtp,
  registerMember,
  loginWithCredentials,
  requestLoginOtp,
  verifyLoginOtp,
  fetchTerms,
  verifyAdmin2faApi,
  verifyAdminRecoveryApi,
} from '../services/memberApi';
import {
  getPersistedAttribution,
  trackRegistrationStarted,
  trackRegistrationCompleted,
} from '../utils/analytics';
import './MemberAuthModal.css';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  // Registration Form State
  const [regChannel, setRegChannel] = useState<'mobile' | 'email'>('mobile');
  const [regData, setRegData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '1998-01-01',
    maritalStatus: 'Unmarried',
    religion: 'Hindu',
    caste: 'Brahmin',
    mobile: '',
    email: '',
    password: '',
    otpCode: '',
    termsAccepted: false,
    registrationSource: getPersistedAttribution().registrationSource,
  });

  useEffect(() => {
    if (isOpen && tab === 'register') {
      trackRegistrationStarted();
    }
  }, [isOpen, tab]);

  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Login Form State
  const [loginMethod, setLoginMethod] = useState<'password' | 'mobileOtp' | 'emailOtp'>('password');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  // UI state
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsText, setTermsText] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  if (!isOpen) return null;

  const handleOpenTerms = async () => {
    try {
      const res = await fetchTerms();
      setTermsText(res.content || JSON.stringify(res));
      setShowTermsModal(true);
    } catch {
      setTermsText('1. Members must be at least 18 (female) or 21 (male).\n2. All information must be genuine.\n3. Profile contact details are protected.');
      setShowTermsModal(true);
    }
  };

  // ─── Registration Flow ─────────────────────────────────────
  const handleRequestRegOtp = async () => {
    setError(null);
    const recipient = regChannel === 'mobile' ? regData.mobile.trim() : regData.email.trim();

    if (regChannel === 'mobile') {
      if (!recipient || recipient.length < 10) {
        setError('Please enter a valid 10-digit mobile number first');
        return;
      }
    } else {
      if (!recipient || !recipient.includes('@')) {
        setError('Please enter a valid email address first');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await requestRegistrationOtp(recipient, regChannel);
      setOtpSent(true);
      setOtpNotice(res.message);
      if (res.devCode) {
        setRegData((prev) => ({ ...prev, otpCode: res.devCode }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regData.mobile || regData.mobile.length < 10) {
      setError('A valid 10-digit mobile number is required.');
      return;
    }
    if (!regData.termsAccepted) {
      setError('You must accept the Terms & Conditions before registration.');
      return;
    }
    if (!regData.otpCode || regData.otpCode.length < 6) {
      setError('Please enter the 6-digit verification code received.');
      return;
    }

    setLoading(true);
    try {
      const attribution = getPersistedAttribution();
      const payload: any = {
        ...regData,
        channel: regChannel,
        registrationSource: regData.registrationSource || attribution.registrationSource,
        attributionData: attribution.attributionData,
      };
      if (!payload.email || payload.email.trim() === '') {
        delete payload.email;
      }

      const res = await registerMember(payload);

      // Track Registration Completed for Pixels and Analytics
      trackRegistrationCompleted(res.memberProfile?.memberId);

      setSession(res.accessToken, res.user, res.memberProfile);
      onClose();
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  // ─── Login Flow ───────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginIdentifier || !loginPassword) {
      setError('Please enter your Member ID, Mobile, or Email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials({
        identifier: loginIdentifier,
        password: loginPassword,
      });

      if (res.requires2fa) {
        setRequires2fa(true);
        setChallengeToken(res.challengeToken);
        setTwoFactorNotice(res.message || 'Two-Factor Authentication (2FA) is required for Admin accounts.');
        if (res.devCode) {
          setTwoFactorCode(res.devCode);
        }
        return;
      }

      setSession(res.accessToken, res.user, res.memberProfile);
      onClose();
      if (res.user.role === 'MEMBER') {
        navigate('/member/dashboard');
      } else if (res.user.role === 'BRANCH_AGENT' || res.user.role === 'FRANCHISE_AGENT') {
        navigate('/agent/dashboard');
      } else if (res.user.role === 'BRANCH_MANAGER' || res.user.role === 'BRANCH_STAFF') {
        navigate('/branch/dashboard');
      } else if (res.user.role === 'FRANCHISE_MANAGER' || res.user.role === 'FRANCHISE_STAFF') {
        navigate('/franchise/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken || !twoFactorCode) {
      setError('Please enter the 6-digit 2FA verification code');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyAdmin2faApi(challengeToken, twoFactorCode);
      setSession(res.accessToken, res.user, null);
      onClose();
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || '2FA verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken || !recoveryCode) {
      setError('Please enter your 8-character emergency backup recovery code');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyAdminRecoveryApi(challengeToken, recoveryCode);
      setSession(res.accessToken, res.user, null);
      onClose();
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or already consumed recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLoginOtp = async () => {
    setError(null);
    if (!loginIdentifier) {
      setError('Please enter your Mobile or Email first');
      return;
    }
    const channel = loginMethod === 'emailOtp' ? 'email' : 'mobile';
    setLoading(true);
    try {
      const res = await requestLoginOtp(loginIdentifier, channel);
      setLoginOtpSent(true);
      setLoginNotice(res.message);
      if (res.devCode) {
        setLoginOtpCode(res.devCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginOtpCode) {
      setError('Please enter the OTP verification code');
      return;
    }
    const channel = loginMethod === 'emailOtp' ? 'email' : 'mobile';
    setLoading(true);
    try {
      const res = await verifyLoginOtp(loginIdentifier, loginOtpCode, channel);
      setSession(res.accessToken, res.user, res.memberProfile);
      onClose();
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="auth-modal-header">
          <h2>Partner Matching Platform</h2>
          <p className="auth-sub">Secure Matrimonial Access for Telugu Families</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            Quick Registration
          </button>
        </div>

        {error && <div className="auth-error-alert">{error}</div>}

        {/* ─── LOGIN TAB ─── */}
        {tab === 'login' && (
          <div className="auth-body">
            {requires2fa ? (
              <div className="admin-2fa-container" style={{ padding: '8px 4px' }}>
                <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0e7ff', color: '#3730a3', borderRadius: '12px', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                  🛡️ Admin Two-Factor Authentication
                </div>
                <h3 style={{ margin: '4px 0 8px', fontSize: '18px', color: '#111827' }}>
                  {useRecovery ? 'Emergency Recovery Verification' : 'Verify Your Identity'}
                </h3>
                <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', lineHeight: 1.4 }}>
                  {useRecovery
                    ? 'Enter one of your 8-character single-use emergency backup recovery codes.'
                    : (twoFactorNotice || 'Enter the 6-digit verification code sent to your registered Admin channel.')}
                </p>

                {!useRecovery ? (
                  <form onSubmit={handleVerify2fa} className="auth-form">
                    <div className="form-group">
                      <label>6-Digit Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        autoFocus
                        style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                      />
                    </div>
                    <button type="submit" disabled={loading} className="btn-auth-submit">
                      {loading ? 'Verifying 2FA...' : 'Verify & Enter Console'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                        onClick={() => { setUseRecovery(true); setError(null); }}
                      >
                        Device unavailable? Use Emergency Recovery Code
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyRecoveryCode} className="auth-form">
                    <div className="form-group">
                      <label>8-Character Backup Recovery Code</label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        placeholder="e.g. A1B2C3D4"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                        autoFocus
                        style={{ letterSpacing: '3px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                      />
                      <small style={{ color: '#6b7280', display: 'block', marginTop: '6px', fontSize: '11px' }}>
                        Each recovery backup code can only be used once to access the admin account.
                      </small>
                    </div>
                    <button type="submit" disabled={loading} className="btn-auth-submit" style={{ backgroundColor: '#dc2626' }}>
                      {loading ? 'Verifying Backup Code...' : 'Consume Recovery Code & Login'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                        onClick={() => { setUseRecovery(false); setError(null); }}
                      >
                        ← Back to standard 6-digit OTP verification
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      setRequires2fa(false);
                      setChallengeToken(null);
                      setTwoFactorCode('');
                      setRecoveryCode('');
                      setError(null);
                    }}
                  >
                    ← Cancel & Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="login-method-toggle">
                  <button
                    type="button"
                    className={`method-btn ${loginMethod === 'password' ? 'active' : ''}`}
                    onClick={() => setLoginMethod('password')}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    className={`method-btn ${loginMethod === 'mobileOtp' ? 'active' : ''}`}
                    onClick={() => setLoginMethod('mobileOtp')}
                  >
                    Mobile OTP
                  </button>
                  <button
                    type="button"
                    className={`method-btn ${loginMethod === 'emailOtp' ? 'active' : ''}`}
                    onClick={() => setLoginMethod('emailOtp')}
                  >
                    Email OTP
                  </button>
                </div>

                {loginMethod === 'password' ? (
                  <form onSubmit={handlePasswordLogin} className="auth-form">
                    <div className="form-group">
                      <label>Member ID / Mobile / Email</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. M2026000001 or 9888800000"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                    <button type="submit" disabled={loading} className="btn-auth-submit">
                      {loading ? 'Logging in...' : 'Login with Password'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="auth-form">
                    <div className="form-group">
                      <label>{loginMethod === 'emailOtp' ? 'Registered Email' : 'Registered Mobile'}</label>
                      <div className="input-with-action">
                        <input
                          type="text"
                          required
                          placeholder={loginMethod === 'emailOtp' ? 'you@example.com' : '10-digit mobile'}
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={handleRequestLoginOtp}
                          className="btn-send-otp"
                        >
                          {loginOtpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      </div>
                    </div>

                    {loginNotice && <div className="auth-info-alert">{loginNotice}</div>}

                    {loginOtpSent && (
                      <div className="form-group">
                        <label>6-Digit Verification Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={loginOtpCode}
                          onChange={(e) => setLoginOtpCode(e.target.value)}
                        />
                      </div>
                    )}

                    <button type="submit" disabled={loading || !loginOtpSent} className="btn-auth-submit">
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── REGISTRATION TAB ─── */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-body auth-form reg-beautified-form">
            {/* Top Value Banner */}
            <div className="reg-hero-banner">
              <div className="reg-hero-badge">
                <span className="badge-sparkle">✨</span> Quick 60-Second Setup
              </div>
              <h3 className="reg-hero-title">Create Free Matrimony Profile</h3>
              <p className="reg-hero-desc">
                Register with verified contact credentials. Complete family & astrological details anytime later.
              </p>
              <div className="reg-trust-pills">
                <span className="trust-pill">🛡️ 100% Verified Profiles</span>
                <span className="trust-pill">🔒 Contact Privacy Protected</span>
              </div>
            </div>

            {/* Section 1: Candidate Identity */}
            <div className="reg-form-section">
              <div className="section-title-row">
                <span className="section-icon">👤</span>
                <span className="section-title">Candidate Details</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Candidate's first name"
                    value={regData.firstName}
                    onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Surname / Family name"
                    value={regData.lastName}
                    onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Looking For (Gender) <span className="req">*</span></label>
                  <select
                    value={regData.gender}
                    onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                    className="custom-select"
                  >
                    <option value="Male">🤵 Groom (Male)</option>
                    <option value="Female">👰 Bride (Female)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth <span className="req">*</span></label>
                  <input
                    type="date"
                    required
                    value={regData.dateOfBirth}
                    onChange={(e) => setRegData({ ...regData, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marital Status <span className="req">*</span></label>
                  <select
                    value={regData.maritalStatus}
                    onChange={(e) => setRegData({ ...regData, maritalStatus: e.target.value })}
                    className="custom-select"
                  >
                    <option value="Unmarried">Never Married (Unmarried)</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Community / Caste <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brahmin, Reddy, Kamma, Kapu..."
                    value={regData.caste}
                    onChange={(e) => setRegData({ ...regData, caste: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Live Verification */}
            <div className="reg-form-section">
              <div className="section-title-row">
                <span className="section-icon">🔐</span>
                <span className="section-title">Contact & Live Verification</span>
              </div>

              <div className="form-group">
                <label>Verification Method</label>
                <div className="reg-channel-selector">
                  <button
                    type="button"
                    className={`reg-channel-btn ${regChannel === 'mobile' ? 'active' : ''}`}
                    onClick={() => {
                      setRegChannel('mobile');
                      setOtpSent(false);
                      setOtpNotice(null);
                    }}
                  >
                    <span className="channel-icon">📱</span>
                    <span className="channel-label">Mobile SMS OTP</span>
                  </button>
                  <button
                    type="button"
                    className={`reg-channel-btn ${regChannel === 'email' ? 'active' : ''}`}
                    onClick={() => {
                      setRegChannel('email');
                      setOtpSent(false);
                      setOtpNotice(null);
                    }}
                  >
                    <span className="channel-icon">✉️</span>
                    <span className="channel-label">Email OTP</span>
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mobile Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={regData.mobile}
                    onChange={(e) => setRegData({ ...regData, mobile: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address {regChannel === 'email' ? <span className="req">*</span> : <small style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</small>}</label>
                  <input
                    type="email"
                    required={regChannel === 'email'}
                    placeholder="you@example.com"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Enhanced OTP Action Card */}
              <div className={`otp-interactive-card ${otpSent ? 'dispatched' : 'pending'}`}>
                <div className="otp-card-top">
                  <div className="otp-target-info">
                    <span className="otp-target-label">Target for OTP:</span>
                    <strong className="otp-target-value">
                      {regChannel === 'mobile'
                        ? (regData.mobile || 'Enter 10-digit mobile above')
                        : (regData.email || 'Enter email address above')}
                    </strong>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestRegOtp}
                    className="btn-trigger-otp"
                  >
                    {otpSent ? '🔄 Resend Code' : `📲 Send Code to ${regChannel === 'mobile' ? 'Mobile' : 'Email'}`}
                  </button>
                </div>

                {otpNotice && <div className="auth-info-alert">{otpNotice}</div>}

                <div className="otp-input-container">
                  <div className="otp-input-label-row">
                    <label htmlFor="otp-input-code">6-Digit Verification Code</label>
                    <span className={`otp-status-badge ${otpSent ? 'sent' : 'waiting'}`}>
                      {otpSent ? '● Code Sent via Brevo' : '○ Awaiting Request'}
                    </span>
                  </div>
                  <input
                    id="otp-input-code"
                    type="text"
                    required
                    maxLength={6}
                    className="otp-highlight-input"
                    placeholder={otpSent ? "Enter 6 digits" : "Click 'Send Code' above first"}
                    value={regData.otpCode}
                    onChange={(e) => setRegData({ ...regData, otpCode: e.target.value })}
                  />
                  <small className="otp-help-text">
                    {otpSent
                      ? 'Check your inbox/SMS for the 6-digit verification code.'
                      : `Click "Send Code" above to dispatch your one-time verification code.`}
                  </small>
                </div>
              </div>
            </div>

            {/* Section 3: Password & Agreement */}
            <div className="reg-form-section">
              <div className="section-title-row">
                <span className="section-icon">🛡️</span>
                <span className="section-title">Account Security</span>
              </div>

              <div className="form-group">
                <label>Create Password <span className="req">*</span></label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                />
              </div>

              <div className="terms-checkbox-card">
                <label className="terms-checkbox-label">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    required
                    checked={regData.termsAccepted}
                    onChange={(e) => setRegData({ ...regData, termsAccepted: e.target.checked })}
                  />
                  <span>
                    I confirm the candidate details are genuine and agree to the{' '}
                    <button type="button" onClick={handleOpenTerms} className="terms-link-btn">
                      Terms of Use & Privacy Policy
                    </button>
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Action */}
            <button type="submit" disabled={loading} className="btn-auth-submit-beautified">
              {loading ? 'Creating Member Profile...' : '✨ Complete Quick Registration & Begin Matching'}
            </button>
          </form>
        )}

        {/* ─── TERMS MODAL ─── */}
        {showTermsModal && (
          <div className="terms-modal-overlay">
            <div className="terms-modal-box">
              <h3>Terms & Conditions</h3>
              <div className="terms-modal-content">
                <pre>{termsText}</pre>
              </div>
              <button
                type="button"
                className="btn-close-terms"
                onClick={() => setShowTermsModal(false)}
              >
                Close Terms
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
