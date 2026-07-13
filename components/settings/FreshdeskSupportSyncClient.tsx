'use client';

import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { PanelCard } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { FreshdeskSupportSyncConnectionDetails } from '@/components/settings/FreshdeskSupportSyncConnectionDetails';
import { FreshdeskSupportSyncCreateForm } from '@/components/settings/FreshdeskSupportSyncCreateForm';
import { FreshdeskWebhookSetupPanel } from '@/components/settings/FreshdeskWebhookSetupPanel';
import {
  createInitialFreshdeskSupportSyncState,
  freshdeskSupportSyncReducer,
} from '@/components/settings/freshdeskSupportSyncReducer';
import {
  buildFreshdeskCreatePayload,
  parseFreshdeskCreateConnectionResponse,
  resolveFreshdeskConnectMessage,
} from '@/components/settings/freshdeskSupportSyncUtils';
import {
  FRESHDESK_CONNECT_CREDENTIALS_ERROR,
  FRESHDESK_CONNECT_CREDENTIALS_ERROR_CODE,
  FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
  FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
  type FreshdeskSupportConnectionSettings,
} from '@/lib/support/freshdesk/supportConnectionShared';

type Props = {
  canManage: boolean;
};

export default function FreshdeskSupportSyncClient({ canManage }: Props) {
  const {
    data: connectionPayload,
    loading,
    error: loadError,
    reload: reloadConnection,
  } = useFetchJson<{ connection?: FreshdeskSupportConnectionSettings | null }>(
    '/api/settings/freshdesk/support-connection',
    {
      parse: async (response) => {
        const body: { connection?: FreshdeskSupportConnectionSettings | null; error?: string } =
          await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Failed to load Freshdesk support connection');
        return { connection: body.connection ?? null };
      },
    }
  );
  const connection = connectionPayload?.connection ?? null;

  const [state, dispatch] = useReducer(
    freshdeskSupportSyncReducer,
    loadError,
    createInitialFreshdeskSupportSyncState
  );
  const [syncing, setSyncing] = useState(false);
  const patch = useCallback((patchState: Partial<typeof state>) => dispatch({ type: 'patch', patch: patchState }), []);

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
  }, [loadError, patch]);

  async function copyText(field: string, value: string) {
    await navigator.clipboard.writeText(value);
    patch({ copiedField: field });
    setTimeout(() => patch({ copiedField: null }), 2000);
  }

  async function saveConnection(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/freshdesk/support-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildFreshdeskCreatePayload(state.domain, state.displayName, state.freshdeskApiKey)
        ),
      });
      const body = parseFreshdeskCreateConnectionResponse(await res.json());

      if (!res.ok) {
        patch({
          message: {
            type: 'error',
            text:
              body.code === FRESHDESK_CONNECT_CREDENTIALS_ERROR_CODE
                ? FRESHDESK_CONNECT_CREDENTIALS_ERROR
                : body.error ?? 'Failed to save connection',
          },
        });
        return;
      }

      const resolved = resolveFreshdeskConnectMessage(body);
      patch({
        message: resolved.message,
        ephemeralSecret: resolved.ephemeral ?? null,
        domain: '',
        displayName: '',
        freshdeskApiKey: '',
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

  async function rotateSecret() {
    if (!canManage) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/freshdesk/support-connection/rotate-secret', {
        method: 'POST',
      });
      const body = parseFreshdeskCreateConnectionResponse(await res.json());
      if (!res.ok) throw new Error(body.error ?? 'Failed to rotate secret');
      if (!body.webhook_secret_plaintext || !body.webhook_url) {
        throw new Error('Failed to rotate secret');
      }
      patch({
        ephemeralSecret: {
          secret: body.webhook_secret_plaintext,
          webhookUrl: body.webhook_url,
          headerName: body.header_name ?? FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
          warning: body.warning ?? FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
        },
      });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to rotate secret',
        },
      });
    } finally {
      patch({ busy: false });
    }
  }

  async function syncNow() {
    if (!canManage || syncing) return;
    setSyncing(true);
    patch({ message: null });
    try {
      const res = await fetch('/api/settings/freshdesk/support-connection/sync', {
        method: 'POST',
      });
      const body = (await res.json()) as {
        tickets_listed?: number;
        ingested?: number;
        errors?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? 'Failed to sync Freshdesk tickets');
      patch({
        message: {
          type: body.errors ? 'warning' : 'success',
          text: `Freshdesk sync finished: ${body.ingested ?? 0} ticket(s) ingested from ${body.tickets_listed ?? 0} listed.`,
        },
      });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to sync Freshdesk tickets',
        },
      });
    } finally {
      setSyncing(false);
    }
  }

  async function disableConnection() {
    if (!canManage) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/freshdesk/support-connection/disable', {
        method: 'POST',
      });
      const body: { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to disable connection');
      patch({
        ephemeralSecret: null,
        message: { type: 'success', text: 'Freshdesk support sync disabled.' },
      });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to disable connection',
        },
      });
    } finally {
      patch({ busy: false });
    }
  }

  return (
    <div className="space-y-5">
      {state.message ? (
        <PanelCard
          variant="appInset"
          className="px-4 py-3 text-sm"
          style={{
            borderColor:
              state.message.type === 'error'
                ? 'color-mix(in srgb, var(--risk-critical) 30%, var(--border))'
                : state.message.type === 'warning'
                ? 'color-mix(in srgb, var(--warning) 30%, var(--border))'
                : 'color-mix(in srgb, var(--success) 30%, var(--border))',
            background:
              state.message.type === 'error'
                ? 'color-mix(in srgb, var(--risk-critical) 6%, var(--surface))'
                : state.message.type === 'warning'
                ? 'color-mix(in srgb, var(--warning) 6%, var(--surface))'
                : 'color-mix(in srgb, var(--success) 6%, var(--surface))',
            color: 'var(--text)',
          }}
        >
          {state.message.text}
        </PanelCard>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            </div>
          </div>
          <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        </div>
      ) : state.ephemeralSecret ? (
        <FreshdeskWebhookSetupPanel
          secret={state.ephemeralSecret}
          canManage={canManage}
          copiedField={state.copiedField}
          onCopy={copyText}
          onDismiss={() => patch({ ephemeralSecret: null })}
        />
      ) : !connection || (connection.status === 'disabled' && !connection.freshdesk_api_configured) ? (
        <FreshdeskSupportSyncCreateForm
          canManage={canManage}
          state={state}
          onPatch={patch}
          onSubmit={(event) => void saveConnection(event)}
          submitLabel="Connect Freshdesk"
          variant="create"
        />
      ) : (
        <FreshdeskSupportSyncConnectionDetails
          connection={connection}
          canManage={canManage}
          state={state}
          onPatch={patch}
          onRotateSecret={() => void rotateSecret()}
          onDisableConnection={() => void disableConnection()}
          syncing={syncing}
          onSyncNow={() => void syncNow()}
          onReconnect={(event) => void saveConnection(event)}
        />
      )}
    </div>
  );
}
