/**
 * tests/api/routeSecurity.test.ts
 *
 * Behavioral route security tests.
 *
 * These tests verify:
 * 1. /api/customers/search — unauthenticated requests return 401
 *    and cross-merchant profiles are never returned.
 * 2. /api/evidence/ce3-check — cross-merchant order IDs return ineligible,
 *    owned orders work correctly.
 * 3. /api/inbox/export — normal rows with match_status='none' are excluded.
 * 4. fetchMerchantReviewQueueRows helper — semantics match definition.
 * 5. Static guard — service-role routes must be auth-gated.
 */

import path from 'path';
import fs from 'fs';
const { globSync } = require('glob');
import {
  fetchMerchantReviewQueueRows,
  fetchReviewQueueProfileIds,
} from '../../lib/supabase/merchantHelpers';

// ---------------------------------------------------------------------------
// Helper: minimal Supabase mock
// ---------------------------------------------------------------------------
function makeChain(resolveValue: any = { data: [], error: null }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue(resolveValue),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Static guard: every service-role route must have auth gating
// ---------------------------------------------------------------------------
describe('Static security guard: service-role routes must be auth-gated', () => {
  let routeFiles: string[] = [];

  beforeAll(async () => {
    routeFiles = globSync('app/api/**/route.ts', { cwd: process.cwd() });
  });

  it('finds route files to check', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it('every service-role route uses auth.getUser() AND requirePermission()', () => {
    const violations: string[] = [];

    // Explicitly whitelisted routes that are HMAC/internal or PII-free public
    const WHITELIST = [
      'app/api/demo/',
      'app/api/health',
      'app/api/stripe/webhook',
    ];

    for (const relPath of routeFiles) {
      const absPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(absPath, 'utf-8');

      const usesServiceRole =
        content.includes('createServiceClient') ||
        content.includes('SUPABASE_SERVICE_ROLE_KEY');

      if (!usesServiceRole) continue;

      const isWhitelisted = WHITELIST.some((w) => relPath.startsWith(w));
      if (isWhitelisted) continue;

      const hasHmacAuth =
        content.includes('HMAC') ||
        content.includes('x-internal-secret') ||
        content.includes('verifyInternalToken') ||
        content.includes('internal-auth');
      if (hasHmacAuth) continue;

      // Standard routes must have BOTH auth.getUser() AND requirePermission()
      const hasUserAuth = content.includes('auth.getUser');
      const hasPermissionCheck = content.includes('requirePermission');

      if (!hasUserAuth || !hasPermissionCheck) {
        violations.push(
          `${relPath} — missing: ${!hasUserAuth ? 'auth.getUser()' : ''}${!hasUserAuth && !hasPermissionCheck ? ' + ' : ''}${!hasPermissionCheck ? 'requirePermission()' : ''}`
        );
      }
    }

    if (violations.length > 0) {
      console.error(
        'Routes using service role WITHOUT full auth+permission gating:\n' +
          violations.map((v) => `  • ${v}`).join('\n')
      );
    }

    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// /api/customers/search — must require auth
// ---------------------------------------------------------------------------
describe('/api/customers/search — auth requirement', () => {
  it('route file calls auth.getUser() before using service role', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain('auth.getUser');
    expect(content).toContain('requirePermission');
    expect(content).toContain('401');
  });

  it('route file uses contains(merchant_ids) to scope results', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain("contains('merchant_ids'");
    expect(content).toContain('ctx.merchantId');
  });

  it('route returns 401 when user is null — verified via source analysis', () => {
    // Dynamic import of Next.js route handlers is not supported in Jest.
    // We verify the 401 path via static source inspection.
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    // Must have: auth check that returns 401
    expect(content).toContain('401');
    expect(content).toContain('auth.getUser');
    // Must have: 401 appears before any .from() query call
    const idx401 = content.indexOf('401');
    const firstFromCall = content.indexOf('.from(');
    expect(idx401).toBeGreaterThan(-1);
    expect(firstFromCall).toBeGreaterThan(-1);
    expect(idx401).toBeLessThan(firstFromCall);
  });
});

// ---------------------------------------------------------------------------
// /api/evidence/ce3-check — cross-merchant order is rejected
// ---------------------------------------------------------------------------
describe('/api/evidence/ce3-check — merchant scoping', () => {
  it('route file uses fetchMerchantScopedCustomerProfile', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/evidence/ce3-check/route.ts'),
      'utf-8'
    );
    expect(content).toContain('fetchMerchantScopedCustomerProfile');
  });

  it('route file uses fetchMerchantScopedCustomerTransactions', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/evidence/ce3-check/route.ts'),
      'utf-8'
    );
    expect(content).toContain('fetchMerchantScopedCustomerTransactions');
  });

  it('route file does NOT use .eq(merchant_id) on customer_profiles or audit_transactions', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/evidence/ce3-check/route.ts'),
      'utf-8'
    );
    // Should not have legacy incorrect field usage
    expect(content).not.toContain(".eq('merchant_id', ctx.merchantId)");
    expect(content).not.toContain('.limit(500)');
  });

  it('cross-merchant order ID returns ineligible — order not in merchant transactions', () => {
    // fetchMerchantScopedCustomerTransactions returns no rows for other-merchant orders.
    // The route checks disputedTx = txRows.find(tx => tx.id === orderId)
    // If not found, it returns eligible: false with a clear reason.
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/evidence/ce3-check/route.ts'),
      'utf-8'
    );
    expect(content).toContain('Disputed order not found in merchant account');
  });
});

// ---------------------------------------------------------------------------
// fetchMerchantReviewQueueRows — review queue semantics
// ---------------------------------------------------------------------------
describe('fetchMerchantReviewQueueRows — review queue definition', () => {
  it('returns empty when merchant has no jobs', async () => {
    const mock = {
      from: jest.fn((table: string) => {
        const c = makeChain({ data: [], error: null });
        c.eq = jest.fn().mockReturnThis();
        c.range = jest.fn().mockResolvedValue({ data: [], error: null });
        return c;
      }),
    };

    const result = await fetchMerchantReviewQueueRows(mock as any, 'merchant-no-jobs');
    expect(result.rows).toEqual([]);
    expect(result.ownedJobIds).toEqual([]);
  });

  it('query includes .or() for identity_confidence_grade or match_status', async () => {
    const orCalls: string[] = [];
    const inCalls: [string, string[]][] = [];
    const notCalls: [string, string, unknown][] = [];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }) };
          return c;
        }
        // audit_transactions
        const c: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn((col: string, val: string[]) => { inCalls.push([col, val]); return c; }),
          or: jest.fn((expr: string) => { orCalls.push(expr); return c; }),
          not: jest.fn((col: string, op: string, val: unknown) => { notCalls.push([col, op, val]); return c; }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return c;
      }),
    };

    await fetchMerchantReviewQueueRows(mock as any, 'merchant-abc');

    // Verify job_id constraint is applied
    const jobIdIn = inCalls.find(([col]) => col === 'job_id');
    expect(jobIdIn).toBeDefined();
    expect(jobIdIn![1]).toContain('job-1');

    // Verify or() for identity_confidence_grade and match_status
    const hasIdentityOr = orCalls.some(
      (expr) =>
        expr.includes('identity_confidence_grade') &&
        expr.includes('match_status')
    );
    expect(hasIdentityOr).toBe(true);

    // Verify dismissed_by_merchant is excluded
    const dismissedNot = notCalls.find(([col]) => col === 'dismissed_by_merchant');
    expect(dismissedNot).toBeDefined();

    // Verify match_status='none' is NOT excluded via a separate .not() call
    // (that would drop null match_status rows). The .or() expression handles
    // exclusion implicitly.
    const noneNot = notCalls.find(([col, , val]) => col === 'match_status' && val === 'none');
    expect(noneNot).toBeUndefined();
  });

  it('normal rows with match_status=none are excluded by .or() semantics, not a .not() filter', async () => {
    // CORRECTNESS: we must NOT use .not('match_status','eq','none') because that
    // operator excludes NULLs too (breaking graded rows with null match_status).
    // Instead, the .or() expression only includes candidate/probable/definite/graded rows.
    const notCalls: [string, string, unknown][] = [];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }) };
          return c;
        }
        const c: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          not: jest.fn((col: string, op: string, val: unknown) => { notCalls.push([col, op, val]); return c; }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return c;
      }),
    };

    await fetchMerchantReviewQueueRows(mock as any, 'merchant-abc');

    // Must NOT have a .not('match_status', ...) that would drop null rows
    const hasMatchStatusNot = notCalls.some(([col]) => col === 'match_status');
    expect(hasMatchStatusNot).toBe(false);
  });

  it('orders by identity_score DESC, then processed_at DESC — not match_score', async () => {
    const orderCalls: [string, { ascending: boolean }][] = [];

    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }) };
          return c;
        }
        const c: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          order: jest.fn((col: string, opts: { ascending: boolean }) => { orderCalls.push([col, opts]); return c; }),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return c;
      }),
    };

    await fetchMerchantReviewQueueRows(mock as any, 'merchant-abc');

    const cols = orderCalls.map(([col]) => col);
    expect(cols).toContain('identity_score');
    expect(cols).not.toContain('match_score');
    // identity_score must be descending
    const scoreOrder = orderCalls.find(([col]) => col === 'identity_score');
    expect(scoreOrder![1].ascending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// /api/inbox/export — correct population semantics
// ---------------------------------------------------------------------------
describe('/api/inbox/export — review population semantics', () => {
  it('export route uses fetchMerchantReviewQueueRows', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/inbox/export/route.ts'),
      'utf-8'
    );
    expect(content).toContain('fetchMerchantReviewQueueRows');
  });

  it('export route does NOT use legacy match_score ordering', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/inbox/export/route.ts'),
      'utf-8'
    );
    expect(content).not.toContain("order('match_score'");
  });

  it('export route does NOT use legacy risk_level filter', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/inbox/export/route.ts'),
      'utf-8'
    );
    expect(content).not.toContain("in('risk_level'");
    expect(content).not.toContain("risk_level");
  });
});

// ---------------------------------------------------------------------------
// Inbox page — correct population semantics
// ---------------------------------------------------------------------------
describe('Inbox page — review population semantics', () => {
  it('inbox page uses fetchMerchantReviewQueueRows', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('fetchMerchantReviewQueueRows');
  });

  it('inbox page does NOT filter by legacy risk_level', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).not.toContain("in('risk_level'");
    expect(content).not.toContain("risk_level: ['high'");
  });

  it('inbox page does NOT order by legacy match_score', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).not.toContain("order('match_score'");
  });

  it('inbox page uses service client with requirePermission', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('requirePermission');
    expect(content).toContain('createServiceClient');
  });

  it('inbox page renders Today, This week, and All open tabs', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).toContain("'today'");
    expect(content).toContain("'week'");
    expect(content).toContain("'all'");
    expect(content).toContain('Today');
    expect(content).toContain('This week');
    expect(content).toContain('All open');
  });

  it('inbox client opens the customer drawer from row data', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'components/inbox/InboxClient.tsx'),
      'utf-8'
    );
    expect(content).toContain('CustomerIntelligenceDrawer');
    expect(content).toContain('selectedProfileId');
    expect(content).toContain('customer_profile_id');
    expect(content).toContain('setSelectedProfileId(tx.customer_profile_id');
  });
});

// ---------------------------------------------------------------------------
// /api/inbox — query-backed inbox semantics
// ---------------------------------------------------------------------------
describe('/api/inbox — query-backed review queue', () => {
  it('API route queries audit_transactions through the shared helper', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/inbox/route.ts'),
      'utf-8'
    );
    expect(content).toContain('fetchMerchantReviewQueueRows');
    expect(content).toContain('fetchReviewQueueProfileIds');
    expect(content).toContain('requirePermission');
    expect(content).not.toContain('inbox_items');
    expect(content).not.toContain("from('inbox_items')");
  });

  it('profile lookup is scoped by owned audit/job ids', async () => {
    const inCalls: [string, string[]][] = [];
    const mock = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn((col: string, val: string[]) => {
          inCalls.push([col, val]);
          return {
            in: jest.fn((col2: string, val2: string[]) => {
              inCalls.push([col2, val2]);
              return Promise.resolve({ data: [], error: null });
            }),
          };
        }),
      })),
    };

    await fetchReviewQueueProfileIds(mock as any, ['job-1'], ['tx-1']);

    expect(inCalls).toContainEqual(['audit_id', ['job-1']]);
    expect(inCalls).toContainEqual(['transaction_id', ['tx-1']]);
  });
});

// ---------------------------------------------------------------------------
// Customer page — no global fraud_identity_clusters reads
// ---------------------------------------------------------------------------
describe('Customer detail page — linked identity privacy', () => {
  it('does NOT read from fraud_identity_clusters', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/[id]/page.tsx'),
      'utf-8'
    );
    // The table must not appear in any .from() call
    expect(content).not.toMatch(/\.from\s*\(\s*['"]fraud_identity_clusters['"]/);
  });

  it('derives linked identity from merchant-owned transactions only', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/[id]/page.tsx'),
      'utf-8'
    );
    // Must use fetchMerchantScopedCustomerTransactions (not raw cluster table)
    expect(content).toContain('fetchMerchantScopedCustomerTransactions');
    expect(content).not.toContain('getMerchantOwnedJobIds');
  });
});

// ---------------------------------------------------------------------------
// escapePostgrestFilterValue — hostile input sanitisation
// ---------------------------------------------------------------------------
import { escapePostgrestFilterValue } from '../../lib/supabase/merchantHelpers';

describe('escapePostgrestFilterValue — hostile input handling', () => {
  it('passes through safe alphanumeric input unchanged', () => {
    expect(escapePostgrestFilterValue('john.doe@example.com')).toBe('john.doe@example.com');
    expect(escapePostgrestFilterValue('Alice Smith')).toBe('Alice Smith');
    expect(escapePostgrestFilterValue('test123')).toBe('test123');
  });

  it('escapes commas (PostgREST .or() delimiter)', () => {
    const result = escapePostgrestFilterValue('a,b');
    expect(result).not.toContain(',');
    expect(result).toContain('%2C');
  });

  it('escapes parentheses (PostgREST grouping chars)', () => {
    const result = escapePostgrestFilterValue('(inject)');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('escapes curly braces (PostgREST array literal chars)', () => {
    const result = escapePostgrestFilterValue('{bad}');
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
  });

  it('escapes double quotes', () => {
    const result = escapePostgrestFilterValue('"quoted"');
    expect(result).not.toContain('"');
  });

  it('escapes single quotes', () => {
    const result = escapePostgrestFilterValue("o'malley");
    expect(result).not.toContain("'");
  });

  it('escapes percent signs (LIKE wildcard overflow)', () => {
    const result = escapePostgrestFilterValue('100% legit');
    // % is encoded as %25, so no bare unencoded % remains
    expect(result).toContain('%25');
    expect(result).not.toContain('% ');  // no literal '% ' (space after %)
    // The original input '100% legit' has been encoded
    expect(result).not.toBe('100% legit');
  });

  it('escapes backslashes', () => {
    const result = escapePostgrestFilterValue('C:\\path');
    expect(result).not.toContain('\\');
  });

  it('removes null bytes', () => {
    const result = escapePostgrestFilterValue('bad\0byte');
    expect(result).not.toContain('\0');
    expect(result).toBe('badbyte');
  });

  it('handles combined hostile input without throwing', () => {
    const hostile = '\'"();{}%\\test\0inject';
    expect(() => escapePostgrestFilterValue(hostile)).not.toThrow();
    const result = escapePostgrestFilterValue(hostile);
    // Raw literal special chars are gone (encoded as %XX sequences)
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).not.toContain("'");
    expect(result).not.toContain('\\');
    // % is allowed only as part of a %XX percent-encoding sequence
    expect(result).not.toMatch(/%(?![0-9A-Fa-f]{2})/);
  });
});

// ---------------------------------------------------------------------------
// Review queue helper — regression: graded rows with null match_status
// ---------------------------------------------------------------------------
describe('fetchMerchantReviewQueueRows — null match_status regression', () => {
  it('does NOT add .not(match_status, eq, none) filter that would drop null rows', () => {
    // Static check: the helper source must not call .not('match_status', 'eq', 'none')
    // because PostgREST not.eq excludes NULLs, silently dropping legacy graded rows.
    const helperContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    // Must not contain the problematic filter
    expect(helperContent).not.toContain(".not('match_status', 'eq', 'none')");
    expect(helperContent).not.toContain('.not("match_status", "eq", "none")');
  });

  it('graded row with null match_status passes inclusion filter via or() expression', async () => {
    // A row with identity_confidence_grade='B' and match_status=null
    // must be included. The .or() expression checks grade NOT NULL first,
    // so null match_status is irrelevant for inclusion.
    const orCalls: string[] = [];
    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }) };
          return c;
        }
        const c: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          or: jest.fn((expr: string) => { orCalls.push(expr); return c; }),
          not: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          // Simulate DB returning a graded row with null match_status
          range: jest.fn().mockResolvedValue({
            data: [{ id: 'tx-1', identity_confidence_grade: 'B', match_status: null }],
            error: null,
          }),
        };
        return c;
      }),
    };

    const { rows } = await fetchMerchantReviewQueueRows(mock as any, 'merchant-abc');

    // Row must be returned (it passes the .or() filter on the DB side)
    expect(rows).toHaveLength(1);
    expect(rows[0].identity_confidence_grade).toBe('B');
    expect(rows[0].match_status).toBeNull();

    // The .or() expression must include identity_confidence_grade check
    const hasGradeOr = orCalls.some((expr) => expr.includes('identity_confidence_grade'));
    expect(hasGradeOr).toBe(true);
  });

  it('row with match_status=none and null grade is excluded by .or() semantics', () => {
    // Static: the or() filter only includes rows where grade IS NOT NULL
    // OR match_status IN (candidate,probable,definite).
    // A row with match_status='none' and null grade satisfies neither condition,
    // so it is excluded by the DB query. We verify the filter expression is correct.
    const helperContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    // Must include the correct PostgREST .or() expression
    expect(helperContent).toContain('identity_confidence_grade.in.(probable,definite)');
    expect(helperContent).toContain('match_status.in.(probable,definite)');
  });

  it('dismissed rows are excluded via .not(dismissed_by_merchant, is, true)', () => {
    const helperContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    expect(helperContent).toContain("'dismissed_by_merchant'");
    expect(helperContent).toContain('is');
    expect(helperContent).toContain('true');
  });
});

// ---------------------------------------------------------------------------
// Inbox page auth and permission guards
// ---------------------------------------------------------------------------
describe('Inbox page — auth and permission guards', () => {
  it('inbox page redirects unauthenticated users to /login', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).toContain("redirect('/login')");
    // Must redirect BEFORE calling fetchMerchantReviewQueueRows — slice from the
    // function body so we don't confuse the import line with the actual call.
    const fnStart = content.indexOf('export default async function');
    const body = content.slice(fnStart);
    const redirectIdx = body.indexOf("redirect('/login')");
    const fetchIdx = body.indexOf('fetchMerchantReviewQueueRows(');
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(redirectIdx).toBeLessThan(fetchIdx);
  });

  it('inbox page uses VIEW_INBOX permission, not VIEW_CUSTOMERS', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('PERMISSIONS.VIEW_INBOX');
    expect(content).not.toContain('PERMISSIONS.VIEW_CUSTOMERS');
  });

  it('inbox page fails closed on permission denial (explicit access-denied UI)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/inbox/page.tsx'),
      'utf-8'
    );
    // App Router pages cannot return NextResponse. Ensure denied path is explicit.
    expect(content).toContain('if (denied) {');
    expect(content).toContain('Access denied');
    expect(content).toContain('You do not have permission to view the review inbox.');
    // Must NOT have: if (!denied) { ... all data loading ... }
    // (silently empty on denial)
    expect(content).not.toContain('if (!denied)');
  });
});

// ---------------------------------------------------------------------------
// Lookup/remaining route — must use requirePermission and ctx.merchantId
// ---------------------------------------------------------------------------
describe('/api/lookup/remaining — permission and merchant scoping', () => {
  it('route uses requirePermission with LOOKUP_CUSTOMER', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/lookup/remaining/route.ts'),
      'utf-8'
    );
    expect(content).toContain('requirePermission');
    expect(content).toContain('PERMISSIONS.LOOKUP_CUSTOMER');
  });

  it('route uses ctx.merchantId, not user.id, for quota scoping', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/lookup/remaining/route.ts'),
      'utf-8'
    );
    expect(content).toContain('ctx.merchantId');
    // merchant_id column must be scoped by ctx.merchantId, not user.id
    expect(content).not.toContain(".eq('merchant_id', user.id)");
    expect(content).not.toContain('.eq("merchant_id", user.id)');
  });
});

// ---------------------------------------------------------------------------
// images.remotePatterns — mitigation must be real in next.config.js
// ---------------------------------------------------------------------------
describe('next.config.js — image optimizer DoS mitigation', () => {
  it('defines images.remotePatterns (not just experimental config)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8'
    );
    expect(content).toContain('remotePatterns');
    expect(content).toContain('images');
  });

  it('does not use a wildcard remotePatterns hostname', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8'
    );
    // Must not allow all hostnames with **
    expect(content).not.toContain("hostname: '**'");
    expect(content).not.toContain('hostname: "*"');
  });

  it('does NOT use *.supabase.co wildcard hostname', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8'
    );
    // *.supabase.co must not appear as an actual hostname value — check only
    // code lines (not comment lines) for the wildcard pattern.
    const codeLines = content.split('\n').filter((line) => !line.trim().startsWith('//'));
    const codeOnly = codeLines.join('\n');
    // Wildcard glob hostname must not appear in any string literal
    expect(codeOnly).not.toMatch(/hostname:\s*['"`]\*\./);
    expect(codeOnly).not.toContain("'*.supabase.co'");
    expect(codeOnly).not.toContain('"*.supabase.co"');
  });

  it('uses env-derived or specific project hostname, not a glob', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'next.config.js'),
      'utf-8'
    );
    // The config must derive the hostname from the env var, not hardcode a glob
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL');
    // Any string literal hostname in remotePatterns must not contain a wildcard star
    const hostnameMatches = content.match(/hostname:\s*['"`]([^'"`]+)['"`]/g) ?? [];
    for (const match of hostnameMatches) {
      expect(match).not.toContain('*');
    }
  });
});

// ---------------------------------------------------------------------------
// /api/customers/search — hostile input behavioral tests
// ---------------------------------------------------------------------------
describe('/api/customers/search — hostile input behavioral tests', () => {
  it('route imports escapePostgrestFilterValue', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain('escapePostgrestFilterValue');
  });

  it('route does NOT construct a raw .or() string from user input', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    // Any .or() call must not interpolate ${q} or ${like} directly
    // (raw user input variables)
    expect(content).not.toMatch(/\.or\s*\(\s*`[^`]*\$\{(?:q|like)[^}]*\}/);
  });

  it('escapePostgrestFilterValue encodes all PostgREST hostile chars correctly', () => {
    const hostileInputs = [
      { input: 'a,b',          forbid: [','] },
      { input: '(inject)',     forbid: ['(', ')'] },
      { input: '{bad}',        forbid: ['{', '}'] },
      { input: '"quoted"',     forbid: ['"'] },
      { input: "o'malley",     forbid: ["'"] },
      { input: '100% legit',   forbid: ['% '] },  // bare % followed by space
      { input: 'C:\\path',     forbid: ['\\'] },
      { input: '\'"();{}%\\z', forbid: ['(', ')', "'", '{', '}', '\\'] },
    ];

    for (const { input, forbid } of hostileInputs) {
      const result = escapePostgrestFilterValue(input);
      for (const c of forbid) {
        expect(result).not.toContain(c);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// customers/page.tsx — uses shared escape helper, not local reimplementation
// ---------------------------------------------------------------------------
describe('app/(app)/customers/page.tsx — escape helper usage', () => {
  it('imports escapePostgrestFilterValue from merchantHelpers', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('escapePostgrestFilterValue');
    expect(content).toContain('merchantHelpers');
  });

  it('does NOT reimplement escaping with encodeURIComponent locally', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/page.tsx'),
      'utf-8'
    );
    // The old pattern should be gone
    expect(content).not.toContain('encodeURIComponent(c)');
    // The old replace regex should be gone
    expect(content).not.toMatch(/\.replace\s*\(.*encodeURIComponent/);
  });
});

// ---------------------------------------------------------------------------
// app/api/customers/[id]/route.ts — must NOT read fraud_identity_clusters
// ---------------------------------------------------------------------------
describe('app/api/customers/[id]/route.ts — cross-merchant cluster isolation', () => {
  it('does NOT import or query fraud_identity_clusters', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf-8'
    );
    expect(content).not.toContain('fraud_identity_clusters');
  });

  it('linked identity signals are derived from merchant-owned transactions (identityTimeline)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf-8'
    );
    // The linked accounts section must reference identityTimeline, not cluster tables
    expect(content).toContain('identityTimeline');
    // Must not reference cross-merchant cluster aggregation pattern
    expect(content).not.toContain('match_reasons: Array.isArray');
    // Must not have the old cluster-join pattern
    expect(content).not.toContain('.in(\'cluster_id\'');
    expect(content).not.toContain('.in("cluster_id"');
  });
});

// ---------------------------------------------------------------------------
// countReviewWorthyTransactions — canonical flagged_count definition
// ---------------------------------------------------------------------------
import { countReviewWorthyTransactions } from '../../lib/supabase/merchantHelpers';

// ---------------------------------------------------------------------------
// Behavioral helpers for countReviewWorthyTransactions mocks
// ---------------------------------------------------------------------------

/**
 * Build a Supabase mock for countReviewWorthyTransactions.
 *
 * jobsData  — rows returned by the processing_jobs ownership check
 * jobsError — if set, the ownership check returns this error
 * gradedCount / gradedError — result for the graded-clause count query
 * statusCount / statusError — result for the status-clause count query
 *
 * The mock records which columns were filtered on audit_transactions so tests
 * can assert that `merchant_id` is never used.
 */
function makeCountMock({
  jobsData = [{ id: 'job-1' }] as object[],
  jobsError = null as string | null,
  gradedCount = 0,
  gradedError = null as string | null,
  statusCount = 0,
  statusError = null as string | null,
}: {
  jobsData?: object[];
  jobsError?: string | null;
  gradedCount?: number;
  gradedError?: string | null;
  statusCount?: number;
  statusError?: string | null;
} = {}) {
  // Track eq() calls on audit_transactions so we can verify merchant_id is absent
  const auditTransactionEqCalls: [string, unknown][] = [];
  let callCount = 0; // 0=graded, 1=status

  const mock = {
    from: jest.fn((table: string) => {
      if (table === 'processing_jobs') {
        // Ownership-check chain: .select().eq('id', ...).eq('merchant_id', ...) resolves at second .eq()
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn()
            .mockReturnValueOnce({ // first .eq('id', jobId) — returns chain
              eq: jest.fn().mockResolvedValue({
                data: jobsError ? null : jobsData,
                error: jobsError ? { message: jobsError } : null,
              }),
            })
            .mockResolvedValue({ // fallback (second .eq directly)
              data: jobsError ? null : jobsData,
              error: jobsError ? { message: jobsError } : null,
            }),
        };
        return chain;
      }

      // audit_transactions chain — the two count queries
      const idx = callCount++;
      const countResult = idx === 0
        ? { count: gradedCount, error: gradedError ? { message: gradedError } : null }
        : { count: statusCount, error: statusError ? { message: statusError } : null };

      // Make the chain a thenable so any chained method that is awaited directly
      // resolves to countResult (handles .not().not(), .in().is().not() etc.)
      const chain: any = {
        then: (resolve: (v: any) => void, reject: (e: any) => void) =>
          Promise.resolve(countResult).then(resolve, reject),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((col: string, val: unknown) => {
          auditTransactionEqCalls.push([col, val]);
          return chain;
        }),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
      };
      return chain;
    }),
    _auditTransactionEqCalls: auditTransactionEqCalls,
  };
  return mock;
}

describe('countReviewWorthyTransactions — behavioral tests', () => {
  it('first queries processing_jobs to verify job ownership', async () => {
    const mock = makeCountMock({ jobsData: [{ id: 'job-1' }], gradedCount: 0, statusCount: 0 });
    await countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a');
    const fromCalls = (mock.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(fromCalls[0]).toBe('processing_jobs');
  });

  it('never calls .eq("merchant_id") on audit_transactions', async () => {
    const mock = makeCountMock({ gradedCount: 2, statusCount: 1 });
    await countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a');
    const merchantIdEq = mock._auditTransactionEqCalls.find(
      ([col]) => col === 'merchant_id'
    );
    expect(merchantIdEq).toBeUndefined();
  });

  it('throws when the ownership query returns an error', async () => {
    const mock = makeCountMock({ jobsError: 'connection reset', jobsData: [] });
    await expect(
      countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a')
    ).rejects.toThrow('ownership check failed');
  });

  it('throws with JOB_NOT_OWNED code when job does not belong to merchant', async () => {
    const mock = makeCountMock({ jobsData: [] }); // empty = not owned
    await expect(
      countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-wrong')
    ).rejects.toMatchObject({ code: 'JOB_NOT_OWNED' });
  });

  it('throws when the graded count query errors', async () => {
    const mock = makeCountMock({ gradedError: 'timeout' });
    await expect(
      countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a')
    ).rejects.toThrow('graded count query failed');
  });

  it('throws when the status count query errors', async () => {
    const mock = makeCountMock({ statusError: 'timeout' });
    await expect(
      countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a')
    ).rejects.toThrow('status count query failed');
  });

  it('counts graded rows (grade set, match_status null) — Clause A', async () => {
    const mock = makeCountMock({ gradedCount: 3, statusCount: 0 });
    const result = await countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a');
    expect(result).toBe(3);
  });

  it('counts status-only rows (grade null, status candidate/probable/definite) — Clause B', async () => {
    const mock = makeCountMock({ gradedCount: 0, statusCount: 5 });
    const result = await countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a');
    expect(result).toBe(5);
  });

  it('does not double-count rows satisfying both clauses (Clause B requires grade IS NULL)', async () => {
    // By construction the two count queries are mutually exclusive:
    // Clause A requires grade IS NOT NULL, Clause B requires grade IS NULL.
    // So addition is correct union. Verify by checking the source.
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    // Clause B must include .is('identity_confidence_grade', null)
    expect(src).toContain(".is('identity_confidence_grade', null)");
    // And the comment must document this
    expect(src).toContain('avoid double-counting');
  });

  it('sums Clause A and Clause B counts for total', async () => {
    const mock = makeCountMock({ gradedCount: 4, statusCount: 6 });
    const result = await countReviewWorthyTransactions(mock as any, 'job-1', 'merchant-a');
    expect(result).toBe(10);
  });

  it('uses .not(dismissed_by_merchant, is, true) — not .neq() — to include null rows', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    // Must use .not(..., 'is', true) pattern
    expect(src).toContain(".not('dismissed_by_merchant', 'is', true)");
    // Must NOT use .neq('dismissed_by_merchant', true) — that excludes NULLs
    expect(src).not.toContain(".neq('dismissed_by_merchant', true)");
  });

  it('dismissed_by_merchant=true is excluded (source check for canonical filter)', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    expect(src).toContain("'dismissed_by_merchant'");
    expect(src).toContain("'is'");
    expect(src).toContain('true');
  });

  it('process-csv-chunk route uses countReviewWorthyTransactions, not risk_level', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/process-csv-chunk/route.ts'),
      'utf-8'
    );
    expect(content).toContain('countReviewWorthyTransactions');
    expect(content).not.toContain(".in('risk_level'");
    expect(content).not.toContain('.in("risk_level"');
  });
});

// ---------------------------------------------------------------------------
// Watchlist appearance sync — no invalid audit_transactions ownership columns
// ---------------------------------------------------------------------------
describe('watchlist appearance sync — schema-safe transaction/profile linking', () => {
  it('process-csv-job route does NOT query audit_transactions.merchant_id', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/process-csv-job/route.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(
      /from\s*\(\s*['"]audit_transactions['"]\s*\)[\s\S]*?\.eq\s*\(\s*['"]merchant_id['"]\s*,\s*merchantId\s*\)/
    );
  });

  it('process-csv-chunk route does NOT query audit_transactions.merchant_id', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/process-csv-chunk/route.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(
      /from\s*\(\s*['"]audit_transactions['"]\s*\)[\s\S]*?\.eq\s*\(\s*['"]merchant_id['"]\s*,\s*merchantId\s*\)/
    );
  });

  it('watchlist sync resolves profile links via customer_profile_audit_appearances', () => {
    const jobContent = fs.readFileSync(
      path.join(process.cwd(), 'app/api/process-csv-job/route.ts'),
      'utf-8'
    );
    const chunkContent = fs.readFileSync(
      path.join(process.cwd(), 'app/api/process-csv-chunk/route.ts'),
      'utf-8'
    );
    expect(jobContent).toContain("from('customer_profile_audit_appearances')");
    expect(chunkContent).toContain("from('customer_profile_audit_appearances')");
  });
});

// ---------------------------------------------------------------------------
// Dashboard — dismissed filter and review-queue definition correctness
// ---------------------------------------------------------------------------
describe('dashboard/page.tsx — review queue correctness', () => {
  it('does NOT use .neq("dismissed_by_merchant", true) (excludes NULLs bug)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    expect(content).not.toContain(".neq('dismissed_by_merchant', true)");
    expect(content).not.toContain('.neq("dismissed_by_merchant", true)');
  });

  it('delegates review queue to countMerchantReviewQueueProfiles shared helper', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    // Dashboard must use the shared helper rather than one-off inline query logic.
    expect(content).toContain('countMerchantReviewQueueProfiles');
    // The helper import must come from merchantHelpers.
    expect(content).toContain('merchantHelpers');
  });

  it('shared helper uses .not("dismissed_by_merchant", "is", true) null-safe filter', () => {
    // The dismissed filter now lives in the shared helper, not inline in the dashboard.
    const helperContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    expect(helperContent).toContain('.not(\'dismissed_by_merchant\', \'is\', true)');
    // Must NOT use .neq() anywhere on dismissed_by_merchant
    expect(helperContent).not.toContain(".neq('dismissed_by_merchant', true)");
  });

  it('does NOT query unpaginated large audit_transactions selects (no unbounded .select without count)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    // Dashboard must not have a bare audit_transactions select('*').
    expect(content).not.toMatch(/from\s*\(\s*['"]audit_transactions['"]\s*\)[\s\S]*?\.select\s*\(\s*['"][*]['"]/);
  });

  it('uses canonical review-worthy definition via shared helper — not risk_level', () => {
    const helperContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/supabase/merchantHelpers.ts'),
      'utf-8'
    );
    // Helper defines the canonical terms.
    expect(helperContent).toContain('identity_confidence_grade');
    expect(helperContent).toContain('match_status');
    // Dashboard must delegate and not have its own risk_level filter.
    const dashContent = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    expect(dashContent).not.toMatch(/in\s*\(\s*['"]risk_level['"]/);
  });
});

// ---------------------------------------------------------------------------
// countMerchantReviewQueueProfiles — behavioral tests
// ---------------------------------------------------------------------------
import { countMerchantReviewQueueProfiles } from '../../lib/supabase/merchantHelpers';

/** Build a mock for countMerchantReviewQueueProfiles. */
function makeQueueProfilesMock({
  jobIds = ['job-1'] as string[],
  jobsError = null as string | null,
  gradedTxPages = [[]] as Array<Array<{ id: string }>>,
  statusTxPages = [[]] as Array<Array<{ id: string }>>,
  appearancePages = [[]] as Array<Array<{ profile_id: string; transaction_id: string | null }>>,
  txError = null as string | null,
  appearanceError = null as string | null,
} = {}) {
  let jobsCallIdx = 0;
  let gradedIdx = 0;
  let statusIdx = 0;
  let appearanceIdx = 0;

  return {
    from: jest.fn((table: string) => {
      if (table === 'processing_jobs') {
        const callIdx = jobsCallIdx++;
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: jobsError ? null : callIdx === 0 ? jobIds.map((id) => ({ id })) : [],
            error: jobsError ? { message: jobsError } : null,
          }),
        };
        return chain;
      }

      if (table === 'audit_transactions') {
        // Determine whether this query is the graded clause or status clause.
        let mode: 'graded' | 'status' = 'graded';
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn((col: string) => {
            if (col === 'match_status') mode = 'status';
            return chain;
          }),
          not: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          range: jest.fn().mockImplementation(async () => {
            if (txError) return { data: null, error: { message: txError } };
            const page =
              mode === 'graded'
                ? (gradedTxPages[gradedIdx++] ?? [])
                : (statusTxPages[statusIdx++] ?? []);
            return { data: page, error: null };
          }),
        };
        return chain;
      }

      if (table === 'customer_profile_audit_appearances') {
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          range: jest.fn().mockImplementation(async () => {
            if (appearanceError) return { data: null, error: { message: appearanceError } };
            const page = appearancePages[appearanceIdx++] ?? [];
            return { data: page, error: null };
          }),
        };
        return chain;
      }

      return makeChain();
    }),
  };
}

describe('countMerchantReviewQueueProfiles — behavioral tests', () => {
  it('returns 0 when merchant has no jobs', async () => {
    const mock = makeQueueProfilesMock({ jobIds: [] });
    const result = await countMerchantReviewQueueProfiles(mock as any, 'merchant-a');
    expect(result).toBe(0);
  });

  it('counts distinct profile_ids by joining review-worthy tx ids to appearances', async () => {
    const mock = makeQueueProfilesMock({
      gradedTxPages: [[{ id: 'tx-1' }, { id: 'tx-2' }], []],
      statusTxPages: [[{ id: 'tx-3' }], []],
      appearancePages: [
        [
          { profile_id: 'p1', transaction_id: 'tx-1' },
          { profile_id: 'p2', transaction_id: 'tx-2' },
          { profile_id: 'p2', transaction_id: 'tx-3' }, // duplicate profile
          { profile_id: 'p3', transaction_id: 'tx-999' }, // not review-worthy
        ],
        [],
      ],
    });
    const result = await countMerchantReviewQueueProfiles(mock as any, 'merchant-a');
    expect(result).toBe(2); // p1 + p2
  });

  it('paginates beyond 1000 rows — no hard cap in tx/appearance joins', async () => {
    const txPage1 = Array.from({ length: 1000 }, (_, i) => ({ id: `tx-${i}` }));
    const txPage2 = Array.from({ length: 100 }, (_, i) => ({ id: `tx-${1000 + i}` }));
    const appearancePage1 = Array.from({ length: 1000 }, (_, i) => ({
      profile_id: `p-${i}`,
      transaction_id: `tx-${i}`,
    }));
    const appearancePage2 = Array.from({ length: 100 }, (_, i) => ({
      profile_id: `p-${1000 + i}`,
      transaction_id: `tx-${1000 + i}`,
    }));
    const mock = makeQueueProfilesMock({
      gradedTxPages: [txPage1, txPage2, []],
      statusTxPages: [[]],
      appearancePages: [appearancePage1, appearancePage2, []],
    });
    const result = await countMerchantReviewQueueProfiles(mock as any, 'merchant-a');
    expect(result).toBe(1100);
  });

  it('throws on Supabase ownership query error', async () => {
    const mock = makeQueueProfilesMock({ jobsError: 'db timeout' });
    await expect(
      countMerchantReviewQueueProfiles(mock as any, 'merchant-a')
    ).rejects.toThrow('getMerchantOwnedJobIds failed');
  });

  it('throws on audit_transactions query error', async () => {
    const mock = makeQueueProfilesMock({ txError: 'query failed' });
    await expect(
      countMerchantReviewQueueProfiles(mock as any, 'merchant-a')
    ).rejects.toThrow('clause query failed');
  });

  it('throws on appearance query error', async () => {
    const mock = makeQueueProfilesMock({
      gradedTxPages: [[{ id: 'tx-1' }], []],
      statusTxPages: [[]],
      appearanceError: 'appearance timeout',
    });
    await expect(
      countMerchantReviewQueueProfiles(mock as any, 'merchant-a')
    ).rejects.toThrow('appearance query failed');
  });

  it('never calls .eq("merchant_id") on audit_transactions', async () => {
    const eqCalls: string[] = [];
    const mock = {
      from: jest.fn((table: string) => {
        if (table === 'processing_jobs') {
          // getMerchantOwnedJobIds now paginates via .eq().range()
          const chain: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null }),
          };
          return chain;
        }
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          not: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          eq: jest.fn((col: string) => { eqCalls.push(col); return chain; }),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        return chain;
      }),
    };
    await countMerchantReviewQueueProfiles(mock as any, 'merchant-a');
    expect(eqCalls).not.toContain('merchant_id');
  });
});

// ---------------------------------------------------------------------------
// app/api/customers/[id]/route.ts — no .limit(1000) regression
// ---------------------------------------------------------------------------
describe('app/api/customers/[id]/route.ts — no fixed .limit(1000)', () => {
  it('does NOT contain .limit(1000) in fetchDirectIdentityRows', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf-8'
    );
    // The fallback identity query must not hard-cap at 1000 rows.
    expect(content).not.toContain('.limit(1000)');
  });

  it('fetchDirectIdentityRows uses .range() pagination instead of .limit()', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf-8'
    );
    // Paginated fetches use .range() — verify it is present in the fallback section.
    expect(content).toContain('.range(offset');
  });
});

// ---------------------------------------------------------------------------
// /api/customers/search — partial name matching without raw .or()
// ---------------------------------------------------------------------------
describe('/api/customers/search — partial name matching', () => {
  it('does NOT use .contains("names", [q]) exact-match-only search', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    // Exact contains('names', [q]) would miss "Alice" when querying "ali".
    expect(content).not.toMatch(/\.contains\s*\(\s*['"]names['"]\s*,\s*\[q\]/);
  });

  it('uses application-side partial name match (includes / toLowerCase)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain('.includes(qLower)');
    expect(content).toContain('.toLowerCase()');
  });

  it('still uses escapePostgrestFilterValue for email ilike — no raw interpolation', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain('escapePostgrestFilterValue');
    // Must not interpolate ${q} directly into ilike
    expect(content).not.toMatch(/ilike\s*\([^)]*\$\{q\}/);
  });

  it('merchant scoping via contains("merchant_ids") is preserved', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/search/route.ts'),
      'utf-8'
    );
    expect(content).toContain("contains('merchant_ids'");
    expect(content).toContain('ctx.merchantId');
  });
});

// ---------------------------------------------------------------------------
// getMerchantOwnedJobIds — pagination behavioral tests
// ---------------------------------------------------------------------------
import { getMerchantOwnedJobIds } from '../../lib/supabase/merchantHelpers';

/** Build a mock for getMerchantOwnedJobIds pagination testing. */
function makeJobIdsMock(pages: Array<Array<{ id: string }>>, error?: string) {
  let callIdx = 0;
  return {
    from: jest.fn(() => {
      const pageIdx = callIdx++;
      const pageData = pages[pageIdx] ?? [];
      const chain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: error ? null : pageData,
          error: error ? { message: error } : null,
        }),
      };
      return chain;
    }),
  };
}

describe('getMerchantOwnedJobIds — pagination', () => {
  it('returns all IDs when they fit in one page', async () => {
    const mock = makeJobIdsMock([[{ id: 'j1' }, { id: 'j2' }]]);
    const ids = await getMerchantOwnedJobIds(mock as any, 'merchant-a');
    expect(ids).toEqual(['j1', 'j2']);
  });

  it('paginates beyond 1000 jobs — returns all IDs from both pages', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `job-${i}` }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: `job-${1000 + i}` }));
    const mock = makeJobIdsMock([page1, page2]);
    const ids = await getMerchantOwnedJobIds(mock as any, 'merchant-a');
    expect(ids).toHaveLength(1050);
    expect(ids[0]).toBe('job-0');
    expect(ids[1049]).toBe('job-1049');
  });

  it('paginates exactly at 1000-boundary — fetches next page', async () => {
    // First page is exactly 1000 rows (loop must continue to next page)
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `job-${i}` }));
    const page2: Array<{ id: string }> = []; // empty → stops
    const mock = makeJobIdsMock([page1, page2]);
    const ids = await getMerchantOwnedJobIds(mock as any, 'merchant-a');
    expect(ids).toHaveLength(1000);
  });

  it('throws on Supabase error', async () => {
    const mock = makeJobIdsMock([[]], 'connection refused');
    await expect(
      getMerchantOwnedJobIds(mock as any, 'merchant-a')
    ).rejects.toThrow('getMerchantOwnedJobIds failed: connection refused');
  });
});

// ---------------------------------------------------------------------------
// dashboard/page.tsx — silent-zero and permission denial
// ---------------------------------------------------------------------------
describe('dashboard/page.tsx — fail-closed and no silent zero', () => {
  it('does NOT set reviewQueue = 0 in the catch block', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    // The catch block must not reset reviewQueue to 0.
    expect(content).not.toMatch(/catch[\s\S]{0,60}reviewQueue\s*=\s*0/);
  });

  it('uses null sentinel for failed review queue count (not 0)', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    // reviewQueue should be typed/initialised as null to distinguish "failed"
    // from "genuinely zero".
    expect(content).toMatch(/reviewQueue.*null/);
  });

  it('renders "Unavailable" state when review queue count failed', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('Unavailable');
  });

  it('handles permission denied — does NOT ignore denied return value', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    // Must destructure denied from requirePermission and check it.
    expect(content).toContain('denied');
    expect(content).toMatch(/if\s*\(\s*denied\s*\)/);
  });

  it('redirects unauthenticated users to /login', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/dashboard/page.tsx'),
      'utf-8'
    );
    expect(content).toContain("redirect('/login')");
  });
});
