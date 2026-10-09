import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>{role} Portal</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li><Link to="dashboard">Dashboard</Link></li>
            <li><Link to={role === 'Member' ? 'profile' : 'profiles/new'}>Member Data Entry (5-Step)</Link></li>
            <li><Link to="#">Settings</Link></li>
            <li><Link to="/">Logout (Home)</Link></li>
          </ul>
        </nav>
      </aside>
      
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome, {role}</h1>
        </header>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
