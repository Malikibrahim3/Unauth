'use client';

import { useCallback, useEffect, useReducer, useRef, type FormEvent } from 'react';
import { Card } from '@/components/ui';
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
    <div className="space-y-5">
      {state.message ? (
        <Card unstyled
          variant="inset"
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
        </Card>
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
          <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        </div>
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
    </div>
  );
}
