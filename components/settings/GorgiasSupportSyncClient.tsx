'use client';

import { useEffect, useReducer, useRef, type FormEvent } from 'react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { GorgiasSupportSyncCreateForm } from '@/components/settings/GorgiasSupportSyncCreateForm';
import { GorgiasSupportSyncConnectionDetails } from '@/components/settings/GorgiasSupportSyncConnectionDetails';
import { GorgiasWebhookSetupPanel } from '@/components/settings/GorgiasWebhookSetupPanel';
import {
  createInitialGorgiasSupportSyncState,
  gorgiasSupportSyncReducer,
} from '@/components/settings/gorgiasSupportSyncReducer';
import {
  buildGorgiasCreatePayload,
  parseGorgiasCreateConnectionResponse,
  resolveGorgiasConnectMessage,
} from '@/components/settings/gorgiasSupportSyncUtils';
import {
  GORGIAS_CONNECT_CREDENTIALS_ERROR,
  GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  type GorgiasSupportConnectionSettings,
} from '@/lib/support/gorgias/supportConnectionShared';

type Props = {
  canManage: boolean;
};

export default function GorgiasSupportSyncClient({ canManage }: Props) {
  const {
    data: connectionPayload,
    loading,
    error: loadError,
    reload: reloadConnection,
  } = useFetchJson<{ connection?: GorgiasSupportConnectionSettings | null }>(
    '/api/settings/gorgias/support-connection',
    {
      parse: async (response) => {
        const body: { connection?: GorgiasSupportConnectionSettings | null; error?: string } =
          await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Failed to load Gorgias support connection');
        return { connection: body.connection ?? null };
      },
    },
  );
  const connection = connectionPayload?.connection ?? null;

  const [state, dispatch] = useReducer(
    gorgiasSupportSyncReducer,
    loadError,
    createInitialGorgiasSupportSyncState,
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

  async function createConnection(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    patch({ busy: true, message: null });
    try {
      const res = await fetch('/api/settings/gorgias/support-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildGorgiasCreatePayload(
            state.accountOrDomain,
            state.displayName,
            state.gorgiasApiEmail,
            state.gorgiasApiKey,
          ),
        ),
      });
      const body = parseGorgiasCreateConnectionResponse(await res.json());

      if (!res.ok) {
        patch({
          message: {
            type: 'error',
            text:
              body.code === GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE
                ? GORGIAS_CONNECT_CREDENTIALS_ERROR
                : body.error ?? 'Failed to create connection',
          },
        });
        return;
      }

      const resolved = resolveGorgiasConnectMessage(body, body.sidebar_widget);
      patch({
        message: resolved.message,
        showSetupInstructions: resolved.showSetup,
        ephemeralSecret: resolved.ephemeral ?? null,
        accountOrDomain: '',
        displayName: '',
        gorgiasApiEmail: '',
        gorgiasApiKey: '',
      });
      reloadConnection();
    } catch (err) {
      patch({
        message: {
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to create connection',
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
      const res = await fetch('/api/settings/gorgias/support-connection/rotate-secret', {
        method: 'POST',
      });
      const body = parseGorgiasCreateConnectionResponse(await res.json());
      if (!res.ok) throw new Error(body.error ?? 'Failed to rotate secret');

      if (!body.webhook_secret_plaintext || !body.webhook_url) {
        throw new Error('Failed to rotate secret');
      }

      patch({
        ephemeralSecret: {
          secret: body.webhook_secret_plaintext,
          webhookUrl: body.webhook_url,
          headerName: body.header_name ?? GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
          warning: body.warning ?? GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
        },
        showSetupInstructions: true,
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
      const res = await fetch('/api/settings/gorgias/support-connection/disable', {
        method: 'POST',
      });
      const body: { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to disable connection');
      patch({ ephemeralSecret: null, message: { type: 'success', text: 'Gorgias support sync disabled.' } });
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
      className="rounded-md border p-5 space-y-5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Gorgias support ticket sync
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Connect Gorgias support tickets so Unauth can link refund/missing parcel conversations to Shopify orders,
          customer profiles, and claim review.
        </p>
      </div>

      {state.message ? (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background:
              state.message.type === 'error'
                ? 'color-mix(in srgb, var(--success) 8%, transparent)'
                : state.message.type === 'warning'
                  ? 'color-mix(in srgb, var(--warning) 12%, transparent)'
                  : 'var(--success-bg)',
            color: 'var(--text)',
          }}
        >
          {state.message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading connection…
        </p>
      ) : state.ephemeralSecret ? (
        <GorgiasWebhookSetupPanel
          secret={state.ephemeralSecret}
          canManage={canManage}
          copiedField={state.copiedField}
          onCopy={copyText}
          onDismiss={() => patch({ ephemeralSecret: null })}
        />
      ) : !connection ? (
        <GorgiasSupportSyncCreateForm
          canManage={canManage}
          state={state}
          onPatch={patch}
          onSubmit={(event) => void createConnection(event)}
          submitLabel="Create webhook connection"
          variant="create"
        />
      ) : (
        <GorgiasSupportSyncConnectionDetails
          connection={connection}
          canManage={canManage}
          state={state}
          onPatch={patch}
          onCopy={copyText}
          onRotateSecret={() => void rotateSecret()}
          onDisableConnection={() => void disableConnection()}
          onReconnect={(event) => void createConnection(event)}
        />
      )}
    </section>
  );
}
