import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  hasPermission: (permission: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  hasPermission: (permission) => {
    const user = get().user;
    if (!user) return false;
    if (user.roles.includes('Admin') || user.roles.includes('admin')) return true;
    return user.permissions.includes(permission);
  },
}));
