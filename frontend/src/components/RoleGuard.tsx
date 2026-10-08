import React, { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { RoleType, PermissionType, ROLE_PERMISSIONS } from '../constants/roles';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: RoleType[];
  requiredPermission?: PermissionType;
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI elements based on User Role and Permissions.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Suspended users shouldn't see most buttons even if their role permits it normally
  // (We could mirror SUSPENDED_BLOCKED_PERMISSIONS here, but let's rely on backend where possible,
  // or explicitly handle it if we want strict UI hiding).
  if (user.status === 'SUSPENDED') {
    if (requiredPermission && requiredPermission !== 'PROFILE_CREATE' && requiredPermission !== 'PROFILE_EDIT') {
      return <>{fallback}</>;
    }
  }

  // 1. Check roles if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // 2. Check permission if specified
  if (requiredPermission) {
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    if (!rolePerms.includes(requiredPermission)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
