'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LAST_CHECK_KEY = 'unauth:integration-live-verification';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Keeps live credential verification intact without putting provider network
 * calls on the route-navigation critical path.
 */
export function DeferredLiveConnectionVerification() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const lastCheck = Number(window.sessionStorage.getItem(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

    let cancelled = false;
    const verify = async () => {
      try {
        const response = await fetch('/api/integrations/live-verification', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok || cancelled) return;
        window.sessionStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        router.refresh();
      } catch {
        // Stored sync and freshness states remain truthful while the next
        // background verification attempt is pending.
      }
    };

    // Give the route time to paint and remain mounted before starting provider
    // network work. Quick click-throughs never launch probes that outlive the
    // page the operator has already left.
    const handle = window.setTimeout(() => void verify(), 10_000);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [router]);

  return null;
}
