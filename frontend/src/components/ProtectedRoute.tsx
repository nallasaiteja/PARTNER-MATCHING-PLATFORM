import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { RoleType } from '../constants/roles';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: RoleType[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Not logged in
    return <Navigate to="/" replace />;
  }

  // Reject login for Blocked/Terminated at UI level too (though API also blocks)
  if (user.status === 'BLOCKED' || user.status === 'TERMINATED') {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <h2>Access Denied</h2>
        <p>Your account is {user.status.toLowerCase()}. Please contact administration.</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but insufficient role
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        <h2>403 Forbidden</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
