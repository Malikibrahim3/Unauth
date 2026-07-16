import type { SupabaseClient } from '@supabase/supabase-js';
import { listConnectors } from '@/lib/connectors/registry';
import { TABLES } from '@/lib/supabase/tables';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
import { resolveConnectorCapabilities } from '@/lib/connectors/runtime';
import { deriveSyncState, type ConnectionSyncState } from '@/lib/integrations/syncState';
import { resolveConnectorFreshness, type ConnectorFreshness } from '@/lib/connections/freshness';

export type ConnectorCatalogueItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  stage: 'live' | 'beta' | 'planned';
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
  capabilities: Array<{ id: string; level: string; support: string; scopes: string[]; description: string; availability: string; availabilityReason: string }>;
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

export function primaryConnection(rows: ConnectionRow[]): ConnectionRow | null {
  return [...rows].sort((left, right) => {
    const status = (STATUS_RANK[right.status] ?? -1) - (STATUS_RANK[left.status] ?? -1);
    if (status !== 0) return status;
    const freshness = Date.parse(right.last_successful_sync_at ?? right.updated_at) - Date.parse(left.last_successful_sync_at ?? left.updated_at);
    return Number.isFinite(freshness) ? freshness : 0;
  })[0] ?? null;
}

export async function loadConnectorCatalogue(client: SupabaseClient, merchantId: string): Promise<ConnectorCatalogueItem[]> {
  const [{ data, error }, { data: gorgiasRows }, { data: shopifyRows }] = await Promise.all([
    client.from(TABLES.MERCHANT_INTEGRATIONS)
      .select('id,provider_id,status,provider_account_name,last_sync_started_at,last_sync_completed_at,last_successful_sync_at,last_verified_at,webhook_last_received_at,last_error_code,last_error_message,last_error,imported_record_count,granted_scopes,writeback_enabled,updated_at')
      .eq('merchant_id', merchantId),
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
  for (const row of (data ?? []) as ConnectionRow[]) grouped.set(row.provider_id, [...(grouped.get(row.provider_id) ?? []), row]);

  return listConnectors().map((adapter) => {
    const manifest = adapter.manifest;
    const rows = grouped.get(manifest.id) ?? [];
    const primary = primaryConnection(rows);
    const stage = manifest.verificationStatus === 'verified' ? 'live' : manifest.verificationStatus === 'partial' ? 'beta' : 'planned';
    const status = primary?.status ?? 'not_connected';
    const freshness = resolveConnectorFreshness({
      providerId: manifest.id,
      merchantIntegration: primary
        ? {
            last_sync_started_at: primary.last_sync_started_at,
            last_sync_completed_at: primary.last_sync_completed_at,
            last_successful_sync_at: primary.last_successful_sync_at,
            webhook_last_received_at: primary.webhook_last_received_at,
          }
        : null,
      helpdeskLastSyncAt: manifest.id === 'gorgias' ? gorgiasLastSyncAt : undefined,
    });
    // merchant_integrations' own completion/count bookkeeping isn't wired
    // for every provider (Gorgias's ticket pipeline never touches it) — when
    // we have a reliable freshness signal saying data HAS arrived, don't let
    // an unwired/absent bookkeeping column claim otherwise.
    const dataHasArrived = freshness.confidence === 'measured' && freshness.lastDataReceivedAt !== null;
    const effectiveLastSyncCompletedAt = primary?.last_sync_completed_at
      ?? (dataHasArrived ? freshness.lastDataReceivedAt : null);
    const effectiveImportedRecordCount = dataHasArrived
      ? Math.max(primary?.imported_record_count ?? 0, 1)
      : primary?.imported_record_count ?? null;
    // The single source of truth for "when did data last actually arrive" —
    // fed to deriveSyncState's staleness check AND displayed as "Last data
    // received" from the exact same expression, so the two can never disagree
    // (e.g. a "Stale" badge next to a "Last data received: Never" card).
    const dataReceivedAnchor = freshness.lastDataReceivedAt ?? primary?.last_successful_sync_at ?? null;
    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description ?? 'Provider-neutral source connection.',
      category: manifest.category,
      stage,
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
      connectionCount: rows.filter((row) => !['not_connected', 'revoked', 'disabled'].includes(row.status)).length,
      account: primary?.provider_account_name ?? null,
      lastSyncAttemptAt: freshness.lastSyncAttemptAt,
      lastSuccessfulSyncAt: primary?.last_successful_sync_at ?? null,
      lastDataReceivedAt: dataReceivedAnchor,
      lastVerifiedAt: manifest.id in PROVIDER_VERIFIED_AT
        ? PROVIDER_VERIFIED_AT[manifest.id]
        : primary?.last_verified_at ?? null,
      lastError: publicConnectionErrorMessage(primary?.last_error_code, primary?.last_error_message, primary?.last_error),
      importedRecords: Number(primary?.imported_record_count ?? 0),
      scopes: [...new Set(primary?.granted_scopes ?? [])],
      capabilities: resolveConnectorCapabilities(manifest.capabilities, {
        status,
        grantedScopes: primary?.granted_scopes ?? [],
        writebackEnabled: primary?.writeback_enabled === true,
      }).map((capability) => ({ id: capability.id, level: capability.level, support: capability.support, scopes: capability.requiredScopes, description: capability.description, availability: capability.availability, availabilityReason: capability.availabilityReason })),
      connectEnabled: manifest.launchVisible && stage !== 'planned',
    };
  });
}
