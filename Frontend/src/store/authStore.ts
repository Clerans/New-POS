import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
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
  clearAuth: () => {
    localStorage.removeItem('cafechai-accessToken');
    localStorage.removeItem('cafechai-refreshToken');
    set({ accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
