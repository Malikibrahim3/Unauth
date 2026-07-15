'use client';

import { Plug } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import { type MerchantSetupState, shouldFullGate } from '@/lib/connections/setupState';
import { ConnectionPromptStrip } from './ConnectionPromptStrip';
import { ButtonLink } from '@/components/ui';

type Requires = 'both' | 'helpdesk';

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
   * Pass true when customer profiles exist but neither source is active.
   * Forwards to ConnectionPromptStrip to disclose that the data may be stale.
   */
  hasExistingProfiles?: boolean;
  children: React.ReactNode;
}

function missingFor(requires: Requires, connection: ConnectionState): 'helpdesk' | 'both' | null {
  if (requires === 'both') {
    if (connection.bothConnected) return null;
    if (connection.orderSourceOnlyConnected) return 'helpdesk';
    return 'both';
  }
  if (requires === 'helpdesk' && !connection.helpdesk) {
    return connection.orderSourceConnected ? 'helpdesk' : 'both';
  }
  return null;
}

function GatePanel({ missing, pageName, pageDescription }: {
  missing: 'helpdesk' | 'both';
  pageName: string;
  pageDescription?: string;
}) {
  const helpdeskMissing = missing === 'helpdesk';

  const headline = helpdeskMissing
    ? `Connect a helpdesk to activate ${pageName}`
    : `Connect an order source and helpdesk to use ${pageName}`;

  const body = pageDescription ?? (
    helpdeskMissing
      ? `Connect a supported helpdesk so support cases, evidence, and merchant-rule recommendations flow into Unauth.`
      : `${pageName} combines commerce records with support context. Connect both source categories to activate evidence-backed payout control.`
  );

  return (
    <div className="flex items-center justify-center min-h-[55vh] p-8">
      <div
        className="max-w-md w-full rounded-md border p-8 space-y-5"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-md"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Plug className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        </div>

        <div className="space-y-2">
          <h2
            className="text-base font-semibold leading-snug"
            style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          >
            {headline}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
          >
            {body}
          </p>
        </div>

        <ButtonLink href="/integrations" size="md">
          {helpdeskMissing ? 'Connect a helpdesk' : 'Set up sources'}
        </ButtonLink>
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
