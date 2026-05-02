-- Atomic job progress increment to fix the race condition in worker.ts.
-- The previous implementation used a read-modify-write pattern (SELECT then UPDATE)
-- which under 5× batch concurrency caused processed/failed row counts to be lost
-- to lost-update races. This RPC uses a single atomic UPDATE instead.
create or replace function increment_job_progress(
  p_job_id  uuid,
  p_processed_delta int,
  p_failed_delta    int
) returns void
language plpgsql
security definer
as $$
begin
  update processing_jobs
  set
    processed_rows = processed_rows + p_processed_delta,
    failed_rows    = failed_rows    + p_failed_delta,
    updated_at     = now()
  where id = p_job_id;
end;
$$;

-- Atomic lookup daily count upsert to fix the TOCTOU race in /api/lookup.
-- Two concurrent requests previously both read count < 100, both passed, both
-- incremented separately — limit was bypassable. This function performs a single
-- atomic upsert so the returned count is always the authoritative post-increment value.
create or replace function increment_lookup_count(
  p_merchant_id uuid,
  p_date        date
) returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into lookup_daily_counts (merchant_id, lookup_date, count)
  values (p_merchant_id, p_date, 1)
  on conflict (merchant_id, lookup_date)
  do update set count = lookup_daily_counts.count + 1
  returning count into v_count;

  return v_count;
end;
$$;
