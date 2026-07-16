'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';

const PRODUCTION_POLL_INTERVAL_MS = 5 * 60 * 1000;
// Dev-only override so a real polling cycle can be observed in the browser
// in seconds rather than minutes. NEXT_PUBLIC_* env vars are inlined at
// build time — this can only be set via a local .env file for a dev build,
// never by a runtime request/query param, and the NODE_ENV guard means it
// has no effect at all even if a production .env accidentally set it.
const DEV_FAST_POLL_MS = process.env.NODE_ENV !== 'production'
  ? Number(process.env.NEXT_PUBLIC_INTEGRATION_HEALTH_FAST_POLL_MS) || null
  : null;
const POLL_INTERVAL_MS = DEV_FAST_POLL_MS ?? PRODUCTION_POLL_INTERVAL_MS;
const VERIFY_PATHS: Record<string, string> = {
  gorgias: '/api/settings/gorgias/support-connection/verify',
  shopify: '/api/shopify/verify',
};

type DisplayStatus = EffectiveConnectionBadge | string;

export type LiveConnectionState = {
  status: DisplayStatus;
  note: string | null;
  noteTone: 'warning' | 'danger' | null;
};

const RETRY_NOTE = 'Credential verification could not be confirmed on the last check. We will retry automatically.';
const ERROR_NOTE = 'Live verification failed. Reconnect this integration.';

/**
 * Polls the live credential-verification endpoint for providers that have
 * one (Shopify/Gorgias) and returns the CURRENT effective {status, note,
 * noteTone} as one unit — never just the badge. Returning the note and
 * tone alongside the status (rather than leaving the caller's originally
 * server-rendered note in place) is what prevents the badge and the
 * supporting text from disagreeing after a poll changes the badge — e.g. a
 * poll that downgrades to "error" must not leave a stale "data hasn't
 * synced since ..." note in place underneath it.
 */
export function useLiveConnectionStatus(provider: string, initial: LiveConnectionState): LiveConnectionState {
  const [state, setState] = useState(initial);
  const verifyPath = VERIFY_PATHS[provider];
  // Guards against two failure modes: (1) an out-of-order response — a
  // slower earlier request resolving after a newer one has already applied
  // its result — and (2) applying state after unmount.
  const requestIdRef = useRef(0);
  // `initial` is read through a ref (updated every render, but never a
  // dependency of verify/the polling effect below) so a caller that passes
  // a fresh object literal each render can never recreate the interval —
  // only `provider` identity controls that.
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const verify = useCallback(async () => {
    if (!verifyPath || document.visibilityState !== 'visible') return;
    const requestId = ++requestIdRef.current;
    try {
      const response = await fetch(verifyPath, { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        inconclusive?: boolean;
      };
      if (requestIdRef.current !== requestId) return; // superseded by a newer poll
      if (body.ok === true) {
        // A successful credential check doesn't mean data is fresh — restore
        // the richer server-computed state (e.g. stale/no records) instead
        // of collapsing it to a flat "healthy" with no explanation.
        setState(initialRef.current);
      } else if (body.inconclusive || response.status >= 500) {
        setState({ status: 'verification_unavailable', note: RETRY_NOTE, noteTone: null });
      } else {
        setState({ status: 'error', note: ERROR_NOTE, noteTone: 'danger' });
      }
    } catch {
      if (requestIdRef.current !== requestId) return;
      setState({ status: 'verification_unavailable', note: RETRY_NOTE, noteTone: null });
    }
  }, [verifyPath]);

  useEffect(() => {
    if (!verifyPath) return;
    const interval = window.setInterval(verify, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void verify();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      // Invalidate any in-flight request so its response can never apply
      // state after this component stops polling.
      requestIdRef.current += 1;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [verify, verifyPath]);

  return state;
}
