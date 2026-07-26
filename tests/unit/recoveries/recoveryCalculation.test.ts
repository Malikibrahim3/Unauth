import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { calculateRecoveryEstimate } from '@/lib/recoveries/calculation';
import { shouldCreateRecoveryCaseFromRow } from '@/lib/recoveries/createFromSupportPayoutCase';
import type { PartnerRecoveryRule } from '@/lib/partners/types';
import { makeContext } from '@/tests/unit/payouts/context';

const carrierRule: PartnerRecoveryRule = {
  id: 'rule-1',
  merchant_id: '00000000-0000-0000-0000-000000000001',
  partner_id: '00000000-0000-0000-0000-000000000002',
  rule_name: 'Carrier lost parcel claim',
  recovery_type: 'carrier_claim',
  applies_to_claim_type: 'item_not_received',
  claimable_costs: ['refund', 'reship'],
  excluded_costs: ['support_cost'],
  required_evidence: ['tracking', 'proof_of_value', 'carrier_investigation'],
  deadline_days: 14,
  liability_cap_amount: 60,
  liability_cap_currency: 'GBP',
  liability_cap_basis: 'fixed',
  submission_method: 'portal',
  submission_url: null,
  submission_email: null,
  source_type: 'merchant_configured',
  confidence: 'high',
  active: true,
  created_at: '2026-06-19T00:00:00.000Z',
  updated_at: '2026-06-19T00:00:00.000Z',
};

describe('calculateRecoveryEstimate', () => {
  it('separates merchant loss from capped recoverable amount', () => {
    const payoutCase = buildSupportPayoutCase(makeContext({
      delivery: { status: 'in_transit', hasProofOfDelivery: false, hasTracking: true },
      claim: { amountAtRisk: 100 },
    }));

    const estimate = calculateRecoveryEstimate({
      supportPayoutCase: payoutCase,
      partnerRecoveryRule: carrierRule,
      evidencePresent: ['tracking'],
      evidenceMissing: ['proof_of_value', 'carrier_investigation'],
    });

    expect(estimate.merchantLossAmount).toBe(100);
    expect(estimate.eligibleLossAmount).toBe(60);
    expect(estimate.estimatedRecoverableMax).toBe(60);
    expect(estimate.missingEvidence).toEqual(['proof_of_value', 'carrier_investigation']);
    expect(estimate.confidence).toBe('high');
  });

  it('returns zero recovery for prevention-only merchant policy cases', () => {
    const payoutCase = buildSupportPayoutCase(makeContext({
      claim: { type: 'refund_request' },
    }), { refundAmount: 80 });
    const estimate = calculateRecoveryEstimate({
      supportPayoutCase: payoutCase,
      evidencePresent: ['tracking', 'proof_of_delivery'],
      evidenceMissing: [],
    });

    expect(payoutCase.recovery.recoverability).toBe('not_recoverable');
    expect(estimate.eligibleLossAmount).toBe(0);
    expect(estimate.estimatedRecoverableMax).toBe(0);
    expect(estimate.excludedCosts[0]?.reason).toMatch(/prevention|policy/i);
  });

  it('marks evidence complete when required rule evidence is present', () => {
    const payoutCase = buildSupportPayoutCase(makeContext({
      delivery: { status: 'in_transit', hasProofOfDelivery: false, hasTracking: true },
    }));
    const estimate = calculateRecoveryEstimate({
      supportPayoutCase: payoutCase,
      partnerRecoveryRule: carrierRule,
      evidencePresent: ['tracking', 'proof_of_value', 'carrier_investigation'],
      evidenceMissing: [],
    });

    expect(estimate.missingEvidence).toEqual([]);
    expect(estimate.estimatedRecoverableMin).toBeGreaterThan(0);
  });
});

describe('shouldCreateRecoveryCaseFromRow', () => {
  const baseRow = {
    id: '00000000-0000-0000-0000-000000000010',
    merchant_id: '00000000-0000-0000-0000-000000000001',
    claim_type: 'item_not_received',
    status: 'open',
    amount_at_risk: 80,
    total_estimated_loss: 80,
    currency: 'GBP',
    requested_action: 'reship',
    attribution_confidence: 'medium',
    recovery_required_evidence: ['tracking'],
    recovery_next_action: null,
  };

  it('creates for recoverable carrier loss', () => {
    expect(shouldCreateRecoveryCaseFromRow({
      ...baseRow,
      loss_attribution: 'carrier_loss',
      recoverability: 'recoverable',
      recovery_owner: 'carrier',
    })).toBe(true);
  });

  it('creates for possible 3PL or warehouse wrong-item loss', () => {
    expect(shouldCreateRecoveryCaseFromRow({
      ...baseRow,
      claim_type: 'wrong_item',
      loss_attribution: 'warehouse_mispick',
      recoverability: 'possibly_recoverable',
      recovery_owner: 'warehouse',
    })).toBe(true);
  });

  it('does not create for strong-POD disputed delivery with low recovery likelihood', () => {
    expect(shouldCreateRecoveryCaseFromRow({
      ...baseRow,
      loss_attribution: 'delivery_confirmed_evidence',
      recoverability: 'not_recoverable',
      recovery_owner: 'merchant',
    })).toBe(false);
  });
});
