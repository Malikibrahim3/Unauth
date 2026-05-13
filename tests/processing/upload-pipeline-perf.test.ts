/**
 * tests/processing/upload-pipeline-perf.test.ts
 *
 * REGRESSION TESTS for the 2026-05-03 CSV-upload performance fix.
 *
 * Each test below pins one architectural invariant. If any of these fail it
 * means the locked perf properties have been broken and the upload flow has
 * likely regressed back to the 10-minute-hang state.
 */

import { buildFastContext } from '@/lib/engine/fastContext';
import type { NormalisedOrder } from '@/lib/engine/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Recording mock client
// ---------------------------------------------------------------------------
function makeRecordingClient() {
  const calls: { table: string; op: string; details: Record<string, unknown> }[] = [];

  const builder = (table: string) => {
    const state: { op: string; cols?: string; filters: Record<string, unknown>; values?: unknown[] } = {
      op: 'select',
      filters: {},
    };
    const finalize = () => {
      calls.push({ table, op: state.op, details: { cols: state.cols, ...state.filters } });
      return Promise.resolve({ data: [], error: null });
    };
    const chain: any = {
      select(cols?: string) { state.cols = cols; return chain; },
      eq(col: string, val: unknown) { state.filters[`eq:${col}`] = val; return chain; },
      gte(col: string, val: unknown) { state.filters[`gte:${col}`] = val; return chain; },
      in(col: string, vals: unknown[]) { state.filters[`in:${col}`] = vals; return finalize(); },
      overlaps(col: string, vals: unknown[]) { state.filters[`overlaps:${col}`] = vals; return finalize(); },
      or(expr: string) {
        // Detect which column(s) the OR-of-contains targets so the test can
        // verify it's a targeted query.
        const cols = Array.from(new Set(expr.split(',').map((c) => c.split('.')[0]).filter(Boolean)));
        for (const c of cols) state.filters[`or:${c}`] = expr;
        return finalize();
      },
      limit(n: number) { state.filters['limit'] = n; return finalize(); },
      then(onF: any, onR: any) { return finalize().then(onF, onR); },
    };
    return chain;
  };

  const client = {
    _calls: calls,
    from: (table: string) => builder(table),
  };
  return client as unknown as SupabaseClient & { _calls: typeof calls };
}

function makeReadRetryClient() {
  let emailAttempts = 0;
  const client = {
    from: (table: string) => {
      const state: { entityType?: string } = {};
      const chain: any = {
        select() { return chain; },
        eq(col: string, val: unknown) {
          if (col === 'entity_type') state.entityType = String(val);
          return chain;
        },
        in() {
          if (table === 'fraud_entities' && state.entityType === 'email') {
            emailAttempts++;
            if (emailAttempts === 1) {
              return Promise.reject(new TypeError('fetch failed'));
            }
            return Promise.resolve({
              data: [{
                id: 'entity-1',
                entity_type: 'email',
                entity_value: 'user0@example.com',
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                total_orders: 2,
                total_refund_claims: 1,
                total_chargebacks: 0,
                total_merchants: 1,
                match_score_avg: 80,
                flagged_count: 1,
              }],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        },
        overlaps() { return Promise.resolve({ data: [], error: null }); },
        or() { return Promise.resolve({ data: [], error: null }); },
        limit() { return Promise.resolve({ data: [], error: null }); },
        then(onF: any, onR: any) { return Promise.resolve({ data: [], error: null }).then(onF, onR); },
      };
      return chain;
    },
    get emailAttempts() { return emailAttempts; },
  };
  return client as unknown as SupabaseClient & { emailAttempts: number };
}

function makeOrder(i: number): NormalisedOrder {
  return {
    orderId: `ORD-${i}`,
    orderDate: new Date(),
    customerNameNorm: `Customer ${i}`,
    emailHash: `hash-${i}`,
    addressHash: `addr-${i}`,
    phoneHash: null,
    ipHash: null,
    orderTotal: 100 + i,
    currency: 'USD',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: 'visa',
    _rawEmail: `user${i}@example.com`,
    _rawIP: `10.0.0.${i % 250}`,
    _rawAddress: `${i} Main St`,
    _rawCardLast4: String(1000 + (i % 9000)).slice(-4),
  } as unknown as NormalisedOrder;
}

// ---------------------------------------------------------------------------
// 1. Cross-merchant fetch must use overlaps(), NEVER unbounded limit(10000).
// ---------------------------------------------------------------------------
describe('LOCKED INVARIANT — cross-merchant profile fetch', () => {
  it('uses targeted or(cs…) JSONB-aware filter, never .limit(10000)', async () => {
    const client = makeRecordingClient();
    const orders = Array.from({ length: 50 }, (_, i) => makeOrder(i));

    await buildFastContext(orders, client, 'merchant-uuid-test');

    const profileCalls = client._calls.filter((c) => c.table === 'customer_profiles');
    expect(profileCalls.length).toBeGreaterThan(0);

    // EVERY customer_profiles read must be targeted — either via overlaps
    // (legacy text[] path) or via or(...cs...) for JSONB arrays.
    for (const call of profileCalls) {
      const targeted = Object.keys(call.details).some(
        (k) => k.startsWith('overlaps:') || k.startsWith('or:')
      );
      expect(targeted).toBe(true);
    }

    // No call may pull a fixed unbounded limit (the old 10000 perf cliff).
    const hasUnboundedLimit = profileCalls.some((c) => c.details['limit'] === 10000);
    expect(hasUnboundedLimit).toBe(false);
  });

  it('does NOT fetch customer_profiles when no merchantId is supplied', async () => {
    const client = makeRecordingClient();
    const orders = Array.from({ length: 5 }, (_, i) => makeOrder(i));

    await buildFastContext(orders, client /* no merchantId */);

    const profileCalls = client._calls.filter((c) => c.table === 'customer_profiles');
    expect(profileCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. fraud_entities reads must use explicit column projection, not select(*).
// ---------------------------------------------------------------------------
describe('LOCKED INVARIANT — column projection', () => {
  it('fraud_entities reads project columns explicitly, never select(*)', async () => {
    const client = makeRecordingClient();
    const orders = Array.from({ length: 20 }, (_, i) => makeOrder(i));

    await buildFastContext(orders, client, 'merchant-uuid-test');

    const fraudEntityCalls = client._calls.filter((c) => c.table === 'fraud_entities');
    expect(fraudEntityCalls.length).toBeGreaterThan(0);

    for (const call of fraudEntityCalls) {
      // Either undefined (default *) or explicit columns. The locked invariant
      // requires explicit columns — the projection must include 'entity_value'
      // and must NOT be '*'.
      expect(call.details.cols).toBeDefined();
      expect(call.details.cols).not.toBe('*');
      expect(String(call.details.cols)).toContain('entity_value');
    }
  });
});

describe('LOCKED INVARIANT — historical read retries', () => {
  it('retries transient fetch failures and preserves historical hits', async () => {
    const client = makeReadRetryClient();
    const ctx = await buildFastContext([makeOrder(0)], client);

    expect(client.emailAttempts).toBe(2);
    expect(ctx.readHealth.fastContextReadRetries).toBe(1);
    expect(ctx.readHealth.fastContextReadFailures).toBe(0);
    expect(ctx.historicalEmailMap.get('user0@example.com')?.id).toBe('entity-1');
  });
});

// ---------------------------------------------------------------------------
// 3. Performance smoke test — 5000-order context build with empty DB results
// ---------------------------------------------------------------------------
describe('PERF SMOKE — buildFastContext on a 5k-order batch', () => {
  it('completes in well under 5 seconds when DB returns no historical data', async () => {
    const client = makeRecordingClient();
    const orders = Array.from({ length: 5000 }, (_, i) => makeOrder(i));

    const t0 = Date.now();
    const ctx = await buildFastContext(orders, client, 'merchant-uuid-test');
    const elapsed = Date.now() - t0;

    expect(ctx.allOrders.length).toBe(5000);
    expect(elapsed).toBeLessThan(5000);
  });
});
