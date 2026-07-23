-- Atomic creation of a rule family and its first immutable draft.
begin;

create or replace function public.create_merchant_rule_draft(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_name text,
  p_description text,
  p_conditions jsonb,
  p_action text,
  p_condition_operator text,
  p_priority integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rule public.merchant_rules%rowtype;
  new_version public.merchant_rule_versions%rowtype;
begin
  if nullif(trim(p_name), '') is null then raise exception 'rule_name_required' using errcode = '22023'; end if;
  if p_condition_operator not in ('and', 'or') then raise exception 'invalid_condition_operator' using errcode = '22023'; end if;

  insert into public.merchant_rules(
    merchant_id, name, description, conditions, action, condition_operator,
    priority, is_active
  ) values (
    p_merchant_id, trim(p_name), nullif(trim(p_description), ''),
    coalesce(p_conditions, '[]'::jsonb), p_action, p_condition_operator,
    p_priority, false
  ) returning * into new_rule;

  insert into public.merchant_rule_versions(
    merchant_id, merchant_rule_id, version, status, name, description,
    conditions, action, condition_operator, priority, created_by
  ) values (
    p_merchant_id, new_rule.id, 1, 'draft', new_rule.name,
    new_rule.description, new_rule.conditions, new_rule.action,
    new_rule.condition_operator, new_rule.priority, p_actor_id
  ) returning * into new_version;

  return jsonb_build_object('rule', to_jsonb(new_rule), 'version', to_jsonb(new_version));
end
$$;

revoke all on function public.create_merchant_rule_draft(uuid, uuid, text, text, jsonb, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_merchant_rule_draft(uuid, uuid, text, text, jsonb, text, text, integer) to service_role;

create or replace function public.protect_published_workflow_payload()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' and (
    new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.trigger_event_type is distinct from old.trigger_event_type
    or new.conditions is distinct from old.conditions
    or new.outputs is distinct from old.outputs
    or new.version is distinct from old.version
    or new.merchant_id is distinct from old.merchant_id
  ) then
    raise exception 'published workflow definition payload is immutable';
  end if;
  return new;
end
$$;

drop trigger if exists protect_published_workflow_payload on public.workflow_definitions;
create trigger protect_published_workflow_payload
before update on public.workflow_definitions
for each row execute function public.protect_published_workflow_payload();

commit;
