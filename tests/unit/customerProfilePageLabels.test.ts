import { customerClaimSummaryDisplay } from '@/app/(app)/customers/[id]/customerProfilePageLabels';

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
