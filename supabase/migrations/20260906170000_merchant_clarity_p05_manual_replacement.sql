-- Merchant clarity P05 — durable, manual same-item replacement.
--
-- This migration never executes a provider action. It atomically records the
-- merchant authorisation, its exact original lines and a reloadable manual
-- handoff. Later merchant receipts and source observations advance independent
-- external-action states without turning an authorisation into paid/reconciled
-- money.

create table if not exists public.case_replacement_authorisation_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  support_payout_case_id uuid not null references public.support_payout_cases(id) on delete cascade,
  case_decision_id uuid not null references public.case_decisions(id) on delete restrict,
  external_action_id uuid not null references public.connector_action_runs(id) on delete restrict,
  source_order_id uuid not null references public.source_orders(id) on delete restrict,
  case_claimed_item_id uuid not null references public.case_claimed_items(id) on delete restrict,
  source_order_line_id uuid not null references public.source_order_lines(id) on delete restrict,
  line_external_id text not null,
  sku text,
  variant_ref text,
  title text,
  quantity integer not null check (quantity > 0),
  currency character(3) not null check (currency ~ '^[A-Z]{3}$'),
  cost_provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (merchant_id, case_decision_id, case_claimed_item_id)
);

create table if not exists public.case_replacement_corroborations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  replacement_authorisation_item_id uuid not null references public.case_replacement_authorisation_items(id) on delete restrict,
  source_replacement_id uuid not null references public.source_replacements(id) on delete restrict,
  external_action_id uuid not null references public.connector_action_runs(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  source_external_id text not null,
  source_status text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, source_replacement_id)
);

create index if not exists case_replacement_authorisation_line_idx
  on public.case_replacement_authorisation_items (
    merchant_id, source_order_line_id, created_at, id
  );
create index if not exists case_replacement_authorisation_case_idx
  on public.case_replacement_authorisation_items (
    merchant_id, support_payout_case_id, created_at desc, id
  );
create index if not exists case_replacement_corroboration_item_idx
  on public.case_replacement_corroborations (
    merchant_id, replacement_authorisation_item_id, created_at, id
  );

drop trigger if exists case_replacement_authorisation_items_immutable
  on public.case_replacement_authorisation_items;
create trigger case_replacement_authorisation_items_immutable
before update or delete on public.case_replacement_authorisation_items
for each row execute function public.forbid_phase7_history_mutation();

drop trigger if exists case_replacement_corroborations_immutable
  on public.case_replacement_corroborations;
create trigger case_replacement_corroborations_immutable
before update or delete on public.case_replacement_corroborations
for each row execute function public.forbid_phase7_history_mutation();

alter table public.case_replacement_authorisation_items enable row level security;
alter table public.case_replacement_corroborations enable row level security;

drop policy if exists case_replacement_authorisation_items_member_select
  on public.case_replacement_authorisation_items;
create policy case_replacement_authorisation_items_member_select
  on public.case_replacement_authorisation_items
  for select to authenticated
  using (public.is_merchant_member(merchant_id));

drop policy if exists case_replacement_corroborations_member_select
  on public.case_replacement_corroborations;
create policy case_replacement_corroborations_member_select
  on public.case_replacement_corroborations
  for select to authenticated
  using (public.is_merchant_member(merchant_id));

revoke all on public.case_replacement_authorisation_items from public, anon, authenticated;
revoke all on public.case_replacement_corroborations from public, anon, authenticated;
grant select on public.case_replacement_authorisation_items to authenticated;
grant select on public.case_replacement_corroborations to authenticated;
grant all on public.case_replacement_authorisation_items to service_role;
grant all on public.case_replacement_corroborations to service_role;

create or replace function public.record_same_item_replacement_v1(
  p_merchant_id uuid,
  p_case_id uuid,
  p_expected_version bigint,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_budget_minor bigint,
  p_currency text,
  p_reason text,
  p_duplicate_concession_justification text,
  p_items jsonb,
  p_recommendation_snapshot jsonb,
  p_followed_recommendation boolean,
  p_related_source_object jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_case public.support_payout_cases;
  v_order public.source_orders;
  v_claimed public.case_claimed_items;
  v_line public.source_order_lines;
  v_existing_decision public.case_decisions;
  v_connection public.merchant_integrations;
  v_source_account public.source_accounts;
  v_action public.connector_action_runs;
  v_decision_result jsonb;
  v_item jsonb;
  v_validated_items jsonb := '[]'::jsonb;
  v_selected_quantity integer;
  v_confirmed_quantity bigint;
  v_outstanding_quantity bigint;
  v_available_quantity bigint;
  v_prior_refund_count bigint := 0;
  v_currency text := upper(nullif(btrim(p_currency), ''));
  v_provider_domain text;
  v_provider_order_id text;
  v_provider_href text;
  v_payload jsonb;
  v_action_id uuid;
  v_decision_id uuid;
  v_outcome_id uuid;
  v_domain_event_id uuid;
  v_request_items jsonb;
  v_replay_items jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 8 then
    raise exception 'replacement_idempotency_key_required' using errcode = '22023';
  end if;
  if p_budget_minor is null or p_budget_minor < 0 then
    raise exception 'replacement_budget_required' using errcode = '22023';
  end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'replacement_currency_invalid' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then
    raise exception 'replacement_rationale_required' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'replacement_items_required' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item ->> 'claimed_item_id'
    having count(*) > 1
  ) then
    raise exception 'replacement_item_ids_must_be_unique' using errcode = '22023';
  end if;

  select * into v_existing_decision
  from public.case_decisions
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found and (
    v_existing_decision.support_payout_case_id is distinct from p_case_id
    or v_existing_decision.action is distinct from 'same_item_replacement'
  ) then
    raise exception 'replacement_idempotency_conflict' using errcode = '23505';
  end if;
  if v_existing_decision.id is not null then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'claimed_item_id', item ->> 'claimed_item_id',
        'quantity', (item ->> 'quantity')::integer
      ) order by item ->> 'claimed_item_id'
    ), '[]'::jsonb)
    into v_request_items
    from jsonb_array_elements(p_items) item;
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'claimed_item_id', authorised.case_claimed_item_id::text,
        'quantity', authorised.quantity
      ) order by authorised.case_claimed_item_id::text
    ), '[]'::jsonb)
    into v_replay_items
    from public.case_replacement_authorisation_items authorised
    where authorised.merchant_id = p_merchant_id
      and authorised.case_decision_id = v_existing_decision.id;
    if v_existing_decision.amount_minor is distinct from p_budget_minor
       or upper(v_existing_decision.currency) is distinct from v_currency
       or v_existing_decision.reason is distinct from p_reason
       or v_existing_decision.actor_user_id is distinct from p_actor_user_id
       or v_request_items is distinct from v_replay_items
       or (v_existing_decision.recommendation_snapshot ->> 'comparison_token')
          is distinct from (p_recommendation_snapshot ->> 'comparison_token')
       or (v_existing_decision.recommendation_snapshot ->> 'comparison_version')
          is distinct from (p_recommendation_snapshot ->> 'comparison_version')
       or (v_existing_decision.recommendation_snapshot ->> 'duplicate_concession_justification')
          is distinct from nullif(btrim(p_duplicate_concession_justification), '') then
      raise exception 'replacement_idempotency_conflict' using errcode = '23505';
    end if;
    select * into v_action
    from public.connector_action_runs
    where merchant_id = p_merchant_id
      and idempotency_key = 'replacement-handoff:' || v_existing_decision.id::text;
    if not found then
      raise exception 'replacement_atomic_record_incomplete';
    end if;
    select id into v_outcome_id
    from public.claim_outcomes where claim_id = p_case_id;
    select id into v_domain_event_id
    from public.domain_events
    where merchant_id = p_merchant_id
      and idempotency_key = 'case-decision:' || p_idempotency_key;
    return jsonb_build_object(
      'decision_id', v_existing_decision.id,
      'outcome_id', v_outcome_id,
      'domain_event_id', v_domain_event_id,
      'case_id', p_case_id,
      'new_version', null,
      'action', to_jsonb(v_action),
      'replacement_items', v_existing_decision.recommendation_snapshot -> 'replacement_items',
      'replayed', true
    );
  end if;

  select * into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id and id = p_case_id
  for update;
  if not found then
    raise exception 'replacement_case_not_found' using errcode = 'P0002';
  end if;
  if v_existing_decision.id is null and v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;
  if v_case.source_order_id is null then
    raise exception 'replacement_confirmed_order_required' using errcode = '22023';
  end if;

  select * into v_order
  from public.source_orders
  where merchant_id = p_merchant_id and id = v_case.source_order_id;
  if not found then
    raise exception 'replacement_order_not_found' using errcode = 'P0002';
  end if;
  if v_order.source::text <> 'shopify' then
    raise exception 'replacement_shopify_order_required' using errcode = '22023';
  end if;
  if upper(coalesce(v_order.currency, '')) is distinct from v_currency then
    raise exception 'replacement_currency_must_match_order' using errcode = '22023';
  end if;

  if v_order.source_account_id is not null then
    select * into v_source_account
    from public.source_accounts
    where merchant_id = p_merchant_id and id = v_order.source_account_id;
  end if;
  select * into v_connection
  from public.merchant_integrations
  where merchant_id = p_merchant_id
    and id = coalesce(v_source_account.connection_id, v_order.connection_id);
  if not found
     or v_connection.provider_id <> 'shopify'
     or v_connection.status <> 'connected'
     or v_connection.last_verification_status <> 'verified' then
    raise exception 'replacement_verified_shopify_connection_required' using errcode = '22023';
  end if;

  v_provider_domain := regexp_replace(
    lower(coalesce(v_connection.provider_account_id, v_source_account.external_account_id, v_source_account.base_url, '')),
    '^https?://', '', 'i'
  );
  v_provider_domain := regexp_replace(v_provider_domain, '/+$', '');
  v_provider_order_id := regexp_replace(v_order.external_id, '^.*/', '');
  if v_provider_domain !~ '^[a-z0-9][a-z0-9.-]*\.myshopify\.com$'
     or v_provider_order_id !~ '^[0-9]+$' then
    raise exception 'replacement_provider_destination_unavailable' using errcode = '22023';
  end if;
  v_provider_href := 'https://' || v_provider_domain || '/admin/orders/' || v_provider_order_id;

  select
    (select count(*) from public.source_refunds refund
      where refund.merchant_id = p_merchant_id
        and refund.source_order_id = v_order.id)
    +
    (select count(*) from public.case_outcome_events outcome
      where outcome.merchant_id = p_merchant_id
        and outcome.support_payout_case_id = p_case_id
        and outcome.outcome_type = 'cash_refund'
        and outcome.state in ('reported', 'observed_pending', 'observed_success', 'merchant_confirmed'))
    +
    (select count(*) from public.case_decisions decision_row
      where decision_row.merchant_id = p_merchant_id
        and decision_row.support_payout_case_id = p_case_id
        and decision_row.action in ('refund', 'partial_refund', 'full_refund'))
  into v_prior_refund_count;
  if v_prior_refund_count > 0
     and coalesce(length(btrim(p_duplicate_concession_justification)), 0) < 3 then
    raise exception 'replacement_duplicate_concession_justification_required' using errcode = '22023';
  end if;

  -- Lock every selected original line in deterministic UUID order before the
  -- per-item calculations. Concurrent authorisations on different cases for
  -- the same order therefore serialize instead of over-authorising or taking
  -- opposite lock orders.
  perform line.id
  from public.case_claimed_items claimed
  join public.source_order_lines line
    on line.merchant_id = claimed.merchant_id
   and line.id = claimed.source_order_line_id
  where claimed.merchant_id = p_merchant_id
    and claimed.support_payout_case_id = p_case_id
    and claimed.id in (
      select (item ->> 'claimed_item_id')::uuid
      from jsonb_array_elements(p_items) item
    )
  order by line.id
  for update of line;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_selected_quantity := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'replacement_quantity_invalid' using errcode = '22023';
    end;
    if v_selected_quantity <= 0 then
      raise exception 'replacement_quantity_invalid' using errcode = '22023';
    end if;

    select * into v_claimed
    from public.case_claimed_items
    where merchant_id = p_merchant_id
      and support_payout_case_id = p_case_id
      and id = nullif(v_item ->> 'claimed_item_id', '')::uuid
      and match_status = 'confirmed'
      and source_order_line_id is not null;
    if not found then
      raise exception 'replacement_confirmed_item_required' using errcode = '22023';
    end if;

    select * into v_line
    from public.source_order_lines
    where merchant_id = p_merchant_id
      and source_order_id = v_order.id
      and id = v_claimed.source_order_line_id
    for update;
    if not found then
      raise exception 'replacement_original_line_not_found' using errcode = 'P0002';
    end if;
    if v_line.quantity is null or v_line.quantity <= 0
       or v_claimed.claimed_quantity <= 0
       or (v_claimed.claimed_sku is not null and v_claimed.claimed_sku is distinct from v_line.sku)
       or (v_claimed.claimed_variant_ref is not null and v_claimed.claimed_variant_ref is distinct from v_line.variant_ref) then
      raise exception 'replacement_same_item_identity_invalid' using errcode = '22023';
    end if;

    select coalesce(sum(
      case
        when coalesce(replacement.raw_metadata ->> 'quantity', '') ~ '^[1-9][0-9]*$'
          then (replacement.raw_metadata ->> 'quantity')::integer
        else 1
      end
    ), 0)
    into v_confirmed_quantity
    from public.source_replacements replacement
    where replacement.merchant_id = p_merchant_id
      and replacement.source_order_id = v_order.id
      and replacement.original_line_ref = v_line.external_id
      and lower(coalesce(replacement.source_status, replacement.status, '')) in (
        'accepted', 'confirmed', 'processing', 'shipped', 'fulfilled',
        'delivered', 'success', 'succeeded', 'complete', 'completed'
      );

    select coalesce(sum(greatest(authorised.quantity - coalesce(corroborated.quantity, 0), 0)), 0)
    into v_outstanding_quantity
    from public.case_replacement_authorisation_items authorised
    join public.case_decisions decision_row
      on decision_row.id = authorised.case_decision_id
     and decision_row.merchant_id = authorised.merchant_id
    join public.connector_action_runs action_row
      on action_row.id = authorised.external_action_id
     and action_row.merchant_id = authorised.merchant_id
    left join lateral (
      select sum(corroboration.quantity)::bigint as quantity
      from public.case_replacement_corroborations corroboration
      where corroboration.merchant_id = authorised.merchant_id
        and corroboration.replacement_authorisation_item_id = authorised.id
    ) corroborated on true
    where authorised.merchant_id = p_merchant_id
      and authorised.source_order_line_id = v_line.id
      and authorised.case_decision_id is distinct from v_existing_decision.id
      and (
        not exists (
          select 1 from public.case_decisions reversal
          where reversal.merchant_id = authorised.merchant_id
            and reversal.reverses_decision_id = decision_row.id
        )
        or action_row.merchant_reported_at is not null
        or action_row.observed_at is not null
        or action_row.action_state in ('source_observed_attempt', 'provider_accepted', 'provider_processing', 'succeeded', 'reconciled')
      );

    v_available_quantity := least(v_claimed.claimed_quantity, v_line.quantity)
      - v_confirmed_quantity - v_outstanding_quantity;
    if v_selected_quantity > greatest(v_available_quantity, 0) then
      raise exception 'replacement_quantity_exceeds_available' using errcode = '22023';
    end if;

    v_validated_items := v_validated_items || jsonb_build_array(jsonb_build_object(
      'claimed_item_id', v_claimed.id,
      'source_order_line_id', v_line.id,
      'line_external_id', v_line.external_id,
      'sku', v_line.sku,
      'variant_ref', v_line.variant_ref,
      'title', coalesce(v_line.title, v_claimed.claimed_title),
      'quantity', v_selected_quantity,
      'claimed_quantity', v_claimed.claimed_quantity,
      'ordered_quantity', v_line.quantity,
      'confirmed_replacement_quantity', v_confirmed_quantity,
      'outstanding_authorised_quantity', v_outstanding_quantity,
      'same_item_basis', 'source_order_line_id',
      'cost_provenance', jsonb_build_object(
        'unit_cost_minor', v_line.cost_minor,
        'currency', v_line.currency,
        'basis', case when v_line.cost_minor is null then 'unavailable' else 'source_order_line_cost' end
      )
    ));
  end loop;

  v_decision_result := public.record_case_decision(
    p_merchant_id,
    p_case_id,
    p_expected_version,
    'approved',
    'same_item_replacement',
    p_budget_minor,
    v_currency,
    p_reason,
    p_actor_user_id,
    coalesce(p_recommendation_snapshot, '{}'::jsonb) || jsonb_build_object(
      'replacement_items', v_validated_items,
      'duplicate_concession_justification', nullif(btrim(p_duplicate_concession_justification), '')
    ),
    p_followed_recommendation,
    coalesce(p_related_source_object, '{}'::jsonb) || jsonb_build_object(
      'source_order_id', v_order.id,
      'replacement_items', v_validated_items,
      'authorised_budget_minor', p_budget_minor,
      'currency', v_currency,
      'duplicate_concession_justification', nullif(btrim(p_duplicate_concession_justification), '')
    ),
    p_idempotency_key,
    false
  );
  v_decision_id := (v_decision_result ->> 'decision_id')::uuid;

  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id
    and idempotency_key = 'replacement-handoff:' || v_decision_id::text;
  if found then
    return v_decision_result || jsonb_build_object(
      'action', to_jsonb(v_action),
      'replacement_items', v_validated_items,
      'replayed', true
    );
  end if;

  v_payload := jsonb_build_object(
    'contract_version', 'manual-same-item-replacement-v1',
    'decision_id', v_decision_id,
    'operation', 'replacement',
    'external_action_performed', false,
    'authorised_budget_minor', p_budget_minor,
    'currency', v_currency,
    'rationale', btrim(p_reason),
    'duplicate_concession_justification', nullif(btrim(p_duplicate_concession_justification), ''),
    'items', v_validated_items,
    'provider', jsonb_build_object(
      'id', 'shopify',
      'environment', v_connection.environment,
      'account_id', v_connection.provider_account_id,
      'account_name', v_connection.provider_account_name,
      'connection_status', v_connection.status,
      'verified_at', v_connection.last_verified_at
    ),
    'source_object', jsonb_build_object(
      'type', 'order',
      'id', v_order.id,
      'external_id', v_order.external_id,
      'reference', coalesce(v_order.order_number, v_order.external_id),
      'internal_href', '/orders/' || v_order.id::text,
      'provider_href', v_provider_href
    ),
    'manual_instructions', jsonb_build_object(
      'summary', 'Create a same-item replacement in Shopify for the exact original lines and quantities below.',
      'steps', jsonb_build_array(
        'Open the verified original Shopify order.',
        'Use only the listed original line items and quantities; do not substitute a SKU or variant.',
        'Keep the total replacement cost within the authorised budget.',
        'Complete any address, stock, shipment, and customer-notification checks in Shopify.',
        'Return here and record the Shopify replacement reference or retained receipt.'
      )
    )
  );

  insert into public.connector_action_runs (
    merchant_id, connection_id, support_payout_case_id, capability_id,
    external_record_id, payload, status, action_state, state_version,
    request_fingerprint, requested_operation, amount_minor, currency,
    idempotency_key, actor_user_id, result, completed_at
  ) values (
    p_merchant_id, v_connection.id, p_case_id, 'replacement.manual_handoff',
    v_order.external_id, v_payload, 'manual_required', 'handoff_ready', 1,
    encode(extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256'), 'hex'),
    'replacement', p_budget_minor, v_currency,
    'replacement-handoff:' || v_decision_id::text, p_actor_user_id,
    jsonb_build_object(
      'action_state', 'handoff_ready',
      'external_action_performed', false,
      'provider_response', null
    ),
    null
  ) returning * into v_action;
  v_action_id := v_action.id;

  insert into public.case_replacement_authorisation_items (
    merchant_id, support_payout_case_id, case_decision_id, external_action_id,
    source_order_id, case_claimed_item_id, source_order_line_id,
    line_external_id, sku, variant_ref, title, quantity, currency, cost_provenance
  )
  select
    p_merchant_id, p_case_id, v_decision_id, v_action_id,
    v_order.id,
    (item ->> 'claimed_item_id')::uuid,
    (item ->> 'source_order_line_id')::uuid,
    item ->> 'line_external_id', item ->> 'sku', item ->> 'variant_ref',
    item ->> 'title', (item ->> 'quantity')::integer, v_currency,
    coalesce(item -> 'cost_provenance', '{}'::jsonb)
  from jsonb_array_elements(v_validated_items) item;

  perform public.record_domain_event(
    p_merchant_id,
    'external_action.handoff_ready',
    'external_action',
    v_action_id,
    'replacement-action:' || v_action_id::text || ':handoff-ready',
    jsonb_build_object(
      'action_id', v_action_id,
      'case_id', p_case_id,
      'decision_id', v_decision_id,
      'capability_id', 'replacement.manual_handoff',
      'state_version', 1,
      'external_action_performed', false
    ),
    null, v_connection.id, null, 'user', p_actor_user_id, v_now,
    null, null, array['auditTimelineProjection', 'workProjection']
  );

  return v_decision_result || jsonb_build_object(
    'action', to_jsonb(v_action),
    'replacement_items', v_validated_items,
    'replayed', false
  );
end;
$function$;

create or replace function public.report_replacement_dispatch_v1(
  p_merchant_id uuid,
  p_action_id uuid,
  p_actor_user_id uuid,
  p_expected_version bigint,
  p_idempotency_key text,
  p_method text,
  p_external_reference text default null,
  p_receipt_evidence jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_action public.connector_action_runs;
begin
  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id and id = p_action_id;
  if not found or v_action.capability_id <> 'replacement.manual_handoff' then
    raise exception 'replacement_action_not_found' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_external_reference), '') is null
     and (p_receipt_evidence is null or p_receipt_evidence = '{}'::jsonb) then
    raise exception 'replacement_dispatch_receipt_required' using errcode = '22023';
  end if;

  return public.transition_external_action_v1(
    p_merchant_id, p_action_id, p_actor_user_id, 'merchant',
    'merchant_reported_attempt', p_expected_version, p_idempotency_key,
    p_external_reference, p_method, p_receipt_evidence,
    null, null, null, null, null, null
  );
end;
$function$;

create or replace function public.corroborate_replacement_handoff_v1(
  p_merchant_id uuid,
  p_source_replacement_id uuid,
  p_observed_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_source public.source_replacements;
  v_authorised public.case_replacement_authorisation_items;
  v_existing public.case_replacement_corroborations;
  v_action public.connector_action_runs;
  v_transition jsonb;
  v_quantity integer;
  v_remaining bigint;
  v_all_observed boolean;
  v_state text;
  v_version bigint;
  v_confirmed boolean;
  v_now timestamptz := coalesce(p_observed_at, clock_timestamp());
begin
  select * into v_source
  from public.source_replacements
  where merchant_id = p_merchant_id and id = p_source_replacement_id
  for update;
  if not found then
    raise exception 'replacement_source_record_not_found' using errcode = 'P0002';
  end if;

  select * into v_existing
  from public.case_replacement_corroborations
  where merchant_id = p_merchant_id and source_replacement_id = p_source_replacement_id;
  if found then
    select * into v_action
    from public.connector_action_runs
    where merchant_id = p_merchant_id and id = v_existing.external_action_id;
    return jsonb_build_object('matched', true, 'replayed', true, 'action', to_jsonb(v_action));
  end if;

  if v_source.source_order_id is null or nullif(btrim(v_source.original_line_ref), '') is null then
    return jsonb_build_object('matched', false, 'replayed', false, 'reason', 'source_identity_incomplete');
  end if;
  v_quantity := case
    when coalesce(v_source.raw_metadata ->> 'quantity', '') ~ '^[1-9][0-9]*$'
      then (v_source.raw_metadata ->> 'quantity')::integer
    else 1
  end;

  select authorised.* into v_authorised
  from public.case_replacement_authorisation_items authorised
  where authorised.merchant_id = p_merchant_id
    and authorised.source_order_id = v_source.source_order_id
    and authorised.line_external_id = v_source.original_line_ref
    and authorised.quantity - coalesce((
      select sum(corroboration.quantity)
      from public.case_replacement_corroborations corroboration
      where corroboration.merchant_id = authorised.merchant_id
        and corroboration.replacement_authorisation_item_id = authorised.id
    ), 0) >= v_quantity
  order by authorised.created_at, authorised.id
  limit 1
  for update;
  if not found then
    return jsonb_build_object('matched', false, 'replayed', false, 'reason', 'no_exact_authorisation');
  end if;
  if v_source.currency is not null
     and upper(v_source.currency::text) is distinct from v_authorised.currency::text then
    return jsonb_build_object('matched', false, 'replayed', false, 'reason', 'currency_mismatch');
  end if;

  insert into public.case_replacement_corroborations (
    merchant_id, replacement_authorisation_item_id, source_replacement_id,
    external_action_id, quantity, source_external_id, source_status, observed_at
  ) values (
    p_merchant_id, v_authorised.id, v_source.id, v_authorised.external_action_id,
    v_quantity, v_source.external_id, coalesce(v_source.source_status, v_source.status), v_now
  );

  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id and id = v_authorised.external_action_id;
  v_state := v_action.action_state;
  v_version := v_action.state_version;
  if v_state in ('handoff_ready', 'merchant_reported_attempt', 'failed', 'indeterminate') then
    v_transition := public.transition_external_action_v1(
      p_merchant_id, v_action.id, null, 'source', 'source_observed_attempt',
      v_version, 'replacement-source:' || v_source.id::text || ':observed',
      null, null, null, null, v_source.external_id,
      coalesce(v_source.source_status, v_source.status), null,
      'shopify.replacement', v_now
    );
    v_state := v_transition -> 'action' ->> 'action_state';
    v_version := (v_transition -> 'action' ->> 'state_version')::bigint;
  end if;
  if v_state = 'source_observed_attempt' then
    v_transition := public.transition_external_action_v1(
      p_merchant_id, v_action.id, null, 'source', 'provider_accepted',
      v_version, 'replacement-source:' || v_source.id::text || ':accepted',
      null, null, null, null, v_source.external_id,
      coalesce(v_source.source_status, v_source.status), null,
      'shopify.replacement', v_now
    );
    v_state := v_transition -> 'action' ->> 'action_state';
    v_version := (v_transition -> 'action' ->> 'state_version')::bigint;
  end if;

  select coalesce(sum(corroborated.quantity), 0) >= coalesce(sum(authorised.quantity), 0)
  into v_all_observed
  from public.case_replacement_authorisation_items authorised
  left join lateral (
    select sum(corroboration.quantity)::bigint as quantity
    from public.case_replacement_corroborations corroboration
    where corroboration.merchant_id = authorised.merchant_id
      and corroboration.replacement_authorisation_item_id = authorised.id
  ) corroborated on true
  where authorised.merchant_id = p_merchant_id
    and authorised.external_action_id = v_action.id;
  v_confirmed := lower(coalesce(v_source.source_status, v_source.status, '')) in (
    'shipped', 'fulfilled', 'delivered', 'success', 'succeeded', 'complete', 'completed'
  );
  if v_all_observed and v_confirmed and v_state in ('source_observed_attempt', 'provider_accepted', 'provider_processing') then
    v_transition := public.transition_external_action_v1(
      p_merchant_id, v_action.id, null, 'source', 'succeeded',
      v_version, 'replacement-source:' || v_source.id::text || ':succeeded',
      null, null, null, null, v_source.external_id,
      coalesce(v_source.source_status, v_source.status), null,
      'shopify.replacement', v_now
    );
  end if;

  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id and id = v_authorised.external_action_id;
  return jsonb_build_object('matched', true, 'replayed', false, 'action', to_jsonb(v_action));
end;
$function$;

create or replace function public.project_source_replacement_handoff_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform public.corroborate_replacement_handoff_v1(
    new.merchant_id,
    new.id,
    coalesce(new.issued_at, new.updated_at, new.created_at, clock_timestamp())
  );
  return new;
end;
$function$;

create or replace function public.record_replacement_cost_v1(
  p_merchant_id uuid,
  p_case_id uuid,
  p_action_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_amount_minor bigint,
  p_currency text,
  p_reason text,
  p_occurred_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_action public.connector_action_runs;
  v_existing public.case_outcome_events;
  v_outcome public.case_outcome_events;
  v_entry public.case_financial_entries;
  v_event public.domain_events;
  v_currency text := upper(nullif(btrim(p_currency), ''));
  v_request jsonb;
  v_fingerprint text;
  v_now timestamptz := coalesce(p_occurred_at, clock_timestamp());
begin
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 8 then
    raise exception 'replacement_cost_idempotency_key_required' using errcode = '22023';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'replacement_cost_amount_invalid' using errcode = '22023';
  end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'replacement_cost_currency_invalid' using errcode = '22023';
  end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then
    raise exception 'replacement_cost_reason_required' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'merchant_id', p_merchant_id,
    'case_id', p_case_id,
    'action_id', p_action_id,
    'actor_user_id', p_actor_user_id,
    'amount_minor', p_amount_minor,
    'currency', v_currency,
    'reason', btrim(p_reason),
    'occurred_at', p_occurred_at
  );
  v_fingerprint := encode(extensions.digest(convert_to(v_request::text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing
  from public.case_outcome_events
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.metadata ->> 'request_fingerprint' is distinct from v_fingerprint then
      raise exception 'replacement_cost_idempotency_conflict' using errcode = '23505';
    end if;
    select * into v_entry
    from public.case_financial_entries
    where merchant_id = p_merchant_id and case_outcome_event_id = v_existing.id;
    return jsonb_build_object(
      'outcome', to_jsonb(v_existing),
      'financial_entry', to_jsonb(v_entry),
      'replayed', true
    );
  end if;

  select * into v_action
  from public.connector_action_runs
  where merchant_id = p_merchant_id
    and support_payout_case_id = p_case_id
    and id = p_action_id
  for update;
  if not found or v_action.capability_id <> 'replacement.manual_handoff' then
    raise exception 'replacement_cost_action_not_found' using errcode = 'P0002';
  end if;
  if v_action.action_state not in (
    'merchant_reported_attempt', 'source_observed_attempt', 'provider_accepted',
    'provider_processing', 'succeeded', 'reconciled'
  ) or v_action.merchant_reported_at is null then
    raise exception 'replacement_cost_dispatch_receipt_required' using errcode = '22023';
  end if;
  if v_action.external_reference is null and v_action.receipt_evidence is null then
    raise exception 'replacement_cost_dispatch_receipt_required' using errcode = '22023';
  end if;
  if upper(v_action.currency::text) is distinct from v_currency then
    raise exception 'replacement_cost_currency_mismatch' using errcode = '22023';
  end if;

  insert into public.case_outcome_events (
    merchant_id, support_payout_case_id, outcome_type, state,
    source_system, source_external_id, correlation_method, match_status,
    amount_minor, currency, occurred_at, observed_at, actor_user_id,
    idempotency_key, override_reason, metadata
  ) values (
    p_merchant_id, p_case_id, 'replacement', 'merchant_confirmed',
    'merchant_manual', v_action.external_reference,
    'receipt_backed_manual_record', 'matched',
    p_amount_minor, v_currency, v_now, v_now, p_actor_user_id,
    p_idempotency_key, btrim(p_reason), jsonb_build_object(
      'external_action_id', p_action_id,
      'dispatch_receipt_evidence', v_action.receipt_evidence,
      'cost_stage', 'actual_cost_incurred',
      'request_fingerprint', v_fingerprint
    )
  ) returning * into v_outcome;

  select * into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.replacement_cost_recorded',
    'case', p_case_id,
    'replacement-cost:' || v_outcome.id::text,
    jsonb_build_object(
      'case_id', p_case_id,
      'action_id', p_action_id,
      'outcome_id', v_outcome.id,
      'amount_minor', p_amount_minor,
      'currency', v_currency,
      'money_stage', 'actual_cost_incurred'
    ),
    null, v_action.connection_id, null, 'user', p_actor_user_id, v_now,
    null, null, array[]::text[]
  );

  insert into public.case_financial_entries (
    merchant_id, support_payout_case_id, state, amount_minor, currency,
    direction, domain_event_id, effective_at, idempotency_key,
    ledger_kind, component_type, valuation_basis, quantity,
    case_outcome_event_id, metadata
  ) values (
    p_merchant_id, p_case_id, 'confirmed_loss', p_amount_minor, v_currency,
    'debit', v_event.id, v_now,
    'replacement-cost:' || v_outcome.id::text,
    'merchant_economic_loss', 'same_item_replacement',
    'replacement_actual_cost', 1, v_outcome.id,
    jsonb_build_object(
      'external_action_id', p_action_id,
      'merchant_confirmed', true,
      'source_corroborated', v_action.observed_at is not null
    )
  ) returning * into v_entry;

  perform public.recompute_case_financial_summary(p_merchant_id, p_case_id);

  return jsonb_build_object(
    'outcome', to_jsonb(v_outcome),
    'financial_entry', to_jsonb(v_entry),
    'replayed', false
  );
end;
$function$;

drop trigger if exists source_replacement_handoff_projection
  on public.source_replacements;
create trigger source_replacement_handoff_projection
after insert or update of status, source_status, original_line_ref, currency, raw_metadata
on public.source_replacements
for each row execute function public.project_source_replacement_handoff_v1();

revoke all on function public.record_same_item_replacement_v1(uuid, uuid, bigint, uuid, text, bigint, text, text, text, jsonb, jsonb, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_same_item_replacement_v1(uuid, uuid, bigint, uuid, text, bigint, text, text, text, jsonb, jsonb, boolean, jsonb)
  to service_role;

revoke all on function public.report_replacement_dispatch_v1(uuid, uuid, uuid, bigint, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.report_replacement_dispatch_v1(uuid, uuid, uuid, bigint, text, text, text, jsonb)
  to service_role;

revoke all on function public.corroborate_replacement_handoff_v1(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.corroborate_replacement_handoff_v1(uuid, uuid, timestamptz)
  to service_role;

revoke all on function public.project_source_replacement_handoff_v1()
  from public, anon, authenticated;
grant execute on function public.project_source_replacement_handoff_v1()
  to service_role;

revoke all on function public.record_replacement_cost_v1(uuid, uuid, uuid, uuid, text, bigint, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_replacement_cost_v1(uuid, uuid, uuid, uuid, text, bigint, text, text, timestamptz)
  to service_role;
