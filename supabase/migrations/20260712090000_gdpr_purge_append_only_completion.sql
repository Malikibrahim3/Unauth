-- 20260712090000_gdpr_purge_append_only_completion.sql
--
-- GDPR erasure completion for append-only tables.
--
-- forbid_mutation() and forbid_phase7_history_mutation() raise on any DELETE,
-- which correctly prevents history tampering but ALSO blocks a merchant erasure:
-- account deletion cascades from merchants → append-only child rows, tripping the
-- trigger. This migration teaches both guards to permit DELETE (only) under a
-- transaction-local purge flag, and extends purge_merchant_source_agnostic to
-- delete every append-only merchant-scoped table under that flag before the
-- merchants-row cascade runs. UPDATE stays forbidden in all cases.
--
-- Affected append-only tables: recovery_case_events, loss_case_events,
-- case_comment_events (forbid_mutation); case_decisions, case_outcomes
-- (forbid_phase7_history_mutation).

begin;

create or replace function public.forbid_mutation() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name;
end $$;

create or replace function public.forbid_phase7_history_mutation() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end $$;

-- Recreate the purge RPC: same source-agnostic coverage as before, plus the
-- append-only operational-history tables, all under the relevant purge flags.
create or replace function public.purge_merchant_source_agnostic(p_merchant_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_domain_event_purge', 'on', true);
  perform set_config('app.allow_financial_purge', 'on', true);
  perform set_config('app.allow_history_purge', 'on', true);

  -- Append-only operational history (children before their parents / before the
  -- merchants cascade would otherwise trip the immutability triggers).
  delete from public.case_comment_events        where merchant_id = p_merchant_id;
  delete from public.case_decisions             where merchant_id = p_merchant_id;
  delete from public.case_outcomes              where merchant_id = p_merchant_id;
  delete from public.recovery_case_events       where merchant_id = p_merchant_id;
  delete from public.loss_case_events           where merchant_id = p_merchant_id;

  -- Source-agnostic foundation (unchanged coverage).
  delete from public.domain_event_deliveries    where merchant_id = p_merchant_id;
  delete from public.case_financial_summaries    where merchant_id = p_merchant_id;
  delete from public.case_financial_entries      where merchant_id = p_merchant_id;
  delete from public.domain_events               where merchant_id = p_merchant_id;
  delete from public.record_match_resolutions    where merchant_id = p_merchant_id;
  delete from public.record_match_candidates     where merchant_id = p_merchant_id;
  delete from public.entity_relationships        where merchant_id = p_merchant_id;
  delete from public.source_records              where merchant_id = p_merchant_id;
  delete from public.ingestion_events            where merchant_id = p_merchant_id;
  delete from public.source_accounts             where merchant_id = p_merchant_id;
end;
$$;

commit;
