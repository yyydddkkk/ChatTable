import { create } from 'zustand';

import { getThemeModeFromStorage, persistThemeMode, type ThemeMode } from '../lib/theme';

interface ThemeStore {
  theme: ThemeMode;
  hydrateTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: getThemeModeFromStorage(),
  hydrateTheme: () => {
    set({ theme: getThemeModeFromStorage() });
  },
  setTheme: (theme) => {
    set({ theme: persistThemeMode(theme) });
  },
  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme: ThemeMode = currentTheme === 'night' ? 'day' : 'night';
    set({ theme: persistThemeMode(nextTheme) });
  },
}));
