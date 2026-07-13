-- Atomic, merchant-scoped publication for rules and workflows.
begin;

create or replace function public.publish_merchant_rule_version(
  p_merchant_id uuid,
  p_rule_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft public.merchant_rule_versions%rowtype;
  published public.merchant_rule_versions%rowtype;
  v_published_at timestamptz := now();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_merchant_id::text || ':' || p_rule_id::text, 0));

  perform 1 from public.merchant_rules
  where id = p_rule_id and merchant_id = p_merchant_id
  for update;
  if not found then raise exception 'rule_not_found' using errcode = 'P0002'; end if;

  select * into draft
  from public.merchant_rule_versions
  where merchant_id = p_merchant_id
    and merchant_rule_id = p_rule_id
    and status = 'draft'
  for update;
  if not found then raise exception 'draft_not_found' using errcode = 'P0002'; end if;

  update public.merchant_rule_versions
  set status = 'retired'
  where merchant_id = p_merchant_id
    and merchant_rule_id = p_rule_id
    and status = 'published';

  update public.merchant_rule_versions
  set status = 'published', published_at = v_published_at, published_by = p_actor_id
  where id = draft.id and status = 'draft'
  returning * into published;
  if not found then raise exception 'publish_conflict' using errcode = '40001'; end if;

  update public.merchant_rules
  set name = draft.name,
      description = draft.description,
      conditions = draft.conditions,
      action = draft.action,
      condition_operator = draft.condition_operator,
      priority = draft.priority,
      is_active = true,
      updated_at = v_published_at
  where id = p_rule_id and merchant_id = p_merchant_id;

  return to_jsonb(published);
end
$$;

create or replace function public.publish_workflow_definition(
  p_merchant_id uuid,
  p_workflow_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft public.workflow_definitions%rowtype;
  published public.workflow_definitions%rowtype;
  v_published_at timestamptz := now();
begin
  select * into draft
  from public.workflow_definitions
  where id = p_workflow_id and merchant_id = p_merchant_id and status = 'draft'
  for update;
  if not found then raise exception 'draft_not_found' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_merchant_id::text || ':' || draft.name, 0));

  update public.workflow_definitions
  set active = false, status = 'retired'
  where merchant_id = p_merchant_id and name = draft.name and status = 'published';

  update public.workflow_definitions
  set active = true,
      status = 'published',
      published_at = v_published_at,
      published_by = p_actor_id,
      updated_by = p_actor_id
  where id = p_workflow_id and merchant_id = p_merchant_id and status = 'draft'
  returning * into published;
  if not found then raise exception 'publish_conflict' using errcode = '40001'; end if;

  return to_jsonb(published);
end
$$;

create or replace function public.protect_published_rule_version_payload()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
    new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.conditions is distinct from old.conditions
    or new.action is distinct from old.action
    or new.condition_operator is distinct from old.condition_operator
    or new.priority is distinct from old.priority
    or new.version is distinct from old.version
    or new.merchant_id is distinct from old.merchant_id
    or new.merchant_rule_id is distinct from old.merchant_rule_id
  ) then
    raise exception 'published rule version payload is immutable';
  end if;
  return new;
end
$$;

drop trigger if exists protect_published_rule_version_payload on public.merchant_rule_versions;
create trigger protect_published_rule_version_payload
before update on public.merchant_rule_versions
for each row execute function public.protect_published_rule_version_payload();

revoke all on function public.publish_merchant_rule_version(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.publish_workflow_definition(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_merchant_rule_version(uuid, uuid, uuid) to service_role;
grant execute on function public.publish_workflow_definition(uuid, uuid, uuid) to service_role;

commit;
