import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  requestRegistrationOtp,
  registerMember,
  loginWithCredentials,
  requestLoginOtp,
  verifyLoginOtp,
  fetchTerms,
} from '../services/memberApi';
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
  });

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
      const payload: any = {
        ...regData,
        channel: regChannel,
      };
      if (!payload.email || payload.email.trim() === '') {
        delete payload.email;
      }

      const res = await registerMember(payload);

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

      setSession(res.accessToken, res.user, res.memberProfile);
      onClose();
      if (res.user.role === 'MEMBER') {
        navigate('/member/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
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
          </div>
        )}

        {/* ─── REGISTRATION TAB ─── */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-body auth-form">
            <p className="quick-id-intro">
              ⚡ <strong>Quick ID Creation:</strong> Register with basic identity and verified mobile OTP.
              Complete the remaining profile details anytime later.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  required
                  placeholder="First Name"
                  value={regData.firstName}
                  onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Last Name"
                  value={regData.lastName}
                  onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={regData.gender}
                  onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
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
                <label>Marital Status</label>
                <select
                  value={regData.maritalStatus}
                  onChange={(e) => setRegData({ ...regData, maritalStatus: e.target.value })}
                >
                  <option value="Unmarried">Unmarried</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Caste</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brahmin, Reddy, Kamma..."
                  value={regData.caste}
                  onChange={(e) => setRegData({ ...regData, caste: e.target.value })}
                />
              </div>
            </div>

            {/* Verification Channel Selector */}
            <div className="form-group">
              <label>Choose Verification Method</label>
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
                  📱 Mobile SMS OTP
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
                  ✉️ Email OTP
                </button>
              </div>
            </div>

            {/* Mobile & Email Inputs */}
            <div className="form-row">
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={regData.mobile}
                  onChange={(e) => setRegData({ ...regData, mobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email Address {regChannel === 'email' ? '*' : '(Optional)'}</label>
                <input
                  type="email"
                  required={regChannel === 'email'}
                  placeholder="you@example.com"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Trigger Button to Send OTP */}
            <div className="otp-action-banner">
              <span className="otp-action-hint">
                Will verify: <strong>{regChannel === 'mobile' ? (regData.mobile || 'Enter mobile above') : (regData.email || 'Enter email above')}</strong>
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestRegOtp}
                className="btn-send-otp"
              >
                {otpSent ? 'Resend Code' : `Send Code to ${regChannel === 'mobile' ? 'Mobile' : 'Email'}`}
              </button>
            </div>

            {/* Dedicated Verification Code Block */}
            <div className={`otp-verification-card ${otpSent ? 'active' : ''}`}>
              <div className="otp-card-header">
                <span className="otp-card-title">
                  🔢 Enter 6-Digit Received Code {otpSent ? '✅' : ''}
                </span>
                <span className="otp-badge-status">
                  {otpSent ? 'Code Dispatched' : 'Pending Request'}
                </span>
              </div>

              {otpNotice && <div className="auth-info-alert">{otpNotice}</div>}

              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="otp-digit-input"
                  placeholder={otpSent ? "123456" : "Click 'Send Code' above first"}
                  value={regData.otpCode}
                  onChange={(e) => setRegData({ ...regData, otpCode: e.target.value })}
                />
                <span className="otp-input-subtext">
                  {otpSent
                    ? 'Enter the 6-digit verification code'
                    : `Click "Send Code to ${regChannel === 'mobile' ? 'Mobile' : 'Email'}" above to generate your OTP`}
                </span>
              </div>
            </div>



            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Choose a secure password"
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
              />
            </div>

            <div className="terms-checkbox-row">
              <input
                type="checkbox"
                id="termsCheck"
                required
                checked={regData.termsAccepted}
                onChange={(e) => setRegData({ ...regData, termsAccepted: e.target.checked })}
              />
              <label htmlFor="termsCheck">
                I agree to the{' '}
                <button type="button" onClick={handleOpenTerms} className="terms-link-btn">
                  Terms & Conditions
                </button>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-auth-submit">
              {loading ? 'Creating Member ID...' : 'Complete Quick Registration'}
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
