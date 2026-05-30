jest.mock('@/lib/processing/worker', () => ({
  processCsvJob: jest.fn().mockResolvedValue([]),
}));

import { processCsvJob } from '@/lib/processing/worker';
import {
  backfillShopifyAuditTransactions,
  scoreShopifyOrdersIntoAudit,
} from '@/lib/shopify/auditBridge';

function makeSupabaseFixtures() {
  const connections = [{ merchant_id: 'merchant-1', shop_domain: 'acme.myshopify.com', active: true }];
  const jobs: Array<Record<string, unknown>> = [];
  const signals = [
    {
      shop_domain: 'acme.myshopify.com',
      shopify_order_id: '1001',
      created_at_shopify: '2026-05-26T10:00:00+00:00',
      total_price: 50,
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      refunds_count: 0,
      payment_gateway_names: [],
      shipping_country: 'US',
    },
    {
      shop_domain: 'acme.myshopify.com',
      shopify_order_id: '1002',
      created_at_shopify: '2026-05-26T11:00:00+00:00',
      total_price: 25,
      currency: 'USD',
      financial_status: 'paid',
      fulfillment_status: null,
      refunds_count: 0,
      payment_gateway_names: [],
      shipping_country: 'US',
    },
  ];
  const identities = [
    {
      source_id: '1001',
      email: 'a@example.com',
      phone: null,
      shipping_address: 'Addr A',
      billing_address: null,
      customer_id: 'c1',
    },
    {
      source_id: '1002',
      email: 'b@example.com',
      phone: null,
      shipping_address: 'Addr B',
      billing_address: null,
      customer_id: 'c2',
    },
  ];
  const auditRows: Array<{ order_id: string; shop_domain: string; source: string }> = [];

  const supabase = {
    from: (table: string) => {
      if (table === 'merchant_shopify_connections') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: connections[0], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'processing_jobs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const id = 'job-shopify-1';
                jobs.push({ ...row, id });
                return { data: { id }, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'shopify_order_signals') {
        const signalApi = {
          eq: () => signalApi,
          in: (_col: string, ids: string[]) =>
            Promise.resolve({
              data: signals.filter((s) => ids.includes(s.shopify_order_id)),
              error: null,
            }),
          order: () => ({
            range: async () => ({
              data: signals.map((s) => ({ shopify_order_id: s.shopify_order_id })),
              error: null,
            }),
          }),
        };
        const countApi = {
          eq: async () => ({ count: signals.length, error: null }),
        };
        return {
          select: (cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === 'exact' && opts?.head) return countApi;
            if (cols === 'shopify_order_id') return signalApi;
            return {
              eq: () => ({
                in: (_col: string, ids: string[]) =>
                  Promise.resolve({
                    data: signals.filter((s) => ids.includes(s.shopify_order_id)),
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      if (table === 'merchant_identities') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: async () => ({ data: identities, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'audit_transactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: (_col: string, ids: string[]) =>
                  Promise.resolve({
                    data: auditRows.filter((r) => ids.includes(r.order_id)),
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  return { supabase, auditRows };
}

describe('shopifyAuditBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scores orders through processCsvJob with shopify ingestion', async () => {
    const { supabase } = makeSupabaseFixtures();

    const result = await scoreShopifyOrdersIntoAudit({
      supabase: supabase as never,
      shopDomain: 'acme.myshopify.com',
      shopifyOrderIds: ['1001'],
    });

    expect(result.scored).toBe(1);
    expect(processCsvJob).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ order_id: '1001', customer_email: 'a@example.com' }),
      ]),
      'job-shopify-1',
      supabase,
      2,
      'merchant-1',
      expect.objectContaining({ isFirst: false }),
      { source: 'shopify', shopDomain: 'acme.myshopify.com' }
    );
  });

  it('backfill skips orders already in audit_transactions', async () => {
    const { supabase, auditRows } = makeSupabaseFixtures();
    auditRows.push({ order_id: '1001', shop_domain: 'acme.myshopify.com', source: 'shopify' });

    const result = await backfillShopifyAuditTransactions({
      supabase: supabase as never,
      shopDomain: 'acme.myshopify.com',
    });

    expect(result.batches).toBe(1);
    expect(processCsvJob).toHaveBeenCalledTimes(1);
    const rows = (processCsvJob as jest.Mock).mock.calls[0][0] as Array<{ order_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].order_id).toBe('1002');
  });
});
