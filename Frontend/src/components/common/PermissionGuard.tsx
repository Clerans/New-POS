import React from 'react';
import { useUserStore } from '../../store/userStore.js';

interface PermissionGuardProps {
  permission?: string;
  allowedRoles?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  allowedRoles,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyRole } = useUserStore();

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
