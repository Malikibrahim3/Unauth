import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export async function getLossReadModel(client: SupabaseClient, merchantId: string, lossId: string) {
  const { data: loss, error } = await client.from(TABLES.LOSS_CASES).select('*').eq('merchant_id', merchantId).eq('id', lossId).maybeSingle();
  if (error) throw new Error(`loss_read_failed: ${error.message}`);
  if (!loss) return null;
  const [summary, entries, candidates, evidence, events, recoveries, correspondence, tasks] = await Promise.all([
    loss.support_payout_case_id ? client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId).eq('support_payout_case_id', loss.support_payout_case_id) : Promise.resolve({ data: [], error: null }),
    client.from(TABLES.CASE_FINANCIAL_ENTRIES).select('id,state,amount_minor,currency,effective_at,created_at,source_record_id,reverses_entry_id,metadata').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('effective_at', { ascending: false }),
    client.from(TABLES.LOSS_ATTRIBUTION_CANDIDATES).select('*').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('is_primary', { ascending: false }),
    client.from(TABLES.LOSS_CASE_EVIDENCE).select('*').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('created_at', { ascending: false }),
    client.from(TABLES.LOSS_CASE_EVENTS).select('*').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('created_at', { ascending: false }),
    client.from(TABLES.RECOVERY_CASES).select('id,status,currency,merchant_loss_amount,eligible_loss_amount,estimated_recoverable_max,amount_recovered,deadline_at,updated_at').eq('merchant_id', merchantId).eq('loss_case_id', lossId),
    client.from(TABLES.EXTERNAL_CORRESPONDENCE).select('id,direction,channel,source_provider,source_record_id,source_url,subject,sent_at,received_at,created_at').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('created_at', { ascending: false }),
    client.from(TABLES.WORK_TASKS).select('id,title,status,priority,owner_user_id,due_at,blocking_reason,updated_at').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('updated_at', { ascending: false }),
  ]);
  for (const result of [summary, entries, candidates, evidence, events, recoveries, correspondence, tasks]) {
    if (result.error) throw new Error(`loss_read_related_failed: ${result.error.message}`);
  }
  const summaries = summary.data ?? [];
  return {
    loss,
    financialSummaries: summaries,
    financialEntries: entries.data ?? [],
    attributionCandidates: candidates.data ?? [],
    evidence: evidence.data ?? [],
    events: events.data ?? [],
    recoveries: recoveries.data ?? [],
    correspondence: correspondence.data ?? [],
    tasks: tasks.data ?? [],
    amounts: summaries.map((row) => ({
      currency: row.currency,
      realisedLossMinor: row.confirmed_loss_minor,
      estimatedLossMinor: row.estimated_loss_minor,
      recoverableMinor: row.recoverable_minor,
      recoveredMinor: row.recovered_minor,
      writtenOffMinor: row.written_off_minor,
      outstandingRecoveryMinor: Math.max(0, row.recoverable_minor - row.recovered_minor - row.written_off_minor),
    })),
  };
}
