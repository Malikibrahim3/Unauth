-- MR3 — canonical Work queue and durable external-action lifecycle.
--
-- This migration keeps Work server-owned: one combined projection pages tasks
-- and exceptions with exact counts, and every task/action transition is
-- optimistic, tenant-scoped, idempotent and audited.

alter table public.work_tasks
  add column if not exists task_kind text not null default 'general',
  add column if not exists waiting_party text,
  add column if not exists snoozed_until timestamptz,
  add column if not exists state_version bigint not null default 1;

alter table public.work_tasks
  drop constraint if exists work_tasks_task_kind_check;
alter table public.work_tasks
  add constraint work_tasks_task_kind_check check (
    task_kind in (
      'general', 'evidence_gap', 'investigation', 'decision',
      'external_handoff', 'external_outcome', 'recovery_deadline',
      'provider_chase', 'source_failure', 'reconciliation_exception'
    )
  );

create index if not exists work_tasks_canonical_queue_idx
  on public.work_tasks (
    merchant_id,
    status,
    snoozed_until,
    due_at,
    priority,
    created_at,
    id
  );

create or replace function public.bump_work_task_state_version()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.state_version := greatest(coalesce(old.state_version, 0) + 1, 1);
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

drop trigger if exists trg_work_tasks_state_version on public.work_tasks;
create trigger trg_work_tasks_state_version
before update on public.work_tasks
for each row execute function public.bump_work_task_state_version();

alter table public.connector_action_runs
  add column if not exists action_state text,
  add column if not exists state_version bigint not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists request_fingerprint text,
  add column if not exists requested_operation text,
  add column if not exists amount_minor bigint,
  add column if not exists currency character(3),
  add column if not exists merchant_reported_at timestamptz,
  add column if not exists merchant_reported_method text,
  add column if not exists external_reference text,
  add column if not exists receipt_evidence jsonb,
  add column if not exists provider_request_id text,
  add column if not exists provider_object_id text,
  add column if not exists provider_status text,
  add column if not exists provider_error text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists observed_source text,
  add column if not exists observed_at timestamptz,
  add column if not exists reconciled_at timestamptz;

update public.connector_action_runs
set action_state = case status
  when 'previewed' then 'draft'
  when 'manual_required' then 'handoff_ready'
  when 'completed' then 'succeeded'
  when 'failed' then 'failed'
  else 'draft'
end
where action_state is null;

alter table public.connector_action_runs
  alter column action_state set default 'draft',
  alter column action_state set not null;

alter table public.connector_action_runs
  drop constraint if exists connector_action_runs_action_state_check;
alter table public.connector_action_runs
  add constraint connector_action_runs_action_state_check check (
    action_state in (
      'draft', 'awaiting_confirmation', 'authorised', 'handoff_ready',
      'merchant_reported_attempt', 'source_observed_attempt',
      'provider_accepted', 'provider_processing', 'succeeded', 'failed',
      'indeterminate', 'reconciled'
    )
  );

alter table public.connector_action_runs
  drop constraint if exists connector_action_runs_retry_count_check;
alter table public.connector_action_runs
  add constraint connector_action_runs_retry_count_check check (retry_count >= 0);

create index if not exists connector_action_runs_state_queue_idx
  on public.connector_action_runs (
    merchant_id,
    action_state,
    support_payout_case_id,
    updated_at desc,
    id
  );

create or replace function public.bump_connector_action_state_version()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.state_version := greatest(coalesce(old.state_version, 0) + 1, 1);
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

drop trigger if exists trg_connector_action_state_version on public.connector_action_runs;
create trigger trg_connector_action_state_version
before update on public.connector_action_runs
for each row execute function public.bump_connector_action_state_version();

-- Every new fact is eligible for the deterministic Work projection. The
-- handler no-ops on facts that do not own an operational next step.
create or replace function public.record_domain_event(
  p_merchant_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_idempotency_key text,
  p_payload jsonb default '{}'::jsonb,
  p_source_record_id uuid default null,
  p_connection_id uuid default null,
  p_ingestion_event_id uuid default null,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_correlation_id uuid default null,
  p_causation_id uuid default null,
  p_handlers text[] default '{}'::text[]
)
returns public.domain_events
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row public.domain_events;
  v_handler text;
  v_handlers text[] := array_append(coalesce(p_handlers, '{}'::text[]), 'workProjection');
begin
  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, idempotency_key,
    payload, source_record_id, connection_id, ingestion_event_id,
    actor_type, actor_id, occurred_at, correlation_id, causation_id
  ) values (
    p_merchant_id, p_event_type, p_aggregate_type, p_aggregate_id, p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb), p_source_record_id, p_connection_id, p_ingestion_event_id,
    p_actor_type, p_actor_id, coalesce(p_occurred_at, now()), p_correlation_id, p_causation_id
  )
  on conflict (merchant_id, idempotency_key) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
    from public.domain_events
    where merchant_id = p_merchant_id
      and idempotency_key = p_idempotency_key;
    return v_row;
  end if;

  foreach v_handler in array v_handlers loop
    insert into public.domain_event_deliveries (
      domain_event_id, merchant_id, handler_name
    ) values (
      v_row.id, p_merchant_id, v_handler
    )
    on conflict (domain_event_id, handler_name) do nothing;
  end loop;

  return v_row;
end;
$function$;

create or replace function public.work_queue_page_v1(
  p_merchant_id uuid,
  p_user_id uuid,
  p_view text default 'open',
  p_search text default null,
  p_priority text default null,
  p_state text default null,
  p_assignee text default null,
  p_sort text default 'deadline',
  p_page integer default 1,
  p_page_size integer default 25,
  p_now timestamptz default now()
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
with queue as (
  select
    'task'::text as kind,
    task.id,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.owner_user_id,
    task.owner_role,
    task.due_at,
    task.snoozed_until,
    task.created_at,
    task.updated_at,
    task.source,
    task.support_payout_case_id,
    task.loss_case_id,
    task.recovery_case_id,
    task.blocking_reason,
    task.source_metadata,
    task.task_kind,
    task.waiting_party,
    task.state_version,
    null::text as exception_type,
    null::jsonb as exception_context,
    null::text as deadline_kind,
    (task.snoozed_until is not null and task.snoozed_until > p_now) as is_snoozed
  from public.work_tasks task
  where task.merchant_id = p_merchant_id

  union all

  select
    'exception'::text as kind,
    exception.id,
    exception.title,
    exception.detail as description,
    exception.status,
    coalesce(exception.priority, 'high') as priority,
    exception.assigned_to as owner_user_id,
    case when exception.assigned_to is null then null else 'assigned' end as owner_role,
    exception.due_at,
    null::timestamptz as snoozed_until,
    exception.created_at,
    exception.updated_at,
    coalesce(exception.source_system, 'reconciliation') as source,
    exception.support_payout_case_id,
    null::uuid as loss_case_id,
    null::uuid as recovery_case_id,
    exception.exception_type as blocking_reason,
    coalesce(exception.context, '{}'::jsonb) as source_metadata,
    'reconciliation_exception'::text as task_kind,
    'merchant'::text as waiting_party,
    coalesce(exception.state_version, 1) as state_version,
    exception.exception_type,
    coalesce(exception.context, '{}'::jsonb) as exception_context,
    exception.deadline_kind,
    false as is_snoozed
  from public.case_exceptions exception
  where exception.merchant_id = p_merchant_id
), active as (
  select *
  from queue
  where status not in ('completed', 'cancelled', 'resolved', 'dismissed')
), actionable as (
  select * from active where is_snoozed = false
), scoped as (
  select *
  from queue item
  where
    case p_view
      when 'open' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed
      when 'mine' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.owner_user_id = p_user_id
      when 'unassigned' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.owner_user_id is null
      when 'snoozed' then item.kind = 'task' and item.is_snoozed
      when 'completed' then item.status in ('completed', 'resolved', 'dismissed')
      when 'blocked' then item.status = 'blocked' and not item.is_snoozed
      when 'evidence-needed' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and (item.task_kind = 'evidence_gap' or item.blocking_reason ilike '%evidence%')
      when 'decision-needed' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and (item.task_kind = 'decision' or item.title ilike '%decision%' or item.blocking_reason ilike '%decision%')
      when 'integration-exceptions' then item.kind = 'exception' and item.status = 'open'
      when 'overdue' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.due_at < p_now
      when 'due-today' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.due_at >= p_now and item.due_at < date_trunc('day', p_now) + interval '1 day'
      when 'no-sla' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.due_at is null
      when 'age-0-1' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.created_at >= p_now - interval '1 day'
      when 'age-1-3' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.created_at >= p_now - interval '4 days' and item.created_at < p_now - interval '1 day'
      when 'age-4-7' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.created_at >= p_now - interval '8 days' and item.created_at < p_now - interval '4 days'
      when 'age-8-plus' then item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed and item.created_at < p_now - interval '8 days'
      else item.status not in ('completed', 'cancelled', 'resolved', 'dismissed') and not item.is_snoozed
    end
    and (p_search is null or btrim(p_search) = '' or concat_ws(' ', item.title, item.description, item.source, item.blocking_reason, item.task_kind, item.waiting_party, item.id::text) ilike '%' || btrim(p_search) || '%')
    and (p_priority is null or item.priority = p_priority)
    and (p_state is null or item.status = p_state)
    and (
      p_assignee is null
      or (p_assignee = 'mine' and item.owner_user_id = p_user_id)
      or (p_assignee = 'unassigned' and item.owner_user_id is null)
      or (p_assignee ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and item.owner_user_id = p_assignee::uuid)
    )
), ranked as (
  select
    scoped.*,
    count(*) over () as exact_total,
    row_number() over (
      order by
        case when p_sort = 'priority' then case scoped.priority when 'urgent' then 4 when 'high' then 3 when 'medium' then 2 else 1 end end desc nulls last,
        case when p_sort = 'oldest' then scoped.created_at end asc nulls last,
        case when p_sort = 'newest' then scoped.created_at end desc nulls last,
        case when p_sort = 'deadline' then scoped.due_at end asc nulls last,
        case when p_sort = 'deadline' then scoped.created_at end asc nulls last,
        scoped.kind asc,
        scoped.id asc
    ) as row_number
  from scoped
), page_rows as (
  select *
  from ranked
  where row_number > (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100)
    and row_number <= greatest(p_page, 1) * least(greatest(p_page_size, 1), 100)
  order by row_number
), counts as (
  select jsonb_build_object(
    'open', (select count(*) from actionable),
    'mine', (select count(*) from actionable where owner_user_id = p_user_id),
    'unassigned', (select count(*) from actionable where owner_user_id is null),
    'snoozed', (select count(*) from active where is_snoozed),
    'due-today', (select count(*) from actionable where due_at >= p_now and due_at < date_trunc('day', p_now) + interval '1 day'),
    'overdue', (select count(*) from actionable where due_at < p_now),
    'no-sla', (select count(*) from actionable where due_at is null),
    'blocked', (select count(*) from actionable where status = 'blocked'),
    'evidence-needed', (select count(*) from actionable where task_kind = 'evidence_gap' or blocking_reason ilike '%evidence%'),
    'decision-needed', (select count(*) from actionable where task_kind = 'decision' or title ilike '%decision%' or blocking_reason ilike '%decision%'),
    'integration-exceptions', (select count(*) from actionable where kind = 'exception'),
    'completed', (select count(*) from queue where status in ('completed', 'resolved', 'dismissed'))
  ) as value
)
select jsonb_build_object(
  'items', coalesce((
    select jsonb_agg(to_jsonb(page_rows) - 'row_number' - 'exact_total' order by row_number)
    from page_rows
  ), '[]'::jsonb),
  'total', coalesce((select max(exact_total) from ranked), 0),
  'page', greatest(p_page, 1),
  'page_size', least(greatest(p_page_size, 1), 100),
  'view_counts', (select value from counts)
);
$function$;

create or replace function public.transition_work_task_v1(
  p_merchant_id uuid,
  p_task_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_expected_version bigint,
  p_idempotency_key text,
  p_until timestamptz default null,
  p_outcome text default null,
  p_allow_release_other boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_task public.work_tasks;
  v_updated public.work_tasks;
  v_existing public.domain_events;
  v_now timestamptz := clock_timestamp();
begin
  if p_action not in ('assign_to_me', 'release', 'start', 'snooze', 'complete', 'reopen') then
    raise exception 'unsupported_work_task_action' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 8 then
    raise exception 'work_task_idempotency_key_required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.domain_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.aggregate_id is distinct from p_task_id
       or v_existing.event_type is distinct from 'work_task.' || p_action then
      raise exception 'work_task_idempotency_conflict' using errcode = '23505';
    end if;
    select * into v_task from public.work_tasks
    where merchant_id = p_merchant_id and id = p_task_id;
    return jsonb_build_object('task', to_jsonb(v_task), 'replayed', true);
  end if;

  select * into v_task
  from public.work_tasks
  where merchant_id = p_merchant_id and id = p_task_id
  for update;
  if not found then
    raise exception 'work_task_not_found' using errcode = 'P0002';
  end if;
  if v_task.state_version is distinct from p_expected_version then
    raise exception 'work_task_version_conflict' using errcode = '40001';
  end if;

  if p_action = 'assign_to_me' and v_task.status in ('completed', 'cancelled') then
    raise exception 'work_task_closed';
  elsif p_action = 'assign_to_me' and v_task.owner_user_id is not null and v_task.owner_user_id <> p_actor_user_id then
    raise exception 'work_task_owned_by_another_operator';
  elsif p_action = 'release' and v_task.owner_user_id is null then
    raise exception 'work_task_not_assigned';
  elsif p_action = 'release' and v_task.owner_user_id <> p_actor_user_id and not p_allow_release_other then
    raise exception 'work_task_release_forbidden';
  elsif p_action = 'start' and v_task.status not in ('open', 'blocked') then
    raise exception 'work_task_not_startable';
  elsif p_action = 'start' and v_task.owner_user_id is not null and v_task.owner_user_id <> p_actor_user_id and not p_allow_release_other then
    raise exception 'work_task_start_forbidden';
  elsif p_action = 'snooze' and v_task.status not in ('open', 'in_progress', 'blocked') then
    raise exception 'work_task_not_snoozable';
  elsif p_action = 'snooze' and (p_until is null or p_until <= v_now) then
    raise exception 'work_task_snooze_time_must_be_future' using errcode = '22023';
  elsif p_action = 'complete' and v_task.status <> 'in_progress' then
    raise exception 'work_task_must_be_in_progress_to_complete';
  elsif p_action = 'complete' and v_task.owner_user_id is distinct from p_actor_user_id and not p_allow_release_other then
    raise exception 'work_task_complete_forbidden';
  elsif p_action = 'reopen' and v_task.status <> 'completed' then
    raise exception 'work_task_not_reopenable';
  end if;

  update public.work_tasks
  set
    owner_user_id = case
      when p_action in ('assign_to_me', 'start', 'snooze') then coalesce(owner_user_id, p_actor_user_id)
      when p_action = 'release' then null
      else owner_user_id
    end,
    status = case
      when p_action = 'start' then 'in_progress'
      when p_action = 'complete' then 'completed'
      when p_action = 'reopen' then 'open'
      else status
    end,
    blocking_reason = case when p_action = 'start' then null else blocking_reason end,
    snoozed_until = case when p_action = 'snooze' then p_until else null end,
    completed_at = case when p_action = 'complete' then v_now when p_action = 'reopen' then null else completed_at end,
    completed_by = case when p_action = 'complete' then p_actor_user_id when p_action = 'reopen' then null else completed_by end,
    completion_outcome = case
      when p_action = 'complete' then jsonb_build_object('note', nullif(btrim(p_outcome), ''))
      when p_action = 'reopen' then null
      else completion_outcome
    end
  where merchant_id = p_merchant_id and id = p_task_id
  returning * into v_updated;

  perform public.record_domain_event(
    p_merchant_id,
    'work_task.' || p_action,
    'work_task',
    p_task_id,
    p_idempotency_key,
    jsonb_build_object(
      'task_id', p_task_id,
      'from_status', v_task.status,
      'to_status', v_updated.status,
      'from_owner_user_id', v_task.owner_user_id,
      'to_owner_user_id', v_updated.owner_user_id,
      'state_version', v_updated.state_version,
      'support_payout_case_id', v_updated.support_payout_case_id,
      'recovery_case_id', v_updated.recovery_case_id,
      'loss_case_id', v_updated.loss_case_id
    ),
    null, null, null, 'user', p_actor_user_id, v_now,
    null, null, array['auditTimelineProjection']
  );

  return jsonb_build_object('task', to_jsonb(v_updated), 'replayed', false);
end;
$function$;

create or replace function public.transition_external_action_v1(
  p_merchant_id uuid,
  p_action_id uuid,
  p_actor_user_id uuid,
  p_authority text,
  p_target_state text,
  p_expected_version bigint,
  p_idempotency_key text,
  p_external_reference text default null,
  p_method text default null,
  p_receipt_evidence jsonb default null,
  p_provider_request_id text default null,
  p_provider_object_id text default null,
  p_provider_status text default null,
  p_provider_error text default null,
  p_observed_source text default null,
  p_observed_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_action public.connector_action_runs;
  v_updated public.connector_action_runs;
  v_existing public.domain_events;
  v_now timestamptz := clock_timestamp();
  v_allowed boolean := false;
begin
  if p_authority not in ('merchant', 'source', 'system') then
    raise exception 'external_action_authority_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 8 then
    raise exception 'external_action_idempotency_key_required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.domain_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.aggregate_id is distinct from p_action_id
       or v_existing.event_type is distinct from 'external_action.' || p_target_state then
      raise exception 'external_action_idempotency_conflict' using errcode = '23505';
    end if;
    select * into v_action from public.connector_action_runs
    where merchant_id = p_merchant_id and id = p_action_id;
    return jsonb_build_object('action', to_jsonb(v_action), 'replayed', true);
  end if;

  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id and id = p_action_id
  for update;
  if not found then
    raise exception 'external_action_not_found' using errcode = 'P0002';
  end if;
  if v_action.state_version is distinct from p_expected_version then
    raise exception 'external_action_version_conflict' using errcode = '40001';
  end if;

  v_allowed := case v_action.action_state
    when 'draft' then p_target_state in ('awaiting_confirmation', 'authorised', 'handoff_ready')
    when 'awaiting_confirmation' then p_target_state in ('authorised', 'failed', 'indeterminate')
    when 'authorised' then p_target_state in ('handoff_ready', 'failed', 'indeterminate')
    when 'handoff_ready' then p_target_state in ('merchant_reported_attempt', 'source_observed_attempt', 'failed', 'indeterminate')
    when 'merchant_reported_attempt' then p_target_state in ('source_observed_attempt', 'provider_accepted', 'failed', 'indeterminate')
    when 'source_observed_attempt' then p_target_state in ('provider_accepted', 'provider_processing', 'succeeded', 'failed', 'indeterminate')
    when 'provider_accepted' then p_target_state in ('provider_processing', 'succeeded', 'failed', 'indeterminate')
    when 'provider_processing' then p_target_state in ('succeeded', 'failed', 'indeterminate')
    when 'succeeded' then p_target_state = 'reconciled'
    when 'failed' then p_target_state in ('handoff_ready', 'source_observed_attempt', 'indeterminate')
    when 'indeterminate' then p_target_state in ('handoff_ready', 'source_observed_attempt', 'provider_accepted', 'provider_processing', 'succeeded', 'failed')
    else false
  end;
  if not v_allowed then
    raise exception 'external_action_transition_rejected:%->%', v_action.action_state, p_target_state;
  end if;
  if p_authority = 'merchant' and p_target_state <> 'merchant_reported_attempt' then
    raise exception 'external_action_merchant_authority_rejected';
  end if;
  if p_authority = 'source' and p_target_state not in ('source_observed_attempt', 'provider_accepted', 'provider_processing', 'succeeded', 'failed', 'indeterminate') then
    raise exception 'external_action_source_authority_rejected';
  end if;
  if p_authority = 'system' and p_target_state <> 'reconciled' then
    raise exception 'external_action_system_authority_rejected';
  end if;
  if p_target_state = 'merchant_reported_attempt' and nullif(btrim(p_method), '') is null then
    raise exception 'external_action_method_required' using errcode = '22023';
  end if;

  update public.connector_action_runs
  set
    action_state = p_target_state,
    status = case when p_target_state in ('succeeded', 'reconciled') then 'completed' when p_target_state = 'failed' then 'failed' else 'manual_required' end,
    merchant_reported_at = case when p_target_state = 'merchant_reported_attempt' then v_now else merchant_reported_at end,
    merchant_reported_method = coalesce(nullif(btrim(p_method), ''), merchant_reported_method),
    external_reference = coalesce(nullif(btrim(p_external_reference), ''), external_reference),
    receipt_evidence = coalesce(p_receipt_evidence, receipt_evidence),
    provider_request_id = coalesce(nullif(btrim(p_provider_request_id), ''), provider_request_id),
    provider_object_id = coalesce(nullif(btrim(p_provider_object_id), ''), provider_object_id),
    provider_status = coalesce(nullif(btrim(p_provider_status), ''), provider_status),
    provider_error = case when p_target_state in ('failed', 'indeterminate') then nullif(btrim(p_provider_error), '') else null end,
    retry_count = case when v_action.action_state in ('failed', 'indeterminate') and p_target_state in ('handoff_ready', 'source_observed_attempt') then retry_count + 1 else retry_count end,
    observed_source = case when p_authority = 'source' then nullif(btrim(p_observed_source), '') else observed_source end,
    observed_at = case when p_authority = 'source' then coalesce(p_observed_at, v_now) else observed_at end,
    reconciled_at = case when p_target_state = 'reconciled' then v_now else reconciled_at end,
    completed_at = case when p_target_state in ('succeeded', 'reconciled', 'failed') then v_now else null end,
    result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
      'action_state', p_target_state,
      'authority', p_authority,
      'provider_status', p_provider_status,
      'provider_response', case when p_authority = 'source' then jsonb_build_object('observed_source', p_observed_source, 'observed_at', coalesce(p_observed_at, v_now)) else result -> 'provider_response' end
    )
  where merchant_id = p_merchant_id and id = p_action_id
  returning * into v_updated;

  perform public.record_domain_event(
    p_merchant_id,
    'external_action.' || p_target_state,
    'external_action',
    p_action_id,
    p_idempotency_key,
    jsonb_build_object(
      'action_id', p_action_id,
      'case_id', v_updated.support_payout_case_id,
      'capability_id', v_updated.capability_id,
      'from_state', v_action.action_state,
      'to_state', v_updated.action_state,
      'authority', p_authority,
      'state_version', v_updated.state_version,
      'external_reference', v_updated.external_reference,
      'provider_status', v_updated.provider_status
    ),
    null, v_updated.connection_id, null,
    case when p_authority = 'merchant' then 'user' else p_authority end,
    case when p_authority = 'merchant' then p_actor_user_id else null end,
    coalesce(p_observed_at, v_now), null, null,
    array['auditTimelineProjection']
  );

  return jsonb_build_object('action', to_jsonb(v_updated), 'replayed', false);
end;
$function$;

revoke all on function public.work_queue_page_v1(uuid, uuid, text, text, text, text, text, text, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.work_queue_page_v1(uuid, uuid, text, text, text, text, text, text, integer, integer, timestamptz) to service_role;

revoke all on function public.transition_work_task_v1(uuid, uuid, uuid, text, bigint, text, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public.transition_work_task_v1(uuid, uuid, uuid, text, bigint, text, timestamptz, text, boolean) to service_role;

revoke all on function public.transition_external_action_v1(uuid, uuid, uuid, text, text, bigint, text, text, text, jsonb, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.transition_external_action_v1(uuid, uuid, uuid, text, text, bigint, text, text, text, jsonb, text, text, text, text, text, timestamptz) to service_role;

-- The legacy bulk function can complete open work without per-row optimistic
-- versions or request idempotency. MR3 exposes only the canonical item
-- lifecycle, so the unsafe compatibility function is retained for replay
-- history but is no longer executable by application roles.
revoke all on function public.bulk_transition_work_tasks(uuid, uuid, uuid[], text, timestamptz)
  from public, anon, authenticated, service_role;
