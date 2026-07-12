-- 20260712100000_dlq_ignored_status.sql
--
-- Dead-letter operations: allow a delivery to be explicitly ignored (a terminal
-- state distinct from dead_letter) so operators can retire a permanently-broken
-- delivery without it re-surfacing in the DLQ queue. Retry and replay reuse the
-- existing pending/failed states; only 'ignored' is new.

begin;

alter table public.domain_event_deliveries
  drop constraint if exists domain_event_deliveries_status_check;
alter table public.domain_event_deliveries
  add constraint domain_event_deliveries_status_check
  check (status in ('pending','processing','completed','failed','dead_letter','ignored'));

commit;
