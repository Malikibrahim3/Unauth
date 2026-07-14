import { mapShopifyOrder } from '@/lib/connectors/providers/shopify/mappings';
import { mapShipBobOrder } from '@/lib/connectors/providers/shipbob/mappings';
import { mapCarrierProofToEvidence } from '@/lib/integrations/evidenceMapper';

describe('Shopify → ShipBob → carrier normalization isolation', () => {
  it('reconciles provider-neutral references while keeping evidence merchant-scoped', () => {
    const shopify = mapShopifyOrder({
      id: 'ORDER-SHARED',
      currency: 'GBP',
      total_price: '84.00',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      line_items: [],
    }).order;
    const shipBob = mapShipBobOrder({
      reference_id: 'ORDER-SHARED',
      shipments: [{
        id: 'SHIPMENT-SHARED',
        status: 'Delivered',
        tracking_number: 'TRACKING-SHARED',
        carrier: 'UPS',
      }],
    });

    expect(shopify?.externalId).toBe(shipBob.shipments[0].orderExternalId);
    expect(shipBob.shipments[0].trackingNumber).toBe('TRACKING-SHARED');

    const payload = { trackResponse: { shipment: [{ package: [{ trackingNumber: 'TRACKING-SHARED' }] }] } };
    const merchantA = [
      ...mapCarrierProofToEvidence('ups', payload, { merchantId: 'merchant-a', trackingNumber: 'TRACKING-SHARED' }),
      ...mapCarrierProofToEvidence('fedex', payload, { merchantId: 'merchant-a', trackingNumber: 'TRACKING-SHARED' }),
    ];
    const merchantB = mapCarrierProofToEvidence('ups', payload, {
      merchantId: 'merchant-b',
      trackingNumber: 'TRACKING-SHARED',
    });

    expect(merchantA.every((item) => item.merchantId === 'merchant-a')).toBe(true);
    expect(merchantB.every((item) => item.merchantId === 'merchant-b')).toBe(true);
    expect(new Set(merchantA.map((item) => item.id)).has(merchantB[0].id)).toBe(false);
    expect(merchantA.map((item) => item.sourceProvider)).toEqual(expect.arrayContaining(['ups', 'fedex']));
  });
});
