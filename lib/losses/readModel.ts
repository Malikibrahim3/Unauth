import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export async function getLossReadModel(client: SupabaseClient, merchantId: string, lossId: string) {
  const { data: loss, error } = await client.from(TABLES.LOSS_CASES).select('*').eq('merchant_id', merchantId).eq('id', lossId).maybeSingle();
  if (error) throw new Error(`loss_read_failed: ${error.message}`);
  if (!loss) return null;
  const [summary, entries, candidates, evidence, events, recoveries, correspondence, tasks] = await Promise.all([
    loss.support_payout_case_id ? client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId).eq('support_payout_case_id', loss.support_payout_case_id) : Promise.resolve({ data: [], error: null }),
    client.from(TABLES.CASE_FINANCIAL_ENTRIES).select('id,support_payout_case_id,state,amount_minor,currency,effective_at,created_at,source_record_id,reverses_entry_id,metadata').eq('merchant_id', merchantId).eq('loss_case_id', lossId).order('effective_at', { ascending: false }),
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
  const financialEntries = entries.data ?? [];
  const states = new Set<string>();
  for (const entry of financialEntries) states.add(entry.state);
  const summaries = (summary.data ?? []).map((row) => ({
    ...row,
    known_states: Array.isArray(row.known_states) ? row.known_states : [...states].sort(),
  }));

  function knownStage(row: Record<string, unknown>, state: string, field: string): number | null {
    const states = Array.isArray(row.known_states) ? row.known_states.map(String) : [];
    return states.includes(state) && typeof row[field] === 'number' ? row[field] as number : null;
  }

  return {
    loss,
    financialSummaries: summaries,
    financialEntries,
    attributionCandidates: candidates.data ?? [],
    evidence: evidence.data ?? [],
    events: events.data ?? [],
    recoveries: recoveries.data ?? [],
    correspondence: correspondence.data ?? [],
    tasks: tasks.data ?? [],
    amounts: summaries.map((row) => ({
      currency: row.currency,
      realisedLossMinor: knownStage(row, 'confirmed_loss', 'confirmed_loss_minor'),
      estimatedLossMinor: knownStage(row, 'estimated_loss', 'estimated_loss_minor'),
      recoverableMinor: knownStage(row, 'recoverable', 'recoverable_minor'),
      recoveredMinor: knownStage(row, 'recovered', 'recovered_minor'),
      writtenOffMinor: knownStage(row, 'written_off', 'written_off_minor'),
      outstandingRecoveryMinor: (() => {
        const recoverableMinor = knownStage(row, 'recoverable', 'recoverable_minor');
        const recoveredMinor = knownStage(row, 'recovered', 'recovered_minor');
        const writtenOffMinor = knownStage(row, 'written_off', 'written_off_minor');
        return recoverableMinor != null && recoveredMinor != null
          ? Math.max(0, recoverableMinor - recoveredMinor - (writtenOffMinor ?? 0))
          : null;
      })(),
    })),
  };
}
