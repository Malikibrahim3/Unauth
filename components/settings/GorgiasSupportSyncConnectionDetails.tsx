'use client';

import { Check, CheckCircle2, Circle, Copy, RefreshCw, Unplug, AlertTriangle } from 'lucide-react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { Badge, Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GorgiasSupportSyncCreateForm } from '@/components/settings/GorgiasSupportSyncCreateForm';
import type { GorgiasSupportSyncState } from '@/components/settings/gorgiasSupportSyncReducer';
import { formatGorgiasWhen, gorgiasAccountLabel } from '@/components/settings/gorgiasSupportSyncUtils';
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from '@/lib/support/gorgias/supportConnectionShared';
import type { GorgiasSupportConnectionSettings } from '@/lib/support/gorgias/supportConnectionShared';

type Props = {
  connection: GorgiasSupportConnectionSettings;
  canManage: boolean;
  state: GorgiasSupportSyncState;
  onPatch: (patch: Partial<GorgiasSupportSyncState>) => void;
  onCopy: (field: string, value: string) => void;
  onRotateSecret: () => void;
  onDisableConnection: () => void;
  onReconnect: (event: FormEvent) => void;
};

type ChecklistItem = {
  label: string;
  status: string;
  ok: boolean;
};

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="shrink-0">
        {item.ok ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
        ) : (
          <Circle className="h-4 w-4" style={{ color: 'var(--border)' }} />
        )}
      </div>
      <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
        {item.label}
      </span>
      <Badge tone={item.ok ? 'success' : 'warning'} size="sm" dot>{item.status}</Badge>
    </div>
  );
}

export function GorgiasSupportSyncConnectionDetails({
  connection,
  canManage,
  state,
  onPatch,
  onCopy,
  onRotateSecret,
  onDisableConnection,
  onReconnect,
}: Props) {
  const isActive = connection.status === 'active';
  const isDisabledOrError = connection.status === 'disabled' || connection.status === 'error';

  const checklist: ChecklistItem[] = [
    {
      label: 'Webhook secret',
      status: connection.webhook_secret_configured ? 'Configured' : 'Not configured',
      ok: Boolean(connection.webhook_secret_configured),
    },
    {
      label: 'Sidebar widget',
      status: connection.sidebar_widget_registered ? 'Registered in Gorgias' : 'Not registered',
      ok: Boolean(connection.sidebar_widget_registered),
    },
    {
      label: 'Ticket webhook',
      status: connection.support_webhook_registered ? 'Registered in Gorgias' : 'Manual setup required',
      ok: Boolean(connection.support_webhook_registered),
    },
    {
      label: 'API credentials',
      status: connection.gorgias_api_configured ? 'Stored securely' : 'Not configured',
      ok: Boolean(connection.gorgias_api_configured),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <Image
          src="/integrations/gorgias.png"
          alt="Gorgias"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {gorgiasAccountLabel(connection)}
            </p>
            <StatusBadge family="workflowStatus" value={isActive ? 'connected' : connection.status} />
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Last synced {formatGorgiasWhen(connection.last_sync_at)}
          </p>
        </div>
      </div>

      {/* Error notice */}
      {connection.last_error && isActive ? (
        <div
          className="flex gap-2 rounded-lg border px-3 py-2.5 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 30%, var(--border))',
            background: 'color-mix(in srgb, var(--warning) 6%, var(--surface))',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <p style={{ color: 'var(--text)' }}>{connection.last_error}</p>
        </div>
      ) : null}

      {/* Setup checklist */}
      <Card unstyled variant="flat" className="divide-y overflow-hidden p-0">
        <div className="px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Setup checklist
          </p>
        </div>
        {checklist.map((item) => (
          <div key={item.label} className="px-4" style={{ borderColor: 'var(--border)' }}>
            <ChecklistRow item={item} />
          </div>
        ))}
      </Card>

      {/* Webhook URL panel when setup instructions shown */}
      {state.showSetupInstructions && connection.webhook_url ? (
        <Card unstyled variant="flat" className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Webhook setup
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <li>Open Gorgias, then Settings, then Apps &amp; Plugins, then HTTP Integration, then Add HTTP Integration</li>
            <li>Set method to POST and paste the URL below</li>
            <li>Add header <code className="font-mono">{GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME}</code> with your webhook secret</li>
          </ol>
          <div
            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-mono text-xs"
            style={{ background: 'color-mix(in srgb, var(--text) 5%, transparent)', color: 'var(--text)' }}
          >
            <span className="truncate">{connection.webhook_url}</span>
            <button
              type="button"
              aria-label={
                state.copiedField === 'webhookUrlConnected'
                  ? 'Webhook URL copied'
                  : 'Copy webhook URL'
              }
              onClick={() => onCopy('webhookUrlConnected', connection.webhook_url)}
              className="shrink-0 ml-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {state.copiedField === 'webhookUrlConnected' ? (
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </Card>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCopy('webhookUrlConnected', connection.webhook_url)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {state.copiedField === 'webhookUrlConnected' ? (
            <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy webhook URL
        </button>
        <button
          type="button"
          onClick={() => onPatch({ showSetupInstructions: !state.showSetupInstructions })}
          className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {state.showSetupInstructions ? 'Hide instructions' : 'Setup instructions'}
        </button>
      </div>

      {/* Danger zone */}
      {canManage ? (
        <div
          className="flex flex-wrap gap-2 border-t pt-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {isActive ? (
            <button
              type="button"
              disabled={state.busy}
              onClick={onRotateSecret}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rotate secret
            </button>
          ) : null}
          <button
            type="button"
            disabled={state.busy || connection.status === 'disabled'}
            onClick={onDisableConnection}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{
              borderColor: 'color-mix(in srgb, var(--risk-critical) 30%, var(--border))',
              color: 'var(--risk-critical-fg)',
            }}
          >
            <Unplug className="h-3.5 w-3.5" />
            Disable connection
          </button>
        </div>
      ) : null}

      {/* Reconnect form when disabled */}
      {canManage && isDisabledOrError ? (
        <Card unstyled variant="flat" className="space-y-4 p-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Reconnect Gorgias
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Update your credentials to re-enable the connection.
            </p>
          </div>
          <GorgiasSupportSyncCreateForm
            canManage={canManage}
            state={state}
            onPatch={onPatch}
            onSubmit={onReconnect}
            submitLabel="Reconnect"
            variant="reconnect"
          />
        </Card>
      ) : null}
    </div>
  );
}
