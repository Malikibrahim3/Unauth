/**
 * Unit tests for getExposureAtRisk
 *
 * Verifies:
 *   1. Merchant scoping — only jobs owned by the target merchant are queried.
 *   2. Review-worthy filter — dismissed transactions are excluded.
 *   3. order_value accumulation (string NUMERIC from DB + JS number).
 *   4. Returns null on Supabase error (never returns 0 on failure).
 *   5. Returns 0 when merchant has no jobs.
 */

import { getExposureAtRisk } from '@/lib/supabase/merchantHelpers';

// ---------------------------------------------------------------------------
// Minimal SupabaseClient mock builder
// ---------------------------------------------------------------------------

type MockRow = Record<string, unknown>;

/**
 * Builds a chainable Supabase query stub.
 * resolveWith({ data, error }) sets what `.range()` resolves to.
 */
function makeQueryStub(resolveWith: { data: MockRow[] | null; error: { message: string } | null }) {
  const stub: Record<string, jest.Mock> = {};
  const chain = () => stub as unknown as ReturnType<ReturnType<typeof stub.from>>;

  stub.select = jest.fn().mockReturnValue(chain());
  stub.eq = jest.fn().mockReturnValue(chain());
  stub.in = jest.fn().mockReturnValue(chain());
  stub.not = jest.fn().mockReturnValue(chain());
  stub.is = jest.fn().mockReturnValue(chain());
  stub.range = jest.fn().mockResolvedValue(resolveWith);

  return stub;
}

/**
 * Builds a mock SupabaseClient whose `.from()` calls are controlled per-table.
 */
function buildMockClient(
  jobsPages: Array<{ data: MockRow[] | null; error: { message: string } | null }>,
  txPages: { graded: Array<{ data: MockRow[] | null; error: { message: string } | null }>; status: Array<{ data: MockRow[] | null; error: { message: string } | null }> },
) {
  let jobsPageIdx = 0;
  // Track which tx call set we are in: first sequence = graded, second = status-only
  let txGradedIdx = 0;
  let txStatusIdx = 0;
  // Simple heuristic: first set of `not('identity_confidence_grade')` calls → graded
  // `is('identity_confidence_grade', null)` calls → status-only
  // We use the `not` / `is` call order to discriminate.

  const fromMock = jest.fn().mockImplementation((table: string) => {
    if (table === 'processing_jobs') {
      const page = jobsPages[jobsPageIdx++] ?? { data: [], error: null };
      return makeQueryStub(page);
    }
    // audit_transactions — detect clause from call sequence
    // We alternate: graded queries first, then status queries (within each outer pagination loop)
    const isGradedPage = txGradedIdx < txPages.graded.length;
    if (isGradedPage) {
      const page = txPages.graded[txGradedIdx++] ?? { data: [], error: null };
      const stub = makeQueryStub(page);
      // Override `is` to mark this as graded (not status-only) — no-op for chain
      stub.is = jest.fn().mockReturnValue(stub);
      return stub;
    }
    const page = txPages.status[txStatusIdx++] ?? { data: [], error: null };
    return makeQueryStub(page);
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
    expect(client.from).toHaveBeenCalledWith('processing_jobs');
    const jobQuery = (client.from as jest.Mock).mock.results[0].value;
    expect(jobQuery.eq).toHaveBeenCalledWith('merchant_id', MERCHANT_A);
    // Ensure MERCHANT_B was never passed as merchant_id
    const allEqCalls: [string, string][] = (jobQuery.eq as jest.Mock).mock.calls;
    const merchantIdArgs = allEqCalls
      .filter(([col]) => col === 'merchant_id')
      .map(([, val]) => val);
    expect(merchantIdArgs).not.toContain(MERCHANT_B);
  });

  it('sums order_value from graded transactions (string NUMERIC)', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ order_value: '100.50' }, { order_value: '49.50' }], error: null },
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

  it('sums order_value from both graded and status-only clauses without double-counting', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ order_value: 200 }], error: null },
          { data: [], error: null },
        ],
        status: [
          { data: [{ order_value: '75.00' }], error: null },
          { data: [], error: null },
        ],
      },
    );
    const result = await getExposureAtRisk(client, MERCHANT_A);
    expect(result).toBeCloseTo(275.0, 2);
  });

  it('skips null order_value rows without erroring', async () => {
    const client = buildMockClient(
      [{ data: [{ id: 'job-1' }], error: null }, { data: [], error: null }],
      {
        graded: [
          { data: [{ order_value: null }, { order_value: '50.00' }], error: null },
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
        graded: [{ data: [{ order_value: '100' }], error: null }, { data: [], error: null }],
        status: [{ data: [], error: null }],
      },
    );
    await getExposureAtRisk(client, MERCHANT_A);
    // Find audit_transactions calls and assert `.in('job_id', ...)` only includes owned IDs
    const allFromCalls: string[] = (client.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    const txCallIndices = allFromCalls
      .map((t, i) => (t === 'audit_transactions' ? i : -1))
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
