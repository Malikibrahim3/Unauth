-- 20260711121000_source_agnostic_gdpr_purge.sql
--
-- GDPR deletion support for the source-agnostic foundation tables.
--
-- domain_events and case_financial_entries are append-only (their triggers block
-- UPDATE/DELETE). That correctly prevents tampering but would also block both an
-- explicit merchant purge and a merchants-row cascade delete. This migration:
--   1. teaches the two immutability triggers to permit DELETE (only) when a
--      transaction-local purge flag is set;
--   2. adds a single SECURITY DEFINER RPC that purges every source-agnostic
--      table for one merchant in FK-safe order with those flags set.
-- UPDATE remains forbidden on both tables in all cases.

begin;

create or replace function public.forbid_domain_event_mutation() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'domain_events is append-only (% not allowed)', tg_op;
end;
$$;

create or replace function public.forbid_financial_entry_mutation() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_financial_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'case_financial_entries is append-only (% not allowed)', tg_op;
end;
$$;

-- FK-safe, flag-gated purge of every source-agnostic foundation table for one
-- merchant. Runs in the caller's transaction; the set_config(..., true) flags
-- are transaction-local and reset when the RPC's transaction ends.
create or replace function public.purge_merchant_source_agnostic(p_merchant_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_domain_event_purge', 'on', true);
  perform set_config('app.allow_financial_purge', 'on', true);

  delete from public.domain_event_deliveries   where merchant_id = p_merchant_id;
  delete from public.case_financial_summaries   where merchant_id = p_merchant_id;
  delete from public.case_financial_entries     where merchant_id = p_merchant_id;
  delete from public.domain_events              where merchant_id = p_merchant_id;
  delete from public.record_match_resolutions   where merchant_id = p_merchant_id;
  delete from public.record_match_candidates    where merchant_id = p_merchant_id;
  delete from public.entity_relationships       where merchant_id = p_merchant_id;
  delete from public.source_records             where merchant_id = p_merchant_id;
  delete from public.ingestion_events           where merchant_id = p_merchant_id;
  delete from public.source_accounts            where merchant_id = p_merchant_id;
end;
$$;

revoke all on function public.purge_merchant_source_agnostic(uuid) from public, anon, authenticated;
grant execute on function public.purge_merchant_source_agnostic(uuid) to service_role;

notify pgrst, 'reload schema';

commit;
