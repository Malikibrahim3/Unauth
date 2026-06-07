'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';
import type { IntegrationsSetupStatus } from '@/components/settings/apiIntegrationsTypes';

type SetupPhase = 'neither' | 'order_source_only' | 'gorgias_only' | 'both';

type CommercePlatform = {
  id: string;
  name: string;
  description: string;
  href: string;
  logo: string;
  available: boolean;
};

type SecondaryIntegration = {
  id: string;
  name: string;
  href: string;
  logo: string;
  available: boolean;
  connected: boolean;
  detail: string | null;
};

const COMMERCE_PLATFORMS: CommercePlatform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync orders, customers, refunds and fulfilment events in real time',
    href: '/settings/integrations/shopify',
    logo: '/integrations/shopify.svg',
    available: true,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Pull order and customer data from your WordPress store',
    href: '/settings/integrations/woocommerce',
    logo: '/integrations/woocommerce.svg',
    available: true,
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Sync orders and customers from your BigCommerce storefront',
    href: '/settings/integrations/bigcommerce',
    logo: '/integrations/bigcommerce.svg',
    available: true,
  },
  {
    id: 'magento',
    name: 'Magento',
    description: 'Connect Adobe Commerce to monitor orders and customer identity',
    href: '#',
    logo: '/integrations/magento.svg',
    available: false,
  },
];

function resolveSetupPhase(orderSourceConnected: boolean, gorgiasConnected: boolean): SetupPhase {
  if (orderSourceConnected && gorgiasConnected) return 'both';
  if (orderSourceConnected) return 'order_source_only';
  if (gorgiasConnected) return 'gorgias_only';
  return 'neither';
}

function connectedOrderSourceName(status: IntegrationsSetupStatus): string | null {
  if (status.shopify.connected) return 'Shopify';
  if (status.woocommerce.connected) return 'WooCommerce';
  if (status.bigcommerce.connected) return 'BigCommerce';
  return null;
}

function sectionCopy(phase: SetupPhase, status: IntegrationsSetupStatus): { heading: string; subcopy: string } {
  const orderSourceName = connectedOrderSourceName(status);
  switch (phase) {
    case 'both':
      return {
        heading: 'Claim intelligence active',
        subcopy:
          'Your order source and Gorgias are connected. Agents see order history, prior claims, trust indicators and review indicators inside support tickets.',
      };
    case 'order_source_only':
      return {
        heading: 'Finish setup',
        subcopy: orderSourceName
          ? `${orderSourceName} is connected. Connect Gorgias to show claim intelligence inside support tickets.`
          : 'Your order source is connected. Connect Gorgias to show claim intelligence inside support tickets.',
      };
    case 'gorgias_only':
      return {
        heading: 'Finish setup',
        subcopy:
          'Gorgias is connected. Connect an order source so Unauth can power the widget with order, refund, customer and fulfilment context.',
      };
    default:
      return {
        heading: 'Finish setup',
        subcopy: 'Connect an order source and Gorgias to show claim context inside support tickets.',
      };
  }
}

function commercePlatformState(
  platform: CommercePlatform,
  status: IntegrationsSetupStatus,
): { connected: boolean; detail: string | null } {
  if (platform.id === 'shopify') {
    return { connected: status.shopify.connected, detail: status.shopify.detail };
  }
  if (platform.id === 'woocommerce') {
    return { connected: status.woocommerce.connected, detail: status.woocommerce.detail };
  }
  if (platform.id === 'bigcommerce') {
    return { connected: status.bigcommerce.connected, detail: status.bigcommerce.detail };
  }
  return { connected: false, detail: null };
}

function ConnectedSetupCard({
  logo,
  name,
  copy,
  detail,
  manageHref,
}: {
  logo: string;
  name: string;
  copy: string;
  detail?: string | null;
  manageHref: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-xl border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--sev-clear, #2f6b43) 30%, var(--surface-border))',
        background: 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--surface-raised))',
      }}
    >
      <Image src={logo} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-md object-contain" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {name}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
              {detail ? <span style={{ color: 'var(--text-muted)' }}>· {detail}</span> : null}
            </p>
          </div>
          <Link
            href={manageHref}
            className="inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
          >
            Manage
          </Link>
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {copy}
        </p>
      </div>
    </div>
  );
}

function ActivationSetupCard({
  logo,
  title,
  copy,
  href,
  ctaLabel,
  prominent = false,
  connected = false,
  detail,
}: {
  logo: string;
  title: string;
  copy: string;
  href: string;
  ctaLabel: string;
  prominent?: boolean;
  connected?: boolean;
  detail?: string | null;
}) {
  return (
    <div
      className={`flex gap-4 rounded-xl border ${prominent ? 'p-6' : 'p-4'}`}
      style={{
        borderColor: prominent
          ? 'color-mix(in srgb, var(--accent) 45%, var(--surface-border))'
          : 'var(--surface-border)',
        background: prominent
          ? 'color-mix(in srgb, var(--accent) 6%, var(--surface-raised))'
          : 'var(--surface-raised)',
      }}
    >
      <Image
        src={logo}
        alt=""
        width={prominent ? 40 : 32}
        height={prominent ? 40 : 32}
        className={`${prominent ? 'h-10 w-10' : 'h-8 w-8'} shrink-0 rounded-md object-contain`}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className={`font-semibold ${prominent ? 'text-base' : 'text-sm'}`} style={{ color: 'var(--text)' }}>
            {title}
          </p>
          {connected ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
              {detail ? <span style={{ color: 'var(--text-muted)' }}>· {detail}</span> : null}
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-medium" style={{ color: prominent ? 'var(--accent)' : 'var(--text-muted)' }}>
              Not connected
            </p>
          )}
          <p className={`mt-2 leading-relaxed ${prominent ? 'text-sm' : 'text-xs'}`} style={{ color: 'var(--text-muted)' }}>
            {copy}
          </p>
        </div>
        {!connected ? (
          <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg font-semibold ${
              prominent ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-2 text-xs'
            }`}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CommercePlatformsPanel({ status }: { status: IntegrationsSetupStatus }) {
  const orderSourceConnected =
    status.shopify.connected || status.woocommerce.connected || status.bigcommerce.connected;

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Order data
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          {orderSourceConnected
            ? 'Order, customer, refund and fulfilment context is syncing.'
            : 'Connect your storefront to sync orders and customer identity.'}
        </p>
      </div>

      <div className="space-y-2">
        {COMMERCE_PLATFORMS.map((platform) => {
          const { connected, detail } = commercePlatformState(platform, status);
          const isShopify = platform.id === 'shopify';
          const demoted = orderSourceConnected && !connected && !isShopify;

          return (
            <div
              key={platform.id}
              className="flex gap-3 rounded-lg border p-3"
              style={{
                borderColor: connected
                  ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 30%, var(--surface-border))'
                  : 'var(--surface-border)',
                background: connected
                  ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--bg-surface))'
                  : 'var(--bg-surface)',
                opacity: demoted ? 0.75 : 1,
              }}
            >
              <Image
                src={platform.logo}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-md object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {platform.name}
                  </p>
                  {platform.available ? (
                    connected ? (
                      <Link
                        href={platform.href}
                        className="inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                      >
                        Manage
                      </Link>
                    ) : (
                      <Link
                        href={platform.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: !orderSourceConnected && isShopify ? 'var(--accent)' : 'transparent',
                          border: !orderSourceConnected && isShopify ? 'none' : '1px solid var(--surface-border)',
                          color: !orderSourceConnected && isShopify ? 'var(--accent-fg, #fff)' : 'var(--text-muted)',
                        }}
                      >
                        Connect
                        {!orderSourceConnected && isShopify ? <ArrowRight className="h-3 w-3" /> : null}
                      </Link>
                    )
                  ) : (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        background: 'color-mix(in srgb, var(--text-muted) 10%, transparent)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Coming soon
                    </span>
                  )}
                </div>
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
                  {connected && detail ? (
                    <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                      · {detail}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {platform.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OtherHelpdesksDisclosure({ items }: { items: SecondaryIntegration[] }) {
  return (
    <details
      className="group rounded-xl border"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
    >
      <summary
        className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          Using another helpdesk?
        </span>
      </summary>
      <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--surface-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.85 }}>
          Zendesk and Freshdesk are available for pilot or advanced setup.
        </p>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
              style={{ opacity: 0.8 }}
            >
              <Image src={item.logo} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                  {item.name}
                  {item.connected ? (
                    <span className="ml-1.5 font-normal" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
                      · Connected
                    </span>
                  ) : null}
                  {!item.available ? (
                    <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
                      · Coming soon
                    </span>
                  ) : null}
                </p>
                {item.connected && item.detail ? (
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.detail}
                  </p>
                ) : null}
              </div>
              {item.available ? (
                <Link
                  href={item.href}
                  className="shrink-0 text-xs font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.connected ? 'Manage' : 'Connect'}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function IntegrationsSetupClient() {
  const { data: status } = useAsyncResource('integrations-setup-status', fetchIntegrationConnectionStatus);

  if (!status) {
    return (
      <div
        className="h-48 animate-pulse rounded-xl border"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      />
    );
  }

  const orderSourceConnected =
    status.shopify.connected || status.woocommerce.connected || status.bigcommerce.connected;
  const gorgiasConnected = status.gorgias.connected;
  const phase = resolveSetupPhase(orderSourceConnected, gorgiasConnected);
  const { heading, subcopy } = sectionCopy(phase, status);

  const secondaryHelpdesks: SecondaryIntegration[] = [
    {
      id: 'zendesk',
      name: 'Zendesk',
      href: '/settings/integrations/zendesk',
      logo: '/integrations/zendesk.svg',
      available: true,
      connected: status.zendesk.connected,
      detail: status.zendesk.detail,
    },
    {
      id: 'freshdesk',
      name: 'Freshdesk',
      href: '/settings/integrations/freshdesk',
      logo: '/integrations/freshdesk.svg',
      available: true,
      connected: status.freshdesk.connected,
      detail: status.freshdesk.detail,
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {heading}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {subcopy}
        </p>
      </div>

      <div className="space-y-3">
        <CommercePlatformsPanel status={status} />

        {phase === 'both' ? (
          <ConnectedSetupCard
            logo="/integrations/gorgias.png"
            name="Gorgias"
            copy={
              status.gorgias.widgetReady
                ? 'Claim intelligence is active in your Gorgias sidebar.'
                : 'Gorgias is connected. Finish widget setup if agents do not see claim context yet.'
            }
            detail={status.gorgias.detail}
            manageHref="/settings/integrations/gorgias"
          />
        ) : phase === 'order_source_only' ? (
          <ActivationSetupCard
            logo="/integrations/gorgias.png"
            title="Activate claim intelligence in Gorgias"
            copy="Connect Gorgias so agents can see claim context, trust indicators and review indicators directly inside support tickets."
            href="/settings/integrations/gorgias"
            ctaLabel="Connect Gorgias"
            prominent
          />
        ) : phase === 'gorgias_only' ? (
          <ConnectedSetupCard
            logo="/integrations/gorgias.png"
            name="Gorgias"
            copy="Claim history is syncing from Gorgias. Connect an order source above to add order and fulfilment context to every ticket."
            detail={status.gorgias.detail}
            manageHref="/settings/integrations/gorgias"
          />
        ) : (
          <ActivationSetupCard
            logo="/integrations/gorgias.png"
            title="Activate claim intelligence in Gorgias"
            copy="Agents see order history, prior claims, trust indicators and review indicators without leaving Gorgias."
            href="/settings/integrations/gorgias"
            ctaLabel="Connect Gorgias"
          />
        )}
      </div>

      <OtherHelpdesksDisclosure items={secondaryHelpdesks} />
    </section>
  );
}
