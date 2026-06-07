import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';

describe('registerShopifyWebhooks', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test';
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => '',
    })) as jest.Mock;
  });

  it('registers all expected Shopify topics against the app webhook URL', async () => {
    await registerShopifyWebhooks({
      shopDomain: 'unit-test.myshopify.com',
      accessToken: 'shop-token',
    });

    expect(global.fetch).toHaveBeenCalledTimes(9);
    const bodies = (global.fetch as jest.Mock).mock.calls.map((call) => JSON.parse(call[1].body));
    expect(bodies.map((body) => body.webhook.topic).sort()).toEqual([
      'app/uninstalled',
      'disputes/create',
      'disputes/updated',
      'fulfillments/create',
      'fulfillments/update',
      'orders/cancelled',
      'orders/create',
      'orders/updated',
      'refunds/create',
    ]);
    expect(bodies.every((body) => body.webhook.address === 'https://app.example.test/api/shopify/webhooks')).toBe(true);
  });

  it('throws when Shopify rejects webhook registration', async () => {
    global.fetch = jest.fn(async (_url, init) => {
      const topic = JSON.parse(String(init?.body)).webhook.topic;
      return {
        ok: topic !== 'orders/create',
        status: topic === 'orders/create' ? 403 : 201,
        text: async () => (topic === 'orders/create' ? '{"errors":"missing scope"}' : ''),
      };
    }) as jest.Mock;

    await expect(registerShopifyWebhooks({
      shopDomain: 'unit-test.myshopify.com',
      accessToken: 'shop-token',
    })).rejects.toThrow(/orders\/create -> 403/);
  });
});
