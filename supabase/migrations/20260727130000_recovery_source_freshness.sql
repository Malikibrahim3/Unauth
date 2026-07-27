alter table public.recovery_cases
  add column if not exists last_source_event_at timestamptz;

comment on column public.recovery_cases.last_source_event_at is
  'Timestamp of the newest underlying provider/source event used by this recovery. Independent of internal row updates.';
