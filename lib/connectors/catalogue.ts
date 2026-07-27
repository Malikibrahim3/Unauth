import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveConnectorCapabilities } from '@/lib/connectors/runtime';
import { listConnectors } from '@/lib/connectors/registry';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';
import {
  deriveProviderDisplayStage,
  INTEGRATION_PROVIDERS,
  isRuntimeVerificationPending,
  pendingRuntimeCapabilities,
} from '@/lib/integrations/registry';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
import type {
  IntegrationAuthMode,
  IntegrationProvider,
  LifecycleCapability,
  LifecycleCapabilityId,
  ProviderDisplayStage,
} from '@/lib/integrations/types';
import { deriveSyncState, type ConnectionSyncState } from '@/lib/integrations/syncState';
import { resolveConnectorFreshness, type ConnectorFreshness } from '@/lib/connections/freshness';
import { TABLES } from '@/lib/supabase/tables';

export type ConnectorCatalogueItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  authMode: IntegrationAuthMode;
  stage: ProviderDisplayStage;
  /** The ten-dimension lifecycle proof matrix backing `stage` — same data the
   * provider detail page renders, so the badge and the capability breakdown
  * can never disagree. */
  lifecycle: LifecycleCapability[];
  runtimeVerificationPending: boolean;
  pendingRuntimeCapabilities: LifecycleCapabilityId[];
  status: string;
  syncState: ConnectionSyncState;
  freshness: ConnectorFreshness;
  connectionId: string | null;
  connectionCount: number;
  account: string | null;
  lastSyncAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  /** Same value fed into deriveSyncState's staleness check (freshness.lastDataReceivedAt
   * falling back to the raw column) — kept identical so a "Stale" badge can
   * never disagree with what this timestamp displays. */
  lastDataReceivedAt: string | null;
  /**
   * Timestamp of the last *completed* live credential probe — set only after
   * verifyShopifyConnection/verifyGorgiasConnection/verifyMerchantIntegrationConnection
   * resolves (lib/connections/liveVerification.ts::persistLiveVerification),
   * never optimistically before a check starts. Updated on success, failure,
   * AND inconclusive outcomes alike (persistLiveVerification always stamps
   * checkedAt) — null only means no probe has ever completed for this exact
   * provider+merchant. Never derived from page-render time, `updated_at`, or
   * another provider's/merchant's row (see PROVIDER_VERIFIED_AT below and
   * tests/unit/catalogueApplicationTenantScoping.test.ts).
   */
  lastVerifiedAt: string | null;
  lastError: string | null;
  importedRecords: number;
  scopes: string[];
  capabilities: Array<{
    id: string;
    level: string;
    support: string;
    scopes: string[];
    description: string;
    availability: string;
    availabilityReason: string;
  }>;
  connectEnabled: boolean;
};

type ConnectionRow = {
  id: string;
  provider_id: string;
  status: string;
  provider_account_name: string | null;
  last_sync_started_at: string | null;
  last_sync_completed_at: string | null;
  last_successful_sync_at: string | null;
  last_verified_at: string | null;
  webhook_last_received_at: string | null;
  last_error_message: string | null;
  last_error: string | null;
  last_error_code: string | null;
  imported_record_count: number | null;
  granted_scopes: string[] | null;
  writeback_enabled: boolean | null;
  updated_at: string;
};

const STATUS_RANK: Record<string, number> = {
  connected: 10,
  active: 10,
  import_complete: 9,
  syncing: 8,
  importing: 8,
  pending: 7,
  degraded: 6,
  attention_required: 6,
  error: 5,
  connection_error: 5,
  revoked: 2,
  disabled: 1,
  not_connected: 0,
};

const ACTIVE_STATUSES = new Set(['connected', 'active', 'import_complete', 'syncing', 'importing']);

export function primaryConnection(rows: ConnectionRow[]): ConnectionRow | null {
  return [...rows].sort((left, right) => {
    const status = (STATUS_RANK[right.status] ?? -1) - (STATUS_RANK[left.status] ?? -1);
    if (status !== 0) return status;
    const freshness = Date.parse(right.last_successful_sync_at ?? right.updated_at)
      - Date.parse(left.last_successful_sync_at ?? left.updated_at);
    return Number.isFinite(freshness) ? freshness : 0;
  })[0] ?? null;
}

function fallbackCapabilities(provider: IntegrationProvider, status: string): ConnectorCatalogueItem['capabilities'] {
  const connected = ACTIVE_STATUSES.has(status);
  const planned = provider.buildStatus === 'slot_only';
  return provider.evidenceCapabilities.map((evidenceCapability) => ({
    id: `evidence.${evidenceCapability}`,
    level: 'read',
    support: planned ? 'unsupported' : 'supported',
    scopes: provider.requiredScopes ?? [],
    description: evidenceCapability.replaceAll('_', ' '),
    availability: planned ? 'unsupported' : connected ? 'enabled' : 'not_connected',
    availabilityReason: planned
      ? 'Provider lifecycle is planned.'
      : connected
        ? 'Available for this connection.'
        : 'Connect the provider to use this capability.',
  }));
}

export async function loadConnectorCatalogue(
  client: SupabaseClient,
  merchantId: string,
): Promise<ConnectorCatalogueItem[]> {
  const [{ data, error }, storedViews, { data: gorgiasRows }, { data: shopifyRows }] = await Promise.all([
    client
      .from(TABLES.MERCHANT_INTEGRATIONS)
      .select('id,provider_id,status,provider_account_name,last_sync_started_at,last_sync_completed_at,last_successful_sync_at,last_verified_at,webhook_last_received_at,last_error_code,last_error_message,last_error,imported_record_count,granted_scopes,writeback_enabled,updated_at')
      .eq('merchant_id', merchantId),
    getStoredIntegrationViews(client, merchantId),
    // Gorgias's real "still hearing from it" signal AND its live-verification
    // timestamp both live on a different table (see lib/connections/freshness.ts)
    // — merchant_integrations has no writer for either for Gorgias.
    client.from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .select('last_sync_at,last_verified_at')
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .order('updated_at', { ascending: false })
      .limit(1),
    // Shopify's live-verification timestamp is persisted to store_connections
    // by persistLiveVerification, not to merchant_integrations either.
    client.from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
      .select('last_verified_at')
      .eq('merchant_id', merchantId)
      .eq('platform', 'shopify')
      .order('installed_at', { ascending: false })
      .limit(1),
  ]);
  if (error) throw new Error(`connector_catalogue_failed: ${error.message}`);
  const gorgiasLastSyncAt = (gorgiasRows?.[0] as { last_sync_at: string | null } | undefined)?.last_sync_at ?? null;
  const gorgiasLastVerifiedAt = (gorgiasRows?.[0] as { last_verified_at: string | null } | undefined)?.last_verified_at ?? null;
  const shopifyLastVerifiedAt = (shopifyRows?.[0] as { last_verified_at: string | null } | undefined)?.last_verified_at ?? null;
  // persistLiveVerification writes the verification timestamp to whichever
  // legacy table each live probe reads from (store_connections for Shopify,
  // helpdesk_connections for Gorgias) — merchant_integrations.last_verified_at
  // is only ever written for shipbob/ups/fedex. Reading the wrong table here
  // would make "Last health check" read "Not yet checked" forever even
  // though a probe runs on every page load.
  const PROVIDER_VERIFIED_AT: Record<string, string | null> = {
    shopify: shopifyLastVerifiedAt,
    gorgias: gorgiasLastVerifiedAt,
  };

  const grouped = new Map<string, ConnectionRow[]>();
  for (const row of (data ?? []) as ConnectionRow[]) {
    grouped.set(row.provider_id, [...(grouped.get(row.provider_id) ?? []), row]);
  }
  const adapterById = new Map(listConnectors().map((adapter) => [adapter.manifest.id, adapter]));
  const viewById = new Map(storedViews.map((view) => [view.id, view]));

  return INTEGRATION_PROVIDERS.map((provider) => {
    const rows = grouped.get(provider.id) ?? [];
    const primary = primaryConnection(rows);
    const view = viewById.get(provider.id);
    const rawStatus = primary?.status ?? view?.status ?? 'not_connected';
    const status = rawStatus === 'connection_error' ? 'error' : rawStatus;
    const scopes = [...new Set(primary?.granted_scopes ?? provider.requiredScopes ?? [])];
    const adapter = adapterById.get(provider.id);
    const capabilities = adapter
      ? resolveConnectorCapabilities(adapter.manifest.capabilities, {
          status,
          grantedScopes: scopes,
          writebackEnabled: primary?.writeback_enabled === true,
        }).map((capability) => ({
          id: capability.id,
          level: capability.level,
          support: capability.support,
          scopes: capability.requiredScopes,
          description: capability.description,
          availability: capability.availability,
          availabilityReason: capability.availabilityReason,
        }))
      : fallbackCapabilities(provider, status);

    const freshness = resolveConnectorFreshness({
      providerId: provider.id,
      merchantIntegration: primary
        ? {
            last_sync_started_at: primary.last_sync_started_at,
            last_sync_completed_at: primary.last_sync_completed_at,
            last_successful_sync_at: primary.last_successful_sync_at,
            webhook_last_received_at: primary.webhook_last_received_at,
          }
        : null,
      helpdeskLastSyncAt: provider.id === 'gorgias' ? gorgiasLastSyncAt : undefined,
    });
    // merchant_integrations' own completion/count bookkeeping isn't wired
    // for every provider (Gorgias's ticket pipeline never touches it) — when
    // we have a reliable freshness signal saying data HAS arrived, don't let
    // an unwired/absent bookkeeping column claim otherwise.
    const dataHasArrived = freshness.confidence === 'measured' && freshness.lastDataReceivedAt !== null;
    const effectiveLastSyncCompletedAt = primary?.last_sync_completed_at
      ?? (dataHasArrived ? freshness.lastDataReceivedAt : null);
    const baseImportedRecordCount = primary?.imported_record_count ?? view?.importedRecordCount ?? null;
    const effectiveImportedRecordCount = dataHasArrived
      ? Math.max(baseImportedRecordCount ?? 0, 1)
      : baseImportedRecordCount;
    // The single source of truth for "when did data last actually arrive" —
    // fed to deriveSyncState's staleness check AND displayed as "Last data
    // received" from the exact same expression, so the two can never disagree
    // (e.g. a "Stale" badge next to a "Last data received: Never" card).
    const dataReceivedAnchor = freshness.lastDataReceivedAt ?? primary?.last_successful_sync_at ?? view?.lastSyncAt ?? null;

    return {
      id: provider.id,
      name: provider.name,
      description: provider.description ?? 'Connection to this source.',
      category: provider.category,
      authMode: provider.authMode,
      stage: deriveProviderDisplayStage(provider),
      lifecycle: provider.lifecycle ?? [],
      runtimeVerificationPending: isRuntimeVerificationPending(provider),
      pendingRuntimeCapabilities: pendingRuntimeCapabilities(provider),
      status,
      syncState: deriveSyncState({
        status,
        lastSyncStartedAt: primary?.last_sync_started_at ?? null,
        lastSyncCompletedAt: effectiveLastSyncCompletedAt,
        lastSuccessfulSyncAt: dataReceivedAnchor,
        importedRecordCount: effectiveImportedRecordCount,
        lastErrorCode: primary?.last_error_code ?? null,
      }),
      freshness,
      connectionId: primary?.id ?? null,
      connectionCount: rows.filter((row) => !['not_connected', 'revoked', 'disabled'].includes(row.status)).length
        || (ACTIVE_STATUSES.has(status) ? 1 : 0),
      account: primary?.provider_account_name ?? view?.detail ?? null,
      lastSyncAttemptAt: freshness.lastSyncAttemptAt,
      lastSuccessfulSyncAt: primary?.last_successful_sync_at ?? view?.lastSyncAt ?? null,
      lastDataReceivedAt: dataReceivedAnchor,
      lastVerifiedAt: provider.id in PROVIDER_VERIFIED_AT
        ? PROVIDER_VERIFIED_AT[provider.id]
        : primary?.last_verified_at ?? null,
      lastError: primary
        ? publicConnectionErrorMessage(
            primary.last_error_code,
            primary.last_error_message,
            primary.last_error,
          )
        : view?.lastError ?? null,
      importedRecords: Number(effectiveImportedRecordCount ?? 0),
      scopes,
      capabilities,
      connectEnabled: provider.buildStatus !== 'slot_only'
        && (Boolean(provider.setupHref) || Boolean(adapter?.manifest.launchVisible)),
    };
  });
}
