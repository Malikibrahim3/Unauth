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
    description: 'Add claim context to every support ticket. Agents see order history, prior claims, and trust indicators without leaving Gorgias.',
    statusKey: 'gorgias',
    href: '/settings/integrations/gorgias',
    logo: '/integrations/gorgias.png',
    recommended: true,
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Claim context in the Zendesk sidebar. For teams on Zendesk instead of Gorgias.',
    statusKey: 'zendesk',
    href: '/settings/integrations/zendesk',
    logo: '/integrations/zendesk.svg',
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    description: 'Sync support tickets for claim detection. For teams on Freshdesk.',
    statusKey: 'freshdesk',
    href: '/settings/integrations/freshdesk',
    logo: '/integrations/freshdesk.svg',
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
    ? 'color-mix(in srgb, var(--ua-warning) 35%, var(--ua-border-default))'
    : 'var(--ua-border-default)';
  const cardBg = guideToHelpdesk
    ? 'color-mix(in srgb, var(--ua-warning) 6%, var(--ua-surface-primary))'
    : 'var(--ua-surface-primary)';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Headphones className="h-4 w-4" style={{ color: 'var(--ua-icon-secondary)' }} />
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Helpdesk</p>
            <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>Gorgias recommended · Zendesk and Freshdesk also supported</p>
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
                ? 'var(--ua-success)'
                : guideToHelpdesk
                  ? 'var(--ua-warning)'
                  : 'var(--ua-text-secondary)',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
              {helpdeskConnected
                ? 'Helpdesk connected'
                : guideToHelpdesk
                  ? 'Connect your helpdesk to finish setup'
                  : 'No helpdesk connected'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: guideToHelpdesk ? 'var(--ua-warning)' : 'var(--ua-text-secondary)' }}>
              {helpdeskConnected
                ? 'Claims and dispute context are syncing. Tie each claim back to its Shopify order.'
                : guideToHelpdesk
                  ? 'Shopify is live, but claim and dispute context comes from your helpdesk. Until you connect one, claim metrics read as incomplete - not zero.'
                  : 'Choose one provider below. Either one supplies claim history and dispute context.'}
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
                    <div className="h-px flex-1" style={{ background: 'var(--ua-border-default)' }} />
                    <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
                      Using Zendesk or Freshdesk instead?
                    </p>
                    <div className="h-px flex-1" style={{ background: 'var(--ua-border-default)' }} />
                  </div>
                )}
                <div
                  className="flex gap-3 rounded-md border p-3"
                  style={{
                    borderColor:
                      degraded || zendeskSidebarOnly
                        ? 'color-mix(in srgb, var(--ua-warning) 35%, var(--ua-border-default))'
                        : connected
                          ? 'var(--ua-success)'
                          : 'var(--ua-border-default)',
                    background:
                      degraded || zendeskSidebarOnly
                        ? 'color-mix(in srgb, var(--ua-warning) 6%, var(--ua-surface-primary))'
                        : connected
                          ? 'color-mix(in srgb, var(--ua-success) 4%, var(--ua-surface-primary))'
                          : 'var(--ua-surface-primary)',
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
                        <p className="text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>{item.name}</p>
                        {item.recommended && (
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold"
                            style={{ background: 'color-mix(in srgb, var(--ua-action-primary) 12%, transparent)', color: 'var(--ua-action-primary)' }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      {connected || zendeskSidebarOnly ? (
                        <Link
                          href={item.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
                          style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-secondary)' }}
                        >
                          Manage
                        </Link>
                      ) : (
                        <Link
                          href={item.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
                        >
                          Connect
                          {showArrow ? <ArrowRight className="h-3 w-3" /> : null}
                        </Link>
                      )}
                    </div>
                    {statusKnown ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            background:
                              connected || zendeskSidebarOnly
                                ? zendeskSidebarOnly
                                  ? 'var(--ua-warning)'
                                  : 'var(--ua-success)'
                                : 'transparent',
                            border:
                              connected || zendeskSidebarOnly ? 'none' : '1px solid var(--ua-text-secondary)',
                          }}
                        />
                        <span
                          style={{
                            color:
                              zendeskSidebarOnly || degraded
                                ? 'var(--ua-warning)'
                                : connected
                                  ? 'var(--ua-success)'
                                  : 'var(--ua-text-secondary)',
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
                          <span className="truncate" style={{ color: 'var(--ua-text-secondary)' }}>· {providerState.detail}</span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ua-text-secondary)' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {helpdeskConnected ? (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--ua-success)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required helpdesk source satisfied
          </p>
        ) : null}
      </div>
    </div>
  );
}
