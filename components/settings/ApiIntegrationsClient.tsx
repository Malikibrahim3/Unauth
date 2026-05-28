'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Copy, KeyRound, Trash2, ExternalLink } from 'lucide-react';

type ApiKeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit_per_minute: number;
};

const INTEGRATIONS = [
  {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Surface Unauth risk scores inside your helpdesk sidebar',
    badge: 'Connect',
    badgeVariant: 'connect' as const,
    href: '/settings/integrations/gorgias',
    logo: '/integrations/gorgias.svg',
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Flag high-risk customers while agents handle tickets',
    badge: 'Connect',
    badgeVariant: 'connect' as const,
    href: '/settings/integrations/zendesk',
    logo: '/integrations/zendesk.svg',
  },
  {
    id: 'shopify',
    name: 'Shopify sidebar',
    description: 'Embed identity intelligence in your Shopify admin',
    badge: 'Connect',
    badgeVariant: 'connect' as const,
    href: '/settings/integrations',
    logo: '/integrations/shopify.svg',
  },
  {
    id: 'chrome',
    name: 'Chrome extension',
    description: 'Look up customers from any page with one click',
    badge: 'Install',
    badgeVariant: 'install' as const,
    href: '/settings/integrations/chrome',
    logo: '/integrations/chrome.svg',
  },
] as const;

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ApiIntegrationsClient() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdWidgetToken, setCreatedWidgetToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/api-keys', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to load API keys');
      setKeys(body.keys ?? []);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load API keys',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function createKey(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to create key');
      setCreatedSecret(body.key?.secret ?? null);
      setCreatedWidgetToken(body.key?.widget_token ?? null);
      setKeyName('');
      await loadKeys();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create key',
      });
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(key: ApiKeyRow) {
    setBusyId(key.id);
    setRevokeTarget(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/settings/api-keys/${key.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to revoke key');
      setMessage({ type: 'success', text: `Revoked "${key.name}".` });
      await loadKeys();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke key',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function copySecret() {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyWidgetToken() {
    if (!createdWidgetToken) return;
    await navigator.clipboard.writeText(createdWidgetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeCreateModal() {
    setModalOpen(false);
    setCreatedSecret(null);
    setCreatedWidgetToken(null);
    setKeyName('');
    setCopied(false);
  }

  return (
    <div className="space-y-8">
      {message && (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background: message.type === 'error' ? 'rgba(180, 50, 50, 0.08)' : 'rgba(47, 107, 67, 0.10)',
            color: 'var(--text)',
          }}
        >
          {message.text}
        </p>
      )}

      <section
        className="rounded-lg border"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--surface-border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>API keys</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Authenticate public API requests with{' '}
              <code className="text-xs">Authorization: Bearer unauth_sk_…</code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            <KeyRound className="h-4 w-4" />
            Create new API key
          </button>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            No API keys yet. Create one for your Gorgias, Zendesk, or custom integration.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{key.name}</p>
                  <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{key.key_prefix}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Created {formatDate(key.created_at)} · Last used {formatDate(key.last_used_at)} ·{' '}
                    {key.rate_limit_per_minute}/min
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === key.id}
                  onClick={() => setRevokeTarget(key)}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Integrations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-lg border p-4"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
            >
              <img
                src={item.logo}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-md"
                style={{ objectFit: 'contain' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                  <a
                    href={item.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={
                      item.badgeVariant === 'connect'
                        ? { background: 'rgba(47, 107, 67, 0.12)', color: 'var(--sev-clear, #2f6b43)' }
                        : { background: 'rgba(26, 115, 232, 0.12)', color: '#1A73E8' }
                    }
                  >
                    {item.badge}
                    {item.badgeVariant === 'install' ? <ExternalLink className="h-3 w-3" /> : null}
                  </a>
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={closeCreateModal}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-lg border p-6 shadow-lg"
            style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
          >
            {createdSecret ? (
              <>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Save your credentials</h3>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Save these now. You won&apos;t be able to see them again.
                </p>
                <p className="mt-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  API Key (for Chrome, Zendesk, direct API)
                </p>
                <pre
                  className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
                  style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
                >
                  {createdSecret}
                </pre>
                {createdWidgetToken && (
                  <>
                    <p className="mt-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Widget Token (for Gorgias widget URL only)
                    </p>
                    <pre
                      className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
                      style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
                    >
                      {createdWidgetToken}
                    </pre>
                  </>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={copySecret}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy API key'}
                  </button>
                  {createdWidgetToken && (
                    <button
                      type="button"
                      onClick={copyWidgetToken}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm"
                      style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy widget token
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={createKey}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Create API key</h3>
                <label className="mt-4 block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Label
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Gorgias integration"
                    className="mt-1 w-full rounded-md px-3 py-2 text-sm"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !keyName.trim()}
                    className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                  >
                    {creating ? 'Creating…' : 'Create key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setRevokeTarget(null)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-lg border p-6 shadow-lg"
            style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Revoke API key?</h3>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Integrations using <strong>{revokeTarget.name}</strong> ({revokeTarget.key_prefix}) will stop working
              immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === revokeTarget.id}
                onClick={() => revokeKey(revokeTarget)}
                className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: 'rgba(180, 50, 50, 0.12)', color: 'var(--text)' }}
              >
                Revoke key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
