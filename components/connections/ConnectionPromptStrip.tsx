'use client';

import Link from 'next/link';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { useDemoMode } from './ConnectionStateContext';

interface ConnectionPromptStripProps {
  connection: ConnectionState;
  /** Pass true when customer profiles exist but neither source is active. */
  hasExistingProfiles?: boolean;
}

export function ConnectionPromptStrip({ connection, hasExistingProfiles }: ConnectionPromptStripProps) {
  const isDemo = useDemoMode();
  if (connection.bothConnected) return null;
  // Demo merchants already see the layout-level demo-data banner; avoid stacking a second one.
  if (isDemo) return null;

  let message: string;

  if (connection.orderSourceOnlyConnected) {
    message =
      'Your order source is connected but your helpdesk is not — case context is incomplete. Some values may be zero because data is missing, not because there is no history.';
  } else if (connection.helpdeskOnlyConnected) {
    message =
      'Your helpdesk is connected but no order source is active — order value and fulfillment context are incomplete.';
  } else if (hasExistingProfiles) {
    message =
      'Showing existing merchant data. Reconnect an order source and helpdesk to keep it current and add case context.';
  } else {
    message =
      'Connect an order source and helpdesk to see complete case context. Without connected sources, this view may be incomplete.';
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
        href="/integrations"
        className="shrink-0 text-sm font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
        style={{ color: 'var(--accent)' }}
      >
        Complete setup
      </Link>
    </div>
  );
}
