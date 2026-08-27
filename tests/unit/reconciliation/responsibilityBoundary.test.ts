import { evaluateReconciliation } from '@/lib/reconciliation/recommendations';
import type { ReconciliationInput } from '@/lib/reconciliation/types';

const base = (evidenceType: string): ReconciliationInput => ({
  claimType: 'missing_item',
  identityConfirmed: true,
  orderConfirmed: true,
  claimedItems: [{ id: 'item-1', sku: 'SKU-1', quantity: 1, matchStatus: 'confirmed' }],
  parcels: [],
  facts: [{ id: 'fact-1', factKind: 'source_fact', evidenceType, sourceProvider: 'fixture' }],
  now: '2026-08-22T12:00:00.000Z',
});
describe('responsibility boundary', () => {
  it.each([
    ['merchant_fault', 'merchant_side_likely'],
    ['short_pick', 'fulfilment_side_likely'],
    ['carrier_exception', 'carrier_side_likely'],
  ])('maps %s to %s without recording a merchant decision', (evidenceType, expected) => {
    const result = evaluateReconciliation(base(evidenceType));
    expect(result.recommendations.responsibility.resultCode).toBe(expected);
    expect(result.recommendations.responsibility.assessmentState).toBe('likely');
    expect(result.recommendations.responsibility.missingEvidence.length).toBeGreaterThan(0);
  });

  it('keeps copied or conflicting source lineage unresolved', () => {
    const result = evaluateReconciliation({
      ...base('delivery_scan'),
      facts: [{ ...base('delivery_scan').facts[0], conflicts: ['fact-2'] }],
    });
    expect(result.recommendations.responsibility.resultCode).toBe('unresolved');
    expect(result.recommendations.responsibility.conflictingEvidenceIds).toContain('fact-1');
  });
});
