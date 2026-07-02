import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  branchId?: string;
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string | string[]) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  hasPermission: (permission) => {
    const user = get().user;
    if (!user) return false;

    // Super Admins, Admins, and Owners bypass all check barriers
    const hasBypassRole = user.roles.some((r) =>
      ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(r.toUpperCase())
    );
    if (hasBypassRole) return true;

    return user.permissions.includes('*') || user.permissions.includes(permission);
  },
  hasAnyRole: (allowedRoles) => {
    const user = get().user;
    if (!user) return false;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return user.roles.some((r) => rolesArray.includes(r));
  },
}));
