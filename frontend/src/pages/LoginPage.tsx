import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  loginWithCredentials,
  requestLoginOtp,
  verifyLoginOtp,
  verifyAdmin2faApi,
  verifyAdminRecoveryApi,
} from '../services/memberApi';
import { MemberAuthModal } from './MemberAuthModal';
import { SEOHead } from '../components/SEOHead';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal') === 'staff' ? 'staff' : 'member';
  const [activePortal, setActivePortal] = useState<'member' | 'staff'>(initialPortal);

  const { setSession } = useAuth();
  const navigate = useNavigate();

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickRegModalOpen, setQuickRegModalOpen] = useState(false);

  // Member Login State
  const [memberLoginMethod, setMemberLoginMethod] = useState<'password' | 'mobileOtp' | 'emailOtp'>('password');
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberOtpSent, setMemberOtpSent] = useState(false);
  const [memberOtpCode, setMemberOtpCode] = useState('');
  const [memberOtpNotice, setMemberOtpNotice] = useState<string | null>(null);

  // Staff Login State
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // 2FA State (Admin / Staff)
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  // Sync portal state with search params if user navigated with ?portal=staff
  useEffect(() => {
    const portal = searchParams.get('portal');
    if (portal === 'staff' && activePortal !== 'staff') {
      setActivePortal('staff');
    } else if (portal === 'member' && activePortal !== 'member') {
      setActivePortal('member');
    }
  }, [searchParams]);

  const handlePortalSwitch = (portal: 'member' | 'staff') => {
    setActivePortal(portal);
    setError(null);
    setRequires2fa(false);
    setChallengeToken(null);
    setTwoFactorCode('');
    setRecoveryCode('');
    setSearchParams({ portal });
  };

  // ─── MEMBER LOGIN SUBMIT ─────────────────────────────────────
  const handleMemberPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberIdentifier.trim() || !memberPassword) {
      setError('Please enter your Member ID, Mobile, or Email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials({
        identifier: memberIdentifier.trim(),
        password: memberPassword,
        portalType: 'MEMBER',
      });

      setSession(res.accessToken, res.user, res.memberProfile);
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid member credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSendOtp = async () => {
    setError(null);
    if (!memberIdentifier.trim()) {
      setError(
        memberLoginMethod === 'emailOtp'
          ? 'Please enter your registered Email address'
          : 'Please enter your registered Mobile number'
      );
      return;
    }

    setLoading(true);
    try {
      const channel = memberLoginMethod === 'emailOtp' ? 'email' : 'mobile';
      const res = await requestLoginOtp(memberIdentifier.trim(), channel);
      setMemberOtpSent(true);
      setMemberOtpNotice(res.message);
      if (res.devCode) {
        setMemberOtpCode(res.devCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send login OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberIdentifier.trim() || !memberOtpCode.trim()) {
      setError('Please enter both the identifier and the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const channel = memberLoginMethod === 'emailOtp' ? 'email' : 'mobile';
      const res = await verifyLoginOtp(memberIdentifier.trim(), memberOtpCode.trim(), channel);
      setSession(res.accessToken, res.user, res.memberProfile);
      navigate('/member/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  // ─── STAFF LOGIN SUBMIT ──────────────────────────────────────
  const handleStaffPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffIdentifier.trim() || !staffPassword) {
      setError('Please enter your Staff Mobile Number / ID and Password');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials({
        identifier: staffIdentifier.trim(),
        password: staffPassword,
        portalType: 'STAFF',
      });

      // Handle mandatory 2FA challenge for Admin/Super-Admin
      if (res.requires2fa) {
        setRequires2fa(true);
        setChallengeToken(res.challengeToken);
        setTwoFactorNotice(res.message || 'Two-Factor Authentication (2FA) is required for Admin accounts.');
        if (res.devCode) {
          setTwoFactorCode(res.devCode);
        }
        return;
      }

      setSession(res.accessToken, res.user, null);

      // Route staff based on RBAC role
      routeStaffMember(res.user.role);
    } catch (err: any) {
      setError(err.message || 'Invalid staff credentials or unauthorized account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken || !twoFactorCode.trim()) {
      setError('Please enter the 6-digit 2FA verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAdmin2faApi(challengeToken, twoFactorCode.trim());
      setSession(res.accessToken, res.user, null);
      routeStaffMember(res.user.role);
    } catch (err: any) {
      setError(err.message || '2FA verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken || !recoveryCode.trim()) {
      setError('Please enter your 8-character emergency backup recovery code');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAdminRecoveryApi(challengeToken, recoveryCode.trim());
      setSession(res.accessToken, res.user, null);
      routeStaffMember(res.user.role);
    } catch (err: any) {
      setError(err.message || 'Invalid recovery code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const routeStaffMember = (role: string) => {
    if (role === 'BRANCH_AGENT' || role === 'FRANCHISE_AGENT') {
      navigate('/agent/dashboard');
    } else if (role === 'BRANCH_MANAGER' || role === 'BRANCH_STAFF') {
      navigate('/branch/dashboard');
    } else if (role === 'FRANCHISE_MANAGER' || role === 'FRANCHISE_STAFF') {
      navigate('/franchise/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="login-page-container">
      <SEOHead
        title="Login | Partner Matching Platform"
        description="Secure sign in for registered Telugu Matrimony members and authorized management staff."
        canonicalPath="/login"
      />

      {/* Top Navbar */}
      <header className="login-navbar">
        <Link to="/" className="login-brand-logo">
          <span className="brand-crest">💍</span>
          <div className="brand-text-block">
            <span className="brand-title">Partner Matching</span>
            <span className="brand-subtitle">Telugu Matrimonial Portal</span>
          </div>
        </Link>

        <div className="login-nav-right">
          <Link to="/" className="btn-back-home">
            ← Back to Home
          </Link>
          <button
            type="button"
            onClick={() => setQuickRegModalOpen(true)}
            className="btn-login-signup-cta"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="login-main-wrapper">
        <div className="login-card-container">
          {/* Card Header & Portal Choice */}
          <div className="login-card-header">
            <h1 className="login-card-title">Welcome Back</h1>
            <p className="login-card-subtitle">
              Choose your portal below to sign in securely
            </p>

            {/* Portal Toggle: Member vs Staff */}
            <div className="portal-selector-tabs">
              <button
                type="button"
                className={`portal-tab-btn ${activePortal === 'member' ? 'active' : ''}`}
                onClick={() => handlePortalSwitch('member')}
              >
                <span className="tab-icon">💍</span>
                <div className="tab-text">
                  <strong>Member Login</strong>
                  <small>Brides, Grooms & Families</small>
                </div>
              </button>

              <button
                type="button"
                className={`portal-tab-btn ${activePortal === 'staff' ? 'active' : ''}`}
                onClick={() => handlePortalSwitch('staff')}
              >
                <span className="tab-icon">🏢</span>
                <div className="tab-text">
                  <strong>Staff Login</strong>
                  <small>HQ, Branch, Franchise & Agents</small>
                </div>
              </button>
            </div>
          </div>

          {/* Global Alert Notification */}
          {error && <div className="login-error-alert">{error}</div>}

          {/* ══════════════════════════════════════════════════════════
              OPTION 1: MEMBER LOGIN
             ══════════════════════════════════════════════════════════ */}
          {activePortal === 'member' && (
            <div className="portal-content-body">
              {/* Login Method Sub-Toggle */}
              <div className="method-pill-group">
                <button
                  type="button"
                  className={`method-pill ${memberLoginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => {
                    setMemberLoginMethod('password');
                    setError(null);
                    setMemberOtpSent(false);
                  }}
                >
                  Password
                </button>
                <button
                  type="button"
                  className={`method-pill ${memberLoginMethod === 'mobileOtp' ? 'active' : ''}`}
                  onClick={() => {
                    setMemberLoginMethod('mobileOtp');
                    setError(null);
                    setMemberOtpSent(false);
                  }}
                >
                  Mobile OTP
                </button>
                <button
                  type="button"
                  className={`method-pill ${memberLoginMethod === 'emailOtp' ? 'active' : ''}`}
                  onClick={() => {
                    setMemberLoginMethod('emailOtp');
                    setError(null);
                    setMemberOtpSent(false);
                  }}
                >
                  Email OTP
                </button>
              </div>

              {/* Password Login Form */}
              {memberLoginMethod === 'password' && (
                <form onSubmit={handleMemberPasswordLogin} className="login-form">
                  <div className="form-group">
                    <label>Member ID, Mobile, or Email</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. M2026123456 or 9888800001"
                      value={memberIdentifier}
                      onChange={(e) => setMemberIdentifier(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label-row">
                      <label>Password</label>
                      <Link to="/forgot-password" className="forgot-password-link">
                        Forgot Password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-submit-primary"
                  >
                    {loading ? 'Authenticating...' : 'Sign In as Member'}
                  </button>
                </form>
              )}

              {/* OTP Login Form */}
              {(memberLoginMethod === 'mobileOtp' || memberLoginMethod === 'emailOtp') && (
                <form onSubmit={handleMemberVerifyOtp} className="login-form">
                  <div className="form-group">
                    <label>
                      {memberLoginMethod === 'emailOtp'
                        ? 'Registered Email Address'
                        : 'Registered 10-Digit Mobile Number'}
                    </label>
                    <div className="input-with-button-row">
                      <input
                        type={memberLoginMethod === 'emailOtp' ? 'email' : 'tel'}
                        required
                        placeholder={
                          memberLoginMethod === 'emailOtp'
                            ? 'you@example.com'
                            : '10-digit mobile number'
                        }
                        value={memberIdentifier}
                        onChange={(e) => setMemberIdentifier(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleMemberSendOtp}
                        className="btn-inline-action"
                      >
                        {memberOtpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {memberOtpNotice && (
                    <div className="login-info-alert">{memberOtpNotice}</div>
                  )}

                  {memberOtpSent && (
                    <div className="form-group">
                      <label>Enter 6-Digit Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        className="otp-input-field"
                        value={memberOtpCode}
                        onChange={(e) => setMemberOtpCode(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !memberOtpSent}
                    className="btn-submit-primary"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify Code & Sign In'}
                  </button>
                </form>
              )}

              {/* Bottom Member Sign Up Banner */}
              <div className="login-card-footer">
                <p>
                  Don't have a Telugu Matrimony profile?{' '}
                  <button
                    type="button"
                    onClick={() => setQuickRegModalOpen(true)}
                    className="inline-signup-btn"
                  >
                    Sign Up Free
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              OPTION 2: STAFF LOGIN (HQ, Branch, Franchise, Agent)
             ══════════════════════════════════════════════════════════ */}
          {activePortal === 'staff' && (
            <div className="portal-content-body staff-portal-body">
              {/* Security Badge */}
              <div className="staff-security-banner">
                <span className="badge-shield">🛡️ Authorized Personnel Only</span>
                <small>
                  Role-based access enforced. All login events are audited. Ordinary members cannot access this console.
                </small>
              </div>

              {/* 2FA Challenge View for Admins */}
              {requires2fa ? (
                <div className="admin-2fa-box">
                  <div className="two-factor-header">
                    <h3>🔐 Two-Factor Authentication (2FA)</h3>
                    <p>
                      {useRecovery
                        ? 'Enter one of your 8-character single-use emergency backup recovery codes.'
                        : (twoFactorNotice || 'Enter the 6-digit verification code sent to your registered Admin mobile.')}
                    </p>
                  </div>

                  {!useRecovery ? (
                    <form onSubmit={handleVerify2fa} className="login-form">
                      <div className="form-group">
                        <label>6-Digit Verification Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          className="otp-input-field"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit-primary"
                      >
                        {loading ? 'Verifying 2FA...' : 'Verify & Enter Console'}
                      </button>

                      <div className="sub-action-links">
                        <button
                          type="button"
                          className="text-link-btn"
                          onClick={() => { setUseRecovery(true); setError(null); }}
                        >
                          Device unavailable? Use Emergency Recovery Code
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyRecoveryCode} className="login-form">
                      <div className="form-group">
                        <label>8-Character Backup Recovery Code</label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          placeholder="e.g. A1B2C3D4"
                          className="otp-input-field"
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                          autoFocus
                        />
                        <small className="help-text">
                          Each recovery code can only be used once.
                        </small>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit-danger"
                      >
                        {loading ? 'Verifying Backup Code...' : 'Consume Recovery Code & Login'}
                      </button>

                      <div className="sub-action-links">
                        <button
                          type="button"
                          className="text-link-btn"
                          onClick={() => { setUseRecovery(false); setError(null); }}
                        >
                          ← Back to 6-digit code
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="cancel-2fa-row">
                    <button
                      type="button"
                      className="cancel-link-btn"
                      onClick={() => {
                        setRequires2fa(false);
                        setChallengeToken(null);
                        setTwoFactorCode('');
                        setRecoveryCode('');
                        setError(null);
                      }}
                    >
                      ← Cancel & Return to Staff Login
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Staff Login Form */
                <form onSubmit={handleStaffPasswordLogin} className="login-form">
                  <div className="form-group">
                    <label>Staff Mobile Number or Staff ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9000000001 or registered mobile"
                      value={staffIdentifier}
                      onChange={(e) => setStaffIdentifier(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label-row">
                      <label>Password</label>
                      <Link to="/forgot-password" className="forgot-password-link">
                        Forgot Password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Enter staff password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-submit-staff"
                  >
                    {loading ? 'Authenticating Staff...' : 'Sign In to Staff Console'}
                  </button>

                  <div className="staff-roles-legend">
                    <span>Authorized roles:</span>
                    <div className="role-tags">
                      <span>HQ Admin</span>
                      <span>Branch Manager</span>
                      <span>Branch Staff</span>
                      <span>Franchise Staff</span>
                      <span>Field Agent</span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Quick Registration Modal Reuse */}
      <MemberAuthModal
        isOpen={quickRegModalOpen}
        onClose={() => setQuickRegModalOpen(false)}
        defaultTab="register"
      />
    </div>
  );
};

export default LoginPage;
