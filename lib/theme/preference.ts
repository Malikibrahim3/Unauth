export const THEME_STORAGE_KEY = 'unauth.theme';

export type ThemePreference = 'light' | 'dark';

export function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
  return 'light';
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}
