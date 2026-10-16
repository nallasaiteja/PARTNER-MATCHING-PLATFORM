import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MemberAuthModal } from './MemberAuthModal';
import { useAuth } from '../auth/AuthProvider';
import { loginWithCredentials, verifyAdmin2faApi } from '../services/memberApi';
import { SEOHead } from '../components/SEOHead';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import { captureAndPersistUtmParams, initFacebookPixel } from '../utils/analytics';
import './Landing.css';

interface LandingPageProps {
  initialOpenAuth?: 'login' | 'register';
}

export const LandingPage: React.FC<LandingPageProps> = ({ initialOpenAuth }) => {
  const [authModalOpen, setAuthModalOpen] = useState(Boolean(initialOpenAuth));
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>(initialOpenAuth || 'register');
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showStaffPortals, setShowStaffPortals] = useState(false);

  const { setSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialOpenAuth) {
      setAuthModalTab(initialOpenAuth);
      setAuthModalOpen(true);
    }
  }, [initialOpenAuth]);

  useEffect(() => {
    captureAndPersistUtmParams();
    initFacebookPixel();
  }, []);

  const openAuth = (tab: 'login' | 'register') => {
    if (tab === 'login') {
      navigate('/login');
      return;
    }
    setAuthModalTab(tab);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleRoleQuickLogin = async (identifier: string, targetPath: string) => {
    setQuickLoginLoading(true);
    try {
      const res = await loginWithCredentials({ identifier, password: 'Test@1234' });

      // Handle mandatory 2FA challenge for Admin/Super-Admin accounts
      if (res.requires2fa) {
        if (res.devCode) {
          const twoFaRes = await verifyAdmin2faApi(res.challengeToken, res.devCode);
          setSession(twoFaRes.accessToken, twoFaRes.user, null);
          navigate(targetPath);
          return;
        } else {
          openAuth('login');
          return;
        }
      }

      setSession(res.accessToken, res.user, res.memberProfile);
      navigate(targetPath);
    } catch (e: any) {
      alert(e.message || 'Login failed. Please verify credentials.');
    } finally {
      setQuickLoginLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <SEOHead
        title="Telugu Matrimony & Matchmaking | Find Your Life Partner"
        description="The most trusted partner matching platform for Telugu-speaking families across AP, Telangana, and worldwide. 100% ID verified profiles."
        canonicalPath="/"
        keywords="telugu matrimony, matchmaking, andhra matrimony, telangana matrimony, verified profiles, assisted partner matching"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Partner Matching Platform',
          url: 'https://partnermatchingplatform.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://partnermatchingplatform.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />

      {/* Navigation Bar */}
      <header className="landing-navbar">
        <div className="navbar-content">
          <Link to="/" className="brand-logo">
            <span className="brand-crest">💍</span>
            <div className="brand-text-block">
              <span className="brand-title">Partner Matching</span>
              <span className="brand-subtitle">Telugu Matrimonial Portal</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            <Link to="/" className="nav-link active">Home</Link>
            <Link to="/success-stories" className="nav-link">💖 Success Stories</Link>
            <Link to="/careers" className="nav-link">💼 Careers</Link>
            <button
              onClick={() => navigate('/login')}
              className="btn-nav-login"
            >
              Login
            </button>
            <button
              onClick={() => openAuth('register')}
              className="btn-nav-register"
            >
              Sign Up
            </button>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/success-stories" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>💖 Success Stories</Link>
            <Link to="/careers" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>💼 Careers</Link>
            <div className="mobile-auth-actions">
              <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="btn-mobile-login">Login</button>
              <button onClick={() => openAuth('register')} className="btn-mobile-register">Sign Up</button>
            </div>
          </div>
        )}
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-badge">
              <span className="sparkle">✨</span> Telugu Community Matrimony • Andhra Pradesh & Telangana
            </div>
            <h1 className="hero-headline">
              Begin Your Journey to a <br />
              <span className="gradient-text">Blessed Life Partnership</span>
            </h1>
            <p className="hero-subtext">
              Connecting verified brides and grooms across Telugu communities with trusted family backgrounds,
              astrological Guna Milan compatibility, and dedicated relationship management.
            </p>

            {/* Quick Staff Portals Accordion */}
            <div className="staff-portal-toggle-wrap">
              <button
                type="button"
                className="btn-toggle-portals"
                onClick={() => setShowStaffPortals(!showStaffPortals)}
              >
                {showStaffPortals ? '▲ Hide Staff & Demo Access' : '▼ Developer & Staff Quick Portals (Click to Expand)'}
              </button>

              {showStaffPortals && (
                <div className="staff-portals-grid" style={{ flexDirection: 'column', gap: '14px' }}>
                  {/* Category 1: HQ & Administration */}
                  <div className="portal-category-group">
                    <span className="portal-category-title">👑 HQ & Operations</span>
                    <div className="portal-chips-row">
                      <button
                        onClick={() => handleRoleQuickLogin('9000000001', '/admin/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip admin-chip"
                        title="HQ Super Admin with full RBAC & 2FA"
                      >
                        🛡️ Super Admin (2FA)
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000002', '/admin/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip admin-chip"
                        title="HQ Admin Operations & Verification"
                      >
                        ⚖️ Admin (Operations)
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000003', '/admin/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip hq-chip"
                        title="HQ Service Team Support"
                      >
                        🎧 HQ Service Team
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Branch Network */}
                  <div className="portal-category-group">
                    <span className="portal-category-title">🏢 Branch Network (Branch A)</span>
                    <div className="portal-chips-row">
                      <button
                        onClick={() => handleRoleQuickLogin('9000000004', '/branch/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip branch-chip"
                        title="Branch Manager Portal"
                      >
                        🏢 Branch Manager
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000005', '/branch/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip staff-chip"
                        title="Branch Staff (Free Team & Follow-ups)"
                      >
                        📋 Branch Staff
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000006', '/agent/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip agent-chip"
                        title="Branch Field Agent Portal"
                      >
                        💼 Branch Agent
                      </button>
                    </div>
                  </div>

                  {/* Category 3: Franchise Network */}
                  <div className="portal-category-group">
                    <span className="portal-category-title">🏪 Franchise Network (Franchise A)</span>
                    <div className="portal-chips-row">
                      <button
                        onClick={() => handleRoleQuickLogin('9000000008', '/franchise/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip franchise-chip"
                        title="Franchise Manager & Wallet Portal"
                      >
                        🏪 Franchise Manager
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000009', '/franchise/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip franchise-chip"
                        title="Franchise Staff Operations"
                      >
                        📑 Franchise Staff
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9000000010', '/agent/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip agent-chip"
                        title="Franchise Field Agent Portal"
                      >
                        🤝 Franchise Agent
                      </button>
                    </div>
                  </div>

                  {/* Category 4: Member Profiles */}
                  <div className="portal-category-group">
                    <span className="portal-category-title">💍 Demo Member Accounts</span>
                    <div className="portal-chips-row">
                      <button
                        onClick={() => handleRoleQuickLogin('9888800001', '/member/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip groom-chip"
                        title="100% Completed Groom Profile (Karthik Varma)"
                      >
                        🤵 Groom (100% - Karthik)
                      </button>
                      <button
                        onClick={() => handleRoleQuickLogin('9777700005', '/member/dashboard')}
                        disabled={quickLoginLoading}
                        className="portal-chip bride-chip"
                        title="100% Completed Bride Profile (Kavya Chowdary)"
                      >
                        👰 Bride (100% - Kavya)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trust Metrics Bar */}
        <section className="trust-metrics-bar">
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-icon">🛡️</span>
              <div className="metric-info">
                <h3>100% ID Verified</h3>
                <p>Aadhaar & Government KYC Checked</p>
              </div>
            </div>
            <div className="metric-box">
              <span className="metric-icon">⭐</span>
              <div className="metric-info">
                <h3>Astrology & Horoscope</h3>
                <p>Complete Guna Milan Compatibility</p>
              </div>
            </div>
            <div className="metric-box">
              <span className="metric-icon">🏢</span>
              <div className="metric-info">
                <h3>Multi-Branch Network</h3>
                <p>Hyderabad, Vijayawada, Visakhapatnam & Global</p>
              </div>
            </div>
            <div className="metric-box">
              <span className="metric-icon">🔒</span>
              <div className="metric-info">
                <h3>70% Privacy Shield</h3>
                <p>Protected Contact & Photo Visibility</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="features-section">
          <div className="section-header-block">
            <span className="section-eyebrow">Why Telugu Families Trust Us</span>
            <h2 className="section-heading">Designed for Tradition, Built for Security</h2>
            <p className="section-subtext">
              We combine community matrimonial values with modern technological safeguards so you can connect with confidence.
            </p>
          </div>

          <div className="features-cards-grid">
            <div className="feature-card">
              <div className="feature-icon-bubble">🕉️</div>
              <h3>Comprehensive Community Hierarchy</h3>
              <p>
                Precise master mapping for Religions, Castes, Sub-castes, Gothrams, Stars (Nakshatras), and Moon Signs (Rasis).
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-bubble">🤝</div>
              <h3>Assisted Matchmaking & Branches</h3>
              <p>
                Local relationship managers and dedicated branch staff assist families from initial profile match to wedding bells.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-bubble">🔐</div>
              <h3>Strict Contact Privacy Controls</h3>
              <p>
                Your phone number and photographs remain private until you review and explicitly accept an interest request.
              </p>
            </div>
          </div>
        </section>

        {/* Video Showcase Section */}
        <section className="video-showcase-section">
          <div className="video-container-card">
            <div className="video-header-text">
              <span className="section-eyebrow">Video Walkthrough</span>
              <h2>Discover Our Assisted Matchmaking Experience</h2>
              <p>
                Watch how our relationship managers assist Telugu families with verified partner matching and wedding arrangements.
              </p>
            </div>
            <div className="embed-wrapper">
              <YouTubeEmbed
                url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                title="Introduction to Telugu Partner Matching Platform"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-col brand-col">
            <div className="brand-logo footer-logo">
              <span className="brand-crest">💍</span>
              <span className="brand-title">Partner Matching Platform</span>
            </div>
            <p>
              The premium matrimonial network connecting Telugu families across Andhra Pradesh, Telangana, India, and worldwide NRIs.
            </p>
            <div className="copyright-tag">
              &copy; {new Date().getFullYear()} Partner Matching Platform. All rights reserved.
            </div>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><button onClick={() => openAuth('register')} className="footer-link-btn">Sign Up</button></li>
              <li><button onClick={() => navigate('/login')} className="footer-link-btn">Login</button></li>
              <li><Link to="/success-stories">Success Stories</Link></li>
              <li><Link to="/careers">Careers & Hiring</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Safety & Governance</h4>
            <ul>
              <li><span>🛡️ 100% ID Proof Verified</span></li>
              <li><span>🔒 Privacy First Protection</span></li>
              <li><span>📑 Anti-Fraud & Block Rules</span></li>
              <li><span>⚖️ 24/7 Member Grievance SLA</span></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <MemberAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
};

export default LandingPage;
