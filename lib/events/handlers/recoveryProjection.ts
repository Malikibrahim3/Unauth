import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { maybeCreateRecoveryCaseFromSupportPayoutCase } from '@/lib/recoveries/createFromSupportPayoutCase';
import { TABLES } from '@/lib/supabase/tables';
import { recomputeFinancialSummary } from '@/lib/events/handlers/financialProjection';

export const recoveryProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'case.decision_recorded' || !event.aggregate_id || event.payload?.reversal === true) {
    return { applied: false, detail: 'ignored' };
  }
  const recovery = await maybeCreateRecoveryCaseFromSupportPayoutCase({
    client,
    merchantId: event.merchant_id,
    supportPayoutCaseId: event.aggregate_id,
  });
  if (recovery) {
    const amount = recovery.estimated_recoverable_max ?? recovery.estimated_recoverable_min ?? recovery.eligible_loss_amount ?? 0;
    const { data: existing, error: lookupError } = await client
      .from(TABLES.CASE_FINANCIAL_ENTRIES)
      .select('id')
      .eq('merchant_id', event.merchant_id)
      .eq('domain_event_id', event.id)
      .eq('state', 'recoverable')
      .maybeSingle();
    if (lookupError) throw new Error(`recovery_financial_lookup_failed: ${lookupError.message}`);
    if (!existing && amount > 0) {
      const { error: insertError } = await client.from(TABLES.CASE_FINANCIAL_ENTRIES).insert({
        merchant_id: event.merchant_id,
        support_payout_case_id: event.aggregate_id,
        recovery_case_id: recovery.id,
        state: 'recoverable', amount_minor: Math.round(amount * 100),
        currency: recovery.currency.toUpperCase(), direction: 'memo',
        domain_event_id: event.id, effective_at: event.occurred_at ?? new Date().toISOString(),
      });
      if (insertError) throw new Error(`recovery_financial_insert_failed: ${insertError.message}`);
      await recomputeFinancialSummary(client, event.merchant_id, event.aggregate_id);
    }
  }
  return recovery
    ? { applied: true, detail: `recovery:${recovery.id}` }
    : { applied: false, detail: 'not_recoverable' };
};
