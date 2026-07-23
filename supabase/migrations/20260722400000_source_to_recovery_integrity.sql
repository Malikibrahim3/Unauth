-- Source-to-recovery integrity hardening.
--
-- This forward migration separates merchant authorization from observed source
-- outcomes, makes case/recovery mutations atomic with their outbox/audit rows,
-- preserves unknown financial states, and gives every financial side effect a
-- stable idempotency key. All privileged entry points are service-role only.

alter table public.case_financial_entries
  add column if not exists idempotency_key text;

create unique index if not exists case_financial_entries_merchant_idempotency_unique
  on public.case_financial_entries (merchant_id, idempotency_key)
  where idempotency_key is not null;

alter table public.case_financial_summaries
  add column if not exists known_states text[] not null default '{}';

update public.case_financial_summaries s
set known_states = coalesce((
  select array_agg(distinct e.state order by e.state)
  from public.case_financial_entries e
  where e.merchant_id = s.merchant_id
    and e.support_payout_case_id = s.support_payout_case_id
    and e.currency = s.currency
), '{}');

alter table public.recovery_cases
  add column if not exists amount_sought_minor bigint,
  add column if not exists amount_approved_minor bigint not null default 0,
  add column if not exists amount_recovered_minor bigint not null default 0,
  add column if not exists amount_written_off_minor bigint not null default 0;

update public.recovery_cases
set
  amount_sought_minor = greatest(
    0,
    round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint,
    round(coalesce(amount_recovered, 0) * 100)::bigint
  ),
  amount_approved_minor = case
    when status in ('approved', 'partially_approved', 'paid') then greatest(
      round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint,
      round(coalesce(amount_recovered, 0) * 100)::bigint
    )
    else 0
  end,
  amount_recovered_minor = round(coalesce(amount_recovered, 0) * 100)::bigint,
  amount_written_off_minor = case
    when status = 'closed_unrecoverable' then greatest(
      round(coalesce(estimated_recoverable_max, eligible_loss_amount, merchant_loss_amount, 0) * 100)::bigint
        - round(coalesce(amount_recovered, 0) * 100)::bigint,
      0
    )
    else 0
  end;

alter table public.recovery_cases
  alter column amount_sought_minor set not null,
  add constraint recovery_cases_minor_amounts_nonnegative check (
    amount_sought_minor >= 0
    and amount_approved_minor >= 0
    and amount_recovered_minor >= 0
    and amount_written_off_minor >= 0
  ),
  add constraint recovery_cases_minor_amounts_bounded check (
    amount_approved_minor <= amount_sought_minor
    and amount_recovered_minor <= amount_sought_minor
    and amount_recovered_minor + amount_written_off_minor <= amount_sought_minor
  );

create unique index if not exists recovery_case_events_merchant_idempotency_unique
  on public.recovery_case_events (merchant_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.case_prevention_observations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  decision_id uuid not null references public.case_decisions(id) on delete cascade,
  currency character(3) not null,
  exposure_minor bigint not null check (exposure_minor >= 0),
  decision_at timestamptz not null,
  eligible_at timestamptz not null,
  observation_window_days integer not null default 30 check (observation_window_days >= 30),
  window_basis text not null default 'default_30_calendar_days',
  policy_version text not null default 'mvp-plus-v1',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  domain_event_id uuid references public.domain_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, decision_id)
);

create index if not exists case_prevention_observations_due_idx
  on public.case_prevention_observations (eligible_at, id)
  where status = 'pending';

alter table public.case_prevention_observations enable row level security;

create policy case_prevention_observations_member_select
  on public.case_prevention_observations
  for select
  to authenticated
  using (public.is_merchant_member(merchant_id));

grant select on public.case_prevention_observations to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.case_prevention_observations from public, anon, authenticated;

-- `stale` was historically used as a terminal case lifecycle state. Freshness
-- is source evidence, not business truth, so keep the enum only for backward
-- compatibility and move existing rows back into review without erasing their
-- prior timeline/audit history.
update public.support_payout_cases
set
  status = 'manual_review',
  next_action = coalesce(next_action, 'Review aged case'),
  next_action_reason = coalesce(next_action_reason, 'Legacy stale status was converted to an attention state.'),
  updated_at = now()
where status = 'stale';

create or replace function public.recompute_case_financial_summary(
  p_merchant_id uuid,
  p_case_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_rows integer := 0;
begin
  insert into public.case_financial_summaries (
    merchant_id,
    support_payout_case_id,
    currency,
    requested_minor,
    exposed_minor,
    approved_minor,
    paid_minor,
    estimated_loss_minor,
    confirmed_loss_minor,
    recoverable_minor,
    recovered_minor,
    prevented_minor,
    written_off_minor,
    known_states,
    last_event_id,
    updated_at
  )
  select
    e.merchant_id,
    e.support_payout_case_id,
    e.currency,
    coalesce(sum(case when e.state = 'requested' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'exposed' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'approved' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'paid' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'estimated_loss' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'confirmed_loss' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'recoverable' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'recovered' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'prevented' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    coalesce(sum(case when e.state = 'written_off' then case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end end), 0),
    array_agg(distinct e.state order by e.state),
    (array_agg(e.id order by e.effective_at desc, e.recorded_at desc, e.id desc))[1],
    now()
  from public.case_financial_entries e
  where e.merchant_id = p_merchant_id
    and e.support_payout_case_id = p_case_id
  group by e.merchant_id, e.support_payout_case_id, e.currency
  on conflict (merchant_id, support_payout_case_id, currency) do update
  set
    requested_minor = excluded.requested_minor,
    exposed_minor = excluded.exposed_minor,
    approved_minor = excluded.approved_minor,
    paid_minor = excluded.paid_minor,
    estimated_loss_minor = excluded.estimated_loss_minor,
    confirmed_loss_minor = excluded.confirmed_loss_minor,
    recoverable_minor = excluded.recoverable_minor,
    recovered_minor = excluded.recovered_minor,
    prevented_minor = excluded.prevented_minor,
    written_off_minor = excluded.written_off_minor,
    known_states = excluded.known_states,
    last_event_id = excluded.last_event_id,
    updated_at = excluded.updated_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$function$;

create or replace function public.flag_aged_payout_case(
  p_merchant_id uuid,
  p_case_id uuid,
  p_cutoff timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_case public.support_payout_cases;
  v_event public.domain_events;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'aged_case_idempotency_key_required' using errcode = '22023';
  end if;

  select * into v_event
  from public.domain_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('flagged', true, 'domain_event_id', v_event.id, 'replayed', true);
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found or v_case.status <> 'pending' or v_case.updated_at >= p_cutoff then
    return jsonb_build_object('flagged', false, 'replayed', false);
  end if;

  insert into public.case_exceptions (
    merchant_id, support_payout_case_id, exception_type, confidence, status,
    title, detail, context, subject_entity_type, subject_entity_id,
    source_system, dedup_key
  ) values (
    p_merchant_id, p_case_id, 'other', 'probable', 'open',
    'Pending case needs attention',
    'This case has remained pending beyond the configured attention threshold. Its business lifecycle was not changed.',
    jsonb_build_object('attention_state', 'overdue', 'cutoff', p_cutoff),
    'case', p_case_id::text, 'system_attention_job',
    'aged-pending-case:' || p_case_id::text
  )
  on conflict (merchant_id, dedup_key) do update
  set
    status = 'open',
    detail = excluded.detail,
    context = excluded.context,
    updated_at = now();

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.attention_overdue',
    'case',
    p_case_id,
    p_idempotency_key,
    jsonb_build_object(
      'case_id', p_case_id,
      'status', v_case.status,
      'attention_state', 'overdue',
      'cutoff', p_cutoff
    ),
    null, null, null, 'system', null, now(), null, null,
    array['caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, metadata
  ) values (
    p_case_id, p_merchant_id, 'case_attention_overdue',
    v_case.status, v_case.status,
    'Pending case needs attention.',
    jsonb_build_object(
      'attention_state', 'overdue',
      'cutoff', p_cutoff,
      'domain_event_id', v_event.id,
      'idempotency_key', p_idempotency_key
    )
  );

  return jsonb_build_object('flagged', true, 'domain_event_id', v_event.id, 'replayed', false);
end;
$function$;

create or replace function public.transition_payout_case(
  p_merchant_id uuid,
  p_case_id uuid,
  p_expected_version bigint,
  p_patch jsonb,
  p_reason text,
  p_actor_user_id uuid,
  p_triggered_by text,
  p_event_type text,
  p_event_payload jsonb,
  p_handler_names text[],
  p_claim_event_type text,
  p_claim_event_metadata jsonb,
  p_idempotency_key text,
  p_allow_reopen boolean default false,
  p_allow_decision_reversal boolean default false,
  p_allow_snooze boolean default false,
  p_allow_closure_exception boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_request jsonb;
  v_fingerprint text;
  v_result jsonb;
  v_new_status text;
  v_new_decision_state text;
  v_new_recovery_state text;
  v_handler text;
  v_closure_blockers text[] := '{}';
  v_latest_decision public.case_decisions;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_transition_idempotency_key_required' using errcode = '22023';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'case_transition_patch_must_be_object' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_patch) as key_name
    where key_name <> all (array[
      'status', 'payout_decision_state', 'recovery_state',
      'assigned_to', 'assigned_at', 'snoozed_until',
      'loss_attribution', 'attribution_confidence'
    ])
  ) then
    raise exception 'case_transition_patch_contains_unsupported_field' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'case_id', p_case_id,
    'expected_version', p_expected_version,
    'patch', p_patch,
    'reason', p_reason,
    'actor_user_id', p_actor_user_id,
    'triggered_by', coalesce(p_triggered_by, 'system'),
    'event_type', coalesce(p_event_type, 'case.updated'),
    'event_payload', coalesce(p_event_payload, '{}'::jsonb),
    'claim_event_type', coalesce(p_claim_event_type, 'status_changed'),
    'claim_event_metadata', coalesce(p_claim_event_metadata, '{}'::jsonb),
    'allow_reopen', p_allow_reopen,
    'allow_decision_reversal', p_allow_decision_reversal,
    'allow_snooze', p_allow_snooze,
    'allow_closure_exception', p_allow_closure_exception
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_prior_event.payload ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_transition_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_prior_event.payload -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id
    and id = p_case_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  -- A concurrent caller may have completed this exact operation while this
  -- transaction waited for the case row lock.
  select * into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_prior_event.payload ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_transition_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_prior_event.payload -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  v_new_status := coalesce(p_patch ->> 'status', v_case.status::text);
  v_new_decision_state := coalesce(p_patch ->> 'payout_decision_state', v_case.payout_decision_state);
  v_new_recovery_state := coalesce(p_patch ->> 'recovery_state', v_case.recovery_state);

  -- Status validation mirrors the canonical application state machine. The
  -- enum cast additionally rejects unknown values.
  perform v_new_status::public.claim_status;
  if v_new_status <> v_case.status::text then
    if v_new_status = 'stale' then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_new_status = 'pending' and not p_allow_snooze then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_case.status::text = 'escalated' and v_new_status not in ('resolved_won', 'resolved_lost', 'voided') then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
    if v_case.status::text in (
      'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
      'resolved_denied', 'resolved_exchanged', 'voided', 'stale'
    ) and not (
      p_allow_reopen and v_new_status in ('open', 'new')
    ) and v_new_status <> 'voided' then
      raise exception 'case_transition_rejected:status' using errcode = '22023';
    end if;
  end if;

  if v_new_decision_state not in ('undecided', 'recommendation_ready', 'decision_recorded', 'reversed') then
    raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
  end if;
  if v_new_decision_state <> v_case.payout_decision_state then
    if v_case.payout_decision_state = 'decision_recorded'
      and v_new_decision_state <> 'reversed'
      and not p_allow_decision_reversal then
      raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
    end if;
    if v_new_decision_state = 'reversed'
      and v_case.payout_decision_state <> 'decision_recorded'
      and not p_allow_decision_reversal then
      raise exception 'case_transition_rejected:payout_decision_state' using errcode = '22023';
    end if;
  end if;

  if v_new_recovery_state not in (
    'no_recovery_needed', 'recovery_possible', 'recovery_opened',
    'recovery_submitted', 'recovery_paid', 'closed_unrecoverable'
  ) then
    raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
  end if;
  if v_new_recovery_state <> v_case.recovery_state then
    if v_case.recovery_state in ('recovery_paid', 'closed_unrecoverable') then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_paid' and v_case.recovery_state <> 'recovery_submitted' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_submitted' and v_case.recovery_state <> 'recovery_opened' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'recovery_opened' and v_case.recovery_state <> 'recovery_possible' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
    if v_new_recovery_state = 'closed_unrecoverable' and v_case.recovery_state = 'no_recovery_needed' then
      raise exception 'case_transition_rejected:recovery_state' using errcode = '22023';
    end if;
  end if;

  if v_new_status in (
    'closed', 'resolved_refunded', 'resolved_won', 'resolved_lost',
    'resolved_denied', 'resolved_exchanged'
  ) and v_new_status <> v_case.status::text then
    if v_new_decision_state <> 'decision_recorded' then
      v_closure_blockers := array_append(v_closure_blockers, 'payout_decision');
    end if;
    if v_new_recovery_state not in ('no_recovery_needed', 'recovery_paid', 'closed_unrecoverable') then
      v_closure_blockers := array_append(v_closure_blockers, 'recovery_state');
    end if;
    if exists (
      select 1 from public.case_exceptions exception_row
      where exception_row.merchant_id = p_merchant_id
        and exception_row.support_payout_case_id = p_case_id
        and exception_row.status = 'open'
        and exception_row.exception_type in (
          'conflicting_financials', 'missing_recovery_result',
          'write_off_reason', 'responsibility_judgement'
        )
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'financial_exception');
    end if;
    if exists (
      select 1 from public.recovery_cases recovery_row
      where recovery_row.merchant_id = p_merchant_id
        and recovery_row.support_payout_case_id = p_case_id
        and recovery_row.status not in ('paid', 'closed_unrecoverable')
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'recovery_work');
    end if;
    if exists (
      select 1 from public.case_prevention_observations observation_row
      where observation_row.merchant_id = p_merchant_id
        and observation_row.support_payout_case_id = p_case_id
        and observation_row.status = 'pending'
    ) then
      v_closure_blockers := array_append(v_closure_blockers, 'prevention_observation');
    end if;

    select * into v_latest_decision
    from public.case_decisions decision_row
    where decision_row.merchant_id = p_merchant_id
      and decision_row.support_payout_case_id = p_case_id
    order by decision_row.effective_at desc, decision_row.recorded_at desc, decision_row.id desc
    limit 1;
    if v_new_decision_state = 'decision_recorded' and not found then
      v_closure_blockers := array_append(v_closure_blockers, 'decision_history');
    elsif found and v_latest_decision.action in ('approved', 'partial_refund', 'full_refund')
      and not exists (
        select 1 from public.case_outcomes outcome_row
        where outcome_row.merchant_id = p_merchant_id
          and outcome_row.support_payout_case_id = p_case_id
          and outcome_row.effective_at >= v_latest_decision.effective_at
          and outcome_row.reverses_outcome_id is null
          and not exists (
            select 1 from public.case_outcomes reversal_row
            where reversal_row.merchant_id = outcome_row.merchant_id
              and reversal_row.reverses_outcome_id = outcome_row.id
          )
      ) then
      v_closure_blockers := array_append(v_closure_blockers, 'source_outcome');
    end if;

    if coalesce(array_length(v_closure_blockers, 1), 0) > 0 then
      if not p_allow_closure_exception then
        raise exception 'case_closure_blocked:%', array_to_string(v_closure_blockers, ',')
          using errcode = '22023';
      end if;
      if coalesce(length(trim(p_reason)), 0) < 10 then
        raise exception 'case_closure_exception_reason_required' using errcode = '22023';
      end if;
    end if;
  end if;

  update public.support_payout_cases
  set
    status = v_new_status::public.claim_status,
    payout_decision_state = v_new_decision_state,
    recovery_state = v_new_recovery_state,
    assigned_to = case when p_patch ? 'assigned_to' then nullif(p_patch ->> 'assigned_to', '')::uuid else assigned_to end,
    assigned_at = case when p_patch ? 'assigned_at' then nullif(p_patch ->> 'assigned_at', '')::timestamptz else assigned_at end,
    snoozed_until = case when p_patch ? 'snoozed_until' then nullif(p_patch ->> 'snoozed_until', '')::timestamptz else snoozed_until end,
    loss_attribution = case when p_patch ? 'loss_attribution' then nullif(p_patch ->> 'loss_attribution', '')::public.loss_attribution else loss_attribution end,
    attribution_confidence = case when p_patch ? 'attribution_confidence' then nullif(p_patch ->> 'attribution_confidence', '')::public.attribution_confidence else attribution_confidence end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_case_id;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'new_version', p_expected_version + 1,
    'status', v_new_status,
    'payout_decision_state', v_new_decision_state,
    'recovery_state', v_new_recovery_state,
    'replayed', false
  );

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    coalesce(p_event_type, 'case.updated'),
    'case',
    p_case_id,
    p_idempotency_key,
    coalesce(p_event_payload, '{}'::jsonb) || jsonb_build_object(
      'case_id', p_case_id,
      'from_version', p_expected_version,
      'to_version', p_expected_version + 1,
      'patch', p_patch,
      'reason', p_reason,
      'request_fingerprint', v_fingerprint,
      'transition_result', v_result
    ),
    null,
    null,
    null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,
    now(),
    null,
    null,
    coalesce(p_handler_names, '{}')
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id,
    p_merchant_id,
    coalesce(p_claim_event_type, 'status_changed'),
    v_case.status,
    v_new_status::public.claim_status,
    p_reason,
    p_actor_user_id,
    coalesce(p_claim_event_metadata, '{}'::jsonb) || jsonb_build_object(
      'state_version', p_expected_version + 1,
      'domain_event_id', v_event.id,
      'idempotency_key', p_idempotency_key,
      'triggered_by', coalesce(p_triggered_by, 'system'),
      'triggered_at', now()
    )
  );

  if p_allow_closure_exception and coalesce(array_length(v_closure_blockers, 1), 0) > 0 then
    insert into public.case_exceptions (
      merchant_id, support_payout_case_id, exception_type, confidence, status,
      title, detail, context, subject_entity_type, subject_entity_id,
      source_system, dedup_key, resolution, resolved_by, resolved_at
    ) values (
      p_merchant_id, p_case_id, 'other', 'probable', 'resolved',
      'Case closed with a documented exception', p_reason,
      jsonb_build_object(
        'closure_blockers', to_jsonb(v_closure_blockers),
        'domain_event_id', v_event.id,
        'state_version', p_expected_version + 1
      ),
      'case', p_case_id::text, 'merchant_manual',
      'case-closure-exception:' || p_case_id::text || ':v' || (p_expected_version + 1)::text,
      p_reason, p_actor_user_id, now()
    );
  end if;

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;

create or replace function public.record_case_decision(
  p_merchant_id uuid,
  p_case_id uuid,
  p_expected_version bigint,
  p_decision text,
  p_action text,
  p_amount_minor bigint,
  p_currency text,
  p_reason text,
  p_actor_user_id uuid,
  p_recommendation_snapshot jsonb,
  p_followed_recommendation boolean,
  p_related_source_object jsonb,
  p_idempotency_key text,
  p_reversal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_case public.support_payout_cases;
  v_prior_decision public.case_decisions;
  v_existing_decision public.case_decisions;
  v_decision_id uuid := gen_random_uuid();
  v_outcome_id uuid;
  v_effective_at timestamptz := now();
  v_transition jsonb;
  v_currency text;
  v_observation_end timestamptz;
  v_request jsonb;
  v_fingerprint text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_decision_idempotency_key_required' using errcode = '22023';
  end if;
  select * into v_existing_decision
  from public.case_decisions
  where merchant_id = p_merchant_id
    and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_decision.recommendation_snapshot ->> 'request_fingerprint' is distinct from encode(
      extensions.digest(convert_to(jsonb_build_object(
        'merchant_id', p_merchant_id, 'case_id', p_case_id,
        'expected_version', p_expected_version, 'decision', p_decision,
        'action', p_action, 'amount_minor', p_amount_minor,
        'currency', upper(p_currency), 'reason', p_reason,
        'actor_user_id', p_actor_user_id, 'recommendation_snapshot', coalesce(p_recommendation_snapshot, '{}'::jsonb),
        'followed_recommendation', p_followed_recommendation,
        'related_source_object', coalesce(p_related_source_object, '{}'::jsonb),
        'reversal', p_reversal
      )::text, 'UTF8'), 'sha256'), 'hex'
    ) then
      raise exception 'case_decision_idempotency_conflict' using errcode = '22023';
    end if;
    select id into v_outcome_id from public.claim_outcomes where claim_id = p_case_id;
    return jsonb_build_object(
      'decision_id', v_existing_decision.id,
      'outcome_id', v_outcome_id,
      'case_id', p_case_id,
      'replayed', true
    );
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found then raise exception 'case_not_found' using errcode = 'P0002'; end if;
  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  perform p_decision::public.claim_decision;
  if p_action is null or trim(p_action) = '' then
    raise exception 'case_decision_action_required' using errcode = '22023';
  end if;
  if p_action in ('approved', 'partial_refund', 'full_refund', 'refund', 'reship', 'replacement', 'denied', 'no_action')
    and (p_amount_minor is null or p_amount_minor < 0 or p_currency is null) then
    raise exception 'case_decision_amount_and_currency_required' using errcode = '22023';
  end if;
  if p_amount_minor is not null and p_amount_minor < 0 then
    raise exception 'case_decision_amount_must_be_nonnegative' using errcode = '22023';
  end if;
  if p_decision in ('denied', 'escalated', 'no_action') and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'case_decision_reason_required' using errcode = '22023';
  end if;
  if p_followed_recommendation is false and coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'case_decision_override_reason_required' using errcode = '22023';
  end if;

  v_currency := case when p_amount_minor is null then null else upper(trim(p_currency)) end;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'case_decision_currency_invalid' using errcode = '22023';
  end if;

  select * into v_prior_decision
  from public.case_decisions
  where merchant_id = p_merchant_id
    and support_payout_case_id = p_case_id
  order by effective_at desc, recorded_at desc, id desc
  limit 1;
  if p_reversal and v_prior_decision.id is null then
    raise exception 'case_decision_reversal_requires_prior_decision' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id, 'case_id', p_case_id,
    'expected_version', p_expected_version, 'decision', p_decision,
    'action', p_action, 'amount_minor', p_amount_minor,
    'currency', v_currency, 'reason', p_reason,
    'actor_user_id', p_actor_user_id, 'recommendation_snapshot', coalesce(p_recommendation_snapshot, '{}'::jsonb),
    'followed_recommendation', p_followed_recommendation,
    'related_source_object', coalesce(p_related_source_object, '{}'::jsonb),
    'reversal', p_reversal
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.case_decisions (
    id, merchant_id, support_payout_case_id, decision, action,
    amount_minor, currency, recommendation_snapshot, followed_recommendation,
    reason, actor_type, actor_user_id, effective_at,
    reverses_decision_id, supersedes_decision_id, idempotency_key
  ) values (
    v_decision_id, p_merchant_id, p_case_id, p_decision,
    p_action, p_amount_minor, v_currency,
    coalesce(p_recommendation_snapshot, '{}'::jsonb) || jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'related_source_object', coalesce(p_related_source_object, '{}'::jsonb)
    ),
    p_followed_recommendation, p_reason,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id, v_effective_at,
    case when p_reversal then v_prior_decision.id else null end,
    v_prior_decision.id,
    p_idempotency_key
  );

  insert into public.claim_outcomes (
    claim_id, decision, outcome, amount_refunded, amount_recovered,
    notes, decided_by, decided_at, updated_at,
    recommended_payout_action, followed_recommendation
  ) values (
    p_case_id, p_decision::public.claim_decision, 'pending',
    null, null, p_reason, p_actor_user_id, v_effective_at, v_effective_at,
    p_recommendation_snapshot ->> 'recommended_payout_action',
    p_followed_recommendation
  )
  on conflict (claim_id) do update
  set
    decision = excluded.decision,
    outcome = 'pending',
    amount_refunded = null,
    amount_recovered = null,
    notes = excluded.notes,
    decided_by = excluded.decided_by,
    decided_at = excluded.decided_at,
    updated_at = excluded.updated_at,
    recommended_payout_action = excluded.recommended_payout_action,
    followed_recommendation = excluded.followed_recommendation
  returning id into v_outcome_id;

  if p_reversal then
    update public.case_prevention_observations
    set status = 'cancelled', cancelled_at = now(),
        cancellation_reason = 'decision_reversed', updated_at = now()
    where merchant_id = p_merchant_id
      and decision_id = v_prior_decision.id
      and status = 'pending';
  end if;

  if p_action in ('denied', 'no_action') and coalesce(p_amount_minor, 0) > 0 then
    begin
      v_observation_end := nullif(p_related_source_object ->> 'observation_ends_at', '')::timestamptz;
    exception when invalid_datetime_format then
      raise exception 'case_decision_observation_end_invalid' using errcode = '22023';
    end;
    insert into public.case_prevention_observations (
      merchant_id, support_payout_case_id, decision_id, currency,
      exposure_minor, decision_at, eligible_at, window_basis
    ) values (
      p_merchant_id, p_case_id, v_decision_id, v_currency,
      p_amount_minor, v_effective_at,
      greatest(v_effective_at + interval '30 days', coalesce(v_observation_end, v_effective_at + interval '30 days')),
      case when v_observation_end is null then 'default_30_calendar_days' else 'later_source_window' end
    );
  end if;

  v_transition := public.transition_payout_case(
    p_merchant_id,
    p_case_id,
    p_expected_version,
    jsonb_build_object(
      'status', case when p_decision = 'escalated' then 'manual_review' else 'decision_recorded' end,
      'payout_decision_state', case when p_reversal then 'reversed' else 'decision_recorded' end
    ),
    p_reason,
    p_actor_user_id,
    'merchant_manual',
    'case.decision_recorded',
    jsonb_build_object(
      'decision_id', v_decision_id,
      'action', p_action,
      'amount_minor', p_amount_minor,
      'currency', v_currency,
      'reversal', p_reversal,
      'reverses_decision_id', case when p_reversal then v_prior_decision.id else null end,
      'related_source_object', coalesce(p_related_source_object, '{}'::jsonb)
    ),
    array['financialProjection', 'lossProjection', 'recoveryProjection', 'customerProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection'],
    case when p_reversal then 'decision_reversed' else 'outcome_added' end,
    jsonb_build_object(
      'decision_id', v_decision_id,
      'compatibility_outcome_id', v_outcome_id,
      'previous_decision', v_prior_decision.decision,
      'new_decision', p_decision,
      'amount_minor', p_amount_minor,
      'currency', v_currency
    ),
    'case-decision:' || p_idempotency_key,
    false,
    p_reversal,
    false
  );

  return v_transition || jsonb_build_object(
    'decision_id', v_decision_id,
    'outcome_id', v_outcome_id,
    'replayed', false
  );
end;
$function$;

create or replace function public.record_case_source_outcome(
  p_merchant_id uuid,
  p_case_id uuid,
  p_outcome_type text,
  p_action text,
  p_amount_minor bigint,
  p_confirmed_loss_minor bigint,
  p_currency text,
  p_reason text,
  p_source_record_id uuid,
  p_source_metadata jsonb,
  p_occurred_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_case public.support_payout_cases;
  v_prior public.case_outcomes;
  v_existing public.case_outcomes;
  v_outcome public.case_outcomes;
  v_latest_decision public.case_decisions;
  v_event public.domain_events;
  v_currency text := upper(trim(p_currency));
  v_is_reversal boolean := coalesce((p_source_metadata ->> 'reversal')::boolean, false);
  v_fingerprint text;
  v_payload jsonb;
  v_conflict_reason text;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'case_outcome_idempotency_key_required' using errcode = '22023';
  end if;
  if p_action is null or trim(p_action) = '' or p_outcome_type is null or trim(p_outcome_type) = '' then
    raise exception 'case_outcome_type_and_action_required' using errcode = '22023';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'case_outcome_amount_or_currency_invalid' using errcode = '22023';
  end if;
  if p_confirmed_loss_minor is not null and (p_confirmed_loss_minor < 0 or p_confirmed_loss_minor > p_amount_minor) then
    raise exception 'case_outcome_confirmed_loss_invalid' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'merchant_id', p_merchant_id, 'case_id', p_case_id,
    'outcome_type', p_outcome_type, 'action', p_action,
    'amount_minor', p_amount_minor, 'confirmed_loss_minor', p_confirmed_loss_minor,
    'currency', v_currency, 'reason', p_reason,
    'source_record_id', p_source_record_id,
    'source_metadata', coalesce(p_source_metadata, '{}'::jsonb),
    'occurred_at', coalesce(p_occurred_at, now())
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing
  from public.case_outcomes
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'case_outcome_idempotency_conflict' using errcode = '22023';
    end if;
    select * into v_event from public.domain_events
    where merchant_id = p_merchant_id and idempotency_key = 'case-outcome:' || p_idempotency_key;
    return jsonb_build_object('outcome_id', v_existing.id, 'domain_event_id', v_event.id, 'replayed', true);
  end if;

  select * into v_case from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found then raise exception 'case_not_found' using errcode = 'P0002'; end if;

  if v_is_reversal then
    if nullif(p_source_metadata ->> 'reverses_outcome_id', '') is not null then
      select * into v_prior
      from public.case_outcomes
      where merchant_id = p_merchant_id
        and support_payout_case_id = p_case_id
        and id = (p_source_metadata ->> 'reverses_outcome_id')::uuid;
    else
      select * into v_prior
      from public.case_outcomes candidate
      where candidate.merchant_id = p_merchant_id
        and candidate.support_payout_case_id = p_case_id
        and candidate.reverses_outcome_id is null
        and not exists (
          select 1 from public.case_outcomes prior_reversal
          where prior_reversal.merchant_id = candidate.merchant_id
            and prior_reversal.reverses_outcome_id = candidate.id
        )
      order by candidate.effective_at desc, candidate.recorded_at desc, candidate.id desc
      limit 1;
    end if;
    if not found then
      raise exception 'case_outcome_reversal_requires_active_prior_outcome' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.case_outcomes prior_reversal
      where prior_reversal.merchant_id = p_merchant_id
        and prior_reversal.reverses_outcome_id = v_prior.id
    ) then
      raise exception 'case_outcome_already_reversed' using errcode = '22023';
    end if;
    if v_prior.amount_minor is distinct from p_amount_minor
       or v_prior.currency is distinct from v_currency
       or v_prior.metadata ->> 'action' is distinct from p_action
       or nullif(v_prior.metadata ->> 'confirmed_loss_minor', '')::bigint
          is distinct from p_confirmed_loss_minor then
      raise exception 'case_outcome_reversal_must_mirror_prior_outcome' using errcode = '22023';
    end if;
  end if;

  insert into public.case_outcomes (
    merchant_id, support_payout_case_id, outcome_type, amount_minor,
    currency, reason, metadata, actor_type, effective_at,
    reverses_outcome_id, idempotency_key
  ) values (
    p_merchant_id, p_case_id, p_outcome_type, p_amount_minor,
    v_currency, p_reason,
    coalesce(p_source_metadata, '{}'::jsonb) || jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'source_record_id', p_source_record_id,
      'action', p_action,
      'confirmed_loss_minor', p_confirmed_loss_minor
    ),
    'source', coalesce(p_occurred_at, now()),
    case when v_is_reversal then v_prior.id else null end,
    p_idempotency_key
  ) returning * into v_outcome;

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.outcome_reconciled',
    'case',
    p_case_id,
    'case-outcome:' || p_idempotency_key,
    jsonb_build_object(
      'outcome_id', v_outcome.id,
      'outcome_type', p_outcome_type,
      'action', p_action,
      'amount_minor', p_amount_minor,
      'confirmed_loss_minor', p_confirmed_loss_minor,
      'currency', v_currency,
      'reason', p_reason,
      'source_record_id', p_source_record_id,
      'source_metadata', coalesce(p_source_metadata, '{}'::jsonb),
      'reversal', v_outcome.reverses_outcome_id is not null,
      'reverses_outcome_id', v_outcome.reverses_outcome_id,
      'request_fingerprint', v_fingerprint
    ),
    p_source_record_id,
    null,
    null,
    'source',
    null,
    coalesce(p_occurred_at, now()),
    null,
    null,
    array['financialProjection', 'lossProjection', 'recoveryProjection', 'customerProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, metadata
  ) values (
    p_case_id, p_merchant_id, 'outcome_added', v_case.status, v_case.status,
    p_reason,
    jsonb_build_object(
      'outcome_id', v_outcome.id,
      'domain_event_id', v_event.id,
      'source_record_id', p_source_record_id,
      'idempotency_key', p_idempotency_key,
      'triggered_by', 'source_reconciliation',
      'triggered_at', coalesce(p_occurred_at, now())
    )
  );

  select * into v_latest_decision
  from public.case_decisions decision_row
  where decision_row.merchant_id = p_merchant_id
    and decision_row.support_payout_case_id = p_case_id
  order by decision_row.effective_at desc, decision_row.recorded_at desc, decision_row.id desc
  limit 1;
  if found and not v_is_reversal then
    if v_latest_decision.action in ('denied', 'no_action')
       and p_action in ('refund', 'partial_refund', 'full_refund', 'reship', 'replacement', 'store_credit', 'discount')
       and p_amount_minor > 0 then
      v_conflict_reason := 'A source payout was observed after a no-payout merchant decision.';
    elsif v_latest_decision.action in ('approved', 'partial_refund', 'full_refund')
       and p_action not in ('refund', 'partial_refund', 'full_refund', 'reship', 'replacement', 'store_credit', 'discount') then
      v_conflict_reason := 'The source outcome differs from the recorded payout authorization.';
    elsif v_latest_decision.amount_minor is not null
       and p_amount_minor > v_latest_decision.amount_minor then
      v_conflict_reason := 'The observed source payout exceeds the recorded authorized amount.';
    elsif v_latest_decision.currency is not null
       and v_latest_decision.currency <> v_currency then
      v_conflict_reason := 'The observed source outcome currency differs from the recorded decision currency.';
    end if;
  end if;

  if v_conflict_reason is not null then
    insert into public.case_exceptions (
      merchant_id, support_payout_case_id, exception_type, confidence, status,
      title, detail, context, subject_entity_type, subject_entity_id,
      source_system, dedup_key
    ) values (
      p_merchant_id, p_case_id, 'conflicting_financials', 'probable', 'open',
      'Source outcome differs from the merchant decision', v_conflict_reason,
      jsonb_build_object(
        'decision_id', v_latest_decision.id,
        'decision_action', v_latest_decision.action,
        'authorized_amount_minor', v_latest_decision.amount_minor,
        'authorized_currency', v_latest_decision.currency,
        'outcome_id', v_outcome.id,
        'source_action', p_action,
        'source_amount_minor', p_amount_minor,
        'source_currency', v_currency,
        'domain_event_id', v_event.id
      ),
      'case', p_case_id::text, 'source_outcome_reconciliation',
      'source-decision-conflict:' || v_outcome.id::text
    );
  end if;

  return jsonb_build_object('outcome_id', v_outcome.id, 'domain_event_id', v_event.id, 'replayed', false);
end;
$function$;

create or replace function public.finalize_due_prevention_observations(
  p_limit integer default 500,
  p_now timestamptz default now()
)
returns table(confirmed integer, cancelled integer)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_observation public.case_prevention_observations;
  v_event public.domain_events;
  v_confirmed integer := 0;
  v_cancelled integer := 0;
begin
  for v_observation in
    select *
    from public.case_prevention_observations
    where status = 'pending' and eligible_at <= p_now
    order by eligible_at, id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
  loop
    if exists (
      select 1
      from public.case_financial_entries e
      where e.merchant_id = v_observation.merchant_id
        and e.support_payout_case_id = v_observation.support_payout_case_id
        and e.currency = v_observation.currency
        and e.state = 'paid'
        and e.reverses_entry_id is null
        and e.effective_at >= v_observation.decision_at
    ) or exists (
      select 1
      from public.case_outcomes o
      where o.merchant_id = v_observation.merchant_id
        and o.support_payout_case_id = v_observation.support_payout_case_id
        and o.currency = v_observation.currency
        and o.effective_at >= v_observation.decision_at
        and o.reverses_outcome_id is null
        and o.metadata ->> 'action' in (
          'refund', 'partial_refund', 'full_refund', 'reship',
          'replacement', 'store_credit', 'discount'
        )
        and not exists (
          select 1
          from public.case_outcomes reversal
          where reversal.merchant_id = o.merchant_id
            and reversal.reverses_outcome_id = o.id
        )
    ) then
      update public.case_prevention_observations
      set status = 'cancelled', cancelled_at = p_now,
          cancellation_reason = 'later_payout_observed', updated_at = p_now
      where id = v_observation.id;
      v_cancelled := v_cancelled + 1;
    else
      select * into v_event
      from public.record_domain_event(
        v_observation.merchant_id,
        'case.prevention_confirmed',
        'case',
        v_observation.support_payout_case_id,
        'prevention-observation:' || v_observation.id::text,
        jsonb_build_object(
          'observation_id', v_observation.id,
          'decision_id', v_observation.decision_id,
          'amount_minor', v_observation.exposure_minor,
          'currency', v_observation.currency,
          'decision_at', v_observation.decision_at,
          'eligible_at', v_observation.eligible_at,
          'policy_version', v_observation.policy_version,
          'window_basis', v_observation.window_basis
        ),
        null, null, null, 'system', null, p_now, null, null,
        array['financialProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
      );
      update public.case_prevention_observations
      set status = 'confirmed', confirmed_at = p_now,
          domain_event_id = v_event.id, updated_at = p_now
      where id = v_observation.id;
      v_confirmed := v_confirmed + 1;
    end if;
  end loop;
  return query select v_confirmed, v_cancelled;
end;
$function$;

create or replace function public.transition_recovery_case(
  p_merchant_id uuid,
  p_recovery_case_id uuid,
  p_status public.recovery_case_status,
  p_event_type public.recovery_case_event_type,
  p_note text,
  p_amount_minor bigint,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_case public.recovery_cases;
  v_existing_event public.recovery_case_events;
  v_new_status public.recovery_case_status := p_status;
  v_approved bigint;
  v_recovered bigint;
  v_written_off bigint;
  v_delta bigint := 0;
  v_financial_event_type text := 'recovery.status_changed';
  v_domain_event public.domain_events;
  v_request jsonb;
  v_fingerprint text;
  v_result jsonb;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'recovery_idempotency_key_required' using errcode = '22023';
  end if;
  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'recovery_case_id', p_recovery_case_id,
    'status', p_status,
    'event_type', p_event_type,
    'note', p_note,
    'amount_minor', p_amount_minor,
    'actor_user_id', p_actor_user_id
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing_event
  from public.recovery_case_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_event.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'recovery_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_existing_event.metadata -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('replayed', true);
  end if;

  select * into v_case
  from public.recovery_cases
  where merchant_id = p_merchant_id and id = p_recovery_case_id
  for update;
  if not found then raise exception 'recovery_case_not_found' using errcode = 'P0002'; end if;

  select * into v_existing_event
  from public.recovery_case_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing_event.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'recovery_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_existing_event.metadata -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('replayed', true);
  end if;

  v_approved := v_case.amount_approved_minor;
  v_recovered := v_case.amount_recovered_minor;
  v_written_off := v_case.amount_written_off_minor;

  if p_event_type in ('approved', 'partially_approved') then
    if p_amount_minor is null or p_amount_minor < 0 or p_amount_minor > v_case.amount_sought_minor then
      raise exception 'recovery_approved_amount_invalid' using errcode = '22023';
    end if;
    v_approved := p_amount_minor;
  elsif p_event_type = 'paid' then
    if p_amount_minor is null or p_amount_minor < v_recovered or p_amount_minor > v_case.amount_sought_minor then
      raise exception 'recovery_received_amount_invalid' using errcode = '22023';
    end if;
    if v_approved > 0 and p_amount_minor > v_approved then
      raise exception 'recovery_received_exceeds_approved' using errcode = '22023';
    end if;
    v_delta := p_amount_minor - v_recovered;
    v_recovered := p_amount_minor;
    v_financial_event_type := 'recovery.completed';
    if v_recovered + v_written_off < v_case.amount_sought_minor then
      v_new_status := 'partially_approved';
    else
      v_new_status := 'paid';
    end if;
  elsif p_event_type = 'closed' then
    if coalesce(length(trim(p_note)), 0) < 3 then
      raise exception 'recovery_close_reason_required' using errcode = '22023';
    end if;
    v_delta := greatest(v_case.amount_sought_minor - v_recovered - v_written_off, 0);
    v_written_off := v_written_off + v_delta;
    v_new_status := 'closed_unrecoverable';
    v_financial_event_type := 'loss.written_off';
  elsif p_amount_minor is not null then
    raise exception 'recovery_amount_not_allowed_for_action' using errcode = '22023';
  end if;

  if v_recovered + v_written_off > v_case.amount_sought_minor then
    raise exception 'recovery_amounts_exceed_sought' using errcode = '22023';
  end if;

  update public.recovery_cases
  set
    status = v_new_status,
    amount_approved_minor = v_approved,
    amount_recovered_minor = v_recovered,
    amount_written_off_minor = v_written_off,
    amount_recovered = v_recovered::numeric / 100,
    rejection_reason = case when v_new_status = 'rejected' then p_note else rejection_reason end,
    next_chase_at = case
      when v_new_status = 'submitted' then now() + interval '7 days'
      when v_new_status in ('paid', 'closed_unrecoverable') then null
      else next_chase_at
    end,
    last_chased_at = case when p_event_type = 'chased' then now() else last_chased_at end,
    updated_at = now()
  where id = v_case.id and merchant_id = p_merchant_id;

  if p_event_type = 'chased' then
    update public.recovery_cases
    set status = 'waiting_response', next_chase_at = now() + interval '7 days', updated_at = now()
    where id = v_case.id and merchant_id = p_merchant_id;
    v_new_status := 'waiting_response';
  end if;

  update public.support_payout_cases
  set
    recovery_state = case
      when v_new_status = 'submitted' then 'recovery_submitted'
      when v_new_status = 'paid' then 'recovery_paid'
      when v_new_status = 'closed_unrecoverable' then 'closed_unrecoverable'
      else recovery_state
    end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = v_case.support_payout_case_id;

  v_result := jsonb_build_object(
    'recovery_case_id', v_case.id,
    'status', v_new_status,
    'amount_sought_minor', v_case.amount_sought_minor,
    'amount_approved_minor', v_approved,
    'amount_recovered_minor', v_recovered,
    'amount_written_off_minor', v_written_off,
    'replayed', false
  );

  insert into public.recovery_case_events (
    merchant_id, recovery_case_id, event_type, from_status, to_status,
    note, metadata, idempotency_key
  ) values (
    p_merchant_id, v_case.id, p_event_type, v_case.status, v_new_status,
    p_note,
    jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'transition_result', v_result,
      'amount_delta_minor', v_delta,
      'amount_approved_minor', v_approved,
      'amount_recovered_minor', v_recovered,
      'amount_written_off_minor', v_written_off,
      'actor_user_id', p_actor_user_id
    ),
    p_idempotency_key
  );

  select * into v_domain_event
  from public.record_domain_event(
    p_merchant_id,
    v_financial_event_type,
    'recovery_case',
    v_case.support_payout_case_id,
    'recovery-action:' || p_idempotency_key,
    jsonb_build_object(
      'recovery_case_id', v_case.id,
      'loss_case_id', v_case.loss_case_id,
      'amount_minor', v_delta,
      'cumulative_amount_minor', case when p_event_type = 'paid' then v_recovered else v_written_off end,
      'currency', upper(v_case.currency),
      'status', v_new_status,
      'reason', p_note,
      'source', 'merchant_recovery_workflow'
    ),
    null, null, null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id,
    now(), null, null,
    array['financialProjection', 'caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  return v_result || jsonb_build_object('domain_event_id', v_domain_event.id);
end;
$function$;

create or replace function public.write_off_loss_case(
  p_merchant_id uuid,
  p_loss_case_id uuid,
  p_reason text,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_loss public.loss_cases;
  v_existing public.case_financial_entries;
  v_currency text;
  v_amount bigint;
  v_entry public.case_financial_entries;
  v_event public.domain_events;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'loss_writeoff_idempotency_key_required' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'loss_writeoff_reason_required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.case_financial_entries
  where merchant_id = p_merchant_id
    and idempotency_key = 'loss-writeoff:' || p_idempotency_key;
  if found then
    return jsonb_build_object('loss_case_id', p_loss_case_id, 'financial_entry_id', v_existing.id, 'replayed', true);
  end if;

  select * into v_loss
  from public.loss_cases
  where merchant_id = p_merchant_id and id = p_loss_case_id
  for update;
  if not found then raise exception 'loss_case_not_found' using errcode = 'P0002'; end if;
  if v_loss.written_off_at is not null then
    raise exception 'loss_already_written_off' using errcode = '22023';
  end if;

  v_currency := upper(v_loss.currency);
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'loss_writeoff_currency_unknown' using errcode = '22023';
  end if;
  select greatest(
    coalesce(sum(case when state = 'recoverable' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0)
      - coalesce(sum(case when state = 'recovered' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0)
      - coalesce(sum(case when state = 'written_off' then case when reverses_entry_id is null then amount_minor else -amount_minor end end), 0),
    0
  ) into v_amount
  from public.case_financial_entries
  where merchant_id = p_merchant_id
    and support_payout_case_id = v_loss.support_payout_case_id
    and currency = v_currency;
  if v_amount <= 0 then
    raise exception 'loss_writeoff_requires_outstanding_recovery' using errcode = '22023';
  end if;

  insert into public.case_financial_entries (
    merchant_id, support_payout_case_id, loss_case_id,
    state, amount_minor, currency, direction, effective_at,
    idempotency_key, metadata
  ) values (
    p_merchant_id, v_loss.support_payout_case_id, v_loss.id,
    'written_off', v_amount, v_currency, 'memo', now(),
    'loss-writeoff:' || p_idempotency_key,
    jsonb_build_object('reason', p_reason, 'actor_user_id', p_actor_user_id)
  ) returning * into v_entry;

  update public.loss_cases
  set status = 'closed_unrecoverable', written_off_at = now(), updated_at = now()
  where id = v_loss.id and merchant_id = p_merchant_id;

  insert into public.loss_case_events (
    merchant_id, loss_case_id, event_type, metadata_json
  ) values (
    p_merchant_id, v_loss.id, 'case_closed',
    jsonb_build_object(
      'action', 'write_off', 'reason', p_reason,
      'actor_user_id', p_actor_user_id,
      'amount_minor', v_amount, 'currency', v_currency,
      'financial_entry_id', v_entry.id,
      'idempotency_key', p_idempotency_key
    )
  );

  perform public.recompute_case_financial_summary(p_merchant_id, v_loss.support_payout_case_id);
  select * into v_event
  from public.record_domain_event(
    p_merchant_id, 'loss.written_off', 'loss_case', v_loss.id,
    'loss-writeoff-event:' || p_idempotency_key,
    jsonb_build_object(
      'loss_case_id', v_loss.id,
      'case_id', v_loss.support_payout_case_id,
      'amount_minor', v_amount,
      'currency', v_currency,
      'financial_entry_id', v_entry.id,
      'reason', p_reason
    ),
    null, null, null,
    case when p_actor_user_id is null then 'system' else 'user' end,
    p_actor_user_id, now(), null, null,
    array['caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  return jsonb_build_object(
    'loss_case_id', v_loss.id,
    'financial_entry_id', v_entry.id,
    'domain_event_id', v_event.id,
    'amount_minor', v_amount,
    'currency', v_currency,
    'replayed', false
  );
end;
$function$;

create or replace function public.get_financial_report_records(
  p_merchant_id uuid,
  p_cutoff timestamptz default null,
  p_currency text default null,
  p_metric text default 'exposed',
  p_category text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  support_payout_case_id uuid,
  case_status text,
  claim_type text,
  submitted_at timestamptz,
  updated_at timestamptz,
  currency text,
  amount_minor bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_currency text := upper(trim(p_currency));
begin
  if p_merchant_id is null then
    raise exception 'financial_report_merchant_required' using errcode = '22023';
  end if;
  if p_metric not in (
    'requested', 'exposed', 'approved', 'paid', 'estimated_loss',
    'prevented', 'confirmed_loss', 'recoverable', 'recovered',
    'outstanding', 'written_off', 'final_net_loss'
  ) then
    raise exception 'financial_report_metric_invalid' using errcode = '22023';
  end if;
  if p_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'financial_report_currency_invalid' using errcode = '22023';
  end if;
  if p_category is not null and p_category not in (
    'delivery_loss', 'chargeback_or_payment_dispute',
    'fulfilment_or_warehouse_error', 'supplier_or_vendor_issue'
  ) then
    raise exception 'financial_report_category_invalid' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select
      summary.support_payout_case_id,
      payout_case.status::text as case_status,
      payout_case.claim_type::text as claim_type,
      coalesce(payout_case.submitted_at, payout_case.created_at) as submitted_at,
      summary.updated_at,
      summary.currency::text as currency,
      case p_metric
        when 'requested' then summary.requested_minor
        when 'exposed' then summary.exposed_minor
        when 'approved' then summary.approved_minor
        when 'paid' then summary.paid_minor
        when 'estimated_loss' then summary.estimated_loss_minor
        when 'prevented' then summary.prevented_minor
        when 'confirmed_loss' then summary.confirmed_loss_minor
        when 'recoverable' then summary.recoverable_minor
        when 'recovered' then summary.recovered_minor
        when 'outstanding' then greatest(
          summary.recoverable_minor - summary.recovered_minor - summary.written_off_minor,
          0
        )
        when 'written_off' then summary.written_off_minor
        when 'final_net_loss' then greatest(
          summary.confirmed_loss_minor - summary.recovered_minor,
          0
        )
      end::bigint as amount_minor
    from public.case_financial_summaries summary
    join public.support_payout_cases payout_case
      on payout_case.id = summary.support_payout_case_id
     and payout_case.merchant_id = summary.merchant_id
    where summary.merchant_id = p_merchant_id
      and (p_cutoff is null or coalesce(payout_case.submitted_at, payout_case.created_at) >= p_cutoff)
      and (p_currency is null or summary.currency = v_currency)
      and (
        (p_metric = 'outstanding' and summary.known_states @> array['recoverable']::text[])
        or (p_metric = 'final_net_loss' and summary.known_states @> array['confirmed_loss']::text[])
        or (p_metric not in ('outstanding', 'final_net_loss') and summary.known_states @> array[p_metric]::text[])
      )
      and (
        p_category is null
        or (p_category = 'delivery_loss' and payout_case.claim_type::text in ('item_not_received', 'missing_parcel'))
        or (p_category = 'chargeback_or_payment_dispute' and payout_case.claim_type::text = 'chargeback')
        or (p_category = 'fulfilment_or_warehouse_error' and payout_case.claim_type::text in ('wrong_item', 'damaged', 'not_as_described'))
        or (
          p_category = 'supplier_or_vendor_issue'
          and coalesce(payout_case.claim_type::text, 'unknown') not in (
            'item_not_received', 'missing_parcel', 'chargeback',
            'wrong_item', 'damaged', 'not_as_described'
          )
        )
      )
  )
  select
    eligible.support_payout_case_id,
    eligible.case_status,
    eligible.claim_type,
    eligible.submitted_at,
    eligible.updated_at,
    eligible.currency,
    eligible.amount_minor,
    count(*) over()::bigint as total_count
  from eligible
  order by eligible.submitted_at desc nulls last,
           eligible.updated_at desc,
           eligible.support_payout_case_id
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

revoke all on function public.recompute_case_financial_summary(uuid, uuid) from public, anon, authenticated;
revoke all on function public.flag_aged_payout_case(uuid, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.transition_payout_case(uuid, uuid, bigint, jsonb, text, uuid, text, text, jsonb, text[], text, jsonb, text, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public.record_case_decision(uuid, uuid, bigint, text, text, bigint, text, text, uuid, jsonb, boolean, jsonb, text, boolean) from public, anon, authenticated;
revoke all on function public.record_case_source_outcome(uuid, uuid, text, text, bigint, bigint, text, text, uuid, jsonb, timestamptz, text) from public, anon, authenticated;
revoke all on function public.finalize_due_prevention_observations(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.transition_recovery_case(uuid, uuid, public.recovery_case_status, public.recovery_case_event_type, text, bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.write_off_loss_case(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_financial_report_records(uuid, timestamptz, text, text, text, integer, integer) from public, anon, authenticated;

grant execute on function public.recompute_case_financial_summary(uuid, uuid) to service_role;
grant execute on function public.flag_aged_payout_case(uuid, uuid, timestamptz, text) to service_role;
grant execute on function public.transition_payout_case(uuid, uuid, bigint, jsonb, text, uuid, text, text, jsonb, text[], text, jsonb, text, boolean, boolean, boolean, boolean) to service_role;
grant execute on function public.record_case_decision(uuid, uuid, bigint, text, text, bigint, text, text, uuid, jsonb, boolean, jsonb, text, boolean) to service_role;
grant execute on function public.record_case_source_outcome(uuid, uuid, text, text, bigint, bigint, text, text, uuid, jsonb, timestamptz, text) to service_role;
grant execute on function public.finalize_due_prevention_observations(integer, timestamptz) to service_role;
grant execute on function public.transition_recovery_case(uuid, uuid, public.recovery_case_status, public.recovery_case_event_type, text, bigint, uuid, text) to service_role;
grant execute on function public.write_off_loss_case(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.get_financial_report_records(uuid, timestamptz, text, text, text, integer, integer) to service_role;

comment on column public.case_financial_summaries.known_states is
  'States backed by at least one ledger entry. A numeric zero outside this set is unknown, not a proven zero.';
comment on column public.recovery_cases.amount_sought_minor is
  'Authoritative recovery amount sought in integer minor units; legacy numeric major-unit columns are compatibility projections.';
comment on column public.recovery_cases.amount_approved_minor is
  'Partner-approved amount. Approval is not recovered cash.';
comment on column public.recovery_cases.amount_recovered_minor is
  'Cumulative value actually received or credited back, in integer minor units.';
comment on column public.recovery_cases.amount_written_off_minor is
  'Cumulative pursued value explicitly closed without recovery, in integer minor units.';

do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'finalize-prevention-observations') then
      perform cron.schedule(
        'finalize-prevention-observations',
        '17 2 * * *',
        'select public.finalize_due_prevention_observations(500, now())'
      );
    end if;
  end if;
end;
$schedule$;
