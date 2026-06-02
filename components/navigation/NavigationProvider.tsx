'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteProgressBar from './RouteProgressBar';

type NavigationContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
  beginNavigation: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const PENDING_TIMEOUT_MS = 15_000;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const beginNavigation = useCallback((href: string) => {
    const targetPath = href.split('?')[0] ?? href;
    const currentPath = pathname.split('?')[0] ?? pathname;
    if (targetPath === currentPath) return;
    setPendingHref(href);
  }, [pathname]);

  const value = useMemo(
    () => ({ pendingHref, setPendingHref, beginNavigation }),
    [pendingHref, beginNavigation],
  );

  return (
    <NavigationContext.Provider value={value}>
      <RouteProgressBar active={pendingHref !== null} />
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
