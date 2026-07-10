import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { GET as installGET } from '@/app/api/shopify/install/route';
import { GET as callbackGET } from '@/app/api/shopify/callback/route';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/account/ensureMerchantContext', () => ({
  ensureMerchantContextForUser: jest.fn(),
}));

jest.mock('@/lib/shopify/backfill', () => ({
  backfillShopifyMerchantIdentities: jest.fn(async () => ({ orders: 0, inserted: 0 })),
}));

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      void Promise.resolve().then(() => task());
    },
  };
});

jest.mock('@/lib/shopify/webhooks', () => ({
  registerShopifyWebhooks: jest.fn(async () => {}),
}));

jest.mock('@/lib/shopify/collectorScripts', () => ({
  registerShopifyCollectorScriptTags: jest.fn(async () => ({
    collectorScriptTagId: 'tag-1',
    initScriptTagId: 'tag-2',
  })),
}));

jest.mock('@/lib/shopify/resolveOAuthMerchantId', () => ({
  resolveOAuthMerchantId: jest.fn(),
}));

const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock;
  createServiceClient: jest.Mock;
};
const { ensureMerchantContextForUser } = jest.requireMock('@/lib/account/ensureMerchantContext') as {
  ensureMerchantContextForUser: jest.Mock;
};
const { resolveOAuthMerchantId } = jest.requireMock('@/lib/shopify/resolveOAuthMerchantId') as {
  resolveOAuthMerchantId: jest.Mock;
};
const { backfillShopifyMerchantIdentities } = jest.requireMock('@/lib/shopify/backfill') as {
  backfillShopifyMerchantIdentities: jest.Mock;
};

function buildOAuthCallbackParams(input: {
  shop: string;
  code: string;
  state: string;
  secret: string;
}) {
  const params = new URLSearchParams({
    code: input.code,
    shop: input.shop,
    state: input.state,
    timestamp: String(Math.floor(Date.now() / 1000)),
  });
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const hmac = crypto.createHmac('sha256', input.secret).update(message).digest('hex');
  params.set('hmac', hmac);
  return params;
}

/**
 * The OAuth install/callback routes no longer issue a bare 307 redirect.
 * They return an HTML "oauth complete" page (status 200) that postMessages the
 * opener and embeds the integrations fallback URL as `fallbackHref`. Extract
 * that URL so we can assert on the destination the user is sent to.
 */
async function extractFallbackHref(res: Response): Promise<string | null> {
  const body = await res.text();
  const match = body.match(/const fallbackHref = (".*?");/);
  if (!match) return null;
  return JSON.parse(match[1]) as string;
}

describe('Shopify OAuth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SHOPIFY_API_KEY = 'test-api-key';
    process.env.SHOPIFY_API_SECRET = 'test-api-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1', email: 'a@b.com', user_metadata: {} } } }) },
    });
    ensureMerchantContextForUser.mockResolvedValue({ merchantId: 'merchant-1' });
    resolveOAuthMerchantId.mockResolvedValue('merchant-1');
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'shop-token' }),
    })) as jest.Mock;
    backfillShopifyMerchantIdentities.mockResolvedValue({ orders: 0, inserted: 0 });
  });

  describe('install route', () => {
    it('normalizes admin.shopify.com/store/unauth-test and redirects to Shopify OAuth', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/shopify/install?shop=https%3A%2F%2Fadmin.shopify.com%2Fstore%2Funauth-test',
      );
      const res = await installGET(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('https://unauth-test.myshopify.com/admin/oauth/authorize');
      expect(new URL(location).searchParams.get('client_id')).toBe('test-api-key');
      expect(new URL(location).searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/shopify/callback',
      );
    });

    it('accepts unauth-test.myshopify.com unchanged', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/shopify/install?shop=unauth-test.myshopify.com',
      );
      const res = await installGET(req);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('https://unauth-test.myshopify.com/admin/oauth/authorize');
    });

    it('redirects invalid shop input to integrations with shopify_error', async () => {
      const req = new NextRequest('http://localhost:3000/api/shopify/install?shop=bad.store.example');
      const res = await installGET(req);
      expect(await extractFallbackHref(res)).toBe(
        'http://localhost:3000/settings/integrations?shopify_error=public_domain',
      );
    });
  });

  describe('callback route', () => {
    it('upserts store_connections with status active and returns integrations success', async () => {
      const upserts: Array<{ table: string; values: Record<string, unknown> }> = [];
      createServiceClient.mockReturnValue({
        from: (table: string) => ({
          upsert: async (values: Record<string, unknown>) => {
            upserts.push({ table, values });
            return { error: null };
          },
          update: () => {
            // Both store_connections (.eq.eq) and merchants (.eq) update chains
            // must resolve to { error: null }; eq is chainable and thenable.
            const chain: Record<string, unknown> = {
              eq: () => chain,
              then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }),
            };
            return chain;
          },
        }),
      });

      const state = 'state-abc';
      const params = buildOAuthCallbackParams({
        shop: 'unauth-test.myshopify.com',
        code: 'auth-code',
        state,
        secret: 'test-api-secret',
      });
      const req = new NextRequest(
        `http://localhost:3000/api/shopify/callback?${params.toString()}`,
        {
          headers: { cookie: `shopify_oauth_state=${state}` },
        } as RequestInit,
      );

      const res = await callbackGET(req);
      expect(res.status).toBe(200);
      expect(await extractFallbackHref(res)).toBe(
        'http://localhost:3000/settings/integrations?shopify_connected=1&shop=unauth-test.myshopify.com',
      );

      const connectionUpsert = upserts.find((row) => row.table === 'store_connections');
      expect(connectionUpsert?.values).toMatchObject({
        merchant_id: 'merchant-1',
        platform: 'shopify',
        store_key: 'unauth-test.myshopify.com',
        status: 'active',
        uninstalled_at: null,
      });
      expect(backfillShopifyMerchantIdentities).toHaveBeenCalled();
    });

    it('redirects to integrations with shopify_error when OAuth state is invalid', async () => {
      const params = buildOAuthCallbackParams({
        shop: 'unauth-test.myshopify.com',
        code: 'auth-code',
        state: 'expected-state',
        secret: 'test-api-secret',
      });
      const req = new NextRequest(
        `http://localhost:3000/api/shopify/callback?${params.toString()}`,
        {
          headers: { cookie: 'shopify_oauth_state=other-state' },
        } as RequestInit,
      );

      const res = await callbackGET(req);
      expect(await extractFallbackHref(res)).toBe(
        'http://localhost:3000/settings/integrations?shopify_error=invalid_state',
      );
    });

    it('redirects with missing_merchant when merchant cannot be resolved', async () => {
      resolveOAuthMerchantId.mockResolvedValue(null);
      createServiceClient.mockReturnValue({
        from: () => ({
          upsert: async () => ({ error: null }),
        }),
      });

      const state = 'state-no-merchant';
      const params = buildOAuthCallbackParams({
        shop: 'unauth-test.myshopify.com',
        code: 'auth-code',
        state,
        secret: 'test-api-secret',
      });
      const req = new NextRequest(
        `http://localhost:3000/api/shopify/callback?${params.toString()}`,
        {
          headers: { cookie: `shopify_oauth_state=${state}` },
        } as RequestInit,
      );

      const res = await callbackGET(req);
      expect(await extractFallbackHref(res)).toBe(
        'http://localhost:3000/settings/integrations?shopify_error=missing_merchant',
      );
    });
  });
});

describe('Shopify connected UI status source', () => {
  it('getShopifyConnectionStatus returns connected for active row with live token', async () => {
    const { getShopifyConnectionStatus } = await import('@/lib/shopify/connectionStatus');
    // v2: a single store_connections row holds status + encrypted credentials.
    // Chain: .select(...).eq(...).eq(...).order(...).limit(...).maybeSingle()
    const serviceClient = {
      from: (table: string) => {
        if (table === 'store_connections') {
          const builder: Record<string, unknown> = {
            select: () => builder,
            eq: () => builder,
            order: () => builder,
            limit: () => builder,
            maybeSingle: async () => ({
              data: {
                store_key: 'unauth-test.myshopify.com',
                status: 'active',
                uninstalled_at: null,
                credentials_encrypted: 'enc-token',
                last_error: null,
              },
              error: null,
            }),
          };
          return builder;
        }
        return {};
      },
    };
    const status = await getShopifyConnectionStatus(serviceClient as never, 'merchant-1');
    expect(status.connected).toBe(true);
    expect(status.linkState).toBe('connected');
    expect(status.shopDomain).toBe('unauth-test.myshopify.com');
  });
});
