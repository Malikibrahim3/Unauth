import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createServiceClient: jest.fn() }));
jest.mock('@/lib/permissions', () => ({ PERMISSIONS: { VIEW_CUSTOMERS: 'view_customers' }, requirePermission: jest.fn() }));
jest.mock('@/lib/supabase/merchantHelpers', () => ({ fetchMerchantScopedCustomerProfile: jest.fn() }));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { GET } from '@/app/api/customers/[id]/shopify-orders/route';

describe('shopify orders route for claims picker', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns merchant-scoped shopify orders for picker', async () => {
    (createClient as jest.Mock).mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } });
    (requirePermission as jest.Mock).mockResolvedValue({ denied: null, ctx: { merchantId: 'm1', userId: 'u1' } });
    (fetchMerchantScopedCustomerProfile as jest.Mock).mockResolvedValue({ emails: ['a@b.com'] });
    (createServiceClient as jest.Mock).mockReturnValue({
      from: (table: string) => {
        if (table === 'merchant_shopify_connections') return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { shop_domain: 's.myshopify.com' }, error: null }) }) }) }) }) };
        if (table === 'merchant_identities') return { select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: [{ source_id: 'o1', email: 'a@b.com' }], error: null }) }) }) }) };
        if (table === 'shopify_order_signals') return { select: () => ({ eq: () => ({ in: () => ({ order: async () => ({ data: [{ shopify_order_id: 'o1', order_number: '1001', created_at_shopify: '2026-05-20T00:00:00Z', total_price: 49.99, currency: 'USD', financial_status: 'paid', fulfillment_status: 'fulfilled', cancelled_at: null }], error: null }) }) }) }) };
        return {};
      },
    });

    const res = await GET(new NextRequest('http://localhost/api/customers/p1/shopify-orders'), { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders.length).toBe(1);
    expect(body.orders[0].id).toBe('o1');
  });
});
