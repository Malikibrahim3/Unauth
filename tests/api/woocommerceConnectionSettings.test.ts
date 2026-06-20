import { NextRequest } from 'next/server';

// `after()` schedules post-response work; outside a request scope it throws,
// so run the callback inline (the backfill is mocked to a no-op below).
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      void Promise.resolve().then(() => task());
    },
  };
});

jest.mock('@/lib/commerce/woocommerce/backfill', () => ({
  backfillWooCommerceOrders: jest.fn(async () => ({})),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: {
    VIEW_SETTINGS: 'view_settings',
    MANAGE_SETTINGS: 'manage_settings',
  },
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/permissions/audit', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/lib/commerce/woocommerce/settingsConnection', () => ({
  getMerchantWooCommerceConnection: jest.fn(),
  createMerchantWooCommerceConnection: jest.fn(),
  updateMerchantWooCommerceConnection: jest.fn(),
  woocommerceConnectionInputSchema: {
    safeParse: (body: unknown) => {
      const b = body as Record<string, string>;
      if (b?.store_url && b?.consumer_key && b?.consumer_secret) {
        return { success: true, data: b };
      }
      return { success: false };
    },
  },
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import {
  createMerchantWooCommerceConnection,
  getMerchantWooCommerceConnection,
} from '@/lib/commerce/woocommerce/settingsConnection';
import { GET, POST } from '@/app/api/settings/woocommerce/connection/route';

const MERCHANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('woocommerce connection settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    });
    (createServiceClient as jest.Mock).mockReturnValue({});
    (requirePermission as jest.Mock).mockResolvedValue({
      denied: null,
      ctx: { merchantId: MERCHANT_A, userId: 'user-1' },
    });
  });

  it('GET returns connection', async () => {
    (getMerchantWooCommerceConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      store_key: 'store.example.com',
      store_url: 'https://store.example.com',
      status: 'active',
      credentials_configured: true,
    });

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.connection.store_key).toBe('store.example.com');
  });

  it('POST creates connection when none active', async () => {
    (getMerchantWooCommerceConnection as jest.Mock).mockResolvedValue(null);
    (createMerchantWooCommerceConnection as jest.Mock).mockResolvedValue({
      connection: { id: 'conn-1', status: 'active', store_key: 'store.example.com' },
      webhooks_registered: ['order.created'],
      webhooks_failed: [],
    });

    const req = new NextRequest('http://localhost/api/settings/woocommerce/connection', {
      method: 'POST',
      body: JSON.stringify({
        store_url: 'https://store.example.com',
        consumer_key: 'ck_test',
        consumer_secret: 'cs_test',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createMerchantWooCommerceConnection).toHaveBeenCalled();
  });
});
