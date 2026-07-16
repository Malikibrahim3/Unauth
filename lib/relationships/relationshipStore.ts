/**
 * Read/write access to `entity_relationships` — the merchant-scoped product
 * graph. Every query is merchant-scoped. Writes go through the validated
 * entity/relationship-type guards so the free-text columns stay honest.
 *
 * See ARCHITECTURE.md §2.3 and §8.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { assertEntityType, assertRelationshipType } from '@/lib/relationships/entityTypes';
import type { MatchMethod, MatchStatus } from '@/lib/relationships/matchTypes';

/** Directed relationship, upserted on the natural key. */
export type UpsertRelationshipInput = {
  merchantId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationshipType: string;
  matchStatus: MatchStatus;
  matchMethod?: MatchMethod | null;
  confidence?: number | null;
  evidence?: Record<string, unknown>;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
};

export const RELATIONSHIP_CONFLICT_TARGET =
  'merchant_id,from_entity_type,from_entity_id,to_entity_type,to_entity_id,relationship_type';

export type EntityRelationshipRow = {
  id: string;
  merchant_id: string;
  from_entity_type: string;
  from_entity_id: string;
  to_entity_type: string;
  to_entity_id: string;
  relationship_type: string;
  match_status: MatchStatus;
  match_method: MatchMethod | null;
  confidence: number | null;
  evidence: Record<string, unknown>;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Upsert a directed relationship. Idempotent on the natural key, so re-running
 * a matcher updates status/method in place rather than duplicating an edge.
 */
export async function upsertRelationship(
  client: SupabaseClient,
  input: UpsertRelationshipInput,
): Promise<EntityRelationshipRow> {
  assertEntityType(input.fromEntityType);
  assertEntityType(input.toEntityType);
  assertRelationshipType(input.relationshipType);

  const { data, error } = await client
    .from(TABLES.ENTITY_RELATIONSHIPS)
    .upsert(
      {
        merchant_id: input.merchantId,
        from_entity_type: input.fromEntityType,
        from_entity_id: input.fromEntityId,
        to_entity_type: input.toEntityType,
        to_entity_id: input.toEntityId,
        relationship_type: input.relationshipType,
        match_status: input.matchStatus,
        match_method: input.matchMethod ?? null,
        confidence: input.confidence ?? null,
        evidence: input.evidence ?? {},
        resolved_by: input.resolvedBy ?? null,
        resolved_at: input.resolvedAt ?? null,
      },
      { onConflict: RELATIONSHIP_CONFLICT_TARGET },
    )
    .select()
    .single();
  if (error) throw new Error(`relationship_upsert_failed: ${error.message}`);
  return data as EntityRelationshipRow;
}

/** All relationships where the given entity is on the `from` side. */
export async function listRelationshipsFrom(
  client: SupabaseClient,
  merchantId: string,
  fromEntityType: string,
  fromEntityId: string,
): Promise<EntityRelationshipRow[]> {
  const { data, error } = await client
    .from(TABLES.ENTITY_RELATIONSHIPS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('from_entity_type', fromEntityType)
    .eq('from_entity_id', fromEntityId);
  if (error) throw new Error(`relationship_list_failed: ${error.message}`);
  return (data as EntityRelationshipRow[]) ?? [];
}

/** All relationships touching an entity on either end (merchant-scoped). */
export async function listRelationshipsForEntity(
  client: SupabaseClient,
  merchantId: string,
  entityType: string,
  entityId: string,
): Promise<EntityRelationshipRow[]> {
  const { data, error } = await client
    .from(TABLES.ENTITY_RELATIONSHIPS)
    .select('*')
    .eq('merchant_id', merchantId)
    .or(
      `and(from_entity_type.eq.${entityType},from_entity_id.eq.${entityId}),` +
        `and(to_entity_type.eq.${entityType},to_entity_id.eq.${entityId})`,
    );
  if (error) throw new Error(`relationship_list_failed: ${error.message}`);
  return (data as EntityRelationshipRow[]) ?? [];
}
