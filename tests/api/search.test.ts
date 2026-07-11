import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_CUSTOMERS: 'view_customers' },
  requirePermission: jest.fn(),
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permissions';
import { GET } from '@/app/api/search/route';

const MERCHANT = 'm-1';

/** Build a thenable query builder that resolves to the table's seeded rows. */
function makeService(byTable: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const m of ['select', 'eq', 'or', 'ilike', 'in', 'limit']) builder[m] = chain;
      builder.range = () => Promise.resolve({ data: byTable[table] ?? [], error: null });
      builder.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: byTable[table] ?? [], error: null });
      return builder;
    },
  };
}

function setup(byTable: Record<string, unknown[]>, opts: { authed?: boolean; denied?: boolean } = {}) {
  const { authed = true, denied = false } = opts;
  (createClient as jest.Mock).mockReturnValue({
    auth: { getUser: async () => ({ data: { user: authed ? { id: 'u-1' } : null } }) },
  });
  (createServiceClient as jest.Mock).mockReturnValue(makeService(byTable));
  (requirePermission as jest.Mock).mockResolvedValue({
    denied,
    ctx: denied ? null : { merchantId: MERCHANT },
  });
}

function req(q: string, extra = '') {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}${extra}`);
}

describe('GET /api/search (v2 unified search)', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    setup({}, { authed: false });
    const res = await GET(req('maya'));
    expect(res.status).toBe(401);
  });

  it('rejects callers without permission', async () => {
    setup({}, { denied: true });
    const res = await GET(req('maya'));
    expect(res.status).toBe(403);
  });

  it('returns a customer result for a known email/name', async () => {
    setup({
      source_customers: [{ id: 'sc-1', email: 'maya.chen@elara-demo.test', first_name: 'Maya', last_name: 'Chen' }],
    });
    const res = await GET(req('maya'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'customer', id: 'sc-1', href: '/customers/sc-1' }),
    ]));
  });

  it('returns an order result and links to its customer', async () => {
    setup({
      source_orders: [{ id: 'so-1', order_number: '1042', email: 'x@y.z', total_price: 120, currency: 'GBP', source_customer_id: 'sc-9' }],
    });
    const res = await GET(req('1042', '&types=orders'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'order', id: 'so-1', href: '/customers/sc-9' }),
    ]));
  });

  it('returns a payout case result linking to the claim detail', async () => {
    setup({
      support_payout_cases: [{ id: 'case-1', claim_type: 'item_not_received', status: 'open', amount_at_risk: 99, currency: 'GBP' }],
    });
    const res = await GET(req('case-1', '&types=cases'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'case', id: 'case-1', href: '/claims/case-1' }),
    ]));
  });

  it('returns a ticket result', async () => {
    setup({
      source_tickets: [{ id: 't-1', external_id: '5567', subject: 'Where is my order', status: 'open' }],
    });
    const res = await GET(req('5567', '&types=tickets'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'ticket', id: 't-1' }),
    ]));
  });

  it('returns a shipment result by tracking number', async () => {
    setup({
      source_shipments: [{ id: 'sh-1', tracking_number: '1Z999', carrier: 'UPS', status: 'in_transit', source_order_id: 'so-1' }],
    });
    const res = await GET(req('1Z999', '&types=shipments'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'shipment', id: 'sh-1' }),
    ]));
  });

  it('returns a transaction result by provider reference', async () => {
    setup({
      source_transactions: [{ id: 'tx-1', external_id: 'ch_123', provider_reference: 'ref_9', transaction_type: 'charge', amount_minor: 5000, currency: 'GBP', source_order_id: 'so-1' }],
    });
    const res = await GET(req('ch_123', '&types=transactions'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'transaction', id: 'tx-1' }),
    ]));
  });

  it('returns a recovery result linking to its detail page', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    setup({
      recovery_cases: [{ id: uuid, recovery_type: 'carrier_claim', owner_type: 'carrier', status: 'submitted', merchant_loss_amount: 80, currency: 'GBP' }],
    });
    const res = await GET(req(uuid, '&types=recoveries'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'recovery', id: uuid, href: `/recoveries/${uuid}` }),
    ]));
  });

  it('matches orders by SKU via order lines', async () => {
    setup({
      source_order_lines: [{ source_order_id: 'so-7' }],
      source_orders: [{ id: 'so-7', order_number: '7', email: null, total_price: 10, currency: 'GBP', source_customer_id: 'sc-7' }],
    });
    const res = await GET(req('SKU-ABC', '&types=orders'));
    const body = await res.json();
    expect(body.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'order', id: 'so-7' }),
    ]));
  });

  it('strips internal join hints from results', async () => {
    setup({
      source_shipments: [{ id: 'sh-2', tracking_number: '1Z1', carrier: 'UPS', status: 'x', source_order_id: 'so-2' }],
    });
    const res = await GET(req('1Z1', '&types=shipments'));
    const body = await res.json();
    const shipment = body.results.find((r: { type: string }) => r.type === 'shipment');
    expect(shipment).toBeDefined();
    expect(shipment._orderId).toBeUndefined();
  });

  it('returns empty results when nothing matches', async () => {
    setup({});
    const res = await GET(req('zzz-no-match'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results).toEqual([]);
  });

  it('never queries dropped v1 tables', async () => {
    const seen: string[] = [];
    (createClient as jest.Mock).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
    });
    (requirePermission as jest.Mock).mockResolvedValue({ denied: false, ctx: { merchantId: MERCHANT } });
    (createServiceClient as jest.Mock).mockReturnValue({
      from(table: string) {
        seen.push(table);
        const builder: Record<string, unknown> = {};
        const chain = () => builder;
        for (const m of ['select', 'eq', 'or', 'ilike', 'in', 'limit']) builder[m] = chain;
        builder.range = () => Promise.resolve({ data: [], error: null });
        builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
        return builder;
      },
    });
    await GET(req('anything'));
    expect(seen).not.toContain('customer_profiles');
    expect(seen).not.toContain('audit_transactions');
    expect(seen).not.toContain('customer_profile_audit_appearances');
    expect(seen).toEqual(expect.arrayContaining(['source_customers', 'source_orders', 'support_payout_cases']));
  });
});
