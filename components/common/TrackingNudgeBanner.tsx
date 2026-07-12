'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';

// Session-storage key — dismissal clears on every new browser session (tab close / new login).
const SESSION_KEY = 'unauth_tracking_nudge_dismissed';

/**
 * Persistent workspace banner shown when no tracking/carrier source is connected.
 *
 * Dismissed per browser session via sessionStorage — reappears on next login.
 * Never permanently dismissible so it stays as a hard-to-miss nudge until
 * the merchant connects AfterShip, UPS, or FedEx.
 *
 * Only rendered when `trackingConnected === false` (server-resolved).
 */
export default function TrackingNudgeBanner({ trackingConnected }: { trackingConnected: boolean }) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      const wasDismissed = sessionStorage.getItem(SESSION_KEY) === '1';
      setDismissed(wasDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (trackingConnected || dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable — dismiss in state only
    }
    setDismissed(true);
  }

  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 border-b px-4 py-2.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--warning) 25%, var(--border))',
        background: 'color-mix(in srgb, var(--warning) 6%, var(--surface-base))',
      }}
      role="alert"
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--warning)' }} />
      <p className="flex-1 text-xs" style={{ color: 'var(--text)' }}>
        <span className="font-semibold">Delivery evidence isn&apos;t connected.</span>{' '}
        INR claims will show as incomplete until you add a tracking source.{' '}
        <Link
          href="/settings/integrations"
          className="font-medium underline underline-offset-2"
          style={{ color: 'var(--warning)' }}
        >
          Connect AfterShip, UPS, or FedEx →
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
