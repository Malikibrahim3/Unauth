'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import RouteProgressBar from './RouteProgressBar';
import RoutePendingNotice from './RoutePendingNotice';

type NavigationContextValue = {
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
  beginNavigation: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

function NavigationSync({
  onRouteChange,
}: {
  onRouteChange: (pathname: string, searchParams: ReturnType<typeof useSearchParams>) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onRouteChange(pathname, searchParams);
  }, [pathname, searchParams, onRouteChange]);

  return null;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [currentSearchParams, setCurrentSearchParams] = useState('');

  const handleRouteChange = useCallback(
    (_: string, searchParams: ReturnType<typeof useSearchParams>) => {
      setCurrentSearchParams(searchParams.toString());
      setPendingHref(null);
    },
    [],
  );

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  /*
   * Instrument Grade: pending state is cleared by an actual route change
   * (the effects above), never by a timeout. A navigation that stalls keeps its
   * progress line and, at 8s, gains RoutePendingNotice — the previous 3.5s
   * timer made the product look finished while it was still waiting.
   */

  const beginNavigation = useCallback(
    (href: string) => {
      const [targetPath, targetQuery = ''] = href.split('?');
      if (targetPath === pathname && targetQuery === currentSearchParams) return;
      if (href.startsWith('#') || (!href.startsWith('/') && !href.startsWith('http'))) return;
      setPendingHref(href);
    },
    [pathname, currentSearchParams],
  );

  const value = useMemo(
    () => ({ pendingHref, setPendingHref, beginNavigation }),
    [pendingHref, beginNavigation],
  );

  return (
    <NavigationContext.Provider value={value}>
      <Suspense fallback={null}>
        <NavigationSync onRouteChange={handleRouteChange} />
      </Suspense>
      <RouteProgressBar active={pendingHref !== null} />
      <RoutePendingNotice pendingHref={pendingHref} />
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

export function useOptionalNavigation() {
  return useContext(NavigationContext);
}
