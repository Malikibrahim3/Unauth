'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFetchJson } from '@/lib/react/useFetchJson';
import type { BigCommerceConnectionSettings } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

type Props = {
  canManage: boolean;
};

export default function BigCommerceConnectClient({ canManage }: Props) {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    data: connectionPayload,
    loading,
    error: loadError,
    reload: reloadConnection,
  } = useFetchJson<{ connection?: BigCommerceConnectionSettings | null }>(
    '/api/settings/bigcommerce/connection',
    {
      parse: async (response) => {
        const body: { connection?: BigCommerceConnectionSettings | null; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? 'Failed to load BigCommerce connection');
        }
        return { connection: body.connection ?? null };
      },
    },
  );

  const connection = connectionPayload?.connection ?? null;
  const isActive = connection?.status === 'active' && connection.credentials_configured;

  useEffect(() => {
    if (loadError) {
      setMessage({ type: 'error', text: loadError });
    }
  }, [loadError]);

  useEffect(() => {
    if (searchParams.get('bigcommerce_connected') === '1') {
      setMessage({ type: 'success', text: 'BigCommerce connected successfully.' });
      reloadConnection();
    }
    const err = searchParams.get('bigcommerce_error');
    if (err) {
      setMessage({ type: 'error', text: `Connection failed (${err}).` });
    }
    const warning = searchParams.get('bigcommerce_warning');
    if (warning === 'webhook_registration_failed') {
      setMessage({
        type: 'success',
        text: 'BigCommerce connected, but some webhooks could not be registered automatically.',
      });
    }
  }, [searchParams, reloadConnection]);

  async function disconnect() {
    if (!canManage || !isActive) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/bigcommerce/disconnect', { method: 'POST' });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to disconnect');
      setMessage({ type: 'success', text: 'BigCommerce disconnected.' });
      reloadConnection();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !connection) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <p
          className="text-sm rounded-md border px-3 py-2"
          style={{
            color: message.type === 'error' ? 'var(--sev-high)' : 'var(--success)',
            borderColor: 'var(--border)',
            background: 'var(--surface)',
          }}
        >
          {message.text}
        </p>
      )}

      {isActive && connection && (
        <div
          className="rounded-md border p-5 space-y-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connected</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Store hash: {connection.store_key}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Webhook URL: {connection.webhook_url}
          </p>
          {connection.last_error && (
            <p className="text-xs" style={{ color: 'var(--sev-high)' }}>
              Last error: {connection.last_error}
            </p>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={busy}
              className="text-xs font-medium underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      {canManage && !isActive && (
        <a
          href="/api/bigcommerce/install"
          className="inline-flex rounded-md px-4 py-2 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Connect with BigCommerce
        </a>
      )}

      {canManage && isActive && (
        <a
          href="/api/bigcommerce/install"
          className="inline-flex text-xs font-medium underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Re-authorize connection
        </a>
      )}
    </div>
  );
}
