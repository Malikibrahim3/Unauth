/**
 * Canonical per-connector freshness abstraction. `merchant_integrations`'
 * bookkeeping columns (`last_successful_sync_at`, `imported_record_count`)
 * are only kept current by ShipBob's sync worker and a one-time Shopify
 * historical backfill route — they go permanently stale for any provider
 * whose ongoing ingestion doesn't touch them (Shopify's live webhook path,
 * Gorgias, UPS/FedEx). Every other module must ask this file "is this
 * connector's freshness measurable, and what's the best signal we have?"
 * rather than reading those columns directly or branching on provider id.
 */

export type FreshnessConfidence = 'measured' | 'unavailable';

/**
 * How this provider actually gets data, which determines what "last sync
 * attempt" / "last successful sync" honestly mean for it:
 *  - periodic_sync: discrete backfill/incremental sync jobs (ShipBob).
 *  - webhook: continuous event delivery, no discrete "sync job" concept
 *    (Gorgias always; Shopify's ongoing flow, though it did have one
 *    historical backfill job worth showing if it happened).
 *  - on_demand: fetched per-case on request, no periodic activity at all
 *    (UPS/FedEx).
 * A webhook/on_demand provider showing "No successful sync" next to a
 * healthy badge is a contradiction, not a fact — "successful sync" is a
 * periodic-job concept that doesn't exist for it. UI callers use this to
 * render "Not applicable" instead of an empty-state string that implies a
 * sync was attempted and failed.
 */
export type ConnectorDeliveryModel = 'periodic_sync' | 'webhook' | 'on_demand';

export type ConnectorFreshness = {
  /** Whether this provider type has a reliable ongoing "still hearing from
   * it" signal at all — structural, independent of whether a value exists
   * for this particular connection right now. */
  confidence: FreshnessConfidence;
  deliveryModel: ConnectorDeliveryModel;
  /** Best "data is still arriving" timestamp, or null if none yet/ever. */
  lastDataReceivedAt: string | null;
  /** Most recent sync attempt (started or completed), success or failure. */
  lastSyncAttemptAt: string | null;
  /** Set only when confidence === 'unavailable'; explains why. */
  reason?: string;
};

export type FreshnessMerchantIntegrationRow = {
  last_sync_started_at: string | null;
  last_sync_completed_at: string | null;
  last_successful_sync_at: string | null;
  webhook_last_received_at: string | null;
} | null;

export type FreshnessInput = {
  providerId: string;
  merchantIntegration: FreshnessMerchantIntegrationRow;
  /** Gorgias-specific: helpdesk_connections.last_sync_at, updated on every
   * processed ticket webhook — the real Gorgias "still hearing from it"
   * signal, which lives on a different table than merchant_integrations. */
  helpdeskLastSyncAt?: string | null;
};

function latestOf(...timestamps: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const ts of timestamps) {
    if (!ts) continue;
    const ms = Date.parse(ts);
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = ts;
    }
  }
  return best;
}

/** Shopify: webhook_last_received_at is updated on every live webhook
 * (lib/shopify/ingest.ts). The sync-completion columns only ever move
 * during the one-time historical backfill — never trusted for freshness. */
function resolveWebhookDrivenFreshness(input: FreshnessInput): ConnectorFreshness {
  const row = input.merchantIntegration;
  return {
    confidence: 'measured',
    deliveryModel: 'webhook',
    lastDataReceivedAt: row?.webhook_last_received_at ?? null,
    lastSyncAttemptAt: latestOf(row?.last_sync_started_at, row?.last_sync_completed_at),
  };
}

/** Gorgias: the real per-ticket-webhook signal lives on helpdesk_connections,
 * not merchant_integrations — merchant_integrations has no Gorgias writer at all. */
function resolveGorgiasFreshness(input: FreshnessInput): ConnectorFreshness {
  const row = input.merchantIntegration;
  return {
    confidence: 'measured',
    deliveryModel: 'webhook',
    lastDataReceivedAt: input.helpdeskLastSyncAt ?? null,
    lastSyncAttemptAt: latestOf(row?.last_sync_started_at, row?.last_sync_completed_at, input.helpdeskLastSyncAt),
  };
}

/** ShipBob: the only provider whose merchant_integrations sync-completion
 * columns are genuinely kept current by ongoing sync-job activity. */
function resolveSyncJobDrivenFreshness(input: FreshnessInput): ConnectorFreshness {
  const row = input.merchantIntegration;
  return {
    confidence: 'measured',
    deliveryModel: 'periodic_sync',
    lastDataReceivedAt: row?.last_successful_sync_at ?? null,
    lastSyncAttemptAt: latestOf(row?.last_sync_started_at, row?.last_sync_completed_at),
  };
}

/** UPS/FedEx: evidence is fetched on demand per case, not synced
 * periodically — there is no reliable "still hearing from it" signal, so we
 * say so rather than inventing staleness from an opportunistic per-case touch. */
function resolveOnDemandFreshness(input: FreshnessInput): ConnectorFreshness {
  const row = input.merchantIntegration;
  return {
    confidence: 'unavailable',
    deliveryModel: 'on_demand',
    lastDataReceivedAt: null,
    lastSyncAttemptAt: latestOf(row?.last_sync_started_at, row?.last_sync_completed_at),
    reason: 'on_demand_provider',
  };
}

/** Safe default for any provider without a registered resolver — never
 * invent a freshness signal for a connector we haven't audited. */
function resolveDefaultFreshness(input: FreshnessInput): ConnectorFreshness {
  const row = input.merchantIntegration;
  return {
    confidence: 'unavailable',
    // Unknown delivery model — default to 'webhook' rather than
    // 'periodic_sync' so the UI renders "Not applicable" instead of
    // implying a periodic-sync contract we haven't verified exists.
    deliveryModel: 'webhook',
    lastDataReceivedAt: null,
    lastSyncAttemptAt: latestOf(row?.last_sync_started_at, row?.last_sync_completed_at),
    reason: 'no_freshness_resolver',
  };
}

const FRESHNESS_RESOLVERS: Record<string, (input: FreshnessInput) => ConnectorFreshness> = {
  shopify: resolveWebhookDrivenFreshness,
  gorgias: resolveGorgiasFreshness,
  shipbob: resolveSyncJobDrivenFreshness,
  ups: resolveOnDemandFreshness,
  fedex: resolveOnDemandFreshness,
};

/**
 * The single seam for provider-specific freshness logic. No other module
 * should branch on provider id to decide what "still receiving data" means.
 */
export function resolveConnectorFreshness(input: FreshnessInput): ConnectorFreshness {
  const resolver = FRESHNESS_RESOLVERS[input.providerId] ?? resolveDefaultFreshness;
  return resolver(input);
}
