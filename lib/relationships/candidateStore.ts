/**
 * Read/write access to `record_match_candidates`. Candidates are the reviewable
 * alternatives for an ambiguous (or probable) match. Recording them never
 * mutates a case FK — a user (or a strong unique match) does that through
 * `resolveMatch`.
 *
 * See ARCHITECTURE.md §8.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { CandidateStatus, MatchCandidate, MatchMethod } from '@/lib/relationships/matchTypes';

export type RecordMatchCandidateRow = {
  id: string;
  merchant_id: string;
  subject_entity_type: string;
  subject_entity_id: string;
  candidate_entity_type: string;
  candidate_entity_id: string;
  match_method: MatchMethod;
  confidence: number | null;
  status: CandidateStatus;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RecordCandidatesInput = {
  merchantId: string;
  subjectEntityType: string;
  subjectEntityId: string;
  candidates: MatchCandidate[];
};

/**
 * Persist a candidate set for a subject entity. Re-recording supersedes any
 * still-open candidates for the same subject that are not in the new set, so a
 * re-run does not leave stale open candidates behind.
 */
export async function recordCandidates(
  client: SupabaseClient,
  input: RecordCandidatesInput,
): Promise<RecordMatchCandidateRow[]> {
  if (input.candidates.length === 0) return [];

  // Supersede existing open candidates for this subject before inserting the
  // fresh set, so exactly one open generation exists at a time.
  const { error: supersedeError } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .update({ status: 'superseded' })
    .eq('merchant_id', input.merchantId)
    .eq('subject_entity_type', input.subjectEntityType)
    .eq('subject_entity_id', input.subjectEntityId)
    .eq('status', 'open');
  if (supersedeError) throw new Error(`candidate_supersede_failed: ${supersedeError.message}`);

  const { data, error } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .insert(
      input.candidates.map((c) => ({
        merchant_id: input.merchantId,
        subject_entity_type: input.subjectEntityType,
        subject_entity_id: input.subjectEntityId,
        candidate_entity_type: c.entityType,
        candidate_entity_id: c.entityId,
        match_method: c.method,
        confidence: c.confidence ?? null,
        status: 'open' as const,
        evidence: c.evidence ?? {},
      })),
    )
    .select();
  if (error) throw new Error(`candidate_insert_failed: ${error.message}`);
  return (data as RecordMatchCandidateRow[]) ?? [];
}

/** Open candidates for a subject entity. */
export async function listOpenCandidates(
  client: SupabaseClient,
  merchantId: string,
  subjectEntityType: string,
  subjectEntityId: string,
): Promise<RecordMatchCandidateRow[]> {
  const { data, error } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('subject_entity_type', subjectEntityType)
    .eq('subject_entity_id', subjectEntityId)
    .eq('status', 'open');
  if (error) throw new Error(`candidate_list_failed: ${error.message}`);
  return (data as RecordMatchCandidateRow[]) ?? [];
}

/** Load a single candidate, merchant-scoped. */
export async function getCandidate(
  client: SupabaseClient,
  merchantId: string,
  candidateId: string,
): Promise<RecordMatchCandidateRow | null> {
  const { data, error } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('id', candidateId)
    .maybeSingle();
  if (error) throw new Error(`candidate_get_failed: ${error.message}`);
  return (data as RecordMatchCandidateRow | null) ?? null;
}

/** Set the status of a set of candidates (merchant-scoped). */
export async function setCandidateStatus(
  client: SupabaseClient,
  merchantId: string,
  candidateIds: string[],
  status: CandidateStatus,
): Promise<void> {
  if (candidateIds.length === 0) return;
  const { error } = await client
    .from(TABLES.RECORD_MATCH_CANDIDATES)
    .update({ status })
    .eq('merchant_id', merchantId)
    .in('id', candidateIds);
  if (error) throw new Error(`candidate_status_update_failed: ${error.message}`);
}
