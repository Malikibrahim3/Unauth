'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const SHIPBOB_MESSAGES: Record<string, string> = {
  misconfigured:
    'ShipBob is not configured for this environment. Add the matching OAuth app credentials and registered callback URL, then try again.',
  unauthorized:
    'You must be signed in to connect ShipBob.',
  forbidden:
    'You do not have permission to manage this ShipBob connection.',
  invalid_state:
    'This ShipBob authorization session expired. Start the connection again.',
  invalid_or_replayed_state:
    'This ShipBob authorization was already used or expired. Start the connection again.',
  environment_mismatch:
    'The ShipBob environment changed during authorization. Start the connection again.',
  callback_failed:
    'ShipBob authorization could not be completed. Check the app configuration and try again.',
};

export function ShipBobIntegrationBanner() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const banner = useMemo(() => {
    const params = new URLSearchParams(search);
    if (params.get('shipbob_connected') === '1') {
      return { message: 'ShipBob connected successfully.', variant: 'success' as const };
    }
    if (params.get('shipbob_warning') === 'webhook_subscription_failed') {
      return { message: 'ShipBob connected, but webhook registration needs attention. Retry the connection to repair it.', variant: 'warning' as const };
    }
    const ignored = new Set(['shipbob_connected', 'shipbob_warning', 'shipbob_reason']);
    const errorKey = [...params.keys()].find((key) => key.startsWith('shipbob_') && !ignored.has(key));
    const error = errorKey?.slice('shipbob_'.length);
    if (!error || params.get(errorKey!) !== '1') return null;
    return {
      message: SHIPBOB_MESSAGES[error] ?? 'Could not connect ShipBob. Start the connection again.',
      variant: 'error' as const,
    };
  }, [search]);

  useEffect(() => {
    if (!banner || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('shipbob_')) url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', url.pathname + (url.search || ''));
  }, [banner]);

  if (!banner) return null;

  const styles = {
    success: { background: 'var(--uo-route-success-bg)', color: 'var(--uo-route-success)', border: 'var(--uo-route-success-border)' },
    warning: { background: 'var(--uo-route-warning-bg)', color: 'var(--uo-route-warning)', border: 'var(--uo-route-warning-border)' },
    error: { background: 'var(--uo-route-critical-bg)', color: 'var(--uo-route-critical)', border: 'var(--uo-route-critical-border)' },
  } as const;

  return (
    <output
      className="mb-4 block rounded-md border px-4 py-3 text-sm"
      style={styles[banner.variant]}
      data-testid="shipbob-integration-banner"
    >
      {banner.message}
    </output>
  );
}
