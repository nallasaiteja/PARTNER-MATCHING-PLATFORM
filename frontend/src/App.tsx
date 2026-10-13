import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/Landing';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import MemberProfileFormPage from './pages/MemberProfileFormPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { Role } from './constants/roles';

import { MemberDashboardPage } from './pages/MemberDashboardPage';
import { VerifiedViewPage } from './pages/VerifiedViewPage';
import { MatchedViewPage } from './pages/MatchedViewPage';
import { InterestsPage } from './pages/InterestsPage';
import { UpgradePlanPage } from './pages/UpgradePlanPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { MemberActivityPage } from './pages/MemberActivityPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile-form/:profileId?" element={<MemberProfileFormPage />} />
        
        {/* Member Routes Shell (Section 4) */}
        <Route path="/member" element={
          <ProtectedRoute allowedRoles={[Role.MEMBER]}>
            <DashboardLayout role="Member" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<MemberDashboardPage />} />
          <Route path="profile" element={<MemberProfileFormPage />} />
          <Route path="profile/:profileId" element={<MemberProfileFormPage />} />
          <Route path="matches/verified" element={<VerifiedViewPage />} />
          <Route path="matches/matched" element={<MatchedViewPage />} />
          <Route path="interests" element={<InterestsPage />} />
          <Route path="upgrade" element={<UpgradePlanPage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
          <Route path="activity" element={<MemberActivityPage initialTab="views" />} />
          <Route path="contacts" element={<MemberActivityPage initialTab="contacts" />} />
          <Route path="shortlist" element={<MemberActivityPage initialTab="shortlist" />} />
        </Route>

        {/* Admin / HQ Shell */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM]}>
            <DashboardLayout role="HQ Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
          <Route path="staff" element={<div>Staff Management</div>} />
        </Route>

        {/* Branch Shells */}
        <Route path="/branch" element={
          <ProtectedRoute allowedRoles={[Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.BRANCH_AGENT]}>
            <DashboardLayout role="Branch Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<div>Branch Dashboard Content</div>} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
        </Route>

        {/* Franchise Shells */}
        <Route path="/franchise" element={
          <ProtectedRoute allowedRoles={[Role.FRANCHISE_MANAGER, Role.FRANCHISE_STAFF, Role.FRANCHISE_AGENT]}>
            <DashboardLayout role="Franchise Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<div>Franchise Dashboard Content</div>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
