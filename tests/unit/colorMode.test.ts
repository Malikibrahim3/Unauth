import {
  AUTHENTICATED_THEME_COOKIE,
  DEFAULT_AUTHENTICATED_THEME,
  isAuthenticatedTheme,
  readAuthenticatedTheme,
} from '@/lib/theme/authenticatedTheme';
import fs from 'node:fs';
import path from 'node:path';

describe('authenticated theme', () => {
  it('defaults to light and uses a device-local cookie', () => {
    expect(DEFAULT_AUTHENTICATED_THEME).toBe('light');
    expect(AUTHENTICATED_THEME_COOKIE).toBe('unauth.auth-theme');
    expect(readAuthenticatedTheme(undefined)).toBe('light');
    expect(readAuthenticatedTheme('legacy-dark')).toBe('light');
  });

  it.each(['light', 'dark'])('accepts %s', (theme) => {
    expect(isAuthenticatedTheme(theme)).toBe(true);
    expect(readAuthenticatedTheme(theme)).toBe(theme);
  });

  it.each([null, undefined, '', 'mocha', 'signal', 'sepia'])('rejects legacy or unsupported value %s', (theme) => {
    expect(isAuthenticatedTheme(theme)).toBe(false);
  });

  it('keeps public and entry selectors outside the dark override', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'styles/evidence-operations.css'), 'utf8');
    expect(css).toContain('.uo-product:not([data-auth-theme="dark"])');
    expect(css).toContain('.uo-product[data-auth-theme="dark"]');
    expect(css).toContain('.ua-public-route');
    expect(css).toContain('color-scheme: light;');
  });
});
