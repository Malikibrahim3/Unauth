/**
 * Generic canonical entity upsert for the ingest API. Upserts a target row by
 * its account-scoped natural key, registers a source_records provenance row
 * pointing at the canonical entity, and emits a domain event (idempotent on the
 * caller's Idempotency-Key). Returns the Unauth id, source-record id, a
 * created/updated result, and the emitted domain event ids.
 *
 * See ARCHITECTURE.md §7.2.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertSourceRecord } from '@/lib/sources/sourceRegistry';
import { recordDomainEvent, type DomainEventType } from '@/lib/events/domainEventStore';

/** Canonical `source` value for API-ingested records (signal_source enum). */
export const API_SOURCE = 'manual';

export type EntityUpsertConfig = {
  table: string;
  sourceEntityType: string;
  canonicalEntityType: string;
  eventType: DomainEventType;
  /** onConflict target on the target table. */
  conflictTarget: string;
};

export type EntityUpsertResult = {
  id: string;
  source_record_id: string;
  result: 'created' | 'updated';
  domain_event_ids: string[];
};

export async function upsertCanonicalEntity(
  client: SupabaseClient,
  merchantId: string,
  config: EntityUpsertConfig,
  args: {
    externalId: string;
    row: Record<string, unknown>;
    sourceUrl?: string | null;
    idempotencyKey: string;
  },
): Promise<EntityUpsertResult> {
  // Determine created vs updated by checking the natural key first.
  const { data: existing } = await client
    .from(config.table)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source', API_SOURCE)
    .eq('external_id', args.externalId)
    .maybeSingle();
  const result: 'created' | 'updated' = existing ? 'updated' : 'created';

  const { data: entity, error } = await client
    .from(config.table)
    .upsert({ ...args.row, merchant_id: merchantId, source: API_SOURCE, external_id: args.externalId }, { onConflict: config.conflictTarget })
    .select('id')
    .single();
  if (error) throw new Error(`entity_upsert_failed: ${error.message}`);
  const entityId = (entity as { id: string }).id;

  const sr = await upsertSourceRecord(client, {
    merchantId,
    sourceSystem: API_SOURCE,
    sourceEntityType: config.sourceEntityType,
    externalId: args.externalId,
    canonicalEntityType: config.canonicalEntityType,
    canonicalEntityId: entityId,
    sourceUrl: args.sourceUrl ?? null,
  });

  const event = await recordDomainEvent(client, {
    merchantId,
    eventType: config.eventType,
    aggregateType: config.canonicalEntityType,
    aggregateId: entityId,
    idempotencyKey: `api:${config.sourceEntityType}:${args.idempotencyKey}`,
    sourceRecordId: (sr as { id: string }).id,
  });

  return {
    id: entityId,
    source_record_id: (sr as { id: string }).id,
    result,
    domain_event_ids: (event as { id?: string } | null)?.id ? [(event as { id: string }).id] : [],
  };
}
