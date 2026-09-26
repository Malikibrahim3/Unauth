\set ON_ERROR_STOP on
begin;
do $test$
declare v_role text;
begin
  if exists(select 1 from pg_tables where schemaname='public' and not rowsecurity) then
    raise exception 'A public table has no row-level security';
  end if;
  foreach v_role in array array['anon','authenticated'] loop
    if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
      and (has_table_privilege(v_role,c.oid,'TRUNCATE')
        or has_table_privilege(v_role,c.oid,'TRIGGER')
        or has_table_privilege(v_role,c.oid,'REFERENCES')
        or has_table_privilege(v_role,c.oid,'MAINTAIN'))) then
      raise exception 'Client % retains operations outside RLS', v_role;
    end if;
    if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prosecdef and has_function_privilege(v_role,p.oid,'EXECUTE')
      and not (v_role='authenticated' and p.proname in ('is_merchant_member','merchant_role'))) then
      raise exception 'Client % can execute a privileged RPC', v_role;
    end if;
  end loop;
  if not has_table_privilege('anon','public.plans','SELECT') then
    raise exception 'Public reference plan read was lost';
  end if;
  if exists(select 1 from storage.buckets where public or file_size_limit is null or file_size_limit > 52428800) then
    raise exception 'Private/free-tier storage limits are not enforced';
  end if;
  if (select file_size_limit from storage.buckets where id='merchant-csv-uploads-2') is distinct from 20971520 then
    raise exception 'CSV bucket differs from the 20 MiB application limit';
  end if;
end
$test$;
rollback;
\echo New-main privilege and free-tier storage checks passed.
