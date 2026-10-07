import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/Landing';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Member Routes Shell */}
      <Route path="/member" element={<DashboardLayout role="Member" />}>
        <Route path="dashboard" element={<div>Member Dashboard Content</div>} />
        <Route path="matches" element={<div>Matches (Coming Soon)</div>} />
      </Route>

      {/* Admin / HQ Shell */}
      <Route path="/admin" element={<DashboardLayout role="Admin" />}>
        <Route path="dashboard" element={<div>HQ Admin Dashboard Content</div>} />
        <Route path="staff" element={<div>Staff Management (Coming Soon)</div>} />
      </Route>

      {/* Branch & Franchise Shells */}
      <Route path="/branch" element={<DashboardLayout role="Branch Manager" />}>
        <Route path="dashboard" element={<div>Branch Dashboard Content</div>} />
      </Route>

      <Route path="/franchise" element={<DashboardLayout role="Franchise Manager" />}>
        <Route path="dashboard" element={<div>Franchise Dashboard Content</div>} />
      </Route>

      {/* Staff & Agent Shells */}
      <Route path="/staff" element={<DashboardLayout role="Staff" />}>
        <Route path="dashboard" element={<div>Staff Application Content</div>} />
      </Route>

      <Route path="/agent" element={<DashboardLayout role="Agent" />}>
        <Route path="dashboard" element={<div>Agent Portal Content</div>} />
      </Route>
    </Routes>
  );
}

export default App;
