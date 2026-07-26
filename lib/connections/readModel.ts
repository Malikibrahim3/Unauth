import type { ConnectorFreshness } from '@/lib/connections/freshness';
import {
  resolveEffectiveConnectionStatus,
  type EffectiveConnectionBadge,
  type EffectiveConnectionHealth,
} from '@/lib/connections/effectiveStatus';
import type { ConnectionSyncState } from '@/lib/integrations/syncState';

export type ConnectionConfigurationState = 'configured' | 'not_configured';
export type ConnectionOperationalState = 'healthy' | 'attention' | 'unknown';

/**
 * Canonical merchant-facing connection read model. Configuration answers
 * “can this provider be used?”; operational state answers “can we trust the
 * signal right now?”. Keeping those axes separate prevents OAuth success or
 * a stale row from rendering as a healthy data source.
 */
export type ConnectionReadModel = {
  providerId: string;
  configuration: ConnectionConfigurationState;
  operational: ConnectionOperationalState;
  badge: EffectiveConnectionBadge;
  note: string | null;
  noteTone: EffectiveConnectionHealth['noteTone'];
  syncState: ConnectionSyncState;
  deliveryModel: ConnectorFreshness['deliveryModel'];
  freshnessConfidence: ConnectorFreshness['confidence'];
  lastDataReceivedAt: string | null;
  lastVerifiedAt: string | null;
  importedRecords: number;
};

export function resolveConnectionReadModel(input: {
  providerId: string;
  syncState: ConnectionSyncState;
  freshness: ConnectorFreshness;
  liveVerification?: Parameters<typeof resolveEffectiveConnectionStatus>[0];
  lastVerifiedAt?: string | null;
  importedRecords?: number;
}): ConnectionReadModel {
  const health = resolveEffectiveConnectionStatus(input.liveVerification ?? null, input.syncState, input.freshness);
  const configuration: ConnectionConfigurationState = health.badge === 'disconnected' ? 'not_configured' : 'configured';
  const operational: ConnectionOperationalState = health.badge === 'healthy' || health.badge === 'connection_verified'
    ? 'healthy'
    : configuration === 'configured'
      ? 'attention'
      : 'unknown';
  return {
    providerId: input.providerId,
    configuration,
    operational,
    badge: health.badge,
    note: health.note,
    noteTone: health.noteTone,
    syncState: input.syncState,
    deliveryModel: input.freshness.deliveryModel,
    freshnessConfidence: input.freshness.confidence,
    lastDataReceivedAt: input.freshness.lastDataReceivedAt,
    lastVerifiedAt: input.lastVerifiedAt ?? null,
    importedRecords: input.importedRecords ?? 0,
  };
}
