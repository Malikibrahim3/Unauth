import { processWebhook } from '@/app/api/shopify/webhooks/route';

/**
 * The Shopify webhook order path was rewritten onto the v2 source_* model
 * (source_connections -> source_customers -> source_addresses -> source_orders),
 * replacing the legacy shopify_order_signals / merchant_identities path. These
 * tests assert the normalization the new pipeline performs by capturing the
 * source_orders upsert payload and the source_addresses inserts.
 *
 * Identity observation/resolution is exercised elsewhere; mock it out here so
 * these focused normalization tests don't require the full identity stack.
 */

jest.mock('@/lib/identity/observations', () => ({
  emitIdentityObservations: jest.fn(async () => ({ signalKeys: [] })),
}));

jest.mock('@/lib/identity/resolver', () => ({
  emitIdentityObservations: jest.fn(async () => ({ signalKeys: [] })),
  resolveIdentitiesForKeys: jest.fn(async () => {}),
  linkClaimToIdentity: jest.fn(async () => {}),
}));

jest.mock('@/lib/checkoutSignals/linkOrder', () => ({
  linkCheckoutSignalsToOrder: jest.fn(async () => {}),
}));

type Captured = {
  orderUpserts: Array<Record<string, any>>;
  addressInserts: Array<Record<string, any>>;
};

describe('shopify order normalization', () => {
  let captured: Captured;

  beforeEach(() => {
    captured = { orderUpserts: [], addressInserts: [] };
  });

  /**
   * Faithful stub of the v2 ingest query chains:
   *   store_connections: select().eq().eq().maybeSingle() -> connection row
   *   source_customers:  upsert().select().single() -> { id }
   *   source_addresses:  insert().select().single() -> { id }, capturing payload
   *   source_orders:     select().eq()...maybeSingle() (lookup) AND
   *                      upsert().select().single() -> { id }, capturing payload
   */
  function supabaseStub() {
    let nextId = 1;
    const idFor = (p: string) => `${p}-${nextId++}`;

    return {
      from: (table: string) => {
        if (table === 'store_connections') {
          const builder: Record<string, any> = {
            select: () => builder,
            eq: () => builder,
            maybeSingle: async () => ({
              data: { id: 'conn-1', merchant_id: 'merchant-1', status: 'active' },
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'source_customers') {
          return {
            upsert: () => ({
              select: () => ({
                single: async () => ({ data: { id: idFor('cust') }, error: null }),
              }),
            }),
          };
        }
        if (table === 'source_addresses') {
          return {
            insert: (payload: Record<string, any>) => {
              captured.addressInserts.push(payload);
              return {
                select: () => ({
                  single: async () => ({ data: { id: idFor('addr') }, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'source_orders') {
          // lookup chain: select().eq().eq().eq().maybeSingle()
          // upsert chain: upsert().select().single()
          const builder: Record<string, any> = {
            select: () => builder,
            eq: () => builder,
            maybeSingle: async () => ({ data: null, error: null }),
            upsert: (payload: Record<string, any>) => {
              captured.orderUpserts.push(payload);
              return {
                select: () => ({
                  single: async () => ({ data: { id: idFor('order') }, error: null }),
                }),
              };
            },
          };
          return builder;
        }
        // Any other table (embedded children, etc.) — chainable no-op.
        const noop: Record<string, any> = {
          select: () => noop,
          insert: () => noop,
          upsert: () => noop,
          update: () => noop,
          eq: () => noop,
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          then: (resolve: (v: { data: any[]; error: null }) => unknown) =>
            resolve({ data: [], error: null }),
        };
        return noop;
      },
    };
  }

  it('uses order.email when present', async () => {
    await processWebhook(
      JSON.stringify({ id: 1, email: 'a@b.com' }),
      'unit-test.myshopify.com',
      'orders/create',
      supabaseStub() as never,
    );
    expect(captured.orderUpserts[0].email).toBe('a@b.com');
  });

  it('falls back to customer.email when order email missing', async () => {
    await processWebhook(
      JSON.stringify({ id: 2, customer: { id: 7, email: 'c@d.com' } }),
      'unit-test.myshopify.com',
      'orders/updated',
      supabaseStub() as never,
    );
    expect(captured.orderUpserts[0].email).toBe('c@d.com');
  });

  it('normalizes and stores the shipping address when present', async () => {
    await processWebhook(
      JSON.stringify({ id: 3, shipping_address: { address1: 'x' } }),
      'unit-test.myshopify.com',
      'orders/create',
      supabaseStub() as never,
    );
    const shipping = captured.addressInserts.find((a) => a.kind === 'shipping');
    expect(shipping?.normalized_full).toBe('x');
    expect(captured.orderUpserts[0].shipping_address_id).toBeTruthy();
  });

  it('normalizes and stores the billing address when present', async () => {
    await processWebhook(
      JSON.stringify({ id: 4, billing_address: { address1: 'x' } }),
      'unit-test.myshopify.com',
      'orders/create',
      supabaseStub() as never,
    );
    const billing = captured.addressInserts.find((a) => a.kind === 'billing');
    expect(billing?.normalized_full).toBe('x');
    expect(captured.orderUpserts[0].billing_address_id).toBeTruthy();
  });
});
