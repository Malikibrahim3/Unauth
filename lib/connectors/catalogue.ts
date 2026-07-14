import type { SupabaseClient } from '@supabase/supabase-js';
import { listConnectors } from '@/lib/connectors/registry';
import { TABLES } from '@/lib/supabase/tables';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
import { resolveConnectorCapabilities } from '@/lib/connectors/runtime';

export type ConnectorCatalogueItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  stage: 'live' | 'beta' | 'planned';
  status: string;
  connectionId: string | null;
  connectionCount: number;
  account: string | null;
  lastSuccessfulSyncAt: string | null;
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

export function primaryConnection(rows: ConnectionRow[]): ConnectionRow | null {
  return [...rows].sort((left, right) => {
    const status = (STATUS_RANK[right.status] ?? -1) - (STATUS_RANK[left.status] ?? -1);
    if (status !== 0) return status;
    const freshness = Date.parse(right.last_successful_sync_at ?? right.updated_at) - Date.parse(left.last_successful_sync_at ?? left.updated_at);
    return Number.isFinite(freshness) ? freshness : 0;
  })[0] ?? null;
}

export async function loadConnectorCatalogue(client: SupabaseClient, merchantId: string): Promise<ConnectorCatalogueItem[]> {
  const { data, error } = await client.from(TABLES.MERCHANT_INTEGRATIONS)
    .select('id,provider_id,status,provider_account_name,last_successful_sync_at,last_error_code,last_error_message,last_error,imported_record_count,granted_scopes,writeback_enabled,updated_at')
    .eq('merchant_id', merchantId);
  if (error) throw new Error(`connector_catalogue_failed: ${error.message}`);
  const grouped = new Map<string, ConnectionRow[]>();
  for (const row of (data ?? []) as ConnectionRow[]) grouped.set(row.provider_id, [...(grouped.get(row.provider_id) ?? []), row]);

  return listConnectors().map((adapter) => {
    const manifest = adapter.manifest;
    const rows = grouped.get(manifest.id) ?? [];
    const primary = primaryConnection(rows);
    const stage = manifest.verificationStatus === 'verified' ? 'live' : manifest.verificationStatus === 'partial' ? 'beta' : 'planned';
    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description ?? 'Provider-neutral source connection.',
      category: manifest.category,
      stage,
      status: primary?.status ?? 'not_connected',
      connectionId: primary?.id ?? null,
      connectionCount: rows.filter((row) => !['not_connected', 'revoked', 'disabled'].includes(row.status)).length,
      account: primary?.provider_account_name ?? null,
      lastSuccessfulSyncAt: primary?.last_successful_sync_at ?? null,
      lastError: publicConnectionErrorMessage(primary?.last_error_code, primary?.last_error_message, primary?.last_error),
      importedRecords: Number(primary?.imported_record_count ?? 0),
      scopes: [...new Set(primary?.granted_scopes ?? [])],
      capabilities: resolveConnectorCapabilities(manifest.capabilities, {
        status: primary?.status ?? 'not_connected',
        grantedScopes: primary?.granted_scopes ?? [],
        writebackEnabled: primary?.writeback_enabled === true,
      }).map((capability) => ({ id: capability.id, level: capability.level, support: capability.support, scopes: capability.requiredScopes, description: capability.description, availability: capability.availability, availabilityReason: capability.availabilityReason })),
      connectEnabled: manifest.launchVisible && stage !== 'planned',
    };
  });
}
