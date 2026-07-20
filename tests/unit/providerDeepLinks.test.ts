import {
  shopifyCustomerUrl,
  shopifyOrderUrl,
  shipBobOrdersUrl,
  shipBobShipmentUrl,
} from '@/lib/links/providerDeepLinks';
import { deriveSourceLink, type SourceLinkContext } from '@/lib/relationships/sourceLinking';
import { shopifyConnector } from '@/lib/connectors/providers/shopify';
import { shipbobConnector } from '@/lib/connectors/providers/shipbob';

const context: SourceLinkContext = {
  storeConnections: [{
    id: 'shopify-connection',
    storeKey: 'unauth-test.myshopify.com',
    storeUrl: 'https://unauth-test.myshopify.com',
  }],
  integrations: [{
    id: 'shipbob-connection',
    providerId: 'shipbob',
    providerBaseUrl: 'https://sandbox-api.shipbob.com/2026-01',
    environment: 'sandbox',
  }],
  sourceAccounts: [{
    id: 'shipbob-account',
    connectionId: 'shipbob-connection',
    providerId: 'shipbob',
    baseUrl: 'https://sandbox-api.shipbob.com/2026-01',
    environment: 'sandbox',
  }],
};

describe('provider deep links', () => {
  it('builds Shopify Admin links from the store origin', () => {
    expect(shopifyOrderUrl('https://unauth-test.myshopify.com/admin', '16963369959793'))
      .toBe('https://unauth-test.myshopify.com/admin/orders/16963369959793');
    expect(shopifyCustomerUrl('unauth-test.myshopify.com/', '12345'))
      .toBe('https://unauth-test.myshopify.com/admin/customers/12345');
  });

  it('builds the ShipBob sandbox list and detail routes', () => {
    expect(shipBobOrdersUrl('sandbox'))
      .toBe('https://webstage.shipbob.dev/app/merchant/#/order-shipment-management/orders');
    expect(shipBobShipmentUrl('sandbox', '23344444', '107287561'))
      .toBe('https://webstage.shipbob.dev/app/merchant/#/order-shipment-management/orders/23344444/shipments/107287561');
    expect(shipBobShipmentUrl('production', '23344444', '107287561'))
      .toBe('https://app.shipbob.com/app/merchant/#/order-shipment-management/orders/23344444/shipments/107287561');
  });

  it('resolves Shopify order/customer links from connection metadata', () => {
    expect(deriveSourceLink({
      context,
      entityType: 'order',
      row: { external_id: '16963369959793', source: 'shopify', connection_id: 'shopify-connection' },
    })).toMatchObject({
      sourceSystem: 'shopify',
      sourceUrl: 'https://unauth-test.myshopify.com/admin/orders/16963369959793',
    });
    expect(deriveSourceLink({
      context,
      entityType: 'customer',
      row: { external_id: '12345', source: 'shopify', connection_id: 'shopify-connection' },
    })?.sourceUrl).toBe('https://unauth-test.myshopify.com/admin/customers/12345');
  });

  it('resolves a ShipBob fulfilment through its parent order', () => {
    expect(deriveSourceLink({
      context,
      entityType: 'fulfilment',
      row: { external_id: '107287561', source_account_id: 'shipbob-account' },
      parentOrder: { external_id: '23344444', source: 'shipbob', source_account_id: 'shipbob-account' },
    })).toMatchObject({
      sourceSystem: 'shipbob',
      sourceUrl: 'https://webstage.shipbob.dev/app/merchant/#/order-shipment-management/orders/23344444/shipments/107287561',
    });
  });

  it('uses the provider adapters for the same canonical routes', () => {
    expect(shopifyConnector.deepLink({
      entityType: 'order',
      externalId: '1',
      providerAccountBaseUrl: 'https://unauth-test.myshopify.com',
    })).toBe('https://unauth-test.myshopify.com/admin/orders/1');
    expect(shipbobConnector.deepLink({
      entityType: 'shipment',
      externalId: '107287561',
      relatedOrderExternalId: '23344444',
      providerEnvironment: 'sandbox',
    })).toBe('https://webstage.shipbob.dev/app/merchant/#/order-shipment-management/orders/23344444/shipments/107287561');
  });
});

