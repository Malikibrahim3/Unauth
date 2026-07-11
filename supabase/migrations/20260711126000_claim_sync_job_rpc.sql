-- 20260711126000_claim_sync_job_rpc.sql
--
-- Durable sync-engine job claim. Leases due connector-sync jobs with
-- FOR UPDATE SKIP LOCKED so multiple workers never claim the same job, and
-- reclaims crashed 'running' jobs whose lease (started_at) has expired.
-- Only connector-sync kinds are claimed here; CSV/backfill jobs have their own
-- runners.

begin;

create or replace function public.claim_sync_job(
  p_limit integer default 5,
  p_worker text default 'worker',
  p_lease_seconds integer default 300
) returns setof public.sync_jobs
  language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    select j.id
      from public.sync_jobs j
     where j.job_kind in ('initial_import', 'incremental_sync')
       and (
         (j.status in ('pending', 'failed')
          and (j.next_attempt_at is null or j.next_attempt_at <= now()))
         or (j.status = 'running'
          and j.started_at is not null
          and j.started_at < now() - make_interval(secs => p_lease_seconds))
       )
     order by j.next_attempt_at nulls first
     for update skip locked
     limit greatest(p_limit, 1)
  )
  update public.sync_jobs j
     set status = 'running',
         started_at = now(),
         last_error_code = null,
         updated_at = now()
    from claimed
   where j.id = claimed.id
  returning j.*;
end;
$$;

revoke all on function public.claim_sync_job(integer, text, integer) from public, anon, authenticated;
grant execute on function public.claim_sync_job(integer, text, integer) to service_role;

notify pgrst, 'reload schema';

commit;
