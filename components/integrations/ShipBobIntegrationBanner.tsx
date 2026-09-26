'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';

const SHIPBOB_MESSAGES: Record<string, string> = {
  misconfigured: 'ShipBob is not configured for this environment. Add the matching OAuth app credentials and registered callback URL, then try again.',
  unauthorized: 'You must be signed in to connect ShipBob.',
  forbidden: 'You do not have permission to manage this ShipBob connection.',
  invalid_state: 'This ShipBob authorisation session expired. Start the connection again.',
  invalid_or_replayed_state: 'This ShipBob authorisation was already used or expired. Start the connection again.',
  environment_mismatch: 'The ShipBob environment changed during authorisation. Start the connection again.',
  callback_failed: 'ShipBob authorisation could not be completed. Check the app configuration and try again.',
};

export function ShipBobIntegrationBanner() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const banner = useMemo(() => {
    const params = new URLSearchParams(search);
    if (params.get('shipbob_connected') === '1') return { message: 'ShipBob connected successfully.', variant: 'success' as const };
    if (params.get('shipbob_warning') === 'webhook_subscription_failed') {
      return { message: 'ShipBob connected, but webhook registration needs attention. Retry the connection to repair it.', variant: 'warning' as const };
    }
    const ignored = new Set(['shipbob_connected', 'shipbob_warning', 'shipbob_reason']);
    const errorKey = [...params.keys()].find((key) => key.startsWith('shipbob_') && !ignored.has(key));
    const error = errorKey?.slice('shipbob_'.length);
    if (!error || params.get(errorKey!) !== '1') return null;
    return { message: SHIPBOB_MESSAGES[error] ?? 'Could not connect ShipBob. Start the connection again.', variant: 'error' as const };
  }, [search]);

  useEffect(() => {
    if (!banner || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('shipbob_')) url.searchParams.delete(key);
    }
    replaceHistoryUrlIfChanged(url.pathname + (url.search || ''));
  }, [banner]);

  if (!banner) return null;
  const palette = {
    success: { background: '#eef6f1', color: '#1a6b43', border: 'rgba(26,107,67,.20)' },
    warning: { background: '#fff3e9', color: '#7a5310', border: 'rgba(201,138,26,.24)' },
    error: { background: '#fdf0e6', color: '#b0431a', border: 'rgba(176,67,26,.24)' },
  } as const;
  const tone = palette[banner.variant];

  return (
    <output
      data-testid="shipbob-integration-banner"
      style={{
        position: 'fixed', zIndex: 50, top: 14, left: '50%', transform: 'translateX(-50%)', maxWidth: 620,
        padding: '9px 12px', borderRadius: 9, background: tone.background,
        boxShadow: `inset 0 0 0 1px ${tone.border},0 6px 22px rgba(28,27,25,.12)`,
        color: tone.color, font: "400 11.5px/1.45 'Inter',sans-serif",
      }}
    >
      {banner.message}
    </output>
  );
}
