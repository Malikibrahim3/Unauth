import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/shopify/webhooks/route';
import { processWebhook } from '@/lib/shopify/processWebhook';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

// Faithful no-op stubs for the identity/resolution/checkout-link layers the
// ingest pipeline calls. emitIdentityObservations must return {signalKeys}.
jest.mock('@/lib/identity/observations', () => ({
  emitIdentityObservations: jest.fn(async () => ({ signalKeys: [] })),
}));

jest.mock('@/lib/identity/resolver', () => ({
  resolveIdentitiesForKeys: jest.fn(async () => {}),
  linkClaimToIdentity: jest.fn(async () => {}),
}));

jest.mock('@/lib/checkoutSignals/linkOrder', () => ({
  linkCheckoutSignalsToOrder: jest.fn(async () => {}),
}));

const { createServiceClient } = jest.requireMock('@/lib/supabase/server') as { createServiceClient: jest.Mock };

// ─────────────────────────────────────────────────────────────────────────
// Chainable Supabase stub. Each from(table) returns a builder whose
// select/eq/in/order/limit/update/insert/upsert are chainable and capture
// payloads. Terminal .single()/.maybeSingle() resolve {data,error}; awaiting
// the builder directly (PostgREST thenable) resolves {data,error} too.
//
// `handlers` maps table name -> overrides:
//   - singleData / maybeSingleData: terminal row(s) for that table's reads
//   - onInsert / onUpsert / onUpdate / onSelect: callbacks capturing payloads
//   - throwOn: { insert?|upsert?|update? : true } to simulate a thrown error
// ─────────────────────────────────────────────────────────────────────────
type TableHandler = {
  singleData?: any;
  maybeSingleData?: any;
  thenData?: any; // resolved when builder is awaited directly (e.g. after .in())
  onInsert?: (payload: any) => void;
  onUpsert?: (payload: any, opts: any) => void;
  onUpdate?: (payload: any) => void;
  // For processed_webhooks: drives the leased claim/completion RPCs.
  claimStatus?: 'claimed' | 'duplicate' | 'in_progress' | 'busy' | 'stale' | 'conflict';
  claims?: any[];
  completions?: any[];
  transitions?: any[];
};

function makeSupabase(handlers: Record<string, TableHandler> = {}) {
  const from = (table: string) => {
    const h = handlers[table] ?? {};
    const builder: any = {
      select: (..._args: any[]) => builder,
      eq: (..._args: any[]) => builder,
      in: (..._args: any[]) => builder,
      order: (..._args: any[]) => builder,
      limit: (..._args: any[]) => builder,
      insert: (payload: any) => {
        h.onInsert?.(payload);
        return builder;
      },
      upsert: (payload: any, opts: any) => {
        h.onUpsert?.(payload, opts);
        return builder;
      },
      update: (payload: any) => {
        h.onUpdate?.(payload);
        return builder;
      },
      single: async () => ({ data: h.singleData ?? null, error: null }),
      maybeSingle: async () => ({ data: h.maybeSingleData ?? null, error: null }),
      // PostgREST builders are thenable; support `await supabase.from(t)...`.
      then: (resolve: (v: any) => any) => resolve({ data: h.thenData ?? null, error: null }),
    };
    return builder;
  };
  const rpc = async (fn: string, args: any) => {
    if (fn === 'claim_processed_webhook') {
      handlers.processed_webhooks?.claims?.push(args);
      const status = handlers.processed_webhooks?.claimStatus ?? 'claimed';
      return {
        data: status === 'claimed'
          ? { status, claim_token: '10000000-0000-4000-8000-000000000001' }
          : { status },
        error: null,
      };
    }
    if (fn === 'complete_processed_webhook') {
      handlers.processed_webhooks?.completions?.push({
        status: args.p_status,
        last_error: args.p_last_error,
        claim_token: args.p_claim_token,
      });
      return { data: true, error: null };
    }
    if (fn === 'transition_payout_case') {
      handlers.support_payout_cases?.transitions?.push(args);
      return {
        data: {
          case_id: args.p_case_id,
          new_version: args.p_expected_version + 1,
          status: args.p_patch.status ?? 'open',
          payout_decision_state: args.p_patch.payout_decision_state ?? 'undecided',
          recovery_state: args.p_patch.recovery_state ?? 'no_recovery_needed',
          domain_event_id: '10000000-0000-4000-8000-000000000002',
        },
        error: null,
      };
    }
    return { data: null, error: null };
  };
  return { from, rpc };
}

// Connection row returned for a known store.
const MERCHANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CONNECTION = { id: 'conn-1', merchant_id: MERCHANT_ID, status: 'active' };

// processed_webhooks handler factory: drives idempotency state.
//  - existingStatus null  => no prior row (first attempt)
//  - 'completed'          => duplicate short-circuit at claim time
//  - 'failed'/'processing'=> re-enters processing
function processedWebhooks(
  existingStatus: string | null,
  capture?: { claims?: any[]; completions?: any[] },
): TableHandler {
  return {
    maybeSingleData: existingStatus
      ? { idempotency_key: 'k', status: existingStatus, attempts: 1 }
      : null,
    claimStatus:
      existingStatus === 'completed'
        ? 'duplicate'
        : existingStatus === 'processing'
          ? 'in_progress'
          : 'claimed',
    completions: capture?.completions,
    claims: capture?.claims,
    onUpsert: (payload) => capture?.claims?.push(payload),
  };
}

function makeReq(body: string, headers: Record<string, string>) {
  return new NextRequest('http://localhost/api/shopify/webhooks', {
    method: 'POST',
    body,
    headers,
  } as any);
}

function signedReq(body: string, topic: string, webhookId: string) {
  const hmac = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('base64');
  return makeReq(body, {
    'x-shopify-hmac-sha256': hmac,
    'x-shopify-shop-domain': 'unit-test.myshopify.com',
    'x-shopify-topic': topic,
    'x-shopify-webhook-id': webhookId,
  });
}

describe('shopify webhook p0', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test-secret';
  });

  it('rejects invalid webhook hmac', async () => {
    const req = makeReq('{"id":1}', {
      'x-shopify-hmac-sha256': 'invalid',
      'x-shopify-shop-domain': 'unit-test.myshopify.com',
      'x-shopify-topic': 'orders/create',
      'x-shopify-webhook-id': 'wid-1',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('uninstall webhook revokes the store_connections row', async () => {
    const updates: Array<{ table: string; values: any }> = [];
    const supabase = makeSupabase({
      store_connections: {
        maybeSingleData: CONNECTION,
        onUpdate: (values) => updates.push({ table: 'store_connections', values }),
      },
    });
    await processWebhook('{}', 'unit-test.myshopify.com', 'app/uninstalled', supabase as any);
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe('store_connections');
    expect(updates[0].values.status).toBe('revoked');
    expect(typeof updates[0].values.uninstalled_at).toBe('string');
  });

  it('webhook for an unknown store is skipped without writes', async () => {
    const writes: string[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'store_connections') {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          };
        }
        writes.push(table);
        return { upsert: async () => ({ error: null }) };
      },
    };
    await processWebhook('{"id":1}', 'unknown.myshopify.com', 'orders/create', supabase as any);
    expect(writes).toHaveLength(0);
  });

  it('webhook for a revoked store is acknowledged without ingesting records', async () => {
    const orderUpserts: any[] = [];
    const supabase = makeSupabase({
      store_connections: {
        maybeSingleData: { ...CONNECTION, status: 'revoked', uninstalled_at: new Date().toISOString() },
      },
      source_orders: { onUpsert: (payload) => orderUpserts.push(payload) },
    });
    await processWebhook('{"id":1}', 'unit-test.myshopify.com', 'orders/create', supabase as any);
    expect(orderUpserts).toHaveLength(0);
  });

  it('duplicate completed webhook is short-circuited at claim time', async () => {
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks('completed'),
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq('{"id":1}', 'orders/create', 'wid-2');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it('a previously-failed webhook is re-claimed (not a duplicate) and processed', async () => {
    // The attempt increment now happens atomically inside claim_processed_webhook
    // (DB-side), so it is no longer observed via an upsert payload. A failed prior
    // attempt is NOT a duplicate: the webhook re-enters processing and finalizes.
    const completions: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks('failed', { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_customers: { singleData: { id: 'cust-1' } },
      source_orders: { maybeSingleData: null, singleData: { id: 'order-1' } },
      source_addresses: { singleData: { id: 'addr-1' } },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq('{"id":1,"email":"a@b.com"}', 'orders/create', 'wid-3');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).not.toBe(true);
    expect(completions).toHaveLength(1);
    expect(completions[0].status).toBe('completed');
  });

  it('asks Shopify to retry while another delivery for the same order is active', async () => {
    const supabase = makeSupabase({
      processed_webhooks: { claimStatus: 'busy' },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq(
      JSON.stringify({ id: 44, updated_at: '2026-07-22T12:00:00Z' }),
      'orders/updated',
      'wid-busy',
    );

    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('1');
  });

  it('records but does not apply an older order snapshot', async () => {
    const claims: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: { claimStatus: 'stale', claims },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq(
      JSON.stringify({ id: 44, updated_at: '2026-07-21T12:00:00Z' }),
      'orders/updated',
      'wid-stale',
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, ignored: 'stale_event' });
    expect(claims[0]).toMatchObject({
      p_object_key: 'order:44',
      p_event_version: Date.parse('2026-07-21T12:00:00Z'),
    });
  });

  it('successful orders/create upserts a source_orders row and finalizes completed', async () => {
    const completions: any[] = [];
    const orderUpserts: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_customers: { singleData: { id: 'cust-1' } },
      source_orders: {
        maybeSingleData: null,
        singleData: { id: 'order-1' },
        onUpsert: (payload, opts) => orderUpserts.push({ payload, opts }),
      },
      source_addresses: { singleData: { id: 'addr-1' } },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq('{"id":10,"email":"ok@test.com"}', 'orders/create', 'wid-complete-create');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(completions.some((u) => u.status === 'completed')).toBe(true);
    expect(completions.some((u) => u.status === 'failed')).toBe(false);
    expect(orderUpserts).toHaveLength(1);
    const { payload, opts } = orderUpserts[0];
    expect(payload.external_id).toBe('10');
    expect(payload.source).toBe('shopify');
    expect(payload.email).toBe('ok@test.com');
    expect(payload.raw_payload_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(opts.onConflict).toBe('merchant_id,source,connection_id,source_account_id,external_id');
  });

  it('successful orders/updated upserts a source_orders row and finalizes completed', async () => {
    const completions: any[] = [];
    const orderUpserts: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_customers: { singleData: { id: 'cust-1' } },
      source_orders: {
        maybeSingleData: null,
        singleData: { id: 'order-1' },
        onUpsert: (payload) => orderUpserts.push(payload),
      },
      source_addresses: { singleData: { id: 'addr-1' } },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq(
      '{"id":11,"customer":{"id":44,"email":"u@test.com"}}',
      'orders/updated',
      'wid-complete-updated',
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(completions.some((u) => u.status === 'completed')).toBe(true);
    expect(completions.some((u) => u.status === 'failed')).toBe(false);
    expect(orderUpserts).toHaveLength(1);
    expect(orderUpserts[0].external_id).toBe('11');
  });

  it('failed processing finalizes as failed and returns 5xx so Shopify retries', async () => {
    const { emitIdentityObservations } = jest.requireMock('@/lib/identity/observations') as {
      emitIdentityObservations: jest.Mock;
    };
    emitIdentityObservations.mockImplementationOnce(async () => {
      throw new Error('observe_failed');
    });
    const completions: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_customers: { singleData: { id: 'cust-1' } },
      source_orders: { maybeSingleData: null, singleData: { id: 'order-1' } },
      source_addresses: { singleData: { id: 'addr-1' } },
    });
    createServiceClient.mockReturnValue(supabase);
    const req = signedReq('{"id":12,"email":"fail@test.com"}', 'orders/create', 'wid-failed');
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(completions.some((u) => u.status === 'failed')).toBe(true);
  });

  it('test orders are ignored before any production tables are touched', async () => {
    const writes: string[] = [];
    const supabase = {
      from: (table: string) => {
        writes.push(table);
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
          upsert: async () => ({ error: null }),
        };
      },
    };
    await processWebhook(
      JSON.stringify({ id: 10, test: true, email: 'test@example.com' }),
      'unit-test.myshopify.com',
      'orders/create',
      supabase as any,
    );
    expect(writes).toHaveLength(0);
  });

  it('refund webhook upserts a source_refunds row without PII and finalizes completed', async () => {
    const completions: any[] = [];
    const refundUpserts: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: { maybeSingleData: { id: 'order-1', shipping_address_id: null, billing_address_id: null } },
      source_refunds: { onUpsert: (payload, opts) => refundUpserts.push({ payload, opts }) },
    });
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({
      id: 201,
      order_id: 901,
      currency: 'USD',
      note: 'customer request',
      refund_line_items: [{ id: 1 }],
      order: { line_items: [{ id: 1 }, { id: 2 }] },
      transactions: [{ amount: '10.00' }],
    });
    const req = signedReq(body, 'refunds/create', 'wid-refund-1');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(refundUpserts).toHaveLength(1);
    const { payload, opts } = refundUpserts[0];
    expect(opts.onConflict).toBe('merchant_id,source_order_id,external_id');
    expect(payload.source_order_id).toBe('order-1');
    expect(payload.external_id).toBe('201');
    expect(payload.amount).toBe(10);
    // refund_line_items(1) < order line_items(2) => partial refund
    expect(payload.is_full_refund).toBe(false);
    expect(payload.raw_payload_hash).toMatch(/^[a-f0-9]{64}$/);
    // No PII fields on the refund row.
    expect(payload.email).toBeUndefined();
    expect(payload.tracking_number).toBeUndefined();
    expect(completions.some((u) => u.status === 'completed')).toBe(true);
  });

  it('refund for an un-ingested order is a no-op (no source_refunds write)', async () => {
    const refundUpserts: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null),
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: { maybeSingleData: null },
      source_refunds: { onUpsert: (payload) => refundUpserts.push(payload) },
    });
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({ id: 202, order_id: 999, transactions: [{ amount: '5.00' }] });
    const req = signedReq(body, 'refunds/create', 'wid-refund-noop');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(refundUpserts).toHaveLength(0);
  });

  it('disputes/create inserts a chargeback support payout case and a created claim event', async () => {
    const claimInserts: any[] = [];
    const claimEvents: any[] = [];
    const disputeUpserts: any[] = [];
    const supabase = makeSupabase({
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: { maybeSingleData: { id: 'order-1', shipping_address_id: null, billing_address_id: null } },
      source_disputes: { onUpsert: (payload) => disputeUpserts.push(payload) },
      // TABLES.MERCHANT_CLAIMS resolves to 'support_payout_cases' (v2 schema).
      support_payout_cases: {
        maybeSingleData: null, // no existing claim
        singleData: { id: 'claim-1' },
        onInsert: (payload) => claimInserts.push(payload),
      },
      claim_events: { onInsert: (payload) => claimEvents.push(payload) },
    });

    await processWebhook(
      JSON.stringify({ id: 91, order_id: 9001, status: 'needs_response', amount: '42.50', currency: 'USD' }),
      'unit-test.myshopify.com',
      'disputes/create',
      supabase as any,
    );

    expect(disputeUpserts).toHaveLength(1);
    expect(claimInserts).toHaveLength(1);
    expect(claimInserts[0]).toMatchObject({
      merchant_id: MERCHANT_ID,
      source_order_id: 'order-1',
      claim_type: 'chargeback',
      status: 'escalated',
      detection_method: 'platform_dispute',
      reason_normalized: 'dispute',
      amount_at_risk: 42.5,
      currency: 'USD',
    });
    expect(claimInserts[0].detection_detail).toMatchObject({ shopify_dispute_id: '91', topic: 'disputes/create' });
    expect(claimEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claim_id: 'claim-1',
          event_type: 'created',
          to_status: 'escalated',
          metadata: expect.objectContaining({ triggered_by: 'shopify_dispute' }),
        }),
      ]),
    );
  });

  it('disputes/updated resolves an existing chargeback case via update', async () => {
    const claimInserts: any[] = [];
    const transitions: any[] = [];
    const supabase = makeSupabase({
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: { maybeSingleData: { id: 'order-1', shipping_address_id: null, billing_address_id: null } },
      source_disputes: {},
      support_payout_cases: {
        maybeSingleData: {
          id: 'claim-1',
          status: 'escalated',
          state_version: 1,
          payout_decision_state: 'undecided',
          recovery_state: 'no_recovery_needed',
        }, // existing claim found and transition precondition
        onInsert: (payload) => claimInserts.push(payload),
        transitions,
      },
      claim_events: {},
    });

    await processWebhook(
      JSON.stringify({ id: 92, order_id: 9002, status: 'won', amount: '50.00', currency: 'USD' }),
      'unit-test.myshopify.com',
      'disputes/updated',
      supabase as any,
    );

    // Existing claim => atomic transition path, no insert.
    expect(claimInserts).toHaveLength(0);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({
      p_case_id: 'claim-1',
      p_expected_version: 1,
      p_patch: { status: 'resolved_won' },
      p_triggered_by: 'shopify_dispute',
    });
  });

  it('orders/cancelled voids any open claim for the order', async () => {
    const transitions: any[] = [];
    const orderUpdates: any[] = [];
    const supabase = makeSupabase({
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: {
        maybeSingleData: { id: 'order-void-1', shipping_address_id: null, billing_address_id: null },
        onUpdate: (payload) => orderUpdates.push(payload),
      },
      support_payout_cases: {
        thenData: [{ id: 'claim-void-1', state_version: 1 }],
        maybeSingleData: {
          id: 'claim-void-1', status: 'open', state_version: 1,
          payout_decision_state: 'undecided', recovery_state: 'no_recovery_needed',
        },
        transitions,
      },
    });

    await processWebhook(
      JSON.stringify({ id: 9003 }),
      'unit-test.myshopify.com',
      'orders/cancelled',
      supabase as any,
    );

    expect(orderUpdates.some((u) => typeof u.cancelled_at === 'string')).toBe(true);
    expect(transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          p_case_id: 'claim-void-1',
          p_expected_version: 1,
          p_patch: { status: 'voided' },
          p_triggered_by: 'shopify_order_cancelled',
        }),
      ]),
    );
  });

  it('fulfillment webhook upserts a source_fulfillments row with plaintext tracking', async () => {
    const completions: any[] = [];
    const fulfillmentUpserts: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      source_orders: { maybeSingleData: { id: 'order-1', shipping_address_id: null, billing_address_id: null } },
      source_fulfillments: { onUpsert: (payload, opts) => fulfillmentUpserts.push({ payload, opts }) },
    });
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({
      id: 333,
      order_id: 777,
      tracking_company: 'UPS',
      tracking_number: '1Z999AA10123456784',
      tracking_urls: ['https://x.test/t/1'],
      shipment_status: 'in_transit',
      status: 'success',
    });
    const req = signedReq(body, 'fulfillments/create', 'wid-fulfill-1');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fulfillmentUpserts).toHaveLength(1);
    const { payload, opts } = fulfillmentUpserts[0];
    expect(opts.onConflict).toBe('merchant_id,source_order_id,external_id');
    expect(payload.source_order_id).toBe('order-1');
    expect(payload.external_id).toBe('333');
    // Production now stores tracking in plaintext (no hashing, no _hash column).
    expect(payload.tracking_number).toBe('1Z999AA10123456784');
    expect(payload.tracking_company).toBe('UPS');
    expect(payload.tracking_number_hash).toBeUndefined();
    expect(completions.some((u) => u.status === 'completed')).toBe(true);
  });

  it('failed fulfillment processing finalizes as failed', async () => {
    const completions: any[] = [];
    const supabase = makeSupabase({
      processed_webhooks: processedWebhooks(null, { completions }),
      store_connections: { maybeSingleData: CONNECTION },
      // order found, but the fulfillment upsert returns an error => throws.
      source_orders: { maybeSingleData: { id: 'order-1', shipping_address_id: null, billing_address_id: null } },
      source_fulfillments: {},
    });
    // Override source_fulfillments upsert to resolve an error.
    const baseFrom = supabase.from;
    supabase.from = (table: string) => {
      if (table === 'source_fulfillments') {
        const builder: any = {
          upsert: () => builder,
          then: (resolve: (v: any) => any) => resolve({ data: null, error: { message: 'boom' } }),
        };
        return builder;
      }
      return baseFrom(table);
    };
    createServiceClient.mockReturnValue(supabase);
    const body = JSON.stringify({ id: 334, order_id: 778 });
    const req = signedReq(body, 'fulfillments/update', 'wid-fulfill-fail');
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(completions.some((u) => u.status === 'failed')).toBe(true);
  });
});
