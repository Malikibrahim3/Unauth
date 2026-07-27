import type { ConnectorFreshness } from '@/lib/connections/freshness';
import {
  resolveEffectiveConnectionStatus,
  type EffectiveConnectionBadge,
  type EffectiveConnectionBucket,
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
  /** Coarse grouping for page sections. Carried here so no consumer resolves it twice. */
  bucket: EffectiveConnectionBucket;
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
    bucket: health.bucket,
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

export class ImpossibleConnectionState extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpossibleConnectionState';
  }
}

/**
 * RUN-18: rejects state combinations that cannot be true, so a consumer can
 * never render a contradiction such as "not connected" beside a healthy
 * indicator, or a healthy source that has never delivered data.
 *
 * This runs at the read-model boundary rather than in each consumer, because
 * the audited defect was precisely that the sidebar, the summary, the row and
 * the detail each decided for themselves.
 */
export function assertPossibleConnectionState(model: ConnectionReadModel): ConnectionReadModel {
  if (model.configuration === 'not_configured' && model.operational === 'healthy') {
    throw new ImpossibleConnectionState(
      `${model.providerId}: a provider that is not configured cannot be operationally healthy.`,
    );
  }
  if (model.configuration === 'configured' && model.operational === 'unknown') {
    throw new ImpossibleConnectionState(
      `${model.providerId}: a configured provider must report healthy or attention, never unknown.`,
    );
  }
  if (model.operational === 'healthy' && !model.lastDataReceivedAt && model.deliveryModel !== 'on_demand') {
    throw new ImpossibleConnectionState(
      `${model.providerId}: a continuously delivering source cannot be healthy before any data has arrived.`,
    );
  }
  return model;
}

/**
 * The canonical entry point for every merchant-facing consumer: resolve, then
 * validate. Consumers should call this rather than `resolveConnectionReadModel`
 * so no surface can skip the impossible-state check.
 */
export function connectionReadModel(
  input: Parameters<typeof resolveConnectionReadModel>[0],
): ConnectionReadModel {
  return assertPossibleConnectionState(resolveConnectionReadModel(input));
}
