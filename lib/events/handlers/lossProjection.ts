import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';

const PAID_ACTIONS = new Set(['refund', 'reship', 'replacement']);

export const lossProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'case.decision_recorded' || !event.aggregate_id) {
    return { applied: false, detail: 'ignored' };
  }
  const payload = event.payload ?? {};
  const action = typeof payload.action === 'string' ? payload.action : '';
  const amountMinor = typeof payload.amount_minor === 'number' ? payload.amount_minor : 0;
  const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : null;
  if (!PAID_ACTIONS.has(action) || amountMinor <= 0 || !currency || payload.reversal === true) {
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
  });
  if (error) throw new Error(`loss_projection_insert_failed: ${error.message}`);
  return { applied: true, detail: 'confirmed_loss_created' };
};
