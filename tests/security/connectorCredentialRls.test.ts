import fs from 'node:fs';
import path from 'node:path';

describe('connector credential RLS', () => {
  const baseline = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260720000000_canonical_production_baseline.sql'),
    'utf8',
  );
  const supplement = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260720100000_canonical_environment_supplement.sql'),
    'utf8',
  );

  it('makes every credential-bearing connection table service-only', () => {
    for (const table of ['integration_credentials', 'store_connections', 'helpdesk_connections']) {
      expect(baseline).toContain(`create policy "${table}_service_only"`);
      expect(baseline).toContain(`alter table public."${table}" enable row level security`);
    }
    expect(supplement).toContain('RLS remains authoritative for every authenticated request');
  });

  it('removes direct authenticated mutation of canonical connection metadata', () => {
    expect(baseline).toContain('create policy "merchant_integrations_member_select"');
    expect(baseline).not.toContain('merchant_integrations_admin_write');
  });

  it('allows merchant-scoped job progress reads but reserves job mutation for workers', () => {
    expect(baseline).toContain('create policy "sync_jobs_member_select"');
    expect(baseline).toContain('using (public.is_merchant_member(merchant_id))');
    expect(baseline).toContain('create policy "sync_jobs_service_write"');
  });

  it('enables RLS on legacy source tables and removes authenticated source mutation', () => {
    for (const table of [
      'source_orders',
      'source_customers',
      'source_fulfillments',
      'source_disputes',
      'source_locations',
      'source_shipments',
      'source_returns',
    ]) {
      expect(baseline).toContain(`alter table public."${table}" enable row level security`);
    }
    expect(baseline).toContain('create policy "source_orders_member_select"');
    expect(baseline).toContain('create policy "source_returns_member_select"');
    expect(baseline).toContain('create policy "source_orders_service_write"');
    expect(baseline).toContain('create policy "source_returns_service_write"');
  });

  it('keeps exception decisions behind permission-checked server routes', () => {
    expect(baseline).toContain('alter table public."case_exceptions" enable row level security');
    expect(baseline).toContain('create policy "case_exceptions_member_select"');
    expect(baseline).toContain('create policy "case_exceptions_service_write"');
  });
});
