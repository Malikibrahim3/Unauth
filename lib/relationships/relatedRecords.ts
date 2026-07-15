/**
 * Read model for the Related Records panel. Merges confirmed/probable
 * relationships and still-open match candidates for a subject entity into one
 * merchant-scoped list, annotated with each record's source system and
 * freshness (from `source_records` where available).
 *
 * See ARCHITECTURE.md §8.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { listRelationshipsFrom } from '@/lib/relationships/relationshipStore';
import { listOpenCandidates } from '@/lib/relationships/candidateStore';
import type { MatchMethod, MatchStatus } from '@/lib/relationships/matchTypes';

export type RelatedRecord = {
  entityType: string;
  entityId: string;
  relationshipType: string | null;
  matchStatus: MatchStatus;
  matchMethod: MatchMethod | null;
  confidence: number | null;
  sourceSystem: string | null;
  sourceUrl: string | null;
  freshness: string | null;
  lastSyncedAt: string | null;
  /** Candidate id when this row is an unresolved candidate rather than an edge. */
  candidateId: string | null;
};

type ProvenanceRow = {
  canonical_entity_type: string | null;
  canonical_entity_id: string | null;
  source_system: string | null;
  source_url: string | null;
  freshness_state: string | null;
  last_synced_at: string | null;
};

async function loadProvenance(
  client: SupabaseClient,
  merchantId: string,
  ids: string[],
): Promise<Map<string, ProvenanceRow>> {
  const map = new Map<string, ProvenanceRow>();
  if (ids.length === 0) return map;
  const { data, error } = await client
    .from(TABLES.SOURCE_RECORDS)
    .select('canonical_entity_type, canonical_entity_id, source_system, source_url, freshness_state, last_synced_at')
    .eq('merchant_id', merchantId)
    .in('canonical_entity_id', ids);
  if (error) throw new Error(`provenance_lookup_failed: ${error.message}`);
  for (const row of (data as ProvenanceRow[] | null) ?? []) {
    if (row.canonical_entity_id) map.set(row.canonical_entity_id, row);
  }
  return map;
}

/**
 * All related records for a subject entity: confirmed/probable edges plus open
 * candidates that still need resolution.
 */
export async function getRelatedRecords(
  client: SupabaseClient,
  merchantId: string,
  subjectEntityType: string,
  subjectEntityId: string,
): Promise<RelatedRecord[]> {
  const [edges, candidates] = await Promise.all([
    listRelationshipsFrom(client, merchantId, subjectEntityType, subjectEntityId),
    listOpenCandidates(client, merchantId, subjectEntityType, subjectEntityId),
  ]);

  const ids = new Set<string>();
  for (const e of edges) ids.add(e.to_entity_id);
  for (const c of candidates) ids.add(c.candidate_entity_id);
  const provenance = await loadProvenance(client, merchantId, [...ids]);

  const rows: RelatedRecord[] = [];

  for (const e of edges) {
    const p = provenance.get(e.to_entity_id);
    rows.push({
      entityType: e.to_entity_type,
      entityId: e.to_entity_id,
      relationshipType: e.relationship_type,
      matchStatus: e.match_status,
      matchMethod: e.match_method,
      confidence: e.confidence,
      sourceSystem: p?.source_system ?? null,
      sourceUrl: p?.source_url ?? null,
      freshness: p?.freshness_state ?? null,
      lastSyncedAt: p?.last_synced_at ?? null,
      candidateId: null,
    });
  }

  for (const c of candidates) {
    const p = provenance.get(c.candidate_entity_id);
    rows.push({
      entityType: c.candidate_entity_type,
      entityId: c.candidate_entity_id,
      relationshipType: null,
      matchStatus: 'ambiguous',
      matchMethod: c.match_method,
      confidence: c.confidence,
      sourceSystem: p?.source_system ?? null,
      sourceUrl: p?.source_url ?? null,
      freshness: p?.freshness_state ?? null,
      lastSyncedAt: p?.last_synced_at ?? null,
      candidateId: c.id,
    });
  }

  return rows;
}
