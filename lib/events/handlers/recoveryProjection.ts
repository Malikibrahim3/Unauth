import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { maybeCreateRecoveryCaseFromSupportPayoutCase } from '@/lib/recoveries/createFromSupportPayoutCase';
import { TABLES } from '@/lib/supabase/tables';
import { financialProjection, recomputeFinancialSummary } from '@/lib/events/handlers/financialProjection';
import { lossProjection } from '@/lib/events/handlers/lossProjection';

export const recoveryProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'case.outcome_reconciled' || !event.aggregate_id) {
    return { applied: false, detail: 'ignored' };
  }
  if (event.payload?.reversal === true) {
    await lossProjection(client, event);
    // Re-run the idempotent financial correction here so a recoverable entry
    // created by an independently scheduled recovery delivery is also reversed.
    await financialProjection(client, event);
    const { data: recoveries, error: recoveryError } = await client
      .from(TABLES.RECOVERY_CASES)
      .select('id,status')
      .eq('merchant_id', event.merchant_id)
      .eq('support_payout_case_id', event.aggregate_id)
      .in('status', ['draft', 'evidence_needed', 'ready_to_submit', 'submitted', 'waiting_response', 'chase_due', 'approved', 'partially_approved', 'rejected', 'appealed']);
    if (recoveryError) throw new Error(`recovery_correction_lookup_failed: ${recoveryError.message}`);
    const recoveryRows = (recoveries ?? []) as Array<{ id: string; status: string }>;
    if (recoveryRows.length === 0) return { applied: false, detail: 'no_open_recovery_to_reconcile' };
    const { error: exceptionError } = await client.from(TABLES.CASE_EXCEPTIONS).upsert({
      merchant_id: event.merchant_id,
      support_payout_case_id: event.aggregate_id,
      exception_type: 'conflicting_financials',
      confidence: 'probable',
      status: 'open',
      title: 'Recovery needs review after a source outcome correction',
      detail: 'A verified source outcome was reversed after recovery work opened. Review the linked recovery before any further amount or closure is recorded.',
      context: {
        domain_event_id: event.id,
        outcome_id: typeof event.payload?.outcome_id === 'string' ? event.payload.outcome_id : null,
        reverses_outcome_id: typeof event.payload?.reverses_outcome_id === 'string' ? event.payload.reverses_outcome_id : null,
        recovery_case_ids: recoveryRows.map((row) => row.id),
      },
      subject_entity_type: 'recovery_case',
      subject_entity_id: recoveryRows[0].id,
      source_system: 'source_outcome_reconciliation',
      dedup_key: `source-outcome-reversal:${event.payload?.reverses_outcome_id}`,
    }, { onConflict: 'merchant_id,dedup_key' });
    if (exceptionError) throw new Error(`recovery_correction_exception_failed: ${exceptionError.message}`);
    return { applied: true, detail: `recovery_correction_required:${recoveryRows.length}` };
  }

  const outcomeId = typeof event.payload?.outcome_id === 'string' ? event.payload.outcome_id : null;
  if (outcomeId) {
    const { data: correctionEvents, error: correctionError } = await client
      .from(TABLES.DOMAIN_EVENTS)
      .select('id')
      .eq('merchant_id', event.merchant_id)
      .eq('event_type', 'case.outcome_reconciled')
      .contains('payload', { reversal: true, reverses_outcome_id: outcomeId })
      .limit(1);
    if (correctionError) throw new Error(`recovery_correction_event_lookup_failed: ${correctionError.message}`);
    if ((correctionEvents ?? []).length > 0) {
      return { applied: false, detail: 'source_outcome_already_reversed' };
    }
  }
  // Delivery handlers are independently leased, so the recovery delivery may
  // run before the dedicated loss delivery. Idempotently ensure the canonical
  // loss exists here instead of completing a one-shot recovery projection too
  // early and silently losing the recovery case.
  await lossProjection(client, event);
  const recovery = await maybeCreateRecoveryCaseFromSupportPayoutCase({
    client,
    merchantId: event.merchant_id,
    supportPayoutCaseId: event.aggregate_id,
    explicitHandoff: false,
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
    : {
        applied: false,
        detail: 'canonical_loss_ready_explicit_recovery_handoff_required',
      };
};
