import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
  const { memberProfile, logout } = useAuth();
  const location = useLocation();

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
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-badge">PMP</div>
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
            ) : (
              <>
                <li><Link to="dashboard">Dashboard</Link></li>
                <li><Link to="profiles/new">Member Data Entry (5-Step)</Link></li>
                <li><Link to="#">Settings</Link></li>
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
            <h1>Partner Matching Platform</h1>
            <span className="header-subtitle">Telugu Matrimony & Global Community</span>
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
    </div>
  );
};

export default DashboardLayout;
