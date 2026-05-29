'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, RefreshCw, Unplug } from 'lucide-react';
import {
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  type GorgiasSupportConnectionSettings,
} from '@/lib/support/gorgias/supportConnectionShared';

type EphemeralSecret = {
  secret: string;
  webhookUrl: string;
  headerName: string;
  warning: string;
};

type Props = {
  canManage: boolean;
};

function formatWhen(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function accountLabel(connection: GorgiasSupportConnectionSettings) {
  return (
    connection.provider_account_name ||
    connection.provider_account_id ||
    connection.provider_base_url ||
    'Gorgias account'
  );
}

function looksLikeDomain(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.includes('.') && !/^\d+$/.test(trimmed);
}

function buildCreatePayload(accountOrDomain: string, displayName: string) {
  const trimmed = accountOrDomain.trim();
  const name = displayName.trim() || undefined;
  if (looksLikeDomain(trimmed)) {
    return { domain: trimmed, name };
  }
  return { account_id: trimmed, name };
}

export default function GorgiasSupportSyncClient({ canManage }: Props) {
  const [connection, setConnection] = useState<GorgiasSupportConnectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOrDomain, setAccountOrDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ephemeralSecret, setEphemeralSecret] = useState<EphemeralSecret | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/settings/gorgias/support-connection', { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Failed to load Gorgias support connection');
        if (!cancelled) setConnection(body.connection ?? null);
      } catch (err) {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: err instanceof Error ? err.message : 'Failed to load connection',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyText(field: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function createConnection(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/gorgias/support-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCreatePayload(accountOrDomain, displayName)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to create connection');

      if (body.webhook_secret_plaintext) {
        setEphemeralSecret({
          secret: body.webhook_secret_plaintext,
          webhookUrl: body.webhook_url,
          headerName: body.header_name ?? GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
          warning: body.warning ?? GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
        });
        setShowSetupInstructions(true);
      }

      setConnection(body.connection ?? null);
      setAccountOrDomain('');
      setDisplayName('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create connection',
      });
    } finally {
      setBusy(false);
    }
  }

  async function rotateSecret() {
    if (!canManage) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/gorgias/support-connection/rotate-secret', {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to rotate secret');

      setEphemeralSecret({
        secret: body.webhook_secret_plaintext,
        webhookUrl: body.webhook_url,
        headerName: body.header_name ?? GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
        warning: body.warning ?? GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
      });
      setShowSetupInstructions(true);
      setConnection(body.connection ?? connection);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to rotate secret',
      });
    } finally {
      setBusy(false);
    }
  }

  async function disableConnection() {
    if (!canManage) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/gorgias/support-connection/disable', {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to disable connection');
      setEphemeralSecret(null);
      setConnection(body.connection ?? null);
      setMessage({ type: 'success', text: 'Gorgias support sync disabled.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disable connection',
      });
    } finally {
      setBusy(false);
    }
  }

  function dismissEphemeralSecret() {
    setEphemeralSecret(null);
  }

  const isActive = connection?.status === 'active';
  const isDisabledOrError =
    connection && (connection.status === 'disabled' || connection.status === 'error');

  function renderSetupPanel(secret: EphemeralSecret) {
    return (
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{
          borderColor: 'var(--surface-border)',
          background: 'var(--surface-raised)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          One-time webhook setup
        </p>
        <p className="text-sm" style={{ color: 'var(--warning, #b45309)' }}>
          {secret.warning}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          This secret is shown once. If lost, rotate it.
        </p>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Webhook URL
            </p>
            <pre
              className="overflow-x-auto rounded-md p-3 text-xs"
              style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
            >
              {secret.webhookUrl}
            </pre>
            <button
              type="button"
              disabled={!canManage}
              onClick={() => void copyText('webhookUrl', secret.webhookUrl)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {copiedField === 'webhookUrl' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy webhook URL
            </button>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Header name
            </p>
            <code className="text-xs" style={{ color: 'var(--text)' }}>
              {secret.headerName}
            </code>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Secret value
            </p>
            <pre
              className="overflow-x-auto rounded-md p-3 text-xs font-mono"
              style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
            >
              {secret.secret}
            </pre>
            <button
              type="button"
              disabled={!canManage}
              onClick={() => void copyText('secret', secret.secret)}
              className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
            >
              {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedField === 'secret' ? 'Copied' : 'Copy secret'}
            </button>
          </div>
        </div>

        <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <li>Open Gorgias HTTP integration / webhooks</li>
          <li>Set method POST</li>
          <li>Paste the webhook URL</li>
          <li>
            Add header <code>{secret.headerName}</code> with this secret
          </li>
          <li>
            Include account id/domain header if needed:{' '}
            <code>x-gorgias-account-id</code> or <code>x-gorgias-domain</code>
          </li>
          <li>Save and send a test event</li>
        </ol>

        <button
          type="button"
          onClick={dismissEphemeralSecret}
          className="text-xs underline"
          style={{ color: 'var(--text-muted)' }}
        >
          I saved the secret — hide this panel
        </button>
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border p-5 space-y-5"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Gorgias support ticket sync
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect Gorgias support tickets so Unauth can link refund/missing parcel conversations to
          Shopify orders, customer profiles, and claim review.
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

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading connection…
        </p>
      ) : ephemeralSecret ? (
        renderSetupPanel(ephemeralSecret)
      ) : !connection ? (
        <form onSubmit={(event) => void createConnection(event)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Gorgias account ID or account domain
            </label>
            <input
              required
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              placeholder="acme or acme.gorgias.com"
              value={accountOrDomain}
              onChange={(e) => setAccountOrDomain(e.target.value)}
              disabled={!canManage || busy}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Display name (optional)
            </label>
            <input
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              placeholder="Acme Gorgias"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!canManage || busy}
            />
          </div>
          <button
            type="submit"
            disabled={!canManage || busy}
            className="inline-flex rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            {busy ? 'Creating…' : 'Create webhook connection'}
          </button>
          {!canManage && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              You need manage settings permission to create a connection.
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          {isDisabledOrError && (
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: 'rgba(180, 50, 50, 0.08)', color: 'var(--text)' }}
            >
              <p className="font-medium">Connection {connection.status}</p>
              {connection.last_error && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {connection.last_error}
                </p>
              )}
            </div>
          )}

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--text-muted)' }}>Account</dt>
              <dd style={{ color: 'var(--text)' }}>{accountLabel(connection)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--text-muted)' }}>Status</dt>
              <dd style={{ color: 'var(--text)' }}>{connection.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--text-muted)' }}>Webhook secret</dt>
              <dd style={{ color: 'var(--text)' }}>
                {connection.webhook_secret_configured ? 'Configured' : 'Not configured'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--text-muted)' }}>Last sync</dt>
              <dd style={{ color: 'var(--text)' }}>{formatWhen(connection.last_sync_at)}</dd>
            </div>
            {connection.last_error && isActive && (
              <div className="flex justify-between gap-4">
                <dt style={{ color: 'var(--text-muted)' }}>Last error</dt>
                <dd className="text-right" style={{ color: 'var(--text)' }}>
                  {connection.last_error}
                </dd>
              </div>
            )}
          </dl>

          {showSetupInstructions && connection.webhook_url && (
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <p className="font-medium" style={{ color: 'var(--text)' }}>
                Setup instructions
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open Gorgias HTTP integration / webhooks</li>
                <li>POST to the webhook URL below</li>
                <li>
                  Header <code>{GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME}</code> with your saved secret
                </li>
              </ol>
              <pre
                className="overflow-x-auto rounded-md p-3 text-xs"
                style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
              >
                {connection.webhook_url}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canManage && isActive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void rotateSecret()}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <RefreshCw className="h-4 w-4" />
                Rotate secret
              </button>
            )}
            {canManage && connection && (
              <button
                type="button"
                disabled={busy || connection.status === 'disabled'}
                onClick={() => void disableConnection()}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Unplug className="h-4 w-4" />
                Disable connection
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyText('webhookUrlConnected', connection.webhook_url)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {copiedField === 'webhookUrlConnected' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy webhook URL
            </button>
            <button
              type="button"
              onClick={() => setShowSetupInstructions((value) => !value)}
              className="inline-flex rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {showSetupInstructions ? 'Hide setup instructions' : 'View setup instructions'}
            </button>
          </div>

          {canManage && isDisabledOrError && (
            <form onSubmit={(event) => void createConnection(event)} className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Reconnect Gorgias
              </p>
              <input
                required
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                placeholder="Account ID or domain"
                value={accountOrDomain}
                onChange={(e) => setAccountOrDomain(e.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex rounded-md px-3 py-2 text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
              >
                Update connection
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
