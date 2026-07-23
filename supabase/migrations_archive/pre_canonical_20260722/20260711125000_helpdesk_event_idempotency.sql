-- 20260711125000_helpdesk_event_idempotency.sql
--
-- Real helpdesk event idempotency (was metadata.event_idempotency = 'not_implemented').
-- A replayed helpdesk webhook re-appended a duplicate source_ticket_events row.
-- Add a nullable event_idempotency_key + a PARTIAL unique index (only where the
-- key is set). The column is null for every existing row, so no current data can
-- violate the new index; new inserts set it and dedupe via ON CONFLICT DO NOTHING.

begin;

alter table public.source_ticket_events
  add column if not exists event_idempotency_key text;

create unique index if not exists source_ticket_events_idempotency_key
  on public.source_ticket_events (event_idempotency_key)
  where event_idempotency_key is not null;

commit;
