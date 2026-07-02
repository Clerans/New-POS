import { useUserStore } from '../store/userStore.js';

export const checkPermission = (permission: string): boolean => {
  return useUserStore.getState().hasPermission(permission);
};

export const checkAnyPermission = (permissions: string[]): boolean => {
  const user = useUserStore.getState().user;
  if (!user) return false;
  if (user.roles.includes('Admin') || user.roles.includes('admin')) return true;
  return permissions.some((p) => user.permissions.includes(p));
};

export const checkAllPermissions = (permissions: string[]): boolean => {
  const user = useUserStore.getState().user;
  if (!user) return false;
  if (user.roles.includes('Admin') || user.roles.includes('admin')) return true;
  return permissions.every((p) => user.permissions.includes(p));
};
