-- Release 1 merchant-controlled responsibility confirmation.
--
-- Advisory evaluation may update responsibility only while unconfirmed. Once
-- a merchant confirms or corrects it, only this versioned/idempotent RPC may
-- change the protected projection.

create or replace function public.protect_confirmed_case_responsibility()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if old.responsibility_confirmation_state <> 'unconfirmed'
     and coalesce(
       current_setting('app.allow_responsibility_projection_write', true),
       ''
     ) <> 'on'
     and (
       new.loss_attribution is distinct from old.loss_attribution
       or new.attribution_confidence is distinct from old.attribution_confidence
       or new.recoverability is distinct from old.recoverability
       or new.recovery_owner is distinct from old.recovery_owner
       or new.recovery_required_evidence is distinct from old.recovery_required_evidence
       or new.recovery_next_action is distinct from old.recovery_next_action
       or new.responsibility_confirmation_state is distinct from old.responsibility_confirmation_state
       or new.responsibility_confirmed_at is distinct from old.responsibility_confirmed_at
       or new.responsibility_confirmed_by is distinct from old.responsibility_confirmed_by
       or new.responsibility_event_id is distinct from old.responsibility_event_id
     ) then
    raise exception 'confirmed_case_responsibility_is_protected'
      using errcode = '22023';
  end if;
  return new;
end;
$function$;

create trigger trg_protect_confirmed_case_responsibility
before update on public.support_payout_cases
for each row execute function public.protect_confirmed_case_responsibility();

create or replace function public.record_case_responsibility(
  p_merchant_id uuid,
  p_case_id uuid,
  p_expected_version bigint,
  p_loss_attribution text,
  p_attribution_confidence text,
  p_recovery_owner text,
  p_recoverability text,
  p_supporting_evidence_ids uuid[],
  p_conflicting_evidence_ids uuid[],
  p_rationale text,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_case public.support_payout_cases;
  v_prior_event public.domain_events;
  v_event public.domain_events;
  v_state text;
  v_is_correction boolean;
  v_result jsonb;
  v_evidence_ids uuid[];
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'responsibility_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'responsibility_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180 then
    raise exception 'responsibility_idempotency_key_invalid' using errcode = '22023';
  end if;
  if p_loss_attribution not in (
    'customer_claim', 'carrier_loss', 'carrier_damage',
    'delivery_confirmed_evidence', 'warehouse_mispick',
    'warehouse_missing_item', 'three_pl_late_dispatch', 'supplier_defect',
    'packaging_failure', 'merchant_policy', 'unknown', 'repeat_claimant',
    'policy_override'
  ) then
    raise exception 'responsibility_attribution_invalid' using errcode = '22023';
  end if;
  if p_attribution_confidence not in (
    'high', 'medium', 'low', 'needs_more_evidence'
  ) then
    raise exception 'responsibility_confidence_invalid' using errcode = '22023';
  end if;
  if p_recovery_owner not in (
    'carrier', 'three_pl', 'warehouse', 'supplier', 'merchant', 'unknown'
  ) then
    raise exception 'responsibility_owner_invalid' using errcode = '22023';
  end if;
  if p_recoverability not in (
    'recoverable', 'possibly_recoverable', 'not_recoverable',
    'needs_more_evidence', 'unknown'
  ) then
    raise exception 'responsibility_recoverability_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.event_type not in (
         'case.responsibility_confirmed', 'case.responsibility_corrected'
       ) then
      raise exception 'responsibility_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where id = p_case_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key) || ':event';
  if found then
    if v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.event_type not in (
         'case.responsibility_confirmed', 'case.responsibility_corrected'
       ) then
      raise exception 'responsibility_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  if v_case.state_version is distinct from p_expected_version then
    raise exception 'responsibility_version_conflict' using errcode = '40001';
  end if;

  v_evidence_ids := array(
    select distinct evidence_id
    from unnest(
      coalesce(p_supporting_evidence_ids, '{}'::uuid[])
      || coalesce(p_conflicting_evidence_ids, '{}'::uuid[])
    ) evidence_id
  );
  if exists (
    select 1
    from unnest(coalesce(p_supporting_evidence_ids, '{}'::uuid[])) supporting(id)
    join unnest(coalesce(p_conflicting_evidence_ids, '{}'::uuid[])) conflicting(id)
      using (id)
  ) then
    raise exception 'responsibility_evidence_cannot_support_and_conflict'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(v_evidence_ids) requested(id)
    left join public.evidence_items evidence
      on evidence.id = requested.id
     and evidence.merchant_id = p_merchant_id
     and evidence.claim_id = p_case_id
    where evidence.id is null
  ) then
    raise exception 'responsibility_evidence_not_found' using errcode = 'P0002';
  end if;

  v_is_correction :=
    v_case.responsibility_confirmation_state <> 'unconfirmed'
    or v_case.loss_attribution::text is distinct from p_loss_attribution
    or v_case.attribution_confidence::text is distinct from p_attribution_confidence
    or v_case.recovery_owner::text is distinct from p_recovery_owner
    or v_case.recoverability::text is distinct from p_recoverability;
  if v_is_correction and coalesce(length(trim(p_rationale)), 0) < 5 then
    raise exception 'responsibility_correction_rationale_required'
      using errcode = '22023';
  end if;
  if length(coalesce(p_rationale, '')) > 4000 then
    raise exception 'responsibility_rationale_too_long' using errcode = '22023';
  end if;
  v_state := case when v_is_correction then 'corrected' else 'confirmed' end;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'state_version', p_expected_version + 1,
    'responsibility_confirmation_state', v_state,
    'loss_attribution', p_loss_attribution,
    'attribution_confidence', p_attribution_confidence,
    'recovery_owner', p_recovery_owner,
    'recoverability', p_recoverability,
    'supporting_evidence_ids', coalesce(p_supporting_evidence_ids, '{}'::uuid[]),
    'conflicting_evidence_ids', coalesce(p_conflicting_evidence_ids, '{}'::uuid[]),
    'rationale', nullif(trim(p_rationale), ''),
    'replayed', false
  );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    case
      when v_is_correction then 'case.responsibility_corrected'
      else 'case.responsibility_confirmed'
    end,
    'case',
    p_case_id,
    trim(p_idempotency_key) || ':event',
    jsonb_build_object(
      'case_id', p_case_id,
      'previous', jsonb_build_object(
        'responsibility_confirmation_state', v_case.responsibility_confirmation_state,
        'loss_attribution', v_case.loss_attribution,
        'attribution_confidence', v_case.attribution_confidence,
        'recovery_owner', v_case.recovery_owner,
        'recoverability', v_case.recoverability
      ),
      'result', v_result
    ),
    null, null, null, 'user', p_actor_user_id, now(), null, null,
    array[
      'caseProjection', 'notificationProjection',
      'workflowHandler', 'auditTimelineProjection'
    ]::text[]
  );

  perform set_config('app.allow_responsibility_projection_write', 'on', true);
  update public.support_payout_cases
  set
    loss_attribution = p_loss_attribution::public.loss_attribution,
    attribution_confidence = p_attribution_confidence::public.attribution_confidence,
    recovery_owner = p_recovery_owner::public.recovery_owner,
    recoverability = p_recoverability::public.recoverability,
    responsibility_confirmation_state = v_state,
    responsibility_confirmed_at = now(),
    responsibility_confirmed_by = p_actor_user_id,
    responsibility_event_id = v_event.id,
    state_version = state_version + 1,
    updated_at = now()
  where id = p_case_id
    and merchant_id = p_merchant_id;
  perform set_config('app.allow_responsibility_projection_write', '', true);

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id,
    case
      when v_is_correction then 'responsibility_corrected'
      else 'responsibility_confirmed'
    end,
    v_case.status, v_case.status, nullif(trim(p_rationale), ''),
    p_actor_user_id,
    jsonb_build_object(
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key),
      'loss_attribution', p_loss_attribution,
      'attribution_confidence', p_attribution_confidence,
      'recovery_owner', p_recovery_owner,
      'recoverability', p_recoverability,
      'supporting_evidence_ids', coalesce(p_supporting_evidence_ids, '{}'::uuid[]),
      'conflicting_evidence_ids', coalesce(p_conflicting_evidence_ids, '{}'::uuid[])
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;

revoke all on function public.protect_confirmed_case_responsibility()
  from public, anon, authenticated;
revoke all on function public.record_case_responsibility(
  uuid, uuid, bigint, text, text, text, text, uuid[], uuid[], text, uuid, text
) from public, anon, authenticated;
grant execute on function public.record_case_responsibility(
  uuid, uuid, bigint, text, text, text, text, uuid[], uuid[], text, uuid, text
) to service_role;

comment on function public.record_case_responsibility(
  uuid, uuid, bigint, text, text, text, text, uuid[], uuid[], text, uuid, text
) is 'Atomically confirms or corrects merchant responsibility with scoped evidence, concurrency, idempotency, and immutable audit.';
