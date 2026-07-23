import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';
import { syncPayoutCaseMerchantCustomer } from '@/lib/identity/merchantCustomerResolver';

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
        status: 'manual_review',
        detection_method: 'platform_refund',
        requested_action: 'refund',
        payout_decision_state: 'undecided',
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

  await syncPayoutCaseMerchantCustomer(client, event.merchant_id, caseId);

  await client.from(TABLES.ENTITY_RELATIONSHIPS).upsert({
    merchant_id: event.merchant_id,
    from_entity_type: 'case', from_entity_id: caseId,
    to_entity_type: 'order', to_entity_id: orderId,
    relationship_type: 'case_order', match_status: 'confirmed', match_method: 'connector_declared',
    evidence: { refund_domain_event_id: event.id },
  }, { onConflict: 'merchant_id,from_entity_type,from_entity_id,to_entity_type,to_entity_id,relationship_type' });

  const { error: outcomeError } = await client.rpc('record_case_source_outcome', {
    p_merchant_id: event.merchant_id,
    p_case_id: caseId,
    p_outcome_type: 'source_refund',
    p_action: 'refund',
    p_amount_minor: amountMinor,
    // A verified refund is a realised payout-value loss. This is explicitly
    // labelled as a payout-value basis, not an accounting-grade cost basis.
    p_confirmed_loss_minor: amountMinor,
    p_currency: currency,
    p_reason: typeof payload.reason === 'string' ? payload.reason : 'Verified source refund reconciled',
    p_source_record_id: typeof payload.source_record_id === 'string' ? payload.source_record_id : null,
    p_source_metadata: {
      refund_domain_event_id: event.id,
      loss_basis: 'payout_value',
      source_verified: true,
    },
    p_occurred_at: event.occurred_at ?? new Date().toISOString(),
    p_idempotency_key: `refund-projection:${event.id}`,
  });
  if (outcomeError) throw new Error(`refund_outcome_reconciliation_failed: ${outcomeError.message}`);
  return { applied: true, detail: `case:${caseId}` };
};
