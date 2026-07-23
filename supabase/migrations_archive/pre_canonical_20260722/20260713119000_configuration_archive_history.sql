begin;

alter table public.merchant_rules
  add column if not exists archived_at timestamptz;

alter table public.merchant_rule_versions
  drop constraint if exists merchant_rule_versions_status_check;

alter table public.merchant_rule_versions
  add constraint merchant_rule_versions_status_check
  check (status in ('draft', 'published', 'retired', 'discarded'));

create or replace function public.discard_merchant_rule_draft(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_rule_id uuid,
  p_version_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  discarded public.merchant_rule_versions%rowtype;
  archived_rule boolean := false;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  update public.merchant_rule_versions
  set status = 'discarded'
  where id = p_version_id
    and merchant_rule_id = p_rule_id
    and merchant_id = p_merchant_id
    and status = 'draft'
  returning * into discarded;

  if discarded.id is null then
    raise exception 'editable_draft_not_found';
  end if;

  if not exists (
    select 1 from public.merchant_rule_versions
    where merchant_id = p_merchant_id
      and merchant_rule_id = p_rule_id
      and status = 'published'
  ) then
    update public.merchant_rules
    set is_active = false, archived_at = now(), updated_at = now()
    where id = p_rule_id and merchant_id = p_merchant_id and archived_at is null;
    archived_rule := found;
  end if;

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rule.draft_discarded', 'merchant_rule', p_rule_id,
    'user', p_actor_id,
    'rule-draft-discarded:' || p_version_id::text,
    now(),
    jsonb_build_object('version_id', p_version_id, 'rule_archived', archived_rule)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'version_id', discarded.id,
    'status', discarded.status,
    'rule_archived', archived_rule
  );
end;
$$;

create or replace function public.archive_merchant_rule(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_rule_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_id uuid;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  update public.merchant_rules
  set is_active = false, archived_at = now(), updated_at = now()
  where id = p_rule_id and merchant_id = p_merchant_id and archived_at is null
  returning id into archived_id;

  if archived_id is null then
    raise exception 'rule_not_found';
  end if;

  update public.merchant_rule_versions
  set status = case
    when status = 'draft' then 'discarded'
    when status = 'published' then 'retired'
    else status
  end
  where merchant_id = p_merchant_id
    and merchant_rule_id = p_rule_id
    and status in ('draft', 'published');

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rule.archived', 'merchant_rule', p_rule_id,
    'user', p_actor_id,
    'rule-archived:' || p_rule_id::text,
    now(),
    jsonb_build_object('rule_id', p_rule_id)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object('rule_id', archived_id, 'archived', true);
end;
$$;

create or replace function public.reorder_merchant_rules(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_order jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entry jsonb;
  item_count integer;
  scoped_count integer;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  if jsonb_typeof(p_order) <> 'array' then
    raise exception 'rule_order_must_be_array';
  end if;
  item_count := jsonb_array_length(p_order);
  if item_count < 1 or item_count > 500 then
    raise exception 'rule_order_must_contain_1_to_500_items';
  end if;
  if (
    select count(distinct (item->>'id')::uuid)
    from jsonb_array_elements(p_order) item
  ) <> item_count then
    raise exception 'rule_order_contains_duplicate_ids';
  end if;

  perform 1
  from public.merchant_rules
  where merchant_id = p_merchant_id
    and archived_at is null
    and id in (
      select (item->>'id')::uuid from jsonb_array_elements(p_order) item
    )
  order by id
  for update;

  select count(*) into scoped_count
  from public.merchant_rules
  where merchant_id = p_merchant_id
    and archived_at is null
    and id in (
      select (item->>'id')::uuid from jsonb_array_elements(p_order) item
    );
  if scoped_count <> item_count then
    raise exception 'rule_order_scope_mismatch';
  end if;

  for entry in select value from jsonb_array_elements(p_order)
  loop
    update public.merchant_rules
    set priority = (entry->>'priority')::integer, updated_at = now()
    where merchant_id = p_merchant_id
      and archived_at is null
      and id = (entry->>'id')::uuid;
  end loop;

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rules.reordered', 'merchant', p_merchant_id,
    'user', p_actor_id,
    'rules-reordered:' || p_merchant_id::text || ':' || md5(p_order::text),
    now(), jsonb_build_object('order', p_order)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object('updated', item_count);
end;
$$;

revoke all on function public.discard_merchant_rule_draft(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.archive_merchant_rule(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.reorder_merchant_rules(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.discard_merchant_rule_draft(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.archive_merchant_rule(uuid, uuid, uuid) to service_role;
grant execute on function public.reorder_merchant_rules(uuid, uuid, jsonb) to service_role;

commit;
