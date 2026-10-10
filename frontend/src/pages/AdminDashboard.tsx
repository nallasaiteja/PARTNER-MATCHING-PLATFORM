import React, { useEffect, useState } from 'react';
import { RoleGuard } from '../components/RoleGuard';
import { Permission } from '../constants/roles';
import { fetchContactRevealPackages, setContactRevealPackages } from '../services/profileApi';

export const AdminDashboard: React.FC = () => {
  const [paidPackageEligible, setPaidPackageEligible] = useState(true);
  const [settingMessage, setSettingMessage] = useState('');

  useEffect(() => {
    fetchContactRevealPackages()
      .then(({ packageTypes }) => setPaidPackageEligible(packageTypes.includes('PAID')))
      .catch((error: Error) => setSettingMessage(error.message));
  }, []);

  const updateRevealSetting = async (enabled: boolean) => {
    setSettingMessage('');
    try {
      const result = await setContactRevealPackages(enabled ? ['PAID'] : []);
      setPaidPackageEligible(result.packageTypes.includes('PAID'));
    } catch (error) {
      setSettingMessage(error instanceof Error ? error.message : 'Unable to update setting');
    }
  };

  return (
    <div>
      <h2>HQ Admin Dashboard</h2>
      
      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        {/* Export Button - Only Super Admin & Admin */}
        <RoleGuard requiredPermission={Permission.MEMBER_EXPORT}>
          <button style={{ background: '#007bff', color: 'white', padding: '10px' }}>
            Export Member Data
          </button>
        </RoleGuard>

        {/* Unblock Button - Only Super Admin & Admin */}
        <RoleGuard requiredPermission={Permission.MEMBER_UNBLOCK}>
          <button style={{ background: '#ffc107', color: 'black', padding: '10px' }}>
            Unblock Member
          </button>
        </RoleGuard>

        {/* Staff Management - Super Admin, Admin, Franchise Manager */}
        <RoleGuard requiredPermission={Permission.STAFF_CREATE}>
          <button style={{ background: '#28a745', color: 'white', padding: '10px' }}>
            Manage Staff
          </button>
        </RoleGuard>

        {/* Invoice Approval */}
        <RoleGuard requiredPermission={Permission.INVOICE_APPROVE}>
          <button style={{ background: '#17a2b8', color: 'white', padding: '10px' }}>
            Approve Invoices
          </button>
        </RoleGuard>
      </div>

      <RoleGuard requiredPermission={Permission.MEMBER_UNBLOCK}>
        <section className="profile-address-section" style={{ marginTop: '24px' }}>
          <h3 className="address-section-title">Contact Revelation Eligibility</h3>
          <label className="radio-label">
            <input type="checkbox" checked={paidPackageEligible}
              onChange={(event) => void updateRevealSetting(event.target.checked)} />
            Allow Acceptance Preference for Paid profiles
          </label>
          {settingMessage && <p className="form-error-msg">{settingMessage}</p>}
        </section>
      </RoleGuard>
    </div>
  );
};
