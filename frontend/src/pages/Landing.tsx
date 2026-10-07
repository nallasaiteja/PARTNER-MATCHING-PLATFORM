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
            <Link to="/member/dashboard" className="btn-primary">Register Free</Link>
            <Link to="/admin/dashboard" className="btn-secondary">Staff / Admin Login</Link>
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
