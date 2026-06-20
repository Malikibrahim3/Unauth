import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';

function makeSupabase(input: {
  connection?: {
    store_key: string;
    status: string;
    uninstalled_at?: string | null;
    credentials_encrypted?: string | null;
    last_error?: string | null;
  } | null;
  connectionError?: string;
}) {
  return {
    from: (table: string) => {
      if (table === 'store_connections') {
        const result = input.connectionError
          ? { data: null, error: { message: input.connectionError } }
          : { data: input.connection ?? null, error: null };
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => result,
        };
        return chain;
      }
      return {};
    },
  };
}

describe('getShopifyConnectionStatus', () => {
  it('returns connected when active connection row and live token exist', async () => {
    const status = await getShopifyConnectionStatus(
      makeSupabase({
        connection: {
          store_key: 'unauth-test.myshopify.com',
          status: 'active',
          uninstalled_at: null,
          credentials_encrypted: 'token',
        },
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
          store_key: 'unauth-test.myshopify.com',
          status: 'inactive',
          uninstalled_at: '2026-05-27T00:00:00Z',
          credentials_encrypted: 'token',
        },
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
          store_key: 'unauth-test.myshopify.com',
          status: 'inactive',
          uninstalled_at: null,
          credentials_encrypted: 'token',
        },
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
        connection: {
          store_key: 'unauth-test.myshopify.com',
          status: 'active',
          uninstalled_at: null,
          credentials_encrypted: null,
        },
      }) as never,
      'merchant-1',
    );
    expect(status.connected).toBe(false);
    expect(status.linkState).toBe('not_connected');
  });
});
