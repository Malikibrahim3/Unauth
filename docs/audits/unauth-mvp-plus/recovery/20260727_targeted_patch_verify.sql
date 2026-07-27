select
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.relname in
     ('work_saved_views','case_claimed_items','source_shipment_lines',
      'case_recommendation_snapshots','case_outcome_events','provider_credit_records')) as tables_6,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.relrowsecurity
       and c.relname in ('work_saved_views','case_claimed_items','source_shipment_lines',
      'case_recommendation_snapshots','case_outcome_events','provider_credit_records')) as rls_enabled_6,
  (select count(*) from pg_policies where schemaname='public' and tablename='work_saved_views') as pol_wsv_4,
  (select count(*) from pg_policies where schemaname='public' and tablename in
     ('case_claimed_items','source_shipment_lines','case_recommendation_snapshots',
      'case_outcome_events','provider_credit_records')) as pol_recon_5,
  (select count(*) from pg_indexes where schemaname='public' and indexname in
     ('work_saved_views_owner_name_idx','work_saved_views_shared_idx',
      'idx_case_claimed_items_case','idx_case_claimed_items_order_line',
      'idx_case_claimed_items_case_order_line','idx_source_shipment_lines_shipment',
      'idx_source_shipment_lines_order_line','idx_reconciliation_snapshots_case_type',
      'idx_reconciliation_snapshots_input','idx_case_outcome_events_case',
      'idx_provider_credit_records_match','idx_provider_credit_records_case')) as indexes_12,
  (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
     where not t.tgisinternal and t.tgname in
     ('trg_work_saved_views_updated','trg_reconciliation_snapshot_append_only',
      'trg_case_outcome_append_only','trg_case_claimed_items_updated',
      'trg_source_shipment_lines_updated','trg_provider_credit_records_updated')) as triggers_6,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname in
     ('protect_reconciliation_snapshot_history','protect_case_outcome_history',
      'purge_merchant_reconciliation_history')) as functions_3,
  (select count(*) from information_schema.role_table_grants
     where table_schema='public' and grantee='service_role' and privilege_type='SELECT'
       and table_name in ('work_saved_views','case_claimed_items','case_outcome_events',
      'case_recommendation_snapshots','source_shipment_lines','provider_credit_records')) as svc_select_6,
  (select count(*) from information_schema.columns where table_schema='public'
     and (table_name,column_name) in (('evidence_items','fact_kind'),
       ('evidence_items','external_reference'),('evidence_links','case_claimed_item_id'),
       ('evidence_links','source_order_line_id'),('evidence_links','source_shipment_id'),
       ('evidence_links','source_shipment_line_id'),('case_financial_entries','ledger_kind'),
       ('case_financial_entries','component_type'),('case_financial_entries','valuation_basis'),
       ('case_financial_entries','quantity'),('case_financial_entries','case_outcome_event_id'),
       ('case_financial_entries','provider_credit_record_id'),
       ('recovery_cases','provider_claim_stage'))) as added_columns_13,
  (select count(*) from public.recovery_cases where provider_claim_stage='sent') as backfill_sent,
  (select count(*) from public.recovery_cases where provider_claim_stage='credited') as backfill_credited,
  (select count(*) from public.recovery_cases where provider_claim_stage='prepared') as backfill_prepared,
  (select count(*) from public.recovery_cases) as recovery_total,
  (select count(*) from public.case_financial_entries where ledger_kind='legacy') as fin_legacy,
  (select count(*) from public.case_financial_entries) as fin_total;
