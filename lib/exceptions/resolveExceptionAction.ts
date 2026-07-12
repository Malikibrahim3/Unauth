/**
 * Resolve an exception with the merchant's decision.
 *
 * For a match-uncertainty exception, confirming/rejecting routes through
 * `resolveMatch` — the single write path that updates the connected records
 * (candidate statuses + confirmed relationship), appends the append-only
 * resolution audit, and emits a `relationship.resolved` domain event so the case,
 * financial, customer, and report projections react. The exception is then settled
 * and a `case.exception_resolved` domain event is emitted so the resolution itself
 * lands on the case timeline / audit / reports. For non-match exceptions, the
 * decision is recorded by settling with an emitted event.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getException, settleException } from '@/lib/exceptions/store';
import { resolveMatch } from '@/lib/relationships/resolveMatch';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

export type ExceptionAction = 'confirm' | 'reject' | 'resolve' | 'dismiss';

export type ResolveExceptionActionInput = {
  merchantId: string;
  exceptionId: string;
  action: ExceptionAction;
  selectedCandidateId?: string | null;
  resolution?: string | null;
  actorUserId: string;
};

export async function resolveExceptionAction(client: SupabaseClient, input: ResolveExceptionActionInput) {
  const exception = await getException(client, input.merchantId, input.exceptionId);
  if (!exception) return { ok: false as const, reason: 'not_found' };
  if (exception.status !== 'open') return { ok: false as const, reason: 'already_settled' };

  const ctx = exception.context ?? {};
  const isMatch = ctx.is_match_exception === true && typeof ctx.subject_entity_type === 'string' && typeof ctx.subject_entity_id === 'string';

  // 'confirm'/'reject' only make sense for a match exception.
  if ((input.action === 'confirm' || input.action === 'reject') && !isMatch) {
    return { ok: false as const, reason: 'not_a_match_exception' };
  }

  let matchStatus: string | null = null;
  if (isMatch && (input.action === 'confirm' || input.action === 'reject')) {
    if (input.action === 'confirm' && !input.selectedCandidateId) {
      return { ok: false as const, reason: 'candidate_required' };
    }
    try {
      const result = await resolveMatch(client, {
        merchantId: input.merchantId,
        subjectEntityType: ctx.subject_entity_type as string,
        subjectEntityId: ctx.subject_entity_id as string,
        selectedCandidateId: input.action === 'confirm' ? input.selectedCandidateId : null,
        reason: input.resolution ?? null,
        resolvedBy: input.actorUserId,
      });
      matchStatus = result.status;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (message === 'candidate_not_found_for_subject') return { ok: false as const, reason: 'candidate_required' };
      throw cause;
    }
  }

  const settleStatus: 'resolved' | 'dismissed' = input.action === 'dismiss' || input.action === 'reject' ? 'dismissed' : 'resolved';
  const settled = await settleException(client, input.merchantId, input.exceptionId, {
    status: settleStatus,
    resolution: input.resolution ?? (matchStatus ? `match ${matchStatus}` : null),
    resolvedBy: input.actorUserId,
  });
  if (!settled.ok) return settled;

  // Record the resolution on the case audit trail / reports where a case is linked.
  if (exception.support_payout_case_id) {
    await recordDomainEvent(client, {
      merchantId: input.merchantId,
      eventType: 'case.exception_resolved',
      aggregateType: 'case',
      aggregateId: exception.support_payout_case_id,
      idempotencyKey: `case.exception_resolved:${input.exceptionId}`,
      payload: { exception_id: input.exceptionId, exception_type: exception.exception_type, action: input.action, settle_status: settleStatus, match_status: matchStatus },
      actorType: 'user',
      actorId: input.actorUserId,
      handlers: ['exceptionProjection'],
    });
  }

  return { ok: true as const, exception: settled.exception, matchStatus, settleStatus };
}
