/** Read-only case assembler. It deliberately performs no evaluation, sync, or writes. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getCaseRelatedRecords } from '@/lib/cases/relatedRecords';
import { claimEventsToTimeline, commerceEventsToTimeline, domainEventsToTimeline, mergeTimeline, recoveryEventsToTimeline, ticketEventsToTimeline, workTasksToTimeline } from '@/lib/cases/timeline';

export async function getCaseReadModel(client: SupabaseClient, merchantId: string, caseId: string) {
  const { data: payoutCase, error: caseError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,status,state_version,payout_decision_state,recovery_state,source_order_id,source_ticket_id,identity_id,requested_action,amount_at_risk,currency,primary_currency,submitted_at,updated_at,created_at,assigned_to,next_action,next_action_reason')
    .eq('merchant_id', merchantId)
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) throw new Error(`case_read_model_case_failed: ${caseError.message}`);
  if (!payoutCase) return null;

  const [relatedRecords, financialResult, domainEventsResult, claimEventsResult, recoveryEventsResult, workTasksResult, ticketEventsResult, orderResult, fulfillmentsResult, refundsResult] = await Promise.all([
    getCaseRelatedRecords(client, merchantId, caseId),
    client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId).eq('support_payout_case_id', caseId),
    client.from(TABLES.DOMAIN_EVENTS).select('id,event_type,occurred_at,recorded_at,actor_type,actor_id,payload').eq('merchant_id', merchantId).eq('aggregate_type', 'case').eq('aggregate_id', caseId).order('occurred_at', { ascending: false }),
    client.from('claim_events').select('id,event_type,created_at,from_status,to_status,note,actor_user_id,metadata').eq('merchant_id', merchantId).eq('claim_id', caseId).order('created_at', { ascending: false }),
    client.from(TABLES.RECOVERY_CASE_EVENTS).select('id,event_type,created_at,note,recovery_cases!inner(support_payout_case_id)').eq('merchant_id', merchantId).eq('recovery_cases.support_payout_case_id', caseId).order('created_at', { ascending: false }),
    client.from(TABLES.WORK_TASKS).select('id,title,status,created_at,updated_at,completed_at').eq('merchant_id', merchantId).eq('support_payout_case_id', caseId).order('updated_at', { ascending: false }),
    payoutCase.source_ticket_id
      ? client.from(TABLES.SUPPORT_CASE_EVENTS).select('id,event_type,occurred_at,created_at,summary,actor_type').eq('merchant_id', merchantId).eq('source_ticket_id', payoutCase.source_ticket_id).order('occurred_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    // Commerce facts (source-of-truth order / fulfillment / refund) for the timeline.
    payoutCase.source_order_id
      ? client.from(TABLES.SOURCE_ORDERS).select('id,order_number,placed_at,created_at,total_price,currency').eq('merchant_id', merchantId).eq('id', payoutCase.source_order_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    payoutCase.source_order_id
      ? client.from(TABLES.SOURCE_FULFILLMENTS).select('id,status,shipment_status,tracking_company,tracking_number,occurred_at,ingested_at').eq('merchant_id', merchantId).eq('source_order_id', payoutCase.source_order_id).order('occurred_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    payoutCase.source_order_id
      ? client.from(TABLES.SOURCE_REFUNDS).select('id,amount,currency,reason,refunded_at,ingested_at').eq('merchant_id', merchantId).eq('source_order_id', payoutCase.source_order_id).order('refunded_at', { ascending: false })
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
  const [evidenceResult, evaluationResult, outcomeResult, lossResult, recoveryResult] = await Promise.all([
    client.from(TABLES.EVIDENCE_ITEMS)
      .select('id,evidence_type,title,summary,proves,source_system,source_account_id,source_record_id,source_url,occurred_at,ingested_at,last_synced_at,freshness_state,sync_state,structured_value')
      .eq('merchant_id', merchantId).eq('claim_id', caseId).order('occurred_at', { ascending: false, nullsFirst: false }),
    client.from(TABLES.RULE_EVALUATIONS)
      .select('id,rule_id,recommendation,justification_summary,matched_conditions,rule_snapshot,signals_hash,evaluated_at,evaluation_source')
      .eq('merchant_id', merchantId).eq('claim_id', caseId).order('evaluated_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('claim_outcomes')
      .select('id,decision,outcome,amount_refunded,amount_recovered,notes,decided_by,decided_at,recommended_payout_action,followed_recommendation')
      .eq('claim_id', caseId).maybeSingle(),
    client.from(TABLES.LOSS_CASES)
      .select('id,status,currency,order_value_minor,refund_value_minor,chargeback_value_minor,estimated_recovery_minor,approved_recovery_minor,financial_state')
      .eq('merchant_id', merchantId).eq('support_payout_case_id', caseId),
    client.from(TABLES.RECOVERY_CASES)
      .select('id,status,merchant_loss_amount,eligible_loss_amount,amount_recovered,currency,updated_at')
      .eq('merchant_id', merchantId).eq('support_payout_case_id', caseId),
  ]);
  if (evidenceResult.error) throw new Error(`case_read_model_evidence_failed: ${evidenceResult.error.message}`);
  if (evaluationResult.error) throw new Error(`case_read_model_evaluation_failed: ${evaluationResult.error.message}`);
  if (outcomeResult.error) throw new Error(`case_read_model_outcome_failed: ${outcomeResult.error.message}`);
  if (lossResult.error) throw new Error(`case_read_model_loss_failed: ${lossResult.error.message}`);
  if (recoveryResult.error) throw new Error(`case_read_model_recovery_failed: ${recoveryResult.error.message}`);
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
      commerceEventsToTimeline({
        order: (orderResult.data as never) ?? null,
        fulfillments: (fulfillmentsResult.data as never) ?? [],
        refunds: (refundsResult.data as never) ?? [],
      }),
    ),
    domainEvents,
    claimEvents,
    evidence: evidenceResult.data ?? [],
    evidenceSummary: {
      total: evidenceResult.data?.length ?? 0,
      present: evidenceResult.data?.filter((item) => item.sync_state === 'available').length ?? 0,
      unavailable: evidenceResult.data?.filter((item) => item.sync_state === 'unavailable').length ?? 0,
      stale: evidenceResult.data?.filter((item) => item.freshness_state === 'stale').length ?? 0,
    },
    latestRuleEvaluation: evaluationResult.data ?? null,
    decision: outcomeResult.data ?? null,
    downstream: {
      losses: lossResult.data ?? [],
      recoveries: recoveryResult.data ?? [],
    },
  };
}
