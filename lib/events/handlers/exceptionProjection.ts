import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';
import { recomputeFinancialSummary } from '@/lib/events/handlers/financialProjection';

/**
 * Resolution is a human decision, not a new financial fact. Refresh the linked
 * case and recompute its already-append-only ledger summary so case, customer,
 * loss/recovery, report, and audit reads converge on the same canonical state.
 */
export const exceptionProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'case.exception_resolved' || !event.aggregate_id) return { applied: false, detail: 'ignored' };
  const { error } = await client.from(TABLES.MERCHANT_CLAIMS)
    .update({ updated_at: event.recorded_at ?? new Date().toISOString() })
    .eq('merchant_id', event.merchant_id)
    .eq('id', event.aggregate_id);
  if (error) throw new Error(`exception_case_refresh_failed: ${error.message}`);
  await recomputeFinancialSummary(client, event.merchant_id, event.aggregate_id);
  return { applied: true, detail: `case:${event.aggregate_id}` };
};
