import { buildDeliveryFromFulfillment, deriveDeliveryStatus } from '@/lib/claims/decision/deliveryEvidence';
import { claimDecisionContextToSignals } from '@/lib/claims/decision/signals';
import { formatClaimDecisionRecommendation } from '@/lib/claims/decision/format';
import { evaluateRules, type MerchantRule } from '@/lib/rules-engine';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';

function baseContext(overrides: Partial<ClaimDecisionContext> = {}): ClaimDecisionContext {
  return {
    merchantId: 'm1',
    claim: {
      id: 'c1',
      type: 'item_not_received',
      status: 'open',
      amountAtRisk: 120,
      currency: 'USD',
      reasonRaw: 'Never arrived',
      reasonNormalized: null,
      sourceOrderId: 'o1',
      sourceTicketId: 't1',
      identityId: 'i1',
      createdAt: '2026-06-01T00:00:00.000Z',
    },
    ticket: {
      id: 't1',
      externalId: '999',
      source: 'gorgias',
      status: 'open',
      subject: 'Missing order',
      claimTypeConfidence: 0.9,
    },
    order: {
      id: 'o1',
      externalId: 'shop-1',
      orderNumber: '1001',
      totalAmount: 120,
      currency: 'USD',
      createdAt: '2026-05-20T00:00:00.000Z',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
    },
    delivery: {
      status: 'delivered',
      carrier: 'UPS',
      trackingNumber: '1Z999',
      trackingUrl: null,
      deliveredAt: '2026-05-25T00:00:00.000Z',
      hasTracking: true,
      hasProofOfDelivery: true,
      daysSinceDelivery: 23,
    },
    identity: {
      id: 'i1',
      confidenceGrade: 'probable',
      confidenceScore: 72,
      evidenceScore: 45,
      evidenceLevel: 'some',
      hasSufficientData: true,
      evidenceBreakdown: [],
      isNetworkFlagged: false,
    },
    history: {
      merchantClaimCount: 2,
      merchantPriorClaimCount: 1,
      merchantSameTypeClaimCount: 1,
      merchantPriorSameTypeClaimCount: 0,
      networkClaimCount: 5,
      networkSameTypeClaimCount: 3,
      priorApprovedClaims: 1,
      priorDeniedClaims: 0,
      priorEscalatedClaims: 0,
      priorChargebacksAfterClaims: 0,
      priorLossOutcomes: 0,
      priorRecoveredOutcomes: 1,
      daysSinceLastClaim: 30,
      claimTypes: ['item_not_received'],
      hasCrossMerchantIdentity: true,
      networkMerchantCount: 3,
      accountAgeDays: 400,
    },
    evidence: {
      totalEvidenceItems: 0,
      customerEvidenceItems: 0,
      deliveryEvidenceItems: 0,
      merchantEvidenceItems: 0,
      hasCustomerEvidence: false,
      hasDeliveryEvidence: false,
    },
    ...overrides,
  };
}

describe('deriveDeliveryStatus', () => {
  it('marks delivered when shipment status indicates delivery', () => {
    expect(deriveDeliveryStatus('fulfilled', 'delivered', null)).toBe('delivered');
  });

  it('marks in_transit for shipped statuses', () => {
    expect(deriveDeliveryStatus(null, 'in_transit', null)).toBe('in_transit');
  });
});

describe('buildDeliveryFromFulfillment', () => {
  it('sets hasTracking when tracking number exists', () => {
    const d = buildDeliveryFromFulfillment({
      status: 'success',
      shipment_status: 'delivered',
      tracking_company: 'DHL',
      tracking_number: 'ABC123',
      occurred_at: '2026-06-01T00:00:00.000Z',
    });
    expect(d.hasTracking).toBe(true);
    expect(d.hasProofOfDelivery).toBe(true);
    expect(d.status).toBe('delivered');
  });
});

describe('claimDecisionContextToSignals', () => {
  it('maps claim-specific fields and merchant-local history', () => {
    const signals = claimDecisionContextToSignals(baseContext());
    expect(signals.claim_type).toBe('item_not_received');
    expect(signals.delivery_status).toBe('delivered');
    expect(signals.has_tracking).toBe(true);
    expect(signals.has_customer_evidence).toBe(false);
    expect(signals.prior_approved_claims).toBe(1);
    expect(signals.merchant_claim_count).toBe(2);
    expect(signals.merchant_prior_claim_count).toBe(1);
    expect(signals.merchant_same_type_claim_count).toBe(1);
    expect(signals.merchant_prior_same_type_claim_count).toBe(0);
  });

  it('handles missing optional context with safe defaults', () => {
    const signals = claimDecisionContextToSignals(
      baseContext({
        delivery: null,
        identity: null,
        ticket: null,
        order: null,
      }),
    );
    expect(signals.delivery_status).toBeNull();
    expect(signals.has_tracking).toBe(false);
    expect(signals.merchant_claim_count).toBe(2);
  });
});

describe('evaluateRules with claim-specific fields', () => {
  const rule = (conditions: MerchantRule['conditions']): MerchantRule => ({
    id: 'r1',
    merchant_id: 'm1',
    name: 'INR with delivery proof',
    description: null,
    is_active: true,
    priority: 0,
    conditions,
    action: 'manual_review',
    condition_operator: 'and',
  });

  it('matches claim_type and delivery_status', () => {
    const signals = claimDecisionContextToSignals(baseContext());
    const result = evaluateRules(signals, [
      rule([
        { id: 'a', field: 'claim_type', operator: 'eq', value: 'item_not_received' },
        { id: 'b', field: 'delivery_status', operator: 'eq', value: 'delivered' },
        { id: 'c', field: 'has_customer_evidence', operator: 'eq', value: false },
      ]),
    ]);
    expect(result.recommendation).toBe('manual_review');
    expect(result.matched_conditions).toHaveLength(3);
  });

  it('matches prior outcome history fields', () => {
    const signals = claimDecisionContextToSignals(baseContext());
    const result = evaluateRules(signals, [
      rule([{ id: 'a', field: 'prior_approved_claims', operator: 'gte', value: 1 }]),
    ]);
    expect(result.recommendation).toBe('manual_review');
  });
});

describe('formatClaimDecisionRecommendation', () => {
  it('returns neutral copy when no rules configured', () => {
    const formatted = formatClaimDecisionRecommendation(
      { recommendation: 'no_match', rule_id: null, rule_name: null, matched_conditions: [], justification: '', justification_lines: [] },
      0,
    );
    expect(formatted.isNoRules).toBe(true);
    expect(formatted.summary).toContain('Add rules');
  });

  it('returns neutral copy when no rule matched', () => {
    const formatted = formatClaimDecisionRecommendation(
      { recommendation: 'no_match', rule_id: null, rule_name: null, matched_conditions: [], justification: '', justification_lines: [] },
      2,
    );
    expect(formatted.isNoMatch).toBe(true);
    expect(formatted.summary).toContain('No merchant rule matched');
  });
});
