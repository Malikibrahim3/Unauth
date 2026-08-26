import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEventHandler, DomainEventRecord } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';

export type WorkProjectionIntent = {
  key: string;
  taskKind:
    | 'evidence_gap'
    | 'investigation'
    | 'decision'
    | 'external_handoff'
    | 'external_outcome'
    | 'recovery_deadline'
    | 'provider_chase'
    | 'source_failure';
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'blocked' | 'completed';
  waitingParty: string | null;
  dueAt: string | null;
  caseId: string | null;
  recoveryCaseId: string | null;
  ownerUserId: string | null;
  metadata: Record<string, unknown>;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function datePlusDays(event: DomainEventRecord, days: number): string {
  const base = Date.parse(event.occurred_at ?? event.recorded_at ?? '');
  return new Date((Number.isFinite(base) ? base : Date.now()) + days * 86_400_000).toISOString();
}

function ids(event: DomainEventRecord) {
  const payload = event.payload ?? {};
  const caseId = text(payload.case_id)
    ?? text(payload.support_payout_case_id)
    ?? (event.aggregate_type === 'case' || event.aggregate_type === 'support_payout_case' ? event.aggregate_id : null);
  const investigationId = text(payload.investigation_id)
    ?? (event.aggregate_type === 'case_investigation' ? event.aggregate_id : null);
  const recoveryCaseId = text(payload.recovery_case_id)
    ?? (event.aggregate_type === 'recovery' || event.aggregate_type === 'recovery_case' ? event.aggregate_id : null);
  const actionId = text(payload.action_id)
    ?? (event.aggregate_type === 'external_action' ? event.aggregate_id : null);
  const connectionId = text(payload.connection_id)
    ?? (event.aggregate_type === 'connection' ? event.aggregate_id : null);
  return { payload, caseId, investigationId, recoveryCaseId, actionId, connectionId };
}

export function workIntentForEvent(event: DomainEventRecord): WorkProjectionIntent | null {
  const { payload, caseId, investigationId, recoveryCaseId, actionId, connectionId } = ids(event);
  const actorUserId = event.actor_type === 'user' ? text(event.actor_id) : null;

  if (event.event_type === 'case.created' && caseId) {
    return {
      key: `case:${caseId}:next-decision`,
      taskKind: 'evidence_gap',
      title: 'Review case evidence',
      description: 'Confirm the material source facts and open a targeted investigation when a critical fact is missing.',
      priority: 'high',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: text(payload.due_at),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: {},
    };
  }
  if (event.event_type === 'investigation.created' && caseId && investigationId) {
    return {
      key: `investigation:${investigationId}:send`,
      taskKind: 'investigation',
      title: 'Send investigation request',
      description: 'Review the material question, recipient and evidence scope before recording or sending the request.',
      priority: 'high',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: text(payload.due_at),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: { investigation_id: investigationId },
    };
  }
  if (event.event_type === 'investigation.send_failed' && caseId && investigationId) {
    return {
      key: `investigation:${investigationId}:send`,
      taskKind: 'investigation',
      title: 'Retry failed investigation send',
      description: text(payload.error) ?? 'The investigation request was not delivered. Review the failure and retry safely.',
      priority: 'urgent',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: datePlusDays(event, 1),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: { investigation_id: investigationId, retry_required: true },
    };
  }
  if (event.event_type === 'investigation.response_recorded' && caseId && investigationId) {
    return {
      key: `case:${caseId}:next-decision`,
      taskKind: 'decision',
      title: 'Review investigation response',
      description: 'Re-evaluate the source-backed recommendation. A response never changes an existing merchant decision automatically.',
      priority: 'high',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: datePlusDays(event, 1),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: { investigation_id: investigationId },
    };
  }
  if (event.event_type === 'external_action.handoff_ready' && caseId && actionId) {
    return {
      key: `external-action:${actionId}`,
      taskKind: 'external_handoff',
      title: 'Complete external provider handoff',
      description: 'Use the exact provider record and scope in the Case file, then record the attempt. Unauth has not moved money or contacted the customer.',
      priority: 'high',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: datePlusDays(event, 1),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: {
        external_action_id: actionId,
        external_action_state_version: Number(payload.state_version ?? 1),
      },
    };
  }
  if (
    ['external_action.merchant_reported_attempt', 'external_action.source_observed_attempt', 'external_action.provider_accepted', 'external_action.provider_processing'].includes(event.event_type)
    && caseId && actionId
  ) {
    return {
      key: `external-action:${actionId}`,
      taskKind: 'external_outcome',
      title: 'Monitor external provider outcome',
      description: 'The provider outcome is not final. Keep this item owned until the source reports success, failure or an indeterminate result.',
      priority: 'medium',
      status: 'blocked',
      waitingParty: 'provider',
      dueAt: datePlusDays(event, 3),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: {
        external_action_id: actionId,
        external_action_state_version: Number(payload.state_version ?? 1),
      },
    };
  }
  if (['external_action.failed', 'external_action.indeterminate'].includes(event.event_type) && caseId && actionId) {
    return {
      key: `external-action:${actionId}`,
      taskKind: 'external_outcome',
      title: event.event_type.endsWith('failed') ? 'Retry failed external handoff' : 'Clarify indeterminate external outcome',
      description: text(payload.provider_error) ?? 'The external outcome is unresolved. Inspect source evidence before retrying or recording a correction.',
      priority: 'urgent',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: datePlusDays(event, 1),
      caseId,
      recoveryCaseId: null,
      ownerUserId: actorUserId,
      metadata: {
        external_action_id: actionId,
        external_action_state_version: Number(payload.state_version ?? 1),
        retry_required: true,
      },
    };
  }
  if (event.event_type === 'recovery.created' && recoveryCaseId) {
    return {
      key: `recovery:${recoveryCaseId}:readiness`,
      taskKind: 'recovery_deadline',
      title: 'Complete recovery evidence gates',
      description: 'Resolve every applicable critical gate before preparing the provider-specific submission pack.',
      priority: 'high',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: text(payload.deadline_at),
      caseId,
      recoveryCaseId,
      ownerUserId: actorUserId,
      metadata: {},
    };
  }
  if (event.event_type === 'recovery.submitted' && recoveryCaseId) {
    return {
      key: `recovery:${recoveryCaseId}:provider-chase`,
      taskKind: 'provider_chase',
      title: 'Chase provider recovery response',
      description: 'The submission is recorded, but provider acceptance and received value remain separate future facts.',
      priority: 'medium',
      status: 'blocked',
      waitingParty: 'provider',
      dueAt: text(payload.response_due_at) ?? datePlusDays(event, 7),
      caseId,
      recoveryCaseId,
      ownerUserId: actorUserId,
      metadata: {},
    };
  }
  if (event.event_type === 'connection.sync_failed' && connectionId) {
    return {
      key: `connection:${connectionId}:repair`,
      taskKind: 'source_failure',
      title: 'Repair failed source sync',
      description: text(payload.error) ?? 'The source sync failed. Reauthorise or retry without erasing retained history.',
      priority: 'urgent',
      status: 'open',
      waitingParty: 'merchant',
      dueAt: datePlusDays(event, 1),
      caseId: null,
      recoveryCaseId: null,
      ownerUserId: null,
      metadata: { connection_id: connectionId, provider: text(payload.provider) },
    };
  }
  return null;
}

function terminalKey(event: DomainEventRecord): string | null {
  const { caseId, investigationId, recoveryCaseId, actionId, connectionId } = ids(event);
  if (event.event_type === 'case.decision_recorded' && caseId) return `case:${caseId}:next-decision`;
  if (event.event_type === 'investigation.sent' && investigationId) return `investigation:${investigationId}:send`;
  if (['external_action.succeeded', 'external_action.reconciled'].includes(event.event_type) && actionId) return `external-action:${actionId}`;
  if (event.event_type === 'recovery.completed' && recoveryCaseId) return `recovery:${recoveryCaseId}:provider-chase`;
  if (event.event_type === 'connection.sync_completed' && connectionId) return `connection:${connectionId}:repair`;
  return null;
}

async function completeProjectedTask(client: SupabaseClient, event: DomainEventRecord, key: string) {
  const { data, error } = await client
    .from(TABLES.WORK_TASKS)
    .select('id,status')
    .eq('merchant_id', event.merchant_id)
    .contains('source_metadata', { migration_key: key })
    .maybeSingle();
  if (error) throw new Error(`work_projection_complete_lookup_failed:${error.message}`);
  if (!data || ['completed', 'cancelled'].includes(data.status)) return false;
  const { error: updateError } = await client
    .from(TABLES.WORK_TASKS)
    .update({
      status: 'completed',
      completed_at: event.occurred_at ?? new Date().toISOString(),
      completed_by: event.actor_type === 'user' ? event.actor_id : null,
      completion_outcome: { domain_event_id: event.id, event_type: event.event_type },
      snoozed_until: null,
    })
    .eq('merchant_id', event.merchant_id)
    .eq('id', data.id);
  if (updateError) throw new Error(`work_projection_complete_failed:${updateError.message}`);
  return true;
}

async function upsertProjectedTask(client: SupabaseClient, event: DomainEventRecord, intent: WorkProjectionIntent) {
  const { data: existing, error: lookupError } = await client
    .from(TABLES.WORK_TASKS)
    .select('id')
    .eq('merchant_id', event.merchant_id)
    .contains('source_metadata', { migration_key: intent.key })
    .maybeSingle();
  if (lookupError) throw new Error(`work_projection_lookup_failed:${lookupError.message}`);
  const row: Record<string, unknown> = {
    title: intent.title,
    description: intent.description,
    owner_user_id: intent.ownerUserId,
    owner_role: intent.ownerUserId ? 'operator' : null,
    due_at: intent.dueAt,
    priority: intent.priority,
    status: intent.status,
    blocking_reason: intent.status === 'blocked' ? `Waiting for ${intent.waitingParty ?? 'external evidence'}` : null,
    support_payout_case_id: intent.caseId,
    recovery_case_id: intent.recoveryCaseId,
    source: 'domain_event',
    domain_event_id: event.id,
    task_kind: intent.taskKind,
    waiting_party: intent.waitingParty,
    snoozed_until: null,
    completed_at: intent.status === 'completed' ? event.occurred_at ?? new Date().toISOString() : null,
    completed_by: intent.status === 'completed' && event.actor_type === 'user' ? event.actor_id : null,
    completion_outcome: intent.status === 'completed' ? { domain_event_id: event.id } : null,
    source_metadata: {
      migration_key: intent.key,
      projected_from_domain_event_id: event.id,
      projected_from_event_type: event.event_type,
      work_kind: intent.taskKind,
      ...intent.metadata,
    },
  };
  if (existing) {
    // Source progress must not silently release or reassign an operator who
    // already owns the Work item. Assignment changes only through the task
    // lifecycle transition.
    const projectionPatch = { ...row };
    delete projectionPatch.owner_user_id;
    delete projectionPatch.owner_role;
    const { error } = await client
      .from(TABLES.WORK_TASKS)
      .update(projectionPatch)
      .eq('merchant_id', event.merchant_id)
      .eq('id', existing.id);
    if (error) throw new Error(`work_projection_update_failed:${error.message}`);
    return 'updated';
  }
  const { error } = await client
    .from(TABLES.WORK_TASKS)
    .insert({ merchant_id: event.merchant_id, ...row });
  if (error?.code === '23505') return 'replayed';
  if (error) throw new Error(`work_projection_insert_failed:${error.message}`);
  return 'created';
}

export const workProjection: DomainEventHandler = async (client, event) => {
  const key = terminalKey(event);
  if (key) {
    const applied = await completeProjectedTask(client, event, key);
    return { applied, detail: applied ? `completed:${key}` : `already_complete:${key}` };
  }
  const intent = workIntentForEvent(event);
  if (!intent) return { applied: false, detail: 'ignored' };
  const result = await upsertProjectedTask(client, event, intent);
  return { applied: result !== 'replayed', detail: `${result}:${intent.key}` };
};
