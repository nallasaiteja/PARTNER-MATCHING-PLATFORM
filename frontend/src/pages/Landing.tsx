import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <header className="navbar">
        <div className="logo">Partner Matching Platform</div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="#about">About</Link>
          <Link to="/member/dashboard" className="login-btn">Login / Register</Link>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <h1>Find Your Perfect Life Partner</h1>
          <p>
            The most trusted platform for Telugu-speaking families across Andhra Pradesh, 
            Telangana, and worldwide. Inclusive of all castes and backgrounds.
          </p>
          <div className="hero-buttons">
            <button onClick={() => {
              localStorage.setItem('user', JSON.stringify({ id: 'user-member-free', role: 'MEMBER', status: 'ACTIVE', organizationId: 'org-branch-a' }));
              window.location.href = '/member/profile';
            }} className="btn-primary" style={{ background: '#e91e63', color: '#fff', fontWeight: 'bold' }}>
              Member Data Entry (5-Step Form)
            </button>

            <button onClick={() => {
              window.location.href = '/profile-form';
            }} className="btn-secondary" style={{ border: '2px solid #e91e63', color: '#e91e63' }}>
              Direct Form Architecture Preview
            </button>

            <button onClick={() => {
              localStorage.setItem('user', JSON.stringify({ id: 'user-super-admin', role: 'SUPER_ADMIN', status: 'ACTIVE', organizationId: 'org-hq' }));
              window.location.href = '/admin/dashboard';
            }} className="btn-secondary">Login as Super Admin</button>

            <button onClick={() => {
              localStorage.setItem('user', JSON.stringify({ id: 'user-branch-a-manager', role: 'BRANCH_MANAGER', status: 'ACTIVE', organizationId: 'org-branch-a' }));
              window.location.href = '/branch/dashboard';
            }} className="btn-secondary">Login as Branch Manager</button>
            
            <button onClick={() => {
              localStorage.setItem('user', JSON.stringify({ id: 'user-suspended', role: 'BRANCH_STAFF', status: 'SUSPENDED', organizationId: 'org-branch-a' }));
              window.location.href = '/branch/dashboard';
            }} className="btn-secondary">Login as Suspended Staff</button>

            <button onClick={() => {
              localStorage.setItem('user', JSON.stringify({ id: 'user-blocked', role: 'BRANCH_STAFF', status: 'BLOCKED', organizationId: 'org-branch-a' }));
              window.location.href = '/branch/dashboard'; // Should get blocked by ProtectedRoute
            }} className="btn-secondary">Login as Blocked Staff</button>
          </div>
        </section>

        <section className="features-section">
          <h2>Why Choose Us?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Global Reach</h3>
              <p>Connecting NRIs in USA, UK, Middle East, Australia, and India.</p>
            </div>
            <div className="feature-card">
              <h3>Inclusive Platform</h3>
              <p>Supporting first marriages, second marriages, divorced, and widowed profiles securely.</p>
            </div>
            <div className="feature-card">
              <h3>Verified Profiles</h3>
              <p>Mandatory ID proof verification backed by a multi-tier administration team.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Partner Matching Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
