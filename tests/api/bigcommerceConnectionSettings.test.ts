import { NextRequest } from 'next/server';

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

jest.mock('@/lib/commerce/bigcommerce/connectionSettings', () => ({
  getMerchantBigCommerceConnection: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { getMerchantBigCommerceConnection } from '@/lib/commerce/bigcommerce/connectionSettings';
import { GET } from '@/app/api/settings/bigcommerce/connection/route';

const MERCHANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('bigcommerce connection settings', () => {
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
    (getMerchantBigCommerceConnection as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      store_key: 'abc123xyz',
      store_url: 'https://api.bigcommerce.com/stores/abc123xyz',
      status: 'active',
      credentials_configured: true,
    });

    const res = await GET(new NextRequest('http://localhost'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.connection.store_key).toBe('abc123xyz');
  });
});
