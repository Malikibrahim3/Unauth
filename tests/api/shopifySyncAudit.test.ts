import { POST } from '@/app/api/shopify/sync-audit/route';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { MANAGE_SETTINGS: 'manage_settings' },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/shopify/connectionStatus', () => ({
  getShopifyConnectionStatus: jest.fn(),
}));

jest.mock('@/lib/commerce/credentialCrypto', () => ({
  decryptBigCommerceOAuthCredentials: jest.fn(() => ({ access_token: 'shop-token' })),
}));

jest.mock('@/lib/shopify/backfill', () => ({
  backfillShopifyMerchantIdentities: jest.fn(async () => ({ orders: 13, inserted: 0 })),
}));

const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server') as {
  createClient: jest.Mock;
  createServiceClient: jest.Mock;
};
const { requirePermission } = jest.requireMock('@/lib/permissions') as { requirePermission: jest.Mock };
const { getShopifyConnectionStatus } = jest.requireMock('@/lib/shopify/connectionStatus') as {
  getShopifyConnectionStatus: jest.Mock;
};
const { backfillShopifyMerchantIdentities } = jest.requireMock('@/lib/shopify/backfill') as {
  backfillShopifyMerchantIdentities: jest.Mock;
};

describe('Shopify manual sync route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    });
    createServiceClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { credentials_encrypted: 'encrypted' }, error: null }),
              }),
            }),
          }),
        }),
      }),
    });
    requirePermission.mockResolvedValue({ denied: null, ctx: { merchantId: 'merchant-1' } });
    getShopifyConnectionStatus.mockResolvedValue({
      connected: true,
      shopDomain: 'merchant-a.myshopify.com',
    });
  });

  it('passes the merchant identity so canonical sync state is updated', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(backfillShopifyMerchantIdentities).toHaveBeenCalledWith({
      supabase: expect.anything(),
      shopDomain: 'merchant-a.myshopify.com',
      accessToken: 'shop-token',
      merchantId: 'merchant-1',
    });
  });
});
