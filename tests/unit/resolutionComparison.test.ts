import { buildResolutionComparison } from '@/lib/claims/decision/resolutionComparison';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type { SupportPayoutCase } from '@/lib/payouts/types';
import type { RuleEvaluationResult } from '@/lib/rules-engine';

function fixture(overrides: Partial<ClaimDecisionContext['claim']> = {}) {
  const context = {
    merchantId: 'merchant-1',
    claim: {
      id: 'case-1', type: 'missing_parcel', status: 'ready_for_decision', amountAtRisk: 42,
      currency: 'GBP', reasonRaw: 'Parcel missing', reasonNormalized: 'missing_parcel',
      sourceOrderId: 'order-1', sourceTicketId: null, identityId: 'customer-1',
      createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z', stateVersion: 4,
      costs: { refundAmount: null, replacementItemValue: 18, replacementShippingCost: 0, estimatedSupportCost: null },
      gateRecommendation: null,
      ...overrides,
    },
    ticket: null,
    order: { id: 'order-1', externalId: 'ext-1', orderNumber: '1001', totalAmount: 60, currency: 'GBP', createdAt: '2026-08-30T10:00:00.000Z', financialStatus: 'paid', fulfillmentStatus: 'fulfilled', source: 'shopify', sourceName: 'London store', sourceAccountId: 'account-1' },
    delivery: null,
    identity: null,
    history: { merchantClaimCount: 1, merchantPriorClaimCount: 0, merchantSameTypeClaimCount: 1, merchantPriorSameTypeClaimCount: 0, networkClaimCount: null, networkSameTypeClaimCount: null, priorApprovedClaims: 0, priorDeniedClaims: 0, priorEscalatedClaims: 0, priorChargebacksAfterClaims: 0, priorLossOutcomes: 0, priorRecoveredOutcomes: 0, daysSinceLastClaim: null, claimTypes: ['missing_parcel'], hasCrossMerchantIdentity: false, networkMerchantCount: 0, accountAgeDays: null },
    evidence: { totalEvidenceItems: 1, customerEvidenceItems: 0, deliveryEvidenceItems: 1, merchantEvidenceItems: 0, hasCustomerEvidence: false, hasDeliveryEvidence: true, evidenceTypes: ['tracking'], latestEvidenceAt: '2026-09-06T09:00:00.000Z' },
    priorConcessions: { count: 1, amount: 5, currency: 'GBP', coverage: 'complete' },
  } as ClaimDecisionContext;
  const evaluation = { recommendation: 'manual_review', rule_id: 'rule-1', rule_name: 'Review', matched_conditions: [], justification: 'Review required', justification_lines: [] } as RuleEvaluationResult;
  const payoutCase = {
    configVersion: 'v1.0', nextAction: 'request_customer_evidence',
    attribution: { confidence: 'needs_more_evidence' },
    recovery: { recoverability: 'possibly_recoverable', likelyOwner: 'carrier', suggestedNextAction: 'Collect carrier scan', requiredEvidence: [], reasons: [] },
    evidence: { items: [{ state: 'missing', reason: 'Customer statement is missing' }] },
  } as unknown as SupportPayoutCase;
  return { context, evaluation, payoutCase };
}

describe('buildResolutionComparison', () => {
  it('keeps known, verified zero, estimated and unavailable costs distinct', () => {
    const comparison = buildResolutionComparison(fixture());
    const replacement = comparison.options.find((option) => option.action === 'same_item_replacement')!;
    expect(replacement.costs.map((cost) => cost.state)).toEqual(['estimated', 'verified_zero', 'unavailable']);
    expect(replacement.confirmable).toBe(false);
    expect(replacement.unavailableReason).toContain('Confirmed item');
    expect(comparison.options.find((option) => option.action === 'full_refund')?.costs[0]).toMatchObject({ state: 'estimated', amountMinor: 4200, provenance: expect.stringContaining('amount at risk') });
  });

  it('enables same-item replacement only with a ready server projection and versions it into the token', () => {
    const replacement = {
      version: 'manual-same-item-replacement-v1' as const,
      ready: true,
      unavailableReasons: [],
      order: { id: 'order-1', externalId: 'ext-1', reference: '#1001', currency: 'GBP', internalHref: '/orders/order-1', providerHref: 'https://unit-test.myshopify.com/admin/orders/1', providerVerified: true },
      items: [{ claimedItemId: 'item-1', sourceOrderLineId: 'line-1', lineExternalId: 'line-ext-1', sku: 'SKU-1', variantRef: 'variant-1', title: 'Coat', orderedQuantity: 2, claimedQuantity: 2, confirmedReplacementQuantity: 0, outstandingAuthorisedQuantity: 0, availableQuantity: 2, costMinor: 1500, costCurrency: 'GBP', costProvenance: 'source_order_line_cost' as const }],
      latestHandoff: null,
    };
    const comparison = buildResolutionComparison({ ...fixture(), replacement });
    expect(comparison.options.find((option) => option.action === 'same_item_replacement')).toMatchObject({ confirmable: true, unavailableReason: null });
    expect(comparison.replacement?.items[0]).toMatchObject({ sku: 'SKU-1', availableQuantity: 2 });
    const changed = buildResolutionComparison({ ...fixture(), replacement: { ...replacement, items: [{ ...replacement.items[0], availableQuantity: 1 }] } });
    expect(changed.token).not.toBe(comparison.token);
  });

  it('does not require an amount for evidence, escalation, or no-additional-payout', () => {
    const comparison = buildResolutionComparison(fixture());
    for (const action of ['request_evidence', 'escalate', 'no_additional_payout'] as const) {
      expect(comparison.options.find((option) => option.action === action)).toMatchObject({ financial: false, costs: [] });
    }
  });

  it('blocks financial confirmation when currency is missing and surfaces prior concessions', () => {
    const input = fixture({ currency: null });
    input.context.order!.currency = null;
    const comparison = buildResolutionComparison(input);
    expect(comparison.options.find((option) => option.action === 'full_refund')).toMatchObject({ confirmable: false, unavailableReason: expect.stringContaining('currency') });
    expect(comparison.options.find((option) => option.action === 'partial_refund')?.contradictions[0]).toContain('prior refund record');
  });

  it('is stable for the same facts and changes with case or evidence versions', () => {
    const first = buildResolutionComparison(fixture());
    const same = buildResolutionComparison(fixture());
    const changed = buildResolutionComparison(fixture({ stateVersion: 5 }));
    expect(first.token).toBe(same.token);
    expect(changed.token).not.toBe(first.token);
    expect(first.token).toMatch(/^[a-f0-9]{64}$/);
  });
});
