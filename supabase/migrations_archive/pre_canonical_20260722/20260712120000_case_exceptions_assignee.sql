-- 20260712120000_case_exceptions_assignee.sql
--
-- Let an operator take ownership of an exception before resolving it, so the
-- queue supports assign → confirm/reject/resolve with minimal input.

begin;

alter table public.case_exceptions
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.case_exceptions
  add column if not exists assigned_at timestamptz;

create index if not exists idx_case_exceptions_assignee
  on public.case_exceptions (merchant_id, assigned_to) where assigned_to is not null;

commit;
