'use client';

import { Plug } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
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
  const isDangerous = missing === 'helpdesk';
  const helpdeskName = 'support platform';
  const commerceName = 'commerce platform';

  const headline = isDangerous
    ? `Your ${commerceName} is connected — connect your ${helpdeskName} to activate ${pageName}`
    : `Connect your ${commerceName} and ${helpdeskName} to use ${pageName}`;

  const body = pageDescription ?? (
    isDangerous
    ? `Connect your ${helpdeskName} so agents see order history, prior cases, and evidence context inside each support workflow.`
      : `${pageName} needs a commerce source for order data and a support source for case context. Both activate evidence-backed payout decisions.`
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 pb-6 pt-4 sm:px-5">
      <div
        className="w-full space-y-3 rounded-[var(--ua-radius-surface)] border p-4"
        style={{
          background: 'var(--ua-surface-primary)',
          borderColor: 'var(--ua-border-default)',
        }}
      >
        <div
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-control)]"
          style={{ background: 'var(--ua-surface-primary)', border: '1px solid var(--ua-border-default)' }}
        >
          <Plug className="h-4 w-4" style={{ color: 'var(--ua-text-secondary)' }} />
        </div>

        <div className="space-y-2">
          <h2
            className="ua-text-section-title leading-snug"
            style={{ color: 'var(--ua-text-primary)', fontFamily: 'var(--ua-font-sans)' }}
          >
            {headline}
          </h2>
          <p
            className="max-w-2xl text-[length:var(--ua-text-caption-size)] leading-5"
            style={{ color: 'var(--ua-text-secondary)', fontFamily: 'var(--ua-font-sans)' }}
          >
            {body}
          </p>
        </div>

        <ButtonLink href={isDangerous ? '/sources/connected' : '/sources/browse'} size="sm" className="shrink-0">
          {isDangerous ? 'Connect support source' : 'Set up source connections'}
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
