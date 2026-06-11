'use client';

import Link from 'next/link';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

interface ConnectionPromptStripProps {
  connection: ConnectionState;
  /** Pass true when customer_profiles exist but neither integration is active.
   *  Surfaces an honest "stale Shopify data" message instead of the CSV-only copy. */
  hasExistingProfiles?: boolean;
}

export function ConnectionPromptStrip({ connection, hasExistingProfiles }: ConnectionPromptStripProps) {
  if (connection.bothConnected) return null;

  let message: string;

  if (connection.shopifyOnlyConnected) {
    message =
      'Shopify is connected but your helpdesk is not — claim data is missing. Some numbers shown here may be zero because data isn\'t syncing, not because the customer has no history.';
  } else if (connection.helpdeskOnlyConnected) {
    message =
      'Your helpdesk is connected but Shopify is not — order data is missing. Connect both to see the full picture.';
  } else if (hasExistingProfiles) {
    // Neither connected, but merchant has profiles (likely from a previous Shopify sync)
    message =
      'Showing existing Shopify data. Reconnect Shopify and your helpdesk to keep this analysis current and add claim context.';
  } else {
    message =
      'Connect Shopify and your helpdesk to see complete data. What\'s shown here is based on CSV imports only and may be incomplete.';
  }

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2.5 border-b text-sm"
      style={{
        background: 'color-mix(in srgb, var(--warning, #b45309) 8%, var(--surface))',
        borderColor: 'color-mix(in srgb, var(--warning, #b45309) 20%, transparent)',
        color: 'var(--text-secondary)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: 'var(--warning, #b45309)' }}
          aria-hidden="true"
        />
        <span className="leading-snug" style={{ color: 'var(--text-primary)' }}>{message}</span>
      </div>
      <Link
        href="/settings/integrations"
        className="shrink-0 text-sm font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
        style={{ color: 'var(--accent)' }}
      >
        Complete setup →
      </Link>
    </div>
  );
}
