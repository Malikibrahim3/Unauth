-- Current-evidence preview concurrency owner. Previews only SELECT this clock;
-- existing source/configuration writes advance it transactionally.
create table public.merchant_rule_input_versions (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0)
);
alter table public.merchant_rule_input_versions enable row level security;
revoke all on public.merchant_rule_input_versions from public, anon, authenticated;
grant select, insert, update on public.merchant_rule_input_versions to service_role;
insert into public.merchant_rule_input_versions (merchant_id) select id from public.merchants;

create function public.advance_rule_input_revision() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old uuid; v_new uuid; v_merchant uuid;
begin
  if TG_OP <> 'INSERT' then
    v_old := nullif(to_jsonb(OLD)->>'merchant_id', '')::uuid;
    if TG_TABLE_NAME = 'claim_outcomes' then
      select merchant_id into v_old from public.support_payout_cases where id = OLD.claim_id;
    end if;
  end if;
  if TG_OP <> 'DELETE' then
    v_new := nullif(to_jsonb(NEW)->>'merchant_id', '')::uuid;
    if TG_TABLE_NAME = 'claim_outcomes' then
      select merchant_id into v_new from public.support_payout_cases where id = NEW.claim_id;
    end if;
  end if;
  for v_merchant in select distinct m from unnest(array[v_old,v_new]) m where m is not null order by m loop
    insert into public.merchant_rule_input_versions(merchant_id,revision) select v_merchant,1 where exists(select 1 from public.merchants where id=v_merchant)
      on conflict(merchant_id) do update set revision = merchant_rule_input_versions.revision + 1;
  end loop;
  return null;
end $$;
revoke all on function public.advance_rule_input_revision() from public, anon, authenticated;

do $$ declare relation text; begin
  foreach relation in array array['merchant_rules','merchant_rule_versions','support_payout_cases','claim_outcomes',
    'evidence_items','source_orders','source_tickets','source_fulfillments','source_refunds',
    'merchant_users','user_permission_grants','merchant_integrations','store_connections','helpdesk_connections','category_applicability'] loop
    execute format('create trigger rule_input_revision after insert or update or delete on public.%I for each row execute function public.advance_rule_input_revision()', relation);
  end loop;
end $$;

create function public.publish_previewed_merchant_rule(
  p_merchant_id uuid, p_rule_id uuid, p_actor_id uuid, p_revision bigint,
  p_draft_id uuid, p_no_cases_ack boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_revision bigint; v_result jsonb;
begin
  if not exists(select 1 from public.merchant_users where merchant_id=p_merchant_id and user_id=p_actor_id and invite_status='active') then raise exception 'merchant_membership_required' using errcode='42501'; end if;
  -- Writers take this same row lock in their transaction before they commit.
  -- A later source write linearises after this publication and invalidates reuse.
  insert into public.merchant_rule_input_versions(merchant_id) values(p_merchant_id) on conflict do nothing;
  select revision into v_revision from public.merchant_rule_input_versions where merchant_id=p_merchant_id for update;
  if v_revision is distinct from p_revision then raise exception 'preview_stale' using errcode='40001'; end if;
  if not exists(select 1 from public.merchant_rule_versions where id=p_draft_id and merchant_rule_id=p_rule_id and merchant_id=p_merchant_id and status='draft') then
    raise exception 'draft_stale' using errcode='40001';
  end if;
  if not exists(select 1 from public.support_payout_cases where merchant_id=p_merchant_id) and not p_no_cases_ack then
    raise exception 'no_case_acknowledgement_required' using errcode='22023';
  end if;
  v_result := public.publish_merchant_rule_version(p_merchant_id,p_rule_id,p_actor_id);
  return v_result;
end $$;
revoke all on function public.publish_previewed_merchant_rule(uuid,uuid,uuid,bigint,uuid,boolean) from public, anon, authenticated;
grant execute on function public.publish_previewed_merchant_rule(uuid,uuid,uuid,bigint,uuid,boolean) to service_role;

create function public.reorder_previewed_merchant_rules(p_merchant_id uuid,p_actor_id uuid,p_revision bigint,p_order jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_revision bigint;
begin
  select revision into v_revision from public.merchant_rule_input_versions where merchant_id=p_merchant_id for update;
  if v_revision is distinct from p_revision then raise exception 'preview_stale' using errcode='40001'; end if;
  return public.reorder_merchant_rules(p_merchant_id,p_actor_id,p_order);
end $$;
revoke all on function public.reorder_previewed_merchant_rules(uuid,uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.reorder_previewed_merchant_rules(uuid,uuid,bigint,jsonb) to service_role;
