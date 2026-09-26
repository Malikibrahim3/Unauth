import { Spinner } from '@/components/ui/Spinner';
import { formatNumber, formatRelativeTime } from '@/lib/utils/format';
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
          <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#64686d' }}>
            {status.orderCount != null ? formatNumber(status.orderCount) : '-'} orders synced
            {typeof status.auditTransactionCount === 'number'
              ? ` · ${formatNumber(status.auditTransactionCount)} scored`
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
          className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 disabled:opacity-60"
          style={{ background: '#9f4f08', color: '#fff' }}
          data-testid="shopify-sync-now"
        >
          {syncing ? (
            <>
              <Spinner size="sm" delayMs={0} label="Syncing" />
              Syncing…
            </>
          ) : (
            'Sync now'
          )}
        </button>
      </div>

      {syncError ? (
        <div className="text-[13px] leading-5 text-[#40454a] rounded-[8px] border px-3 py-2" style={{ borderColor: '#edc6b5', background: '#fdf0e6', color: '#b0431a' }} role="alert">
          {syncError} Reconnect Shopify and retry the sync.
        </div>
      ) : null}

      <div className="text-[10.5px] leading-4 text-[#6f6a63] grid grid-cols-2 gap-3">
        <div>
          <p style={{ color: '#64686d' }}>Last sync</p>
          <p className="font-medium mt-0.5" style={{ color: '#1c1f23' }}>
            {status.lastSyncAt ? formatRelativeTime(status.lastSyncAt) : 'Never'}
          </p>
        </div>
        <div>
          <p style={{ color: '#64686d' }}>Last webhook</p>
          <p className="font-medium mt-0.5" style={{ color: '#1c1f23' }}>
            {status.lastWebhookAt ? formatRelativeTime(status.lastWebhookAt) : 'None'}
            {status.lastWebhookTopic ? (
              <span className="ml-1 font-mono opacity-60">{status.lastWebhookTopic}</span>
            ) : null}
          </p>
        </div>
        <div>
          <p style={{ color: '#64686d' }}>Webhook health</p>
          <p
            className="font-medium mt-0.5"
            style={{ color: webhookHealthy ? '#1a6b43' : webhookObserved ? '#b0431a' : '#64686d' }}
          >
            {webhookHealthy ? 'Healthy' : webhookObserved ? `${status.webhookFailures} failed` : 'Not verified'}
          </p>
        </div>
        <div>
          <p style={{ color: '#64686d' }}>Data sources</p>
          <p className="font-medium mt-0.5" style={{ color: '#1c1f23' }}>
            {(status.dataSources ?? ['Shopify']).join(' · ')}
          </p>
        </div>
      </div>

      <SyncStatusScopesList scopes={scopes} label="Granted scopes" />

      {recentWebhooks.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-2" style={{ color: '#64686d' }}>
            Recent webhook activity
          </p>
          <ul className="space-y-1">
            {recentWebhooks.map((event) => (
              <li
                key={`${event.at}-${event.topic ?? 'unknown'}`}
                className="text-[12px] leading-[1.45] text-[#40454a] flex items-center justify-between gap-2"
              >
                <span className="font-mono truncate" style={{ color: '#1c1f23' }}>
                  {event.topic ?? 'webhook'}
                </span>
                <span style={{ color: event.status === 'failed' ? '#b0431a' : '#64686d' }}>
                  {event.status} · {formatRelativeTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasError ? (
        <div
          className="text-[13px] leading-5 text-[#40454a] px-3 py-2 rounded-md"
          style={{ background: '#fdf0e6', color: '#b0431a' }}
        >
          <p className="font-semibold mb-0.5">Sync error</p>
          <p>{status.lastError}</p>
        </div>
      ) : null}

      <div className="pt-2 border-t" style={{ borderColor: '#e4e3e0' }}>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[11px] font-medium leading-4 text-[#64686d]"
          style={{ color: '#64686d' }}
          data-testid="reconnect-shopify"
        >
          {hasError ? 'Reconnect to fix sync error' : 'Re-authorize connection'}
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
        <div className="pt-3 mt-3 border-t space-y-4" style={{ borderColor: '#e4e3e0' }}>
          {content}
        </div>
      ) : (
        <div
          className="rounded-md p-5 border space-y-4"
          style={{
            borderColor: hasError ? '#edc6b5' : '#eae8e5',
            background: '#fff',
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
