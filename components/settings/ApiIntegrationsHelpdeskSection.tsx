'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Headphones, CheckCircle2, ArrowRight } from 'lucide-react';
import { FeatureTierBadge } from '@/components/product/FeatureTierBadge';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import type { ConnectionStatus, HelpdeskOption } from '@/components/settings/apiIntegrationsTypes';

const HELPDESK_OPTIONS: HelpdeskOption[] = [
  {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Surface identity confidence and claims history inside your helpdesk sidebar',
    statusKey: 'gorgias',
    href: '/settings/integrations/gorgias',
    logo: '/integrations/gorgias.png',
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Show identity matches and claims history while agents handle tickets',
    statusKey: 'zendesk',
    href: '/settings/integrations/zendesk',
    logo: '/integrations/zendesk.svg',
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    description: 'Sync support tickets for claim detection and dispute context',
    statusKey: 'freshdesk',
    href: '/settings/integrations/freshdesk',
    logo: '/integrations/freshdesk.svg',
  },
];

async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const [gRes, sRes, zRes, fRes] = await Promise.all([
    fetch('/api/settings/gorgias/support-connection', { cache: 'no-store' }),
    fetch('/api/shopify/status', { cache: 'no-store' }),
    fetch('/api/settings/zendesk/connection', { cache: 'no-store' }),
    fetch('/api/settings/freshdesk/support-connection', { cache: 'no-store' }),
  ]);
  const gBody = gRes.ok ? await gRes.json() : null;
  const sBody = sRes.ok ? await sRes.json() : null;
  const zBody = zRes.ok ? await zRes.json() : null;
  const fBody = fRes.ok ? await fRes.json() : null;
  const gConn = gBody?.connection ?? null;
  const fConn = fBody?.connection ?? null;
  return {
    gorgias: {
      connected: Boolean(gConn && gConn.status === 'active'),
      detail: gConn?.provider_account_name ?? gConn?.provider_account_id ?? null,
    },
    shopify: {
      connected: Boolean(sBody?.connected),
      detail: sBody?.shopDomain ?? null,
    },
    zendesk: {
      connected: Boolean(zBody?.connected),
      detail: null,
    },
    freshdesk: {
      connected: Boolean(fConn && fConn.status === 'active'),
      detail: fConn?.provider_account_name ?? fConn?.provider_account_id ?? null,
    },
  };
}

export default function ApiIntegrationsHelpdeskSection() {
  const { data: connStatus } = useAsyncResource('api-integration-connections', fetchConnectionStatus);

  const statusKnown = connStatus !== null;
  const gorgiasConnected = Boolean(connStatus?.gorgias.connected);
  const zendeskConnected = Boolean(connStatus?.zendesk.connected);
  const freshdeskConnected = Boolean(connStatus?.freshdesk.connected);
  const helpdeskConnected = gorgiasConnected || zendeskConnected || freshdeskConnected;
  const shopifyConnected = Boolean(connStatus?.shopify.connected);
  const guideToHelpdesk = statusKnown && shopifyConnected && !helpdeskConnected;

  const cardBorder = guideToHelpdesk
    ? 'color-mix(in srgb, var(--warning) 35%, var(--surface-border))'
    : 'var(--surface-border)';
  const cardBg = guideToHelpdesk
    ? 'color-mix(in srgb, var(--warning) 6%, var(--surface-raised))'
    : 'var(--surface-raised)';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Headphones className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Helpdesk</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Claims &amp; dispute context</p>
          </div>
          <FeatureTierBadge entitlement="HELPDESK_WIDGET" />
        </div>
      </div>

      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: cardBorder, background: cardBg }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: helpdeskConnected
                ? 'var(--sev-clear, #2f6b43)'
                : guideToHelpdesk
                  ? 'var(--warning)'
                  : 'var(--text-muted)',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {helpdeskConnected
                ? 'Helpdesk connected'
                : guideToHelpdesk
                  ? 'Connect your helpdesk to finish setup'
                  : 'No helpdesk connected'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: guideToHelpdesk ? 'var(--warning)' : 'var(--text-muted)' }}>
              {helpdeskConnected
                ? 'Claims and dispute context are syncing. Tie each claim back to its Shopify order.'
                : guideToHelpdesk
                  ? 'Shopify is live, but claim and dispute context comes from your helpdesk. Until you connect one, claim metrics read as incomplete - not zero.'
                  : 'Choose one provider below. Either one supplies claim history and dispute context.'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {HELPDESK_OPTIONS.map((item) => {
            const providerState = connStatus ? connStatus[item.statusKey] : null;
            const connected = Boolean(providerState?.connected);
            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-lg border p-3"
                style={{
                  borderColor: connected ? 'var(--sev-clear, #2f6b43)' : 'var(--surface-border)',
                  background: connected ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--bg-surface))' : 'var(--bg-surface)',
                }}
              >
                <Image
                  src={item.logo}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-md"
                  style={{ objectFit: 'contain' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                    {connected ? (
                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                      >
                        Manage
                      </Link>
                    ) : (
                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                        style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                      >
                        Connect
                        {guideToHelpdesk ? <ArrowRight className="h-3 w-3" /> : null}
                      </Link>
                    )}
                  </div>
                  {statusKnown ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                      <span
                        aria-hidden
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: connected ? 'var(--sev-clear, #2f6b43)' : 'transparent',
                          border: connected ? 'none' : '1px solid var(--text-muted)',
                        }}
                      />
                      <span style={{ color: connected ? 'var(--sev-clear, #2f6b43)' : 'var(--text-muted)' }}>
                        {connected ? 'Connected' : 'Not connected'}
                      </span>
                      {connected && providerState?.detail ? (
                        <span className="truncate" style={{ color: 'var(--text-muted)' }}>· {providerState.detail}</span>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {helpdeskConnected ? (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required helpdesk source satisfied
          </p>
        ) : null}
      </div>
    </div>
  );
}
