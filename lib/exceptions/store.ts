/**
 * Phase 12 exception queue.
 *
 * Automatic pipelines (matching, projections, scheduled reconciliation) raise
 * exceptions instead of guessing when a match is only probable or when sources
 * conflict / are insufficient. The merchant resolves the specific missing decision;
 * they never rebuild the case. Raising is idempotent on `dedupKey`, so live
 * delivery and reconciliation sweeps converge rather than duplicating.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';

export const EXCEPTION_TYPES = [
  'unmatched_refund', 'ambiguous_replacement', 'conflicting_financials',
  'match_uncertainty', 'missing_recovery_result', 'stale_source_data',
  'responsibility_judgement', 'unsupported_external_outcome', 'write_off_reason',
  'policy_override', 'other',
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const raiseExceptionSchema = z.object({
  supportPayoutCaseId: z.string().uuid().nullable().optional(),
  exceptionType: z.enum(EXCEPTION_TYPES),
  confidence: z.enum(['probable', 'unknown']).default('probable'),
  title: z.string().trim().min(1).max(240),
  detail: z.string().trim().max(4000).nullable().optional(),
  context: z.record(z.unknown()).default({}),
  subjectEntityType: z.string().trim().max(80).nullable().optional(),
  subjectEntityId: z.string().trim().max(240).nullable().optional(),
  sourceSystem: z.string().trim().max(80).nullable().optional(),
  dedupKey: z.string().trim().min(1).max(400),
});

export type RaiseExceptionInput = z.input<typeof raiseExceptionSchema>;

/**
 * Raise (or no-op re-raise of) an exception. Idempotent on (merchant_id, dedupKey):
 * a repeat with an already-open row returns the existing row unchanged; a repeat of
 * a resolved/dismissed row does NOT reopen it (a settled decision stays settled).
 */
export async function raiseException(client: SupabaseClient, merchantId: string, input: RaiseExceptionInput) {
  const parsed = raiseExceptionSchema.parse(input);
  const { data: existing, error: readError } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,status')
    .eq('merchant_id', merchantId)
    .eq('dedup_key', parsed.dedupKey)
    .maybeSingle();
  if (readError) throw new Error(`case_exception_read_failed: ${readError.message}`);
  if (existing) return { created: false as const, id: existing.id as string, status: existing.status as string };

  const { data, error } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .insert({
      merchant_id: merchantId,
      support_payout_case_id: parsed.supportPayoutCaseId ?? null,
      exception_type: parsed.exceptionType,
      confidence: parsed.confidence,
      title: parsed.title,
      detail: parsed.detail ?? null,
      context: parsed.context,
      subject_entity_type: parsed.subjectEntityType ?? null,
      subject_entity_id: parsed.subjectEntityId ?? null,
      source_system: parsed.sourceSystem ?? null,
      dedup_key: parsed.dedupKey,
    })
    .select('id,status')
    .single();
  // A concurrent raise can race the unique index; treat the conflict as a no-op.
  if (error) {
    if (error.code === '23505') return { created: false as const, id: null, status: 'open' as const };
    throw new Error(`case_exception_raise_failed: ${error.message}`);
  }
  return { created: true as const, id: data.id as string, status: data.status as string };
}

export async function listExceptions(
  client: SupabaseClient,
  merchantId: string,
  options: { status?: string; caseId?: string; limit?: number } = {},
) {
  let query = client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,support_payout_case_id,exception_type,confidence,status,title,detail,context,source_system,created_at,resolved_at')
    .eq('merchant_id', merchantId);
  query = query.eq('status', options.status ?? 'open');
  if (options.caseId) query = query.eq('support_payout_case_id', options.caseId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(options.limit ?? 100);
  if (error) throw new Error(`case_exceptions_list_failed: ${error.message}`);
  return data ?? [];
}

/** Resolve or dismiss an open exception. Only an open exception can be settled. */
export async function settleException(
  client: SupabaseClient,
  merchantId: string,
  exceptionId: string,
  input: { status: 'resolved' | 'dismissed'; resolution?: string | null; resolvedBy: string },
) {
  const { data: existing, error: readError } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,status')
    .eq('merchant_id', merchantId)
    .eq('id', exceptionId)
    .maybeSingle();
  if (readError) throw new Error(`case_exception_read_failed: ${readError.message}`);
  if (!existing) return { ok: false as const, reason: 'not_found' };
  if (existing.status !== 'open') return { ok: false as const, reason: 'already_settled' };

  const { data, error } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .update({ status: input.status, resolution: input.resolution ?? null, resolved_by: input.resolvedBy, resolved_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('id', exceptionId)
    .select('id,status,resolution')
    .single();
  if (error) throw new Error(`case_exception_settle_failed: ${error.message}`);
  return { ok: true as const, exception: data };
}

export async function getException(client: SupabaseClient, merchantId: string, exceptionId: string) {
  const { data, error } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,support_payout_case_id,exception_type,confidence,status,title,context')
    .eq('merchant_id', merchantId)
    .eq('id', exceptionId)
    .maybeSingle();
  if (error) throw new Error(`case_exception_get_failed: ${error.message}`);
  return data as {
    id: string; support_payout_case_id: string | null; exception_type: string;
    confidence: string; status: string; title: string; context: Record<string, unknown> | null;
  } | null;
}

export async function countOpenExceptions(client: SupabaseClient, merchantId: string): Promise<number> {
  const { count, error } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'open');
  if (error) throw new Error(`case_exceptions_count_failed: ${error.message}`);
  return count ?? 0;
}
