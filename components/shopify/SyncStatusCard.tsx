'use client';
import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils/format';

interface ShopifyStatus {
  connected: boolean;
  shopDomain?: string;
  lastOrderSyncedAt?: string | null;
  lastWebhookAt?: string | null;
  lastWebhookTopic?: string | null;
  orderCount?: number;
  lastError?: string | null;
}

export default function SyncStatusCard() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);

  useEffect(() => {
    fetch('/api/shopify/status')
      .then(r => r.ok ? r.json() : null)
      .then((d) => setStatus(d))
      .catch(() => {});
  }, []);

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="rounded-xl p-5 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex items-start gap-3">
          <div className="h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Shopify not connected</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Connect Shopify to pull live orders into the claim workflow, see real-time webhooks, and enrich identity signals.
            </p>
            <a
              href="/api/shopify/install"
              className="inline-flex items-center mt-2 text-xs font-semibold hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Connect Shopify →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const hasError = !!status.lastError;

  return (
    <div className="rounded-xl p-5 border" style={{ borderColor: hasError ? 'var(--risk-high-bd, #FCA5A5)' : 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0"
            style={{ background: hasError ? 'var(--risk-high, #DC2626)' : 'var(--success, #16A34A)' }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {status.shopDomain}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {status.orderCount?.toLocaleString() ?? '—'} orders synced
            </p>
          </div>
        </div>
        <a
          href="/settings/integrations"
          className="text-xs hover:underline flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          Manage →
        </a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Last order synced</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {status.lastOrderSyncedAt ? formatRelativeTime(status.lastOrderSyncedAt) : 'Never'}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Last webhook</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {status.lastWebhookAt ? formatRelativeTime(status.lastWebhookAt) : 'None'}
            {status.lastWebhookTopic && (
              <span className="ml-1 font-mono opacity-60">{status.lastWebhookTopic}</span>
            )}
          </p>
        </div>
      </div>

      {hasError && (
        <div className="mt-3 px-3 py-2 rounded-md text-xs" style={{ background: 'var(--risk-high-bg, #FEE2E2)', color: 'var(--risk-high, #991B1B)' }}>
          <p className="font-semibold mb-0.5">Sync error</p>
          <p>{status.lastError}</p>
          <a href="/api/shopify/install" className="font-semibold underline mt-1 inline-block">Reconnect Shopify</a>
        </div>
      )}
    </div>
  );
}
