import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import { Permission, Role } from '../constants/roles';

export const AdminDashboard: React.FC = () => {
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
    </div>
  );
};
