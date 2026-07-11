-- 20260711120500_cleanup_domain_event_smoke_row.sql
--
-- Remove the single synthetic row a Phase 1 smoke test inserted into the
-- append-only domain_events table (idempotency_key like 'verify-%'). The
-- immutability trigger blocks normal deletes, so disable it just long enough
-- to remove the test row. On a clean install this deletes nothing (no-op).

begin;

alter table public.domain_events disable trigger trg_domain_events_immutable;

delete from public.domain_events
 where event_type = 'test.created'
   and idempotency_key like 'verify-%';

alter table public.domain_events enable trigger trg_domain_events_immutable;

commit;
