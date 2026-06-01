'use client';

import Link from 'next/link';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

interface ConnectionPromptStripProps {
  connection: ConnectionState;
}

export function ConnectionPromptStrip({ connection }: ConnectionPromptStripProps) {
  if (connection.bothConnected) return null;

  const message = connection.shopifyOnlyConnected
    ? 'Shopify is connected but your helpdesk is not — claim data is missing. Some numbers shown here may be zero because data isn\'t syncing, not because there\'s no history.'
    : connection.helpdeskOnlyConnected
      ? 'Your helpdesk is connected but Shopify is not — order data is missing. Connect both to see the full picture.'
      : 'Connect your Shopify store and helpdesk to see complete data. What\'s shown here is based on CSV imports only and may be incomplete.';

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2.5 border-b text-sm"
      style={{
        background: 'color-mix(in srgb, var(--warning, #b45309) 8%, var(--surface-raised))',
        borderColor: 'color-mix(in srgb, var(--warning, #b45309) 20%, transparent)',
        color: 'var(--ink-secondary)',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: 'var(--warning, #b45309)' }}
          aria-hidden="true"
        />
        <span className="leading-snug" style={{ color: 'var(--ink-primary)' }}>{message}</span>
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
