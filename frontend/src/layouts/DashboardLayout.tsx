import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import MobileBottomNav from '../components/MobileBottomNav';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
  const { memberProfile, logout } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Automatically close mobile menu on page transition
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const isMember = role === 'Member';

  const memberNavItems = [
    { label: '📊 Dashboard', path: '/member/dashboard' },
    { label: '👤 My Profile', path: '/member/profile' },
    { label: '💍 Verified View (Caste)', path: '/member/matches/verified' },
    { label: '✨ Matched View (Preferences)', path: '/member/matches/matched' },
    { label: '💌 Interests', path: '/member/interests' },
    { label: '⭐ Shortlisted Profiles', path: '/member/shortlist' },
    { label: '👁️ Profile Activity', path: '/member/activity' },
    { label: '📞 Revealed Contacts', path: '/member/contacts' },
    { label: '💎 Upgrade Plan', path: '/member/upgrade' },
    { label: '⚙️ Account Settings', path: '/member/settings' },
  ];

  return (
    <div className="dashboard-container">
      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-row">
            <div className="logo-badge">PMP</div>
            <button
              className="sidebar-close-mobile-btn"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>
          <h2>{role} Portal</h2>
          {isMember && memberProfile?.memberId && (
            <div className="sidebar-member-tag">
              <span className="member-id-label">ID: {memberProfile.memberId}</span>
              <span className={`pkg-tag ${memberProfile.packageType === 'PAID' ? 'pkg-paid' : 'pkg-free'}`}>
                {memberProfile.packageType || 'FREE'}
              </span>
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          <ul>
            {isMember ? (
              <>
                {memberNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={isActive ? 'active-nav-link' : ''}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button onClick={logout} className="logout-sidebar-btn">
                    🚪 Logout
                  </button>
                </li>
              </>
            ) : role === 'Agent' || role === 'Branch Agent' || role === 'Franchise Agent' ? (
              <>
                <li>
                  <Link to="/agent/dashboard" className={location.pathname === '/agent/dashboard' ? 'active-nav-link' : ''}>
                    📊 Agent Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/agent/profiles/new" className={location.pathname === '/agent/profiles/new' ? 'active-nav-link' : ''}>
                    ➕ Register Member
                  </Link>
                </li>
                <li>
                  <Link to="/agent/profiles" className={location.pathname === '/agent/profiles' ? 'active-nav-link' : ''}>
                    👥 My Created Profiles
                  </Link>
                </li>
                <li>
                  <Link to="/agent/invoices" className={location.pathname.startsWith('/agent/invoices') ? 'active-nav-link' : ''}>
                    💳 Invoice Requests
                  </Link>
                </li>
                <li>
                  <Link to="/agent/commissions" className={location.pathname === '/agent/commissions' ? 'active-nav-link' : ''}>
                    🎖️ Commission History
                  </Link>
                </li>
                <li>
                  <button onClick={logout} className="logout-sidebar-btn">
                    🚪 Logout
                  </button>
                </li>
              </>
            ) : role === 'Branch Staff' ? (
              <>
                <li>
                  <Link to="/branch/dashboard" className={location.pathname === '/branch/dashboard' ? 'active-nav-link' : ''}>
                    🏢 Branch Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/branch/invoices" className={location.pathname.startsWith('/branch/invoices') ? 'active-nav-link' : ''}>
                    💳 Invoices & Requests
                  </Link>
                </li>
                <li>
                  <Link to="/branch/notifications" className={location.pathname === '/branch/notifications' ? 'active-nav-link' : ''}>
                    📡 Communications & Bulk SMS
                  </Link>
                </li>
                <li>
                  <Link to="/branch/leave-management" className={location.pathname === '/branch/leave-management' ? 'active-nav-link' : ''}>
                    📅 Leave & Attendance
                  </Link>
                </li>
                <li>
                  <Link to="/branch/suggestions" className={location.pathname === '/branch/suggestions' ? 'active-nav-link' : ''}>
                    🤝 Suggested Profiles
                  </Link>
                </li>
                <li>
                  <Link to="/branch/profiles/new" className={location.pathname === '/branch/profiles/new' ? 'active-nav-link' : ''}>
                    📝 Member Data Entry
                  </Link>
                </li>
                <li>
                  <button onClick={logout} className="logout-sidebar-btn">
                    🚪 Logout
                  </button>
                </li>
              </>
            ) : role === 'Franchise Staff' ? (
              <>
                <li>
                  <Link to="/franchise/invoices" className={location.pathname.startsWith('/franchise/invoices') ? 'active-nav-link' : ''}>
                    💳 Invoices & Approvals
                  </Link>
                </li>
                <li>
                  <Link to="/franchise/wallet" className={location.pathname === '/franchise/wallet' ? 'active-nav-link' : ''}>
                    💼 Franchise Wallet
                  </Link>
                </li>
                <li>
                  <Link to="/franchise/commissions" className={location.pathname === '/franchise/commissions' ? 'active-nav-link' : ''}>
                    🎖️ Commissions
                  </Link>
                </li>
                <li>
                  <button onClick={logout} className="logout-sidebar-btn">
                    🚪 Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/admin/dashboard" className={location.pathname === '/admin/dashboard' ? 'active-nav-link' : ''}>
                    📊 Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin/reports" className={location.pathname.startsWith('/admin/reports') ? 'active-nav-link' : ''}>
                    📈 Reports & Analytics
                  </Link>
                </li>
                <li>
                  <Link to="/branch/dashboard" className={location.pathname.startsWith('/branch/dashboard') ? 'active-nav-link' : ''}>
                    🏢 Branch Operations
                  </Link>
                </li>
                <li>
                  <Link to="/admin/invoices" className={location.pathname.startsWith('/admin/invoices') ? 'active-nav-link' : ''}>
                    💳 Invoices & Approvals
                  </Link>
                </li>
                <li>
                  <Link to="/admin/wallets" className={location.pathname.startsWith('/admin/wallets') ? 'active-nav-link' : ''}>
                    💼 Franchise Wallets
                  </Link>
                </li>
                <li>
                  <Link to="/admin/ledgers" className={location.pathname.startsWith('/admin/ledgers') ? 'active-nav-link' : ''}>
                    📊 Financial Ledgers
                  </Link>
                </li>
                <li>
                  <Link to="/admin/commissions" className={location.pathname.startsWith('/admin/commissions') ? 'active-nav-link' : ''}>
                    🎖️ Commissions
                  </Link>
                </li>
                <li>
                  <Link to="/admin/staff" className={location.pathname.startsWith('/admin/staff') ? 'active-nav-link' : ''}>
                    👥 Staff Management
                  </Link>
                </li>
                <li>
                  <Link to="/admin/members" className={location.pathname.startsWith('/admin/members') ? 'active-nav-link' : ''}>
                    💍 Member Management
                  </Link>
                </li>
                <li>
                  <Link to="/admin/mobile-requests" className={location.pathname === '/admin/mobile-requests' ? 'active-nav-link' : ''}>
                    📱 Mobile Requests
                  </Link>
                </li>
                <li>
                  <Link to="/admin/alerts" className={location.pathname === '/admin/alerts' ? 'active-nav-link' : ''}>
                    🔔 Alerts & Reminders
                  </Link>
                </li>
                <li>
                  <Link to="/admin/notifications" className={location.pathname === '/admin/notifications' ? 'active-nav-link' : ''}>
                    📡 Communications & Notifications
                  </Link>
                </li>
                <li>
                  <Link to="/admin/settings" className={location.pathname === '/admin/settings' ? 'active-nav-link' : ''}>
                    ⚙️ Master Data & Settings
                  </Link>
                </li>
                <li>
                  <Link to="/admin/packages" className={location.pathname === '/admin/packages' ? 'active-nav-link' : ''}>
                    📦 Packages Module
                  </Link>
                </li>
                <li>
                  <Link to="/admin/search" className={location.pathname === '/admin/search' ? 'active-nav-link' : ''}>
                    🔍 Advanced Search
                  </Link>
                </li>
                <li>
                  <Link to="/admin/featured" className={location.pathname === '/admin/featured' ? 'active-nav-link' : ''}>
                    ⭐ Featured Profiles
                  </Link>
                </li>
                <li>
                  <Link to="/admin/ads" className={location.pathname === '/admin/ads' ? 'active-nav-link' : ''}>
                    📢 Advertisements
                  </Link>
                </li>
                <li>
                  <Link to="/admin/wedding-services" className={location.pathname === '/admin/wedding-services' ? 'active-nav-link' : ''}>
                    💒 Wedding Services
                  </Link>
                </li>
                <li>
                  <Link to="/admin/success-stories" className={location.pathname === '/admin/success-stories' ? 'active-nav-link' : ''}>
                    💖 Success Stories
                  </Link>
                </li>
                <li>
                  <Link to="/admin/careers" className={location.pathname === '/admin/careers' ? 'active-nav-link' : ''}>
                    💼 Career Applications
                  </Link>
                </li>
                <li>
                  <Link to="/admin/leave-management" className={location.pathname === '/admin/leave-management' ? 'active-nav-link' : ''}>
                    📅 Leave & Attendance
                  </Link>
                </li>
                <li>
                  <Link to="/admin/complaints" className={location.pathname === '/admin/complaints' ? 'active-nav-link' : ''}>
                    ⚖️ Internal Complaints
                  </Link>
                </li>
                <li>
                  <Link to="/admin/suggestions" className={location.pathname === '/admin/suggestions' ? 'active-nav-link' : ''}>
                    🤝 Suggested Profiles
                  </Link>
                </li>
                <li>
                  <Link to="/admin/marketing" className={location.pathname === '/admin/marketing' ? 'active-nav-link' : ''}>
                    🎯 Marketing & Attribution
                  </Link>
                </li>
                <li>
                  <Link to="/admin/profiles/new" className={location.pathname === '/admin/profiles/new' ? 'active-nav-link' : ''}>
                    📝 Member Data Entry
                  </Link>
                </li>
                <li>
                  <button onClick={logout} className="logout-sidebar-btn">
                    🚪 Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Toggle navigation drawer"
              title="Menu"
            >
              <span className="hamburger-bar"></span>
              <span className="hamburger-bar"></span>
              <span className="hamburger-bar"></span>
            </button>
            <div className="header-titles-box">
              <h1 className="header-title">Partner Matching Platform</h1>
              <span className="header-subtitle">Telugu Matrimony & Global Community</span>
            </div>
          </div>
          <div className="header-right">
            {isMember && memberProfile ? (
              <div className="header-member-info">
                <span className="member-greeting">Welcome, {memberProfile.firstName}</span>
                <span className="member-id-chip">{memberProfile.memberId}</span>
              </div>
            ) : (
              <span className="user-role-badge">{role}</span>
            )}
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
      {isMember && <MobileBottomNav />}
    </div>
  );
};

export default DashboardLayout;
