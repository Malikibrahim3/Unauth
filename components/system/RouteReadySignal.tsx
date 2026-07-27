'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { pendingResourceCount, subscribeToPendingResources } from '@/lib/react/useFetchJson';

export const ROUTE_READY_ATTRIBUTE = 'data-route-ready';
export const ROUTE_STATE_ATTRIBUTE = 'data-route-state';

/**
 * How long a route may spend resolving its shared client resources before it
 * reports `degraded` instead of hanging. RUN-10 requires a bounded wait: an
 * unbounded one is how "Loading case context…" became a permanent state.
 */
const READY_TIMEOUT_MS = 8_000;
/** Cascading fetches settle in waves; require a brief quiet period. */
const QUIET_PERIOD_MS = 120;

/**
 * RUN-10: a named, observable point at which a route has finished resolving.
 *
 * Without one, "the page looks loaded" is the only available signal, which is
 * exactly how a screenshot of a half-resolved workspace gets taken. The
 * attribute is set only after hydration has run and the browser has painted
 * twice, so a route that is still swapping skeletons for content has not yet
 * claimed readiness.
 *
 * The attribute is cleared on every navigation, so a stale `true` from the
 * previous route can never be mistaken for the current one.
 */
export function RouteReadySignal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const root = document.documentElement;
    const captureMode = searchParams.get('capture') === '1';
    if (captureMode) root.setAttribute('data-capture-mode', 'true');
    else root.removeAttribute('data-capture-mode');
    root.removeAttribute(ROUTE_READY_ATTRIBUTE);
    root.removeAttribute(ROUTE_STATE_ATTRIBUTE);

    let cancelled = false;
    let secondFrame = 0;
    let quietTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = (state: 'ready' | 'degraded') => {
      if (cancelled) return;
      root.setAttribute(ROUTE_STATE_ATTRIBUTE, state);
      root.setAttribute(ROUTE_READY_ATTRIBUTE, 'true');
    };

    const deadline = setTimeout(() => settle('degraded'), READY_TIMEOUT_MS);

    const evaluate = () => {
      if (cancelled) return;
      if (quietTimer) clearTimeout(quietTimer);
      if (pendingResourceCount() > 0) return;
      quietTimer = setTimeout(() => {
        if (pendingResourceCount() > 0) return;
        clearTimeout(deadline);
        settle('ready');
      }, QUIET_PERIOD_MS);
    };

    const unsubscribe = subscribeToPendingResources(evaluate);

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(evaluate);
    });

    return () => {
      cancelled = true;
      if (captureMode) root.removeAttribute('data-capture-mode');
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      if (quietTimer) clearTimeout(quietTimer);
      clearTimeout(deadline);
      unsubscribe();
    };
  }, [pathname, searchParams]);

  return null;
}
