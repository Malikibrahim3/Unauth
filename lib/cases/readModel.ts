/** Read-only case assembler. It deliberately performs no evaluation, sync, or writes. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getCaseRelatedRecords } from '@/lib/cases/relatedRecords';
import { claimEventsToTimeline, domainEventsToTimeline, mergeTimeline } from '@/lib/cases/timeline';

export async function getCaseReadModel(client: SupabaseClient, merchantId: string, caseId: string) {
  const { data: payoutCase, error: caseError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,merchant_id,status,state_version,payout_decision_state,recovery_state,source_order_id,source_ticket_id,identity_id,amount_at_risk,currency,primary_currency,updated_at,created_at,assigned_to,next_action,next_action_reason')
    .eq('merchant_id', merchantId)
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) throw new Error(`case_read_model_case_failed: ${caseError.message}`);
  if (!payoutCase) return null;

  const [relatedRecords, financialResult, domainEventsResult, claimEventsResult] = await Promise.all([
    getCaseRelatedRecords(client, merchantId, caseId),
    client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId).eq('support_payout_case_id', caseId),
    client.from(TABLES.DOMAIN_EVENTS).select('id,event_type,occurred_at,recorded_at,actor_type,actor_id,payload').eq('merchant_id', merchantId).eq('aggregate_type', 'case').eq('aggregate_id', caseId).order('occurred_at', { ascending: false }),
    client.from('claim_events').select('id,event_type,created_at,from_status,to_status,note,actor_user_id,metadata').eq('merchant_id', merchantId).eq('claim_id', caseId).order('created_at', { ascending: false }),
  ]);
  if (financialResult.error) throw new Error(`case_read_model_financial_failed: ${financialResult.error.message}`);
  if (domainEventsResult.error) throw new Error(`case_read_model_events_failed: ${domainEventsResult.error.message}`);
  if (claimEventsResult.error) throw new Error(`case_read_model_claim_events_failed: ${claimEventsResult.error.message}`);

  const domainEvents = domainEventsResult.data ?? [];
  const claimEvents = claimEventsResult.data ?? [];
  return {
    case: payoutCase,
    relatedRecords,
    financialSummaries: financialResult.data ?? [],
    timeline: mergeTimeline(
      domainEventsToTimeline(domainEvents),
      claimEventsToTimeline(claimEvents),
    ),
    domainEvents,
    claimEvents,
  };
}
