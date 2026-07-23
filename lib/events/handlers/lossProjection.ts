import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';

const PAID_ACTIONS = new Set(['refund', 'reship', 'replacement']);

export const lossProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'case.outcome_reconciled' || !event.aggregate_id) {
    return { applied: false, detail: 'ignored' };
  }
  const payload = event.payload ?? {};
  if (payload.reversal === true) {
    const priorOutcomeId = typeof payload.reverses_outcome_id === 'string'
      ? payload.reverses_outcome_id
      : null;
    if (!priorOutcomeId) throw new Error('loss_reversal_missing_prior_outcome');
    const { data: priorEvents, error: eventError } = await client
      .from(TABLES.DOMAIN_EVENTS)
      .select('id,payload')
      .eq('merchant_id', event.merchant_id)
      .eq('event_type', 'case.outcome_reconciled')
      .contains('payload', { outcome_id: priorOutcomeId });
    if (eventError) throw new Error(`loss_reversal_event_lookup_failed: ${eventError.message}`);
    const eventRows = (priorEvents ?? []) as Array<{ id: string; payload?: Record<string, unknown> }>;
    if (eventRows.length === 0) throw new Error('loss_reversal_missing_prior_event');
    const { data: losses, error: lossError } = await client
      .from(TABLES.LOSS_CASES)
      .select('id,source_metadata')
      .eq('merchant_id', event.merchant_id)
      .in('source_fingerprint', eventRows.map((row) => `domain-event:${row.id}`));
    if (lossError) throw new Error(`loss_reversal_lookup_failed: ${lossError.message}`);
    const lossRows = (losses ?? []) as Array<{ id: string; source_metadata?: Record<string, unknown> }>;
    if (lossRows.length === 0) {
      const expectedLoss = eventRows.some(
        (row) => typeof row.payload?.confirmed_loss_minor === 'number' && row.payload.confirmed_loss_minor > 0,
      );
      if (expectedLoss) throw new Error('loss_reversal_waiting_for_prior_projection');
      return { applied: false, detail: 'no_confirmed_loss_to_reverse' };
    }
    for (const loss of lossRows) {
      const { error: updateError } = await client
        .from(TABLES.LOSS_CASES)
        .update({
          financial_state: 'reversed',
          source_metadata: {
            ...(loss.source_metadata ?? {}),
            reversed_by_outcome_id: typeof payload.outcome_id === 'string' ? payload.outcome_id : null,
            reversed_by_domain_event_id: event.id,
          },
          updated_at: event.occurred_at ?? new Date().toISOString(),
        })
        .eq('merchant_id', event.merchant_id)
        .eq('id', loss.id);
      if (updateError) throw new Error(`loss_reversal_update_failed: ${updateError.message}`);
    }
    return { applied: true, detail: `confirmed_loss_reversed:${lossRows.length}` };
  }
  const action = typeof payload.action === 'string' ? payload.action : '';
  const amountMinor = typeof payload.confirmed_loss_minor === 'number' ? payload.confirmed_loss_minor : 0;
  const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : null;
  if (!PAID_ACTIONS.has(action) || amountMinor <= 0 || !currency) {
    return { applied: false, detail: 'no_confirmed_loss' };
  }

  const fingerprint = `domain-event:${event.id}`;
  const { data: existing, error: lookupError } = await client
    .from(TABLES.LOSS_CASES)
    .select('id')
    .eq('merchant_id', event.merchant_id)
    .eq('source_fingerprint', fingerprint)
    .maybeSingle();
  if (lookupError) throw new Error(`loss_projection_lookup_failed: ${lookupError.message}`);
  if (existing) return { applied: false, detail: 'already_applied' };

  const { error } = await client.from(TABLES.LOSS_CASES).insert({
    merchant_id: event.merchant_id,
    support_payout_case_id: event.aggregate_id,
    case_category: 'refund_dispute',
    case_type: action,
    recovery_route: 'needs_more_evidence',
    status: 'detected',
    refund_value_minor: amountMinor,
    currency,
    source_confidence: 'source_verified',
    source_fingerprint: fingerprint,
    financial_state: 'confirmed',
    confirmed_at: event.occurred_at ?? new Date().toISOString(),
    source_record_id: typeof payload.source_record_id === 'string' ? payload.source_record_id : null,
    source_metadata: {
      outcome_id: typeof payload.outcome_id === 'string' ? payload.outcome_id : null,
      loss_basis: payload.source_metadata && typeof payload.source_metadata === 'object'
        ? (payload.source_metadata as Record<string, unknown>).loss_basis ?? null
        : null,
    },
  });
  if (error) throw new Error(`loss_projection_insert_failed: ${error.message}`);
  return { applied: true, detail: 'confirmed_loss_created' };
};
