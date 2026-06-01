'use client';

import Link from 'next/link';
import { Plug } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { ConnectionPromptStrip } from './ConnectionPromptStrip';

type Requires = 'both' | 'shopify' | 'helpdesk';

interface PageConnectionGateProps {
  requires: Requires;
  connection: ConnectionState;
  pageName: string;
  pageDescription?: string;
  /** When true and connections are missing, show data + strip instead of full gate. */
  hasData?: boolean;
  children: React.ReactNode;
}

function missingFor(requires: Requires, connection: ConnectionState): 'helpdesk' | 'both' | null {
  if (requires === 'both') {
    if (connection.bothConnected) return null;
    // Shopify-only: only helpdesk missing
    if (connection.shopifyOnlyConnected) return 'helpdesk';
    // Neither, or helpdesk-only: treat as both missing (always need both)
    return 'both';
  }
  if (requires === 'helpdesk' && !connection.helpdesk) return 'both';
  return null;
}

function GatePanel({ missing, pageName, pageDescription }: {
  missing: 'helpdesk' | 'both';
  pageName: string;
  pageDescription?: string;
}) {
  const isDangerous = missing === 'helpdesk'; // Shopify connected, helpdesk missing

  const headline = isDangerous
    ? `Shopify is connected — add your helpdesk to see ${pageName}`
    : `Connect your Shopify store and helpdesk to use ${pageName}`;

  const body = pageDescription ?? (
    isDangerous
      ? `Your orders are syncing from Shopify, but claim data comes from your helpdesk. Without it, ${pageName.toLowerCase()} shows order patterns with no claim history — an incomplete picture you can't act on.`
      : `${pageName} requires both your Shopify store and a helpdesk (Gorgias or Zendesk). Without both, the data here would be incomplete and potentially misleading.`
  );

  return (
    <div className="flex items-center justify-center min-h-[55vh] p-8">
      <div
        className="max-w-md w-full rounded-lg border p-8 space-y-5"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)' }}
        >
          <Plug className="h-5 w-5" style={{ color: 'var(--ink-secondary)' }} />
        </div>

        <div className="space-y-2">
          <h2
            className="text-base font-semibold leading-snug"
            style={{ color: 'var(--ink-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          >
            {headline}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--ink-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          >
            {body}
          </p>
        </div>

        <Link
          href="/settings/integrations"
          className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          {isDangerous ? 'Connect your helpdesk' : 'Connect Shopify and helpdesk'}
        </Link>
      </div>
    </div>
  );
}

export function PageConnectionGate({
  requires,
  connection,
  pageName,
  pageDescription,
  hasData = false,
  children,
}: PageConnectionGateProps) {
  const missing = missingFor(requires, connection);

  // Both connected — clean render
  if (!missing) return <>{children}</>;

  // Has existing data (CSV or otherwise): show data + strip, never a full gate
  if (hasData) {
    return (
      <>
        <ConnectionPromptStrip connection={connection} />
        {children}
      </>
    );
  }

  // No data, not connected: full gate
  return <GatePanel missing={missing} pageName={pageName} pageDescription={pageDescription} />;
}
