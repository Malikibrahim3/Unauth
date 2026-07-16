import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveConnectorCapabilities } from '@/lib/connectors/runtime';
import { listConnectors } from '@/lib/connectors/registry';
import { getStoredIntegrationViews } from '@/lib/integrations/auth';
import { INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
import type { IntegrationAuthMode, IntegrationProvider } from '@/lib/integrations/types';
import { TABLES } from '@/lib/supabase/tables';

export type ConnectorCatalogueItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  authMode: IntegrationAuthMode;
  stage: 'live' | 'beta' | 'planned';
  status: string;
  connectionId: string | null;
  connectionCount: number;
  account: string | null;
  lastSuccessfulSyncAt: string | null;
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
  last_successful_sync_at: string | null;
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

function stageFor(provider: IntegrationProvider): ConnectorCatalogueItem['stage'] {
  if (provider.buildStatus === 'live') return 'live';
  if (provider.buildStatus === 'partial') return 'beta';
  return 'planned';
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
  const [{ data, error }, storedViews] = await Promise.all([
    client
      .from(TABLES.MERCHANT_INTEGRATIONS)
      .select('id,provider_id,status,provider_account_name,last_successful_sync_at,last_error_code,last_error_message,last_error,imported_record_count,granted_scopes,writeback_enabled,updated_at')
      .eq('merchant_id', merchantId),
    getStoredIntegrationViews(client, merchantId),
  ]);
  if (error) throw new Error(`connector_catalogue_failed: ${error.message}`);

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

    return {
      id: provider.id,
      name: provider.name,
      description: provider.description ?? 'Provider-neutral source connection.',
      category: provider.category,
      authMode: provider.authMode,
      stage: stageFor(provider),
      status,
      connectionId: primary?.id ?? null,
      connectionCount: rows.filter((row) => !['not_connected', 'revoked', 'disabled'].includes(row.status)).length
        || (ACTIVE_STATUSES.has(status) ? 1 : 0),
      account: primary?.provider_account_name ?? view?.detail ?? null,
      lastSuccessfulSyncAt: primary?.last_successful_sync_at ?? view?.lastSyncAt ?? null,
      lastError: primary
        ? publicConnectionErrorMessage(
            primary.last_error_code,
            primary.last_error_message,
            primary.last_error,
          )
        : view?.lastError ?? null,
      importedRecords: Number(primary?.imported_record_count ?? view?.importedRecordCount ?? 0),
      scopes,
      capabilities,
      connectEnabled: provider.buildStatus !== 'slot_only'
        && (Boolean(provider.setupHref) || Boolean(adapter?.manifest.launchVisible)),
    };
  });
}
