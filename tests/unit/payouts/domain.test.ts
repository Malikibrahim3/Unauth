import { computePayoutExposure } from '@/lib/payouts/exposure';
import { reconcileRequestedActions } from '@/lib/payouts/requestedAction';
import { buildEvidenceChecklist } from '@/lib/payouts/evidenceChecklist';
import { deriveLossAttribution, applyPolicyOverrideAttribution } from '@/lib/payouts/attribution';
import { deriveRecoveryPath } from '@/lib/payouts/recovery';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { BANNED_UI_TERMS } from '@/lib/copy/terms';
import { makeContext } from './context';

describe('computePayoutExposure', () => {
  it('sums provided components and flags above-threshold', () => {
    const ctx = makeContext();
    const exp = computePayoutExposure(ctx, {
      refundAmount: 80,
      reshipReplacementAmount: 20,
      reviewThreshold: 75,
    });
    expect(exp.total.amount).toBe(100);
    expect(exp.total.currency).toBe('GBP');
    expect(exp.aboveReviewThreshold).toBe(true);
    expect(exp.components).toHaveLength(2);
  });

  it('stays within threshold when total is below it', () => {
    const ctx = makeContext();
    const exp = computePayoutExposure(ctx, { refundAmount: 40, reviewThreshold: 75 });
    expect(exp.aboveReviewThreshold).toBe(false);
  });

  it('falls back to amount at risk when no refund amount supplied', () => {
    const ctx = makeContext({ claim: { amountAtRisk: 55 } });
    const exp = computePayoutExposure(ctx, {});
    expect(exp.total.amount).toBe(55);
    expect(exp.components[0].source).toBe('amount_at_risk');
  });

  it('falls back to order total when no amount at risk', () => {
    const ctx = makeContext({ claim: { amountAtRisk: null }, order: { totalAmount: 120 } });
    const exp = computePayoutExposure(ctx, {});
    expect(exp.total.amount).toBe(120);
    expect(exp.components[0].source).toBe('order_total');
  });

  it('never flags review when no threshold is supplied', () => {
    const exp = computePayoutExposure(makeContext(), { refundAmount: 9999 });
    expect(exp.aboveReviewThreshold).toBe(false);
    expect(exp.reviewThreshold).toBeNull();
    expect(exp.reasons.join(' ')).toMatch(/no review threshold/i);
  });
});

describe('reconcileRequestedActions', () => {
  it('uses provided actions and dedupes', () => {
    const r = reconcileRequestedActions({ claimType: 'damaged', requestedActions: ['refund', 'refund', 'replacement'] });
    expect(r.primary).toBe('refund');
    expect(r.requested).toEqual(['refund', 'replacement']);
  });

  it('infers from claim type when none supplied', () => {
    expect(reconcileRequestedActions({ claimType: 'item_not_received' }).primary).toBe('reship');
    expect(reconcileRequestedActions({ claimType: 'damaged' }).primary).toBe('replacement');
  });

  it('honors a returnless override', () => {
    const r = reconcileRequestedActions({ claimType: 'refund_request', requestedActions: ['refund'], returnRequired: false });
    expect(r.returnRequired).toBe(false);
  });

  it('falls back to unknown with no claim type', () => {
    expect(reconcileRequestedActions({ claimType: null }).primary).toBe('unknown');
  });
});

describe('buildEvidenceChecklist', () => {
  it('marks tracking/POD present and unavailable photo/signature when UPS is active for INR', () => {
    const res = buildEvidenceChecklist(makeContext({
      delivery: {
        ...makeContext().delivery!,
        carrierDirectConnected: true,
        trackingProviderConnected: true,
        trackingProvider: 'ups',
      },
    }), 'item_not_received');
    const byKey = Object.fromEntries(res.items.map((i) => [i.key, i.state]));
    expect(byKey.tracking).toBe('present');
    expect(byKey.proof_of_delivery).toBe('present');
    expect(byKey.delivery_photo).toBe('unavailable');
    expect(byKey.signature).toBe('unavailable');
    expect(res.expectedCount).toBeGreaterThan(0);
  });

  it('returns missing strength when nothing assessable is present', () => {
    const ctx = makeContext({
      delivery: null,
      evidence: { hasCustomerEvidence: false, customerEvidenceItems: 0, merchantEvidenceItems: 0, deliveryEvidenceItems: 0, totalEvidenceItems: 0, hasDeliveryEvidence: false },
      order: null,
    });
    const res = buildEvidenceChecklist(ctx, 'item_not_received');
    expect(res.presentCount).toBe(0);
    expect(res.strength).toBe('missing');
  });

  it('rates damaged strong when delivered + customer evidence + inspection', () => {
    const ctx = makeContext({
      claim: { type: 'damaged' },
      evidence: { hasCustomerEvidence: true, customerEvidenceItems: 1, merchantEvidenceItems: 1, deliveryEvidenceItems: 0, totalEvidenceItems: 2, hasDeliveryEvidence: false },
    });
    const res = buildEvidenceChecklist(ctx, 'damaged');
    expect(res.strength).toBe('strong');
  });
});

describe('deriveLossAttribution', () => {
  it('INR delivered with merchant-reviewed consistent POD remains unresolved', () => {
    const res = deriveLossAttribution(makeContext({
      delivery: { deliveryPhotoFinding: 'consistent' },
    }), 'item_not_received');
    expect(res.label).toBe('unknown');
    expect(res.confidence).toBe('needs_more_evidence');
    expect(res.isAdvisory).toBe(true);
    expect(res.networkBenchmark).toBeNull();
  });

  it('INR with an uninterpreted POD artefact remains inconclusive', () => {
    const res = deriveLossAttribution(makeContext(), 'item_not_received');
    expect(res.label).toBe('unknown');
    expect(res.confidence).toBe('needs_more_evidence');
  });

  it('INR with no delivery signal → unknown / needs_more_evidence', () => {
    const ctx = makeContext({ delivery: null });
    const res = deriveLossAttribution(ctx, 'item_not_received');
    expect(res.label).toBe('unknown');
    expect(res.confidence).toBe('needs_more_evidence');
  });

  it('carrier_loss never exceeds low confidence without a carrier feed', () => {
    const ctx = makeContext({ delivery: { status: 'in_transit', hasTracking: true, hasProofOfDelivery: false } });
    const res = deriveLossAttribution(ctx, 'item_not_received');
    expect(res.label).toBe('carrier_loss');
    expect(res.confidence).toBe('low');
  });

  it('wrong item delivered + inspection remains unresolved without pick proof', () => {
    const ctx = makeContext({
      claim: { type: 'wrong_item' },
      evidence: { hasCustomerEvidence: true, customerEvidenceItems: 1, merchantEvidenceItems: 1, deliveryEvidenceItems: 0, totalEvidenceItems: 2, hasDeliveryEvidence: false },
    });
    const res = deriveLossAttribution(ctx, 'wrong_item');
    expect(res.label).toBe('unknown');
  });

  it('always returns at least one reason and never banned language', () => {
    const types = ['item_not_received', 'damaged', 'wrong_item', 'missing_item', 'not_as_described', 'refund_request', 'chargeback', 'return_abuse', 'other'] as const;
    for (const t of types) {
      const res = deriveLossAttribution(makeContext({ claim: { type: t } }), t);
      expect(res.reasons.length).toBeGreaterThan(0);
      const text = res.reasons.map((r) => r.text).join(' ').toLowerCase();
      for (const banned of BANNED_UI_TERMS) {
        expect(text).not.toContain(banned.toLowerCase());
      }
    }
  });

  it('keeps a weak customer claim separate from frequency signals', () => {
    const ctx = makeContext({
      claim: { type: 'chargeback' },
      history: { merchantPriorClaimCount: 3, networkClaimCount: 1 },
    });
    const res = deriveLossAttribution(ctx, 'chargeback');
    expect(res.label).toBe('customer_claim');
    expect(res.confidence).toBe('low');
  });

  it('does not use network-wide frequency to assign responsibility', () => {
    const ctx = makeContext({
      claim: { type: 'chargeback' },
      history: { merchantPriorClaimCount: 0, networkClaimCount: 4 },
    });
    const res = deriveLossAttribution(ctx, 'chargeback');
    expect(res.label).toBe('customer_claim');
  });

  it('does not reclassify to repeat_claimant when claim frequency is unremarkable', () => {
    const ctx = makeContext({
      claim: { type: 'chargeback' },
      history: { merchantPriorClaimCount: 0, networkClaimCount: 0 },
    });
    const res = deriveLossAttribution(ctx, 'chargeback');
    expect(res.label).toBe('customer_claim');
  });

  it('does not assign warehouse responsibility from inspection alone', () => {
    const ctx = makeContext({
      claim: { type: 'wrong_item' },
      evidence: { hasCustomerEvidence: true, customerEvidenceItems: 1, merchantEvidenceItems: 1, deliveryEvidenceItems: 0, totalEvidenceItems: 2, hasDeliveryEvidence: false },
      history: { merchantPriorClaimCount: 10, networkClaimCount: 10 },
    });
    const res = deriveLossAttribution(ctx, 'wrong_item');
    expect(res.label).toBe('unknown');
  });
});

describe('applyPolicyOverrideAttribution', () => {
  it('reclassifies to policy_override when the agent approved a payout the rules recommended denying', () => {
    const base = deriveLossAttribution(makeContext({ claim: { type: 'chargeback' } }), 'chargeback');
    const res = applyPolicyOverrideAttribution(base, {
      followedRecommendation: false,
      recommendedAction: 'deny_under_policy',
      decision: 'approved',
    });
    expect(res.label).toBe('policy_override');
    expect(res.confidence).toBe('high');
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it('leaves attribution unchanged when the decision followed the recommendation', () => {
    const base = deriveLossAttribution(makeContext(), 'item_not_received');
    const res = applyPolicyOverrideAttribution(base, {
      followedRecommendation: true,
      recommendedAction: 'deny_under_policy',
      decision: 'denied',
    });
    expect(res).toBe(base);
  });

  it('leaves attribution unchanged when the recommendation was not a policy denial', () => {
    const base = deriveLossAttribution(makeContext(), 'item_not_received');
    const res = applyPolicyOverrideAttribution(base, {
      followedRecommendation: false,
      recommendedAction: 'escalate_internal_review',
      decision: 'approved',
    });
    expect(res).toBe(base);
  });
});

describe('deriveRecoveryPath', () => {
  it('inconclusive attribution → needs_more_evidence with required evidence', () => {
    const ctx = makeContext({ delivery: null });
    const evidence = buildEvidenceChecklist(ctx, 'item_not_received');
    const attribution = deriveLossAttribution(ctx, 'item_not_received');
    const rec = deriveRecoveryPath(attribution, evidence);
    expect(rec.recoverability).toBe('needs_more_evidence');
    expect(rec.likelyOwner).toBe('unknown');
  });

  it('delivery evidence without physical proof → needs more evidence', () => {
    const ctx = makeContext({
      delivery: { deliveryPhotoFinding: 'consistent' },
    });
    const evidence = buildEvidenceChecklist(ctx, 'item_not_received');
    const attribution = deriveLossAttribution(ctx, 'item_not_received');
    const rec = deriveRecoveryPath(attribution, evidence);
    expect(rec.recoverability).toBe('needs_more_evidence');
    expect(rec.likelyOwner).toBe('unknown');
  });

  it('carrier damage at medium confidence → recoverable from carrier', () => {
    const ctx = makeContext({
      claim: { type: 'damaged' },
      evidence: { hasCustomerEvidence: true, customerEvidenceItems: 1, merchantEvidenceItems: 1, deliveryEvidenceItems: 0, totalEvidenceItems: 2, hasDeliveryEvidence: false },
    });
    const evidence = buildEvidenceChecklist(ctx, 'damaged');
    const attribution = deriveLossAttribution(ctx, 'damaged');
    const rec = deriveRecoveryPath(attribution, evidence);
    expect(rec.likelyOwner).toBe('carrier');
    expect(rec.recoverability).toBe('recoverable');
  });
});

describe('buildSupportPayoutCase', () => {
  it('assembles all parts with version + advisory flag', () => {
    const c = buildSupportPayoutCase(makeContext(), { reviewThreshold: 75 });
    expect(c.caseId).toBe('claim-1');
    expect(c.configVersion).toBe('v1.0');
    expect(c.attribution.isAdvisory).toBe(true);
    expect(c.claimType).toBe('item_not_received');
    expect(c.exposure.total.amount).toBeGreaterThan(0);
    expect(c.requestedAction.primary).toBe('reship');
  });

  it('honors a missing_item claim type override', () => {
    const c = buildSupportPayoutCase(makeContext(), { claimTypeOverride: 'missing_item' });
    expect(c.claimType).toBe('missing_item');
  });

  it('uses the normalized case issue to distinguish missing_item without an override', () => {
    const c = buildSupportPayoutCase(makeContext({
      claim: {
        type: 'item_not_received',
        reasonNormalized: 'missing_item',
      },
    }));
    expect(c.claimType).toBe('missing_item');
    expect(c.attribution.label).toBe('unknown');
  });
});
