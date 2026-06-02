'use client';

import { useEffect, useReducer, useRef, type FormEvent } from 'react';
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
    <section
      className="rounded-lg border p-5 space-y-5"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Freshdesk support ticket sync
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect Freshdesk so Unauth can ingest tickets, detect claims from tags and content, and link
          them to Shopify orders when available.
        </p>
      </div>

      {state.message ? (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background:
              state.message.type === 'error'
                ? 'rgba(180, 50, 50, 0.08)'
                : state.message.type === 'warning'
                  ? 'rgba(180, 130, 40, 0.12)'
                  : 'rgba(47, 107, 67, 0.10)',
            color: 'var(--text)',
          }}
        >
          {state.message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading connection…
        </p>
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
          onReconnect={(event) => void saveConnection(event)}
        />
      )}
    </section>
  );
}
