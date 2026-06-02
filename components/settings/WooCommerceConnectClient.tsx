'use client';

import { useEffect, useReducer, useRef, type FormEvent } from 'react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR,
  WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE,
  type WooCommerceConnectionSettings,
} from '@/lib/commerce/woocommerce/woocommerceConnectionShared';
import {
  createInitialWooCommerceSupportSyncState,
  woocommerceSupportSyncReducer,
} from '@/components/settings/woocommerceSupportSyncReducer';
import {
  buildWooCommerceConnectPayload,
  parseWooCommerceConnectResponse,
  resolveWooCommerceConnectMessage,
} from '@/components/settings/woocommerceSupportSyncUtils';

type Props = {
  canManage: boolean;
};

export default function WooCommerceConnectClient({ canManage }: Props) {
  const {
    data: connectionPayload,
    loading,
    error: loadError,
    reload: reloadConnection,
  } = useFetchJson<{ connection?: WooCommerceConnectionSettings | null }>(
    '/api/settings/woocommerce/connection',
    {
      parse: async (response) => {
        const body: { connection?: WooCommerceConnectionSettings | null; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? 'Failed to load WooCommerce connection');
        }
        return { connection: body.connection ?? null };
      },
    },
  );

  const connection = connectionPayload?.connection ?? null;
  const isActive = connection?.status === 'active' && connection.credentials_configured;

  const [state, dispatch] = useReducer(
    woocommerceSupportSyncReducer,
    loadError,
    createInitialWooCommerceSupportSyncState,
  );
  const patch = (patchState: Partial<typeof state>) => dispatch({ type: 'patch', patch: patchState });

  const seededConnectionIdRef = useRef<string | null>(null);
  const connectionId = connection?.id ?? null;
  useEffect(() => {
    if (connectionId === seededConnectionIdRef.current) return;
    seededConnectionIdRef.current = connectionId;
    dispatch({ type: 'seedFromConnection', connection });
  }, [connection, connectionId]);

  useEffect(() => {
    if (loadError) {
      patch({ message: { type: 'error', text: loadError } });
    }
  }, [loadError]);

  async function saveConnection(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/woocommerce/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildWooCommerceConnectPayload(state.storeUrl, state.consumerKey, state.consumerSecret),
        ),
      });
      const body = parseWooCommerceConnectResponse(await res.json());

      if (!res.ok) {
        patch({
          message: {
            type: 'error',
            text:
              body.code === WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR_CODE
                ? WOOCOMMERCE_CONNECT_CREDENTIALS_ERROR
                : body.error ?? 'Failed to save connection',
          },
        });
        return;
      }

      const resolved = resolveWooCommerceConnectMessage(body);
      patch({
        message: resolved.message,
        consumerKey: '',
        consumerSecret: '',
      });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to save connection',
        },
      });
    } finally {
      patch({ busy: false });
    }
  }

  async function disconnect() {
    if (!canManage || !isActive) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/woocommerce/disconnect', { method: 'POST' });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to disconnect');
      patch({ message: { type: 'success', text: 'WooCommerce disconnected.' } });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to disconnect',
        },
      });
    } finally {
      patch({ busy: false });
    }
  }

  if (loading && !connection) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {state.message && (
        <p
          className="text-sm rounded-lg border px-3 py-2"
          style={{
            color: state.message.type === 'error' ? 'var(--sev-high)' : 'var(--sev-clear, #2f6b43)',
            borderColor: 'var(--surface-border)',
            background: 'var(--bg-surface)',
          }}
        >
          {state.message.text}
        </p>
      )}

      {isActive && connection && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connected</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Store: {connection.store_url}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
              disabled={state.busy}
              className="text-xs font-medium underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      {canManage && (
        <form onSubmit={saveConnection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Store URL
            </label>
            <input
              type="url"
              required
              value={state.storeUrl}
              onChange={(e) => patch({ storeUrl: e.target.value })}
              placeholder="https://your-store.com"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--bg-surface)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Consumer key
            </label>
            <input
              type="password"
              required={!isActive}
              value={state.consumerKey}
              onChange={(e) => patch({ consumerKey: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--bg-surface)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Consumer secret
            </label>
            <input
              type="password"
              required={!isActive}
              value={state.consumerSecret}
              onChange={(e) => patch({ consumerSecret: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--bg-surface)' }}
            />
          </div>
          <button
            type="submit"
            disabled={state.busy}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            {isActive ? 'Update credentials' : 'Connect WooCommerce'}
          </button>
        </form>
      )}
    </div>
  );
}
