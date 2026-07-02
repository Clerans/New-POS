import { create } from 'zustand';
import { useUserStore, type UserProfile } from './userStore.js';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('cafechai-accessToken'),
  refreshToken: localStorage.getItem('cafechai-refreshToken'),
  isAuthenticated: !!localStorage.getItem('cafechai-accessToken'),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('cafechai-accessToken', accessToken);
    localStorage.setItem('cafechai-refreshToken', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('cafechai-accessToken', accessToken);
    localStorage.setItem('cafechai-refreshToken', refreshToken);
    useUserStore.getState().setUser(user);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('cafechai-accessToken');
    localStorage.removeItem('cafechai-refreshToken');
    useUserStore.getState().setUser(null);
    set({ accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
