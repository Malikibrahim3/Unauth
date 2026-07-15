/**
 * Persist a derived match result for a subject entity.
 *
 * The persistence rules enforce the safety contract:
 *   - confirmed: upsert the confirmed relationship, emit `relationship.confirmed`.
 *   - probable:  record the single candidate and a probable relationship
 *                (display only), emit `relationship.ambiguous` (needs review).
 *                Callers must not treat a probable link as a case FK.
 *   - ambiguous: record all candidates, emit `relationship.ambiguous`. No edge.
 *   - unmatched: nothing to persist.
 *
 * See ARCHITECTURE.md §8.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { recordCandidates } from '@/lib/relationships/candidateStore';
import { upsertRelationship } from '@/lib/relationships/relationshipStore';
import { deriveRelationshipType } from '@/lib/relationships/entityTypes';
import type { MatchResult } from '@/lib/relationships/matchTypes';

export type ApplyMatchInput = {
  merchantId: string;
  subjectEntityType: string;
  subjectEntityId: string;
  result: MatchResult;
  actorId?: string | null;
  actorType?: string;
};

export type ApplyMatchOutcome = {
  status: MatchResult['status'];
  relationshipId: string | null;
  candidateIds: string[];
};

export async function applyMatch(
  client: SupabaseClient,
  input: ApplyMatchInput,
): Promise<ApplyMatchOutcome> {
  const { merchantId, subjectEntityType, subjectEntityId, result } = input;

  if (result.status === 'unmatched') {
    return { status: 'unmatched', relationshipId: null, candidateIds: [] };
  }

  if (result.status === 'confirmed' && result.selected) {
    const c = result.selected;
    const relationshipType = deriveRelationshipType(subjectEntityType, c.entityType);
    if (!relationshipType) {
      throw new Error(`no_relationship_type: ${subjectEntityType}->${c.entityType}`);
    }
    const rel = await upsertRelationship(client, {
      merchantId,
      fromEntityType: subjectEntityType,
      fromEntityId: subjectEntityId,
      toEntityType: c.entityType,
      toEntityId: c.entityId,
      relationshipType,
      matchStatus: 'confirmed',
      matchMethod: c.method,
      confidence: c.confidence ?? null,
      evidence: c.evidence ?? {},
    });
    await recordDomainEvent(client, {
      merchantId,
      eventType: 'relationship.confirmed',
      aggregateType: subjectEntityType,
      aggregateId: subjectEntityId,
      idempotencyKey: `relationship.confirmed:${subjectEntityType}:${subjectEntityId}:${c.entityType}:${c.entityId}`,
      payload: {
        subject_entity_type: subjectEntityType,
        subject_entity_id: subjectEntityId,
        to_entity_type: c.entityType,
        to_entity_id: c.entityId,
        match_method: c.method,
      },
      actorType: input.actorType ?? (input.actorId ? 'user' : 'system'),
      actorId: input.actorId ?? null,
    });
    return { status: 'confirmed', relationshipId: rel.id, candidateIds: [] };
  }

  // probable or ambiguous → record candidates for review, emit ambiguous event.
  const rows = await recordCandidates(client, {
    merchantId,
    subjectEntityType,
    subjectEntityId,
    candidates: result.candidates,
  });

  let relationshipId: string | null = null;
  if (result.status === 'probable' && result.selected) {
    const c = result.selected;
    const relationshipType = deriveRelationshipType(subjectEntityType, c.entityType);
    if (relationshipType) {
      const rel = await upsertRelationship(client, {
        merchantId,
        fromEntityType: subjectEntityType,
        fromEntityId: subjectEntityId,
        toEntityType: c.entityType,
        toEntityId: c.entityId,
        relationshipType,
        matchStatus: 'probable',
        matchMethod: c.method,
        confidence: c.confidence ?? null,
        evidence: c.evidence ?? {},
      });
      relationshipId = rel.id;
    }
  }

  await recordDomainEvent(client, {
    merchantId,
    eventType: 'relationship.ambiguous',
    aggregateType: subjectEntityType,
    aggregateId: subjectEntityId,
    idempotencyKey: `relationship.ambiguous:${subjectEntityType}:${subjectEntityId}:${rows.map((r) => r.id).join(',')}`,
    payload: {
      subject_entity_type: subjectEntityType,
      subject_entity_id: subjectEntityId,
      status: result.status,
      candidate_count: result.candidates.length,
    },
    actorType: input.actorType ?? 'system',
    actorId: input.actorId ?? null,
  });

  return { status: result.status, relationshipId, candidateIds: rows.map((r) => r.id) };
}
