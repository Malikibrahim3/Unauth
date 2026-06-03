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

    expect(base.from).toHaveBeenCalledWith('processing_jobs');
    expect(builder.eq).toHaveBeenCalledWith('merchant_id', 'merchant-1');
  });

  it('injects merchant_ids containment for customer_profiles', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from(TABLES.CUSTOMER_PROFILES).select('id');

    // customer_profiles is a JSONB-array tenant table (merchant_ids). Production
    // applies containment via the PostgREST `.or(col.cs.[...])` JSON form, which
    // is the correct operator for a JSONB column.
    expect(builder.or).toHaveBeenCalledWith(`merchant_ids.cs.${JSON.stringify(['merchant-1'])}`);
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
    'app/api/account/delete/route.ts': new Set(['evidence_packages']), // .eq('merchant_id', merchantId)
    'app/api/audit-trail/route.ts': new Set(['merchant_members']), // .eq('merchant_id', ctx.merchantId)
    'app/api/lookup/quick-score/route.ts': new Set(['access_audit_log']), // insert payload merchant_id
    'app/api/lookup/remaining/route.ts': new Set(['lookup_daily_counts']), // .eq('merchant_id', ctx.merchantId)
    'app/api/lookup/route.ts': new Set(['access_audit_log']), // insert payload merchant_id
    'app/api/search/route.ts': new Set(['customer_profiles', 'transactions', 'evidence_packages']), // .in(... merchantJobIds)
    'app/api/settings/bulk-delete/route.ts': new Set(['*']), // dynamic from(table); serviceClient branch uses .eq('merchant_id', user.id)
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
