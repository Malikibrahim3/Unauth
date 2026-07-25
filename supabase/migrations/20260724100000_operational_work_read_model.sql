-- Operational work read model
--
-- Work is a cross-domain cockpit. These display-owned fields keep queue
-- priority, deadlines, and optimistic concurrency explicit on exceptions
-- without changing the canonical case or recovery state machines.

alter table public.case_exceptions
  add column if not exists priority text not null default 'high',
  add column if not exists due_at timestamptz,
  add column if not exists deadline_kind text,
  add column if not exists state_version bigint not null default 1;

alter table public.case_exceptions
  add constraint case_exceptions_priority_check
  check (priority in ('urgent', 'high', 'medium', 'low')) not valid;

alter table public.case_exceptions
  add constraint case_exceptions_deadline_kind_check
  check (deadline_kind is null or deadline_kind in ('source', 'partner', 'merchant', 'internal')) not valid;

create index if not exists case_exceptions_work_queue_idx
  on public.case_exceptions (merchant_id, status, priority, due_at, created_at desc);

create or replace function public.bump_case_exception_state_version()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.state_version := greatest(coalesce(old.state_version, 0) + 1, 1);
  return new;
end;
$function$;

drop trigger if exists trg_case_exceptions_state_version on public.case_exceptions;
create trigger trg_case_exceptions_state_version
before update on public.case_exceptions
for each row execute function public.bump_case_exception_state_version();

-- Queue counts are returned as one small JSON document so the server page can
-- render badges without downloading the merchant's full task history.
create or replace function public.work_view_counts(
  p_merchant_id uuid,
  p_user_id uuid,
  p_now timestamptz default now()
)
returns jsonb
language sql
security definer
set search_path = public
as $function$
  with active_tasks as (
    select *
    from public.work_tasks
    where merchant_id = p_merchant_id
      and status not in ('completed', 'cancelled')
  ),
  open_exceptions as (
    select *
    from public.case_exceptions
    where merchant_id = p_merchant_id
      and status = 'open'
  )
  select jsonb_build_object(
    'open', (select count(*) from active_tasks) + (select count(*) from open_exceptions),
    'mine', (select count(*) from active_tasks where owner_user_id = p_user_id),
    'unassigned', (select count(*) from active_tasks where owner_user_id is null),
    'due_today', (select count(*) from active_tasks where due_at >= date_trunc('day', p_now) and due_at < date_trunc('day', p_now) + interval '1 day')
      + (select count(*) from open_exceptions where due_at >= date_trunc('day', p_now) and due_at < date_trunc('day', p_now) + interval '1 day'),
    'no_sla', (select count(*) from active_tasks where due_at is null) + (select count(*) from open_exceptions where due_at is null),
    'blocked', (select count(*) from active_tasks where status = 'blocked'),
    'evidence_needed', (select count(*) from active_tasks where blocking_reason ilike '%evidence%'),
    'decision_needed', (select count(*) from active_tasks where title ilike '%decision%' or blocking_reason ilike '%decision%'),
    'integration_exceptions', (select count(*) from open_exceptions),
    'completed', (select count(*) from public.work_tasks where merchant_id = p_merchant_id and status = 'completed'),
    'overdue', (select count(*) from active_tasks where due_at < p_now)
      + (select count(*) from open_exceptions where due_at < p_now),
    'upcoming', (select count(*) from active_tasks where due_at >= date_trunc('day', p_now) + interval '1 day')
      + (select count(*) from open_exceptions where due_at >= date_trunc('day', p_now) + interval '1 day'),
    'unscheduled', (select count(*) from active_tasks where due_at is null) + (select count(*) from open_exceptions where due_at is null)
  );
$function$;

revoke all on function public.work_view_counts(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.work_view_counts(uuid, uuid, timestamptz) to service_role;
