'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  AUTHENTICATED_THEME_COOKIE,
  DEFAULT_AUTHENTICATED_THEME,
  type AuthenticatedTheme,
} from '@/lib/theme/authenticatedTheme';

type AuthenticatedThemeContextValue = {
  theme: AuthenticatedTheme;
  setTheme: (theme: AuthenticatedTheme) => void;
};

const AuthenticatedThemeContext = createContext<AuthenticatedThemeContextValue | null>(null);

function persistTheme(theme: AuthenticatedTheme) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTHENTICATED_THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function AuthenticatedThemeProvider({
  initialTheme = DEFAULT_AUTHENTICATED_THEME,
  children,
}: {
  initialTheme?: AuthenticatedTheme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<AuthenticatedTheme>(initialTheme);
  const value = useMemo<AuthenticatedThemeContextValue>(
    () => ({
      theme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        persistTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <AuthenticatedThemeContext.Provider value={value}>{children}</AuthenticatedThemeContext.Provider>;
}

export function useAuthenticatedTheme(): AuthenticatedThemeContextValue {
  const context = useContext(AuthenticatedThemeContext);
  if (!context) {
    throw new Error('useAuthenticatedTheme must be used inside AuthenticatedThemeProvider');
  }
  return context;
}
