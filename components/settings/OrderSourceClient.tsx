'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Store } from 'lucide-react';
import { useFetchJson } from '@/lib/react/useFetchJson';

type PlatformOption = {
  id: string;
  name: string;
  description: string;
  href: string;
  logo: string;
  available: boolean;
};

const PLATFORM_OPTIONS: PlatformOption[] = [
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

type ShopifyStatusResponse = {
  connected?: boolean;
  shopDomain?: string | null;
};

type WooCommerceStatusResponse = {
  connected?: boolean;
  storeKey?: string | null;
};

type BigCommerceStatusResponse = {
  connected?: boolean;
  storeKey?: string | null;
};

export default function OrderSourceClient() {
  const { data: shopifyData } = useFetchJson<ShopifyStatusResponse>('/api/shopify/status', {
    parse: async (response) => (response.ok ? response.json() : { connected: false, shopDomain: null }),
  });
  const { data: wooData } = useFetchJson<WooCommerceStatusResponse>('/api/woocommerce/status', {
    parse: async (response) => (response.ok ? response.json() : { connected: false, storeKey: null }),
  });
  const { data: bcData } = useFetchJson<BigCommerceStatusResponse>('/api/bigcommerce/status', {
    parse: async (response) => (response.ok ? response.json() : { connected: false, storeKey: null }),
  });

  const statusKnown =
    shopifyData !== undefined && wooData !== undefined && bcData !== undefined;
  const shopifyConnected = Boolean(shopifyData?.connected);
  const wooConnected = Boolean(wooData?.connected);
  const bcConnected = Boolean(bcData?.connected);
  const orderSourceConnected = shopifyConnected || wooConnected || bcConnected;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 shrink-0" style={{ color: 'var(--icon-muted)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Order source</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Order &amp; customer data</p>
        </div>
      </div>

      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: orderSourceConnected
                ? 'var(--sev-clear, #2f6b43)'
                : 'var(--text-muted)',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {orderSourceConnected ? 'Order source connected' : 'No order source connected'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {orderSourceConnected
                ? 'Orders and customer data are syncing. Every flagged order traces back to a real transaction.'
                : 'Connect your ecommerce platform to begin syncing orders and customer identity.'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {PLATFORM_OPTIONS.map((platform) => {
            const connected =
              (platform.id === 'shopify' && shopifyConnected) ||
              (platform.id === 'woocommerce' && wooConnected) ||
              (platform.id === 'bigcommerce' && bcConnected);
            const detail =
              platform.id === 'shopify'
                ? shopifyData?.shopDomain
                : platform.id === 'woocommerce'
                  ? wooData?.storeKey
                  : platform.id === 'bigcommerce'
                    ? bcData?.storeKey
                    : null;

            return (
              <div key={platform.id}>
                <div
                  className="flex gap-3 rounded-lg border p-3"
                  style={{
                    borderColor: connected ? 'var(--sev-clear, #2f6b43)' : 'var(--surface-border)',
                    background: connected
                      ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--bg-surface))'
                      : 'var(--bg-surface)',
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
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
                            style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                          >
                            Manage
                          </Link>
                        ) : (
                          <Link
                            href={platform.href}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                          >
                            Connect
                            <ArrowRight className="h-3 w-3" />
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

                    {statusKnown && platform.available && (
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
                        {connected && detail && (
                          <span className="truncate" style={{ color: 'var(--text-muted)' }}>· {detail}</span>
                        )}
                      </p>
                    )}

                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {platform.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {orderSourceConnected && (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required order source satisfied
          </p>
        )}
      </div>
    </div>
  );
}
