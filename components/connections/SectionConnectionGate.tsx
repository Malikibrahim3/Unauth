'use client';

import Link from 'next/link';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

type Requires = 'both' | 'shopify' | 'helpdesk';

interface SectionConnectionGateProps {
  requires: Requires;
  connection: ConnectionState;
  sectionName: string;
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

export function SectionConnectionGate({
  requires,
  connection,
  sectionName,
  children,
}: SectionConnectionGateProps) {
  const missing = missingFor(requires, connection);
  if (!missing) return <>{children}</>;

  const label =
    missing === 'both'
      ? `${sectionName} requires your Shopify store and helpdesk to be connected.`
      : missing === 'shopify'
        ? `${sectionName} requires your Shopify store to be connected.`
        : `${sectionName} requires your helpdesk (Gorgias or Zendesk) to be connected.`;

  return (
    <p className="text-sm py-2" style={{ color: 'var(--ink-tertiary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      {label}{' '}
      <Link
        href="/settings/integrations"
        className="font-semibold underline underline-offset-2 hover:opacity-80"
        style={{ color: 'var(--ink-secondary)' }}
      >
        Connect now
      </Link>
    </p>
  );
}
