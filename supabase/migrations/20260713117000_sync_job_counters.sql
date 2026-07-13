-- Reconcile historical completed provider jobs whose worker persisted status
-- but not the record counter/completion timestamp.
begin;

update public.sync_jobs j
set processed_rows = greatest(j.processed_rows, coalesce(i.imported_record_count, 0)),
    completed_at = coalesce(j.completed_at, j.updated_at)
from public.merchant_integrations i
where j.connection_id = i.id
  and j.merchant_id = i.merchant_id
  and j.status = 'completed'
  and (j.processed_rows = 0 or j.completed_at is null);

commit;
