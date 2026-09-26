import { SyncStatusConnectModal } from '@/components/shopify/SyncStatusConnectModal';
import { SyncStatusScopesList } from '@/components/shopify/SyncStatusScopesList';
import type { ShopifyStatus, SyncStatusVariant } from '@/components/shopify/syncStatusCardTypes';

type SyncStatusDisconnectedViewProps = {
  status: ShopifyStatus;
  variant: SyncStatusVariant;
  modalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
};

function getDisconnectedCopy(status: ShopifyStatus) {
  const linkState = status.linkState ?? 'not_connected';
  const title =
    linkState === 'disconnected'
      ? 'Shopify was disconnected'
      : linkState === 'installed_unlinked'
        ? 'Shopify installed but not linked'
        : 'Not connected';
  const description =
    linkState === 'disconnected'
      ? `Reconnect ${status.shopDomain ?? 'Shopify'} to continue syncing orders, customers, refunds and fulfilment events.`
      : linkState === 'installed_unlinked'
        ? `Shopify is installed for ${status.shopDomain ?? 'your store'} but not linked to this Unauth workspace. Reconnect to finish linking.`
        : 'Connect Shopify to sync orders, customers, refunds and fulfilment events.';
  const actionLabel =
    linkState === 'disconnected' || linkState === 'installed_unlinked'
      ? 'Reconnect Shopify'
      : 'Connect Shopify';

  return { linkState, title, description, actionLabel };
}

export function SyncStatusDisconnectedView({
  status,
  variant,
  modalOpen,
  onOpenModal,
  onCloseModal,
}: SyncStatusDisconnectedViewProps) {
  const { linkState, title, description, actionLabel } = getDisconnectedCopy(status);
  const scopes = status.scopes ?? [];

  if (variant === 'inline') {
    return (
      <>
        <div className="pt-3 mt-3 border-t space-y-3" style={{ borderColor: '#e4e3e0' }}>
          <button
            type="button"
            onClick={onOpenModal}
            className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex items-center rounded-md px-3 py-1.5"
            style={{ background: '#9f4f08', color: '#fff' }}
            data-testid="open-connect-shopify-modal"
          >
            {actionLabel}
          </button>
        </div>
        {modalOpen ? (
          <SyncStatusConnectModal initialValue={status.shopDomain ?? ''} onClose={onCloseModal} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        className="rounded-md p-5 border space-y-4"
        style={{ borderColor: '#eae8e5', background: '#fff' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-2.5 w-2.5 rounded-full mt-1 flex-shrink-0"
            style={{
              background:
                linkState === 'installed_unlinked'
                  ? '#7a5310'
                  : '#64686d',
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
              {title}
            </p>
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
              {description}
            </p>
            <button
              type="button"
              onClick={onOpenModal}
              className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex items-center mt-3 rounded-md px-3 py-1.5"
            style={{ background: '#9f4f08', color: '#fff' }}
              data-testid="open-connect-shopify-modal"
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <SyncStatusScopesList scopes={scopes} label="Requested read-only scopes" />
      </div>

      {modalOpen ? (
        <SyncStatusConnectModal initialValue={status.shopDomain ?? ''} onClose={onCloseModal} />
      ) : null}
    </>
  );
}
