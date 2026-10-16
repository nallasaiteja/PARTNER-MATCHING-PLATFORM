import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileBottomNav.css';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const MEMBER_BOTTOM_ITEMS: NavItem[] = [
  { label: 'Home', path: '/member/dashboard', icon: '📊' },
  { label: 'Verified', path: '/member/matches/verified', icon: '💍' },
  { label: 'Matched', path: '/member/matches/matched', icon: '✨' },
  { label: 'Interests', path: '/member/interests', icon: '💌' },
  { label: 'Profile', path: '/member/profile', icon: '👤' },
];

export const MobileBottomNav: React.FC = () => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {MEMBER_BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mobile-nav-tab ${isActive ? 'mobile-nav-tab-active' : ''}`
            }
          >
            <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
