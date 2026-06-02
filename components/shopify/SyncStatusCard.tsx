'use client';

import { SyncStatusConnectedView } from '@/components/shopify/SyncStatusConnectedView';
import { SyncStatusDisconnectedView } from '@/components/shopify/SyncStatusDisconnectedView';
import type { SyncStatusVariant } from '@/components/shopify/syncStatusCardTypes';
import { useSyncStatusCard } from '@/components/shopify/useSyncStatusCard';

export default function SyncStatusCard({ variant = 'card' }: { variant?: SyncStatusVariant }) {
  const {
    status,
    modalOpen,
    setModalOpen,
    syncing,
    syncError,
    handleSyncNow,
  } = useSyncStatusCard();

  if (!status) return null;

  if (!status.connected) {
    return (
      <SyncStatusDisconnectedView
        status={status}
        variant={variant}
        modalOpen={modalOpen}
        onOpenModal={() => setModalOpen(true)}
        onCloseModal={() => setModalOpen(false)}
      />
    );
  }

  return (
    <SyncStatusConnectedView
      status={status}
      variant={variant}
      syncing={syncing}
      syncError={syncError}
      modalOpen={modalOpen}
      onSyncNow={() => {
        void handleSyncNow();
      }}
      onOpenModal={() => setModalOpen(true)}
      onCloseModal={() => setModalOpen(false)}
    />
  );
}
