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
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §6.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { appendClaimEvent } from '@/lib/claims/events';
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

  const nextVersion = currentVersion + 1;
  const patchRow: Record<string, unknown> = {
    state_version: nextVersion,
    updated_at: new Date().toISOString(),
  };
  if (input.patch.status !== undefined) patchRow.status = input.patch.status;
  if (input.patch.payoutDecisionState !== undefined) patchRow.payout_decision_state = input.patch.payoutDecisionState;
  if (input.patch.recoveryState !== undefined) patchRow.recovery_state = input.patch.recoveryState;
  if (input.attributes?.assignedTo !== undefined) patchRow.assigned_to = input.attributes.assignedTo;
  if (input.attributes?.assignedAt !== undefined) patchRow.assigned_at = input.attributes.assignedAt;
  if (input.attributes?.snoozedUntil !== undefined) patchRow.snoozed_until = input.attributes.snoozedUntil;

  // Optimistic concurrency: the update only matches while state_version is
  // still the version we validated. A racing transition bumps it first and this
  // update touches zero rows → version conflict.
  let writeQuery = client
    .from(TABLES.MERCHANT_CLAIMS)
    .update(patchRow)
    .eq('merchant_id', input.merchantId)
    .eq('id', input.caseId);
  // Rows created before the foundation migration are upgraded on first write.
  // All migrated/live rows take the strict compare-and-swap path.
  if (row.state_version != null) writeQuery = writeQuery.eq('state_version', input.expectedVersion);
  const { data: updated, error: writeError } = await writeQuery
    .select('status, payout_decision_state, recovery_state, state_version')
    .maybeSingle();
  if (writeError) throw new Error(`case_write_failed: ${writeError.message}`);
  if (!updated) throw new CaseVersionConflictError(input.caseId, input.expectedVersion);

  const next = updated as CaseRow;
  const eventType = input.eventType ?? 'case.updated';
  const occurredAt = new Date().toISOString();

  const domainEventId = (await recordDomainEvent(client, {
    merchantId: input.merchantId,
    eventType,
    aggregateType: 'case',
    aggregateId: input.caseId,
    idempotencyKey: `${eventType}:${input.caseId}:v${nextVersion}`,
    payload: {
      case_id: input.caseId,
      from_version: input.expectedVersion,
      to_version: nextVersion,
      patch: input.patch,
      reason: input.reason ?? null,
      ...input.eventPayload,
    },
    actorType: input.actorUserId ? 'user' : 'system',
    actorId: input.actorUserId ?? null,
    occurredAt,
    handlers: input.handlerNames ?? [
      'financialProjection',
      'lossProjection',
      'recoveryProjection',
      'customerProjection',
      'caseProjection',
      'notificationProjection',
    ],
  })) as string | null;

  // Compatibility audit row (removed in a later phase once readers migrate).
  await appendClaimEvent(client, {
    claim_id: input.caseId,
    merchant_id: input.merchantId,
    event_type: input.claimEventType ?? 'status_changed',
    previous_status: row.status,
    new_status: next.status,
    note: input.reason ?? null,
    actor_user_id: input.actorUserId ?? null,
    triggered_by: input.triggeredBy ?? 'system',
    previous_decision: input.claimEventDetails?.previousDecision ?? null,
    new_decision: input.claimEventDetails?.newDecision ?? null,
    previous_outcome: input.claimEventDetails?.previousOutcome ?? null,
    new_outcome: input.claimEventDetails?.newOutcome ?? null,
    metadata: {
      state_version: nextVersion,
      domain_event_id: domainEventId,
      ...input.claimEventDetails?.metadata,
    },
  });

  return {
    caseId: input.caseId,
    newVersion: next.state_version,
    status: next.status,
    payoutDecisionState: next.payout_decision_state ?? row.payout_decision_state ?? 'undecided',
    recoveryState: next.recovery_state ?? row.recovery_state ?? 'no_recovery_needed',
    domainEventId,
  };
}
