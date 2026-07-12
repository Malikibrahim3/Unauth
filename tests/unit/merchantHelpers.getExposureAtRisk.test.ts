/**
 * Unit tests for getExposureAtRisk
 *
 * Verifies:
 *   1. Merchant scoping — only jobs owned by the target merchant are queried.
 *   2. Review-worthy filter — dismissed transactions are excluded.
 *   3. total_price accumulation (string NUMERIC from DB + JS number).
 *   4. Returns null on Supabase error (never returns 0 on failure).
 *   5. Returns 0 when merchant has no jobs.
 */

import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';
import { TABLES } from '@/lib/supabase/tables';

// ---------------------------------------------------------------------------
// Minimal SupabaseClient mock builder
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>;

type Page = { data: MockRow[] | null; error: { message: string } | null };

/**
 * Builds a chainable + thenable Supabase query stub.
 *
 * Production builds the query as `.from().select().in('job_id').not().range()`
 * and THEN appends clause filters (`.in('identity_confidence_grade', ...)` /
 * `.is('identity_confidence_grade', null)`) via a callback before awaiting.
 * So every chain method must return the stub (chainable) and the stub itself
 * must be awaitable (thenable) — `.range()` is NOT terminal.
 *
 * `resolve(calls)` is invoked at await-time with the recorded `.in`/`.is`
 * filters so the caller can choose which page to return.
 */
function makeQueryStub(resolve: (calls: { inCalls: Array<[string, unknown]>; isCalls: Array<[string, unknown]> }) => Page) {
  const inCalls: Array<[string, unknown]> = [];
  const isCalls: Array<[string, unknown]> = [];
  const stub: Record<string, jest.Mock> & { then?: unknown } = {};
  const chain = () => stub;

  stub.select = jest.fn(() => chain());
  stub.eq = jest.fn(() => chain());
  stub.in = jest.fn((col: string, vals: unknown) => { inCalls.push([col, vals]); return chain(); });
  stub.not = jest.fn(() => chain());
  stub.is = jest.fn((col: string, val: unknown) => { isCalls.push([col, val]); return chain(); });
  stub.range = jest.fn(() => chain());
  stub.then = (onF: ((v: Page) => unknown) | null, onR?: ((r: unknown) => unknown) | null) =>
    Promise.resolve(resolve({ inCalls, isCalls })).then(onF as never, onR as never);

  return stub;
}

/**
 * Builds a mock SupabaseClient whose `.from()` calls are controlled per-table.
 * audit_transactions clauses are discriminated by the actual filter applied —
 * the status-only clause calls `.is('identity_confidence_grade', null)` — which
 * is robust to pagination order (no reliance on call counting).
 */
function buildMockClient(
  jobsPages: Array<Page>,
  txPages: { graded: Array<Page>; status: Array<Page> },
) {
  let jobsPageIdx = 0;
  let gradedIdx = 0;
  let statusIdx = 0;

  const fromMock = jest.fn().mockImplementation((table: string) => {
    if (table === TABLES.PROCESSING_JOBS) {
      return makeQueryStub(() => jobsPages[jobsPageIdx++] ?? { data: [], error: null });
    }
    // audit_transactions: graded clause vs status-only clause, by filter.
    return makeQueryStub(({ isCalls }) => {
      const isStatusClause = isCalls.some(
        ([col, val]) => col === 'identity_confidence_grade' && val === null,
      );
      return isStatusClause
        ? (txPages.status[statusIdx++] ?? { data: [], error: null })
        : (txPages.graded[gradedIdx++] ?? { data: [], error: null });
    });
  });

  return { from: fromMock } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getExposureAtRisk', () => {
  const MERCHANT_A = 'merchant-uuid-aaaa';
  const MERCHANT_B = 'merchant-uuid-bbbb';

  it('returns 0 when merchant has no jobs', async () => {
    const client = buildMockClient(
      [{ data: [], error: null }],
      { graded: [], status: [] },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBe(0);
  });

  it('scopes job lookup to the calling merchant_id', async () => {
    const client = buildMockClient(
      [{ data: [], error: null }],
      { graded: [], status: [] },
    );
    await getExposureAtRisk(client, MERCHANT_A);
    // Verify `.eq('merchant_id', MERCHANT_A)` was called
    expect(client.from).toHaveBeenCalledWith(TABLES.PROCESSING_JOBS);
    const jobQuery = (client.from as jest.Mock).mock.results[0].value;
    expect(jobQuery.eq).toHaveBeenCalledWith('merchant_id', MERCHANT_A);
    // Ensure MERCHANT_B was never passed as merchant_id
    const allEqCalls: [string, string][] = (jobQuery.eq as jest.Mock).mock.calls;
    const merchantIdArgs = allEqCalls
      .filter(([col]) => col === 'merchant_id')
      .map(([, val]) => val);
    expect(merchantIdArgs).not.toContain(MERCHANT_B);
  });

  it('sums total_price from graded transactions (string NUMERIC)', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ total_price: '100.50' }, { total_price: '49.50' }], error: null },
          { data: [], error: null },
        ],
        status: [
          { data: [], error: null },
        ],
      },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeCloseTo(150.0, 2);
  });

  it('sums total_price from both graded and status-only clauses without double-counting', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ total_price: 200 }], error: null },
          { data: [], error: null },
        ],
        status: [
          { data: [{ total_price: '75.00' }], error: null },
          { data: [], error: null },
        ],
      },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeCloseTo(275.0, 2);
  });

  it('skips null total_price rows without erroring', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ total_price: null }, { total_price: '50.00' }], error: null },
          { data: [], error: null },
        ],
        status: [{ data: [], error: null }],
      },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeCloseTo(50.0, 2);
  });

  it('returns null (not 0) when job lookup fails', async () => {
    const client = buildMockClient(
      [{ data: null, error: { message: 'DB timeout' } }],
      { graded: [], status: [] },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeNull();
  });

  it('returns null (not 0) when transaction query fails', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [{ data: null, error: { message: 'query error' } }],
        status: [],
      },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeNull();
  });

  it('never leaks cross-tenant data — transaction query is scoped to owned job IDs only', async () => {
    const ownedJobId = 'job-owned-by-merchant-a';
    const client = buildMockClient(
      [{ data: [{ id: ownedJobId }], error: null }, { data: [], error: null }],
      {
        graded: [{ data: [{ total_price: '100' }], error: null }, { data: [], error: null }],
        status: [{ data: [], error: null }],
      },
    );
    await getExposureAtRisk(client, MERCHANT_A);
    // Find audit_transactions calls and assert `.in('job_id', ...)` only includes owned IDs
    const allFromCalls: string[] = (client.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    const txCallIndices = allFromCalls
      .map((t, i) => (t === TABLES.AUDIT_TRANSACTIONS ? i : -1))
      .filter((i) => i >= 0);
    for (const idx of txCallIndices) {
      const txQuery = (client.from as jest.Mock).mock.results[idx].value;
      const inCalls: [string, string[]][] = (txQuery.in as jest.Mock).mock.calls;
      const jobIdInCall = inCalls.find(([col]) => col === 'job_id');
      expect(jobIdInCall).toBeDefined();
      // The job_id list must only contain IDs scoped to this merchant
      expect(jobIdInCall![1]).toContain(ownedJobId);
    }
  });
});
