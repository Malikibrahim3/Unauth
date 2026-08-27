export const AUTHENTICATED_THEME_COOKIE = 'unauth.auth-theme';

export type AuthenticatedTheme = 'light' | 'dark';

export const DEFAULT_AUTHENTICATED_THEME: AuthenticatedTheme = 'light';

export function isAuthenticatedTheme(value: string | null | undefined): value is AuthenticatedTheme {
  return value === 'light' || value === 'dark';
}

export function readAuthenticatedTheme(value: string | null | undefined): AuthenticatedTheme {
  return isAuthenticatedTheme(value) ? value : DEFAULT_AUTHENTICATED_THEME;
}
