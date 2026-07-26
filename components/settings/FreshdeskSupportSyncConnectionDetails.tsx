'use client';

import { CheckCircle2, Circle, RefreshCw, Unplug } from 'lucide-react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { Badge, Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
  syncing: boolean;
  onSyncNow: () => void;
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
          <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--ua-success)' }} />
        ) : (
          <Circle className="h-4 w-4" style={{ color: 'var(--ua-border-default)' }} />
        )}
      </div>
      <span className="flex-1 text-sm" style={{ color: 'var(--ua-text-primary)' }}>
        {item.label}
      </span>
      <Badge tone={item.ok ? 'success' : 'warning'} size="sm" dot>{item.status}</Badge>
    </div>
  );
}

export function FreshdeskSupportSyncConnectionDetails({
  connection,
  canManage,
  state,
  onPatch,
  onRotateSecret,
  onDisableConnection,
  syncing,
  onSyncNow,
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
      label: 'API credentials',
      status: connection.freshdesk_api_configured ? 'Stored securely' : 'Not configured',
      ok: Boolean(connection.freshdesk_api_configured),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <Image
          src="/integrations/freshdesk.svg"
          alt="Freshdesk"
          width={40}
          height={40}
          className="h-9 w-9 shrink-0 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] object-contain p-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
              {freshdeskAccountLabel(connection)}
            </p>
            <StatusBadge family="workflowStatus" value={isActive ? 'connected' : connection.status} />
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            Last synced {formatFreshdeskWhen(connection.last_sync_at)}
          </p>
        </div>
      </div>

      {/* Setup checklist */}
      <Card unstyled variant="panel" className="divide-y overflow-hidden p-0">
        <div className="px-4 py-2.5">
          <p className="text-[length:var(--ua-text-micro-size)] font-semibold" style={{ color: 'var(--ua-text-secondary)' }}>
            Setup checklist
          </p>
        </div>
        {checklist.map((item) => (
          <div key={item.label} className="px-4" style={{ borderColor: 'var(--ua-border-default)' }}>
            <ChecklistRow item={item} />
          </div>
        ))}
      </Card>

      {/* Webhook endpoint info when active */}
      {isActive ? (
        <Card unstyled variant="panel" className="space-y-2 p-4">
          <p className="text-[length:var(--ua-text-micro-size)] font-semibold" style={{ color: 'var(--ua-text-secondary)' }}>
            Webhook endpoint
          </p>
          <div
            className="rounded-lg px-3 py-2 font-mono text-xs"
            style={{ background: 'color-mix(in srgb, var(--ua-text-primary) 5%, transparent)', color: 'var(--ua-text-primary)' }}
          >
            <p>{connection.webhook_url}</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            Add header <code className="font-mono">{FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME}</code> with your webhook secret to authenticate requests.
          </p>
        </Card>
      ) : null}

      {/* Danger zone */}
      {canManage ? (
        <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--ua-border-default)' }}>
          <button
            type="button"
            disabled={state.busy || syncing || !isActive || !connection.freshdesk_api_configured}
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-secondary)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing tickets' : 'Sync tickets now'}
          </button>
          <button
            type="button"
            disabled={state.busy}
            onClick={onRotateSecret}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-secondary)' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rotate secret
          </button>
          <button
            type="button"
            disabled={state.busy || connection.status === 'disabled'}
            onClick={onDisableConnection}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{
              borderColor: 'color-mix(in srgb, var(--ua-risk-critical) 30%, var(--ua-border-default))',
              color: 'var(--ua-risk-critical)',
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
            <p className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
              Reconnect Freshdesk
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
              Update your credentials to re-enable the connection.
            </p>
          </div>
          <FreshdeskSupportSyncCreateForm
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
