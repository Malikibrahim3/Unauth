'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Store } from 'lucide-react';

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
    href: '#',
    logo: '/integrations/shopify.svg',
    available: true,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Pull order and customer data from your WordPress store',
    href: '#',
    logo: '/integrations/woocommerce.svg',
    available: false,
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Sync orders and customers from your BigCommerce storefront',
    href: '#',
    logo: '/integrations/bigcommerce.svg',
    available: false,
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

type ShopifyConnectionState = { connected: boolean; detail: string | null };

export default function OrderSourceClient() {
  const [shopify, setShopify] = useState<ShopifyConnectionState | null>(null);

  useEffect(() => {
    fetch('/api/shopify/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setShopify({
          connected: Boolean(d?.connected),
          detail: d?.shopDomain ?? null,
        });
      })
      .catch(() => setShopify({ connected: false, detail: null }));
  }, []);

  const statusKnown = shopify !== null;
  const shopifyConnected = Boolean(shopify?.connected);

  return (
    <div className="space-y-2.5">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 shrink-0" style={{ color: 'var(--icon-muted)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Order source</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Order &amp; customer data</p>
        </div>
      </div>

      {/* Main card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        {/* Status header */}
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: shopifyConnected
                ? 'var(--sev-clear, #2f6b43)'
                : 'var(--text-muted)',
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {shopifyConnected ? 'Order source connected' : 'No order source connected'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {shopifyConnected
                ? 'Orders and customer data are syncing. Every flagged order traces back to a real transaction.'
                : 'Connect your ecommerce platform to begin syncing orders and customer identity.'}
            </p>
          </div>
        </div>

        {/* Platform rows */}
        <div className="space-y-2.5">
          {PLATFORM_OPTIONS.map((platform) => {
            const isShopify = platform.id === 'shopify';
            const connected = isShopify && shopifyConnected;
            const detail = isShopify ? shopify?.detail : null;

            return (
              <div key={platform.id}>
                <div
                  className="flex gap-3 rounded-lg border p-3"
                  style={{
                    borderColor: connected ? 'var(--sev-clear, #2f6b43)' : 'var(--surface-border)',
                    background: connected ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--bg-surface))' : 'var(--bg-surface)',
                  }}
                >
                  <img
                    src={platform.logo}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-md"
                    style={{ objectFit: 'contain' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {platform.name}
                      </p>
                      {platform.available ? (
                        connected ? (
                          <a
                            href={`/settings/integrations/${platform.id}`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
                            style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                          >
                            Manage
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                          >
                            Connect
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )
                      ) : (
                        <span
                          className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: 'color-mix(in srgb, var(--text-muted) 10%, transparent)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          Coming soon
                        </span>
                      )}
                    </div>

                    {/* Status dot line — matches helpdesk row pattern exactly */}
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

        {shopifyConnected && (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required order source satisfied
          </p>
        )}
      </div>

    </div>
  );
}
