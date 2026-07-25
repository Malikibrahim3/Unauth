-- Audited, idempotent correction of the normalized case issue.

create or replace function public.correct_case_issue(
  p_merchant_id uuid,
  p_case_id uuid,
  p_expected_version bigint,
  p_issue text,
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
  v_previous_issue text;
  v_claim_type public.claim_type;
  v_result jsonb;
begin
  if p_merchant_id is null or p_case_id is null or p_actor_user_id is null then
    raise exception 'case_issue_identifiers_required' using errcode = '22023';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'case_issue_expected_version_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 200 then
    raise exception 'case_issue_idempotency_key_invalid' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_rationale)), 0) < 5
     or length(p_rationale) > 2000 then
    raise exception 'case_issue_rationale_invalid' using errcode = '22023';
  end if;
  if p_issue is null or p_issue not in (
    'item_not_received', 'missing_item', 'damaged_item', 'wrong_item',
    'not_as_described', 'late_delivery', 'refund_request',
    'chargeback_related', 'return_abuse', 'other'
  ) then
    raise exception 'case_issue_invalid' using errcode = '22023';
  end if;

  select *
    into v_prior_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);
  if found then
    if v_prior_event.event_type <> 'case.issue_corrected'
       or v_prior_event.aggregate_id is distinct from p_case_id
       or v_prior_event.payload ->> 'new_issue' is distinct from p_issue then
      raise exception 'case_issue_idempotency_conflict' using errcode = '23505';
    end if;
    return coalesce(v_prior_event.payload -> 'result', '{}'::jsonb)
      || jsonb_build_object('domain_event_id', v_prior_event.id, 'replayed', true);
  end if;

  select *
    into v_case
  from public.support_payout_cases
  where merchant_id = p_merchant_id
    and id = p_case_id
  for update;
  if not found then
    raise exception 'case_not_found' using errcode = 'P0002';
  end if;
  if v_case.state_version is distinct from p_expected_version then
    raise exception 'case_version_conflict' using errcode = '40001';
  end if;

  v_previous_issue := coalesce(v_case.reason_normalized, v_case.claim_type::text);
  if v_previous_issue = p_issue then
    raise exception 'case_issue_unchanged' using errcode = '22023';
  end if;

  v_claim_type := case p_issue
    when 'item_not_received' then 'item_not_received'::public.claim_type
    when 'missing_item' then 'item_not_received'::public.claim_type
    when 'late_delivery' then 'item_not_received'::public.claim_type
    when 'damaged_item' then 'damaged'::public.claim_type
    when 'wrong_item' then 'wrong_item'::public.claim_type
    when 'not_as_described' then 'not_as_described'::public.claim_type
    when 'refund_request' then 'refund_request'::public.claim_type
    when 'chargeback_related' then 'chargeback'::public.claim_type
    when 'return_abuse' then 'return_abuse'::public.claim_type
    else 'other'::public.claim_type
  end;

  update public.support_payout_cases
  set
    claim_type = v_claim_type,
    reason_normalized = p_issue,
    detection_detail = coalesce(detection_detail, '{}'::jsonb) || jsonb_build_object(
      'issue_corrected_manually', true,
      'issue_correction_rationale', trim(p_rationale),
      'issue_corrected_at', now()
    ),
    recommended_payout_action = null,
    recommended_rule_name = null,
    recommended_rule_id = null,
    payout_decision_state = case
      when payout_decision_state = 'recommendation_ready' then 'undecided'
      else payout_decision_state
    end,
    state_version = state_version + 1,
    updated_at = now()
  where merchant_id = p_merchant_id
    and id = p_case_id;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'previous_issue', v_previous_issue,
    'issue', p_issue,
    'claim_type', v_claim_type,
    'new_version', p_expected_version + 1,
    'replayed', false
  );

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id,
    'case.issue_corrected',
    'case',
    p_case_id,
    trim(p_idempotency_key),
    jsonb_build_object(
      'case_id', p_case_id,
      'previous_issue', v_previous_issue,
      'new_issue', p_issue,
      'claim_type', v_claim_type,
      'rationale', trim(p_rationale),
      'from_version', p_expected_version,
      'to_version', p_expected_version + 1,
      'result', v_result
    ),
    null,
    null,
    null,
    'user',
    p_actor_user_id,
    now(),
    null,
    null,
    array[
      'financialProjection',
      'lossProjection',
      'recoveryProjection',
      'customerProjection',
      'caseProjection',
      'workflowHandler',
      'notificationProjection',
      'auditTimelineProjection'
    ]::text[]
  );

  insert into public.claim_events (
    claim_id, merchant_id, event_type, from_status, to_status,
    note, actor_user_id, metadata
  ) values (
    p_case_id, p_merchant_id, 'issue_corrected', v_case.status, v_case.status,
    trim(p_rationale), p_actor_user_id,
    jsonb_build_object(
      'previous_issue', v_previous_issue,
      'new_issue', p_issue,
      'state_version', p_expected_version + 1,
      'domain_event_id', v_event.id,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  return v_result || jsonb_build_object('domain_event_id', v_event.id);
end;
$function$;

revoke all on function public.correct_case_issue(uuid, uuid, bigint, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.correct_case_issue(uuid, uuid, bigint, text, text, uuid, text)
  to service_role;

comment on function public.correct_case_issue(uuid, uuid, bigint, text, text, uuid, text) is
  'Corrects the authoritative normalized case issue with optimistic concurrency and immutable audit evidence.';

