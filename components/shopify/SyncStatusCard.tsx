'use client';
import { useEffect, useRef, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils/format';

interface WebhookEvent {
  at: string;
  topic: string | null;
  status: string;
}

interface ShopifyStatus {
  connected: boolean;
  shopDomain?: string;
  lastOrderSyncedAt?: string | null;
  lastWebhookAt?: string | null;
  lastWebhookTopic?: string | null;
  lastWebhookStatus?: string | null;
  orderCount?: number;
  lastError?: string | null;
  scopes?: string[];
  dataSources?: string[];
  webhookFailures?: number;
  recentWebhooks?: WebhookEvent[];
}

export default function SyncStatusCard() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [shopInput, setShopInput] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/shopify/status')
      .then(r => r.ok ? r.json() : null)
      .then((d) => setStatus(d))
      .catch(() => {});
  }, []);

  function buildShopDomain(raw: string): string | null {
    const v = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!v) return null;
    const domain = v.includes('.myshopify.com') ? v : `${v}.myshopify.com`;
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) ? domain : null;
  }

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const domain = buildShopDomain(shopInput);
    if (!domain) {
      setInputError('Enter your store name or full .myshopify.com domain.');
      inputRef.current?.focus();
      return;
    }
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="rounded-xl p-5 border space-y-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex items-start gap-3">
          <div className="h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: 'var(--text-muted)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Shopify not connected</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Connect Shopify to pull live orders into the claim workflow, see real-time webhooks, and enrich identity signals.
            </p>
            <form onSubmit={handleConnect} className="mt-3 flex flex-col gap-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={shopInput}
                    onChange={(e) => { setShopInput(e.target.value); setInputError(''); }}
                    placeholder="your-store.myshopify.com"
                    className="w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-1"
                    style={{
                      borderColor: inputError ? 'var(--risk-high, #DC2626)' : 'var(--border-subtle)',
                      background: 'var(--bg-inset)',
                      color: 'var(--text)',
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold flex-shrink-0"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Connect →
                </button>
              </div>
              {inputError && (
                <p className="text-xs" style={{ color: 'var(--risk-high, #DC2626)' }}>{inputError}</p>
              )}
            </form>
          </div>
        </div>
        {status.scopes && status.scopes.length > 0 ? (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Requested read-only scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {status.scopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded px-2 py-0.5 font-mono text-[10px]"
                  style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const hasError = !!status.lastError;
  const webhookHealthy = (status.webhookFailures ?? 0) === 0;

  return (
    <div className="rounded-xl p-5 border space-y-4" style={{ borderColor: hasError ? 'var(--risk-high-bd, #FCA5A5)' : 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
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
              {status.orderCount?.toLocaleString() ?? '—'} orders synced · read-only connection
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

      <div className="grid grid-cols-2 gap-3 text-xs">
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
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Webhook health</p>
          <p className="font-medium mt-0.5" style={{ color: webhookHealthy ? 'var(--success)' : 'var(--risk-high)' }}>
            {webhookHealthy ? 'Healthy' : `${status.webhookFailures} failed`}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Data sources</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {(status.dataSources ?? ['Shopify']).join(' · ')}
          </p>
        </div>
      </div>

      {status.scopes && status.scopes.length > 0 ? (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Granted scopes</p>
          <div className="flex flex-wrap gap-1.5">
            {status.scopes.map((scope) => (
              <span
                key={scope}
                className="rounded px-2 py-0.5 font-mono text-[10px]"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {status.recentWebhooks && status.recentWebhooks.length > 0 ? (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Recent webhook activity</p>
          <ul className="space-y-1">
            {status.recentWebhooks.map((event) => (
              <li key={`${event.at}-${event.topic ?? 'unknown'}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono truncate" style={{ color: 'var(--text)' }}>{event.topic ?? 'webhook'}</span>
                <span style={{ color: event.status === 'failed' ? 'var(--risk-high)' : 'var(--text-muted)' }}>
                  {event.status} · {formatRelativeTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasError && (
        <div className="px-3 py-2 rounded-md text-xs" style={{ background: 'var(--risk-high-bg, #FEE2E2)', color: 'var(--risk-high, #991B1B)' }}>
          <p className="font-semibold mb-0.5">Sync error</p>
          <p>{status.lastError}</p>
          <a href="/settings/integrations" className="font-semibold underline mt-1 inline-block">Reconnect Shopify</a>
        </div>
      )}
    </div>
  );
}
