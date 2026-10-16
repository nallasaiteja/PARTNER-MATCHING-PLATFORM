import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { initializeNativeApp } from './services/nativeService';
import LandingPage from './pages/Landing';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { MemberManagementPage } from './pages/MemberManagementPage';
import { MobileRequestsPage } from './pages/MobileRequestsPage';
import { AlertsModulePage } from './pages/AlertsModulePage';
import { MasterDataPage } from './pages/MasterDataPage';
import { AdminPackagesPage } from './pages/AdminPackagesPage';
import { AdvancedSearchPage } from './pages/AdvancedSearchPage';
import { FeaturedProfilesPage } from './pages/FeaturedProfilesPage';
import { AdvertisementsPage } from './pages/AdvertisementsPage';
import { WeddingServicesPage } from './pages/WeddingServicesPage';
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
import { InvoiceManagementPage } from './pages/InvoiceManagementPage';
import { FranchiseWalletPage } from './pages/FranchiseWalletPage';
import { FinancialLedgersPage } from './pages/FinancialLedgersPage';
import { CommissionManagementPage } from './pages/CommissionManagementPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { BranchManagerDashboard } from './pages/BranchManagerDashboard';
import { AgentDashboardPage } from './pages/AgentDashboardPage';
import { AgentProfilesPage } from './pages/AgentProfilesPage';
import { AgentInvoicesPage } from './pages/AgentInvoicesPage';
import { AgentCommissionPage } from './pages/AgentCommissionPage';
import { NotificationsCenterPage } from './pages/NotificationsCenterPage';
import { SuccessStoriesPage } from './pages/SuccessStoriesPage';
import { AdminSuccessStoriesPage } from './pages/AdminSuccessStoriesPage';
import { CareersPage } from './pages/CareersPage';
import { AdminCareersPage } from './pages/AdminCareersPage';
import { LeaveManagementPage } from './pages/LeaveManagementPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { StaffSuggestionsPage } from './pages/StaffSuggestionsPage';
import { AdminMarketingPage } from './pages/AdminMarketingPage';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const cleanup = initializeNativeApp((dest) => {
      if (typeof dest === 'number') {
        navigate(dest);
      } else {
        navigate(dest);
      }
    });
    return () => {
      cleanup();
    };
  }, [navigate]);

  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LandingPage initialOpenAuth="register" />} />
        <Route path="/register" element={<LandingPage initialOpenAuth="register" />} />
        <Route path="/success-stories" element={<SuccessStoriesPage />} />
        <Route path="/careers" element={<CareersPage />} />
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
          <Route path="shortlist" element={<MemberActivityPage initialTab="shortlist" />} />
          <Route path="activity" element={<MemberActivityPage initialTab="views" />} />
          <Route path="contacts" element={<MemberActivityPage initialTab="contacts" />} />
          <Route path="upgrade" element={<UpgradePlanPage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
        </Route>

        {/* Admin / HQ Shell */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM]}>
            <DashboardLayout role="HQ Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="reports" element={
            <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN]}>
              <ReportsAnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="branch-view" element={<BranchManagerDashboard />} />
          <Route path="invoices" element={<InvoiceManagementPage />} />
          <Route path="wallets" element={<FranchiseWalletPage />} />
          <Route path="ledgers" element={<FinancialLedgersPage />} />
          <Route path="commissions" element={<CommissionManagementPage />} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
          <Route path="staff" element={<StaffManagementPage />} />
          <Route path="members" element={<MemberManagementPage />} />
          <Route path="mobile-requests" element={<MobileRequestsPage />} />
          <Route path="alerts" element={<AlertsModulePage />} />
          <Route path="notifications" element={<NotificationsCenterPage />} />
          <Route path="settings" element={<MasterDataPage />} />
          <Route path="packages" element={<AdminPackagesPage />} />
          <Route path="search" element={<AdvancedSearchPage />} />
          <Route path="featured" element={<FeaturedProfilesPage />} />
          <Route path="ads" element={<AdvertisementsPage />} />
          <Route path="wedding-services" element={<WeddingServicesPage />} />
          <Route path="success-stories" element={<AdminSuccessStoriesPage />} />
          <Route path="careers" element={<AdminCareersPage />} />
          <Route path="leave-management" element={<LeaveManagementPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
          <Route path="suggestions" element={<StaffSuggestionsPage />} />
          <Route path="marketing" element={<AdminMarketingPage />} />
        </Route>

        {/* Branch Shells (Branch Managers and Branch Staff only) */}
        <Route path="/branch" element={
          <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER, Role.BRANCH_STAFF]}>
            <DashboardLayout role="Branch Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<BranchManagerDashboard />} />
          <Route path="invoices" element={<InvoiceManagementPage />} />
          <Route path="notifications" element={<NotificationsCenterPage />} />
          <Route path="leave-management" element={<LeaveManagementPage />} />
          <Route path="suggestions" element={<StaffSuggestionsPage />} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
        </Route>

        {/* Franchise Shells (Franchise Managers and Franchise Staff only) */}
        <Route path="/franchise" element={
          <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER, Role.FRANCHISE_STAFF]}>
            <DashboardLayout role="Franchise Staff" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<InvoiceManagementPage />} />
          <Route path="invoices" element={<InvoiceManagementPage />} />
          <Route path="wallet" element={<FranchiseWalletPage />} />
          <Route path="commissions" element={<CommissionManagementPage />} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
        </Route>

        {/* Agent Portal Shell (Section 9 - Branch Agent & Franchise Agent) */}
        <Route path="/agent" element={
          <ProtectedRoute allowedRoles={[Role.BRANCH_AGENT, Role.FRANCHISE_AGENT]}>
            <DashboardLayout role="Agent" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AgentDashboardPage />} />
          <Route path="profiles" element={<AgentProfilesPage />} />
          <Route path="profiles/new" element={<MemberProfileFormPage />} />
          <Route path="profiles/:profileId" element={<MemberProfileFormPage />} />
          <Route path="invoices" element={<AgentInvoicesPage />} />
          <Route path="commissions" element={<AgentCommissionPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
