import { create } from 'zustand';

interface SettingsState {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timezone: string;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  currencySymbol: '$',
  dateFormat: 'MMM dd, yyyy',
  timezone: 'UTC',
  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
}));
