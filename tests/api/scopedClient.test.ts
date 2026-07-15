import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

import { TENANT_TABLES, createScopedClient } from '@/lib/supabase/scoped';
import { TABLES } from '../../lib/supabase/tables';

function makeBuilder() {
  const builder: any = {
    eq: jest.fn(() => builder),
    contains: jest.fn(() => builder),
    or: jest.fn(() => builder),
    select: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
  };
  return builder;
}

describe('createScopedClient', () => {
  it('throws when merchantId is missing', () => {
    expect(() => createScopedClient('', { from: jest.fn() } as any)).toThrow(
      'createScopedClient requires a merchantId'
    );
  });

  it('injects merchant_id filters for direct tenant tables', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from(TABLES.PROCESSING_JOBS).select('id');

    expect(base.from).toHaveBeenCalledWith(TABLES.PROCESSING_JOBS);
    expect(builder.eq).toHaveBeenCalledWith('merchant_id', 'merchant-1');
  });

  it('fails closed for unclassified tables instead of running unscoped', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    // Historically, an unrecognised table name (e.g. the dropped v1
    // `customer_profiles`) fell through to an UNSCOPED service-role query. The
    // proxy must now throw so tenant isolation can never silently no-op.
    expect(() => scoped.from('customer_profiles')).toThrow(/no tenant scope defined/i);
  });

  it('injects merchant_id into tenant inserts and rejects mismatches', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from(TABLES.PROCESSING_JOBS).insert({ customer_profile_id: 'profile-1' });
    expect(builder.insert).toHaveBeenCalledWith(
      { customer_profile_id: 'profile-1', merchant_id: 'merchant-1' }
    );

    expect(() =>
      scoped.from(TABLES.PROCESSING_JOBS).insert({
        customer_profile_id: 'profile-1',
        merchant_id: 'merchant-2',
      })
    ).toThrow('Tenant scope violation');
  });

  it('passes non-tenant tables through unchanged', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from(TABLES.MERCHANTS).select('id');

    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.eq).not.toHaveBeenCalled();
    expect(builder.contains).not.toHaveBeenCalled();
  });
});

describe('static guard: service-role API routes use scoped tenant access', () => {
  const tenantTables = new Set<string>(TENANT_TABLES);
  const routeFiles = globSync('app/api/**/route.ts', { cwd: process.cwd() });
  const exemptRoutes = new Set([
    'app/api/process-csv-chunk/route.ts',
  ]);

  // Routes that access tenant tables with the service-role client but enforce
  // tenant isolation MANUALLY (not via createScopedClient). Each (file → tables)
  // pair below was audited and confirmed to scope every listed access by the
  // caller's merchant — via `.eq('merchant_id', ctx.merchantId)`, an insert/upsert
  // payload carrying merchant_id, or `.in('job_id'|'processing_job_id', <ids from
  // processing_jobs.eq merchant_id>)`. Listing the exact tables (not whole files)
  // keeps the guard live for any NEW, unscoped tenant access added to these files.
  const verifiedManualScoping: Record<string, Set<string>> = {
    'app/api/account/delete/route.ts': new Set(['*']), // audited purge list; direct deletes scope by merchant_id or merchant-derived ids
    'app/api/audit-trail/route.ts': new Set(['merchant_members']), // .eq('merchant_id', ctx.merchantId)
    'app/api/lookup/remaining/route.ts': new Set(['lookup_daily_counts']), // .eq('merchant_id', ctx.merchantId)
    'app/api/search/route.ts': new Set(['source_customers', 'source_orders']), // every query has .eq('merchant_id', merchantId)
    'app/api/settings/bulk-delete/route.ts': new Set(['*']), // dynamic from(table); serviceClient branch uses .eq('merchant_id', ctx.merchantId)
    // v2 tenant tables accessed with the service-role client but manually scoped
    // by merchant_id (audited 2026-07-04):
    'app/api/claim-gate/check/route.ts': new Set(['support_payout_cases']), // .eq('merchant_id', input.merchantId) (merchant from validated API key)
    'app/api/test/e2e-auth/route.ts': new Set(['merchant_users']), // .eq('merchant_id', merchantId); route is local-dev only
    'app/api/claims/[claimId]/route.ts': new Set(['merchant_identity_state', 'source_orders', 'source_tickets']), // .eq('merchant_id', ctx.merchantId)
    'app/api/shopify/status/route.ts': new Set(['source_orders']), // .eq('merchant_id', merchantId)
    'app/api/integrations/[provider]/sync/route.ts': new Set(['source_orders']), // merchant-scoped connector sync
    'app/api/gorgias/support-webhook/route.ts': new Set(['source_orders']), // merchant resolved from authenticated webhook connection
    'app/api/customers/[id]/route.ts': new Set(['source_customers', 'source_orders']), // .eq('merchant_id', ctx.merchantId)
    'app/api/customers/[id]/shopify-orders/route.ts': new Set(['source_orders']), // merchant ownership is checked before query
    'app/api/claims/route.ts': new Set(['source_orders']), // .eq('merchant_id', ctx.merchantId)
    'app/api/claims/[claimId]/support-context/route.ts': new Set(['source_orders']), // .eq('merchant_id', ctx.merchantId)
    'app/api/claims/[claimId]/outcome/route.ts': new Set(['source_tickets']), // claim ownership supplies merchant scope
  };

  it('finds API route files to scan', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it('blocks direct service-role access to tenant tables in route handlers', () => {
    const violations: string[] = [];
    const staticFromCall = /([A-Za-z_$][\w$]*)\s*\.\s*from\(\s*['"]([^'"]+)['"]/g;
    const dynamicFromCall = /([A-Za-z_$][\w$]*)\s*\.\s*from\(\s*table\s*\)/g;

    for (const relPath of routeFiles) {
      if (exemptRoutes.has(relPath)) continue;

      const absPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(absPath, 'utf8');
      const usesServiceRole =
        content.includes('createServiceClient') ||
        content.includes('createAdminClient') ||
        content.includes('SUPABASE_SERVICE_ROLE_KEY') ||
        content.includes('@supabase/supabase-js');

      if (!usesServiceRole) continue;

      const manualScoping = verifiedManualScoping[relPath];

      for (const match of content.matchAll(staticFromCall)) {
        const [, receiver, table] = match;
        if (!tenantTables.has(table)) continue;
        if (/scoped/i.test(receiver)) continue;
        if (manualScoping && (manualScoping.has(table) || manualScoping.has('*'))) continue;
        violations.push(`${relPath}: ${receiver}.from('${table}')`);
      }

      for (const match of content.matchAll(dynamicFromCall)) {
        const [, receiver] = match;
        if (/scoped/i.test(receiver)) continue;
        if (manualScoping && manualScoping.has('*')) continue;
        violations.push(`${relPath}: ${receiver}.from(table)`);
      }
    }

    expect(violations).toEqual([]);
  });
});
