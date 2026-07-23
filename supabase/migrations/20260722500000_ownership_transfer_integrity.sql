-- Explicit, atomic merchant ownership transfer.
--
-- ACC-005 requires exactly one active owner, an intentional transfer action,
-- and append-only audit evidence. A deferred cardinality trigger permits the
-- two-row role swap inside one transaction while rejecting any committed state
-- with zero owners. The partial unique index rejects multiple active owners.

do $block$
begin
  if exists (
    select merchant.id
    from public.merchants merchant
    left join public.merchant_users member
      on member.merchant_id = merchant.id
     and member.role = 'owner'::public.member_role
     and member.invite_status = 'active'::public.invite_status
     and member.user_id is not null
    group by merchant.id
    having count(member.id) <> 1
  ) then
    raise exception 'merchant_owner_preflight_failed'
      using errcode = '23514',
            hint = 'Every existing merchant must have exactly one active owner before this migration can be applied.';
  end if;
end;
$block$;

alter table public.merchant_users
  add constraint merchant_users_owner_is_active
  check (
    role <> 'owner'::public.member_role
    or (
      invite_status = 'active'::public.invite_status
      and user_id is not null
    )
  );

create unique index merchant_users_one_active_owner
  on public.merchant_users (merchant_id)
  where role = 'owner'::public.member_role
    and invite_status = 'active'::public.invite_status;

create or replace function public.enforce_single_active_merchant_owner()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_merchant_id uuid;
  v_merchant_ids uuid[] := array[]::uuid[];
  v_owner_count integer;
begin
  if tg_op <> 'INSERT' then
    v_merchant_ids := array_append(v_merchant_ids, old.merchant_id);
  end if;
  if tg_op <> 'DELETE' and not (new.merchant_id = any(v_merchant_ids)) then
    v_merchant_ids := array_append(v_merchant_ids, new.merchant_id);
  end if;

  foreach v_merchant_id in array v_merchant_ids loop
    -- A parent merchant deletion cascades its memberships and is allowed.
    if exists (select 1 from public.merchants where id = v_merchant_id) then
      select count(*)::integer
        into v_owner_count
      from public.merchant_users
      where merchant_id = v_merchant_id
        and role = 'owner'::public.member_role
        and invite_status = 'active'::public.invite_status
        and user_id is not null;

      if v_owner_count <> 1 then
        raise exception 'merchant_requires_exactly_one_active_owner'
          using errcode = '23514',
                detail = format('merchant_id=%s active_owner_count=%s', v_merchant_id, v_owner_count),
                hint = 'Use transfer_merchant_ownership for an atomic owner change.';
      end if;
    end if;
  end loop;

  return null;
end;
$function$;

create constraint trigger trg_merchant_owner_cardinality
after insert or update or delete on public.merchant_users
deferrable initially deferred
for each row execute function public.enforce_single_active_merchant_owner();

create or replace function public.transfer_merchant_ownership(
  p_merchant_id uuid,
  p_actor_user_id uuid,
  p_new_owner_member_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_owner public.merchant_users;
  v_new_owner public.merchant_users;
  v_existing_event public.domain_events;
  v_event public.domain_events;
  v_now timestamptz := clock_timestamp();
begin
  if p_merchant_id is null
     or p_actor_user_id is null
     or p_new_owner_member_id is null then
    raise exception 'ownership_transfer_identifiers_required' using errcode = '22023';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8
     or length(p_idempotency_key) > 200 then
    raise exception 'ownership_transfer_idempotency_key_invalid' using errcode = '22023';
  end if;

  -- Serialize transfers for one merchant and make a lost-response retry safe.
  perform 1
  from public.merchants
  where id = p_merchant_id
  for update;
  if not found then
    raise exception 'ownership_transfer_merchant_not_found' using errcode = 'P0002';
  end if;

  select *
    into v_existing_event
  from public.domain_events
  where merchant_id = p_merchant_id
    and idempotency_key = trim(p_idempotency_key);

  if found then
    if v_existing_event.event_type <> 'workspace.ownership_transferred'
       or v_existing_event.actor_id is distinct from p_actor_user_id
       or v_existing_event.payload ->> 'new_owner_member_id' is distinct from p_new_owner_member_id::text then
      raise exception 'ownership_transfer_idempotency_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'merchant_id', p_merchant_id,
      'previous_owner_member_id', v_existing_event.payload ->> 'previous_owner_member_id',
      'new_owner_member_id', p_new_owner_member_id,
      'domain_event_id', v_existing_event.id,
      'replayed', true
    );
  end if;

  select *
    into v_current_owner
  from public.merchant_users
  where merchant_id = p_merchant_id
    and role = 'owner'::public.member_role
    and invite_status = 'active'::public.invite_status
    and user_id is not null
  for update;

  if not found or v_current_owner.user_id is distinct from p_actor_user_id then
    raise exception 'ownership_transfer_current_owner_required' using errcode = '42501';
  end if;
  if v_current_owner.id = p_new_owner_member_id then
    raise exception 'ownership_transfer_target_is_current_owner' using errcode = '22023';
  end if;

  select *
    into v_new_owner
  from public.merchant_users
  where id = p_new_owner_member_id
    and merchant_id = p_merchant_id
  for update;

  if not found then
    raise exception 'ownership_transfer_target_not_found' using errcode = 'P0002';
  end if;
  if v_new_owner.invite_status <> 'active'::public.invite_status
     or v_new_owner.user_id is null then
    raise exception 'ownership_transfer_target_must_be_active' using errcode = '22023';
  end if;

  -- The former owner remains an administrator; both changes and their durable
  -- trigger-backed audit events commit or roll back together.
  update public.merchant_users
     set role = 'admin'::public.member_role
   where id = v_current_owner.id
     and merchant_id = p_merchant_id;

  update public.merchant_users
     set role = 'owner'::public.member_role
   where id = v_new_owner.id
     and merchant_id = p_merchant_id;

  select *
    into v_event
  from public.record_domain_event(
    p_merchant_id => p_merchant_id,
    p_event_type => 'workspace.ownership_transferred',
    p_aggregate_type => 'merchant',
    p_aggregate_id => p_merchant_id,
    p_idempotency_key => trim(p_idempotency_key),
    p_payload => jsonb_build_object(
      'previous_owner_member_id', v_current_owner.id,
      'new_owner_member_id', v_new_owner.id,
      'previous_owner_new_role', 'admin',
      'new_owner_previous_role', v_new_owner.role,
      'effective_at', v_now
    ),
    p_actor_type => 'user',
    p_actor_id => p_actor_user_id,
    p_occurred_at => v_now
  );

  return jsonb_build_object(
    'merchant_id', p_merchant_id,
    'previous_owner_member_id', v_current_owner.id,
    'new_owner_member_id', v_new_owner.id,
    'domain_event_id', v_event.id,
    'replayed', false
  );
end;
$function$;

revoke all on function public.enforce_single_active_merchant_owner() from public, anon, authenticated;
revoke all on function public.transfer_merchant_ownership(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.transfer_merchant_ownership(uuid, uuid, uuid, text) to service_role;
