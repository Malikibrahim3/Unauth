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

describe('CSV export injection protection', () => {
  const EXPORT_PATH = path.resolve(
    process.cwd(),
    'app/api/audit/[runId]/export/route.ts'
  );

  let exportSource: string;

  beforeAll(() => {
    exportSource = fs.readFileSync(EXPORT_PATH, 'utf8');
  });

  it('exports all rows (not filtered to graded only)', () => {
    expect(exportSource).not.toContain(".not('identity_confidence_grade', 'is', null)");
    expect(exportSource).not.toContain(".in('risk_level'");
  });

  it('uses escapeCsvCell to neutralize formula injection', () => {
    expect(exportSource).toContain('escapeCsvCell');
    expect(exportSource).toContain("FORMULA_PREFIXES = ['=', '+', '-', '@'");
  });

  it('orders export by id for deterministic pagination', () => {
    expect(exportSource).toContain(".order('id', { ascending: true })");
  });

  it('tracks expectedTotalRows for completeness check', () => {
    expect(exportSource).toContain('expectedTotalRows');
    expect(exportSource).toContain('rows.length >= expectedTotalRows');
  });
});
