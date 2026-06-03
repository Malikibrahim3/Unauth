-- Allow processing_jobs.watchlist_sync_status = 'skipped' after retiring ingest sync.

ALTER TABLE public.processing_jobs
  DROP CONSTRAINT IF EXISTS processing_jobs_watchlist_sync_status_check;

ALTER TABLE public.processing_jobs
  ADD CONSTRAINT processing_jobs_watchlist_sync_status_check
  CHECK (watchlist_sync_status IN ('pending', 'synced', 'failed', 'skipped'));
