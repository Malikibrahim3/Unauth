do $test$
declare
  v_case public.support_payout_cases;
  v_actor uuid := '91000000-0000-4000-8000-000000000001';
  v_merchant_id uuid := '91000000-0000-4000-8000-000000000010';
  v_case_id uuid := '91000000-0000-4000-8000-000000000011';
  v_created jsonb;
  v_sent jsonb;
  v_replayed jsonb;
  v_response jsonb;
  v_closed jsonb;
  v_responsibility jsonb;
  v_responsibility_replay jsonb;
  v_dispatch jsonb;
  v_dispatch_busy jsonb;
  v_dispatch_complete jsonb;
  v_dispatch_replay jsonb;
  v_investigation_id uuid;
  v_case_version bigint;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    v_actor,
    'authenticated',
    'authenticated',
    'runtime-investigation-actor@example.test',
    now(),
    now(),
    now(),
    false,
    false
  );

  insert into public.merchants (id, name, is_demo, is_internal)
  values (v_merchant_id, 'Runtime investigation merchant', true, true);

  insert into public.merchant_users (
    merchant_id,
    user_id,
    invited_email,
    role,
    invite_status,
    accepted_at
  ) values (
    v_merchant_id,
    v_actor,
    'runtime-investigation-actor@example.test',
    'owner',
    'active',
    now()
  );

  insert into public.support_payout_cases (
    id,
    merchant_id,
    claim_type,
    status,
    detection_method,
    reason_raw,
    currency,
    manual_reference,
    submitted_at
  ) values (
    v_case_id,
    v_merchant_id,
    'item_not_received',
    'ready_for_decision',
    'manual',
    'Runtime investigation fixture',
    'USD',
    'runtime-investigation-case',
    now()
  );

  select payout_case.*
    into v_case
  from public.support_payout_cases payout_case
  where payout_case.id = v_case_id
    and payout_case.merchant_id = v_merchant_id;

  v_created := public.create_case_investigation(
    v_case.merchant_id,
    v_case.id,
    'carrier',
    'Runtime carrier',
    null,
    'Confirm the final delivery location and supporting artefacts.',
    'Carrier custody is established but proof remains incomplete.',
    null,
    array['delivery_photo', 'delivery_location'],
    'Request carrier delivery evidence.',
    'Evidence request: runtime verification',
    'Please provide the delivery photo and recorded delivery location.',
    'carrier-runtime@example.test',
    'manual',
    now() + interval '24 hours',
    true,
    v_actor,
    'runtime-investigation-create'
  );
  v_investigation_id := (v_created ->> 'id')::uuid;
  if v_investigation_id is null
     or v_created ->> 'status' <> 'draft'
     or coalesce((v_created ->> 'is_primary')::boolean, false) is not true then
    raise exception 'investigation_runtime_create_failed:%', v_created;
  end if;

  v_dispatch := public.claim_case_investigation_dispatch(
    v_case.merchant_id,
    v_investigation_id,
    'initial_request',
    'email',
    'runtime-investigation-dispatch',
    repeat('a', 64),
    v_actor,
    60
  );
  if coalesce((v_dispatch ->> 'claimed')::boolean, false) is not true
     or v_dispatch ->> 'status' <> 'processing' then
    raise exception 'investigation_runtime_dispatch_claim_failed:%', v_dispatch;
  end if;
  v_dispatch_busy := public.claim_case_investigation_dispatch(
    v_case.merchant_id,
    v_investigation_id,
    'initial_request',
    'email',
    'runtime-investigation-dispatch',
    repeat('a', 64),
    v_actor,
    60
  );
  if coalesce((v_dispatch_busy ->> 'claimed')::boolean, false) is true then
    raise exception 'investigation_runtime_concurrent_dispatch_not_blocked:%', v_dispatch_busy;
  end if;
  v_dispatch_complete := public.complete_case_investigation_dispatch(
    v_case.merchant_id,
    (v_dispatch ->> 'id')::uuid,
    (v_dispatch ->> 'lease_token')::uuid,
    true,
    'runtime-provider-message',
    null
  );
  if v_dispatch_complete ->> 'status' <> 'accepted' then
    raise exception 'investigation_runtime_dispatch_complete_failed:%', v_dispatch_complete;
  end if;
  v_dispatch_replay := public.complete_case_investigation_dispatch(
    v_case.merchant_id,
    (v_dispatch ->> 'id')::uuid,
    (v_dispatch ->> 'lease_token')::uuid,
    true,
    'runtime-provider-message',
    null
  );
  if coalesce((v_dispatch_replay ->> 'replayed')::boolean, false) is not true then
    raise exception 'investigation_runtime_dispatch_replay_failed:%', v_dispatch_replay;
  end if;

  v_sent := public.transition_case_investigation(
    v_case.merchant_id,
    v_case.id,
    v_investigation_id,
    1,
    'send_accepted',
    jsonb_build_object(
      'source_channel', 'email',
      'due_at', now() + interval '24 hours',
      'provider_message_id', 'runtime-provider-message',
      'case_version', v_case.state_version
    ),
    v_actor,
    'runtime-investigation-send'
  );
  if v_sent ->> 'status' <> 'waiting_response'
     or (v_sent ->> 'state_version')::bigint <> 2 then
    raise exception 'investigation_runtime_send_failed:%', v_sent;
  end if;
  if not exists (
    select 1
    from public.work_tasks
    where merchant_id = v_case.merchant_id
      and support_payout_case_id = v_case.id
      and source_metadata ->> 'migration_key' =
        'investigation:' || v_investigation_id::text || ':response'
      and status = 'open'
  ) then
    raise exception 'investigation_runtime_response_task_missing';
  end if;

  v_replayed := public.transition_case_investigation(
    v_case.merchant_id,
    v_case.id,
    v_investigation_id,
    1,
    'send_accepted',
    jsonb_build_object(
      'source_channel', 'email',
      'due_at', now() + interval '24 hours',
      'provider_message_id', 'runtime-provider-message',
      'case_version', v_case.state_version
    ),
    v_actor,
    'runtime-investigation-send'
  );
  if coalesce((v_replayed ->> 'replayed')::boolean, false) is not true then
    raise exception 'investigation_runtime_replay_failed:%', v_replayed;
  end if;

  select state_version into v_case_version
  from public.support_payout_cases
  where id = v_case.id and merchant_id = v_case.merchant_id;
  v_response := public.transition_case_investigation(
    v_case.merchant_id,
    v_case.id,
    v_investigation_id,
    2,
    'response',
    jsonb_build_object(
      'response_outcome', 'issue_confirmed',
      'response_summary', 'The carrier confirmed a delivery exception.',
      'responder_name', 'Runtime verifier',
      'case_version', v_case_version
    ),
    v_actor,
    'runtime-investigation-response'
  );
  if v_response ->> 'status' <> 'response_received'
     or (v_response ->> 'state_version')::bigint <> 3 then
    raise exception 'investigation_runtime_response_failed:%', v_response;
  end if;
  if not exists (
    select 1
    from public.work_tasks
    where merchant_id = v_case.merchant_id
      and source_metadata ->> 'migration_key' =
        'investigation:' || v_investigation_id::text || ':review'
      and status = 'open'
  ) then
    raise exception 'investigation_runtime_review_task_missing';
  end if;

  select state_version into v_case_version
  from public.support_payout_cases
  where id = v_case.id and merchant_id = v_case.merchant_id;
  v_closed := public.transition_case_investigation(
    v_case.merchant_id,
    v_case.id,
    v_investigation_id,
    3,
    'close',
    jsonb_build_object(
      'closure_reason', 'Response reviewed during runtime verification.',
      'case_version', v_case_version
    ),
    v_actor,
    'runtime-investigation-close'
  );
  if v_closed ->> 'status' <> 'closed'
     or (v_closed ->> 'state_version')::bigint <> 4 then
    raise exception 'investigation_runtime_close_failed:%', v_closed;
  end if;
  if exists (
    select 1
    from public.work_tasks
    where merchant_id = v_case.merchant_id
      and source_metadata ->> 'investigation_id' = v_investigation_id::text
      and status in ('open', 'in_progress', 'blocked')
  ) then
    raise exception 'investigation_runtime_tasks_left_open';
  end if;

  select state_version into v_case_version
  from public.support_payout_cases
  where id = v_case.id and merchant_id = v_case.merchant_id;
  v_responsibility := public.record_case_responsibility(
    v_case.merchant_id,
    v_case.id,
    v_case_version,
    'unknown',
    'needs_more_evidence',
    'unknown',
    'needs_more_evidence',
    '{}'::uuid[],
    '{}'::uuid[],
    'Runtime confirmation keeps unresolved responsibility explicit.',
    v_actor,
    'runtime-responsibility-confirm'
  );
  if v_responsibility ->> 'responsibility_confirmation_state' not in (
    'confirmed', 'corrected'
  ) then
    raise exception 'responsibility_runtime_confirmation_failed:%', v_responsibility;
  end if;

  v_responsibility_replay := public.record_case_responsibility(
    v_case.merchant_id,
    v_case.id,
    v_case_version,
    'unknown',
    'needs_more_evidence',
    'unknown',
    'needs_more_evidence',
    '{}'::uuid[],
    '{}'::uuid[],
    'Runtime confirmation keeps unresolved responsibility explicit.',
    v_actor,
    'runtime-responsibility-confirm'
  );
  if coalesce((v_responsibility_replay ->> 'replayed')::boolean, false) is not true then
    raise exception 'responsibility_runtime_replay_failed:%', v_responsibility_replay;
  end if;

  begin
    update public.support_payout_cases
    set loss_attribution = 'carrier_loss'
    where id = v_case.id and merchant_id = v_case.merchant_id;
    raise exception 'responsibility_runtime_protection_missing';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'confirmed_case_responsibility_is_protected' then
        raise;
      end if;
  end;
end;
$test$;
