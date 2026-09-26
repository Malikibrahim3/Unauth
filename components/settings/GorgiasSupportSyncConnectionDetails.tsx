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
          <CheckCircle2 className="h-4 w-4" style={{ color: '#1a6b43' }} />
        ) : (
          <Circle className="h-4 w-4" style={{ color: '#e4e3e0' }} />
        )}
      </div>
      <span className="text-[12px] leading-[1.45] text-[#40454a] flex-1" style={{ color: '#1c1f23' }}>
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
    <div className="space-y-3">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <Image
          src="/providers/gorgias.png"
          alt="Gorgias"
          width={40}
          height={40}
          className="h-9 w-9 shrink-0 rounded-[8px] border border-[#eae8e5] object-contain p-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
              {gorgiasAccountLabel(connection)}
            </p>
            <StatusBadge family="workflowStatus" value={isActive ? 'connected' : connection.status} />
          </div>
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
            Last synced {formatGorgiasWhen(connection.last_sync_at)}
          </p>
        </div>
      </div>

      {/* Error notice */}
      {connection.last_error && isActive ? (
        <div
          className="text-[13px] leading-5 text-[#40454a] flex gap-2 rounded-lg border px-3 py-2.5"
          style={{
            borderColor: 'color-mix(in srgb, #7a5310 30%, #e4e3e0)',
            background: 'color-mix(in srgb, #7a5310 6%, #fff)',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#7a5310' }} />
          <p style={{ color: '#1c1f23' }}>{connection.last_error}</p>
        </div>
      ) : null}

      {/* Setup checklist */}
      <Card unstyled variant="panel" className="divide-y overflow-hidden p-0">
        <div className="px-4 py-2.5">
          <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
            Setup checklist
          </p>
        </div>
        {checklist.map((item) => (
          <div key={item.label} className="px-4" style={{ borderColor: '#e4e3e0' }}>
            <ChecklistRow item={item} />
          </div>
        ))}
      </Card>

      {/* Webhook URL panel when setup instructions shown */}
      {state.showSetupInstructions && connection.webhook_url ? (
        <Card unstyled variant="panel" className="space-y-3 p-4">
          <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
            Webhook setup
          </p>
          <ol className="text-[11.5px] leading-[1.45] text-[#64686d] list-decimal space-y-1 pl-4" style={{ color: '#64686d' }}>
            <li>Open Gorgias, then Settings, then Apps &amp; Plugins, then HTTP Integration, then Add HTTP Integration</li>
            <li>Set method to POST and paste the URL below</li>
            <li>Add header <code className="font-mono">{GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME}</code> with your webhook secret</li>
          </ol>
          <div
            className="text-[12px] leading-[1.45] text-[#40454a] flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-mono"
            style={{ background: 'color-mix(in srgb, #1c1f23 5%, transparent)', color: '#1c1f23' }}
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
              style={{ color: '#64686d' }}
            >
              {state.copiedField === 'webhookUrlConnected' ? (
                <Check className="h-3.5 w-3.5" style={{ color: '#1a6b43' }} />
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
          className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex items-center gap-1.5 rounded-lg border px-3 py-2"
          style={{ borderColor: '#e4e3e0', color: '#1c1f23' }}
        >
          {state.copiedField === 'webhookUrlConnected' ? (
            <Check className="h-3.5 w-3.5" style={{ color: '#1a6b43' }} />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy webhook URL
        </button>
        <button
          type="button"
          onClick={() => onPatch({ showSetupInstructions: !state.showSetupInstructions })}
          className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex rounded-lg border px-3 py-2"
          style={{ borderColor: '#e4e3e0', color: '#1c1f23' }}
        >
          {state.showSetupInstructions ? 'Hide instructions' : 'Setup instructions'}
        </button>
      </div>

      {/* Danger zone */}
      {canManage ? (
        <div
          className="flex flex-wrap gap-2 border-t pt-4"
          style={{ borderColor: '#e4e3e0' }}
        >
          {isActive ? (
            <button
              type="button"
              disabled={state.busy}
              onClick={onRotateSecret}
              className="text-[11px] font-medium leading-4 text-[#64686d] inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 disabled:opacity-50"
              style={{ borderColor: '#e4e3e0', color: '#64686d' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rotate secret
            </button>
          ) : null}
          <button
            type="button"
            disabled={state.busy || connection.status === 'disabled'}
            onClick={onDisableConnection}
            className="text-[11px] font-medium leading-4 text-[#64686d] inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 disabled:opacity-50"
            style={{
              borderColor: 'color-mix(in srgb, #b0431a 30%, #e4e3e0)',
              color: '#b0431a',
            }}
          >
            <Unplug className="h-3.5 w-3.5" />
            Disable connection
          </button>
        </div>
      ) : null}

      {/* Reconnect form when disabled */}
      {canManage && isDisabledOrError ? (
        <Card unstyled variant="panel" className="space-y-4 p-4">
          <div>
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
              Reconnect Gorgias
            </p>
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
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
