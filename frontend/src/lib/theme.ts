export type ThemeMode = 'night' | 'day' | 'soft';

const THEME_STORAGE_KEY = 'chattable.theme-mode';
const DEFAULT_THEME: ThemeMode = 'night';

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  if (value === 'day' || value === 'soft') {
    return value;
  }
  return DEFAULT_THEME;
}

export function getThemeModeFromStorage(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function persistThemeMode(theme: ThemeMode): ThemeMode {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  return theme;
}

export const themeConstants = {
  defaultTheme: DEFAULT_THEME,
  storageKey: THEME_STORAGE_KEY,
} as const;
