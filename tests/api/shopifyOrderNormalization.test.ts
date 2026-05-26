import { processWebhook } from '@/app/api/shopify/webhooks/route';

const upsertRowsMock = jest.fn(async () => {});

jest.mock('@/lib/shopify/identity', () => ({
  normalizeAddress: (v: any) => (v ? 'addr' : null),
  normalizeEmail: (v: any) => (typeof v === 'string' ? v.toLowerCase() : null),
  normalizePhone: (v: any) => (typeof v === 'string' ? v : null),
  upsertMerchantIdentityRows: (...args: any[]) => upsertRowsMock(...args),
}));

describe('shopify order normalization', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function supabaseStub(opts?: { token?: string | null }) {
    return {
      from: (table: string) => {
        if (table === 'shopify_merchants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { access_token: opts?.token ?? null }, error: null }),
              }),
            }),
          };
        }
        if (table === 'shopify_order_signals') {
          return {
            upsert: async () => ({ error: null }),
          };
        }
        return {};
      },
    };
  }

  it('uses order.email when present', async () => {
    await processWebhook(JSON.stringify({ id: 1, email: 'A@B.COM' }), 'unit-test.myshopify.com', 'orders/create', supabaseStub());
    const rows = upsertRowsMock.mock.calls[0][1];
    expect(rows[0].email).toBe('a@b.com');
  });

  it('uses customer.email when order email missing', async () => {
    await processWebhook(JSON.stringify({ id: 2, customer: { id: 7, email: 'C@D.COM' } }), 'unit-test.myshopify.com', 'orders/updated', supabaseStub());
    const rows = upsertRowsMock.mock.calls[0][1];
    expect(rows[0].email).toBe('c@d.com');
  });

  it('uses shipping address when present', async () => {
    await processWebhook(JSON.stringify({ id: 3, shipping_address: { address1: 'x' } }), 'unit-test.myshopify.com', 'orders/create', supabaseStub());
    const rows = upsertRowsMock.mock.calls[0][1];
    expect(rows[0].shipping_address).toBe('addr');
  });

  it('uses billing address when present', async () => {
    await processWebhook(JSON.stringify({ id: 4, billing_address: { address1: 'x' } }), 'unit-test.myshopify.com', 'orders/create', supabaseStub());
    const rows = upsertRowsMock.mock.calls[0][1];
    expect(rows[0].billing_address).toBe('addr');
  });

  it('hydrates from customer API when customer_id exists and order identity fields missing', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ customer: { email: 'fallback@test.com', phone: '1234', default_address: { address1: 'x' } } }),
    } as any);
    await processWebhook(JSON.stringify({ id: 5, customer: { id: 999 } }), 'unit-test.myshopify.com', 'orders/create', supabaseStub({ token: 'tok' }));
    const rows = upsertRowsMock.mock.calls[0][1];
    expect(rows[0].email).toBe('fallback@test.com');
    expect(rows[0].shipping_address).toBe('addr');
    expect(rows[0].billing_address).toBe('addr');
    fetchSpy.mockRestore();
  });
});
