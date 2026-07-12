-- Remap legacy claim-type shorthand to canonical DB `claim_type` enum values
-- inside merchant_rules.conditions JSONB.
--
--   INR    -> item_not_received
--   refund -> refund_request
--
-- Background: the rules UI previously offered legacy shorthand (INR/refund) as
-- claim_types condition values, but claims.claim_type stores the DB enum. Once
-- IdentitySignals.claim_types is sourced from real data, a saved condition using
-- 'INR' would silently never match. This migration aligns stored rules with the
-- canonical vocabulary.
--
-- Idempotent: canonical values are passed through unchanged, so re-running is a
-- no-op. Only `claim_types` conditions are touched; all other conditions are
-- preserved byte-for-byte. default_rule_templates were verified to use no
-- claim_types conditions and are intentionally not modified.

create or replace function _remap_legacy_claim_type(v text) returns text
  language sql immutable as $$
  select case v
    when 'INR' then 'item_not_received'
    when 'refund' then 'refund_request'
    else v
  end;
$$;

do $$
declare
  r              record;
  cond           jsonb;
  new_conditions jsonb;
  new_value      jsonb;
  elem           jsonb;
  arr            jsonb;
begin
  for r in
    select id, conditions
    from public.merchant_rules
    where conditions is not null
      and jsonb_typeof(conditions) = 'array'
  loop
    new_conditions := '[]'::jsonb;

    for cond in select * from jsonb_array_elements(r.conditions) loop
      if cond->>'field' = 'claim_types' then
        if jsonb_typeof(cond->'value') = 'array' then
          arr := '[]'::jsonb;
          for elem in select * from jsonb_array_elements(cond->'value') loop
            arr := arr || to_jsonb(_remap_legacy_claim_type(elem #>> '{}'));
          end loop;
          new_value := arr;
        elsif jsonb_typeof(cond->'value') = 'string' then
          new_value := to_jsonb(_remap_legacy_claim_type(cond->>'value'));
        else
          new_value := cond->'value';
        end if;
        cond := jsonb_set(cond, '{value}', new_value);
      end if;

      new_conditions := new_conditions || cond;
    end loop;

    if new_conditions is distinct from r.conditions then
      update public.merchant_rules set conditions = new_conditions where id = r.id;
    end if;
  end loop;
end $$;

drop function _remap_legacy_claim_type(text);
