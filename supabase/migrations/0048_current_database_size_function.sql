create or replace function public.current_database_size_bytes()
returns table(database_bytes bigint)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(sum(pg_database_size(pg_database.datname)), 0)::bigint as database_bytes
  from pg_database;
$$;

revoke all on function public.current_database_size_bytes() from public;
grant execute on function public.current_database_size_bytes() to service_role;
