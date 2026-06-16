import { backfillShopifyOrders } from '@/lib/shopify/backfill';
import { processShopifyOrderPayload } from '@/lib/shopify/ingest';

jest.mock('@/lib/shopify/ingest', () => ({
  processShopifyOrderPayload: jest.fn(async () => ({
    ingested: true,
    merchantId: 'merchant-1',
    connectionId: 'conn-1',
  })),
}));

describe('backfillShopifyOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => ({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        orders: [
          {
            id: 1001,
            email: 'shopper@example.com',
            customer: { id: 501, email: 'shopper@example.com' },
            refunds: [{ id: 9001, order_id: 1001, transactions: [{ amount: '5.00' }] }],
            fulfillments: [{ id: 8001, order_id: 1001, status: 'success' }],
          },
        ],
      }),
    })) as jest.Mock;
  });

  it('pulls Shopify orders into the v2 source ingest path', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('store_connections');
        return {
          update: (values: Record<string, unknown>) => {
            updates.push(values);
            return {
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            };
          },
        };
      },
    };

    const result = await backfillShopifyOrders({
      shopDomain: 'acme.myshopify.com',
      accessToken: 'token',
      supabase,
    });

    expect(result).toMatchObject({
      pages_fetched: 1,
      orders: 1,
      source_orders_upserted: 1,
      errors: 0,
    });
    expect(processShopifyOrderPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        shopDomain: 'acme.myshopify.com',
        payload: expect.objectContaining({ id: 1001 }),
        ingestEmbeddedResources: true,
      }),
    );
    expect(updates[0]).toMatchObject({ last_error: null });
  });
});
