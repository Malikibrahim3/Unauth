import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

import { TENANT_TABLES, createScopedClient } from '@/lib/supabase/scoped';

function makeBuilder() {
  const builder: any = {
    eq: jest.fn(() => builder),
    contains: jest.fn(() => builder),
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

    scoped.from('processing_jobs').select('id');

    expect(base.from).toHaveBeenCalledWith('processing_jobs');
    expect(builder.eq).toHaveBeenCalledWith('merchant_id', 'merchant-1');
  });

  it('injects merchant_ids containment for customer_profiles', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from('customer_profiles').select('id');

    expect(builder.contains).toHaveBeenCalledWith('merchant_ids', ['merchant-1']);
  });

  it('injects merchant_id into tenant inserts and rejects mismatches', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from('watchlist_entries').insert({ customer_profile_id: 'profile-1' });
    expect(builder.insert).toHaveBeenCalledWith(
      { customer_profile_id: 'profile-1', merchant_id: 'merchant-1' }
    );

    expect(() =>
      scoped.from('watchlist_entries').insert({
        customer_profile_id: 'profile-1',
        merchant_id: 'merchant-2',
      })
    ).toThrow('Tenant scope violation');
  });

  it('passes non-tenant tables through unchanged', () => {
    const builder = makeBuilder();
    const base = { from: jest.fn(() => builder) };
    const scoped = createScopedClient('merchant-1', base as any);

    scoped.from('merchants').select('id');

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

      for (const match of content.matchAll(staticFromCall)) {
        const [, receiver, table] = match;
        if (!tenantTables.has(table)) continue;
        if (/scoped/i.test(receiver)) continue;
        violations.push(`${relPath}: ${receiver}.from('${table}')`);
      }

      for (const match of content.matchAll(dynamicFromCall)) {
        const [, receiver] = match;
        if (/scoped/i.test(receiver)) continue;
        violations.push(`${relPath}: ${receiver}.from(table)`);
      }
    }

    expect(violations).toEqual([]);
  });
});
