'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Headphones, CheckCircle2, ArrowRight } from 'lucide-react';
import { FeatureTierBadge } from '@/components/product/FeatureTierBadge';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import type { HelpdeskOption } from '@/components/settings/apiIntegrationsTypes';
import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';

const HELPDESK_OPTIONS: (HelpdeskOption & { recommended?: boolean })[] = [
  {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Add case context to every support ticket. Agents see order history, prior cases, and trust indicators without leaving Gorgias.',
    statusKey: 'gorgias',
    href: '/sources/setup/gorgias',
    logo: '/providers/gorgias.png',
    recommended: true,
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Case context in the Zendesk sidebar. For teams on Zendesk instead of Gorgias.',
    statusKey: 'zendesk',
    href: '/sources/setup/zendesk',
    logo: '/providers/zendesk.svg',
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    description: 'Sync support tickets for case detection. For teams on Freshdesk.',
    statusKey: 'freshdesk',
    href: '/sources/setup/freshdesk',
    logo: '/providers/freshdesk.png',
  },
];

export default function ApiIntegrationsHelpdeskSection() {
  const { data: connStatus } = useAsyncResource('integrations-setup-status', fetchIntegrationConnectionStatus);

  const statusKnown = connStatus !== null;
  const gorgiasConnected = Boolean(connStatus?.gorgias.connected);
  const zendeskConnected = Boolean(connStatus?.zendesk.connected);
  const freshdeskConnected = Boolean(connStatus?.freshdesk.connected);
  const helpdeskConnected = gorgiasConnected || zendeskConnected || freshdeskConnected;
  const shopifyConnected = Boolean(connStatus?.shopify.connected);
  const guideToHelpdesk = statusKnown && shopifyConnected && !helpdeskConnected;

  const cardBorder = guideToHelpdesk
    ? 'color-mix(in srgb, var(--uo-route-warning) 35%, var(--uo-route-border-default))'
    : 'var(--uo-route-border-default)';
  const cardBg = guideToHelpdesk
    ? 'color-mix(in srgb, var(--uo-route-warning) 6%, var(--uo-route-surface-primary))'
    : 'var(--uo-route-surface-primary)';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Headphones className="h-4 w-4" style={{ color: 'var(--uo-route-icon-secondary)' }} />
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>Helpdesk</p>
            <p className="ua-text-caption-role" style={{ color: 'var(--uo-route-text-secondary)' }}>Gorgias recommended · Zendesk and Freshdesk also supported</p>
          </div>
          <FeatureTierBadge entitlement="HELPDESK_WIDGET" />
        </div>
      </div>

      <div
        className="rounded-md border p-5 space-y-4"
        style={{ borderColor: cardBorder, background: cardBg }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: helpdeskConnected
                ? 'var(--uo-route-success)'
                : guideToHelpdesk
                  ? 'var(--uo-route-warning)'
                  : 'var(--uo-route-text-secondary)',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>
              {helpdeskConnected
                ? 'Helpdesk connected'
                : guideToHelpdesk
                  ? 'Connect your helpdesk to finish setup'
                  : 'No helpdesk connected'}
            </p>
            <p className="ua-text-caption-role mt-0.5" style={{ color: guideToHelpdesk ? 'var(--uo-route-warning)' : 'var(--uo-route-text-secondary)' }}>
              {helpdeskConnected
                ? 'Cases and chargeback context are syncing. Tie each case back to its Shopify order.'
                : guideToHelpdesk
                  ? 'Shopify is live, but case and chargeback context comes from your helpdesk. Until you connect one, case metrics read as incomplete - not zero.'
                  : 'Choose one provider below. Either one supplies case history and chargeback context.'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {HELPDESK_OPTIONS.map((item, idx) => {
            const providerState = connStatus ? connStatus[item.statusKey] : null;
            const connected = Boolean(providerState?.connected);
            const degraded =
              connected &&
              providerState &&
              'linkState' in providerState &&
              providerState.linkState === 'degraded';
            const zendeskSidebarOnly =
              item.id === 'zendesk' &&
              providerState &&
              'sidebarReady' in providerState &&
              providerState.sidebarReady &&
              !connected;
            const isPrimary = idx === 0; // Gorgias
            const showArrow = isPrimary && guideToHelpdesk && !connected;
            return (
              <div key={item.id}>
                {/* Separator before secondary helpdesks */}
                {idx === 1 && (
                  <div className="flex items-center gap-2 pb-2 pt-1">
                    <div className="h-px flex-1" style={{ background: 'var(--uo-route-border-default)' }} />
                    <p className="ua-text-caption-role" style={{ color: 'var(--uo-route-text-secondary)' }}>
                      Using Zendesk or Freshdesk instead?
                    </p>
                    <div className="h-px flex-1" style={{ background: 'var(--uo-route-border-default)' }} />
                  </div>
                )}
                <div
                  className="flex gap-3 rounded-md border p-3"
                  style={{
                    borderColor:
                      degraded || zendeskSidebarOnly
                        ? 'color-mix(in srgb, var(--uo-route-warning) 35%, var(--uo-route-border-default))'
                        : connected
                          ? 'var(--uo-route-success)'
                          : 'var(--uo-route-border-default)',
                    background:
                      degraded || zendeskSidebarOnly
                        ? 'color-mix(in srgb, var(--uo-route-warning) 6%, var(--uo-route-surface-primary))'
                        : connected
                          ? 'color-mix(in srgb, var(--uo-route-success) 4%, var(--uo-route-surface-primary))'
                          : 'var(--uo-route-surface-primary)',
                    opacity: !isPrimary && !connected && !zendeskSidebarOnly ? 0.75 : 1,
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
                      <div className="flex items-center gap-2">
                        <p className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>{item.name}</p>
                        {item.recommended && (
                          <span
                            className="ua-text-label inline-flex items-center rounded-full px-1.5 py-0.5"
                            style={{ background: 'color-mix(in srgb, var(--uo-route-action-primary) 12%, transparent)', color: 'var(--uo-route-action-primary)' }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      {connected || zendeskSidebarOnly ? (
                        <Link
                          href={item.href}
                          className="ua-text-label inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1"
                          style={{ borderColor: 'var(--uo-route-border-default)', color: 'var(--uo-route-text-secondary)' }}
                        >
                          Manage
                        </Link>
                      ) : (
                        <Link
                          href={item.href}
                          className="ua-text-working-title inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1"
                          style={{ background: 'var(--uo-route-action-primary)', color: 'var(--uo-route-text-inverse)' }}
                        >
                          Connect
                          {showArrow ? <ArrowRight className="h-3 w-3" /> : null}
                        </Link>
                      )}
                    </div>
                    {statusKnown ? (
                      <p className="ua-text-dense mt-1 flex items-center gap-1.5 font-medium">
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            background:
                              connected || zendeskSidebarOnly
                                ? zendeskSidebarOnly
                                  ? 'var(--uo-route-warning)'
                                  : 'var(--uo-route-success)'
                                : 'transparent',
                            border:
                              connected || zendeskSidebarOnly ? 'none' : '1px solid var(--uo-route-text-secondary)',
                          }}
                        />
                        <span
                          style={{
                            color:
                              zendeskSidebarOnly || degraded
                                ? 'var(--uo-route-warning)'
                                : connected
                                  ? 'var(--uo-route-success)'
                                  : 'var(--uo-route-text-secondary)',
                          }}
                        >
                          {zendeskSidebarOnly
                            ? 'Sidebar only — sync tickets'
                            : degraded
                              ? 'Connected — finish setup'
                              : connected
                                ? 'Connected'
                                : 'Not connected'}
                        </span>
                        {connected && providerState?.detail ? (
                          <span className="truncate" style={{ color: 'var(--uo-route-text-secondary)' }}>· {providerState.detail}</span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="ua-text-caption-role mt-1 leading-relaxed" style={{ color: 'var(--uo-route-text-secondary)' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {helpdeskConnected ? (
          <p className="ua-text-dense flex items-center gap-1.5 font-medium" style={{ color: 'var(--uo-route-success)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required helpdesk source satisfied
          </p>
        ) : null}
      </div>
    </div>
  );
}
