'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';
import { normalizeShopInput } from '@/lib/shopify/normalizeShopInput';

interface WebhookEvent {
  at: string;
  topic: string | null;
  status: string;
}

interface ShopifyStatus {
  connected: boolean;
  linkState?: 'connected' | 'not_connected' | 'disconnected' | 'installed_unlinked';
  shopDomain?: string;
  lastOrderSyncedAt?: string | null;
  lastWebhookAt?: string | null;
  lastWebhookTopic?: string | null;
  lastWebhookStatus?: string | null;
  orderCount?: number;
  auditTransactionCount?: number;
  lastError?: string | null;
  scopes?: string[];
  dataSources?: string[];
  webhookFailures?: number;
  recentWebhooks?: WebhookEvent[];
}

function ConnectModal({
  initialValue,
  onClose,
}: {
  initialValue?: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = normalizeShopInput(value);
    if (result.error === 'empty') {
      setInputError('Please enter your Shopify Admin URL.');
      inputRef.current?.focus();
      return;
    }
    if (result.error === 'public_domain') {
      setInputError(
        'That looks like a public website address. Please enter your Shopify Admin URL instead — for example admin.shopify.com/store/your-store.',
      );
      inputRef.current?.focus();
      return;
    }
    if (result.error === 'invalid') {
      setInputError('We could not recognise that as a Shopify Admin URL. Try admin.shopify.com/store/your-store.');
      inputRef.current?.focus();
      return;
    }
    // error checks above guarantee domain is a non-null string here
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(result.domain as string)}`;
  }

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-shopify-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 opacity-50 hover:opacity-100"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="connect-shopify-title"
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--text)' }}
        >
          Connect Shopify
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          We use this only to send you to the correct Shopify approval screen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="shopify-admin-url"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Shopify Admin URL
            </label>
            <input
              ref={inputRef}
              id="shopify-admin-url"
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setInputError(''); }}
              placeholder="admin.shopify.com/store/your-store"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              style={{
                borderColor: inputError ? 'var(--risk-high, #DC2626)' : 'var(--border-subtle)',
                background: 'var(--bg-inset)',
                color: 'var(--text)',
              }}
              autoComplete="off"
              spellCheck={false}
              data-testid="shopify-admin-url-input"
            />
            {inputError ? (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--risk-high, #DC2626)' }} role="alert">
                {inputError}
              </p>
            ) : (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Paste the Shopify Admin URL for the store you want to connect. You can find it in Shopify Admin, usually as{' '}
                <code className="font-mono">admin.shopify.com/store/your-store</code>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-medium"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-inset)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}
              data-testid="shopify-connect-submit"
            >
              Continue to Shopify →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SyncStatusCard() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    return fetch('/api/shopify/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStatus(d);
        return d;
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify_connected') === '1') {
      // Audit scoring runs in after() post-OAuth; poll until counts update.
      const timers = [300, 3000, 12000, 30000].map((ms) => window.setTimeout(() => loadStatus(), ms));
      return () => timers.forEach((id) => window.clearTimeout(id));
    }
    return undefined;
  }, [loadStatus]);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/shopify/sync-audit', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setSyncError(body?.error ?? 'Sync failed. Try again or reconnect Shopify.');
        return;
      }
      await loadStatus();
    } catch {
      setSyncError('Sync failed. Check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  }

  if (!status) return null;

  if (!status.connected) {
    const linkState = status.linkState ?? 'not_connected';
    const title =
      linkState === 'disconnected'
        ? 'Shopify was disconnected'
        : linkState === 'installed_unlinked'
          ? 'Shopify installed but not linked'
          : 'Not connected';
    const description =
      linkState === 'disconnected'
        ? `Reconnect ${status.shopDomain ?? 'Shopify'} to continue syncing orders, customers, refunds and fulfilment events.`
        : linkState === 'installed_unlinked'
          ? `Shopify is installed for ${status.shopDomain ?? 'your store'} but not linked to this Unauth workspace. Reconnect to finish linking.`
          : 'Connect Shopify to sync orders, customers, refunds and fulfilment events.';
    const actionLabel =
      linkState === 'disconnected' || linkState === 'installed_unlinked'
        ? 'Reconnect Shopify'
        : 'Connect Shopify';

    return (
      <>
        <div
          className="rounded-xl p-5 border space-y-4"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0"
              style={{
                background:
                  linkState === 'installed_unlinked'
                    ? 'var(--risk-medium, #D97706)'
                    : 'var(--text-muted)',
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center mt-3 rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}
                data-testid="open-connect-shopify-modal"
              >
                {actionLabel}
              </button>
            </div>
          </div>

          {status.scopes && status.scopes.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                Requested read-only scopes
              </p>
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
          )}
        </div>

        {modalOpen && (
          <ConnectModal
            initialValue={status.shopDomain ?? ''}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    );
  }

  const hasError = !!status.lastError;
  const webhookHealthy = (status.webhookFailures ?? 0) === 0;

  return (
    <>
      <div
        className="rounded-xl p-5 border space-y-4"
        style={{
          borderColor: hasError ? 'var(--risk-high-bd, #FCA5A5)' : 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
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
                {typeof status.auditTransactionCount === 'number'
                  ? ` · ${status.auditTransactionCount.toLocaleString()} scored for fraud`
                  : ''}{' '}
                · read-only connection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => void handleSyncNow()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)', color: '#fff' }}
              data-testid="shopify-sync-now"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Syncing…
                </>
              ) : (
                'Sync now'
              )}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
              data-testid="reconnect-shopify"
            >
              Reconnect
            </button>
          </div>
        </div>

        {syncError && (
          <p className="text-xs" style={{ color: 'var(--risk-high, #DC2626)' }} role="alert">
            {syncError}
          </p>
        )}

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
            <p
              className="font-medium mt-0.5"
              style={{ color: webhookHealthy ? 'var(--success)' : 'var(--risk-high)' }}
            >
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

        {status.scopes && status.scopes.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Granted scopes
            </p>
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
        )}

        {status.recentWebhooks && status.recentWebhooks.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Recent webhook activity
            </p>
            <ul className="space-y-1">
              {status.recentWebhooks.map((event) => (
                <li
                  key={`${event.at}-${event.topic ?? 'unknown'}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-mono truncate" style={{ color: 'var(--text)' }}>
                    {event.topic ?? 'webhook'}
                  </span>
                  <span style={{ color: event.status === 'failed' ? 'var(--risk-high)' : 'var(--text-muted)' }}>
                    {event.status} · {formatRelativeTime(event.at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasError && (
          <div
            className="px-3 py-2 rounded-md text-xs"
            style={{ background: 'var(--risk-high-bg, #FEE2E2)', color: 'var(--risk-high, #991B1B)' }}
          >
            <p className="font-semibold mb-0.5">Sync error</p>
            <p>{status.lastError}</p>
            <button
              onClick={() => setModalOpen(true)}
              className="font-semibold underline mt-1 inline-block"
            >
              Reconnect Shopify
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <ConnectModal
          initialValue={status.shopDomain ?? ''}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
