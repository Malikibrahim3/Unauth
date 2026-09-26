-- New-main rebuild: prevent historical/default ACLs from exposing internal
-- records or allowing operations which bypass row-level security.
begin;

revoke all on all tables in schema public from public, anon, authenticated;

-- A grant must correspond to an existing authenticated policy command.
-- In particular SELECT-only business policies must not regain write grants.
do $policy_grants$
declare v_table record;
begin
  for v_table in
    select c.relname, string_agg(distinct x.privilege, ', ') as privileges
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_policy p on p.polrelid = c.oid
    cross join lateral unnest(case p.polcmd
      when 'r' then array['select'] when 'a' then array['insert']
      when 'w' then array['update'] when 'd' then array['delete']
      else array['select','insert','update','delete'] end) as x(privilege)
    where n.nspname = 'public' and c.relrowsecurity
      and (0 = any(p.polroles) or (select oid from pg_roles where rolname = 'authenticated') = any(p.polroles))
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') not like '%service_role%'
      and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') not like '%service_role%'
    group by c.relname
  loop
    execute format('grant %s on table public.%I to authenticated', v_table.privileges, v_table.relname);
  end loop;
end
$policy_grants$;
grant select on public.plans to anon;

do $internal_tables$
declare v_table record;
begin
  for v_table in select tablename from pg_tables where schemaname = 'public' and not rowsecurity
  loop
    execute format('alter table public.%I enable row level security', v_table.tablename);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table.tablename);
    execute format('grant all on table public.%I to service_role', v_table.tablename);
  end loop;
end
$internal_tables$;

-- Restore the explicit RPC boundary from tenant_authorization_hardening;
-- later schema reconstruction/default ACLs must not reopen definer RPCs.
do $functions$
declare v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_function.signature);
    execute format('grant execute on function %s to service_role', v_function.signature);
  end loop;
end
$functions$;
grant execute on function public.is_merchant_member(uuid) to authenticated;
grant execute on function public.merchant_role(uuid) to authenticated;

-- New migrations must explicitly grant browser access, then enforce RLS.
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Existing app CSV validation is 20 MiB; Free Storage supports at most 50 MiB
-- per object. Keep all five buckets private and preserve allowed MIME types.
update storage.buckets set file_size_limit = 20971520
where id = 'merchant-csv-uploads-2';
update storage.buckets set file_size_limit = 52428800
where id in ('evidence-packages', 'integration-documents', 'pack-confirmation-photos')
  and (file_size_limit is null or file_size_limit > 52428800);

commit;
