/**
 * The single case-transition service. Every case state change flows through
 * here so that:
 *   1. the transition is validated against the state machine;
 *   2. the write uses optimistic concurrency on `state_version` — concurrent
 *      transitions yield exactly one winner and one version conflict, never lost
 *      data;
 *   3. actor/reason/source are recorded;
 *   4. a `case.*` domain event is appended (the source of truth for projections);
 *   5. a compatibility `claim_events` row is preserved during migration.
 *
 * See ARCHITECTURE.md §6.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { validateCaseTransition, type CaseAxisPatch } from '@/lib/cases/stateMachine';

export class CaseVersionConflictError extends Error {
  constructor(public readonly caseId: string, public readonly expected: number) {
    super(`case_version_conflict: ${caseId} expected v${expected}`);
    this.name = 'CaseVersionConflictError';
  }
}

export class CaseTransitionRejectedError extends Error {
  constructor(public readonly rejected: string[]) {
    super(`case_transition_rejected: ${rejected.join(',')}`);
    this.name = 'CaseTransitionRejectedError';
  }
}

export class CaseClosureBlockedError extends Error {
  constructor(public readonly blockers: string[]) {
    super(`case_closure_blocked: ${blockers.join(',')}`);
    this.name = 'CaseClosureBlockedError';
  }
}

export type TransitionCaseInput = {
  merchantId: string;
  caseId: string;
  /** The version the caller last read. The write only lands if unchanged. */
  expectedVersion: number;
  patch: CaseAxisPatch;
  reason?: string | null;
  actorUserId?: string | null;
  triggeredBy?: string;
  eventType?: string;
  /** Domain-specific facts consumed by idempotent projection handlers. */
  eventPayload?: Record<string, unknown>;
  handlerNames?: string[];
  /** Stable across retries. Defaults to the deterministic case/version event key. */
  idempotencyKey?: string;
  attributes?: { assignedTo?: string | null; assignedAt?: string | null; snoozedUntil?: string | null };
  /** Legacy audit label retained while claim_events is still a compatibility projection. */
  claimEventType?: 'status_changed' | 'claim_reopened' | 'claim_snoozed' | 'claim_unsnoozed' | 'claim_assigned' | 'claim_unassigned' | 'outcome_added' | 'decision_reversed';
  claimEventDetails?: {
    previousDecision?: string | null; newDecision?: string | null;
    previousOutcome?: string | null; newOutcome?: string | null;
    metadata?: Record<string, unknown>;
  };
  allowReopen?: boolean;
  /** Allows a one-time reversal of a legacy decision that predates the decision axis. */
  allowDecisionReversal?: boolean;
  allowSnooze?: boolean;
  /** Explicitly documents a merchant override when unresolved closure blockers remain. */
  allowClosureException?: boolean;
};

export type TransitionCaseResult = {
  caseId: string;
  newVersion: number;
  status: string;
  payoutDecisionState: string;
  recoveryState: string;
  domainEventId: string | null;
};

type CaseRow = {
  status: string;
  payout_decision_state: string;
  recovery_state: string;
  state_version: number;
};

export async function transitionCase(
  client: SupabaseClient,
  input: TransitionCaseInput,
): Promise<TransitionCaseResult> {
  const { data: current, error: readError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('status, payout_decision_state, recovery_state, state_version')
    .eq('merchant_id', input.merchantId)
    .eq('id', input.caseId)
    .maybeSingle();
  if (readError) throw new Error(`case_read_failed: ${readError.message}`);
  if (!current) throw new Error('case_not_found');

  const row = current as CaseRow;
  const currentVersion = row.state_version ?? 1;
  if (currentVersion !== input.expectedVersion) {
    throw new CaseVersionConflictError(input.caseId, input.expectedVersion);
  }

  const check = validateCaseTransition(
    {
      status: row.status,
      payoutDecisionState: row.payout_decision_state ?? 'undecided',
      recoveryState: row.recovery_state ?? 'no_recovery_needed',
    },
    input.patch,
    { allowReopen: input.allowReopen, allowDecisionReversal: input.allowDecisionReversal, allowSnooze: input.allowSnooze },
  );
  if (!check.ok) throw new CaseTransitionRejectedError(check.rejected);

  const eventType = input.eventType ?? 'case.updated';
  const nextVersion = currentVersion + 1;
  const rpcPatch: Record<string, unknown> = {};
  if (input.patch.status !== undefined) rpcPatch.status = input.patch.status;
  if (input.patch.payoutDecisionState !== undefined) rpcPatch.payout_decision_state = input.patch.payoutDecisionState;
  if (input.patch.recoveryState !== undefined) rpcPatch.recovery_state = input.patch.recoveryState;
  if (input.attributes?.assignedTo !== undefined) rpcPatch.assigned_to = input.attributes.assignedTo;
  if (input.attributes?.assignedAt !== undefined) rpcPatch.assigned_at = input.attributes.assignedAt;
  if (input.attributes?.snoozedUntil !== undefined) rpcPatch.snoozed_until = input.attributes.snoozedUntil;

  // The row update, immutable compatibility event, and domain-event outbox row
  // are one PostgreSQL transaction. A successful mutation can no longer lose
  // its projection work if a later network request fails.
  const { data, error } = await client.rpc('transition_payout_case', {
    p_merchant_id: input.merchantId,
    p_case_id: input.caseId,
    p_expected_version: input.expectedVersion,
    p_patch: rpcPatch,
    p_reason: input.reason ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_triggered_by: input.triggeredBy ?? 'system',
    p_event_type: eventType,
    p_event_payload: input.eventPayload ?? {},
    p_handler_names: input.handlerNames ?? [
      'financialProjection',
      'lossProjection',
      'recoveryProjection',
      'customerProjection',
      'caseProjection',
      'notificationProjection',
      'auditTimelineProjection',
    ],
    p_claim_event_type: input.claimEventType ?? 'status_changed',
    p_claim_event_metadata: {
      previous_decision: input.claimEventDetails?.previousDecision ?? null,
      new_decision: input.claimEventDetails?.newDecision ?? null,
      previous_outcome: input.claimEventDetails?.previousOutcome ?? null,
      new_outcome: input.claimEventDetails?.newOutcome ?? null,
      ...input.claimEventDetails?.metadata,
    },
    p_idempotency_key: input.idempotencyKey ?? `${eventType}:${input.caseId}:v${nextVersion}`,
    p_allow_reopen: input.allowReopen ?? false,
    p_allow_decision_reversal: input.allowDecisionReversal ?? false,
    p_allow_snooze: input.allowSnooze ?? false,
    p_allow_closure_exception: input.allowClosureException ?? false,
  });
  if (error) {
    if (error.message.includes('case_version_conflict') || error.code === '40001') {
      throw new CaseVersionConflictError(input.caseId, input.expectedVersion);
    }
    if (error.message.includes('case_transition_rejected')) {
      const axis = error.message.split(':').at(-1) ?? 'unknown';
      throw new CaseTransitionRejectedError([axis]);
    }
    if (error.message.includes('case_closure_blocked')) {
      const blockerText = error.message.split('case_closure_blocked:').at(-1) ?? 'unknown';
      throw new CaseClosureBlockedError(blockerText.split(',').map((value) => value.trim()).filter(Boolean));
    }
    throw new Error(`case_transition_failed: ${error.message}`);
  }
  const result = data as {
    case_id: string;
    new_version: number;
    status: string;
    payout_decision_state: string;
    recovery_state: string;
    domain_event_id: string | null;
  };

  return {
    caseId: result.case_id,
    newVersion: result.new_version,
    status: result.status,
    payoutDecisionState: result.payout_decision_state,
    recoveryState: result.recovery_state,
    domainEventId: result.domain_event_id,
  };
}
