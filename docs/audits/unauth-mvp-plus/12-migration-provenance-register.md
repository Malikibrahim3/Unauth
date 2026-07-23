# Migration provenance register — production vs repository (Task 2E)

**Date:** 2026-07-22  **Source:** read-only capture of `supabase_migrations.schema_migrations` (version, name, statements) on production `lquvbikyvmbjbfffrlky`, compared to committed `supabase/migrations/*.sql`. Raw statements were parsed in a protected workspace and destroyed; **no raw statement text is reproduced here**. Full per-row object/operation maps: companion `12-migration-provenance-register.json`.

## Summary (223 rows = 222 production-applied + 1 repository-only)
- **content-equivalent:** 197 (prod-applied statements' object/operation map equals the current repo file's)
- **content-drifted:** 25 (same version, but prod applied different content than the current repo file)
- **repository-only:** 1 (`20260721120000_durable_sensitive_audit` — Task 2, not deployed)
- **production-only:** 0 (none — every applied version has a repo file)

> Classification uses a normalized create/alter/drop → object-kind → object-name map (robust to whitespace/comments), not raw-hash equality (prod stores parsed statement arrays; repo stores raw files, so hashes never match by construction — recorded as fingerprints only).

> **Nuance on the 25 "content-drifted" rows:** most (e.g. `0052`–`0077`) show **prod_objs=0** — production recorded the version *name* with **empty/absent statement text** (typical of early migrations recorded without stored SQL, or repaired-in), so the current repo file's objects appear as "repo-only." Only a few (e.g. `20260620120000`: prod 20 vs repo 26) are genuine both-non-empty content differences. In every case the recorded statements are an **incomplete** record — reinforcing that only the live schema is authoritative.

## Deeper finding — neither source reproduces the live schema
Beyond per-version drift: **~24 tables and ~17 enums that exist in production are created by NO `CREATE` statement in either the repo files OR the recorded `schema_migrations.statements`** (they appear only in ALTER/RLS/FK references). Conversely, recorded statements still `create table merchant_members`, which production no longer has (it is `merchant_users`). Production's live schema was therefore partly built by **untracked out-of-band DDL**; the recorded migration history is itself an incomplete record. Only the live schema (captured in `11-…` and reconstructed in `recovery/baseline_schema.sql`) is ground truth.

## Content-drifted migrations (25)
| version | name | prod objs | repo objs | prod-only ops (sample) | repo-only ops (sample) |
|---|---|--:|--:|---|---|
| 0052 | 0052_acquisition_flow | 1 | 5 | — | alter:table:founding_merchant_applications, create:policy:founding_applications_insert_own, create:policy:founding_applications_select_own, create:policy:founding_applications_update_own |
| 0053 | 0053_public_audit_auto_deletion | 1 | 3 | — | create:function:set_public_audit_deletion_schedule, create:trigger:trg_public_audit_deletion_schedule |
| 0054 | 0054_public_audit_submission_field | 1 | 3 | — | create:function:set_public_audit_deletion_schedule, create:trigger:trg_public_audit_deletion_schedule |
| 0055 | 0055_platform_watchlist_status_buc | 1 | 2 | — | alter:table:processing_jobs |
| 0056 | data_quality_column | 0 | 1 | — | alter:table:processing_jobs |
| 0057 | merchant_setup | 0 | 1 | — | alter:table:merchants |
| 0058 | drop_audit_runs | 0 | 2 | — | alter:table:transactions, drop:table:the |
| 0059 | eval_infrastructure | 0 | 1 | — | alter:table:merchants |
| 0060 | access_audit_log_cross_merchant | 0 | 1 | — | alter:table:access_audit_log |
| 0061 | schema_rename | 0 | 6 | — | alter:table:access_audit_log, alter:table:audit_transactions, alter:table:fraud_entities, alter:table:fraud_transactions |
| 0062 | evidence_packages | 0 | 3 | — | alter:table:evidence_packages, create:function:generate_evidence_reference, create:policy:merchant_own_evidence |
| 0063 | watchlist_appearances | 0 | 2 | — | alter:table:watchlist_appearances, create:policy:merchant_own_appearances |
| 0065 | demo_merchant | 0 | 1 | — | alter:table:merchants |
| 0066 | team_members | 0 | 9 | — | alter:table:merchant_members, create:index:idx_merchant_members_email, create:index:idx_merchant_members_merchant, create:index:idx_merchant_members_user |
| 0067 | permissions_audit_trail | 0 | 11 | — | alter:table:user_action_log, alter:table:user_permission_grants, create:index:idx_ual_action, create:index:idx_ual_actor |
| 0068 | upload_context | 0 | 1 | — | alter:table:processing_jobs |
| 0069 | soft_delete_watchlist_notes | 0 | 2 | — | alter:table:customer_notes, alter:table:watchlist_entries |
| 0070 | customer_activity_log | 0 | 2 | — | alter:table:customer_activity_log, create:policy:merchant_own_activity |
| 0071 | identity_results_persistence | 0 | 2 | — | alter:table:audit_transactions, alter:table:customer_profiles |
| 0072 | fix_bulk_upsert_fraud_entities_rpc | 0 | 1 | — | create:function:bulk_upsert_fraud_entities |
| 0073 | fix_audit_transactions_rls | 0 | 3 | — | create:policy:audit_transactions_insert_own, create:policy:audit_transactions_select_own, create:policy:audit_transactions_update_own |
| 0074 | add_file_hash_to_processing_jobs | 0 | 1 | — | alter:table:processing_jobs |
| 0075 | identity_match_status | 0 | 2 | — | alter:table:audit_transactions, alter:table:customer_profiles |
| 0077 | current_database_size_function | 0 | 1 | — | create:function:current_database_size_bytes |
| 20260620120000 | integration_layer_connectors | 20 | 26 | — | alter:table:category_applicability, alter:table:pack_confirmations, create:policy:category_applicability_admin_write, create:policy:category_applicability_member_select |

## Full 223-row register (compact)

| version | name | prod | repo | class |
|---|---|:--:|:--:|---|
| 0001 | initial | Y | Y | content-equivalent |
| 0002 | identity_signals | Y | Y | content-equivalent |
| 0003 | more_signals | Y | Y | content-equivalent |
| 0004 | progress_percent | Y | Y | content-equivalent |
| 0005 | identity_rpc | Y | Y | content-equivalent |
| 0006 | processing_jobs | Y | Y | content-equivalent |
| 0007 | fraud_transactions | Y | Y | content-equivalent |
| 0008 | csv_upload_queue | Y | Y | content-equivalent |
| 0009 | fraud_intelligence | Y | Y | content-equivalent |
| 0010 | refund_pattern_intelligence | Y | Y | content-equivalent |
| 0011 | adaptive_intelligence | Y | Y | content-equivalent |
| 0012 | customer_profiles | Y | Y | content-equivalent |
| 0013 | audit_is_demo | Y | Y | content-equivalent |
| 0014 | csv_column_map | Y | Y | content-equivalent |
| 0015 | watchlist | Y | Y | content-equivalent |
| 0016 | customer_notes | Y | Y | content-equivalent |
| 0017 | security_hardening | Y | Y | content-equivalent |
| 0018 | merchant_default_column_map | Y | Y | content-equivalent |
| 0019 | soft_delete | Y | Y | content-equivalent |
| 0020 | processing_jobs_unify | Y | Y | content-equivalent |
| 0021 | lookup_hardening | Y | Y | content-equivalent |
| 0022 | atomic_job_progress | Y | Y | content-equivalent |
| 0023 | bulk_write_rpcs | Y | Y | content-equivalent |
| 0024 | add_investigation_status | Y | Y | content-equivalent |
| 0025 | data_quality_column | Y | Y | content-equivalent |
| 0026 | merchant_setup | Y | Y | content-equivalent |
| 0027 | drop_audit_runs | Y | Y | content-equivalent |
| 0028 | eval_infrastructure | Y | Y | content-equivalent |
| 0029 | access_audit_log_cross_merchant | Y | Y | content-equivalent |
| 0030 | evidence_packages | Y | Y | content-equivalent |
| 0031 | schema_rename | Y | Y | content-equivalent |
| 0032 | watchlist_appearances | Y | Y | content-equivalent |
| 0033 | fix_fastest_claim_sentinel | Y | Y | content-equivalent |
| 0034 | self_learning | Y | Y | content-equivalent |
| 0035 | self_learning | Y | Y | content-equivalent |
| 0036 | team_members | Y | Y | content-equivalent |
| 0037 | fix_processing_jobs_rls | Y | Y | content-equivalent |
| 0038 | permissions_audit_trail | Y | Y | content-equivalent |
| 0039 | customer_activity_log | Y | Y | content-equivalent |
| 0040 | identity_match_status | Y | Y | content-equivalent |
| 0041 | add_file_hash_to_processing_jobs | Y | Y | content-equivalent |
| 0042 | network_metrics_snapshots | Y | Y | content-equivalent |
| 0043 | demo_merchant | Y | Y | content-equivalent |
| 0044 | upload_context | Y | Y | content-equivalent |
| 0045 | soft_delete_watchlist_notes | Y | Y | content-equivalent |
| 0046 | identity_results_persistence | Y | Y | content-equivalent |
| 0047 | fix_bulk_upsert_fraud_entities_rpc | Y | Y | content-equivalent |
| 0048 | fix_audit_transactions_rls | Y | Y | content-equivalent |
| 0049 | raise_csv_bucket_size_limit | Y | Y | content-equivalent |
| 0050 | audit_transactions_performance_indexes | Y | Y | content-equivalent |
| 0051 | audit_transactions_identity_contract_fie | Y | Y | content-equivalent |
| 0052 | 0052_acquisition_flow | Y | Y | content-drifted |
| 0053 | 0053_public_audit_auto_deletion | Y | Y | content-drifted |
| 0054 | 0054_public_audit_submission_fields | Y | Y | content-drifted |
| 0055 | 0055_platform_watchlist_status_buckets | Y | Y | content-drifted |
| 0056 | data_quality_column | Y | Y | content-drifted |
| 0057 | merchant_setup | Y | Y | content-drifted |
| 0058 | drop_audit_runs | Y | Y | content-drifted |
| 0059 | eval_infrastructure | Y | Y | content-drifted |
| 0060 | access_audit_log_cross_merchant | Y | Y | content-drifted |
| 0061 | schema_rename | Y | Y | content-drifted |
| 0062 | evidence_packages | Y | Y | content-drifted |
| 0063 | watchlist_appearances | Y | Y | content-drifted |
| 0064 | network_metrics_snapshots | Y | Y | content-equivalent |
| 0065 | demo_merchant | Y | Y | content-drifted |
| 0066 | team_members | Y | Y | content-drifted |
| 0067 | permissions_audit_trail | Y | Y | content-drifted |
| 0068 | upload_context | Y | Y | content-drifted |
| 0069 | soft_delete_watchlist_notes | Y | Y | content-drifted |
| 0070 | customer_activity_log | Y | Y | content-drifted |
| 0071 | identity_results_persistence | Y | Y | content-drifted |
| 0072 | fix_bulk_upsert_fraud_entities_rpc | Y | Y | content-drifted |
| 0073 | fix_audit_transactions_rls | Y | Y | content-drifted |
| 0074 | add_file_hash_to_processing_jobs | Y | Y | content-drifted |
| 0075 | identity_match_status | Y | Y | content-drifted |
| 0076 | raise_csv_bucket_size_limit | Y | Y | content-equivalent |
| 0077 | current_database_size_function | Y | Y | content-drifted |
| 0078 | drop_legacy_tables | Y | Y | content-equivalent |
| 0079 | background_intelligence_jobs | Y | Y | content-equivalent |
| 0080 | global_identity_graph | Y | Y | content-equivalent |
| 0081 | audit_customer_summaries | Y | Y | content-equivalent |
| 0082 | fix_watchlist_appearances_rls | Y | Y | content-equivalent |
| 20260512233551 | current_database_size_function | Y | Y | content-equivalent |
| 20260512233552 | tenancy_alignment_customer_notes | Y | Y | content-equivalent |
| 20260522203243 | perf_lookup_and_capping | Y | Y | content-equivalent |
| 20260526120000 | shopify_merchants | Y | Y | content-equivalent |
| 20260526123000 | merchant_identities | Y | Y | content-equivalent |
| 20260526130000 | processed_webhooks | Y | Y | content-equivalent |
| 20260526143000 | merchant_shopify_connections | Y | Y | content-equivalent |
| 20260526153000 | shopify_p0_hardening | Y | Y | content-equivalent |
| 20260526170000 | shopify_order_signals | Y | Y | content-equivalent |
| 20260526183000 | shopify_refund_fulfillment_events | Y | Y | content-equivalent |
| 20260526190000 | merchant_claims_outcomes_evidence | Y | Y | content-equivalent |
| 20260526201000 | customer_profile_identities | Y | Y | content-equivalent |
| 20260527000000 | claims_decouple_shopify | Y | Y | content-equivalent |
| 20260527090000 | claim_events_and_ops_statuses | Y | Y | content-equivalent |
| 20260527193000 | claim_operational_state | Y | Y | content-equivalent |
| 20260528054500 | evidence_download_tokens | Y | Y | content-equivalent |
| 20260528054600 | profile_view_tokens | Y | Y | content-equivalent |
| 20260528054700 | merchant_widget_tokens | Y | Y | content-equivalent |
| 20260528120000 | merchant_api_keys | Y | Y | content-equivalent |
| 20260528140000 | support_case_intake | Y | Y | content-equivalent |
| 20260528150000 | support_case_intake_links | Y | Y | content-equivalent |
| 20260528160000 | support_provider_webhook_secrets | Y | Y | content-equivalent |
| 20260528180000 | api_key_minute_rate_limit | Y | Y | content-equivalent |
| 20260528200000 | customer_profile_identity_hashes | Y | Y | content-equivalent |
| 20260528210000 | processing_job_chunks | Y | Y | content-equivalent |
| 20260528220000 | audit_tx_ce3_signal_hashes | Y | Y | content-equivalent |
| 20260528230000 | audit_tx_order_date | Y | Y | content-equivalent |
| 20260529000000 | audit_tx_review_worthy | Y | Y | content-equivalent |
| 20260529010000 | audit_tx_source | Y | Y | content-equivalent |
| 20260530120000 | audit_tx_shopify_bridge | Y | Y | content-equivalent |
| 20260530140000 | audit_tx_shopify_upsert_index | Y | Y | content-equivalent |
| 20260530150000 | support_signals_and_claim_intelligence | Y | Y | content-equivalent |
| 20260531000000 | audit_tx_merchant_id_dedup | Y | Y | content-equivalent |
| 20260601090000 | tag_based_claim_detection | Y | Y | content-equivalent |
| 20260601100000 | watchlist_tenancy_alignment | Y | Y | content-equivalent |
| 20260602140000 | commerce_store_connections | Y | Y | content-equivalent |
| 20260602140100 | processed_webhooks_idempotency_key | Y | Y | content-equivalent |
| 20260602140200 | processing_jobs_woocommerce_upload_type | Y | Y | content-equivalent |
| 20260602140300 | audit_transactions_woocommerce_index | Y | Y | content-equivalent |
| 20260602140400 | merchant_claims_woocommerce_detection | Y | Y | content-equivalent |
| 20260602150000 | merchant_claims_bigcommerce_detection | Y | Y | content-equivalent |
| 20260603120000 | billing_subscriptions_usage_analytics | Y | Y | content-equivalent |
| 20260603133000 | context_credit_events | Y | Y | content-equivalent |
| 20260603140000 | consume_context_credits_rpc | Y | Y | content-equivalent |
| 20260603150000 | subscription_context_credits_monthly | Y | Y | content-equivalent |
| 20260603151000 | consume_context_credits_no_unlimited | Y | Y | content-equivalent |
| 20260603170000 | watchlist_tables_deprecation_comments | Y | Y | content-equivalent |
| 20260603170100 | processing_jobs_watchlist_sync_skipped | Y | Y | content-equivalent |
| 20260603180000 | context_credits_soft_cap | Y | Y | content-equivalent |
| 20260603200000 | billing_lifecycle | Y | Y | content-equivalent |
| 20260608204859 | lockdown_network_graph_rls | Y | Y | content-equivalent |
| 20260608210440 | identity_graph_core_tables | Y | Y | content-equivalent |
| 20260608210632 | identity_graph_bulk_upsert_rpcs | Y | Y | content-equivalent |
| 20260608212353 | identity_graph_step3_views | Y | Y | content-equivalent |
| 20260608212418 | step4_time_to_claim_days | Y | Y | content-equivalent |
| 20260608212524 | step4b_fix_merchant_rls | Y | Y | content-equivalent |
| 20260608213000 | identity_graph_coverage_observability | Y | Y | content-equivalent |
| 20260613090000 | checkout_signals | Y | Y | content-equivalent |
| 20260613091000 | checkout_signal_order_links | Y | Y | content-equivalent |
| 20260613092000 | ingest_rate_limits | Y | Y | content-equivalent |
| 20260615100000 | identity_catch_events | Y | Y | content-equivalent |
| 20260616100000 | merchant_rules | Y | Y | content-equivalent |
| 20260617120000 | grant_rules_tables | Y | Y | content-equivalent |
| 20260617130000 | identity_catch_events_repair | Y | Y | content-equivalent |
| 20260617150000 | remap_rule_claim_types | Y | Y | content-equivalent |
| 20260617160000 | identity_evidence_scores | Y | Y | content-equivalent |
| 20260617170000 | evidence_default_rule_templates | Y | Y | content-equivalent |
| 20260617180000 | rule_evaluations_audit_hardening | Y | Y | content-equivalent |
| 20260619120000 | rename_claims_to_support_payout_cases | Y | Y | content-equivalent |
| 20260619130000 | recovery_operations | Y | Y | content-equivalent |
| 20260619140000 | payout_recommendation_outcomes | Y | Y | content-equivalent |
| 20260619150000 | restate_claim_evidence_type_without_loca | Y | Y | content-equivalent |
| 20260619160000 | extend_requested_action_taxonomy | Y | Y | content-equivalent |
| 20260620120000 | integration_layer_connectors | Y | Y | content-drifted |
| 20260620143000 | automation_first_loss_recovery | Y | Y | content-equivalent |
| 20260620170000 | pre_payout_investigation_workflow | Y | Y | content-equivalent |
| 20260620211000 | integration_applicability_pack_confirmat | Y | Y | content-equivalent |
| 20260621120000 | accountability_agreements | Y | Y | content-equivalent |
| 20260705120000 | loss_attribution_repeat_and_override | Y | Y | content-equivalent |
| 20260706120000 | rule_evaluations_rule_snapshot | Y | Y | content-equivalent |
| 20260708120000 | missing_account_eval_rpcs | Y | Y | content-equivalent |
| 20260710120000 | founding_merchant_applications | Y | Y | content-equivalent |
| 20260710120100 | founding_applications_grants | Y | Y | content-equivalent |
| 20260710130000 | restore_context_credit_rpcs | Y | Y | content-equivalent |
| 20260710140000 | restore_v2_evidence_artifacts | Y | Y | content-equivalent |
| 20260710140100 | fix_evidence_customer_anchor | Y | Y | content-equivalent |
| 20260711120000 | source_agnostic_foundation | Y | Y | content-equivalent |
| 20260711120500 | cleanup_domain_event_smoke_row | Y | Y | content-equivalent |
| 20260711121000 | source_agnostic_gdpr_purge | Y | Y | content-equivalent |
| 20260711123000 | source_agnostic_connection_backfill | Y | Y | content-equivalent |
| 20260711124000 | atomic_processed_webhook_claim | Y | Y | content-equivalent |
| 20260711125000 | helpdesk_event_idempotency | Y | Y | content-equivalent |
| 20260711126000 | claim_sync_job_rpc | Y | Y | content-equivalent |
| 20260711130000 | canonical_entity_model | Y | Y | content-equivalent |
| 20260711133000 | phase6_financial_backfill | Y | Y | content-equivalent |
| 20260711140000 | phase7_canonical_operations | Y | Y | content-equivalent |
| 20260711160000 | phase7_claim_evidence_canonical | Y | Y | content-equivalent |
| 20260711170000 | recovery_action_idempotency | Y | Y | content-equivalent |
| 20260711180000 | phase9_collaboration_notifications | Y | Y | content-equivalent |
| 20260711190000 | phase9_workflows | Y | Y | content-equivalent |
| 20260711200000 | connector_action_runs | Y | Y | content-equivalent |
| 20260711210000 | document_upload_quarantine | Y | Y | content-equivalent |
| 20260711220000 | phase11_operational_indexes | Y | Y | content-equivalent |
| 20260712090000 | gdpr_purge_append_only_completion | Y | Y | content-equivalent |
| 20260712100000 | dlq_ignored_status | Y | Y | content-equivalent |
| 20260712110000 | case_exceptions | Y | Y | content-equivalent |
| 20260712120000 | case_exceptions_assignee | Y | Y | content-equivalent |
| 20260712121000 | phase4_connected_objects | Y | Y | content-equivalent |
| 20260712130000 | phase5_reporting_dimensions | Y | Y | content-equivalent |
| 20260712140000 | shipbob_locations | Y | Y | content-equivalent |
| 20260712190000 | sync_jobs_active_unique | Y | Y | content-equivalent |
| 20260712210000 | shipbob_environment_audit | Y | Y | content-equivalent |
| 20260713090000 | phase6_configuration_versions | Y | Y | content-equivalent |
| 20260713100000 | financial_reconciliation_hardening | Y | Y | content-equivalent |
| 20260713103000 | work_task_projection | Y | Y | content-equivalent |
| 20260713110000 | atomic_configuration_publication | Y | Y | content-equivalent |
| 20260713113000 | configuration_draft_creation | Y | Y | content-equivalent |
| 20260713114000 | configuration_version_backfill | Y | Y | content-equivalent |
| 20260713115000 | rule_version_privileges | Y | Y | content-equivalent |
| 20260713116000 | notification_preference_contract | Y | Y | content-equivalent |
| 20260713117000 | sync_job_counters | Y | Y | content-equivalent |
| 20260713118000 | atomic_work_task_bulk_actions | Y | Y | content-equivalent |
| 20260713119000 | configuration_archive_history | Y | Y | content-equivalent |
| 20260714171500 | restore_billing_rls | Y | Y | content-equivalent |
| 20260714183000 | connection_live_verification | Y | Y | content-equivalent |
| 20260714200000 | oauth_connection_transactions | Y | Y | content-equivalent |
| 20260714201000 | connection_ownership_policies | Y | Y | content-equivalent |
| 20260714202000 | connection_scoped_credentials | Y | Y | content-equivalent |
| 20260714203000 | pending_provider_account_selections | Y | Y | content-equivalent |
| 20260714204000 | connection_scoped_sync_jobs | Y | Y | content-equivalent |
| 20260714205000 | source_orders_account_scope | Y | Y | content-equivalent |
| 20260714206000 | connection_merchant_consistency | Y | Y | content-equivalent |
| 20260714206500 | sensitive_connection_rls | Y | Y | content-equivalent |
| 20260714207000 | oauth_transaction_service_grant | Y | Y | content-equivalent |
| 20260714208000 | pending_account_selection_service_grant | Y | Y | content-equivalent |
| 20260716090000 | purge_simeon_e2e_debris | Y | Y | content-equivalent |
| 20260716091000 | purge_simeon_bad_names_reseed | Y | Y | content-equivalent |
| 20260718100000 | merchant_local_identity_resolution | Y | Y | content-equivalent |
| 20260718110000 | purge_simeon_seeded_data | Y | Y | content-equivalent |
| 20260719090000 | purge_orphaned_simeon_shipments | Y | Y | content-equivalent |
| 20260721120000 | durable_sensitive_audit | - | Y | repository-only |
