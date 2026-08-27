import {
  DATA_STATE_COPY,
  FINANCIAL_STAGE_DEFINITIONS,
  countLabel,
  financialStageDefinition,
  financialStageLabel,
  label,
  humanise,
  parseMajorUnitInput,
} from '@/lib/ui/labels';

describe('ui label layer', () => {
  it('maps case statuses to merchant-facing copy', () => {
    expect(label('caseStatus', 'awaiting_carrier_response')).toBe('Waiting on carrier');
    expect(label('caseStatus', 'ready_for_decision')).toBe('Ready for decision');
    expect(label('caseStatus', 'resolved_refunded')).toBe('Refunded');
  });

  it('kills the "Three Pl" casing bug at the root', () => {
    expect(label('ownerType', 'three_pl')).toBe('3PL');
    expect(label('counterparty', '3pl')).toBe('3PL');
    expect(label('attribution', 'three_pl_claim')).toBe('3PL claim');
  });

  it('maps recoverability, actions, loss categories and priorities', () => {
    expect(label('recoverability', 'unknown')).toBe('Not yet assessed');
    expect(label('requestedAction', 'store_credit')).toBe('Store credit');
    expect(label('lossCategory', 'fulfilment_or_warehouse_error')).toBe('Fulfilment error');
    expect(label('workPriority', 'urgent')).toBe('Urgent');
    expect(label('workflowStatus', 'refunded')).toBe('Refunded');
  });

  it('re-exports claim-type labels from the SSOT', () => {
    expect(label('claimType', 'item_not_received')).toBe('Item not received');
  });

  it('falls back to a humanised form for unmapped values (never raw snake_case)', () => {
    expect(label('caseStatus', 'some_new_state')).toBe('Some new state');
    expect(humanise('awaiting_carrier_response')).toBe('Awaiting carrier response');
  });

  it('returns empty string for null/undefined', () => {
    expect(label('caseStatus', null)).toBe('');
    expect(label('caseStatus', undefined)).toBe('');
  });

  it('keeps the six financial stages distinct in merchant-facing copy', () => {
    expect(financialStageLabel('recommendation')).toBe('Recommendation');
    expect(financialStageLabel('merchant_decision')).toBe('Merchant decision');
    expect(financialStageLabel('source_observed_outcome')).toBe('Source-observed outcome');
    expect(financialStageLabel('confirmed_loss')).toBe('Confirmed loss');
    expect(financialStageLabel('eligible_recovery')).toBe('Eligible recovery');
    expect(financialStageLabel('recovered_cash')).toBe('Recovered cash');
    expect(financialStageDefinition('recovered_cash')).toContain('received');
    expect(Object.keys(FINANCIAL_STAGE_DEFINITIONS)).toEqual(expect.arrayContaining([
      'recommendation',
      'merchant_decision',
      'source_observed_outcome',
      'confirmed_loss',
      'eligible_recovery',
      'recovered_cash',
    ]));
  });

  it('keeps zero, unavailable, and inapplicable states separate', () => {
    expect(DATA_STATE_COPY.zero.label).toBe('0');
    expect(DATA_STATE_COPY.unavailable.label).toBe('Unavailable');
    expect(DATA_STATE_COPY.inapplicable.label).toBe('—');
    expect(DATA_STATE_COPY.zero.description).not.toBe(DATA_STATE_COPY.unavailable.description);
  });

  it('pluralises counts and keeps money input in major units', () => {
    expect(countLabel(0, 'item')).toBe('0 items');
    expect(countLabel(1, 'item')).toBe('1 item');
    expect(countLabel(2, 'item')).toBe('2 items');
    expect(parseMajorUnitInput('55.00', 'GBP')).toBe(5500);
  });

  it('maps every shipped loss and recovery enum without using the fallback', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const values = {
      lossStatus: [
        'detected', 'collecting_evidence', 'missing_source_data',
        'needs_external_correspondence', 'external_correspondence_requested',
        'external_response_received', 'evidence_pack_ready', 'submitted',
        'approved', 'partially_approved', 'denied', 'expired',
        'closed_unrecoverable',
      ],
      lossCategory: [
        'delivery_loss', 'chargeback_or_payment_dispute', 'refund_dispute',
        'returns_abuse_or_exception', 'damaged_goods',
        'wrong_item_or_missing_item', 'fulfilment_or_warehouse_error',
        '3pl_accountability', 'shipping_protection_claim',
        'marketplace_dispute', 'supplier_or_vendor_issue',
        'tax_duty_or_customs_issue',
        'subscription_or_digital_fulfilment_issue',
        'unknown_post_purchase_loss',
      ],
      recoveryStatus: [
        'no_recovery_needed', 'recovery_possible', 'recovery_opened',
        'recovery_submitted', 'recovery_paid',
        'draft', 'evidence_needed', 'ready_to_submit', 'submitted',
        'waiting_response', 'chase_due', 'approved', 'partially_approved',
        'rejected', 'appealed', 'paid', 'closed_unrecoverable',
      ],
      ownerType: [
        'carrier', 'three_pl', '3pl', 'warehouse', 'supplier',
        'returns_provider', 'payment_dispute_provider', 'payment_processor',
        'merchant_support', 'merchant_ops', 'merchant_finance',
        'shipping_protection_provider', 'bank', 'card_network', 'marketplace',
        'customs_broker', 'customer', 'internal_team', 'unknown', 'merchant',
      ],
      attribution: [
        'customer_claim', 'carrier_loss', 'carrier_damage',
        'delivery_confirmed_evidence', 'warehouse_mispick',
        'warehouse_missing_item', 'three_pl_late_dispatch', 'supplier_defect',
        'packaging_failure', 'merchant_policy', 'unknown', 'repeat_claimant',
        'policy_override', 'carrier_claim', 'carrier_service_refund',
        'three_pl_claim', '3pl_claim', 'shipping_protection_claim',
        'payment_processor_dispute', 'chargeback_evidence',
        'chargeback_evidence_pack', 'bank_or_card_network_response',
        'returns_platform_claim', 'marketplace_claim', 'supplier_vendor_claim',
        'internal_fulfilment_issue', 'customer_evidence_review',
        'not_recoverable', 'needs_more_evidence', 'warehouse_error',
        'packaging_issue', 'returns_provider_claim', 'internal_policy_fix',
        'other',
      ],
    } as const;

    for (const [family, familyValues] of Object.entries(values)) {
      for (const value of familyValues) {
        expect(label(family as Parameters<typeof label>[0], value)).not.toBe('');
      }
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
