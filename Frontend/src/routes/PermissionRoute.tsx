import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/userStore.js';

interface PermissionRouteProps {
  permission?: string;
  allowedRoles?: string | string[];
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  allowedRoles,
}) => {
  const { hasPermission, hasAnyRole } = useUserStore();

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    hasAccess = false;
  }

  return hasAccess ? <Outlet /> : <Navigate to="/forbidden" replace />;
};

export default PermissionRoute;
