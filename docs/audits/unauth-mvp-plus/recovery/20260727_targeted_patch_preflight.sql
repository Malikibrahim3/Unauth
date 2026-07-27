select
  -- data the migrations would mutate
  (select count(*) from public.case_clarification_requests) as ccr_rows,
  (select count(*) from public.case_clarification_requests
     where status = 'sent') as ccr_status_sent_rows,
  (select count(*) from public.recovery_cases) as recovery_rows,
  -- DO-block preflight condition from 20260723200000
  (select count(*) from public.case_clarification_requests r
     join public.support_payout_cases c on c.id = r.support_payout_case_id
     where c.merchant_id <> r.merchant_id) as cross_merchant_rows,
  -- objects the patch creates
  to_regclass('public.work_saved_views')::text            as t_work_saved_views,
  to_regclass('public.case_claimed_items')::text           as t_case_claimed_items,
  to_regclass('public.source_shipment_lines')::text        as t_source_shipment_lines,
  to_regclass('public.case_recommendation_snapshots')::text as t_snapshots,
  to_regclass('public.case_outcome_events')::text          as t_outcome_events,
  to_regclass('public.provider_credit_records')::text      as t_provider_credits,
  to_regclass('public.case_prevention_observations')::text as t_prevention_obs,
  to_regclass('public.case_investigation_dispatches')::text as t_dispatches,
  to_regclass('public.case_investigation_attachments')::text as t_attachments,
  -- dependencies the patch requires
  to_regclass('public.merchants')::text        as dep_merchants,
  to_regclass('public.partners')::text         as dep_partners,
  to_regclass('public.source_order_lines')::text as dep_order_lines,
  to_regclass('public.source_shipments')::text as dep_shipments,
  to_regclass('public.source_fulfillments')::text as dep_fulfillments,
  to_regclass('public.source_records')::text   as dep_source_records,
  to_regclass('public.source_accounts')::text  as dep_source_accounts,
  to_regclass('public.evidence_items')::text   as dep_evidence_items,
  to_regclass('public.evidence_links')::text   as dep_evidence_links,
  to_regclass('public.merchant_rule_versions')::text as dep_rule_versions,
  to_regclass('public.case_financial_entries')::text as dep_fin_entries,
  to_regclass('public.work_tasks')::text       as dep_work_tasks,
  to_regclass('public.claim_events')::text     as dep_claim_events,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='is_merchant_member')  as fn_is_merchant_member,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='set_updated_at')      as fn_set_updated_at,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='record_durable_sensitive_audit') as fn_durable_audit,
  -- constraints / columns the patch adds
  (select count(*) from pg_constraint
     where conname='support_payout_cases_id_merchant_id_key') as c_spc_id_merchant,
  (select count(*) from pg_constraint
     where conname='partners_id_merchant_id_key')             as c_partners_id_merchant,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='case_clarification_requests'
       and column_name='partner_id')                          as col_ccr_partner_id,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='recovery_cases'
       and column_name='provider_claim_stage')                as col_rc_stage,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='evidence_items'
       and column_name='fact_kind')                           as col_ei_fact_kind,
  (select count(*) from storage.buckets
     where id='case-investigation-attachments')               as bucket_present;
