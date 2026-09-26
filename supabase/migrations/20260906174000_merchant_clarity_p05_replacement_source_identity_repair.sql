-- P05 forward repair: when Shopify supplies a case/reference identity, bind a
-- source replacement to that identity before using original-order-line order.
-- This prevents two valid authorisations for the same line from being matched
-- by transaction timestamp or UUID ordering.

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
  join public.case_decisions decision_row
    on decision_row.merchant_id = authorised.merchant_id
   and decision_row.id = authorised.case_decision_id
  join public.connector_action_runs action_row
    on action_row.merchant_id = authorised.merchant_id
   and action_row.id = authorised.external_action_id
  where authorised.merchant_id = p_merchant_id
    and authorised.source_order_id = v_source.source_order_id
    and authorised.line_external_id = v_source.original_line_ref
    and (
      v_source.support_payout_case_id is null
      or authorised.support_payout_case_id = v_source.support_payout_case_id
    )
    and (
      nullif(btrim(action_row.external_reference), '') is null
      or action_row.external_reference = v_source.external_id
    )
    and authorised.quantity - coalesce((
      select sum(corroboration.quantity)
      from public.case_replacement_corroborations corroboration
      where corroboration.merchant_id = authorised.merchant_id
        and corroboration.replacement_authorisation_item_id = authorised.id
    ), 0) >= v_quantity
    and (
      not exists (
        select 1
        from public.case_decisions reversal
        where reversal.merchant_id = authorised.merchant_id
          and reversal.reverses_decision_id = decision_row.id
      )
      or action_row.merchant_reported_at is not null
      or action_row.observed_at is not null
      or action_row.action_state in (
        'source_observed_attempt', 'provider_accepted', 'provider_processing',
        'succeeded', 'reconciled'
      )
    )
  order by authorised.created_at, authorised.id
  limit 1
  for update of authorised;
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

revoke all on function public.corroborate_replacement_handoff_v1(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.corroborate_replacement_handoff_v1(uuid, uuid, timestamptz)
  to service_role;
