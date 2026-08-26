import { buildCustomerProfileMetricLabels, customerClaimSummaryDisplay, linkageIndicatorBasis } from '@/app/(app)/customers/[id]/customerProfilePageLabels';

describe('customer profile claim summary copy', () => {
  it('uses canonical labels and the merchant-facing order reference', () => {
    expect(customerClaimSummaryDisplay({
      id: 'b1312b8c-4c57-45c7-8a11-47f57e51635f',
      claim_type: 'item_not_received',
      status: 'awaiting_carrier_response',
      order_ref: '#1042',
      shopify_order_id: 'seed-demo-v2-order-carrier-proof',
    })).toEqual({
      status: 'Waiting on carrier',
      claimType: 'Item not received',
      orderReference: '#1042',
    });
  });
});

describe('customer profile coverage labels', () => {
  it('preserves complete zero while suppressing false zero under incomplete coverage', () => {
    expect(buildCustomerProfileMetricLabels({
      orderCoverage: 'complete', caseCoverage: 'complete', merchantOrderCount: 2,
      merchantClaimCount: 0, merchantChargebackCount: 0, totalOrderValue: 40,
      totalRefundedValue: 0, displayCurrency: 'GBP', merchantNarrative: 'No observed case pattern.',
    }).caseContext).toBe('No recorded cases');
    expect(buildCustomerProfileMetricLabels({
      orderCoverage: 'partial', caseCoverage: 'unavailable', merchantOrderCount: 2,
      merchantClaimCount: null, merchantChargebackCount: null, totalOrderValue: 40,
      totalRefundedValue: null, displayCurrency: 'GBP', merchantNarrative: 'No observed case pattern.',
    })).toMatchObject({ caseContext: 'Unavailable', caseRate: 'Case rate unavailable' });
  });

  it('names the heuristic linkage basis without exposing raw identifiers', () => {
    expect(linkageIndicatorBasis({ identifierCount: 2, signalLabel: 'email', observedOrderCount: 8 }))
      .toBe('Basis: 2 distinct email identifiers across 8 observed orders.');
  });
});
