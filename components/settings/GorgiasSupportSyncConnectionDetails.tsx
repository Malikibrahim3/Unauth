'use client';

import { Check, Copy, RefreshCw, Unplug } from 'lucide-react';
import type { FormEvent } from 'react';
import { GorgiasSupportSyncCreateForm } from '@/components/settings/GorgiasSupportSyncCreateForm';
import type { GorgiasSupportSyncState } from '@/components/settings/gorgiasSupportSyncReducer';
import { formatGorgiasWhen, gorgiasAccountLabel } from '@/components/settings/gorgiasSupportSyncUtils';
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/gorgias/supportConnectionShared';
import type { GorgiasSupportConnectionSettings } from '@/lib/support/gorgias/supportConnectionShared';

type GorgiasSupportSyncConnectionDetailsProps = {
  connection: GorgiasSupportConnectionSettings;
  canManage: boolean;
  state: GorgiasSupportSyncState;
  onPatch: (patch: Partial<GorgiasSupportSyncState>) => void;
  onCopy: (field: string, value: string) => void;
  onRotateSecret: () => void;
  onDisableConnection: () => void;
  onReconnect: (event: FormEvent) => void;
};

export function GorgiasSupportSyncConnectionDetails({
  connection,
  canManage,
  state,
  onPatch,
  onCopy,
  onRotateSecret,
  onDisableConnection,
  onReconnect,
}: GorgiasSupportSyncConnectionDetailsProps) {
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
          <dd style={{ color: 'var(--text)' }}>{gorgiasAccountLabel(connection)}</dd>
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
          <dt style={{ color: 'var(--text-muted)' }}>Sidebar widget</dt>
          <dd style={{ color: 'var(--text)' }}>
            {connection.sidebar_widget_registered ? 'Registered in Gorgias' : 'Not registered'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--text-muted)' }}>Ticket webhook</dt>
          <dd style={{ color: 'var(--text)' }}>
            {connection.support_webhook_registered ? 'Registered in Gorgias' : 'Manual setup required'}
          </dd>
        </div>
        {connection.sidebar_integration_id != null ? (
          <div className="flex justify-between gap-4">
            <dt style={{ color: 'var(--text-muted)' }}>Gorgias integration</dt>
            <dd style={{ color: 'var(--text)' }}>{connection.sidebar_integration_id}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--text-muted)' }}>Gorgias API credentials</dt>
          <dd style={{ color: 'var(--text)' }}>
            {connection.gorgias_api_configured ? 'Stored securely' : 'Not configured'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt style={{ color: 'var(--text-muted)' }}>Last sync</dt>
          <dd style={{ color: 'var(--text)' }}>{formatGorgiasWhen(connection.last_sync_at)}</dd>
        </div>
        {connection.last_error && isActive ? (
          <div className="flex justify-between gap-4">
            <dt style={{ color: 'var(--text-muted)' }}>Last error</dt>
            <dd className="text-right" style={{ color: 'var(--text)' }}>
              {connection.last_error}
            </dd>
          </div>
        ) : null}
      </dl>

      {state.showSetupInstructions && connection.webhook_url ? (
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
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canManage && isActive ? (
          <button
            type="button"
            disabled={state.busy}
            onClick={onRotateSecret}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <RefreshCw className="h-4 w-4" />
            Rotate secret
          </button>
        ) : null}
        {canManage ? (
          <button
            type="button"
            disabled={state.busy || connection.status === 'disabled'}
            onClick={onDisableConnection}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Unplug className="h-4 w-4" />
            Disable connection
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onCopy('webhookUrlConnected', connection.webhook_url)}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {state.copiedField === 'webhookUrlConnected' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy webhook URL
        </button>
        <button
          type="button"
          onClick={() => onPatch({ showSetupInstructions: !state.showSetupInstructions })}
          className="inline-flex rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {state.showSetupInstructions ? 'Hide setup instructions' : 'View setup instructions'}
        </button>
      </div>

      {canManage && isDisabledOrError ? (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--surface-border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Reconnect Gorgias
          </p>
          <GorgiasSupportSyncCreateForm
            canManage={canManage}
            state={state}
            onPatch={onPatch}
            onSubmit={onReconnect}
            submitLabel="Update connection"
            variant="reconnect"
          />
        </div>
      ) : null}
    </div>
  );
}
