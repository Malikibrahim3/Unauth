import { Loader2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';
import { SyncStatusConnectModal } from '@/components/shopify/SyncStatusConnectModal';
import { SyncStatusScopesList } from '@/components/shopify/SyncStatusScopesList';
import type { ShopifyStatus, SyncStatusVariant } from '@/components/shopify/syncStatusCardTypes';

type SyncStatusConnectedViewProps = {
  status: ShopifyStatus;
  variant: SyncStatusVariant;
  syncing: boolean;
  syncError: string | null;
  modalOpen: boolean;
  onSyncNow: () => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
};

function SyncStatusConnectedContent({
  status,
  syncing,
  syncError,
  onSyncNow,
  onOpenModal,
}: Omit<SyncStatusConnectedViewProps, 'variant' | 'modalOpen' | 'onCloseModal'>) {
  const hasError = !!status.lastError;
  const webhookObserved = Boolean(status.lastWebhookAt);
  const webhookHealthy = webhookObserved && (status.webhookFailures ?? 0) === 0;
  const scopes = status.scopes ?? [];
  const recentWebhooks = status.recentWebhooks ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {status.orderCount?.toLocaleString() ?? '-'} orders synced
            {typeof status.auditTransactionCount === 'number'
              ? ` · ${status.auditTransactionCount.toLocaleString()} scored`
              : ''}{' '}
            · read-only
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onSyncNow();
          }}
          disabled={syncing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'white' }}
          data-testid="shopify-sync-now"
        >
          {syncing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Syncing…
            </>
          ) : (
            'Sync now'
          )}
        </button>
      </div>

      {syncError ? (
        <p className="text-xs" style={{ color: 'var(--success)' }} role="alert">
          {syncError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Last order synced</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {status.lastOrderSyncedAt ? formatRelativeTime(status.lastOrderSyncedAt) : 'Never'}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Last webhook</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {status.lastWebhookAt ? formatRelativeTime(status.lastWebhookAt) : 'None'}
            {status.lastWebhookTopic ? (
              <span className="ml-1 font-mono opacity-60">{status.lastWebhookTopic}</span>
            ) : null}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Webhook health</p>
          <p
            className="font-medium mt-0.5"
            style={{ color: webhookHealthy ? 'var(--success)' : webhookObserved ? 'var(--risk-high)' : 'var(--text-secondary)' }}
          >
            {webhookHealthy ? 'Healthy' : webhookObserved ? `${status.webhookFailures} failed` : 'Not verified'}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Data sources</p>
          <p className="font-medium mt-0.5" style={{ color: 'var(--text)' }}>
            {(status.dataSources ?? ['Shopify']).join(' · ')}
          </p>
        </div>
      </div>

      <SyncStatusScopesList scopes={scopes} label="Granted scopes" />

      {recentWebhooks.length > 0 ? (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Recent webhook activity
          </p>
          <ul className="space-y-1">
            {recentWebhooks.map((event) => (
              <li
                key={`${event.at}-${event.topic ?? 'unknown'}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono truncate" style={{ color: 'var(--text)' }}>
                  {event.topic ?? 'webhook'}
                </span>
                <span style={{ color: event.status === 'failed' ? 'var(--risk-high)' : 'var(--text-secondary)' }}>
                  {event.status} · {formatRelativeTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasError ? (
        <div
          className="px-3 py-2 rounded-md text-xs"
          style={{ background: 'var(--sev-definite-fill)', color: 'var(--success)' }}
        >
          <p className="font-semibold mb-0.5">Sync error</p>
          <p>{status.lastError}</p>
        </div>
      ) : null}

      <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
          data-testid="reconnect-shopify"
        >
          {hasError ? 'Reconnect to fix sync error →' : 'Re-authorize connection'}
        </button>
      </div>
    </>
  );
}

export function SyncStatusConnectedView({
  status,
  variant,
  syncing,
  syncError,
  modalOpen,
  onSyncNow,
  onOpenModal,
  onCloseModal,
}: SyncStatusConnectedViewProps) {
  const hasError = !!status.lastError;
  const content = (
    <SyncStatusConnectedContent
      status={status}
      syncing={syncing}
      syncError={syncError}
      onSyncNow={onSyncNow}
      onOpenModal={onOpenModal}
    />
  );

  return (
    <>
      {variant === 'inline' ? (
        <div className="pt-3 mt-3 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
          {content}
        </div>
      ) : (
        <div
          className="rounded-md p-5 border space-y-4"
          style={{
            borderColor: hasError ? 'color-mix(in srgb, var(--success) 35%, var(--border))' : 'var(--border-muted)',
            background: 'var(--surface)',
          }}
        >
          {content}
        </div>
      )}

      {modalOpen ? (
        <SyncStatusConnectModal initialValue={status.shopDomain ?? ''} onClose={onCloseModal} />
      ) : null}
    </>
  );
}
