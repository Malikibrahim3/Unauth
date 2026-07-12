/**
 * Source-record registry — universal external-id / provenance mapping.
 *
 * Every imported record (from any connector, canonical webhook, API, CSV, or
 * manual entry) registers a `source_records` row linking its external id to its
 * canonical Unauth entity, with provenance and freshness. Uniqueness is scoped
 * to `(merchant_id, connection_id, source_entity_type, external_id)` so two
 * accounts of the same provider never collide.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §4.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export const SOURCE_SYNC_STATES = ['current', 'pending', 'stale', 'failed', 'deleted'] as const;
export type SourceSyncState = (typeof SOURCE_SYNC_STATES)[number];

export const SOURCE_FRESHNESS_STATES = ['fresh', 'ageing', 'stale', 'unknown'] as const;
export type SourceFreshnessState = (typeof SOURCE_FRESHNESS_STATES)[number];

/** Conflict target for source-record upserts — account/connection-scoped. */
export const SOURCE_RECORD_CONFLICT_TARGET =
  'merchant_id,connection_id,source_entity_type,external_id';

export type UpsertSourceRecordInput = {
  merchantId: string;
  connectionId?: string | null;
  sourceAccountId?: string | null;
  sourceSystem: string;
  sourceEntityType: string;
  externalId: string;
  canonicalEntityType?: string | null;
  canonicalEntityId?: string | null;
  sourceUrl?: string | null;
  sourceCreatedAt?: string | null;
  sourceUpdatedAt?: string | null;
  syncState?: SourceSyncState;
  freshnessState?: SourceFreshnessState;
  connectorVersion?: string | null;
  payloadHash?: string | null;
  sourceMetadata?: Record<string, unknown>;
};

/**
 * Upsert a source-record provenance row. Idempotent on the account-scoped
 * conflict target, so re-ingesting the same external record updates provenance
 * in place rather than duplicating.
 */
export async function upsertSourceRecord(
  client: SupabaseClient,
  input: UpsertSourceRecordInput,
) {
  const { data, error } = await client
    .from(TABLES.SOURCE_RECORDS)
    .upsert(
      {
        merchant_id: input.merchantId,
        connection_id: input.connectionId ?? null,
        source_account_id: input.sourceAccountId ?? null,
        source_system: input.sourceSystem,
        source_entity_type: input.sourceEntityType,
        external_id: input.externalId,
        canonical_entity_type: input.canonicalEntityType ?? null,
        canonical_entity_id: input.canonicalEntityId ?? null,
        source_url: input.sourceUrl ?? null,
        source_created_at: input.sourceCreatedAt ?? null,
        source_updated_at: input.sourceUpdatedAt ?? null,
        sync_state: input.syncState ?? 'current',
        freshness_state: input.freshnessState ?? 'fresh',
        connector_version: input.connectorVersion ?? null,
        payload_hash: input.payloadHash ?? null,
        source_metadata: input.sourceMetadata ?? {},
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: SOURCE_RECORD_CONFLICT_TARGET },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
