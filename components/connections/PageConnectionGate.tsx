'use client';

import Link from 'next/link';
import { Store, MessageSquare, Plug } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

type Requires = 'both' | 'shopify' | 'helpdesk';

interface PageConnectionGateProps {
  requires: Requires;
  connection: ConnectionState;
  pageName: string;
  pageDescription?: string;
  children: React.ReactNode;
}

function missingFor(requires: Requires, connection: ConnectionState): 'shopify' | 'helpdesk' | 'both' | null {
  if (requires === 'both') {
    if (connection.bothConnected) return null;
    if (connection.shopifyOnlyConnected) return 'helpdesk';
    if (connection.helpdeskOnlyConnected) return 'shopify';
    return 'both';
  }
  if (requires === 'shopify' && !connection.shopify) return 'shopify';
  if (requires === 'helpdesk' && !connection.helpdesk) return 'helpdesk';
  return null;
}

function GatePanel({ missing, pageName, pageDescription }: {
  missing: 'shopify' | 'helpdesk' | 'both';
  pageName: string;
  pageDescription?: string;
}) {
  const isPartial = missing === 'helpdesk'; // Shopify connected, helpdesk missing — the dangerous state

  const headline =
    missing === 'both'
      ? `Connect your store and helpdesk to use ${pageName}`
      : missing === 'shopify'
        ? `Connect your Shopify store to use ${pageName}`
        : `Shopify connected — add your helpdesk to see ${pageName}`;

  const body =
    pageDescription ??
    (missing === 'both'
      ? `${pageName} requires both your Shopify store and a helpdesk (Gorgias or Zendesk) to be connected. Without both, the data shown here would be incomplete and potentially misleading.`
      : missing === 'shopify'
        ? `${pageName} requires your Shopify store to be connected so order and identity data can sync.`
        : `Your Shopify orders are syncing, but claim data comes from your helpdesk. Without it, ${pageName.toLowerCase()} would show order patterns with no claim history — an incomplete picture you can't act on.`);

  const ctaLabel =
    missing === 'both'
      ? 'Connect store and helpdesk'
      : missing === 'shopify'
        ? 'Connect Shopify'
        : 'Connect your helpdesk';

  const Icon = missing === 'shopify' ? Store : missing === 'helpdesk' ? MessageSquare : Plug;

  return (
    <div className="flex items-center justify-center min-h-[55vh] p-8">
      <div
        className="max-w-md w-full rounded-lg border p-8 space-y-5"
        style={{
          background: 'var(--surface-raised)',
          borderColor: isPartial ? 'var(--warning-bd, var(--border-default))' : 'var(--border-default)',
        }}
      >
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: 'var(--surface-overlay)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Icon className="h-5 w-5" style={{ color: 'var(--ink-secondary)' }} />
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
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#2563EB' }}
        >
          {ctaLabel}
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
  children,
}: PageConnectionGateProps) {
  const missing = missingFor(requires, connection);
  if (missing) {
    return <GatePanel missing={missing} pageName={pageName} pageDescription={pageDescription} />;
  }
  return <>{children}</>;
}
