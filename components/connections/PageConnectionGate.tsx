'use client';

import Link from 'next/link';
import { Plug } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { type MerchantSetupState, shouldFullGate } from '@/lib/connections/setupState';
import { ConnectionPromptStrip } from './ConnectionPromptStrip';

type Requires = 'both' | 'shopify' | 'helpdesk';

interface PageConnectionGateProps {
  requires: Requires;
  connection: ConnectionState;
  pageName: string;
  pageDescription?: string;
  /**
   * Canonical setup state. When provided, it is the source of truth for whether
   * a full gate is shown — the page is fully gated only when no useful data
   * exists and a required source is missing. Otherwise the page renders content
   * with a non-blocking completeness strip. Prefer this over hasData.
   */
  setupState?: MerchantSetupState;
  /** Legacy fallback when setupState is not supplied: show data + strip instead of a full gate. */
  hasData?: boolean;
  /**
   * Pass true when customer_profiles exist but neither integration is active.
   * Forwards to ConnectionPromptStrip to surface the "stale Shopify data" message.
   */
  hasExistingProfiles?: boolean;
  children: React.ReactNode;
}

function missingFor(requires: Requires, connection: ConnectionState): 'helpdesk' | 'both' | null {
  if (requires === 'both') {
    if (connection.bothConnected) return null;
    if (connection.shopifyOnlyConnected) return 'helpdesk';
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
  const isDangerous = missing === 'helpdesk';

  const headline = isDangerous
    ? `Shopify is connected — connect Gorgias to activate claim intelligence`
    : `Connect Shopify + Gorgias to use ${pageName}`;

  const body = pageDescription ?? (
    isDangerous
      ? `Connect Gorgias so your agents see claim context — order history, prior claims, and trust indicators — inside every support ticket.`
      : `${pageName} requires Shopify for order data and Gorgias for claim history. Both are required to activate claim intelligence.`
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
          href={isDangerous ? '/settings/integrations/gorgias' : '/settings/integrations'}
          className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          {isDangerous ? 'Connect Gorgias' : 'Set up Shopify + Gorgias'}
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
  setupState,
  hasData = false,
  hasExistingProfiles = false,
  children,
}: PageConnectionGateProps) {
  const missing = missingFor(requires, connection);

  // Both connected - clean render
  if (!missing) return <>{children}</>;

  // When the canonical setup state is supplied it decides gating: a full gate is
  // only ever shown when no useful data exists and a required source is missing.
  // Otherwise (any useful data present) we render content + a non-blocking strip.
  const fullGate = setupState !== undefined ? shouldFullGate(setupState) : !hasData;

  if (!fullGate) {
    return (
      <>
        <ConnectionPromptStrip connection={connection} hasExistingProfiles={hasExistingProfiles} />
        {children}
      </>
    );
  }

  // No useful data, not fully connected: full gate
  return <GatePanel missing={missing} pageName={pageName} pageDescription={pageDescription} />;
}
