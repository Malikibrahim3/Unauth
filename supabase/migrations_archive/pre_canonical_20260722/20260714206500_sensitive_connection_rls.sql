-- Credential-bearing connection tables are service-only. Merchant clients use
-- permission-checked API routes that return redacted connection views.

begin;

alter table public.integration_credentials enable row level security;
alter table public.store_connections enable row level security;
alter table public.helpdesk_connections enable row level security;
alter table public.merchant_integrations enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.source_orders enable row level security;
alter table public.source_customers enable row level security;
alter table public.source_fulfillments enable row level security;
alter table public.source_disputes enable row level security;
alter table public.source_locations enable row level security;
alter table public.source_shipments enable row level security;
alter table public.source_returns enable row level security;
alter table public.case_exceptions enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('integration_credentials', 'store_connections', 'helpdesk_connections')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

revoke all on public.integration_credentials from anon, authenticated;
revoke all on public.store_connections from anon, authenticated;
revoke all on public.helpdesk_connections from anon, authenticated;

create policy integration_credentials_service_only
  on public.integration_credentials for all to service_role
  using (true) with check (true);
create policy store_connections_service_only
  on public.store_connections for all to service_role
  using (true) with check (true);
create policy helpdesk_connections_service_only
  on public.helpdesk_connections for all to service_role
  using (true) with check (true);

grant all on public.integration_credentials to service_role;
grant all on public.store_connections to service_role;
grant all on public.helpdesk_connections to service_role;

-- Canonical connection metadata is merchant-readable, but all writes remain
-- behind role-checked server routes so provider-account claims cannot be
-- fabricated or lifecycle status changed through the public data API.
drop policy if exists merchant_integrations_admin_write on public.merchant_integrations;
revoke insert, update, delete on public.merchant_integrations from anon, authenticated;
grant select on public.merchant_integrations to authenticated;
grant all on public.merchant_integrations to service_role;

-- Job state is merchant-readable for progress, but only workers/server routes
-- may claim or mutate it.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'sync_jobs'
  loop
    execute format('drop policy if exists %I on public.sync_jobs', policy_row.policyname);
  end loop;
end $$;
revoke all on public.sync_jobs from anon, authenticated;
create policy sync_jobs_member_select on public.sync_jobs
  for select to authenticated using (is_merchant_member(merchant_id));
create policy sync_jobs_service_write on public.sync_jobs
  for all to service_role using (true) with check (true);
grant select on public.sync_jobs to authenticated;
grant all on public.sync_jobs to service_role;

-- Legacy canonical source tables pre-date the source-agnostic RLS loop. Keep
-- their merchant-readable provenance, but reserve every mutation for the
-- service layer so a browser client cannot forge imported records. Exception
-- decisions likewise remain behind the role-checked server action.
do $$
declare
  target_table text;
  policy_row record;
begin
  foreach target_table in array array[
    'source_orders',
    'source_customers',
    'source_fulfillments',
    'source_disputes',
    'source_locations',
    'source_shipments',
    'source_returns',
    'case_exceptions'
  ] loop
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_row.policyname, target_table);
    end loop;
    execute format('revoke all on public.%I from anon, authenticated', target_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using (is_merchant_member(merchant_id))',
      target_table || '_member_select',
      target_table
    );
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      target_table || '_service_write',
      target_table
    );
    execute format('grant select on public.%I to authenticated', target_table);
    execute format('grant all on public.%I to service_role', target_table);
  end loop;
end $$;

commit;
