'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Copy, KeyRound, Trash2, ExternalLink, Headphones, CheckCircle2, ArrowRight } from 'lucide-react';

type ApiKeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit_per_minute: number;
};

type HelpdeskOption = {
  id: 'gorgias' | 'zendesk';
  name: string;
  description: string;
  statusKey: 'gorgias' | 'zendesk';
  href: string;
  logo: string;
};

// Helpdesk providers are OPTIONS under the single "Helpdesk" requirement —
// connecting either one satisfies the claims & dispute-context source.
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
];

type ConnectionState = { connected: boolean; detail: string | null };
type ConnectionStatus = {
  gorgias: ConnectionState;
  shopify: ConnectionState;
  zendesk: ConnectionState;
};

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ApiIntegrationsClient({
  section = 'advanced',
}: {
  section?: 'helpdesk' | 'advanced';
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
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

  async function loadConnections() {
    try {
      const [gRes, sRes, zRes] = await Promise.all([
        fetch('/api/settings/gorgias/support-connection', { cache: 'no-store' }),
        fetch('/api/shopify/status', { cache: 'no-store' }),
        fetch('/api/settings/zendesk/connection', { cache: 'no-store' }),
      ]);
      const gBody = gRes.ok ? await gRes.json() : null;
      const sBody = sRes.ok ? await sRes.json() : null;
      const zBody = zRes.ok ? await zRes.json() : null;
      const gConn = gBody?.connection ?? null;
      setConnStatus({
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
      });
    } catch {
      setConnStatus({
        gorgias: { connected: false, detail: null },
        shopify: { connected: false, detail: null },
        zendesk: { connected: false, detail: null },
      });
    }
  }

  useEffect(() => {
    loadKeys();
    loadConnections();
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

  /* ---------- Helpdesk requirement card (right half of the required pair) ---------- */
  if (section === 'helpdesk') {
    const statusKnown = connStatus !== null;
    const gorgiasConnected = Boolean(connStatus?.gorgias.connected);
    const zendeskConnected = Boolean(connStatus?.zendesk.connected);
    const helpdeskConnected = gorgiasConnected || zendeskConnected;
    const shopifyConnected = Boolean(connStatus?.shopify.connected);
    // Strongly guide to connect helpdesk when Shopify is live but claims have no source.
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
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Helpdesk</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Claims &amp; dispute context</p>
          </div>
        </div>

        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: cardBorder, background: cardBg }}
        >
          {/* Requirement status header */}
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
                    ? 'Shopify is live, but claim and dispute context comes from your helpdesk. Until you connect one, claim metrics read as incomplete — not zero.'
                    : 'Choose one provider below. Either one supplies claim history and dispute context.'}
              </p>
            </div>
          </div>

          {/* Provider options */}
          <div className="space-y-2.5">
            {HELPDESK_OPTIONS.map((item) => {
              const state = connStatus ? connStatus[item.statusKey] : null;
              const connected = Boolean(state?.connected);
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg border p-3"
                  style={{
                    borderColor: connected ? 'var(--sev-clear, #2f6b43)' : 'var(--surface-border)',
                    background: connected ? 'color-mix(in srgb, var(--sev-clear, #2f6b43) 4%, var(--bg-surface))' : 'var(--bg-surface)',
                  }}
                >
                  <img
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
                        <a
                          href={item.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
                          style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                        >
                          Manage
                        </a>
                      ) : (
                        <a
                          href={item.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
                          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
                        >
                          Connect
                          {guideToHelpdesk && <ArrowRight className="h-3 w-3" />}
                        </a>
                      )}
                    </div>
                    {statusKnown && (
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
                        {connected && state?.detail && (
                          <span className="truncate" style={{ color: 'var(--text-muted)' }}>· {state.detail}</span>
                        )}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {helpdeskConnected && (
            <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Required helpdesk source satisfied
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Advanced section (lower priority) ---------- */
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Advanced</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Browser tooling and API keys for custom integrations. Optional — not required for core monitoring.
        </p>
      </div>

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
            No API keys yet. Create one for the Chrome extension or custom API integrations.
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

      <section
        className="flex gap-3 rounded-lg border p-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <img
          src="/integrations/chrome.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-md"
          style={{ objectFit: 'contain' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Chrome extension</p>
            <a
              href="/settings/integrations/chrome"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text)' }}
            >
              Install
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Look up customers from any page with one click.
          </p>
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
