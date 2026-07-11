/** Read-only case assembler. It deliberately performs no evaluation, sync, or writes. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getCaseRelatedRecords } from '@/lib/cases/relatedRecords';
import { claimEventsToTimeline, domainEventsToTimeline, mergeTimeline, recoveryEventsToTimeline, ticketEventsToTimeline, workTasksToTimeline } from '@/lib/cases/timeline';

export async function getCaseReadModel(client: SupabaseClient, merchantId: string, caseId: string) {
  const { data: payoutCase, error: caseError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,status,state_version,payout_decision_state,recovery_state,source_order_id,source_ticket_id,identity_id,amount_at_risk,currency,primary_currency,updated_at,created_at,assigned_to,next_action,next_action_reason')
    .eq('merchant_id', merchantId)
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) throw new Error(`case_read_model_case_failed: ${caseError.message}`);
  if (!payoutCase) return null;

  const [relatedRecords, financialResult, domainEventsResult, claimEventsResult, recoveryEventsResult, workTasksResult, ticketEventsResult] = await Promise.all([
    getCaseRelatedRecords(client, merchantId, caseId),
    client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId).eq('support_payout_case_id', caseId),
    client.from(TABLES.DOMAIN_EVENTS).select('id,event_type,occurred_at,recorded_at,actor_type,actor_id,payload').eq('merchant_id', merchantId).eq('aggregate_type', 'case').eq('aggregate_id', caseId).order('occurred_at', { ascending: false }),
    client.from('claim_events').select('id,event_type,created_at,from_status,to_status,note,actor_user_id,metadata').eq('merchant_id', merchantId).eq('claim_id', caseId).order('created_at', { ascending: false }),
    client.from(TABLES.RECOVERY_CASE_EVENTS).select('id,event_type,created_at,note,recovery_cases!inner(support_payout_case_id)').eq('merchant_id', merchantId).eq('recovery_cases.support_payout_case_id', caseId).order('created_at', { ascending: false }),
    client.from(TABLES.WORK_TASKS).select('id,title,status,created_at,updated_at,completed_at').eq('merchant_id', merchantId).eq('support_payout_case_id', caseId).order('updated_at', { ascending: false }),
    payoutCase.source_ticket_id
      ? client.from(TABLES.SUPPORT_CASE_EVENTS).select('id,event_type,occurred_at,created_at,summary,actor_type').eq('merchant_id', merchantId).eq('source_ticket_id', payoutCase.source_ticket_id).order('occurred_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (financialResult.error) throw new Error(`case_read_model_financial_failed: ${financialResult.error.message}`);
  if (domainEventsResult.error) throw new Error(`case_read_model_events_failed: ${domainEventsResult.error.message}`);
  if (claimEventsResult.error) throw new Error(`case_read_model_claim_events_failed: ${claimEventsResult.error.message}`);
  if (recoveryEventsResult.error) throw new Error(`case_read_model_recovery_events_failed: ${recoveryEventsResult.error.message}`);
  if (workTasksResult.error) throw new Error(`case_read_model_work_tasks_failed: ${workTasksResult.error.message}`);
  if (ticketEventsResult.error) throw new Error(`case_read_model_ticket_events_failed: ${ticketEventsResult.error.message}`);

  const domainEvents = domainEventsResult.data ?? [];
  const claimEvents = claimEventsResult.data ?? [];
  return {
    case: payoutCase,
    relatedRecords,
    financialSummaries: financialResult.data ?? [],
    timeline: mergeTimeline(
      domainEventsToTimeline(domainEvents),
      claimEventsToTimeline(claimEvents),
      recoveryEventsToTimeline(recoveryEventsResult.data ?? []),
      workTasksToTimeline(workTasksResult.data ?? []),
      ticketEventsToTimeline(ticketEventsResult.data ?? []),
    ),
    domainEvents,
    claimEvents,
  };
}
