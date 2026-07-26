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

export type ExceptionListRow = {
  id: string;
  support_payout_case_id: string | null;
  exception_type: string;
  confidence: string;
  status: string;
  title: string;
  detail: string | null;
  context: Record<string, unknown> | null;
  source_system: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  priority?: string | null;
  due_at?: string | null;
  deadline_kind?: string | null;
  state_version?: number | null;
  created_at: string;
  resolved_at: string | null;
};

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
  options: { status?: string; caseId?: string; limit?: number; dueBefore?: string; dueAfter?: string; dueIsNull?: boolean } = {},
): Promise<ExceptionListRow[]> {
  async function run(selection: string, applyDeadlineFilters = true) {
    let query = client
      .from(TABLES.CASE_EXCEPTIONS)
      .select(selection)
      .eq('merchant_id', merchantId)
      .eq('status', options.status ?? 'open');
    if (options.caseId) query = query.eq('support_payout_case_id', options.caseId);
    if (applyDeadlineFilters) {
      if (options.dueBefore) query = query.lt('due_at', options.dueBefore);
      if (options.dueAfter) query = query.gte('due_at', options.dueAfter);
      if (options.dueIsNull) query = query.is('due_at', null);
    }
    return query.order('created_at', { ascending: false }).limit(options.limit ?? 100);
  }
  const extended = await run('id,support_payout_case_id,exception_type,confidence,status,title,detail,context,source_system,assigned_to,assigned_at,priority,due_at,deadline_kind,state_version,created_at,resolved_at');
  // The queue remains readable during a rolling deploy where the forward
  // migration has not reached the web process yet. New fields are optional
  // until the migration is applied; the canonical exception decision path is
  // still permission- and tenant-scoped.
  if (extended.error && /column .* does not exist|schema cache/i.test(extended.error.message)) {
    const fallback = await run('id,support_payout_case_id,exception_type,confidence,status,title,detail,context,source_system,assigned_to,assigned_at,created_at,resolved_at', false);
    if (fallback.error) throw new Error(`case_exceptions_list_failed: ${fallback.error.message}`);
    if (options.dueBefore || options.dueAfter) return [];
    return (fallback.data ?? []) as unknown as ExceptionListRow[];
  }
  if (extended.error) throw new Error(`case_exceptions_list_failed: ${extended.error.message}`);
  return (extended.data ?? []) as unknown as ExceptionListRow[];
}

/** Claim or release an exception. Assignment is intentionally separate from its
 * resolution, so a merchant can triage work without making a decision early. */
export async function assignException(
  client: SupabaseClient,
  merchantId: string,
  exceptionId: string,
  assignedTo: string | null,
) {
  const { data, error } = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .update({ assigned_to: assignedTo, assigned_at: assignedTo ? new Date().toISOString() : null })
    .eq('merchant_id', merchantId)
    .eq('id', exceptionId)
    .eq('status', 'open')
    .select('id,assigned_to,assigned_at')
    .maybeSingle();
  if (error) throw new Error(`case_exception_assign_failed: ${error.message}`);
  return data;
}

/** Resolve or dismiss an open exception. Only an open exception can be settled. */
export async function settleException(
  client: SupabaseClient,
  merchantId: string,
  exceptionId: string,
  input: { status: 'resolved' | 'dismissed'; resolution?: string | null; resolvedBy: string; expectedStateVersion?: number | null },
) {
  const rpcResult = typeof client.rpc === 'function'
    ? await client.rpc('settle_case_exception_v1', {
      p_merchant_id: merchantId,
      p_exception_id: exceptionId,
      p_status: input.status,
      p_resolution: input.resolution ?? null,
      p_resolved_by: input.resolvedBy,
      p_expected_state_version: input.expectedStateVersion ?? null,
    })
    : null;
  if (rpcResult && !rpcResult.error) {
    const payload = rpcResult.data as { exception?: { id: string; status: string; resolution: string | null } } | null;
    return payload?.exception
      ? { ok: true as const, exception: payload.exception }
      : { ok: false as const, reason: 'not_found' };
  }
  // Keep rolling deploys safe until the forward migration is applied. Only a
  // missing function/schema-cache error falls back; business conflicts from
  // the RPC remain authoritative.
  if (rpcResult && !/function .*settle_case_exception_v1|schema cache|does not exist/i.test(rpcResult.error.message)) {
    if (/already_settled/i.test(rpcResult.error.message)) return { ok: false as const, reason: 'already_settled' };
    if (/version_conflict/i.test(rpcResult.error.message)) return { ok: false as const, reason: 'version_conflict' };
    if (/not_found/i.test(rpcResult.error.message)) return { ok: false as const, reason: 'not_found' };
    throw new Error(`case_exception_settle_failed: ${rpcResult.error.message}`);
  }
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
  const extended = await client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id,support_payout_case_id,exception_type,confidence,status,title,context,state_version')
    .eq('merchant_id', merchantId)
    .eq('id', exceptionId)
    .maybeSingle();
  if (extended.error && /column .* does not exist|schema cache/i.test(extended.error.message)) {
    const fallback = await client
      .from(TABLES.CASE_EXCEPTIONS)
      .select('id,support_payout_case_id,exception_type,confidence,status,title,context')
      .eq('merchant_id', merchantId)
      .eq('id', exceptionId)
      .maybeSingle();
    if (fallback.error) throw new Error(`case_exception_get_failed: ${fallback.error.message}`);
    return fallback.data as {
      id: string; support_payout_case_id: string | null; exception_type: string;
      confidence: string; status: string; title: string; context: Record<string, unknown> | null; state_version?: number | null;
    } | null;
  }
  if (extended.error) throw new Error(`case_exception_get_failed: ${extended.error.message}`);
  return extended.data as {
    id: string; support_payout_case_id: string | null; exception_type: string;
    confidence: string; status: string; title: string; context: Record<string, unknown> | null; state_version?: number | null;
  } | null;
}

export async function countOpenExceptions(
  client: SupabaseClient,
  merchantId: string,
  options: { dueBefore?: string; dueAfter?: string; dueIsNull?: boolean } = {},
): Promise<number> {
  let query = client
    .from(TABLES.CASE_EXCEPTIONS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'open');
  if (options.dueBefore) query = query.lt('due_at', options.dueBefore);
  if (options.dueAfter) query = query.gte('due_at', options.dueAfter);
  if (options.dueIsNull) query = query.is('due_at', null);
  const { count, error } = await query;
  if (error && /column .* does not exist|schema cache/i.test(error.message)) {
    if (options.dueIsNull) {
      const fallback = await client
        .from(TABLES.CASE_EXCEPTIONS)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('status', 'open');
      if (fallback.error) throw new Error(`case_exceptions_count_failed: ${fallback.error.message}`);
      return fallback.count ?? 0;
    }
    if (options.dueBefore || options.dueAfter) return 0;
  }
  if (error) throw new Error(`case_exceptions_count_failed: ${error.message}`);
  return count ?? 0;
}
