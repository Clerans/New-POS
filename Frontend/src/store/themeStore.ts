import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('cafechai-theme') as Theme) || 'system',
  setTheme: (theme) => {
    localStorage.setItem('cafechai-theme', theme);
    set({ theme });
  },
}));
