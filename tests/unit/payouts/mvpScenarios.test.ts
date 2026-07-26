/**
 * MVP steering §17 — five required scenarios end-to-end through payout domain + widget formatters.
 */
import { evaluateRules, type MerchantRule, type RuleEvaluationResult } from '@/lib/rules-engine';
import {
  formatPayoutWidgetDecision,
  formatDecisionLine1,
} from '@/lib/gorgias/widgetJson';
import { claimDecisionContextToSignals } from '@/lib/claims/decision/signals';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { resolvePayoutRecommendation, payoutRecommendationLabel } from '@/lib/payouts/recommendation';
import { shouldCreateRecoveryCaseFromRow } from '@/lib/recoveries/createFromSupportPayoutCase';
import { makeContext } from './context';

function evaluateWithRule(
  context: ReturnType<typeof makeContext>,
  rule: Pick<MerchantRule, 'action' | 'name'>,
  input: Parameters<typeof buildSupportPayoutCase>[1] = {},
): {
  evaluation: RuleEvaluationResult;
  payoutCase: ReturnType<typeof buildSupportPayoutCase>;
} {
  const payoutCaseBase = buildSupportPayoutCase(context, input);
  const signals = claimDecisionContextToSignals(context, payoutCaseBase);
  const evaluation = evaluateRules(signals, [
    {
      id: 'rule-1',
      merchant_id: context.merchantId,
      name: rule.name,
      description: null,
      is_active: true,
      priority: 1,
      conditions: [],
      action: rule.action,
      condition_operator: 'and',
    },
  ]);
  const recommendation = resolvePayoutRecommendation(evaluation, payoutCaseBase);
  const payoutCase = { ...payoutCaseBase, recommendation };
  return { evaluation, payoutCase };
}

describe('MVP scenarios (widget → case → recovery)', () => {
  it('scenario 1 — strong POD INR: internal review, not recoverable, no recovery case', () => {
    const ctx = makeContext({
      claim: { amountAtRisk: 86 },
      order: { totalAmount: 86 },
      delivery: { deliveryPhotoFinding: 'consistent' },
    });
    const { evaluation, payoutCase } = evaluateWithRule(
      ctx,
      { action: 'manual_review', name: 'Strong POD + £75+ order' },
      { reviewThreshold: 75, requestedActions: ['reship'] },
    );

    expect(payoutCase.evidence.strength).toBe('strong');
    expect(payoutCase.attribution.label).toBe('unknown');
    expect(payoutCase.recovery.recoverability).toBe('needs_more_evidence');
    expect(payoutCase.recommendation?.action).toBe('escalate_internal_review');

    const widget = formatPayoutWidgetDecision(evaluation, payoutCase, 1);
    expect(formatDecisionLine1(payoutCase)).toContain('at risk');
    expect(widget.evidence_checklist).toContain('Evidence:');
    expect(widget.recommendation).toContain('Escalate internal review');
    expect(widget.recovery_path).toContain('needs more evidence');

    expect(
      shouldCreateRecoveryCaseFromRow({
        recoverability: payoutCase.recovery.recoverability,
        loss_attribution: payoutCase.attribution.label,
        recovery_owner: payoutCase.recovery.likelyOwner,
      }),
    ).toBe(false);
  });

  it('scenario 2 — carrier lost parcel: ask carrier before payout', () => {
    const ctx = makeContext({
      delivery: {
        status: 'in_transit',
        carrier: 'Royal Mail',
        trackingNumber: 'RM-STALE',
        trackingUrl: null,
        deliveredAt: null,
        hasTracking: true,
        hasProofOfDelivery: false,
        daysSinceDelivery: null,
      },
      claim: { amountAtRisk: 64 },
    });
    const { evaluation, payoutCase } = evaluateWithRule(
      ctx,
      { action: 'approve', name: 'Lost-in-transit' },
      { requestedActions: ['reship'] },
    );

    expect(payoutCase.attribution.label).toBe('carrier_loss');
    expect(['possibly_recoverable', 'recoverable', 'needs_more_evidence']).toContain(
      payoutCase.recovery.recoverability,
    );
    expect(payoutCase.recommendation?.action).toBe('ask_carrier_for_clarification');

    const widget = formatPayoutWidgetDecision(evaluation, payoutCase, 1);
    expect(widget.recommendation).toContain(payoutRecommendationLabel('ask_carrier_for_clarification'));
    expect(widget.recovery_path).toContain('File a carrier claim');
  });

  it('scenario 3 — damaged item missing customer photo: ask for evidence', () => {
    const ctx = makeContext({
      claim: { type: 'damaged', amountAtRisk: 42 },
      delivery: {
        status: 'in_transit',
        carrier: 'Royal Mail',
        trackingNumber: 'RM2',
        trackingUrl: null,
        deliveredAt: null,
        hasTracking: true,
        hasProofOfDelivery: false,
        daysSinceDelivery: null,
      },
      evidence: {
        hasCustomerEvidence: false,
        customerEvidenceItems: 0,
        merchantEvidenceItems: 0,
        deliveryEvidenceItems: 0,
        totalEvidenceItems: 0,
        hasDeliveryEvidence: false,
      },
    });
    const { evaluation, payoutCase } = evaluateWithRule(
      ctx,
      { action: 'manual_review', name: 'Packaging photo required' },
      { requestedActions: ['replacement'] },
    );

    expect(payoutCase.evidence.strength).toBe('missing');
    expect(payoutCase.recommendation?.action).toBe('request_customer_evidence');
    const widget = formatPayoutWidgetDecision(evaluation, payoutCase, 1);
    expect(widget.recommendation).toContain('Request customer evidence');
    expect(widget.evidence_checklist.toLowerCase()).toMatch(/missing|moderate|weak/);
  });

  it('scenario 4 — wrong item: ask 3PL for pick/pack proof before payout', () => {
    const ctx = makeContext({
      claim: { type: 'wrong_item', amountAtRisk: 58 },
      evidence: {
        hasCustomerEvidence: true,
        customerEvidenceItems: 1,
        merchantEvidenceItems: 1,
        deliveryEvidenceItems: 0,
        totalEvidenceItems: 2,
        hasDeliveryEvidence: false,
      },
    });
    const { evaluation, payoutCase } = evaluateWithRule(
      ctx,
      { action: 'approve', name: 'Approve replacement + 3PL review' },
      { requestedActions: ['replacement'] },
    );

    expect(payoutCase.attribution.label).toBe('unknown');
    expect(payoutCase.recommendation?.action).toBe('ask_3pl_for_clarification');
    const widget = formatPayoutWidgetDecision(evaluation, payoutCase, 1);
    expect(widget.recommendation).toContain('Ask 3PL for clarification');
  });

  it('scenario 5 — refund outside policy: deny under policy', () => {
    const ctx = makeContext({
      claim: { type: 'refund_request', amountAtRisk: 72 },
    });
    const { evaluation, payoutCase } = evaluateWithRule(
      ctx,
      { action: 'deny', name: 'Return required before refund' },
      { requestedActions: ['refund'], returnRequired: true },
    );

    expect(payoutCase.recommendation?.action).toBe('deny_under_policy');
    expect(payoutCase.recovery.recoverability).toBe('not_recoverable');

    const widget = formatPayoutWidgetDecision(evaluation, payoutCase, 1);
    expect(widget.recommendation).toContain('Deny under policy');
  });
});
