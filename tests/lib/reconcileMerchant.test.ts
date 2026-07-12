jest.mock('@/lib/exceptions/store', () => ({ raiseException: jest.fn() }));

import { detectUnmatchedRefunds, reconcileMerchant } from '@/lib/reconciliation/reconcileMerchant';
import { raiseException } from '@/lib/exceptions/store';

const raise = raiseException as jest.Mock;
const MERCHANT = 'm-1';

/** byTable resolves each table's rows for the terminal await / maybeSingle. */
function makeClient(byTable: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ['select', 'eq', 'in', 'is', 'not', 'lt', 'order', 'limit']) b[m] = chain;
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: byTable[table] ?? [], error: null });
      return b;
    },
  } as never as import('@supabase/supabase-js').SupabaseClient;
}

describe('reconciliation — unmatched refunds', () => {
  afterEach(() => jest.clearAllMocks());

  it('raises an exception for a refund whose order has no payout case', async () => {
    raise.mockResolvedValue({ created: true, id: 'exc-1', status: 'open' });
    const client = makeClient({
      source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 20, currency: 'GBP', refunded_at: '2026-01-01' }],
      support_payout_cases: [],
    });
    const result = await detectUnmatchedRefunds(client, MERCHANT);
    expect(result).toEqual({ detector: 'unmatched_refunds', found: 1, raised: 1 });
    expect(raise).toHaveBeenCalledWith(client, MERCHANT, expect.objectContaining({
      exceptionType: 'unmatched_refund', confidence: 'probable', dedupKey: 'reconcile:unmatched_refund:r1',
    }));
  });

  it('ignores refunds whose order already has a payout case', async () => {
    const client = makeClient({
      source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 20, currency: 'GBP', refunded_at: '2026-01-01' }],
      support_payout_cases: [{ source_order_id: 'o1' }],
    });
    const result = await detectUnmatchedRefunds(client, MERCHANT);
    expect(result).toEqual({ detector: 'unmatched_refunds', found: 0, raised: 0 });
    expect(raise).not.toHaveBeenCalled();
  });

  it('is idempotent — an already-present exception counts as found but not newly raised', async () => {
    raise.mockResolvedValue({ created: false, id: 'exc-1', status: 'open' });
    const client = makeClient({
      source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 20, currency: 'GBP', refunded_at: '2026-01-01' }],
      support_payout_cases: [],
    });
    const result = await detectUnmatchedRefunds(client, MERCHANT);
    expect(result).toEqual({ detector: 'unmatched_refunds', found: 1, raised: 0 });
  });

  it('reconcileMerchant aggregates detector results', async () => {
    raise.mockResolvedValue({ created: true, id: 'exc-1', status: 'open' });
    const client = makeClient({
      source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 5, currency: 'GBP', refunded_at: '2026-01-01' }],
      support_payout_cases: [],
    });
    const result = await reconcileMerchant(client, MERCHANT);
    expect(result.merchantId).toBe(MERCHANT);
    expect(result.exceptionsRaised).toBe(1);
    expect(result.failures).toEqual([]);
    expect(result.detectors.map((d) => d.detector)).toContain('unmatched_refunds');
  });

  it('reports detector failures without aborting the remaining sweep', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failingClient = makeClient({});
    const originalFrom = failingClient.from.bind(failingClient);
    (failingClient as unknown as { from: (table: string) => unknown }).from = (table: string) => {
      if (table === 'source_refunds') {
        const query = originalFrom(table) as unknown as Record<string, unknown>;
        query.then = (resolve: (value: unknown) => unknown) => resolve({ data: null, error: { message: 'read unavailable' } });
        return query;
      }
      return originalFrom(table);
    };

    const result = await reconcileMerchant(failingClient, MERCHANT);

    expect(result.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ detector: 'unmatched_refunds', message: expect.stringContaining('read unavailable') }),
    ]));
    expect(result.detectors.length).toBeGreaterThan(0);
    error.mockRestore();
  });
});
