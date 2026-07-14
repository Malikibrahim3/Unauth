import { pickLatestShopifyConnection } from '@/lib/integrations/auth';

describe('Shopify integration connection selection', () => {
  it('uses the newest connection instead of an older revoked row', () => {
    const selected = pickLatestShopifyConnection([
      {
        platform: 'shopify',
        store_key: 'merchant-b.myshopify.com',
        status: 'revoked',
        last_sync_at: null,
        last_error: null,
        installed_at: '2026-06-16T13:05:42.048Z',
      },
      {
        platform: 'shopify',
        store_key: 'merchant-a.myshopify.com',
        status: 'active',
        last_sync_at: '2026-06-20T23:42:48.677Z',
        last_error: null,
        installed_at: '2026-06-20T23:42:48.677Z',
      },
    ]);

    expect(selected).toMatchObject({
      store_key: 'merchant-a.myshopify.com',
      status: 'active',
    });
  });
});
