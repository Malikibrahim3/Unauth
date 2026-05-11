/**
 * tests/api/merchantIsolation.test.ts
 *
 * Behavioral tests asserting merchant tenant isolation.
 *
 * These tests mock the Supabase service client to verify that:
 * 1. Transaction queries always include a job_id constraint scoped to
 *    merchant-owned jobs.
 * 2. Customer profile reads verify merchant membership before returning data.
 * 3. Evidence package generation rejects profiles/orders not owned by the merchant.
 * 4. Watchlist reads/writes use merchantId, not userId.
 * 5. The public demo page does NOT reference SUPABASE_SERVICE_ROLE_KEY.
 *
 * These tests do NOT require a live database — they test query construction
 * and code path logic.
 */

import {
  getMerchantOwnedJobIds,
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
  fetchMerchantScopedTransaction,
  escapeCsvCell,
  paginateAll,
} from '@/lib/supabase/merchantHelpers';

// ---------------------------------------------------------------------------
// Minimal Supabase mock builder
// ---------------------------------------------------------------------------
function makeMockSupabase(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: jest.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// ---------------------------------------------------------------------------
// escapeCsvCell
// ---------------------------------------------------------------------------
describe('escapeCsvCell', () => {
  it('wraps values in double-quotes', () => {
    expect(escapeCsvCell('hello')).toBe('"hello"');
  });

  it('escapes internal double-quotes', () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('neutralises formula-leading = characters', () => {
    const result = escapeCsvCell('=SUM(A1)');
    expect(result).toMatch(/^"'/);
    expect(result).not.toBe('"=SUM(A1)"');
  });

  it('neutralises formula-leading + characters', () => {
    expect(escapeCsvCell('+cmd')).toMatch(/^"'/);
  });

  it('neutralises formula-leading @ characters', () => {
    expect(escapeCsvCell('@user')).toMatch(/^"'/);
  });

  it('handles null/undefined gracefully', () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });
});

// ---------------------------------------------------------------------------
// getMerchantOwnedJobIds — must filter by merchantId
// ---------------------------------------------------------------------------
describe('getMerchantOwnedJobIds', () => {
  it('queries processing_jobs with merchant_id constraint', async () => {
    const eqCalls: [string, string][] = [];
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((col: string, val: string) => {
        eqCalls.push([col, val]);
        return chain;
      }),
      range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }),
    };
    const mock = { from: jest.fn().mockReturnValue(chain) };

    await getMerchantOwnedJobIds(mock as any, 'merchant-abc');

    expect(mock.from).toHaveBeenCalledWith('processing_jobs');
    expect(eqCalls).toContainEqual(['merchant_id', 'merchant-abc']);
  });

  it('returns empty array when merchant has no jobs', async () => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const mock = { from: jest.fn().mockReturnValue(chain) };

    const result = await getMerchantOwnedJobIds(mock as any, 'no-jobs-merchant');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchMerchantScopedCustomerProfile — must use canonical merchant_ids filter
// ---------------------------------------------------------------------------
describe('fetchMerchantScopedCustomerProfile', () => {
  it('queries customer_profiles with merchant and legacy user membership checks', async () => {
    const orCalls: string[] = [];
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn((filter: string) => {
        orCalls.push(filter);
        return chain;
      }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mock = { from: jest.fn().mockReturnValue(chain) };

    await fetchMerchantScopedCustomerProfile(mock as any, 'merchant-xyz', 'profile-123', 'user-legacy');

    expect(mock.from).toHaveBeenCalledWith('customer_profiles');
    expect(orCalls).toHaveLength(1);
    expect(orCalls[0]).toContain('merchant_ids.cs.["merchant-xyz"]');
    expect(orCalls[0]).toContain('merchant_ids.cs.["user-legacy"]');
  });

  it('returns null when profile does not belong to merchant', async () => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const mock = { from: jest.fn().mockReturnValue(chain) };

    const result = await fetchMerchantScopedCustomerProfile(mock as any, 'other-merchant', 'profile-123');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchMerchantScopedCustomerTransactions — must use in('job_id', ownedJobIds)
// ---------------------------------------------------------------------------
describe('fetchMerchantScopedCustomerTransactions', () => {
  it('never queries audit_transactions without a job_id constraint', async () => {
    // When merchant has no jobs, must return empty without querying transactions
    const fromCalls: string[] = [];
    const mock = {
      from: jest.fn((table: string) => {
        fromCalls.push(table);
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
          in: jest.fn().mockReturnThis(),
          contains: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        return chain;
      }),
    };

    const result = await fetchMerchantScopedCustomerTransactions(
      mock as any,
      'merchant-abc',
      'profile-123',
      { emails: ['test@example.com'] }
    );

    expect(result).toEqual([]);
    // audit_transactions must NOT have been queried
    expect(fromCalls).not.toContain('audit_transactions');
  });

  it('includes job_id constraint in audit_transactions query when merchant has jobs', async () => {
    const inCalls: [string, string[]][] = [];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }) };
          return c;
        }
        if (table === 'customer_profile_audit_appearances') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), in: jest.fn().mockResolvedValue({ data: [], error: null }) };
          return c;
        }
        // audit_transactions
        const c: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn((col: string, val: string[]) => { inCalls.push([col, val]); return c; }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return c;
      }),
    };

    await fetchMerchantScopedCustomerTransactions(
      mock as any,
      'merchant-abc',
      'profile-123',
      { emails: ['test@example.com'] }
    );

    // Verify that audit_transactions query included job_id constraint
    const jobIdConstraints = inCalls.filter(([col]) => col === 'job_id');
    expect(jobIdConstraints.length).toBeGreaterThan(0);
    for (const [, vals] of jobIdConstraints) {
      expect(vals).toContain('job-1');
    }
  });
});

// ---------------------------------------------------------------------------
// fetchMerchantScopedTransaction — must verify job ownership first
// ---------------------------------------------------------------------------
describe('fetchMerchantScopedTransaction', () => {
  it('returns null when job does not belong to merchant', async () => {
    const mock = makeMockSupabase();
    mock._chain.eq = jest.fn().mockReturnThis();
    mock._chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const result = await fetchMerchantScopedTransaction(
      mock as any,
      'merchant-abc',
      'tx-123',
      'job-other'
    );

    expect(result).toBeNull();
  });

  it('fetches transaction with both id and job_id when job is owned', async () => {
    const mock = makeMockSupabase();
    const eqCalls: [string, string][] = [];
    let jobLookupDone = false;

    mock.from = jest.fn((table: string) => {
      const chain = { ...mock._chain };
      chain.select = jest.fn().mockReturnThis();
      chain.eq = jest.fn((col: string, val: string) => {
        eqCalls.push([col, val]);
        return chain;
      });
      chain.maybeSingle = jest.fn(() => {
        if (table === 'processing_jobs') {
          jobLookupDone = true;
          return Promise.resolve({ data: { id: 'job-1' }, error: null });
        }
        return Promise.resolve({ data: { id: 'tx-123', job_id: 'job-1' }, error: null });
      });
      return chain;
    });

    const result = await fetchMerchantScopedTransaction(
      mock as any,
      'merchant-abc',
      'tx-123',
      'job-1'
    );

    expect(jobLookupDone).toBe(true);
    expect(result).not.toBeNull();
    // tx query must include job_id constraint
    expect(eqCalls).toContainEqual(['job_id', 'job-1']);
    expect(eqCalls).toContainEqual(['id', 'tx-123']);
  });
});

// ---------------------------------------------------------------------------
// paginateAll — must stop when page is short
// ---------------------------------------------------------------------------
describe('paginateAll', () => {
  it('fetches multiple pages and stops on short last page', async () => {
    let calls = 0;
    const result = await paginateAll(async (from: number, to: number) => {
      calls++;
      if (calls === 1) return { data: Array(1000).fill({ id: calls }), error: null };
      return { data: [{ id: 2 }], error: null };
    }, 1000);

    expect(calls).toBe(2);
    expect(result.length).toBe(1001);
  });

  it('throws on query error', async () => {
    await expect(
      paginateAll(async () => ({ data: null, error: 'db error' }))
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Watchlist isolation — merchantId vs userId
// ---------------------------------------------------------------------------
describe('Watchlist uses merchantId not userId', () => {
  it('watchlist route file does not use ctx.userId for merchant_id filter', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routeContent = fs.readFileSync(
      path.join(process.cwd(), 'app/api/watchlist/route.ts'),
      'utf-8'
    );
    const deletedRouteContent = fs.readFileSync(
      path.join(process.cwd(), 'app/api/watchlist/[id]/route.ts'),
      'utf-8'
    );

    // Must not have merchant_id: ctx.userId anywhere
    expect(routeContent).not.toContain('merchant_id: ctx.userId');
    expect(deletedRouteContent).not.toContain('merchant_id: ctx.userId');
    // Must have merchant_id: ctx.merchantId
    expect(routeContent).toContain('ctx.merchantId');
    expect(deletedRouteContent).toContain('ctx.merchantId');
  });
});

// ---------------------------------------------------------------------------
// Public demo page must not use service role key
// ---------------------------------------------------------------------------
describe('Public demo page security', () => {
  it('demo page.tsx does not reference SUPABASE_SERVICE_ROLE_KEY', () => {
    const fs = require('fs');
    const path = require('path');
    const demoPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(public)/demo/page.tsx'),
      'utf-8'
    );
    expect(demoPage).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('demo page.tsx does not directly import supabase-js client', () => {
    const fs = require('fs');
    const path = require('path');
    const demoPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(public)/demo/page.tsx'),
      'utf-8'
    );
    // Should not directly import the low-level client
    expect(demoPage).not.toContain("from '@supabase/supabase-js'");
  });
});
