import { classifyLossSource } from '@/lib/accountability/classifyLossSource';
import type { ClassifyLossSourceInput } from '@/lib/accountability/types';

function input(overrides: Partial<ClassifyLossSourceInput> = {}): ClassifyLossSourceInput {
  return {
    claimId: 'claim-1',
    merchantId: 'merchant-1',
    claimType: 'DELIVERED_NOT_RECEIVED',
    evidence: {
      order: null,
      ticket: null,
      shipment: null,
      claimHistory: {
        priorDnrClaims120d: 0,
        priorRefunds120d: 0,
        priorReplacements120d: 0,
      },
      moneyAtRisk: 120,
      currency: 'USD',
      summary: {
        order_value: 120,
        order_number: '1001',
        delivery_status: 'DELIVERED',
        proof_of_delivery: 'MISSING',
        carrier: 'DHL',
        delivered_at: new Date().toISOString(),
        prior_dnr_claims_120d: 0,
        prior_refunds_120d: 0,
        prior_replacements_120d: 0,
        carrier_claim_window: 'OPEN',
        chargeback_risk: 'LOW',
      },
    },
    gateDecision: {
      gateStatus: 'PROCEED',
      triggeredRules: [],
      policyNextStep: 'Proceed under merchant policy.',
      allowedActions: ['respond'],
      blockedActions: [],
      evaluation: null,
    },
    ...overrides,
  };
}

describe('loss source classifier', () => {
  it('classifies delivered-not-received with missing POD as a carrier recovery path', () => {
    const [source] = classifyLossSource(input());

    expect(source.source_type).toBe('CARRIER_FAILURE');
    expect(source.accountable_party_type).toBe('CARRIER');
    expect(source.accountable_party_name).toBe('DHL');
    expect(source.potential_recovery_amount).toBe(120);
    expect(source.recommended_recovery_tasks[0]?.task_type).toBe('OPEN_CARRIER_CLAIM');
  });

  it('classifies wrong item claims as warehouse or 3PL responsibility', () => {
    const [source] = classifyLossSource(input({ claimType: 'WRONG_ITEM' }));

    expect(source.source_type).toBe('WAREHOUSE_3PL_ERROR');
    expect(source.accountable_party_type).toBe('WAREHOUSE_3PL');
    expect(source.recommended_recovery_tasks[0]?.task_type).toBe('CONTACT_3PL');
  });

  it('creates a manager review task when evidence does not identify a source', () => {
    const [source] = classifyLossSource(input({
      claimType: 'UNKNOWN',
      evidence: {
        ...input().evidence,
        summary: {
          ...input().evidence.summary,
          delivery_status: 'UNKNOWN',
          proof_of_delivery: 'UNKNOWN',
          carrier_claim_window: 'UNKNOWN',
        },
      },
    }));

    expect(source.source_type).toBe('UNKNOWN');
    expect(source.recommended_recovery_tasks[0]?.task_type).toBe('ESCALATE_TO_MANAGER');
  });
});
