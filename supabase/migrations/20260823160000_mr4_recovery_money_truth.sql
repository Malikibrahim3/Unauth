-- MR4: recovery, payment truth, reconciliation, and reporting.
--
-- Money may advance only from observed source facts. Provider approval is not
-- received value, a received credit is not reconciled until a permitted person
-- confirms the source-to-case match, and every correction/reversal is additive.

alter table public.provider_credit_records
  add column if not exists observation_authority text not null default 'legacy_unverified',
  add column if not exists observed_at timestamptz,
  add column if not exists reverses_credit_id uuid references public.provider_credit_records(id) on delete restrict,
  add column if not exists reconciliation_status text not null default 'unmatched',
  add column if not exists state_version integer not null default 1;

do $block$
begin
  alter table public.provider_credit_records
    add constraint provider_credit_records_observation_authority_check
    check (observation_authority in ('source_observed', 'receipt_backed_manual', 'legacy_unverified'));
exception when duplicate_object then null;
end
$block$;

do $block$
begin
  alter table public.provider_credit_records
    add constraint provider_credit_records_reconciliation_status_check
    check (reconciliation_status in ('unmatched', 'candidate', 'received_unreconciled', 'reconciled', 'dismissed', 'reversed'));
exception when duplicate_object then null;
end
$block$;

do $block$
begin
  alter table public.provider_credit_records
    add constraint provider_credit_records_currency_iso_check
    check (currency ~ '^[A-Z]{3}$');
exception when duplicate_object then null;
end
$block$;

create unique index if not exists provider_credit_records_external_identity_unique
  on public.provider_credit_records (merchant_id, provider, external_credit_id, credit_type);

create unique index if not exists case_financial_entries_provider_credit_unique
  on public.case_financial_entries (merchant_id, provider_credit_record_id)
  where provider_credit_record_id is not null;

create table if not exists public.provider_credit_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider_credit_record_id uuid not null references public.provider_credit_records(id) on delete restrict,
  recovery_case_id uuid references public.recovery_cases(id) on delete set null,
  support_payout_case_id uuid references public.support_payout_cases(id) on delete set null,
  event_type text not null check (event_type in (
    'observed', 'candidate', 'matched', 'dismissed', 'reconciled', 'reversed'
  )),
  from_status text,
  to_status text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency character(3) not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  source_record_id uuid references public.source_records(id) on delete set null,
  evidence_item_id uuid references public.evidence_items(id) on delete set null,
  financial_entry_id uuid references public.case_financial_entries(id) on delete set null,
  reverses_event_id uuid references public.provider_credit_events(id) on delete restrict,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);

create index if not exists provider_credit_events_credit_timeline_idx
  on public.provider_credit_events (merchant_id, provider_credit_record_id, created_at, id);
create index if not exists provider_credit_events_recovery_timeline_idx
  on public.provider_credit_events (merchant_id, recovery_case_id, created_at, id)
  where recovery_case_id is not null;

create or replace function public.protect_provider_credit_event_history()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  raise exception 'provider_credit_events_are_append_only' using errcode = '55000';
end;
$function$;

drop trigger if exists trg_provider_credit_events_immutable on public.provider_credit_events;
create trigger trg_provider_credit_events_immutable
before update or delete on public.provider_credit_events
for each row execute function public.protect_provider_credit_event_history();

alter table public.provider_credit_events enable row level security;
drop policy if exists provider_credit_events_member_select on public.provider_credit_events;
create policy provider_credit_events_member_select
  on public.provider_credit_events for select to authenticated
  using (public.is_merchant_member(merchant_id));

grant select on public.provider_credit_events to authenticated;
grant select, insert on public.provider_credit_events to service_role;
revoke insert, update, delete, truncate on public.provider_credit_events from public, anon, authenticated;
revoke update, delete, truncate on public.provider_credit_events from service_role;

-- Recovery receipt state is a projection owned by the source-credit RPC below.
-- Existing manual/provider-position paths can still record approval, rejection,
-- correspondence and write-off, but cannot manufacture received money.
create or replace function public.guard_recovery_money_projection()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if current_setting('app.mr4_credit_projection', true) = 'on' then
    return new;
  end if;
  if new.amount_recovered_minor is distinct from old.amount_recovered_minor
     or new.amount_recovered is distinct from old.amount_recovered
     or (new.status = 'paid' and old.status is distinct from 'paid')
     or (new.claim_readiness in ('credited_unreconciled', 'reconciled')
         and old.claim_readiness is distinct from new.claim_readiness)
     or (new.provider_claim_stage in ('credited', 'reconciled')
         and old.provider_claim_stage is distinct from new.provider_claim_stage) then
    raise exception 'recovery_received_requires_source_credit_match' using errcode = '22023';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_recovery_money_projection_guard on public.recovery_cases;
create trigger trg_recovery_money_projection_guard
before update on public.recovery_cases
for each row execute function public.guard_recovery_money_projection();

create or replace function public.record_provider_credit_v1(
  p_merchant_id uuid,
  p_provider text,
  p_external_credit_id text,
  p_external_claim_id text,
  p_external_order_ref text,
  p_external_shipment_ref text,
  p_credit_type text,
  p_amount_minor bigint,
  p_currency text,
  p_occurred_at timestamptz,
  p_observed_at timestamptz,
  p_observation_authority text,
  p_evidence_item_id uuid,
  p_source_record_id uuid,
  p_recovery_case_id uuid,
  p_support_payout_case_id uuid,
  p_reverses_credit_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_metadata jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_credit public.provider_credit_records;
  v_prior_event public.provider_credit_events;
  v_recovery public.recovery_cases;
  v_reversed public.provider_credit_records;
  v_currency text := upper(trim(p_currency));
  v_request jsonb;
  v_fingerprint text;
begin
  if p_merchant_id is null or coalesce(length(trim(p_provider)), 0) = 0
     or coalesce(length(trim(p_external_credit_id)), 0) = 0 then
    raise exception 'provider_credit_identity_required' using errcode = '22023';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'provider_credit_amount_invalid' using errcode = '22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'provider_credit_currency_invalid' using errcode = '22023';
  end if;
  if p_credit_type not in ('credit', 'refund', 'settlement', 'adjustment', 'reversal') then
    raise exception 'provider_credit_type_invalid' using errcode = '22023';
  end if;
  if p_observation_authority not in ('source_observed', 'receipt_backed_manual') then
    raise exception 'provider_credit_observation_authority_invalid' using errcode = '22023';
  end if;
  if p_observation_authority = 'source_observed' and p_source_record_id is null then
    raise exception 'provider_credit_source_record_required' using errcode = '22023';
  end if;
  if p_observation_authority = 'receipt_backed_manual' and p_evidence_item_id is null then
    raise exception 'provider_credit_receipt_evidence_required' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_idempotency_key)), 0) < 8 then
    raise exception 'provider_credit_idempotency_key_required' using errcode = '22023';
  end if;

  if p_recovery_case_id is not null then
    select * into v_recovery from public.recovery_cases
    where merchant_id = p_merchant_id and id = p_recovery_case_id;
    if not found then raise exception 'recovery_case_not_found' using errcode = 'P0002'; end if;
    if p_support_payout_case_id is distinct from v_recovery.support_payout_case_id then
      raise exception 'provider_credit_case_mismatch' using errcode = '22023';
    end if;
    if upper(v_recovery.currency) <> v_currency then
      raise exception 'provider_credit_currency_mismatch' using errcode = '22023';
    end if;
  end if;
  if p_source_record_id is not null and not exists (
    select 1 from public.source_records
    where merchant_id = p_merchant_id and id = p_source_record_id
  ) then
    raise exception 'provider_credit_source_record_not_found' using errcode = 'P0002';
  end if;
  if p_evidence_item_id is not null and not exists (
    select 1 from public.evidence_items
    where merchant_id = p_merchant_id and id = p_evidence_item_id
  ) then
    raise exception 'provider_credit_evidence_not_found' using errcode = 'P0002';
  end if;

  if p_credit_type = 'reversal' then
    if p_reverses_credit_id is null then
      raise exception 'provider_credit_reversal_target_required' using errcode = '22023';
    end if;
    select * into v_reversed from public.provider_credit_records
    where merchant_id = p_merchant_id and id = p_reverses_credit_id;
    if not found then raise exception 'provider_credit_reversal_target_not_found' using errcode = 'P0002'; end if;
    if v_reversed.credit_type = 'reversal' or upper(v_reversed.currency) <> v_currency
       or p_amount_minor > v_reversed.amount_minor then
      raise exception 'provider_credit_reversal_invalid' using errcode = '22023';
    end if;
  elsif p_reverses_credit_id is not null then
    raise exception 'provider_credit_reversal_target_not_allowed' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'provider', lower(trim(p_provider)),
    'external_credit_id', trim(p_external_credit_id),
    'credit_type', p_credit_type,
    'amount_minor', p_amount_minor,
    'currency', v_currency,
    'authority', p_observation_authority,
    'source_record_id', p_source_record_id,
    'evidence_item_id', p_evidence_item_id,
    'recovery_case_id', p_recovery_case_id,
    'reverses_credit_id', p_reverses_credit_id
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_prior_event from public.provider_credit_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_prior_event.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'provider_credit_idempotency_conflict' using errcode = '22023';
    end if;
    select * into v_credit from public.provider_credit_records
    where merchant_id = p_merchant_id and id = v_prior_event.provider_credit_record_id;
    return jsonb_build_object('credit', to_jsonb(v_credit), 'event', to_jsonb(v_prior_event), 'replayed', true);
  end if;

  insert into public.provider_credit_records (
    merchant_id, provider, external_credit_id, external_claim_id,
    external_order_ref, external_shipment_ref, credit_type, amount_minor,
    currency, occurred_at, observed_at, evidence_item_id, source_record_id,
    match_status, reconciliation_status, recovery_case_id,
    support_payout_case_id, reverses_credit_id, observation_authority,
    idempotency_key, metadata
  ) values (
    p_merchant_id, lower(trim(p_provider)), trim(p_external_credit_id), p_external_claim_id,
    p_external_order_ref, p_external_shipment_ref, p_credit_type, p_amount_minor,
    v_currency, p_occurred_at, coalesce(p_observed_at, now()), p_evidence_item_id, p_source_record_id,
    'unmatched', case when p_credit_type = 'reversal' then 'unmatched' else 'unmatched' end,
    p_recovery_case_id, p_support_payout_case_id, p_reverses_credit_id,
    p_observation_authority, p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('request_fingerprint', v_fingerprint)
  )
  on conflict (merchant_id, provider, external_credit_id, credit_type) do update
  set observed_at = greatest(public.provider_credit_records.observed_at, excluded.observed_at)
  where public.provider_credit_records.amount_minor = excluded.amount_minor
    and public.provider_credit_records.currency = excluded.currency
    and public.provider_credit_records.observation_authority = excluded.observation_authority
  returning * into v_credit;
  if not found then
    raise exception 'provider_credit_external_identity_conflict' using errcode = '22023';
  end if;

  insert into public.provider_credit_events (
    merchant_id, provider_credit_record_id, recovery_case_id, support_payout_case_id,
    event_type, from_status, to_status, amount_minor, currency, actor_user_id,
    source_record_id, evidence_item_id, reason, metadata, idempotency_key
  ) values (
    p_merchant_id, v_credit.id, p_recovery_case_id, p_support_payout_case_id,
    case when p_credit_type = 'reversal' then 'reversed' else 'observed' end,
    null, 'unmatched', p_amount_minor, v_currency, p_actor_user_id,
    p_source_record_id, p_evidence_item_id, p_reason,
    jsonb_build_object('request_fingerprint', v_fingerprint, 'observation_authority', p_observation_authority),
    p_idempotency_key
  ) returning * into v_prior_event;

  return jsonb_build_object('credit', to_jsonb(v_credit), 'event', to_jsonb(v_prior_event), 'replayed', false);
end;
$function$;

create or replace function public.transition_provider_credit_v1(
  p_merchant_id uuid,
  p_recovery_case_id uuid,
  p_provider_credit_record_id uuid,
  p_action text,
  p_expected_version integer,
  p_match_method text,
  p_match_confidence numeric,
  p_actor_user_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_credit public.provider_credit_records;
  v_recovery public.recovery_cases;
  v_original_credit public.provider_credit_records;
  v_original_entry public.case_financial_entries;
  v_financial_entry_id uuid;
  v_prior public.provider_credit_events;
  v_event public.provider_credit_events;
  v_from text;
  v_to text;
  v_net_received bigint := 0;
  v_unreconciled integer := 0;
  v_bound bigint := 0;
  v_request jsonb;
  v_fingerprint text;
  v_domain_event public.domain_events;
begin
  if p_action not in ('candidate', 'matched', 'dismissed', 'reconciled') then
    raise exception 'provider_credit_transition_invalid' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_idempotency_key)), 0) < 8 then
    raise exception 'provider_credit_transition_idempotency_required' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then
    raise exception 'provider_credit_transition_reason_required' using errcode = '22023';
  end if;
  if p_match_confidence is not null and (p_match_confidence < 0 or p_match_confidence > 1) then
    raise exception 'provider_credit_match_confidence_invalid' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id, 'recovery_case_id', p_recovery_case_id,
    'credit_id', p_provider_credit_record_id, 'action', p_action,
    'expected_version', p_expected_version, 'match_method', p_match_method,
    'match_confidence', p_match_confidence, 'actor_user_id', p_actor_user_id,
    'reason', p_reason
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_prior from public.provider_credit_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_prior.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'provider_credit_transition_idempotency_conflict' using errcode = '22023';
    end if;
    select * into v_credit from public.provider_credit_records
    where merchant_id = p_merchant_id and id = v_prior.provider_credit_record_id;
    return jsonb_build_object('credit', to_jsonb(v_credit), 'event', to_jsonb(v_prior), 'replayed', true);
  end if;

  select * into v_credit from public.provider_credit_records
  where merchant_id = p_merchant_id and id = p_provider_credit_record_id
    and recovery_case_id = p_recovery_case_id
  for update;
  if not found then raise exception 'provider_credit_not_found' using errcode = 'P0002'; end if;
  select * into v_recovery from public.recovery_cases
  where merchant_id = p_merchant_id and id = p_recovery_case_id
  for update;
  if not found then raise exception 'recovery_case_not_found' using errcode = 'P0002'; end if;
  if v_credit.state_version <> p_expected_version then
    raise exception 'provider_credit_version_conflict' using errcode = '40001';
  end if;
  if upper(v_credit.currency) <> upper(v_recovery.currency) then
    raise exception 'provider_credit_currency_mismatch' using errcode = '22023';
  end if;
  v_from := v_credit.reconciliation_status;

  if p_action = 'candidate' then
    if v_from not in ('unmatched', 'candidate') then
      raise exception 'provider_credit_candidate_transition_invalid' using errcode = '22023';
    end if;
    v_to := 'candidate';
  elsif p_action = 'dismissed' then
    if v_from not in ('unmatched', 'candidate') then
      raise exception 'provider_credit_dismiss_transition_invalid' using errcode = '22023';
    end if;
    v_to := 'dismissed';
  elsif p_action = 'matched' then
    if v_from not in ('unmatched', 'candidate') then
      raise exception 'provider_credit_match_transition_invalid' using errcode = '22023';
    end if;
    if coalesce(length(trim(p_match_method)), 0) < 3 then
      raise exception 'provider_credit_match_method_required' using errcode = '22023';
    end if;
    v_bound := case when v_recovery.amount_approved_minor > 0
      then v_recovery.amount_approved_minor else v_recovery.amount_sought_minor end;

    if v_credit.credit_type = 'reversal' then
      select * into v_original_credit from public.provider_credit_records
      where merchant_id = p_merchant_id and id = v_credit.reverses_credit_id
      for update;
      if not found or v_original_credit.reconciliation_status not in ('received_unreconciled', 'reconciled') then
        raise exception 'provider_credit_reversal_requires_received_credit' using errcode = '22023';
      end if;
      select * into v_original_entry from public.case_financial_entries
      where merchant_id = p_merchant_id and provider_credit_record_id = v_original_credit.id;
      if not found then raise exception 'provider_credit_reversal_entry_not_found' using errcode = 'P0002'; end if;
      if exists (
        select 1 from public.case_financial_entries
        where merchant_id = p_merchant_id and reverses_entry_id = v_original_entry.id
      ) then
        raise exception 'provider_credit_already_reversed' using errcode = '22023';
      end if;
      insert into public.case_financial_entries (
        merchant_id, support_payout_case_id, loss_case_id, recovery_case_id,
        state, amount_minor, currency, direction, source_record_id,
        effective_at, reverses_entry_id, provider_credit_record_id,
        ledger_kind, component_type, valuation_basis, quantity,
        idempotency_key, metadata
      ) values (
        p_merchant_id, v_recovery.support_payout_case_id, v_recovery.loss_case_id, v_recovery.id,
        'recovered', v_credit.amount_minor, upper(v_credit.currency), 'credit', v_credit.source_record_id,
        coalesce(v_credit.occurred_at, v_credit.observed_at, now()), v_original_entry.id, v_credit.id,
        'provider_recovery', 'reversal', 'source_credit_reversal', 1,
        'provider-credit:' || v_credit.id || ':matched',
        jsonb_build_object('reverses_credit_id', v_original_credit.id, 'actor_user_id', p_actor_user_id)
      ) returning id into v_financial_entry_id;
      update public.provider_credit_records
      set reconciliation_status = 'reversed', match_status = 'matched', match_method = p_match_method,
          match_confidence = p_match_confidence, matched_by = p_actor_user_id, matched_at = now(),
          state_version = state_version + 1, updated_at = now()
      where id = v_credit.id;
      v_to := 'reversed';
    else
      select coalesce(sum(case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end), 0)
      into v_net_received
      from public.case_financial_entries e
      where e.merchant_id = p_merchant_id and e.recovery_case_id = v_recovery.id
        and e.state = 'recovered' and e.provider_credit_record_id is not null;
      if v_net_received + v_credit.amount_minor > v_bound then
        raise exception 'provider_credit_exceeds_recovery_bound' using errcode = '22023';
      end if;
      insert into public.case_financial_entries (
        merchant_id, support_payout_case_id, loss_case_id, recovery_case_id,
        state, amount_minor, currency, direction, source_record_id,
        effective_at, provider_credit_record_id, ledger_kind, component_type,
        valuation_basis, quantity, idempotency_key, metadata
      ) values (
        p_merchant_id, v_recovery.support_payout_case_id, v_recovery.loss_case_id, v_recovery.id,
        'recovered', v_credit.amount_minor, upper(v_credit.currency), 'credit', v_credit.source_record_id,
        coalesce(v_credit.occurred_at, v_credit.observed_at, now()), v_credit.id,
        'provider_recovery', v_credit.credit_type, 'observed_provider_credit', 1,
        'provider-credit:' || v_credit.id || ':matched',
        jsonb_build_object('observation_authority', v_credit.observation_authority, 'actor_user_id', p_actor_user_id)
      ) returning id into v_financial_entry_id;
      update public.provider_credit_records
      set reconciliation_status = 'received_unreconciled', match_status = 'matched',
          support_payout_case_id = v_recovery.support_payout_case_id,
          match_method = p_match_method, match_confidence = p_match_confidence,
          matched_by = p_actor_user_id, matched_at = now(),
          state_version = state_version + 1, updated_at = now()
      where id = v_credit.id;
      v_to := 'received_unreconciled';
    end if;
    perform public.recompute_case_financial_summary(p_merchant_id, v_recovery.support_payout_case_id);
  else
    if v_from <> 'received_unreconciled' then
      raise exception 'provider_credit_reconcile_requires_match' using errcode = '22023';
    end if;
    update public.provider_credit_records
    set reconciliation_status = 'reconciled', state_version = state_version + 1, updated_at = now()
    where id = v_credit.id;
    v_to := 'reconciled';
    select id into v_financial_entry_id from public.case_financial_entries
    where merchant_id = p_merchant_id and provider_credit_record_id = v_credit.id;
  end if;

  if p_action in ('candidate', 'dismissed') then
    update public.provider_credit_records
    set reconciliation_status = v_to,
        match_status = case when p_action = 'candidate' then 'candidate' else 'rejected' end,
        match_method = coalesce(p_match_method, match_method),
        match_confidence = coalesce(p_match_confidence, match_confidence),
        state_version = state_version + 1, updated_at = now()
    where id = v_credit.id;
  end if;

  perform set_config('app.mr4_credit_projection', 'on', true);
  select coalesce(sum(case when e.reverses_entry_id is null then e.amount_minor else -e.amount_minor end), 0)
  into v_net_received
  from public.case_financial_entries e
  where e.merchant_id = p_merchant_id and e.recovery_case_id = v_recovery.id
    and e.state = 'recovered' and e.provider_credit_record_id is not null;
  select count(*) into v_unreconciled
  from public.provider_credit_records c
  where c.merchant_id = p_merchant_id and c.recovery_case_id = v_recovery.id
    and c.reconciliation_status = 'received_unreconciled';
  update public.recovery_cases
  set amount_recovered_minor = greatest(v_net_received, 0),
      amount_recovered = greatest(v_net_received, 0)::numeric / 100,
      provider_claim_stage = case
        when greatest(v_net_received, 0) = 0 then case when amount_approved_minor > 0 then 'approved' else provider_claim_stage end
        when v_unreconciled = 0 and p_action = 'reconciled' then 'reconciled'
        else 'credited'
      end,
      claim_readiness = case
        when greatest(v_net_received, 0) = 0 then 'provider_position_recorded'
        when v_unreconciled = 0 and p_action = 'reconciled' then 'reconciled'
        else 'credited_unreconciled'
      end,
      status = case
        when v_unreconciled = 0 and p_action = 'reconciled'
             and greatest(v_net_received, 0) + amount_written_off_minor >= amount_sought_minor then 'paid'::public.recovery_case_status
        when greatest(v_net_received, 0) > 0 then 'partially_approved'::public.recovery_case_status
        else status
      end,
      updated_at = now()
  where id = v_recovery.id and merchant_id = p_merchant_id;
  perform set_config('app.mr4_credit_projection', 'off', true);

  insert into public.provider_credit_events (
    merchant_id, provider_credit_record_id, recovery_case_id, support_payout_case_id,
    event_type, from_status, to_status, amount_minor, currency, actor_user_id,
    source_record_id, evidence_item_id, financial_entry_id, reason, metadata, idempotency_key
  ) values (
    p_merchant_id, v_credit.id, v_recovery.id, v_recovery.support_payout_case_id,
    case when p_action = 'matched' and v_credit.credit_type = 'reversal' then 'reversed' else p_action end,
    v_from, v_to, v_credit.amount_minor, upper(v_credit.currency), p_actor_user_id,
    v_credit.source_record_id, v_credit.evidence_item_id, v_financial_entry_id, p_reason,
    jsonb_build_object('request_fingerprint', v_fingerprint, 'match_method', p_match_method,
      'match_confidence', p_match_confidence, 'net_received_minor', greatest(v_net_received, 0)),
    p_idempotency_key
  ) returning * into v_event;

  select * into v_domain_event from public.record_domain_event(
    p_merchant_id,
    case when p_action = 'reconciled' then 'provider.credit_reconciled'
      when p_action = 'matched' then 'provider.credit_matched'
      else 'provider.credit_reviewed' end,
    'recovery_case', v_recovery.support_payout_case_id,
    'provider-credit-transition:' || p_idempotency_key,
    jsonb_build_object('recovery_case_id', v_recovery.id, 'provider_credit_record_id', v_credit.id,
      'action', p_action, 'amount_minor', v_credit.amount_minor, 'currency', upper(v_credit.currency),
      'provider_credit_event_id', v_event.id, 'financial_entry_id', v_financial_entry_id,
      'net_received_minor', greatest(v_net_received, 0)),
    v_credit.source_record_id, null, null, 'user', p_actor_user_id, now(), null, null,
    array['caseProjection', 'notificationProjection', 'auditTimelineProjection']
  );

  select * into v_credit from public.provider_credit_records
  where merchant_id = p_merchant_id and id = p_provider_credit_record_id;
  select * into v_recovery from public.recovery_cases
  where merchant_id = p_merchant_id and id = p_recovery_case_id;
  return jsonb_build_object('credit', to_jsonb(v_credit), 'recovery_case', to_jsonb(v_recovery),
    'event', to_jsonb(v_event), 'domain_event_id', v_domain_event.id, 'replayed', false);
end;
$function$;

create or replace function public.recovery_page_v1(
  p_merchant_id uuid,
  p_stage text default 'all',
  p_currency text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
  v_stage_counts jsonb;
  v_currencies jsonb;
  v_currency text := case when p_currency is null then null else upper(trim(p_currency)) end;
begin
  if p_stage not in ('all', 'ready_to_file', 'filed', 'partner_responded', 'received', 'reconciled', 'closed') then
    raise exception 'recovery_page_stage_invalid' using errcode = '22023';
  end if;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'recovery_page_currency_invalid' using errcode = '22023';
  end if;
  v_offset := (v_page - 1) * v_page_size;
  with base as (
    select r.*,
      case
        when r.status = 'closed_unrecoverable' then 'closed'
        when r.claim_readiness = 'reconciled' then 'reconciled'
        when r.amount_recovered_minor > 0 then 'received'
        when r.status in ('approved', 'partially_approved', 'rejected', 'appealed') then 'partner_responded'
        when r.status in ('submitted', 'waiting_response', 'chase_due') then 'filed'
        else 'ready_to_file'
      end as board_stage
    from public.recovery_cases r
    where r.merchant_id = p_merchant_id
      and (v_currency is null or upper(r.currency) = v_currency)
  ), filtered as (
    select * from base b
    where (p_stage = 'all' or b.board_stage = p_stage)
      and (nullif(trim(p_search), '') is null
        or b.id::text ilike '%' || trim(p_search) || '%'
        or b.support_payout_case_id::text ilike '%' || trim(p_search) || '%'
        or exists (select 1 from public.partners p where p.id = b.partner_id and p.merchant_id = p_merchant_id and p.name ilike '%' || trim(p_search) || '%'))
  )
  select count(*) into v_total from filtered;

  with base as (
    select r.*,
      case
        when r.status = 'closed_unrecoverable' then 'closed'
        when r.claim_readiness = 'reconciled' then 'reconciled'
        when r.amount_recovered_minor > 0 then 'received'
        when r.status in ('approved', 'partially_approved', 'rejected', 'appealed') then 'partner_responded'
        when r.status in ('submitted', 'waiting_response', 'chase_due') then 'filed'
        else 'ready_to_file'
      end as board_stage
    from public.recovery_cases r
    where r.merchant_id = p_merchant_id
      and (v_currency is null or upper(r.currency) = v_currency)
  ), filtered as (
    select * from base b
    where (p_stage = 'all' or b.board_stage = p_stage)
      and (nullif(trim(p_search), '') is null
        or b.id::text ilike '%' || trim(p_search) || '%'
        or b.support_payout_case_id::text ilike '%' || trim(p_search) || '%'
        or exists (select 1 from public.partners p where p.id = b.partner_id and p.merchant_id = p_merchant_id and p.name ilike '%' || trim(p_search) || '%'))
    order by b.updated_at desc, b.id desc
    offset v_offset limit v_page_size
  )
  select coalesce(jsonb_agg(to_jsonb(f) || jsonb_build_object(
    'partner', case when p.id is null then null else jsonb_build_object('id', p.id, 'name', p.name, 'partner_type', p.partner_type) end
  ) order by f.updated_at desc, f.id desc), '[]'::jsonb)
  into v_rows
  from filtered f left join public.partners p on p.id = f.partner_id and p.merchant_id = p_merchant_id;

  with stages as (
    select case
      when r.status = 'closed_unrecoverable' then 'closed'
      when r.claim_readiness = 'reconciled' then 'reconciled'
      when r.amount_recovered_minor > 0 then 'received'
      when r.status in ('approved', 'partially_approved', 'rejected', 'appealed') then 'partner_responded'
      when r.status in ('submitted', 'waiting_response', 'chase_due') then 'filed'
      else 'ready_to_file' end as stage
    from public.recovery_cases r
    where r.merchant_id = p_merchant_id and (v_currency is null or upper(r.currency) = v_currency)
  ) select coalesce(jsonb_object_agg(stage, count), '{}'::jsonb) into v_stage_counts
    from (select stage, count(*)::bigint as count from stages group by stage) counts;

  select coalesce(jsonb_agg(currency order by currency), '[]'::jsonb) into v_currencies
  from (
    select distinct upper(r.currency) as currency
    from public.recovery_cases r
    where r.merchant_id = p_merchant_id and r.currency ~* '^[A-Z]{3}$'
  ) currencies;

  return jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size,
    'total_count', v_total, 'total_pages', greatest(1, ceil(v_total::numeric / v_page_size)::integer),
    'stage', p_stage, 'currency', v_currency, 'available_currencies', v_currencies, 'stage_counts', v_stage_counts,
    'stable_order', 'updated_at_desc_id_desc');
end;
$function$;

create or replace function public.reconciliation_page_v1(
  p_merchant_id uuid,
  p_status text default 'open',
  p_source text default null,
  p_currency text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 100);
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
  v_currency text := case when p_currency is null then null else upper(trim(p_currency)) end;
begin
  if p_status not in ('open', 'resolved', 'dismissed', 'all') then
    raise exception 'reconciliation_page_status_invalid' using errcode = '22023';
  end if;
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'reconciliation_page_currency_invalid' using errcode = '22023';
  end if;
  v_offset := (v_page - 1) * v_page_size;
  with filtered as (
    select e.* from public.case_exceptions e
    where e.merchant_id = p_merchant_id
      and (p_status = 'all' or e.status = p_status)
      and (nullif(trim(p_source), '') is null or e.source_system = trim(p_source))
      and (v_currency is null or upper(coalesce(e.context->>'currency', e.context#>>'{source,currency}', e.context#>>'{ledger,currency}')) = v_currency)
      and (nullif(trim(p_search), '') is null or e.id::text ilike '%' || trim(p_search) || '%'
        or e.title ilike '%' || trim(p_search) || '%' or coalesce(e.detail, '') ilike '%' || trim(p_search) || '%')
  ) select count(*) into v_total from filtered;

  with filtered as (
    select e.* from public.case_exceptions e
    where e.merchant_id = p_merchant_id
      and (p_status = 'all' or e.status = p_status)
      and (nullif(trim(p_source), '') is null or e.source_system = trim(p_source))
      and (v_currency is null or upper(coalesce(e.context->>'currency', e.context#>>'{source,currency}', e.context#>>'{ledger,currency}')) = v_currency)
      and (nullif(trim(p_search), '') is null or e.id::text ilike '%' || trim(p_search) || '%'
        or e.title ilike '%' || trim(p_search) || '%' or coalesce(e.detail, '') ilike '%' || trim(p_search) || '%')
    order by e.created_at desc, e.id desc
    offset v_offset limit v_page_size
  ) select coalesce(jsonb_agg(to_jsonb(filtered) order by created_at desc, id desc), '[]'::jsonb)
    into v_rows from filtered;
  return jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size,
    'total_count', v_total, 'total_pages', greatest(1, ceil(v_total::numeric / v_page_size)::integer),
    'status', p_status, 'source', p_source, 'currency', v_currency,
    'stable_order', 'created_at_desc_id_desc');
end;
$function$;

create or replace function public.financial_aggregate_v1(
  p_merchant_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_rows jsonb;
  v_currency text := case when p_currency is null then null else upper(trim(p_currency)) end;
begin
  if v_currency is not null and v_currency !~ '^[A-Z]{3}$' then
    raise exception 'financial_aggregate_currency_invalid' using errcode = '22023';
  end if;
  with scoped as (
    select s.* from public.case_financial_summaries s
    join public.support_payout_cases c
      on c.id = s.support_payout_case_id and c.merchant_id = s.merchant_id
    where s.merchant_id = p_merchant_id
      and (p_from is null or coalesce(c.submitted_at, c.created_at) >= p_from)
      and (p_to is null or coalesce(c.submitted_at, c.created_at) < p_to)
      and (v_currency is null or upper(s.currency::text) = v_currency)
  ), base as (
    select upper(currency::text) as currency,
      count(*)::bigint as case_count,
      coalesce(sum(requested_minor) filter (where known_states @> array['requested']), 0)::bigint as requested_minor,
      coalesce(sum(exposed_minor) filter (where known_states @> array['exposed']), 0)::bigint as exposed_minor,
      coalesce(sum(approved_minor) filter (where known_states @> array['approved']), 0)::bigint as approved_minor,
      coalesce(sum(paid_minor) filter (where known_states @> array['paid']), 0)::bigint as paid_minor,
      coalesce(sum(estimated_loss_minor) filter (where known_states @> array['estimated_loss']), 0)::bigint as estimated_loss_minor,
      coalesce(sum(prevented_minor) filter (where known_states @> array['prevented']), 0)::bigint as prevented_minor,
      coalesce(sum(confirmed_loss_minor) filter (where known_states @> array['confirmed_loss']), 0)::bigint as confirmed_loss_minor,
      coalesce(sum(recoverable_minor) filter (where known_states @> array['recoverable']), 0)::bigint as recoverable_minor,
      coalesce(sum(recovered_minor) filter (where known_states @> array['recovered']), 0)::bigint as recovered_minor,
      coalesce(sum(written_off_minor) filter (where known_states @> array['written_off']), 0)::bigint as written_off_minor,
      coalesce(sum(greatest(recoverable_minor - recovered_minor - written_off_minor, 0))
        filter (where known_states @> array['recoverable']), 0)::bigint as outstanding_minor,
      coalesce(sum(greatest(confirmed_loss_minor - recovered_minor, 0))
        filter (where known_states @> array['confirmed_loss']), 0)::bigint as final_net_loss_minor
    from scoped s
    group by upper(currency::text)
  ), state_counts as (
    select upper(s.currency::text) as currency, state, count(*)::bigint as state_count
    from scoped s cross join lateral unnest(s.known_states) state
    group by upper(s.currency::text), state
  ), state_meta as (
    select currency, array_agg(state order by state) as known_states,
      jsonb_object_agg(state, state_count order by state) as case_counts_by_state
    from state_counts group by currency
  ), currencies as (
    select b.*, coalesce(m.known_states, '{}'::text[]) as known_states,
      coalesce(m.case_counts_by_state, '{}'::jsonb) as case_counts_by_state
    from base b left join state_meta m using (currency)
  ) select coalesce(jsonb_agg(to_jsonb(currencies) order by currency), '[]'::jsonb) into v_rows from currencies;
  return jsonb_build_object('currencies', v_rows, 'from', p_from, 'to', p_to,
    'currency_filter', v_currency, 'definition_version', 'mr4-financial-v1',
    'time_basis', 'case_submitted_at', 'mixed_currency_policy', 'separated',
    'unknown_policy', 'withheld_not_zero');
end;
$function$;

revoke all on function public.record_provider_credit_v1(uuid,text,text,text,text,text,text,bigint,text,timestamptz,timestamptz,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,text) from public;
revoke all on function public.transition_provider_credit_v1(uuid,uuid,uuid,text,integer,text,numeric,uuid,text,text) from public;
revoke all on function public.recovery_page_v1(uuid,text,text,text,integer,integer) from public;
revoke all on function public.reconciliation_page_v1(uuid,text,text,text,text,integer,integer) from public;
revoke all on function public.financial_aggregate_v1(uuid,timestamptz,timestamptz,text) from public;

grant execute on function public.record_provider_credit_v1(uuid,text,text,text,text,text,text,bigint,text,timestamptz,timestamptz,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,text) to service_role;
grant execute on function public.transition_provider_credit_v1(uuid,uuid,uuid,text,integer,text,numeric,uuid,text,text) to service_role;
grant execute on function public.recovery_page_v1(uuid,text,text,text,integer,integer) to service_role;
grant execute on function public.reconciliation_page_v1(uuid,text,text,text,text,integer,integer) to service_role;
grant execute on function public.financial_aggregate_v1(uuid,timestamptz,timestamptz,text) to service_role;

comment on table public.provider_credit_events is
  'MR4 append-only observed-credit, matching, reconciliation, dismissal, and reversal history.';
comment on function public.transition_provider_credit_v1(uuid,uuid,uuid,text,integer,text,numeric,uuid,text,text) is
  'Only a source-observed or receipt-backed credit may become received value; reconciliation is a later append-only transition.';
comment on function public.recovery_page_v1(uuid,text,text,text,integer,integer) is
  'Stable server-backed recovery paging by effective board stage.';
comment on function public.reconciliation_page_v1(uuid,text,text,text,text,integer,integer) is
  'Stable server-backed reconciliation paging with exact totals; no first-100 cap.';
comment on function public.financial_aggregate_v1(uuid,timestamptz,timestamptz,text) is
  'Canonical currency-separated financial aggregates and definition metadata shared by merchant-facing consumers.';
