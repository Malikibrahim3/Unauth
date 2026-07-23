-- Controlled recovery-board actions are append-only. A client retry must resolve
-- to the original event rather than applying a financial/status transition twice.
alter table public.recovery_case_events
  add column if not exists idempotency_key text;

create unique index if not exists recovery_case_events_idempotency_key
  on public.recovery_case_events (merchant_id, idempotency_key)
  where idempotency_key is not null;
