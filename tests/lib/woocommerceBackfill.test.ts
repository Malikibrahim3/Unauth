import type { SupabaseClient } from '@supabase/supabase-js';
import { backfillWooCommerceOrders } from '@/lib/commerce/woocommerce/backfill';

jest.mock('@/lib/commerce/woocommerce/woocommerceApi', () => ({
  wooCommerceApiFetch: jest.fn(),
}));

jest.mock('@/lib/commerce/woocommerce/processOrderWebhook', () => ({
  processWooCommerceOrderWebhook: jest.fn(),
}));

const { wooCommerceApiFetch } = jest.requireMock('@/lib/commerce/woocommerce/woocommerceApi') as {
  wooCommerceApiFetch: jest.Mock;
};

const { processWooCommerceOrderWebhook } = jest.requireMock(
  '@/lib/commerce/woocommerce/processOrderWebhook',
) as { processWooCommerceOrderWebhook: jest.Mock };

describe('backfillWooCommerceOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    processWooCommerceOrderWebhook.mockResolvedValue(undefined);
  });

  it('pages through WooCommerce orders and ingests each payload', async () => {
    wooCommerceApiFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (name: string) => (name === 'X-WP-TotalPages' ? '1' : null) },
      json: async () => [{ id: 501, status: 'completed' }],
    });

    const supabase = {} as SupabaseClient;
    const result = await backfillWooCommerceOrders({
      supabase,
      storeUrl: 'https://shop.example.com',
      storeKey: 'shop.example.com',
      credentials: { consumer_key: 'ck', consumer_secret: 'cs' },
    });

    expect(result.pages).toBe(1);
    expect(result.orders).toBe(1);
    expect(processWooCommerceOrderWebhook).toHaveBeenCalledWith({
      supabase,
      storeKey: 'shop.example.com',
      payload: { id: 501, status: 'completed' },
    });
  });
});
