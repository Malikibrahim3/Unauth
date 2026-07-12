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
    // v2: connection lives in store_connections, orders in source_orders.
    (createServiceClient as jest.Mock).mockReturnValue({
      from: (table: string) => {
        if (table === 'store_connections') {
          const builder: Record<string, unknown> = {
            select: () => builder,
            eq: () => builder,
            neq: () => builder,
            limit: () => builder,
            maybeSingle: async () => ({ data: { id: 'conn-1' }, error: null }),
          };
          return builder;
        }
        if (table === 'source_orders') {
          const builder: Record<string, unknown> = {
            select: () => builder,
            eq: () => builder,
            in: () => builder,
            order: async () => ({
              data: [{
                external_id: 'o1',
                order_number: '1001',
                placed_at: '2026-05-20T00:00:00Z',
                ingested_at: '2026-05-20T00:00:00Z',
                total_price: 49.99,
                currency: 'USD',
                financial_status: 'paid',
                fulfillment_state: 'fulfilled',
                cancelled_at: null,
              }],
              error: null,
            }),
          };
          return builder;
        }
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
