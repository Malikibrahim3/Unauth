import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';

function makeSupabase(input: {
  connection?: { shop_domain: string; active: boolean; uninstalled_at?: string | null } | null;
  shop?: { access_token?: string | null; uninstalled_at?: string | null } | null;
  connectionError?: string;
}) {
  return {
    from: (table: string) => {
      if (table === 'merchant_shopify_connections') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (input.connectionError) {
                  return { data: null, error: { message: input.connectionError } };
                }
                return { data: input.connection ?? null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'shopify_merchants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: input.shop ?? null, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  };
}

describe('getShopifyConnectionStatus', () => {
  it('returns connected when active connection row and live token exist', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({
        connection: { shop_domain: 'unauth-test.myshopify.com', active: true },
        shop: { access_token: 'token', uninstalled_at: null },
      }) as never,
      'merchant-1',
    );
    expect(status).toEqual({
      connected: true,
      linkState: 'connected',
      shopDomain: 'unauth-test.myshopify.com',
      lastError: null,
    });
  });

  it('returns not_connected when query fails (e.g. invalid column)', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({ connectionError: 'column does not exist' }) as never,
      'merchant-1',
    );
    expect(status.connected).toBe(false);
    expect(status.linkState).toBe('not_connected');
  });

  it('returns disconnected when uninstalled_at is set on connection', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({
        connection: {
          shop_domain: 'unauth-test.myshopify.com',
          active: false,
          uninstalled_at: '2026-05-27T00:00:00Z',
        },
        shop: { access_token: null, uninstalled_at: '2026-05-27T00:00:00Z' },
      }) as never,
      'merchant-1',
    );
    expect(status.linkState).toBe('disconnected');
    expect(status.shopDomain).toBe('unauth-test.myshopify.com');
  });

  it('returns installed_unlinked when token exists but connection inactive without uninstall', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({
        connection: {
          shop_domain: 'unauth-test.myshopify.com',
          active: false,
          uninstalled_at: null,
        },
        shop: { access_token: 'token', uninstalled_at: null },
      }) as never,
      'merchant-1',
    );
    expect(status.linkState).toBe('installed_unlinked');
    expect(status.connected).toBe(false);
  });

  it('returns not_connected when merchant has no connection row', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({ connection: null }) as never,
      'merchant-1',
    );
    expect(status.linkState).toBe('not_connected');
  });

  it('returns not_connected when active row exists but token is missing', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({
        connection: { shop_domain: 'unauth-test.myshopify.com', active: true },
        shop: { access_token: null, uninstalled_at: null },
      }) as never,
      'merchant-1',
    );
    expect(status.connected).toBe(false);
    expect(status.linkState).toBe('not_connected');
  });
});
