import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { TABLES } from '@/lib/supabase/tables';

const DECISION_HANDLERS = [
  'financialProjection', 'lossProjection', 'recoveryProjection',
  'customerProjection', 'caseProjection', 'notificationProjection',
];

export const refundProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'refund.created') return { applied: false, detail: 'ignored' };
  const payload = event.payload ?? {};
  const orderId = typeof payload.source_order_id === 'string' ? payload.source_order_id : null;
  const amountMinor = typeof payload.amount_minor === 'number' ? payload.amount_minor : null;
  const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : null;
  if (!orderId || amountMinor == null || !currency) return { applied: false, detail: 'missing_refund_context' };

  const { data: existingCases, error: lookupError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id')
    .eq('merchant_id', event.merchant_id)
    .eq('source_order_id', orderId)
    .neq('status', 'voided')
    .order('created_at', { ascending: true })
    .limit(1);
  if (lookupError) throw new Error(`refund_case_lookup_failed: ${lookupError.message}`);

  let caseId = (existingCases as Array<{ id: string }> | null)?.[0]?.id ?? null;
  if (!caseId) {
    const { data: created, error: createError } = await client
      .from(TABLES.MERCHANT_CLAIMS)
      .insert({
        merchant_id: event.merchant_id,
        source_order_id: orderId,
        case_origin: typeof payload.case_origin === 'string' ? payload.case_origin : 'connector',
        claim_type: 'refund_request',
        status: 'decision_recorded',
        detection_method: 'platform_refund',
        requested_action: 'refund',
        payout_decision_state: 'decision_recorded',
        amount_at_risk: amountMinor / 100,
        currency,
        primary_currency: currency,
        reason_raw: typeof payload.reason === 'string' ? payload.reason : 'Retrospective refund recorded',
        requires_review: true,
      })
      .select('id')
      .single();
    if (createError) throw new Error(`retrospective_case_create_failed: ${createError.message}`);
    caseId = (created as { id: string }).id;
  }

  await client.from(TABLES.ENTITY_RELATIONSHIPS).upsert({
    merchant_id: event.merchant_id,
    from_entity_type: 'case', from_entity_id: caseId,
    to_entity_type: 'order', to_entity_id: orderId,
    relationship_type: 'case_order', match_status: 'confirmed', match_method: 'connector_declared',
    evidence: { refund_domain_event_id: event.id },
  }, { onConflict: 'merchant_id,from_entity_type,from_entity_id,to_entity_type,to_entity_id,relationship_type' });

  await recordDomainEvent(client, {
    merchantId: event.merchant_id,
    eventType: 'case.decision_recorded',
    aggregateType: 'case',
    aggregateId: caseId,
    idempotencyKey: `refund-projection:${event.id}`,
    payload: { action: 'refund', amount_minor: amountMinor, currency, refund_event_id: event.id },
    occurredAt: event.occurred_at ?? undefined,
    causationId: event.id,
    handlers: DECISION_HANDLERS,
  });
  return { applied: true, detail: `case:${caseId}` };
};
