'use client';

import { RefreshCw, Unplug } from 'lucide-react';
import type { FormEvent } from 'react';
import { FreshdeskSupportSyncCreateForm } from '@/components/settings/FreshdeskSupportSyncCreateForm';
import type { FreshdeskSupportSyncState } from '@/components/settings/freshdeskSupportSyncReducer';
import {
  formatFreshdeskWhen,
  freshdeskAccountLabel,
} from '@/components/settings/freshdeskSupportSyncUtils';
import { FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/freshdesk/supportConnectionShared';
import type { FreshdeskSupportConnectionSettings } from '@/lib/support/freshdesk/supportConnectionShared';

type Props = {
  connection: FreshdeskSupportConnectionSettings;
  canManage: boolean;
  state: FreshdeskSupportSyncState;
  onPatch: (patch: Partial<FreshdeskSupportSyncState>) => void;
  onRotateSecret: () => void;
  onDisableConnection: () => void;
  onReconnect: (event: FormEvent) => void;
};

export function FreshdeskSupportSyncConnectionDetails({
  connection,
  canManage,
  state,
  onPatch,
  onRotateSecret,
  onDisableConnection,
  onReconnect,
}: Props) {
  const isActive = connection.status === 'active';
  const isDisabledOrError = connection.status === 'disabled' || connection.status === 'error';

  return (
    <div className="space-y-4">
      {isDisabledOrError ? (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{ background: 'rgba(180, 50, 50, 0.08)', color: 'var(--text)' }}
        >
          <p className="font-medium">Connection {connection.status}</p>
          {connection.last_error ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {connection.last_error}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--text-muted)' }}>Account</dt>
          <dd style={{ color: 'var(--text)' }}>{freshdeskAccountLabel(connection)}</dd>
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
          <dd style={{ color: 'var(--text)' }}>{formatFreshdeskWhen(connection.last_sync_at)}</dd>
        </div>
      </dl>

      {isActive ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Webhook endpoint: <code>{connection.webhook_url}</code> (use the URL with your domain and
          secret from connect or rotate). Header: <code>{FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME}</code>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canManage || state.busy}
          onClick={onRotateSecret}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-60"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text)' }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rotate webhook secret
        </button>
        <button
          type="button"
          disabled={!canManage || state.busy}
          onClick={onDisableConnection}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-60"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--danger, #e8362a)' }}
        >
          <Unplug className="h-3.5 w-3.5" />
          Disconnect
        </button>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium" style={{ color: 'var(--text)' }}>
          Update API key or domain
        </summary>
        <div className="mt-3">
          <FreshdeskSupportSyncCreateForm
            canManage={canManage}
            state={state}
            onPatch={onPatch}
            onSubmit={onReconnect}
            submitLabel="Save credentials"
            variant="reconnect"
          />
        </div>
      </details>
    </div>
  );
}
