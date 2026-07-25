-- Release 1 durable investigation email leasing and reconciliation.

create or replace function public.claim_case_investigation_dispatch(
  p_merchant_id uuid,
  p_investigation_id uuid,
  p_dispatch_kind text,
  p_channel text,
  p_idempotency_key text,
  p_request_hash text,
  p_actor_user_id uuid,
  p_lease_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_investigation public.case_clarification_requests;
  v_dispatch public.case_investigation_dispatches;
  v_lease_token uuid;
begin
  if p_merchant_id is null or p_investigation_id is null or p_actor_user_id is null then
    raise exception 'investigation_dispatch_identifiers_required' using errcode = '22023';
  end if;
  if p_dispatch_kind not in ('initial_request', 'chase')
     or p_channel <> 'email' then
    raise exception 'investigation_dispatch_kind_invalid' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 180
     or p_request_hash !~ '^[0-9a-f]{64}$'
     or p_lease_seconds not between 15 and 300 then
    raise exception 'investigation_dispatch_request_invalid' using errcode = '22023';
  end if;

  select *
    into v_investigation
  from public.case_clarification_requests
  where id = p_investigation_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'investigation_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key)
  for update;
  if found then
    if v_dispatch.investigation_id is distinct from p_investigation_id
       or v_dispatch.dispatch_kind is distinct from p_dispatch_kind
       or v_dispatch.channel is distinct from p_channel
       or v_dispatch.request_hash is distinct from p_request_hash then
      raise exception 'investigation_dispatch_idempotency_conflict'
        using errcode = '23505';
    end if;
    if v_dispatch.status = 'accepted' then
      return to_jsonb(v_dispatch)
        || jsonb_build_object('claimed', false, 'replayed', true);
    end if;
  end if;

  if p_dispatch_kind = 'initial_request' and v_investigation.status <> 'draft' then
    raise exception 'investigation_must_be_draft_to_send' using errcode = '22023';
  end if;
  if p_dispatch_kind = 'chase' and v_investigation.status <> 'waiting_response' then
    raise exception 'investigation_must_be_waiting_to_chase' using errcode = '22023';
  end if;

  insert into public.case_investigation_dispatches (
    merchant_id, investigation_id, dispatch_kind, channel,
    idempotency_key, request_hash, status, created_by
  ) values (
    p_merchant_id, p_investigation_id, p_dispatch_kind, p_channel,
    trim(p_idempotency_key), p_request_hash, 'requested', p_actor_user_id
  )
  on conflict (merchant_id, idempotency_key) do nothing;

  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key)
  for update;
  if v_dispatch.investigation_id is distinct from p_investigation_id
     or v_dispatch.dispatch_kind is distinct from p_dispatch_kind
     or v_dispatch.channel is distinct from p_channel
     or v_dispatch.request_hash is distinct from p_request_hash then
    raise exception 'investigation_dispatch_idempotency_conflict'
      using errcode = '23505';
  end if;

  if v_dispatch.status = 'accepted' then
    return to_jsonb(v_dispatch)
      || jsonb_build_object('claimed', false, 'replayed', true);
  end if;
  if v_dispatch.status = 'processing'
     and v_dispatch.leased_until > now() then
    return to_jsonb(v_dispatch)
      || jsonb_build_object('claimed', false, 'replayed', true);
  end if;

  v_lease_token := gen_random_uuid();
  update public.case_investigation_dispatches
  set
    status = 'processing',
    lease_token = v_lease_token,
    leased_until = now() + make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    last_error = null,
    updated_at = now()
  where id = v_dispatch.id
    and merchant_id = p_merchant_id
  returning * into v_dispatch;

  return to_jsonb(v_dispatch)
    || jsonb_build_object('claimed', true, 'replayed', false);
end;
$function$;

create or replace function public.complete_case_investigation_dispatch(
  p_merchant_id uuid,
  p_dispatch_id uuid,
  p_lease_token uuid,
  p_accepted boolean,
  p_provider_message_id text,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_dispatch public.case_investigation_dispatches;
begin
  select *
    into v_dispatch
  from public.case_investigation_dispatches
  where id = p_dispatch_id
    and merchant_id = p_merchant_id
  for update;
  if not found then
    raise exception 'investigation_dispatch_not_found' using errcode = 'P0002';
  end if;
  if v_dispatch.status = 'accepted' then
    return to_jsonb(v_dispatch) || jsonb_build_object('replayed', true);
  end if;
  if v_dispatch.status <> 'processing'
     or v_dispatch.lease_token is distinct from p_lease_token then
    raise exception 'investigation_dispatch_lease_conflict' using errcode = '40001';
  end if;
  if p_accepted and coalesce(length(trim(p_provider_message_id)), 0) < 1 then
    raise exception 'investigation_dispatch_provider_id_required' using errcode = '22023';
  end if;

  update public.case_investigation_dispatches
  set
    status = case when p_accepted then 'accepted' else 'failed' end,
    provider_message_id = case
      when p_accepted then trim(p_provider_message_id)
      else provider_message_id
    end,
    accepted_at = case when p_accepted then now() else accepted_at end,
    last_error = case
      when p_accepted then null
      else left(coalesce(nullif(trim(p_error), ''), 'email_provider_failed'), 2000)
    end,
    lease_token = null,
    leased_until = null,
    updated_at = now()
  where id = p_dispatch_id
    and merchant_id = p_merchant_id
  returning * into v_dispatch;
  return to_jsonb(v_dispatch) || jsonb_build_object('replayed', false);
end;
$function$;

revoke all on function public.claim_case_investigation_dispatch(
  uuid, uuid, text, text, text, text, uuid, integer
) from public, anon, authenticated;
revoke all on function public.complete_case_investigation_dispatch(
  uuid, uuid, uuid, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.claim_case_investigation_dispatch(
  uuid, uuid, text, text, text, text, uuid, integer
) to service_role;
grant execute on function public.complete_case_investigation_dispatch(
  uuid, uuid, uuid, boolean, text, text
) to service_role;

comment on function public.claim_case_investigation_dispatch(
  uuid, uuid, text, text, text, text, uuid, integer
) is 'Claims a durable investigation email attempt without allowing concurrent duplicate sends.';
comment on function public.complete_case_investigation_dispatch(
  uuid, uuid, uuid, boolean, text, text
) is 'Reconciles provider acceptance or failure against the active dispatch lease.';
