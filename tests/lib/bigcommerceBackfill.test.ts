import type { SupabaseClient } from '@supabase/supabase-js';
import { backfillBigCommerceOrders } from '@/lib/commerce/bigcommerce/backfill';

jest.mock('@/lib/commerce/bigcommerce/bigcommerceApi', () => ({
  bigCommerceApiFetch: jest.fn(),
}));

jest.mock('@/lib/commerce/bigcommerce/processOrderWebhook', () => ({
  processBigCommerceOrderWebhook: jest.fn(),
}));

const { bigCommerceApiFetch } = jest.requireMock('@/lib/commerce/bigcommerce/bigcommerceApi') as {
  bigCommerceApiFetch: jest.Mock;
};

const { processBigCommerceOrderWebhook } = jest.requireMock(
  '@/lib/commerce/bigcommerce/processOrderWebhook',
) as { processBigCommerceOrderWebhook: jest.Mock };

describe('backfillBigCommerceOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    processBigCommerceOrderWebhook.mockResolvedValue(undefined);
  });

  it('lists orders and processes each through the webhook pipeline', async () => {
    bigCommerceApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 10 }, { id: 11 }],
    });

    const supabase = {} as SupabaseClient;
    const result = await backfillBigCommerceOrders({
      supabase,
      storeHash: 'abc123',
      accessToken: 'token',
    });

    expect(result.pages).toBe(1);
    expect(result.orders).toBe(2);
    expect(processBigCommerceOrderWebhook).toHaveBeenCalledTimes(2);
    expect(processBigCommerceOrderWebhook).toHaveBeenCalledWith({
      supabase,
      storeHash: 'abc123',
      webhookPayload: { data: { type: 'order', id: 10 } },
    });
  });

  it('throws when the orders list request fails', async () => {
    bigCommerceApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'forbidden',
    });

    await expect(
      backfillBigCommerceOrders({
        supabase: {} as SupabaseClient,
        storeHash: 'abc123',
        accessToken: 'token',
      }),
    ).rejects.toThrow(/bigcommerce_orders_list_failed/);
  });
});
