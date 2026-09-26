-- Durable loss-desk capabilities introduced by the September 2026 redesign.
-- All write paths are merchant-scoped, idempotent, append-only, and keep
-- provider outcomes and money movement outside Unauth.

create table public.financial_period_closures (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  period_start timestamptz not null,
  period_end timestamptz not null,
  acknowledged_blocker_ids uuid[] not null default '{}',
  position_snapshot jsonb not null,
  settlement_snapshot jsonb not null,
  note text,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  request_fingerprint text not null,
  domain_event_id uuid references public.domain_events(id) on delete set null,
  signed_off_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint financial_period_closures_window_check check (period_start < period_end),
  constraint financial_period_closures_note_check check (note is null or length(note) <= 2000),
  constraint financial_period_closures_period_unique unique (merchant_id, period),
  constraint financial_period_closures_idempotency_unique unique (merchant_id, idempotency_key)
);

create index financial_period_closures_merchant_signed_off_idx
  on public.financial_period_closures (merchant_id, signed_off_at desc, id desc);

create table public.report_run_snapshots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  report_definition_id text not null check (report_definition_id in (
    'financial', 'loss-causes', 'prevention', 'recovery',
    'policy', 'operations', 'evidence', 'coverage'
  )),
  scope jsonb not null,
  scope_hash text not null,
  snapshot jsonb not null,
  record_count integer not null check (record_count >= 0),
  generated_at timestamptz not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  request_fingerprint text not null,
  domain_event_id uuid references public.domain_events(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint report_run_snapshots_scope_object_check check (jsonb_typeof(scope) = 'object'),
  constraint report_run_snapshots_snapshot_object_check check (jsonb_typeof(snapshot) = 'object'),
  constraint report_run_snapshots_idempotency_unique unique (merchant_id, idempotency_key)
);

create index report_run_snapshots_scope_idx
  on public.report_run_snapshots (
    merchant_id, report_definition_id, scope_hash, generated_at desc, id desc
  );

alter table public.financial_period_closures enable row level security;
alter table public.report_run_snapshots enable row level security;

create policy financial_period_closures_member_select
  on public.financial_period_closures for select to authenticated
  using (public.is_merchant_member(merchant_id));

create policy report_run_snapshots_member_select
  on public.report_run_snapshots for select to authenticated
  using (public.is_merchant_member(merchant_id));

revoke all on public.financial_period_closures from public, anon, authenticated;
revoke all on public.report_run_snapshots from public, anon, authenticated;
grant select on public.financial_period_closures to authenticated;
grant select on public.report_run_snapshots to authenticated;
grant all on public.financial_period_closures to service_role;
grant all on public.report_run_snapshots to service_role;

create trigger financial_period_closures_immutable
  before update or delete on public.financial_period_closures
  for each row execute function public.forbid_mutation();

create trigger report_run_snapshots_immutable
  before update or delete on public.report_run_snapshots
  for each row execute function public.forbid_mutation();

create trigger trg_financial_period_closures_durable_audit
  after insert on public.financial_period_closures
  for each row execute function public.capture_sensitive_audit_event();

create trigger trg_report_run_snapshots_durable_audit
  after insert on public.report_run_snapshots
  for each row execute function public.capture_sensitive_audit_event();

create or replace function public.bulk_transition_payout_cases(
  p_merchant_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_items jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_existing public.domain_events;
  v_case public.support_payout_cases;
  v_item jsonb;
  v_item_result jsonb;
  v_updated_items jsonb := '[]'::jsonb;
  v_audit_receipts jsonb := '[]'::jsonb;
  v_request jsonb;
  v_fingerprint text;
  v_batch_event_id uuid := gen_random_uuid();
  v_batch_receipt jsonb;
  v_response jsonb;
  v_case_id uuid;
  v_expected_version bigint;
  v_assignment text;
  v_snoozed_until timestamptz;
  v_reason text;
  v_item_count integer;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'bulk_case_idempotency_key_required' using errcode = '22023';
  end if;
  if p_action not in ('assign', 'snooze', 'decision') then
    raise exception 'bulk_case_action_invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'bulk_case_items_must_be_array' using errcode = '22023';
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    raise exception 'bulk_case_item_count_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.merchant_users membership
    where membership.merchant_id = p_merchant_id
      and membership.user_id = p_actor_user_id
      and membership.invite_status = 'active'
  ) then
    raise exception 'bulk_case_actor_not_active_member' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    group by item ->> 'caseId' having count(*) > 1
  ) then
    raise exception 'bulk_case_duplicate_case_id' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'actor_user_id', p_actor_user_id,
    'action', p_action,
    'items', p_items
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = 'bulk-case:' || p_idempotency_key;
  if found then
    if v_existing.payload ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'bulk_case_idempotency_conflict' using errcode = '22023';
    end if;
    return coalesce(v_existing.payload -> 'transition_result', '{}'::jsonb)
      || jsonb_build_object('replayed', true, 'writes_performed', 0);
  end if;

  -- Lock and validate every case before the first mutation. Any validation or
  -- child-transition error aborts the enclosing PostgreSQL transaction.
  for v_item in
    select item from jsonb_array_elements(p_items) item
    order by item ->> 'caseId'
  loop
    begin
      v_case_id := (v_item ->> 'caseId')::uuid;
      v_expected_version := (v_item ->> 'expectedStateVersion')::bigint;
    exception when others then
      raise exception 'bulk_case_item_invalid' using errcode = '22023';
    end;
    select * into v_case from public.support_payout_cases
    where merchant_id = p_merchant_id and id = v_case_id
    for update;
    if not found then raise exception 'bulk_case_preflight_not_found' using errcode = 'P0002'; end if;
    if v_case.state_version is distinct from v_expected_version then
      raise exception 'bulk_case_version_conflict' using errcode = '40001';
    end if;
    if p_action = 'assign' and coalesce(v_item ->> 'assignment', '') not in ('assign_to_me', 'unassign') then
      raise exception 'bulk_case_assignment_invalid' using errcode = '22023';
    end if;
    if p_action = 'snooze' and not (v_item ? 'snoozedUntil') then
      raise exception 'bulk_case_snooze_deadline_required' using errcode = '22023';
    end if;
    if p_action = 'decision' then
      perform (v_item ->> 'decision')::public.claim_decision;
      if (v_item ->> 'amountMinor') is null
        or (v_item ->> 'amountMinor')::bigint < 0
        or coalesce(v_item ->> 'currency', '') !~ '^[A-Za-z]{3}$' then
        raise exception 'bulk_case_decision_money_invalid' using errcode = '22023';
      end if;
    end if;
  end loop;

  for v_item in select item from jsonb_array_elements(p_items) item loop
    v_case_id := (v_item ->> 'caseId')::uuid;
    v_expected_version := (v_item ->> 'expectedStateVersion')::bigint;
    select * into v_case from public.support_payout_cases
    where merchant_id = p_merchant_id and id = v_case_id;

    if p_action = 'assign' then
      v_assignment := v_item ->> 'assignment';
      v_item_result := public.transition_payout_case(
        p_merchant_id, v_case_id, v_expected_version,
        jsonb_build_object(
          'assigned_to', case when v_assignment = 'assign_to_me' then p_actor_user_id else null end,
          'assigned_at', case when v_assignment = 'assign_to_me' then now() else null end
        ),
        'Bulk assignment', p_actor_user_id, 'merchant_manual', 'case.assigned',
        jsonb_build_object('assignment', v_assignment), '{}',
        case when v_assignment = 'assign_to_me' then 'claim_assigned' else 'claim_unassigned' end,
        jsonb_build_object('assignment', v_assignment),
        p_idempotency_key || ':' || v_case_id::text,
        false, false, false, false
      );
    elsif p_action = 'snooze' then
      begin
        v_snoozed_until := nullif(v_item ->> 'snoozedUntil', '')::timestamptz;
      exception when invalid_datetime_format then
        raise exception 'bulk_case_snooze_deadline_invalid' using errcode = '22023';
      end;
      if v_snoozed_until is not null and v_snoozed_until <= now() then
        raise exception 'bulk_case_snooze_deadline_not_future' using errcode = '22023';
      end if;
      v_item_result := public.transition_payout_case(
        p_merchant_id, v_case_id, v_expected_version,
        case when v_snoozed_until is null
          then jsonb_build_object('snoozed_until', null)
          else jsonb_build_object('status', 'pending', 'snoozed_until', v_snoozed_until)
        end,
        'Bulk snooze update', p_actor_user_id, 'merchant_manual', 'case.updated',
        jsonb_build_object('snoozed_until', v_snoozed_until), '{}'::text[],
        case when v_snoozed_until is null then 'claim_unsnoozed' else 'claim_snoozed' end,
        jsonb_build_object('snoozed_until', v_snoozed_until),
        p_idempotency_key || ':' || v_case_id::text,
        false, false, v_snoozed_until is not null, false
      );
    else
      v_reason := coalesce(nullif(trim(v_item ->> 'reason'), ''), 'Bulk merchant decision');
      v_item_result := public.record_case_decision(
        p_merchant_id, v_case_id, v_expected_version,
        v_item ->> 'decision', v_item ->> 'decision',
        (v_item ->> 'amountMinor')::bigint, upper(v_item ->> 'currency'),
        v_reason, p_actor_user_id,
        jsonb_build_object('recommended_payout_action', v_case.recommended_payout_action),
        null,
        jsonb_build_object(
          'source_order_id', v_case.source_order_id,
          'source_ticket_id', v_case.source_ticket_id,
          'batch_idempotency_key', p_idempotency_key
        ),
        p_idempotency_key || ':' || v_case_id::text,
        false
      );
    end if;

    v_updated_items := v_updated_items || jsonb_build_array(
      jsonb_build_object(
        'caseId', v_case_id,
        'stateVersion', coalesce((v_item_result ->> 'new_version')::bigint, v_expected_version + 1),
        'status', v_item_result ->> 'status',
        'decisionId', v_item_result ->> 'decision_id',
        'replayed', coalesce((v_item_result ->> 'replayed')::boolean, false)
      )
    );
    v_audit_receipts := v_audit_receipts || jsonb_build_array(
      jsonb_build_object(
        'caseId', v_case_id,
        'domainEventId', v_item_result ->> 'domain_event_id',
        'decisionId', v_item_result ->> 'decision_id'
      )
    );
  end loop;

  v_batch_receipt := jsonb_build_object(
    'id', v_batch_event_id,
    'eventType', 'case.bulk_action_recorded',
    'action', p_action,
    'itemCount', v_item_count,
    'idempotencyKey', p_idempotency_key,
    'recordedAt', now()
  );
  v_response := jsonb_build_object(
    'updated_items', v_updated_items,
    'audit_receipts', v_audit_receipts,
    'batch_receipt', v_batch_receipt,
    'replayed', false,
    'writes_performed', v_item_count
  );

  insert into public.domain_events (
    id, merchant_id, event_type, aggregate_type, aggregate_id,
    actor_type, actor_id, idempotency_key, payload
  ) values (
    v_batch_event_id, p_merchant_id, 'case.bulk_action_recorded', 'case_batch', v_batch_event_id,
    'user', p_actor_user_id, 'bulk-case:' || p_idempotency_key,
    jsonb_build_object(
      'request_fingerprint', v_fingerprint,
      'transition_result', v_response,
      'external_actions_performed', 0
    )
  );

  return v_response;
end;
$function$;

create or replace function public.close_financial_period(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_period text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_acknowledged_blocker_ids uuid[],
  p_note text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_existing public.financial_period_closures;
  v_closure public.financial_period_closures;
  v_open_blockers uuid[];
  v_acknowledged uuid[];
  v_position jsonb;
  v_settlements jsonb;
  v_request jsonb;
  v_fingerprint text;
  v_event public.domain_events;
  v_closure_id uuid := gen_random_uuid();
begin
  if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or p_period_start is null or p_period_end is null or p_period_start >= p_period_end
    or to_char(p_period_start at time zone 'Europe/London', 'YYYY-MM') <> p_period
    or to_char((p_period_end - interval '1 microsecond') at time zone 'Europe/London', 'YYYY-MM') <> p_period then
    raise exception 'financial_period_window_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'financial_period_idempotency_key_required' using errcode = '22023';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'financial_period_note_too_long' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.merchant_users membership
    where membership.merchant_id = p_merchant_id
      and membership.user_id = p_actor_id
      and membership.invite_status = 'active'
      and membership.role::text in ('owner', 'admin')
  ) then
    raise exception 'financial_period_actor_not_authorized' using errcode = '42501';
  end if;

  v_acknowledged := coalesce((
    select array_agg(distinct blocker_id order by blocker_id)
    from unnest(coalesce(p_acknowledged_blocker_ids, '{}'::uuid[])) blocker_id
  ), '{}'::uuid[]);
  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'actor_id', p_actor_id,
    'period', p_period,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'acknowledged_blocker_ids', v_acknowledged,
    'note', p_note
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.financial_period_closures
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception 'financial_period_idempotency_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'closureId', v_existing.id,
      'period', v_existing.period,
      'signedOffAt', v_existing.signed_off_at,
      'position', v_existing.position_snapshot,
      'settlements', v_existing.settlement_snapshot,
      'acknowledgedBlockerIds', v_existing.acknowledged_blocker_ids,
      'auditReceipt', jsonb_build_object('domainEventId', v_existing.domain_event_id),
      'replayed', true,
      'externalActionsPerformed', 0
    );
  end if;
  if exists (
    select 1 from public.financial_period_closures
    where merchant_id = p_merchant_id and period = p_period
  ) then
    raise exception 'financial_period_already_closed' using errcode = '23505';
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[]) into v_open_blockers
  from public.case_exceptions
  where merchant_id = p_merchant_id
    and status = 'open'
    and created_at >= p_period_start and created_at < p_period_end;
  if v_open_blockers is distinct from v_acknowledged then
    raise exception 'financial_period_blockers_changed' using errcode = '40001';
  end if;

  v_position := public.financial_aggregate_v1(
    p_merchant_id, p_period_start, p_period_end, null
  );
  select jsonb_build_object(
    'state', 'available',
    'currencies', coalesce(jsonb_agg(to_jsonb(grouped) order by grouped.currency), '[]'::jsonb),
    'observationAuthority', 'source_or_receipt_backed_only'
  ) into v_settlements
  from (
    select upper(currency) as currency,
      count(*)::bigint as record_count,
      coalesce(sum(amount_minor), 0)::bigint as observed_minor,
      coalesce(sum(amount_minor) filter (where match_status = 'matched'), 0)::bigint as matched_minor,
      coalesce(sum(amount_minor) filter (where reconciliation_status = 'reconciled'), 0)::bigint as reconciled_minor,
      coalesce(sum(amount_minor) filter (where reconciliation_status = 'received_unreconciled'), 0)::bigint as received_unreconciled_minor
    from public.provider_credit_records
    where merchant_id = p_merchant_id
      and observation_authority in ('source_observed', 'receipt_backed_manual')
      and coalesce(observed_at, occurred_at, ingested_at) >= p_period_start
      and coalesce(observed_at, occurred_at, ingested_at) < p_period_end
    group by upper(currency)
  ) grouped;

  select * into v_event from public.record_domain_event(
    p_merchant_id,
    'financial_period.closed',
    'financial_period',
    v_closure_id,
    'financial-period-close:' || p_idempotency_key,
    jsonb_build_object(
      'closure_id', v_closure_id,
      'period', p_period,
      'acknowledged_blocker_ids', v_acknowledged,
      'position_snapshot', v_position,
      'settlement_snapshot', v_settlements,
      'request_fingerprint', v_fingerprint,
      'external_actions_performed', 0
    ),
    null, null, null, 'user', p_actor_id
  );

  insert into public.financial_period_closures (
    id, merchant_id, period, period_start, period_end,
    acknowledged_blocker_ids, position_snapshot, settlement_snapshot,
    note, actor_user_id, idempotency_key, request_fingerprint, domain_event_id
  ) values (
    v_closure_id, p_merchant_id, p_period, p_period_start, p_period_end,
    v_acknowledged, v_position, v_settlements,
    nullif(trim(p_note), ''), p_actor_id, p_idempotency_key, v_fingerprint, v_event.id
  ) returning * into v_closure;

  return jsonb_build_object(
    'closureId', v_closure.id,
    'period', p_period,
    'signedOffAt', v_closure.signed_off_at,
    'position', v_position,
    'settlements', v_settlements,
    'acknowledgedBlockerIds', v_acknowledged,
    'auditReceipt', jsonb_build_object('domainEventId', v_event.id),
    'replayed', false,
    'externalActionsPerformed', 0
  );
end;
$function$;

create or replace function public.record_report_run_snapshot(
  p_merchant_id uuid,
  p_actor_user_id uuid,
  p_report_definition_id text,
  p_scope jsonb,
  p_snapshot jsonb,
  p_record_count integer,
  p_generated_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_existing public.report_run_snapshots;
  v_run public.report_run_snapshots;
  v_event public.domain_events;
  v_scope_hash text;
  v_fingerprint text;
  v_run_id uuid := gen_random_uuid();
begin
  if p_report_definition_id not in (
    'financial', 'loss-causes', 'prevention', 'recovery',
    'policy', 'operations', 'evidence', 'coverage'
  ) then raise exception 'report_definition_invalid' using errcode = '22023'; end if;
  if jsonb_typeof(p_scope) <> 'object' or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'report_snapshot_payload_invalid' using errcode = '22023';
  end if;
  if p_record_count is null or p_record_count < 0 or p_generated_at is null then
    raise exception 'report_snapshot_metadata_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 200 then
    raise exception 'report_snapshot_idempotency_key_required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.merchant_users membership
    where membership.merchant_id = p_merchant_id
      and membership.user_id = p_actor_user_id
      and membership.invite_status = 'active'
  ) then
    raise exception 'report_snapshot_actor_not_active_member' using errcode = '42501';
  end if;

  v_scope_hash := encode(extensions.digest(convert_to(p_scope::text, 'UTF8'), 'sha256'), 'hex');
  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'merchant_id', p_merchant_id,
    'report_definition_id', p_report_definition_id,
    'scope', p_scope,
    'snapshot', p_snapshot,
    'record_count', p_record_count,
    'generated_at', p_generated_at,
    'actor_user_id', p_actor_user_id
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from public.report_run_snapshots
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception 'report_snapshot_idempotency_conflict' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'run', to_jsonb(v_existing),
      'auditReceipt', jsonb_build_object('domainEventId', v_existing.domain_event_id),
      'replayed', true,
      'writesPerformed', 0
    );
  end if;

  select * into v_event from public.record_domain_event(
    p_merchant_id,
    'report.run_recorded',
    'report_run',
    v_run_id,
    'report-run:' || p_idempotency_key,
    jsonb_build_object(
      'report_run_id', v_run_id,
      'report_definition_id', p_report_definition_id,
      'scope_hash', v_scope_hash,
      'record_count', p_record_count,
      'generated_at', p_generated_at,
      'request_fingerprint', v_fingerprint,
      'delivery_enabled', false,
      'external_actions_performed', 0
    ),
    null, null, null, 'user', p_actor_user_id
  );

  insert into public.report_run_snapshots (
    id, merchant_id, report_definition_id, scope, scope_hash, snapshot,
    record_count, generated_at, actor_user_id, idempotency_key,
    request_fingerprint, domain_event_id
  ) values (
    v_run_id, p_merchant_id, p_report_definition_id, p_scope, v_scope_hash, p_snapshot,
    p_record_count, p_generated_at, p_actor_user_id, p_idempotency_key,
    v_fingerprint, v_event.id
  ) returning * into v_run;

  return jsonb_build_object(
    'run', to_jsonb(v_run),
    'auditReceipt', jsonb_build_object('domainEventId', v_event.id),
    'replayed', false,
    'writesPerformed', 1
  );
end;
$function$;

revoke all on function public.bulk_transition_payout_cases(uuid,uuid,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.close_financial_period(uuid,uuid,text,timestamptz,timestamptz,uuid[],text,text) from public, anon, authenticated;
revoke all on function public.record_report_run_snapshot(uuid,uuid,text,jsonb,jsonb,integer,timestamptz,text) from public, anon, authenticated;
grant execute on function public.bulk_transition_payout_cases(uuid,uuid,text,jsonb,text) to service_role;
grant execute on function public.close_financial_period(uuid,uuid,text,timestamptz,timestamptz,uuid[],text,text) to service_role;
grant execute on function public.record_report_run_snapshot(uuid,uuid,text,jsonb,jsonb,integer,timestamptz,text) to service_role;

comment on function public.bulk_transition_payout_cases(uuid,uuid,text,jsonb,text) is
  'Validates an entire merchant case batch before applying atomic assignment, snooze, or merchant-decision transitions.';
comment on function public.close_financial_period(uuid,uuid,text,timestamptz,timestamptz,uuid[],text,text) is
  'Appends a merchant financial-period sign-off with exact blocker acknowledgement and source-backed position snapshots; moves no money.';
comment on function public.record_report_run_snapshot(uuid,uuid,text,jsonb,jsonb,integer,timestamptz,text) is
  'Persists an immutable on-demand report result and audit receipt without scheduling or delivery.';
