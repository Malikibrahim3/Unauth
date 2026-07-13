-- Reconcile rule families created after the original versioning migration and
-- provide all-or-nothing creation for the default policy pack.
begin;

insert into public.merchant_rule_versions(
  merchant_id, merchant_rule_id, version, status, name, description,
  conditions, action, condition_operator, priority, published_at
)
select
  r.merchant_id, r.id, 1,
  case when r.is_active then 'published' else 'draft' end,
  r.name, r.description, r.conditions, r.action, r.condition_operator,
  r.priority, case when r.is_active then r.updated_at else null end
from public.merchant_rules r
where not exists (
  select 1 from public.merchant_rule_versions v where v.merchant_rule_id = r.id
);

create or replace function public.create_merchant_rule_draft_pack(
  p_merchant_id uuid,
  p_actor_id uuid,
  p_rules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  result jsonb;
  created jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then
    raise exception 'non_empty_rule_pack_required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rules) > 50 then
    raise exception 'rule_pack_too_large' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_rules)
  loop
    result := public.create_merchant_rule_draft(
      p_merchant_id,
      p_actor_id,
      item->>'name',
      coalesce(item->>'description', ''),
      coalesce(item->'conditions', '[]'::jsonb),
      item->>'action',
      coalesce(item->>'condition_operator', 'and'),
      coalesce((item->>'priority')::integer, 0)
    );
    created := created || jsonb_build_array(result);
  end loop;
  return created;
end
$$;

revoke all on function public.create_merchant_rule_draft_pack(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_merchant_rule_draft_pack(uuid, uuid, jsonb) to service_role;

commit;
