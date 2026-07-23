-- Active connector work is unique per owning connection, never provider-wide.

begin;

drop index if exists public.sync_jobs_active_connector_job_unique;

do $$
begin
  if exists (
    select 1
    from public.sync_jobs
    where status in ('pending', 'running')
      and job_kind in ('initial_import', 'incremental_sync')
      and connection_id is not null
    group by merchant_id, connection_id
    having count(*) > 1
  ) then
    raise exception 'sync_jobs contains duplicate active work for one merchant connection';
  end if;
end $$;

create unique index if not exists sync_jobs_active_connector_job_unique
  on public.sync_jobs (merchant_id, connection_id)
  where status in ('pending', 'running')
    and job_kind in ('initial_import', 'incremental_sync')
    and connection_id is not null;

commit;
