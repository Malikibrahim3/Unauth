/**
 * Resolve a record match — the single write path that turns candidates into a
 * confirmed (or rejected) relationship.
 *
 * Resolution is append-only: `record_match_resolutions` records the prior/new
 * status, the selected/rejected candidates, the resolver, and the reason. The
 * original candidate evidence is never overwritten, so a later reversal can see
 * exactly what was decided.
 *
 * See ARCHITECTURE.md for the canonical relationship and product-truth owners.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { deriveRelationshipType } from '@/lib/relationships/entityTypes';
import { getCandidate, listOpenCandidates, setCandidateStatus } from '@/lib/relationships/candidateStore';
import { upsertRelationship } from '@/lib/relationships/relationshipStore';
import type { MatchStatus } from '@/lib/relationships/matchTypes';

export type ResolveMatchInput = {
  merchantId: string;
  subjectEntityType: string;
  subjectEntityId: string;
  /** The candidate the user selected. Omit to reject all (leave unmatched). */
  selectedCandidateId?: string | null;
  reason?: string | null;
  resolvedBy?: string | null;
};

export type ResolveMatchResult = {
  status: MatchStatus;
  relationshipId: string | null;
  selectedCandidateId: string | null;
};

/**
 * Apply a user resolution to an ambiguous/probable match. Selecting a candidate
 * marks it `selected`, rejects the rest, upserts a confirmed relationship, and
 * appends the resolution + `relationship.resolved` event. Selecting none marks
 * all rejected and leaves the subject unmatched.
 */
export async function resolveMatch(
  client: SupabaseClient,
  input: ResolveMatchInput,
): Promise<ResolveMatchResult> {
  const open = await listOpenCandidates(
    client,
    input.merchantId,
    input.subjectEntityType,
    input.subjectEntityId,
  );

  const priorStatus: MatchStatus = open.length > 1 ? 'ambiguous' : open.length === 1 ? 'probable' : 'unmatched';

  let selected = null as Awaited<ReturnType<typeof getCandidate>>;
  if (input.selectedCandidateId) {
    selected = await getCandidate(client, input.merchantId, input.selectedCandidateId);
    if (
      !selected ||
      selected.subject_entity_type !== input.subjectEntityType ||
      selected.subject_entity_id !== input.subjectEntityId
    ) {
      throw new Error('candidate_not_found_for_subject');
    }
  }

  const newStatus: MatchStatus = selected ? 'confirmed' : 'unmatched';
  const resolvedAt = new Date().toISOString();

  // Mark candidate statuses: selected → selected, everything else open → rejected.
  const rejectIds = open
    .filter((c) => c.id !== input.selectedCandidateId)
    .map((c) => c.id);
  if (selected) await setCandidateStatus(client, input.merchantId, [selected.id], 'selected');
  await setCandidateStatus(client, input.merchantId, rejectIds, 'rejected');

  let relationshipId: string | null = null;
  if (selected) {
    const relationshipType = deriveRelationshipType(
      selected.subject_entity_type,
      selected.candidate_entity_type,
    );
    if (!relationshipType) {
      throw new Error(
        `no_relationship_type: ${selected.subject_entity_type}->${selected.candidate_entity_type}`,
      );
    }
    const rel = await upsertRelationship(client, {
      merchantId: input.merchantId,
      fromEntityType: selected.subject_entity_type,
      fromEntityId: selected.subject_entity_id,
      toEntityType: selected.candidate_entity_type,
      toEntityId: selected.candidate_entity_id,
      relationshipType,
      matchStatus: 'confirmed',
      matchMethod: 'manual',
      confidence: selected.confidence,
      evidence: selected.evidence,
      resolvedBy: input.resolvedBy ?? null,
      resolvedAt,
    });
    relationshipId = rel.id;
  }

  const { error } = await client.from(TABLES.RECORD_MATCH_RESOLUTIONS).insert({
    merchant_id: input.merchantId,
    subject_entity_type: input.subjectEntityType,
    subject_entity_id: input.subjectEntityId,
    selected_candidate_id: selected?.id ?? null,
    prior_status: priorStatus,
    new_status: newStatus,
    reason: input.reason ?? null,
    resolved_by: input.resolvedBy ?? null,
    resolved_at: resolvedAt,
    metadata: { rejected_candidate_ids: rejectIds },
  });
  if (error) throw new Error(`resolution_insert_failed: ${error.message}`);

  await recordDomainEvent(client, {
    merchantId: input.merchantId,
    eventType: 'relationship.resolved',
    aggregateType: input.subjectEntityType,
    aggregateId: input.subjectEntityId,
    idempotencyKey: `relationship.resolved:${input.subjectEntityType}:${input.subjectEntityId}:${resolvedAt}`,
    payload: {
      subject_entity_type: input.subjectEntityType,
      subject_entity_id: input.subjectEntityId,
      selected_candidate_id: selected?.id ?? null,
      prior_status: priorStatus,
      new_status: newStatus,
    },
    actorType: input.resolvedBy ? 'user' : 'system',
    actorId: input.resolvedBy ?? null,
    occurredAt: resolvedAt,
  });

  return { status: newStatus, relationshipId, selectedCandidateId: selected?.id ?? null };
}
