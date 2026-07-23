-- Canonical non-schema and privilege supplement.
--
-- This file deliberately contains no customer rows, auth identities, storage
-- objects, vault values, provider credentials, or production-specific DML.
-- It recreates only redaction-safe configuration evidenced by the Task 2E
-- manifest and the content-equivalent repository migrations.

begin;

-- The live product uses four private buckets. Direct browser access is needed
-- only for the CSV upload bucket; evidence and integration objects are handled
-- by authenticated server routes using the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'merchant-csv-uploads-2',
    'merchant-csv-uploads-2',
    false,
    524288000,
    array['text/csv', 'application/csv', 'text/plain']::text[]
  ),
  (
    'evidence-packages',
    'evidence-packages',
    false,
    104857600,
    array['application/pdf']::text[]
  ),
  ('integration-documents', 'integration-documents', false, null, null),
  ('pack-confirmation-photos', 'pack-confirmation-photos', false, null, null)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can view own files" on storage.objects;
drop policy if exists "Authenticated users can delete own files" on storage.objects;

create policy "Authenticated users can upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Authenticated users can view own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Authenticated users can delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'merchant-csv-uploads-2'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- Supabase normally creates this publication as managed bootstrap state. Keep
-- the baseline replayable in a database-only rehearsal as well.
do $publication$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime
      with (publish = 'insert, update, delete, truncate');
  end if;
end
$publication$;

alter publication supabase_realtime
  set (publish = 'insert, update, delete, truncate');

-- The captured publication contains no member tables. Fresh replay starts
-- empty and this migration intentionally does not infer memberships.

-- Recreate the one redaction-safe scheduled maintenance job. No provider or
-- customer-specific command is present.
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
      from cron.job
     where jobname = 'cleanup-rate-limits';

    perform cron.schedule(
      'cleanup-rate-limits',
      '*/5 * * * *',
      'delete from public.ingest_rate_limits where window_start < now() - interval ''5 minutes'''
    );
  end if;
end
$cron$;

-- The captured baseline contains RLS policy semantics but its retained
-- redaction-safe artifact does not contain expanded ACL statements. Derive
-- least-privilege client grants from those policies and grant the server role
-- explicit access. RLS remains authoritative for every authenticated request.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

do $grants$
declare
  v_relation record;
  v_privileges text;
begin
  for v_relation in
    select
      c.oid,
      c.relname,
      string_agg(distinct privilege_row.privilege_name, ', ' order by privilege_row.privilege_name) as privileges
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_policy p on p.polrelid = c.oid
    cross join lateral unnest(
      case p.polcmd
        when 'r' then array['select']::text[]
        when 'a' then array['insert']::text[]
        when 'w' then array['update']::text[]
        when 'd' then array['delete']::text[]
        else array['select', 'insert', 'update', 'delete']::text[]
      end
    ) as privilege_row(privilege_name)
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        0 = any(p.polroles)
        or (select oid from pg_roles where rolname = 'authenticated') = any(p.polroles)
      )
    group by c.oid, c.relname
  loop
    v_privileges := v_relation.privileges;
    execute format(
      'grant %s on table public.%I to authenticated',
      v_privileges,
      v_relation.relname
    );
  end loop;
end
$grants$;

grant select on table public.plans to anon;

commit;
