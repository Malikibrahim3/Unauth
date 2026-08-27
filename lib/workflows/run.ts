import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { evaluateConditions } from '@/lib/workflows/evaluate';
import { conditionSchema, outputSchema } from '@/lib/workflows/validation';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import type { DomainEventRecord } from '@/lib/events/handlers/types';
import type { WorkflowDefinition, WorkflowOutput } from '@/lib/workflows/types';

async function executeOutput(client: SupabaseClient, definition: WorkflowDefinition, event: DomainEventRecord, runId: string, index: number, output: WorkflowOutput) {
  const caseId = event.aggregate_type === 'case' ? event.aggregate_id : typeof event.payload?.case_id === 'string' ? event.payload.case_id : null;
  let result: Record<string, unknown> = {};
  if (output.type === 'request_notification') {
    const notification = await recordDomainEvent(client, { merchantId: event.merchant_id, eventType: 'notification.requested', aggregateType: 'case', aggregateId: caseId, idempotencyKey: `workflow:${runId}:step:${index}:notification`, actorType: 'workflow', payload: { recipient_user_id: output.recipientUserId, kind: output.kind, title: output.title, body: output.body ?? null, target_href: caseId ? `/cases/${caseId}` : '/work', deduplication_key: `workflow:${runId}:step:${index}` }, handlers: ['notificationProjection'] });
    result = { domain_event_id: notification };
  } else {
    const title = output.type === 'create_task' ? output.title : output.type === 'request_evidence' ? output.title ?? `Request ${output.evidenceType.replaceAll('_', ' ')}` : 'Review approaching deadline';
    const dueHours = output.type === 'set_deadline' ? output.dueInHours : output.type === 'create_task' ? output.dueInHours : undefined;
    const migrationKey = `workflow:${runId}:step:${index}`;
    let { data: task, error } = await client.from(TABLES.WORK_TASKS).insert({ merchant_id: event.merchant_id, support_payout_case_id: caseId, title, owner_role: output.type === 'create_task' ? output.ownerRole ?? null : null, priority: output.type === 'create_task' ? output.priority ?? 'medium' : 'medium', due_at: dueHours ? new Date(Date.now() + dueHours * 3600000).toISOString() : null, source: 'workflow', source_metadata: { workflow_run_id: runId, step_index: index, evidence_type: output.type === 'request_evidence' ? output.evidenceType : null, migration_key: migrationKey } }).select('id').maybeSingle();
    if (error?.code === '23505') {
      const existing = await client.from(TABLES.WORK_TASKS).select('id').eq('merchant_id', event.merchant_id).contains('source_metadata', { migration_key: migrationKey }).maybeSingle();
      task = existing.data;
      error = existing.error;
    }
    if (error) throw new Error(`workflow_task_failed: ${error.message}`);
    result = { task_id: task?.id ?? null };
  }
  const { error: stepError } = await client.from(TABLES.WORKFLOW_STEP_RUNS).upsert({ merchant_id: event.merchant_id, workflow_run_id: runId, step_index: index, output_type: output.type, status: 'completed', result, completed_at: new Date().toISOString() }, { onConflict: 'workflow_run_id,step_index' });
  if (stepError) throw new Error(`workflow_step_record_failed: ${stepError.message}`);
}

export async function runWorkflowForEvent(client: SupabaseClient, definitionRow: unknown, event: DomainEventRecord) {
  const row = definitionRow as WorkflowDefinition;
  const definition = { ...row, conditions: conditionSchema.array().parse(row.conditions), outputs: outputSchema.array().parse(row.outputs) } as WorkflowDefinition;
  const { data: existing } = await client.from(TABLES.WORKFLOW_RUNS).select('id,status').eq('workflow_definition_id', definition.id).eq('domain_event_id', event.id).maybeSingle();
  if (existing?.status === 'completed' || existing?.status === 'not_matched') return { applied: false, detail: `replayed:${existing.id}` };
  const matched = evaluateConditions(definition.conditions, event.payload ?? {});
  const { data: run, error } = await client.from(TABLES.WORKFLOW_RUNS).upsert({ merchant_id: event.merchant_id, workflow_definition_id: definition.id, domain_event_id: event.id, status: matched ? 'matched' : 'not_matched', completed_at: matched ? null : new Date().toISOString() }, { onConflict: 'workflow_definition_id,domain_event_id' }).select('id').single();
  if (error) throw new Error(`workflow_run_create_failed: ${error.message}`);
  if (!matched) return { applied: false, detail: `not_matched:${run.id}` };
  for (const [index, output] of definition.outputs.entries()) await executeOutput(client, definition, event, run.id, index, output);
  const { error: completeError } = await client.from(TABLES.WORKFLOW_RUNS).update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', run.id);
  if (completeError) throw new Error(`workflow_run_complete_failed: ${completeError.message}`);
  return { applied: true, detail: `workflow:${run.id}` };
}
