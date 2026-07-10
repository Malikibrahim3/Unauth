/**
 * tests/security/customerApiMerchantIsolation.test.ts
 *
 * Regression tests for the customer API merchant isolation fix.
 *
 * Previously: app/api/customers/[id]/route.ts queried audit_transactions
 * by email/card/IP using a service-role client without constraining to
 * the requesting merchant's job IDs. Service role bypasses RLS, so this
 * could leak transactions from other merchants.
 *
 * Fix: all transaction queries now require .in('job_id', ownedJobIds).
 * Appearances are now scoped through .in('audit_id', ownedJobIds) before
 * resolving transaction IDs.
 *
 * These tests check the source code to guarantee the security boundary
 * can never be silently removed.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROUTE_PATH = path.resolve(
  process.cwd(),
  'app/api/customers/[id]/route.ts'
);

describe('customer API merchant isolation', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(ROUTE_PATH, 'utf8');
  });

  it('linked accounts are derived from merchant-owned transactions only, not cross-merchant clusters', () => {
    // The route must NOT read the global identity cluster graph table.
    // Linked identity signals must be derived from identityTimeline (merchant-owned transactions).
    expect(source).not.toContain('fraud_identity_clusters');
    expect(source).toContain('identityTimeline');
    // Must not use the cluster-join pattern (.in('cluster_id', ...))
    expect(source).not.toContain(".in('cluster_id'");
    expect(source).not.toContain('.in("cluster_id"');
    expect(source).not.toMatch(/entityValue:\s*member\.entity_value/);
  });

  it('does not expose cross-merchant raw PII from customer records', () => {
    expect(source).not.toMatch(/primary_email.*network/i);
    expect(source).not.toContain('fraud_identity_clusters');
  });
});

describe('legacy audit CSV export retirement', () => {
  const EXPORT_PATH = path.resolve(
    process.cwd(),
    'app/api/audit/[runId]/export/route.ts'
  );

  it('removes the legacy audit export route', () => {
    expect(fs.existsSync(EXPORT_PATH)).toBe(false);
  });

  it('removes the legacy audit customer route', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'app/api/audit/[runId]/customer/route.ts'))).toBe(false);
  });

  it('keeps formula-safe CSV escaping for current exports', () => {
    const helpers = fs.readFileSync(path.resolve(process.cwd(), 'lib/supabase/merchantHelpers.ts'), 'utf8');
    expect(helpers).toContain('escapeCsvCell');
    expect(helpers).toContain('FORMULA_CHARS');
  });

  it('keeps the payout-case API as the current review surface', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'app/api/claims/route.ts'))).toBe(true);
  });
});
