import fs from 'node:fs';
import path from 'node:path';

describe('connector credential RLS', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260714206500_sensitive_connection_rls.sql'),
    'utf8',
  );

  it('makes every credential-bearing connection table service-only', () => {
    for (const table of ['integration_credentials', 'store_connections', 'helpdesk_connections']) {
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
      expect(migration).toContain(`${table}_service_only`);
    }
  });

  it('removes direct authenticated mutation of canonical connection metadata', () => {
    expect(migration).toContain('drop policy if exists merchant_integrations_admin_write');
    expect(migration).toContain(
      'revoke insert, update, delete on public.merchant_integrations from anon, authenticated',
    );
  });

  it('allows merchant-scoped job progress reads but reserves job mutation for workers', () => {
    expect(migration).toContain('create policy sync_jobs_member_select');
    expect(migration).toContain('using (is_merchant_member(merchant_id))');
    expect(migration).toContain('create policy sync_jobs_service_write');
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
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("'source_orders',");
    expect(migration).toContain("'source_returns',");
    expect(migration).toContain("'create policy %I on public.%I for select to authenticated using (is_merchant_member(merchant_id))'");
    expect(migration).toContain("'create policy %I on public.%I for all to service_role using (true) with check (true)'");
  });

  it('keeps exception decisions behind permission-checked server routes', () => {
    expect(migration).toContain('alter table public.case_exceptions enable row level security');
    expect(migration).toContain("'case_exceptions'");
  });
});
