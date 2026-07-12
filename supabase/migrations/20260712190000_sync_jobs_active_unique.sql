-- 20260712190000_sync_jobs_active_unique.sql
--
-- One active connector-sync job per merchant+source. Duplicate OAuth callbacks
-- or concurrent "Sync now" requests previously could insert parallel
-- initial_import/incremental_sync jobs; the application code tolerated 23505
-- but no constraint existed to raise it. CSV/backfill job kinds are unaffected.

begin;

create unique index if not exists sync_jobs_active_connector_job_unique
  on public.sync_jobs (merchant_id, source)
  where status in ('pending', 'running')
    and job_kind in ('initial_import', 'incremental_sync');

commit;
