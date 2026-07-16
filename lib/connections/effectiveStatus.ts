import type { LiveVerificationResult } from '@/lib/connections/liveVerification';
import type { ConnectorFreshness } from '@/lib/connections/freshness';
import { SYNC_STATE_LABELS, type ConnectionSyncState } from '@/lib/integrations/syncState';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
import { formatDateTime } from '@/lib/utils/format';

/** Provider ids with a real live credential/token probe implemented
 * (lib/connections/liveVerification.ts). The single source of truth for
 * "does this provider type have a live check at all" — do not duplicate
 * this list inline in page components. */
const LIVE_CREDENTIAL_CHECK_PROVIDERS = new Set(['shopify', 'gorgias', 'shipbob', 'ups', 'fedex']);

export function isLiveCredentialCheckSupported(providerId: string): boolean {
  return LIVE_CREDENTIAL_CHECK_PROVIDERS.has(providerId);
}

/** Coarse bucket — drives which section of the Integrations page a
 * connector lands in. Unchanged shape from the first pass. */
export type EffectiveConnectionBucket = 'connected' | 'error' | 'attention_required' | 'not_connected';

/** Merchant-facing badge vocabulary. More granular than the bucket — a
 * bucket of "connected" can render as healthy, stale, sync_pending, no_data,
 * or verification_unavailable depending on what we actually know. */
export type EffectiveConnectionBadge =
  | 'disconnected'
  | 'error'
  | 'not_syncing'
  | 'stale'
  | 'sync_pending'
  | 'no_data'
  | 'healthy'
  | 'connection_verified'
  | 'verification_unavailable';

export type EffectiveConnectionHealth = {
  bucket: EffectiveConnectionBucket;
  badge: EffectiveConnectionBadge;
  note: string | null;
  /** Tone for the note only — the badge component has its own tone map. */
  noteTone: 'warning' | 'danger' | null;
};

const RETRY_NOTE = 'Credential verification could not be confirmed on the last check. We will retry automatically.';

/**
 * Deterministic precedence merging three independent signals:
 *   - liveResult: did the live credential/token probe (if one exists for
 *     this provider) succeed, fail, or come back inconclusive?
 *   - syncState: what does the stored sync bookkeeping say happened
 *     (lib/integrations/syncState.ts::deriveSyncState) — computed by the
 *     caller using the correct per-provider freshness anchor, not raw
 *     merchant_integrations columns.
 *   - freshness: is this provider's freshness structurally measurable at
 *     all (lib/connections/freshness.ts), and why not if not.
 * A harder failure always overrides a softer warning. A note is always
 * produced through publicConnectionErrorMessage/SYNC_STATE_LABELS — never
 * from a raw provider error string.
 */
export function resolveEffectiveConnectionStatus(
  liveResult: LiveVerificationResult | null,
  syncState: ConnectionSyncState,
  freshness: ConnectorFreshness,
): EffectiveConnectionHealth {
  // 1. Disconnected / not configured.
  if (syncState === 'disconnected') {
    return { bucket: 'not_connected', badge: 'disconnected', note: null, noteTone: null };
  }

  // 2. Credential or authentication failure always wins — a dead token is
  // strictly worse than any freshness signal, however good it looks.
  if (liveResult?.status === 'failed') {
    return {
      bucket: 'error',
      badge: 'error',
      note: publicConnectionErrorMessage(liveResult.reason) ?? 'Reconnect this integration.',
      noteTone: 'danger',
    };
  }

  // 3. Connector or sync failure — an actual error code is present.
  if (syncState === 'sync_failed' || syncState === 'attention_required') {
    return { bucket: 'attention_required', badge: 'not_syncing', note: SYNC_STATE_LABELS[syncState], noteTone: 'warning' };
  }

  // On-demand connectors (UPS/FedEx today) fetch evidence per case rather
  // than syncing periodically — the pending/stale/no-data vocabulary below
  // assumes a periodic sync model that doesn't apply to them. A successful
  // probe only proves the connector can currently be queried, not that data
  // flows continuously — that's a materially weaker claim than "Healthy"
  // (reserved for providers with a measured, fresh, ongoing data signal), so
  // it gets its own badge rather than borrowing one that overstates it.
  if (freshness.reason === 'on_demand_provider') {
    return liveResult?.status === 'verified'
      ? { bucket: 'connected', badge: 'connection_verified', note: null, noteTone: null }
      : { bucket: 'connected', badge: 'verification_unavailable', note: RETRY_NOTE, noteTone: null };
  }

  // 4. Stale data — credentials are fine, data just hasn't moved recently.
  if (syncState === 'stale') {
    return {
      bucket: 'connected',
      badge: 'stale',
      note: freshness.lastDataReceivedAt
        ? `Data hasn't synced since ${formatDateTime(freshness.lastDataReceivedAt)}.`
        : 'Data may be stale.',
      noteTone: 'warning',
    };
  }

  // 5. Initial sync pending.
  if (syncState === 'import_queued' || syncState === 'importing') {
    return { bucket: 'connected', badge: 'sync_pending', note: null, noteTone: null };
  }

  // 6. Successfully connected, zero records.
  if (syncState === 'no_records_found') {
    return { bucket: 'connected', badge: 'no_data', note: 'Connected, but no records have been found yet.', noteTone: 'warning' };
  }

  // Provider audited but its freshness resolver hasn't been built yet — say
  // so rather than defaulting to a green "Healthy" we can't actually back up.
  if (freshness.confidence === 'unavailable') {
    return {
      bucket: 'connected',
      badge: 'verification_unavailable',
      note: "Freshness can't be measured for this connector yet.",
      noteTone: null,
    };
  }

  // The live probe ran but couldn't confirm anything this cycle (network
  // blip, rate limit) — data otherwise looks complete, but say we couldn't
  // reconfirm rather than claiming full confidence.
  if (liveResult?.status === 'inconclusive') {
    return { bucket: 'connected', badge: 'verification_unavailable', note: RETRY_NOTE, noteTone: null };
  }

  // 7. Healthy and fresh.
  return { bucket: 'connected', badge: 'healthy', note: null, noteTone: null };
}
