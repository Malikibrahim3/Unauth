import { THEME_STORAGE_KEY } from '@/lib/theme/preference';

export const COLOR_MODE_STORAGE_KEY = 'unauth.color-mode';
const LEGACY_COLOR_MODE_STORAGE_KEY = 'unauth-mode';

export type ColorMode = 'mocha' | 'signal' | 'dark';

export const DEFAULT_COLOR_MODE: ColorMode = 'mocha';

export function isColorMode(value: string | null | undefined): value is ColorMode {
  return value === 'mocha' || value === 'signal' || value === 'dark';
}

export function readStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE;

  try {
    const stored =
      localStorage.getItem(COLOR_MODE_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_COLOR_MODE_STORAGE_KEY);
    if (isColorMode(stored)) return stored;
    if (stored == null && localStorage.getItem(THEME_STORAGE_KEY) === 'dark') return 'dark';
    return DEFAULT_COLOR_MODE;
  } catch {
    // Restricted browser contexts may not expose storage. The visual default
    // remains deterministic in that case.
    return DEFAULT_COLOR_MODE;
  }
}
