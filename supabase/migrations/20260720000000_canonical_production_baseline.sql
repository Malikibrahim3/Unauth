-- CANDIDATE baseline schema — reconstructed from a read-only Task 2E capture of production
-- lquvbikyvmbjbfffrlky (PG 17.6.x). REDACTION-SAFE: secret scan HIGH-clean; the sole email/PII
-- (migration 20260615100000 statements) is NOT schema and is excluded here.
-- Executable-verified on the official local Supabase PostgreSQL 17.6 stack on 2026-07-22.
-- Source evidence: docs/audits/unauth-mvp-plus/recovery/baseline_schema.sql.

-- ============ extensions ============
create extension if not exists "pg_cron" with schema "pg_catalog";
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "plpgsql" with schema "pg_catalog";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";

-- ============ enums ============
create type public."attribution_confidence" as enum ('high','medium','low','needs_more_evidence');
create type public."claim_decision" as enum ('approved','denied','escalated','partial_refund','full_refund','chargeback_disputed','no_action');
create type public."claim_detection_method" as enum ('tag','keyword','manual','platform_dispute','platform_refund','model');
create type public."claim_outcome" as enum ('loss','recovered','pending','chargeback_won','chargeback_lost','customer_verified','suspected_fraud','legitimate');
create type public."claim_status" as enum ('pending','open','escalated','resolved_refunded','resolved_won','resolved_lost','resolved_denied','resolved_exchanged','voided','stale','new','evidence_needed','awaiting_customer_evidence','awaiting_carrier_response','awaiting_3pl_response','awaiting_supplier_response','ready_for_decision','manual_review','decision_recorded','recovery_opened','closed');
create type public."claim_type" as enum ('item_not_received','damaged','wrong_item','not_as_described','refund_request','chargeback','return_abuse','other');
create type public."confidence_grade" as enum ('weak','possible','probable','definite');
create type public."connection_status" as enum ('active','disabled','revoked','error');
create type public."correspondence_extraction_status" as enum ('not_required','pending','extracted','failed','low_confidence');
create type public."evidence_extraction_method" as enum ('direct_api','webhook','email_parser','helpdesk_parser','llm_extractor','deterministic_rule');
create type public."external_clarification_request_status" as enum ('generated','blocked_by_settings','sent','failed','reply_received','expired');
create type public."external_correspondence_channel" as enum ('provider_api','gmail','outlook','gorgias','zendesk','intercom','slack','erp','wms','marketplace_portal_api','payment_processor_api');
create type public."external_correspondence_direction" as enum ('inbound','outbound');
create type public."fulfillment_state" as enum ('unfulfilled','partial','fulfilled','delivered','in_transit','failure','returned','unknown');
create type public."helpdesk_kind" as enum ('gorgias','zendesk','freshdesk');
create type public."identifier_type" as enum ('email','email_root','phone','shipping_address','billing_address','address_unit','ip','name','payment_fingerprint','platform_customer_id','helpdesk_contact_id');
create type public."invite_status" as enum ('pending','active','revoked');
create type public."loss_attribution" as enum ('customer_claim','carrier_loss','carrier_damage','delivery_confirmed_evidence','warehouse_mispick','warehouse_missing_item','three_pl_late_dispatch','supplier_defect','packaging_failure','merchant_policy','unknown','repeat_claimant','policy_override');
create type public."loss_case_category" as enum ('delivery_loss','chargeback_or_payment_dispute','refund_dispute','returns_abuse_or_exception','damaged_goods','wrong_item_or_missing_item','fulfilment_or_warehouse_error','3pl_accountability','shipping_protection_claim','marketplace_dispute','supplier_or_vendor_issue','tax_duty_or_customs_issue','subscription_or_digital_fulfilment_issue','unknown_post_purchase_loss');
create type public."loss_case_event_type" as enum ('case_detected','evidence_pulled','missing_evidence_identified','correspondence_ingested','correspondence_matched','correspondence_unmatched','facts_extracted','clarification_request_generated','clarification_request_sent','external_response_received','evidence_pack_generated','claim_submitted','status_synced','case_closed','sync_failed');
create type public."loss_case_evidence_source_provider" as enum ('shopify','gorgias','zendesk','intercom','aftership','carrier_api','gmail','outlook','stripe','paypal','adyen','shopify_payments','returns_provider','3pl','wms','erp','marketplace','shipping_protection_provider','supplier_portal','slack');
create type public."loss_case_status" as enum ('detected','collecting_evidence','missing_source_data','needs_external_correspondence','external_correspondence_requested','external_response_received','evidence_pack_ready','submitted','approved','partially_approved','denied','expired','closed_unrecoverable');
create type public."loss_counterparty_type" as enum ('carrier','3pl','warehouse','payment_processor','bank','card_network','marketplace','returns_provider','shipping_protection_provider','supplier','customs_broker','customer','internal_team','unknown');
create type public."loss_recovery_route" as enum ('carrier_claim','carrier_service_refund','3pl_claim','shipping_protection_claim','payment_processor_dispute','chargeback_evidence_pack','bank_or_card_network_response','returns_platform_claim','marketplace_claim','supplier_vendor_claim','internal_fulfilment_issue','customer_evidence_review','not_recoverable','needs_more_evidence');
create type public."loss_source_confidence" as enum ('source_verified','partial_source_verified','insufficient_source_data');
create type public."member_role" as enum ('owner','admin','analyst','viewer');
create type public."order_financial_status" as enum ('pending','authorized','paid','partially_paid','partially_refunded','refunded','voided','cancelled','unknown');
create type public."partner_status" as enum ('active','inactive');
create type public."partner_type" as enum ('carrier','three_pl','warehouse','supplier','returns_provider','payment_dispute_provider','internal_team','other');
create type public."platform_kind" as enum ('shopify','woocommerce','bigcommerce');
create type public."recoverability" as enum ('recoverable','possibly_recoverable','not_recoverable','needs_more_evidence','unknown');
create type public."recovery_case_event_type" as enum ('created','status_changed','evidence_added','submitted','chased','approved','partially_approved','rejected','appealed','paid','closed');
create type public."recovery_case_owner_type" as enum ('carrier','three_pl','warehouse','supplier','returns_provider','payment_dispute_provider','merchant_support','merchant_ops','merchant_finance','unknown');
create type public."recovery_case_status" as enum ('draft','evidence_needed','ready_to_submit','submitted','waiting_response','chase_due','approved','partially_approved','rejected','appealed','paid','closed_unrecoverable');
create type public."recovery_case_type" as enum ('carrier_claim','three_pl_claim','warehouse_error','supplier_defect','packaging_issue','returns_provider_claim','chargeback_evidence','internal_policy_fix','other');
create type public."recovery_confidence" as enum ('high','medium','low');
create type public."recovery_liability_cap_basis" as enum ('fixed','declared_value','insured_value','contractual','unknown');
create type public."recovery_owner" as enum ('carrier','three_pl','warehouse','supplier','merchant','unknown');
create type public."recovery_rule_claim_type" as enum ('item_not_received','damaged_item','wrong_item','missing_item','late_delivery','returnless_refund','discount_request','store_credit_request','chargeback_related','replacement_request','other');
create type public."recovery_rule_source_type" as enum ('unauth_default','merchant_configured','contract_extracted','manual');
create type public."recovery_submission_method" as enum ('portal','email','api','manual','unknown');
create type public."requested_action" as enum ('refund','reship','replacement','discount','store_credit','escalation','unknown','return_label','investigation');
create type public."signal_source" as enum ('shopify','woocommerce','bigcommerce','gorgias','zendesk','freshdesk','csv','manual','shipbob');
create type public."sync_job_status" as enum ('pending','running','completed','failed');
create type public."ticket_channel" as enum ('email','chat','sms','phone','social','portal','api','bot','unknown');

-- ============ sequences required by table defaults / functions ============
create sequence public."evidence_package_daily_seq" increment by 1 minvalue 1 start with 1;
create sequence public."migration_orphans_id_seq" increment by 1 minvalue 1 start with 1;

-- ============ tables (assembled from pg_attribute) ============
create table public."access_audit_log" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "identity_id" uuid,
  "query_type" text not null,
  "k_anonymity_satisfied" boolean not null,
  "result_returned" boolean not null,
  "queried_hashes" text[],
  "matched_merchant_count" integer,
  "lookup_type" text,
  "request_ip" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."accountability_events" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "loss_source_id" uuid,
  "recovery_task_id" uuid,
  "merchant_id" uuid not null,
  "event_type" text not null,
  "actor_type" text default 'SYSTEM'::text not null,
  "actor_name" text,
  "description" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."agreement_clauses" (
  "id" uuid default gen_random_uuid() not null,
  "agreement_id" uuid not null,
  "merchant_id" uuid not null,
  "clause_type" text not null,
  "clause_text" text not null,
  "extracted_value" jsonb default '{}'::jsonb not null,
  "confidence" text default 'LOW'::text not null,
  "page_number" integer,
  "source_location" text,
  "reviewed" boolean default false not null,
  "approved" boolean default false not null,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."agreement_rule_evaluations" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "agreement_id" uuid,
  "agreement_rule_id" uuid,
  "merchant_id" uuid not null,
  "matched" boolean not null,
  "evaluation_summary" text,
  "result" jsonb,
  "created_at" timestamp with time zone default now() not null
);
create table public."agreement_rules" (
  "id" uuid default gen_random_uuid() not null,
  "agreement_id" uuid not null,
  "clause_id" uuid,
  "merchant_id" uuid not null,
  "counterparty_name" text,
  "rule_code" text not null,
  "rule_name" text not null,
  "rule_type" text not null,
  "applies_to_claim_type" text default 'ANY'::text not null,
  "conditions" jsonb not null,
  "result" jsonb not null,
  "priority" integer default 100 not null,
  "status" text default 'draft'::text not null,
  "effective_from" date,
  "effective_to" date,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."agreements" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "agreement_type" text not null,
  "counterparty_name" text,
  "service_name" text,
  "document_name" text,
  "document_url" text,
  "file_mime_type" text,
  "file_size_bytes" integer,
  "status" text default 'uploaded'::text not null,
  "effective_from" date,
  "effective_to" date,
  "version_label" text,
  "raw_text" text,
  "uploaded_by" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."api_key_minute_counts" (
  "api_key_id" uuid not null,
  "window_minute" bigint not null,
  "count" integer default 0 not null
);
create table public."audit_customer_summaries" (
  "audit_id" uuid not null,
  "merchant_id" uuid not null,
  "customer_key" text not null,
  "customer_email" text,
  "customer_name" text,
  "order_count" integer default 0 not null,
  "total_spend" numeric default 0 not null,
  "max_score" numeric default 0 not null,
  "first_seen" timestamp with time zone,
  "last_seen" timestamp with time zone,
  "highest_grade" text,
  "updated_at" timestamp with time zone default now() not null
);
create table public."audit_result_summaries" (
  "audit_id" uuid not null,
  "merchant_id" uuid not null,
  "flagged_transactions" integer default 0 not null,
  "definite_count" integer default 0 not null,
  "probable_count" integer default 0 not null,
  "possible_count" integer default 0 not null,
  "weak_count" integer default 0 not null,
  "linked_cluster_count" integer default 0 not null,
  "customer_count" integer default 0 not null,
  "value_at_risk" numeric default 0 not null,
  "estimated_exposure" numeric default 0 not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."billing_events_log" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid,
  "event_type" text not null,
  "stripe_event_id" text,
  "payload" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."case_clarification_requests" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "target_type" text not null,
  "target_name" text,
  "status" text default 'draft'::text not null,
  "requested_evidence" text[] default '{}'::text[] not null,
  "request_summary" text not null,
  "response_summary" text,
  "source_channel" text,
  "due_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "response_received_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."case_comment_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "comment_id" uuid not null,
  "event_type" text not null,
  "actor_user_id" uuid,
  "body_snapshot" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."case_comments" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "author_user_id" uuid,
  "body" text not null,
  "evidence_item_id" uuid,
  "recovery_case_id" uuid,
  "rule_evaluation_id" uuid,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."case_decisions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "decision" text not null,
  "action" text,
  "amount_minor" bigint,
  "currency" text,
  "rule_snapshot" jsonb default '{}'::jsonb not null,
  "recommendation_snapshot" jsonb default '{}'::jsonb not null,
  "followed_recommendation" boolean,
  "reason" text,
  "actor_type" text default 'system'::text not null,
  "actor_user_id" uuid,
  "effective_at" timestamp with time zone default now() not null,
  "recorded_at" timestamp with time zone default now() not null,
  "reverses_decision_id" uuid,
  "supersedes_decision_id" uuid,
  "idempotency_key" text not null
);
create table public."case_exceptions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid,
  "exception_type" text not null,
  "confidence" text default 'probable'::text not null,
  "status" text default 'open'::text not null,
  "title" text not null,
  "detail" text,
  "context" jsonb default '{}'::jsonb not null,
  "subject_entity_type" text,
  "subject_entity_id" text,
  "source_system" text,
  "dedup_key" text not null,
  "resolution" text,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "assigned_to" uuid,
  "assigned_at" timestamp with time zone
);
create table public."case_financial_entries" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid,
  "loss_case_id" uuid,
  "recovery_case_id" uuid,
  "state" text not null,
  "amount_minor" bigint not null,
  "currency" character(3) not null,
  "direction" text default 'memo'::text not null,
  "source_record_id" uuid,
  "domain_event_id" uuid,
  "effective_at" timestamp with time zone default now() not null,
  "recorded_at" timestamp with time zone default now() not null,
  "reverses_entry_id" uuid,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."case_financial_summaries" (
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "currency" character(3) not null,
  "requested_minor" bigint default 0 not null,
  "exposed_minor" bigint default 0 not null,
  "approved_minor" bigint default 0 not null,
  "paid_minor" bigint default 0 not null,
  "estimated_loss_minor" bigint default 0 not null,
  "confirmed_loss_minor" bigint default 0 not null,
  "recoverable_minor" bigint default 0 not null,
  "recovered_minor" bigint default 0 not null,
  "prevented_minor" bigint default 0 not null,
  "written_off_minor" bigint default 0 not null,
  "last_event_id" uuid,
  "updated_at" timestamp with time zone default now() not null
);
create table public."case_outcomes" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "outcome_type" text not null,
  "amount_minor" bigint,
  "currency" text,
  "reason" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "actor_type" text default 'system'::text not null,
  "actor_user_id" uuid,
  "effective_at" timestamp with time zone default now() not null,
  "recorded_at" timestamp with time zone default now() not null,
  "reverses_outcome_id" uuid,
  "idempotency_key" text not null
);
create table public."category_applicability" (
  "merchant_id" uuid not null,
  "category" text not null,
  "status" text not null,
  "set_by" uuid,
  "set_at" timestamp with time zone default now() not null
);
create table public."checkout_signal_order_links" (
  "id" uuid default gen_random_uuid() not null,
  "checkout_signal_id" uuid not null,
  "order_id" uuid not null,
  "merchant_id" uuid not null,
  "linked_at" timestamp with time zone default now() not null
);
create table public."checkout_signals" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "visitor_id" text not null,
  "session_id" text not null,
  "device_fp" text,
  "email_hash" text,
  "ip_hash" text,
  "account_type" text,
  "platform" text not null,
  "page" text,
  "referrer" text,
  "checkout_reached" boolean default false not null,
  "cart_count" integer,
  "event_type" text not null,
  "raw_payload" jsonb,
  "created_at" timestamp with time zone default now() not null
);
create table public."claim_events" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "merchant_id" uuid not null,
  "event_type" text not null,
  "from_status" public.claim_status,
  "to_status" public.claim_status,
  "note" text,
  "actor_user_id" uuid,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."claim_evidence" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "merchant_id" uuid not null,
  "evidence_type" text not null,
  "storage_path" text,
  "evidence_hash" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "added_by" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table public."claim_outcomes" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "decision" public.claim_decision not null,
  "outcome" public.claim_outcome default 'pending'::public.claim_outcome not null,
  "amount_refunded" numeric(12,2),
  "amount_recovered" numeric(12,2),
  "notes" text,
  "decided_by" uuid,
  "decided_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "recommended_payout_action" text,
  "followed_recommendation" boolean
);
create table public."comment_mentions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "comment_id" uuid not null,
  "mentioned_user_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."connector_action_runs" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "connection_id" uuid not null,
  "support_payout_case_id" uuid,
  "capability_id" text not null,
  "external_record_id" text not null,
  "payload" jsonb default '{}'::jsonb not null,
  "status" text not null,
  "idempotency_key" text not null,
  "actor_user_id" uuid,
  "result" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone
);
create table public."context_credit_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "user_id" uuid,
  "plan_tier" text not null,
  "context_type" text not null,
  "credits_spent" integer not null,
  "claim_id" uuid,
  "ticket_ref" text,
  "order_ref" text,
  "customer_ref" text,
  "reason" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "occurred_at" timestamp with time zone default now() not null
);
create table public."correspondence_automation_settings" (
  "merchant_id" uuid not null,
  "auto_generate_clarification_requests" boolean default true not null,
  "auto_send_clarification_requests" boolean default false not null,
  "auto_ingest_external_correspondence" boolean default true not null,
  "auto_extract_facts_from_correspondence" boolean default true not null,
  "allowed_counterparty_types" text[] default ARRAY['carrier'::text, '3pl'::text, 'warehouse'::text, 'payment_processor'::text, 'bank'::text, 'card_network'::text, 'marketplace'::text, 'returns_provider'::text, 'shipping_protection_provider'::text, 'supplier'::text, 'customs_broker'::text, 'customer'::text, 'internal_team'::text, 'unknown'::text] not null,
  "allowed_outbound_channels" text[] default ARRAY['provider_api'::text, 'gmail'::text, 'outlook'::text, 'gorgias'::text, 'zendesk'::text, 'intercom'::text, 'slack'::text, 'erp'::text, 'wms'::text, 'marketplace_portal_api'::text, 'payment_processor_api'::text] not null,
  "max_auto_request_value_minor" bigint,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."credit_topup_log" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "credits_added" integer not null,
  "amount_gbp" numeric(10,2) not null,
  "stripe_payment_intent_id" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."customer_claim_summary" (
  "id" uuid default gen_random_uuid() not null,
  "customer_email_hash" text not null,
  "merchant_id" uuid not null,
  "total_orders" integer default 0 not null,
  "total_claims" integer default 0 not null,
  "claim_rate" numeric default 0 not null,
  "primary_reason" text,
  "last_claim_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null
);
create table public."customer_identity_signals" (
  "id" uuid default gen_random_uuid() not null,
  "customer_email_hash" text not null,
  "merchant_id" uuid not null,
  "phone_hash" text,
  "shipping_address_hash" text,
  "billing_address_hash" text,
  "ip_hash" text,
  "device_fingerprint" text,
  "customer_account_type" text,
  "account_created_at" timestamp with time zone,
  "days_between_account_creation_and_first_claim" integer,
  "first_seen_at" timestamp with time zone,
  "last_seen_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."default_rule_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "description" text not null,
  "conditions" jsonb not null,
  "action" text not null,
  "condition_operator" text default 'and'::text not null,
  "sort_order" integer default 0 not null
);
create table public."document_upload_jobs" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "agreement_id" uuid,
  "status" text default 'queued'::text not null,
  "error_message" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."domain_event_deliveries" (
  "id" uuid default gen_random_uuid() not null,
  "domain_event_id" uuid not null,
  "merchant_id" uuid not null,
  "handler_name" text not null,
  "status" text default 'pending'::text not null,
  "attempts" integer default 0 not null,
  "max_attempts" integer default 8 not null,
  "next_attempt_at" timestamp with time zone default now() not null,
  "leased_by" text,
  "leased_until" timestamp with time zone,
  "last_error" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."domain_events" (
  "id" uuid default gen_random_uuid() not null,
  "schema_version" integer default 1 not null,
  "merchant_id" uuid not null,
  "event_type" text not null,
  "aggregate_type" text not null,
  "aggregate_id" uuid,
  "source_record_id" uuid,
  "connection_id" uuid,
  "ingestion_event_id" uuid,
  "actor_type" text default 'system'::text not null,
  "actor_id" uuid,
  "idempotency_key" text not null,
  "correlation_id" uuid,
  "causation_id" uuid,
  "occurred_at" timestamp with time zone default now() not null,
  "recorded_at" timestamp with time zone default now() not null,
  "payload" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."entity_relationships" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "from_entity_type" text not null,
  "from_entity_id" uuid not null,
  "to_entity_type" text not null,
  "to_entity_id" uuid not null,
  "relationship_type" text not null,
  "match_status" text default 'probable'::text not null,
  "match_method" text,
  "confidence" numeric(5,4),
  "evidence" jsonb default '{}'::jsonb not null,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."evidence_download_tokens" (
  "id" uuid default gen_random_uuid() not null,
  "evidence_id" uuid not null,
  "merchant_id" uuid not null,
  "token_hash" text not null,
  "expires_at" timestamp with time zone not null,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."evidence_items" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid,
  "merchant_id" uuid not null,
  "source_system" text not null,
  "evidence_type" text not null,
  "title" text,
  "summary" text,
  "occurred_at" timestamp with time zone,
  "raw_payload" jsonb,
  "external_url" text,
  "proves" text,
  "created_at" timestamp with time zone default now() not null,
  "confidence" numeric(5,4),
  "source_record_id" text,
  "connection_id" uuid,
  "source_account_id" uuid,
  "source_url" text,
  "source_created_at" timestamp with time zone,
  "source_updated_at" timestamp with time zone,
  "ingested_at" timestamp with time zone default now() not null,
  "last_synced_at" timestamp with time zone,
  "freshness_state" text default 'unknown'::text not null,
  "sync_state" text default 'current'::text not null,
  "storage_path" text,
  "content_hash" text,
  "structured_value" jsonb default '{}'::jsonb not null,
  "source_metadata" jsonb default '{}'::jsonb not null,
  "created_by" uuid,
  "updated_at" timestamp with time zone default now() not null
);
create table public."evidence_links" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "evidence_item_id" uuid not null,
  "support_payout_case_id" uuid,
  "source_order_id" uuid,
  "source_ticket_id" uuid,
  "loss_case_id" uuid,
  "recovery_case_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table public."evidence_packages" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "customer_profile_id" uuid,
  "generated_for_order_id" uuid,
  "generated_at" timestamp with time zone default now() not null,
  "reference_number" text not null,
  "pdf_storage_path" text,
  "narrative_summary" text,
  "signal_snapshot" jsonb default '[]'::jsonb not null,
  "cross_merchant_indicator" boolean default false not null,
  "ce3_eligible" boolean default false not null,
  "ce3_qualifying_signals" jsonb default '[]'::jsonb not null,
  "ce3_prior_transactions" jsonb default '[]'::jsonb not null,
  "merchant_notes" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."external_clarification_requests" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "loss_case_id" uuid not null,
  "counterparty_type" public.loss_counterparty_type not null,
  "counterparty_name" text,
  "requested_evidence_types" text[] default '{}'::text[] not null,
  "outbound_channel" public.external_correspondence_channel not null,
  "recipient_or_endpoint" text,
  "subject" text,
  "body_hash" text,
  "source_message_id" text,
  "source_thread_id" text,
  "hidden_threading_token" text not null,
  "status" public.external_clarification_request_status default 'generated'::public.external_clarification_request_status not null,
  "sent_at" timestamp with time zone,
  "reply_received_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."external_correspondence" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "loss_case_id" uuid,
  "direction" public.external_correspondence_direction not null,
  "counterparty_type" public.loss_counterparty_type default 'unknown'::public.loss_counterparty_type not null,
  "counterparty_name" text,
  "channel" public.external_correspondence_channel not null,
  "source_provider" text not null,
  "source_record_id" text not null,
  "source_thread_id" text,
  "source_url" text,
  "subject" text,
  "body_hash" text,
  "attachment_hashes" text[] default '{}'::text[] not null,
  "matched_confidence" numeric(5,4) default 0 not null,
  "extraction_status" public.correspondence_extraction_status default 'pending'::public.correspondence_extraction_status not null,
  "extracted_facts_json" jsonb,
  "received_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "pulled_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."extracted_partner_terms" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "document_id" uuid not null,
  "partner_type" text not null,
  "covered_loss_types" text[] default '{}'::text[] not null,
  "exclusions" text[] default '{}'::text[] not null,
  "claim_deadline_days" integer,
  "required_evidence" text[] default '{}'::text[] not null,
  "max_recoverable_amount" numeric(12,2),
  "deductible_amount" numeric(12,2),
  "claim_submission_method" text,
  "escalation_contact" text,
  "confidence" text default 'medium'::text not null,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."founding_merchant_applications" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "created_by_user_id" uuid,
  "store_name" text not null,
  "monthly_order_volume" text not null,
  "monthly_refund_chargeback_volume" text,
  "fraud_problem" text not null,
  "agreed_to_terms_at" timestamp with time zone,
  "internal_notified_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."helpdesk_connections" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider" public.helpdesk_kind not null,
  "provider_account_id" text,
  "provider_account_name" text,
  "provider_base_url" text,
  "status" public.connection_status default 'active'::public.connection_status not null,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "token_expires_at" timestamp with time zone,
  "scopes" jsonb default '[]'::jsonb not null,
  "webhook_secret_hash" text,
  "webhook_secret_rotated_at" timestamp with time zone,
  "last_sync_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "webhook_secret_created_at" timestamp with time zone,
  "last_verified_at" timestamp with time zone,
  "last_verification_status" text,
  "last_verification_error" text
);
create table public."identities" (
  "id" uuid default gen_random_uuid() not null,
  "confidence_grade" public.confidence_grade default 'weak'::public.confidence_grade not null,
  "confidence_score" numeric(5,2) default 0 not null,
  "merchant_count" integer default 0 not null,
  "signal_count" integer default 0 not null,
  "first_seen_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null,
  "superseded_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."identity_catch_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "claim_id" uuid,
  "order_id" uuid,
  "profile_id" uuid,
  "submitted_identifier_hash" text not null,
  "linked_identifier_hash" text not null,
  "submitted_identifier_display" text,
  "linked_identifier_display" text,
  "matched_signal_types" text[] default '{}'::text[] not null,
  "confidence_score" smallint default 0 not null,
  "confidence_grade" text not null,
  "estimated_exposure_amount" numeric(12,2),
  "estimated_exposure_currency" character(3) default 'GBP'::bpchar not null,
  "evidence_pack_id" uuid,
  "dismissed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."identity_edges" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "left_type" public.identifier_type not null,
  "left_hash" text not null,
  "right_type" public.identifier_type not null,
  "right_hash" text not null,
  "seen_count" integer default 1 not null,
  "source" public.signal_source not null,
  "first_seen_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null
);
create table public."identity_evidence_scores" (
  "identity_id" uuid not null,
  "evidence_score" integer default 0 not null,
  "evidence_level" text default 'minimal'::text not null,
  "has_sufficient_data" boolean default false not null,
  "score_breakdown" jsonb default '[]'::jsonb not null,
  "scoring_config_version" text not null,
  "computed_at" timestamp with time zone default now() not null
);
create table public."identity_link_candidates" (
  "id" uuid default gen_random_uuid() not null,
  "primary_customer_email_hash" text not null,
  "linked_customer_email_hash" text not null,
  "merchant_id_a" uuid not null,
  "merchant_id_b" uuid not null,
  "link_type" text not null,
  "link_confidence" numeric not null,
  "detected_at" timestamp with time zone default now() not null
);
create table public."identity_members" (
  "identity_id" uuid not null,
  "identifier_type" public.identifier_type not null,
  "identifier_hash" text not null,
  "match_confidence" numeric(5,2) not null,
  "matched_via" jsonb default '[]'::jsonb not null,
  "added_at" timestamp with time zone default now() not null
);
create table public."identity_notes" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "identity_id" uuid not null,
  "body" text not null,
  "created_by" uuid,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."identity_profiles" (
  "identity_id" uuid not null,
  "total_orders" integer default 0 not null,
  "total_claims" integer default 0 not null,
  "total_chargebacks" integer default 0 not null,
  "total_refund_amount" numeric(14,2) default 0 not null,
  "claim_rate" numeric(5,4),
  "fastest_claim_days" numeric(8,2),
  "avg_claim_days" numeric(8,2),
  "claim_type_counts" jsonb default '{}'::jsonb not null,
  "merchant_count" integer default 0 not null,
  "first_seen_at" timestamp with time zone,
  "last_seen_at" timestamp with time zone,
  "refreshed_at" timestamp with time zone default now() not null
);
create table public."identity_resolution_events" (
  "id" uuid default gen_random_uuid() not null,
  "identity_id" uuid not null,
  "event_type" text not null,
  "from_grade" public.confidence_grade,
  "to_grade" public.confidence_grade,
  "detail" jsonb default '{}'::jsonb not null,
  "actor" text default 'engine'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."identity_signals" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "identifier_type" public.identifier_type not null,
  "identifier_hash" text not null,
  "source" public.signal_source not null,
  "source_order_id" uuid,
  "source_customer_id" uuid,
  "source_ticket_id" uuid,
  "observed_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."ingest_rate_limits" (
  "ip_hash" text not null,
  "window_start" timestamp with time zone not null,
  "request_count" integer default 1 not null
);
create table public."ingestion_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "connection_id" uuid,
  "source_system" text not null,
  "source_account_ref" text,
  "provider_event_id" text,
  "event_type" text,
  "idempotency_key" text not null,
  "payload_hash" text not null,
  "payload_ref" text,
  "payload" jsonb,
  "status" text default 'pending'::text not null,
  "attempts" integer default 0 not null,
  "max_attempts" integer default 8 not null,
  "next_attempt_at" timestamp with time zone default now() not null,
  "leased_by" text,
  "leased_until" timestamp with time zone,
  "last_error" text,
  "retention_deadline" timestamp with time zone,
  "received_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."ingestion_field_errors" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "ingestion_event_id" uuid,
  "source_record_id" uuid,
  "field" text not null,
  "code" text not null,
  "severity" text default 'error'::text not null,
  "raw_value_hash" text,
  "message" text,
  "resolution_status" text default 'open'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."integration_credentials" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider_id" text not null,
  "encrypted_payload" text not null,
  "scopes" text[] default '{}'::text[] not null,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "connection_id" uuid not null,
  "key_version" integer default 1 not null,
  "rotated_at" timestamp with time zone
);
create table public."integration_documents" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "document_type" text not null,
  "file_path" text not null,
  "extraction_status" text default 'uploaded'::text not null,
  "approved_at" timestamp with time zone,
  "approved_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "malware_scan_status" text default 'pending'::text not null,
  "content_type" text,
  "size_bytes" bigint,
  "scan_completed_at" timestamp with time zone
);
create table public."integration_evidence_items" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid,
  "source_provider" text not null,
  "source_category" text not null,
  "evidence_type" text not null,
  "title" text not null,
  "summary" text not null,
  "confidence" text not null,
  "value" jsonb,
  "occurred_at" timestamp with time zone,
  "raw_reference" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."loss_attribution_candidates" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "loss_case_id" uuid not null,
  "attribution" text not null,
  "confidence" numeric(5,4),
  "accountable_party_type" text,
  "accountable_party_name" text,
  "source_loss_id" uuid,
  "is_primary" boolean default false not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."loss_case_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "loss_case_id" uuid not null,
  "event_type" public.loss_case_event_type not null,
  "source_provider" text,
  "source_record_id" text,
  "metadata_json" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."loss_case_evidence" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "loss_case_id" uuid not null,
  "evidence_type" text not null,
  "source_provider" public.loss_case_evidence_source_provider not null,
  "source_record_id" text not null,
  "source_thread_id" text,
  "source_url" text,
  "value_json" jsonb not null,
  "raw_payload_hash" text not null,
  "source_verified" boolean default true not null,
  "extracted_by" public.evidence_extraction_method not null,
  "extraction_confidence" numeric(5,4),
  "pulled_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."loss_cases" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid,
  "case_category" public.loss_case_category not null,
  "case_type" text not null,
  "recovery_route" public.loss_recovery_route not null,
  "status" public.loss_case_status default 'detected'::public.loss_case_status not null,
  "order_id" uuid,
  "customer_identity_id" uuid,
  "helpdesk_ticket_id" uuid,
  "payment_id" text,
  "dispute_id" text,
  "return_id" text,
  "shipment_id" text,
  "fulfilment_id" text,
  "counterparty_type" public.loss_counterparty_type default 'unknown'::public.loss_counterparty_type not null,
  "counterparty_name" text,
  "evidence_completion_score" numeric(5,2) default 0 not null,
  "missing_evidence_count" integer default 0 not null,
  "claim_deadline_at" timestamp with time zone,
  "order_value_minor" bigint,
  "refund_value_minor" bigint,
  "chargeback_value_minor" bigint,
  "estimated_recovery_minor" bigint,
  "approved_recovery_minor" bigint,
  "currency" text,
  "source_confidence" public.loss_source_confidence default 'insufficient_source_data'::public.loss_source_confidence not null,
  "source_fingerprint" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "financial_state" text default 'estimated'::text not null,
  "financial_entry_ids" uuid[] default '{}'::uuid[] not null,
  "attribution" text,
  "attribution_confidence" numeric(5,4),
  "recoverability" text,
  "owner_user_id" uuid,
  "confirmed_at" timestamp with time zone,
  "estimated_at" timestamp with time zone,
  "prevention_only" boolean default false not null,
  "written_off_at" timestamp with time zone,
  "source_record_id" uuid,
  "source_metadata" jsonb default '{}'::jsonb not null
);
create table public."loss_sources" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "merchant_id" uuid not null,
  "source_type" text not null,
  "confidence" text default 'LOW'::text not null,
  "evidence_summary" text,
  "evidence_item_ids" uuid[] default '{}'::uuid[] not null,
  "money_at_risk" numeric(12,2) default 0 not null,
  "potential_recovery_amount" numeric(12,2) default 0 not null,
  "accountable_party_type" text default 'UNKNOWN'::text not null,
  "accountable_party_name" text,
  "status" text default 'open'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."merchant_api_keys" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "key_hash" text not null,
  "key_prefix" text not null,
  "name" text,
  "rate_limit_per_minute" integer default 60 not null,
  "created_at" timestamp with time zone default now() not null,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone
);
create table public."merchant_credits" (
  "merchant_id" uuid not null,
  "monthly_credits_remaining" integer default 0 not null,
  "topup_credits_remaining" integer default 0 not null,
  "cycle_reset_at" timestamp with time zone not null,
  "last_reset_at" timestamp with time zone,
  "usage_warning_sent_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null
);
create table public."merchant_customer_signals" (
  "merchant_id" uuid not null,
  "merchant_customer_id" uuid not null,
  "identifier_type" text not null,
  "identifier_hash" text not null,
  "source_entity_type" text not null,
  "source_entity_id" uuid not null,
  "first_seen_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null,
  "seen_count" integer default 1 not null,
  "evidence" jsonb default '{}'::jsonb not null
);
create table public."merchant_customers" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "identity_id" uuid,
  "display_name" text,
  "email" text,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "resolution_status" text default 'active'::text not null,
  "superseded_by" uuid,
  "matcher_version" text,
  "last_resolved_at" timestamp with time zone
);
create table public."merchant_identity_state" (
  "merchant_id" uuid not null,
  "identity_id" uuid not null,
  "on_watchlist" boolean default false not null,
  "investigation_status" text default 'new'::text not null,
  "display_name" text,
  "display_email" text,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."merchant_integrations" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider_id" text not null,
  "category" text not null,
  "status" text default 'not_connected'::text not null,
  "auth_mode" text not null,
  "last_sync_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "display_name" text,
  "provider_account_id" text,
  "provider_account_name" text,
  "provider_base_url" text,
  "capabilities_snapshot" jsonb default '{}'::jsonb not null,
  "granted_scopes" text[] default '{}'::text[] not null,
  "writeback_enabled" boolean default false not null,
  "subscribed" boolean default false not null,
  "last_sync_started_at" timestamp with time zone,
  "last_sync_completed_at" timestamp with time zone,
  "last_successful_sync_at" timestamp with time zone,
  "next_scheduled_sync_at" timestamp with time zone,
  "data_fresh_through" timestamp with time zone,
  "sync_cursor" jsonb,
  "webhook_status" text,
  "webhook_last_received_at" timestamp with time zone,
  "imported_record_count" bigint default 0 not null,
  "last_error_code" text,
  "last_error_message" text,
  "last_error_at" timestamp with time zone,
  "connector_version" text,
  "disconnected_at" timestamp with time zone,
  "environment" text,
  "authorization_host" text,
  "api_base_url_family" text,
  "authentication_mode" text,
  "connection_created_at" timestamp with time zone,
  "last_verified_at" timestamp with time zone,
  "last_verification_status" text,
  "last_verification_error" text
);
create table public."merchant_rule_versions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "merchant_rule_id" uuid not null,
  "version" integer not null,
  "status" text not null,
  "name" text not null,
  "description" text,
  "conditions" jsonb default '[]'::jsonb not null,
  "action" text not null,
  "condition_operator" text default 'and'::text not null,
  "priority" integer default 0 not null,
  "created_by" uuid,
  "published_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "published_at" timestamp with time zone,
  "supersedes_version_id" uuid
);
create table public."merchant_rules" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "name" text not null,
  "description" text,
  "is_active" boolean default true not null,
  "priority" integer default 0 not null,
  "conditions" jsonb default '[]'::jsonb not null,
  "action" text not null,
  "condition_operator" text default 'and'::text not null,
  "is_default_template" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "archived_at" timestamp with time zone
);
create table public."merchant_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "plan_id" text not null,
  "status" text default 'active'::text not null,
  "stripe_subscription_id" text,
  "stripe_customer_id" text,
  "current_period_start" timestamp with time zone default date_trunc('month'::text, (now() AT TIME ZONE 'UTC'::text)) not null,
  "current_period_end" timestamp with time zone,
  "cancel_at_period_end" boolean default false not null,
  "downgrade_to_plan_id" text,
  "grace_period_ends_at" timestamp with time zone,
  "context_credits_monthly" integer,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."merchant_users" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "user_id" uuid,
  "invited_email" text not null,
  "role" public.member_role default 'analyst'::public.member_role not null,
  "invite_status" public.invite_status default 'pending'::public.invite_status not null,
  "invited_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "accepted_at" timestamp with time zone
);
create table public."merchant_widget_tokens" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "api_key_id" uuid,
  "token_hash" text not null,
  "token_prefix" text not null,
  "created_at" timestamp with time zone default now() not null,
  "revoked_at" timestamp with time zone
);
create table public."merchants" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "is_demo" boolean default false not null,
  "is_internal" boolean default false not null,
  "settings" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "bigcommerce_script_uuid" text,
  "shopify_collector_script_tag_id" text,
  "shopify_collector_init_script_tag_id" text
);
create table public."migration_orphans" (
  "id" bigint default nextval('public.migration_orphans_id_seq'::regclass) not null,
  "phase" text not null,
  "source_table" text not null,
  "source_key" text not null,
  "reason" text not null,
  "detail" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
alter sequence public."migration_orphans_id_seq" owned by public."migration_orphans"."id";
create table public."network_access_log" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "queried_hashes" text[] not null,
  "matched_identity_count" integer default 0 not null,
  "k_anonymity_satisfied" boolean not null,
  "request_ip" inet not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."notification_preferences" (
  "merchant_id" uuid not null,
  "user_id" uuid not null,
  "kind" text not null,
  "in_app_enabled" boolean default true not null,
  "email_enabled" boolean default false not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "recipient_user_id" uuid not null,
  "kind" text not null,
  "title" text not null,
  "body" text,
  "target_href" text not null,
  "domain_event_id" uuid,
  "deduplication_key" text not null,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."oauth_connection_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "state_hash" text not null,
  "merchant_id" uuid not null,
  "user_id" uuid not null,
  "provider_id" text not null,
  "environment" text not null,
  "callback_url" text not null,
  "provider_account_hint" text,
  "expires_at" timestamp with time zone not null,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."order_claim_context" (
  "id" uuid default gen_random_uuid() not null,
  "support_case_id" uuid not null,
  "merchant_id" uuid not null,
  "order_ref" text,
  "order_value" numeric,
  "order_created_at" timestamp with time zone,
  "fulfillment_status_at_claim" text,
  "delivery_status_at_claim" text,
  "shipping_carrier" text,
  "tracking_number" text,
  "days_since_order_at_claim" integer,
  "days_since_delivery_at_claim" integer,
  "payment_method" text,
  "discount_code_used" boolean,
  "discount_amount" numeric,
  "is_first_order" boolean,
  "shipping_equals_billing" boolean,
  "was_refunded_previously" boolean,
  "refund_amount_requested" numeric,
  "refund_amount_approved" numeric,
  "partial_refund" boolean,
  "created_at" timestamp with time zone default now() not null
);
create table public."pack_confirmations" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "order_id" text not null,
  "fulfillment_id" text not null,
  "confirmed_by" text,
  "item_match_confirmed" boolean default false not null,
  "photo_url" text,
  "confirmed_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."partner_recovery_rules" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "partner_id" uuid,
  "rule_name" text not null,
  "recovery_type" public.recovery_case_type not null,
  "applies_to_claim_type" public.recovery_rule_claim_type not null,
  "claimable_costs" text[] default '{}'::text[] not null,
  "excluded_costs" text[] default '{}'::text[] not null,
  "required_evidence" text[] default '{}'::text[] not null,
  "deadline_days" integer,
  "liability_cap_amount" numeric(12,2),
  "liability_cap_currency" text,
  "liability_cap_basis" public.recovery_liability_cap_basis,
  "submission_method" public.recovery_submission_method,
  "submission_url" text,
  "submission_email" text,
  "source_type" public.recovery_rule_source_type default 'merchant_configured'::public.recovery_rule_source_type not null,
  "confidence" public.recovery_confidence default 'medium'::public.recovery_confidence not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."partners" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "partner_type" public.partner_type not null,
  "name" text not null,
  "external_reference" text,
  "contact_email" text,
  "contact_url" text,
  "notes" text,
  "status" public.partner_status default 'active'::public.partner_status not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."pending_provider_account_selections" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "user_id" uuid not null,
  "provider_id" text not null,
  "environment" text not null,
  "accounts" jsonb not null,
  "encrypted_payload" text not null,
  "expires_at" timestamp with time zone not null,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."plans" (
  "plan_id" text not null,
  "name" text not null,
  "price_gbp" numeric(10,2) default 0 not null,
  "credits_monthly" integer,
  "stripe_price_id" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."processed_webhooks" (
  "idempotency_key" text not null,
  "provider" text not null,
  "store_key" text,
  "topic" text,
  "status" text default 'received'::text not null,
  "attempts" integer default 0 not null,
  "last_error" text,
  "processed_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."profile_view_tokens" (
  "id" uuid default gen_random_uuid() not null,
  "profile_id" uuid not null,
  "merchant_id" uuid not null,
  "token_hash" text not null,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."record_match_candidates" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "subject_entity_type" text not null,
  "subject_entity_id" uuid not null,
  "candidate_entity_type" text not null,
  "candidate_entity_id" uuid not null,
  "match_method" text not null,
  "confidence" numeric(5,4),
  "status" text default 'open'::text not null,
  "evidence" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."record_match_resolutions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "subject_entity_type" text not null,
  "subject_entity_id" uuid not null,
  "selected_candidate_id" uuid,
  "prior_status" text,
  "new_status" text not null,
  "reason" text,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone default now() not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."recovery_case_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "recovery_case_id" uuid not null,
  "event_type" public.recovery_case_event_type not null,
  "from_status" public.recovery_case_status,
  "to_status" public.recovery_case_status,
  "note" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "idempotency_key" text
);
create table public."recovery_cases" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid not null,
  "partner_id" uuid,
  "recovery_type" public.recovery_case_type not null,
  "owner_type" public.recovery_case_owner_type default 'unknown'::public.recovery_case_owner_type not null,
  "status" public.recovery_case_status default 'draft'::public.recovery_case_status not null,
  "merchant_loss_amount" numeric(12,2) default 0 not null,
  "eligible_loss_amount" numeric(12,2),
  "estimated_recoverable_min" numeric(12,2),
  "estimated_recoverable_max" numeric(12,2),
  "amount_recovered" numeric(12,2),
  "currency" text default 'USD'::text not null,
  "deadline_at" timestamp with time zone,
  "next_chase_at" timestamp with time zone,
  "last_chased_at" timestamp with time zone,
  "evidence_required" text[] default '{}'::text[] not null,
  "evidence_missing" text[] default '{}'::text[] not null,
  "evidence_complete" boolean default false not null,
  "rejection_reason" text,
  "calculation_reason" text[] default '{}'::text[] not null,
  "excluded_costs" jsonb default '[]'::jsonb not null,
  "internal_owner_user_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "loss_case_id" uuid,
  "prevention_only" boolean default false not null
);
create table public."recovery_tasks" (
  "id" uuid default gen_random_uuid() not null,
  "claim_id" uuid not null,
  "loss_source_id" uuid,
  "merchant_id" uuid not null,
  "task_type" text not null,
  "owner_type" text default 'UNKNOWN'::text not null,
  "owner_name" text,
  "owner_email" text,
  "due_at" timestamp with time zone,
  "priority" text default 'MEDIUM'::text not null,
  "status" text default 'open'::text not null,
  "amount_to_recover" numeric(12,2) default 0 not null,
  "recovery_deadline" timestamp with time zone,
  "external_reference" text,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."rule_evaluations" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "claim_id" uuid,
  "identity_id" uuid,
  "rule_id" uuid,
  "recommendation" text,
  "matched_conditions" jsonb,
  "all_rules_evaluated" jsonb,
  "evaluated_at" timestamp with time zone default now() not null,
  "source_ticket_id" uuid,
  "evaluation_source" text,
  "signals_hash" text,
  "context_hash" text,
  "rules_hash" text,
  "justification_summary" text,
  "dedupe_key" text,
  "rule_snapshot" jsonb
);
create table public."source_accounts" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "connection_id" uuid,
  "provider_id" text not null,
  "external_account_id" text,
  "display_name" text,
  "base_url" text,
  "is_synthetic" boolean default false not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "environment" text
);
create table public."source_addresses" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_customer_id" uuid,
  "kind" text not null,
  "line1" text,
  "line2" text,
  "city" text,
  "region" text,
  "postal_code" text,
  "country" text,
  "phone" text,
  "normalized_full" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."source_customers" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source" public.signal_source not null,
  "connection_id" uuid,
  "external_id" text not null,
  "email" text,
  "phone" text,
  "first_name" text,
  "last_name" text,
  "verified_email" boolean,
  "account_created_at" timestamp with time zone,
  "orders_count" integer,
  "total_spent" numeric(12,2),
  "tags" jsonb default '[]'::jsonb not null,
  "note" text,
  "linked_platform_customer_external_id" text,
  "other_emails" jsonb default '[]'::jsonb not null,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "merchant_customer_id" uuid
);
create table public."source_disputes" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_order_id" uuid,
  "external_id" text not null,
  "dispute_type" text,
  "reason" text,
  "amount" numeric(12,2),
  "currency" text,
  "status" text,
  "initiated_at" timestamp with time zone,
  "finalized_at" timestamp with time zone,
  "ingested_at" timestamp with time zone default now() not null
);
create table public."source_fulfillments" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_order_id" uuid not null,
  "external_id" text not null,
  "status" text,
  "shipment_status" text,
  "tracking_company" text,
  "tracking_number" text,
  "occurred_at" timestamp with time zone,
  "updated_at_source" timestamp with time zone,
  "ingested_at" timestamp with time zone default now() not null
);
create table public."source_locations" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "name" text,
  "status" text,
  "address" jsonb default '{}'::jsonb not null,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "source_created_at" timestamp with time zone,
  "source_updated_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_messages" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_ticket_id" uuid not null,
  "source_record_id" uuid,
  "external_id" text not null,
  "actor_type" text,
  "channel" text,
  "visibility" text,
  "summary" text,
  "body_ref" text,
  "attachment_metadata" jsonb default '[]'::jsonb not null,
  "sent_at" timestamp with time zone,
  "source_sent_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."source_order_lines" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_order_id" uuid not null,
  "source_record_id" uuid,
  "external_id" text not null,
  "sku" text,
  "product_ref" text,
  "variant_ref" text,
  "title" text,
  "quantity" integer,
  "unit_price_minor" bigint,
  "total_minor" bigint,
  "cost_minor" bigint,
  "currency" character(3),
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_orders" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source" public.signal_source not null,
  "connection_id" uuid,
  "external_id" text not null,
  "order_number" text,
  "source_customer_id" uuid,
  "email" text,
  "phone" text,
  "financial_status" public.order_financial_status default 'unknown'::public.order_financial_status not null,
  "fulfillment_state" public.fulfillment_state default 'unknown'::public.fulfillment_state not null,
  "total_price" numeric(12,2),
  "subtotal_price" numeric(12,2),
  "total_discounts" numeric(12,2),
  "currency" text,
  "discount_codes" jsonb default '[]'::jsonb not null,
  "payment_gateway" text,
  "card_last4" text,
  "browser_ip" inet not null,
  "user_agent" text,
  "accept_language" text,
  "landing_site" text,
  "referring_site" text,
  "source_name" text,
  "shipping_address_id" uuid,
  "billing_address_id" uuid,
  "line_items_count" integer,
  "note" text,
  "tags" jsonb default '[]'::jsonb not null,
  "placed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancel_reason" text,
  "raw_payload_hash" text,
  "ingested_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "job_id" uuid,
  "customer_email" text,
  "customer_name" text,
  "order_value" numeric,
  "processed_at" timestamp with time zone,
  "identity_score" numeric,
  "identity_confidence_grade" text,
  "match_status" text,
  "dismissed_by_merchant" boolean default false not null,
  "cluster_id" uuid,
  "source_account_id" uuid,
  "merchant_customer_id" uuid
);
create table public."source_payments" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_order_id" uuid,
  "source_customer_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "provider" text,
  "method_category" text,
  "status" text,
  "source_status" text,
  "amount_minor" bigint,
  "currency" character(3),
  "captured_at" timestamp with time zone,
  "refunded_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_records" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "connection_id" uuid,
  "source_account_id" uuid,
  "source_system" text not null,
  "source_entity_type" text not null,
  "external_id" text not null,
  "canonical_entity_type" text,
  "canonical_entity_id" uuid,
  "source_url" text,
  "source_created_at" timestamp with time zone,
  "source_updated_at" timestamp with time zone,
  "ingested_at" timestamp with time zone default now() not null,
  "last_synced_at" timestamp with time zone,
  "sync_state" text default 'current'::text not null,
  "freshness_state" text default 'fresh'::text not null,
  "connector_version" text,
  "payload_hash" text,
  "source_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_refunds" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_order_id" uuid not null,
  "external_id" text not null,
  "amount" numeric(12,2),
  "currency" text,
  "reason" text,
  "is_full_refund" boolean,
  "refunded_at" timestamp with time zone,
  "raw_payload_hash" text,
  "ingested_at" timestamp with time zone default now() not null
);
create table public."source_replacements" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_order_id" uuid,
  "support_payout_case_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "status" text,
  "source_status" text,
  "original_line_ref" text,
  "replacement_line_ref" text,
  "item_value_minor" bigint,
  "shipping_cost_minor" bigint,
  "currency" character(3),
  "issued_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_returns" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_order_id" uuid,
  "support_payout_case_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "status" text,
  "source_status" text,
  "disposition" text,
  "requested_at" timestamp with time zone,
  "received_at" timestamp with time zone,
  "inspected_at" timestamp with time zone,
  "refund_reference" text,
  "replacement_reference" text,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_shipments" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_order_id" uuid,
  "source_fulfillment_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "tracking_number" text,
  "carrier" text,
  "service" text,
  "status" text,
  "source_status" text,
  "shipped_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."source_ticket_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_ticket_id" uuid not null,
  "event_type" text not null,
  "actor_type" text,
  "summary" text,
  "extracted_identifiers" jsonb default '{}'::jsonb not null,
  "occurred_at" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "raw_payload_hash" text,
  "created_at" timestamp with time zone default now() not null,
  "event_idempotency_key" text
);
create table public."source_tickets" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider" public.helpdesk_kind not null,
  "connection_id" uuid,
  "external_id" text not null,
  "external_url" text,
  "source_customer_id" uuid,
  "subject" text,
  "status" text,
  "channel" public.ticket_channel default 'unknown'::public.ticket_channel not null,
  "tags" jsonb default '[]'::jsonb not null,
  "is_spam" boolean,
  "satisfaction_score" numeric,
  "message_count" integer,
  "customer_reply_count" integer,
  "was_reopened" boolean,
  "linked_order_external_ids" jsonb default '[]'::jsonb not null,
  "opened_at_provider" timestamp with time zone,
  "closed_at_provider" timestamp with time zone,
  "created_at_provider" timestamp with time zone,
  "updated_at_provider" timestamp with time zone,
  "raw_payload_hash" text,
  "ingested_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "merchant_customer_id" uuid
);
create table public."source_tracking_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_shipment_id" uuid not null,
  "source_record_id" uuid,
  "external_id" text not null,
  "status" text,
  "source_status" text,
  "location_text" text,
  "description" text,
  "event_at" timestamp with time zone,
  "source_event_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."source_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_account_id" uuid,
  "source_order_id" uuid,
  "source_payment_id" uuid,
  "source_record_id" uuid,
  "external_id" text not null,
  "transaction_type" text,
  "status" text,
  "source_status" text,
  "amount_minor" bigint,
  "currency" character(3),
  "parent_transaction_ref" text,
  "provider_reference" text,
  "occurred_at" timestamp with time zone,
  "raw_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."store_connections" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "platform" public.platform_kind not null,
  "store_key" text not null,
  "store_url" text,
  "status" public.connection_status default 'active'::public.connection_status not null,
  "credentials_encrypted" text not null,
  "scopes" jsonb default '[]'::jsonb not null,
  "installed_at" timestamp with time zone default now() not null,
  "uninstalled_at" timestamp with time zone,
  "last_sync_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "collector_metadata" jsonb default '{}'::jsonb not null,
  "last_verified_at" timestamp with time zone,
  "last_verification_status" text,
  "last_verification_error" text
);
create table public."support_case_events" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_case_id" uuid not null,
  "provider" text not null,
  "event_type" text not null,
  "event_summary" text,
  "actor_type" text,
  "actor_identifier_hash" text,
  "occurred_at_provider" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "raw_payload_hash" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."support_case_intake" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider" text not null,
  "provider_connection_id" uuid,
  "external_case_id" text not null,
  "external_url" text,
  "customer_email_hash" text,
  "customer_identifier" text,
  "order_ref" text,
  "shop_domain" text,
  "claim_reason" text,
  "customer_message_summary" text,
  "agent_notes_summary" text,
  "case_status" text,
  "decision" text,
  "outcome" text,
  "attachments_metadata" jsonb default '[]'::jsonb not null,
  "tags" jsonb default '[]'::jsonb not null,
  "raw_payload_hash" text not null,
  "created_at_provider" timestamp with time zone,
  "updated_at_provider" timestamp with time zone,
  "ingested_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "shopify_order_id" text,
  "customer_profile_id" uuid,
  "merchant_claim_id" uuid,
  "link_status" text default 'unlinked'::text not null,
  "linked_at" timestamp with time zone,
  "link_metadata" jsonb default '{}'::jsonb not null,
  "channel" text,
  "message_count" integer,
  "customer_reply_count" integer,
  "was_reopened" boolean,
  "macros_used" jsonb default '[]'::jsonb not null,
  "sentiment_score" numeric,
  "chargeback_threatened" boolean default false not null,
  "is_claim" boolean default false not null,
  "claim_type" text,
  "claim_type_confidence" numeric,
  "provided_evidence" boolean,
  "accepted_first_resolution" boolean,
  "resolution_type" text,
  "escalation_count" integer,
  "time_to_first_claim_message_seconds" integer
);
create table public."support_payout_cases" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "source_ticket_id" uuid,
  "source_order_id" uuid,
  "identity_id" uuid,
  "claim_type" public.claim_type not null,
  "status" public.claim_status default 'pending'::public.claim_status not null,
  "detection_method" public.claim_detection_method default 'keyword'::public.claim_detection_method not null,
  "detection_detail" jsonb default '{}'::jsonb not null,
  "reason_raw" text,
  "reason_normalized" text,
  "amount_at_risk" numeric(12,2),
  "currency" text,
  "requires_review" boolean default false not null,
  "assigned_to" uuid,
  "assigned_at" timestamp with time zone,
  "snoozed_until" timestamp with time zone,
  "first_viewed_at" timestamp with time zone,
  "submitted_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "refund_amount" numeric(12,2),
  "replacement_item_value" numeric(12,2),
  "replacement_shipping_cost" numeric(12,2),
  "discount_amount" numeric(12,2),
  "store_credit_amount" numeric(12,2),
  "estimated_support_cost" numeric(12,2),
  "total_estimated_loss" numeric(12,2),
  "requested_action" public.requested_action default 'unknown'::public.requested_action not null,
  "loss_attribution" public.loss_attribution,
  "attribution_confidence" public.attribution_confidence,
  "recoverability" public.recoverability,
  "recovery_owner" public.recovery_owner,
  "recovery_required_evidence" text[] default '{}'::text[] not null,
  "recovery_next_action" text,
  "recommended_payout_action" text,
  "recommended_rule_name" text,
  "recommended_rule_id" uuid,
  "payout_decision_state" text default 'undecided'::text not null,
  "recovery_state" text default 'no_recovery_needed'::text not null,
  "next_action" text,
  "next_action_reason" text,
  "case_origin" text default 'connector'::text not null,
  "manual_reference" text,
  "manual_source_url" text,
  "state_version" bigint default 1 not null,
  "primary_currency" character(3),
  "merchant_customer_id" uuid
);
create table public."support_provider_connections" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "provider" text not null,
  "provider_account_id" text,
  "provider_account_name" text,
  "provider_base_url" text,
  "status" text default 'active'::text not null,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "token_expires_at" timestamp with time zone,
  "scopes" jsonb default '[]'::jsonb not null,
  "last_sync_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "webhook_secret_hash" text,
  "webhook_secret_created_at" timestamp with time zone,
  "webhook_secret_rotated_at" timestamp with time zone
);
create table public."sync_job_chunks" (
  "id" uuid default gen_random_uuid() not null,
  "job_id" uuid not null,
  "chunk_index" integer not null,
  "status" public.sync_job_status default 'pending'::public.sync_job_status not null,
  "claimed_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_error" text,
  "attempts" integer default 0 not null,
  "max_attempts" integer default 8 not null,
  "next_attempt_at" timestamp with time zone
);
create table public."sync_jobs" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "job_kind" text not null,
  "source" public.signal_source,
  "status" public.sync_job_status default 'pending'::public.sync_job_status not null,
  "label" text,
  "storage_path" text,
  "file_hash" text,
  "column_map" jsonb,
  "total_rows" integer,
  "processed_rows" integer default 0 not null,
  "failed_rows" integer default 0 not null,
  "error_log" jsonb default '[]'::jsonb not null,
  "finalize_claimed_at" timestamp with time zone,
  "hidden" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null,
  "connection_id" uuid,
  "source_account_id" uuid,
  "cursor" jsonb,
  "next_attempt_at" timestamp with time zone,
  "attempts" integer default 0 not null,
  "max_attempts" integer default 8 not null,
  "started_at" timestamp with time zone,
  "last_error_code" text
);
create table public."unmatched_correspondence" (
  "id" uuid not null,
  "merchant_id" uuid not null,
  "source_provider" text not null,
  "source_record_id" text not null,
  "source_thread_id" text,
  "source_url" text,
  "candidate_json" jsonb default '{}'::jsonb not null,
  "reason" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."user_action_log" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "actor_user_id" uuid,
  "actor_role" text not null,
  "action" text not null,
  "resource_type" text,
  "resource_id" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "request_ip" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."user_permission_grants" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "grantee_user_id" uuid not null,
  "permission" text not null,
  "granted_by" uuid,
  "revoked" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "revoked_at" timestamp with time zone
);
create table public."webhook_logs" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text not null,
  "external_case_id" text,
  "merchant_id" uuid,
  "status" text not null,
  "http_status" integer,
  "is_claim" boolean,
  "claim_type" text,
  "error" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."work_tasks" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "support_payout_case_id" uuid,
  "loss_case_id" uuid,
  "recovery_case_id" uuid,
  "title" text not null,
  "description" text,
  "owner_user_id" uuid,
  "owner_role" text,
  "due_at" timestamp with time zone,
  "priority" text default 'medium'::text not null,
  "status" text default 'open'::text not null,
  "blocking_reason" text,
  "completion_outcome" jsonb,
  "completed_at" timestamp with time zone,
  "completed_by" uuid,
  "source" text default 'manual'::text not null,
  "domain_event_id" uuid,
  "source_metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."workflow_definitions" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "name" text not null,
  "description" text,
  "trigger_event_type" text not null,
  "conditions" jsonb default '[]'::jsonb not null,
  "outputs" jsonb default '[]'::jsonb not null,
  "active" boolean default true not null,
  "version" integer default 1 not null,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "status" text default 'draft'::text not null,
  "published_at" timestamp with time zone,
  "published_by" uuid
);
create table public."workflow_runs" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "workflow_definition_id" uuid not null,
  "domain_event_id" uuid not null,
  "status" text not null,
  "error" text,
  "started_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone
);
create table public."workflow_step_runs" (
  "id" uuid default gen_random_uuid() not null,
  "merchant_id" uuid not null,
  "workflow_run_id" uuid not null,
  "step_index" integer not null,
  "output_type" text not null,
  "status" text not null,
  "result" jsonb default '{}'::jsonb not null,
  "error" text,
  "created_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone
);

-- ============ constraints (exact pg_get_constraintdef) ============
alter table public."access_audit_log" add constraint "access_audit_log_pkey" PRIMARY KEY (id);
alter table public."accountability_events" add constraint "accountability_events_actor_type_check" CHECK ((actor_type = ANY (ARRAY['SYSTEM'::text, 'HUMAN_AGENT'::text, 'AI_AGENT'::text, 'MANAGER'::text, 'ADMIN'::text])));
alter table public."accountability_events" add constraint "accountability_events_event_type_check" CHECK ((event_type = ANY (ARRAY['SOURCE_CLASSIFIED'::text, 'ACCOUNTABLE_PARTY_ASSIGNED'::text, 'RECOVERY_TASK_CREATED'::text, 'OWNER_ASSIGNED'::text, 'DEADLINE_UPDATED'::text, 'TASK_COMPLETED'::text, 'MONEY_RECOVERED'::text, 'MONEY_WRITTEN_OFF'::text, 'OVERRIDE_RECORDED'::text, 'CASE_CLOSED'::text])));
alter table public."accountability_events" add constraint "accountability_events_pkey" PRIMARY KEY (id);
alter table public."agreement_clauses" add constraint "agreement_clauses_clause_type_check" CHECK ((clause_type = ANY (ARRAY['MIN_RECOVERABLE_ORDER_VALUE'::text, 'MAX_RECOVERABLE_ORDER_VALUE'::text, 'AUTO_REFUND_THRESHOLD'::text, 'LIABILITY_CAP'::text, 'CLAIM_WINDOW'::text, 'EVIDENCE_REQUIRED'::text, 'EXCLUDED_ITEM_TYPE'::text, 'SERVICE_LEVEL_ELIGIBILITY'::text, 'DAMAGE_CLAIM_RULE'::text, 'LOST_PARCEL_RULE'::text, 'DELIVERED_NOT_RECEIVED_RULE'::text, 'DELAY_RULE'::text, 'PACKAGING_REQUIREMENT'::text, 'SIGNATURE_REQUIREMENT'::text, 'PROOF_OF_DELIVERY_REQUIREMENT'::text, 'CLAIM_SUBMISSION_PROCESS'::text, 'PAYMENT_DISPUTE_RULE'::text, 'RECOVERY_FEE'::text, 'OTHER'::text])));
alter table public."agreement_clauses" add constraint "agreement_clauses_confidence_check" CHECK ((confidence = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])));
alter table public."agreement_clauses" add constraint "agreement_clauses_pkey" PRIMARY KEY (id);
alter table public."agreement_rule_evaluations" add constraint "agreement_rule_evaluations_pkey" PRIMARY KEY (id);
alter table public."agreement_rules" add constraint "agreement_rules_applies_to_claim_type_check" CHECK ((applies_to_claim_type = ANY (ARRAY['DELIVERED_NOT_RECEIVED'::text, 'ITEM_NOT_RECEIVED'::text, 'LOST_PARCEL'::text, 'DAMAGED_ITEM'::text, 'MISSING_ITEM'::text, 'WRONG_ITEM'::text, 'DELAYED_DELIVERY'::text, 'RETURN_EXCEPTION'::text, 'CHARGEBACK'::text, 'ANY'::text])));
alter table public."agreement_rules" add constraint "agreement_rules_merchant_id_rule_code_key" UNIQUE (merchant_id, rule_code);
alter table public."agreement_rules" add constraint "agreement_rules_pkey" PRIMARY KEY (id);
alter table public."agreement_rules" add constraint "agreement_rules_rule_type_check" CHECK ((rule_type = ANY (ARRAY['RECOVERY_ELIGIBILITY'::text, 'RECOVERY_NOT_WORTH_CHASING'::text, 'AUTO_RECOVERY_ELIGIBLE'::text, 'EVIDENCE_REQUIREMENT'::text, 'DEADLINE'::text, 'LIABILITY_CAP'::text, 'EXCLUSION'::text, 'ESCALATION'::text, 'INTERNAL_POLICY'::text])));
alter table public."agreement_rules" add constraint "agreement_rules_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'archived'::text])));
alter table public."agreements" add constraint "agreements_agreement_type_check" CHECK ((agreement_type = ANY (ARRAY['COURIER'::text, 'WAREHOUSE_3PL'::text, 'PAYMENT_PROVIDER'::text, 'INSURANCE'::text, 'RETURNS_PLATFORM'::text, 'MARKETPLACE'::text, 'INTERNAL_POLICY'::text, 'OTHER'::text])));
alter table public."agreements" add constraint "agreements_pkey" PRIMARY KEY (id);
alter table public."agreements" add constraint "agreements_status_check" CHECK ((status = ANY (ARRAY['uploaded'::text, 'parsing'::text, 'parsed'::text, 'needs_review'::text, 'active'::text, 'archived'::text, 'failed'::text])));
alter table public."api_key_minute_counts" add constraint "api_key_minute_counts_pkey" PRIMARY KEY (api_key_id, window_minute);
alter table public."audit_customer_summaries" add constraint "audit_customer_summaries_pkey" PRIMARY KEY (audit_id, customer_key);
alter table public."audit_result_summaries" add constraint "audit_result_summaries_pkey" PRIMARY KEY (audit_id);
alter table public."billing_events_log" add constraint "billing_events_log_pkey" PRIMARY KEY (id);
alter table public."case_clarification_requests" add constraint "case_clarification_requests_pkey" PRIMARY KEY (id);
alter table public."case_clarification_requests" add constraint "case_clarification_requests_source_channel_check" CHECK ((source_channel = ANY (ARRAY['email'::text, 'api'::text, 'manual'::text, 'gorgias'::text])));
alter table public."case_clarification_requests" add constraint "case_clarification_requests_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'waiting_response'::text, 'response_received'::text, 'closed'::text])));
alter table public."case_clarification_requests" add constraint "case_clarification_requests_target_type_check" CHECK ((target_type = ANY (ARRAY['carrier'::text, '3pl'::text, 'supplier'::text, 'customer'::text, 'internal'::text])));
alter table public."case_comment_events" add constraint "case_comment_events_event_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'edited'::text, 'deleted'::text])));
alter table public."case_comment_events" add constraint "case_comment_events_pkey" PRIMARY KEY (id);
alter table public."case_comments" add constraint "case_comments_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 10000)));
alter table public."case_comments" add constraint "case_comments_pkey" PRIMARY KEY (id);
alter table public."case_decisions" add constraint "case_decisions_amount_minor_check" CHECK (((amount_minor IS NULL) OR (amount_minor >= 0)));
alter table public."case_decisions" add constraint "case_decisions_merchant_id_idempotency_key_key" UNIQUE (merchant_id, idempotency_key);
alter table public."case_decisions" add constraint "case_decisions_pkey" PRIMARY KEY (id);
alter table public."case_exceptions" add constraint "case_exceptions_confidence_check" CHECK ((confidence = ANY (ARRAY['probable'::text, 'unknown'::text])));
alter table public."case_exceptions" add constraint "case_exceptions_exception_type_check" CHECK ((exception_type = ANY (ARRAY['unmatched_refund'::text, 'ambiguous_replacement'::text, 'conflicting_financials'::text, 'match_uncertainty'::text, 'missing_recovery_result'::text, 'stale_source_data'::text, 'responsibility_judgement'::text, 'unsupported_external_outcome'::text, 'write_off_reason'::text, 'policy_override'::text, 'other'::text])));
alter table public."case_exceptions" add constraint "case_exceptions_merchant_id_dedup_key_key" UNIQUE (merchant_id, dedup_key);
alter table public."case_exceptions" add constraint "case_exceptions_pkey" PRIMARY KEY (id);
alter table public."case_exceptions" add constraint "case_exceptions_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text])));
alter table public."case_financial_entries" add constraint "case_financial_entries_amount_minor_check" CHECK ((amount_minor >= 0));
alter table public."case_financial_entries" add constraint "case_financial_entries_direction_check" CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text, 'memo'::text])));
alter table public."case_financial_entries" add constraint "case_financial_entries_pkey" PRIMARY KEY (id);
alter table public."case_financial_entries" add constraint "case_financial_entries_state_check" CHECK ((state = ANY (ARRAY['requested'::text, 'exposed'::text, 'approved'::text, 'paid'::text, 'estimated_loss'::text, 'confirmed_loss'::text, 'recoverable'::text, 'recovered'::text, 'prevented'::text, 'written_off'::text])));
alter table public."case_financial_summaries" add constraint "case_financial_summaries_pkey" PRIMARY KEY (merchant_id, support_payout_case_id, currency);
alter table public."case_outcomes" add constraint "case_outcomes_amount_minor_check" CHECK (((amount_minor IS NULL) OR (amount_minor >= 0)));
alter table public."case_outcomes" add constraint "case_outcomes_merchant_id_idempotency_key_key" UNIQUE (merchant_id, idempotency_key);
alter table public."case_outcomes" add constraint "case_outcomes_pkey" PRIMARY KEY (id);
alter table public."category_applicability" add constraint "category_applicability_category_check" CHECK ((category = ANY (ARRAY['warehouse_3pl'::text, 'returns'::text])));
alter table public."category_applicability" add constraint "category_applicability_pkey" PRIMARY KEY (merchant_id, category);
alter table public."category_applicability" add constraint "category_applicability_status_check" CHECK ((status = ANY (ARRAY['applicable'::text, 'not_applicable'::text])));
alter table public."checkout_signal_order_links" add constraint "checkout_signal_order_links_checkout_signal_id_order_id_key" UNIQUE (checkout_signal_id, order_id);
alter table public."checkout_signal_order_links" add constraint "checkout_signal_order_links_pkey" PRIMARY KEY (id);
alter table public."checkout_signals" add constraint "checkout_signals_account_type_check" CHECK ((account_type = ANY (ARRAY['guest'::text, 'registered'::text, 'unknown'::text])));
alter table public."checkout_signals" add constraint "checkout_signals_event_type_check" CHECK ((event_type = ANY (ARRAY['pageview'::text, 'checkout'::text, 'email_capture'::text])));
alter table public."checkout_signals" add constraint "checkout_signals_pkey" PRIMARY KEY (id);
alter table public."checkout_signals" add constraint "checkout_signals_platform_check" CHECK ((platform = ANY (ARRAY['shopify'::text, 'woocommerce'::text, 'bigcommerce'::text])));
alter table public."claim_events" add constraint "claim_events_pkey" PRIMARY KEY (id);
alter table public."claim_evidence" add constraint "claim_evidence_evidence_type_check" CHECK ((evidence_type = ANY (ARRAY['tracking'::text, 'proof_of_delivery'::text, 'customer_message'::text, 'support_ticket'::text, 'return_label'::text, 'warehouse_scan'::text, 'payment_dispute'::text, 'note'::text, 'other'::text, 'damage_photo'::text, 'packaging_photo'::text, 'label_photo'::text, 'wrong_item_photo'::text, 'proof_of_value'::text, 'proof_of_dispatch'::text, 'delivery_photo'::text, 'customer_non_receipt_statement'::text, 'carrier_investigation'::text, 'warehouse_pick_pack_record'::text, 'packing_slip'::text, 'weight_scan'::text, 'refund_proof'::text, 'reship_proof'::text, 'supplier_batch_lot'::text, 'purchase_order'::text, 'return_inspection'::text, 'chargeback_notice'::text, 'carrier_claim_correspondence'::text, 'three_pl_dispute_correspondence'::text, 'supplier_credit_note'::text])));
alter table public."claim_evidence" add constraint "claim_evidence_pkey" PRIMARY KEY (id);
alter table public."claim_outcomes" add constraint "claim_outcomes_claim_id_key" UNIQUE (claim_id);
alter table public."claim_outcomes" add constraint "claim_outcomes_pkey" PRIMARY KEY (id);
alter table public."comment_mentions" add constraint "comment_mentions_comment_id_mentioned_user_id_key" UNIQUE (comment_id, mentioned_user_id);
alter table public."comment_mentions" add constraint "comment_mentions_pkey" PRIMARY KEY (id);
alter table public."connector_action_runs" add constraint "connector_action_runs_merchant_id_idempotency_key_key" UNIQUE (merchant_id, idempotency_key);
alter table public."connector_action_runs" add constraint "connector_action_runs_pkey" PRIMARY KEY (id);
alter table public."connector_action_runs" add constraint "connector_action_runs_status_check" CHECK ((status = ANY (ARRAY['previewed'::text, 'completed'::text, 'manual_required'::text, 'failed'::text])));
alter table public."context_credit_events" add constraint "context_credit_events_context_type_check" CHECK ((context_type = ANY (ARRAY['basic_context'::text, 'full_context'::text, 'evidence_summary'::text, 'api_enrichment'::text])));
alter table public."context_credit_events" add constraint "context_credit_events_credits_spent_check" CHECK ((credits_spent >= 0));
alter table public."context_credit_events" add constraint "context_credit_events_pkey" PRIMARY KEY (id);
alter table public."context_credit_events" add constraint "context_credit_events_plan_tier_check" CHECK ((plan_tier = ANY (ARRAY['free'::text, 'pro'::text, 'growth'::text, 'scale'::text, 'enterprise'::text])));
alter table public."context_credit_events" add constraint "context_credit_events_reason_check" CHECK ((reason = ANY (ARRAY['item_not_received'::text, 'damaged_item'::text, 'chargeback_dispute'::text, 'return_abuse_review'::text, 'delivery_dispute'::text, 'other'::text])));
alter table public."correspondence_automation_settings" add constraint "correspondence_automation_settings_pkey" PRIMARY KEY (merchant_id);
alter table public."credit_topup_log" add constraint "credit_topup_log_credits_added_check" CHECK ((credits_added > 0));
alter table public."credit_topup_log" add constraint "credit_topup_log_pkey" PRIMARY KEY (id);
alter table public."customer_claim_summary" add constraint "customer_claim_summary_merchant_email_unique" UNIQUE (merchant_id, customer_email_hash);
alter table public."customer_claim_summary" add constraint "customer_claim_summary_pkey" PRIMARY KEY (id);
alter table public."customer_identity_signals" add constraint "customer_identity_signals_account_type_check" CHECK (((customer_account_type IS NULL) OR (customer_account_type = ANY (ARRAY['guest'::text, 'registered'::text]))));
alter table public."customer_identity_signals" add constraint "customer_identity_signals_merchant_email_unique" UNIQUE (merchant_id, customer_email_hash);
alter table public."customer_identity_signals" add constraint "customer_identity_signals_pkey" PRIMARY KEY (id);
alter table public."default_rule_templates" add constraint "default_rule_templates_action_check" CHECK ((action = ANY (ARRAY['approve'::text, 'manual_review'::text, 'deny'::text])));
alter table public."default_rule_templates" add constraint "default_rule_templates_condition_operator_check" CHECK ((condition_operator = ANY (ARRAY['and'::text, 'or'::text])));
alter table public."default_rule_templates" add constraint "default_rule_templates_pkey" PRIMARY KEY (id);
alter table public."document_upload_jobs" add constraint "document_upload_jobs_pkey" PRIMARY KEY (id);
alter table public."document_upload_jobs" add constraint "document_upload_jobs_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'extracting_text'::text, 'extracting_clauses'::text, 'generating_rules'::text, 'needs_review'::text, 'completed'::text, 'failed'::text])));
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_domain_event_id_handler_name_key" UNIQUE (domain_event_id, handler_name);
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_pkey" PRIMARY KEY (id);
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'dead_letter'::text, 'ignored'::text])));
alter table public."domain_events" add constraint "domain_events_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."domain_events" add constraint "domain_events_merchant_id_idempotency_key_key" UNIQUE (merchant_id, idempotency_key);
alter table public."domain_events" add constraint "domain_events_pkey" PRIMARY KEY (id);
alter table public."entity_relationships" add constraint "entity_relationships_match_method_check" CHECK (((match_method IS NULL) OR (match_method = ANY (ARRAY['external_reference'::text, 'order_number'::text, 'transaction_id'::text, 'tracking_number'::text, 'customer_id'::text, 'email'::text, 'manual'::text, 'connector_declared'::text]))));
alter table public."entity_relationships" add constraint "entity_relationships_match_status_check" CHECK ((match_status = ANY (ARRAY['confirmed'::text, 'probable'::text, 'ambiguous'::text, 'unmatched'::text])));
alter table public."entity_relationships" add constraint "entity_relationships_merchant_id_from_entity_type_from_enti_key" UNIQUE (merchant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relationship_type);
alter table public."entity_relationships" add constraint "entity_relationships_pkey" PRIMARY KEY (id);
alter table public."evidence_download_tokens" add constraint "evidence_download_tokens_pkey" PRIMARY KEY (id);
alter table public."evidence_download_tokens" add constraint "evidence_download_tokens_token_hash_key" UNIQUE (token_hash);
alter table public."evidence_items" add constraint "evidence_items_pkey" PRIMARY KEY (id);
alter table public."evidence_links" add constraint "evidence_links_exactly_one_target" CHECK ((num_nonnulls(support_payout_case_id, source_order_id, source_ticket_id, loss_case_id, recovery_case_id) = 1));
alter table public."evidence_links" add constraint "evidence_links_pkey" PRIMARY KEY (id);
alter table public."evidence_packages" add constraint "evidence_packages_pkey" PRIMARY KEY (id);
alter table public."evidence_packages" add constraint "evidence_packages_reference_number_key" UNIQUE (reference_number);
alter table public."external_clarification_requests" add constraint "external_clarification_requests_pkey" PRIMARY KEY (id);
alter table public."external_correspondence" add constraint "external_correspondence_matched_confidence_check" CHECK (((matched_confidence >= (0)::numeric) AND (matched_confidence <= (1)::numeric)));
alter table public."external_correspondence" add constraint "external_correspondence_pkey" PRIMARY KEY (id);
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_claim_deadline_days_check" CHECK (((claim_deadline_days IS NULL) OR (claim_deadline_days >= 0)));
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_confidence_check" CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_merchant_id_document_id_key" UNIQUE (merchant_id, document_id);
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_partner_type_check" CHECK ((partner_type = ANY (ARRAY['carrier'::text, 'three_pl'::text, 'supplier'::text, 'insurer'::text])));
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_pkey" PRIMARY KEY (id);
alter table public."founding_merchant_applications" add constraint "founding_merchant_applications_merchant_id_key" UNIQUE (merchant_id);
alter table public."founding_merchant_applications" add constraint "founding_merchant_applications_pkey" PRIMARY KEY (id);
alter table public."helpdesk_connections" add constraint "helpdesk_connections_last_verification_status_check" CHECK (((last_verification_status IS NULL) OR (last_verification_status = ANY (ARRAY['verified'::text, 'failed'::text, 'inconclusive'::text]))));
alter table public."helpdesk_connections" add constraint "helpdesk_connections_merchant_id_provider_provider_account__key" UNIQUE (merchant_id, provider, provider_account_id);
alter table public."helpdesk_connections" add constraint "helpdesk_connections_pkey" PRIMARY KEY (id);
alter table public."identities" add constraint "identities_confidence_score_check" CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (100)::numeric)));
alter table public."identities" add constraint "identities_pkey" PRIMARY KEY (id);
alter table public."identity_catch_events" add constraint "identity_catch_events_confidence_grade_check" CHECK ((confidence_grade = ANY (ARRAY['definite'::text, 'probable'::text, 'possible'::text, 'weak'::text])));
alter table public."identity_catch_events" add constraint "identity_catch_events_confidence_score_check" CHECK (((confidence_score >= 0) AND (confidence_score <= 100)));
alter table public."identity_catch_events" add constraint "identity_catch_events_pkey" PRIMARY KEY (id);
alter table public."identity_edges" add constraint "identity_edges_canonical" CHECK ((ROW((left_type)::text, left_hash) < ROW((right_type)::text, right_hash)));
alter table public."identity_edges" add constraint "identity_edges_merchant_id_left_type_left_hash_right_type_r_key" UNIQUE (merchant_id, left_type, left_hash, right_type, right_hash);
alter table public."identity_edges" add constraint "identity_edges_pkey" PRIMARY KEY (id);
alter table public."identity_edges" add constraint "identity_edges_seen_count_check" CHECK ((seen_count >= 1));
alter table public."identity_evidence_scores" add constraint "identity_evidence_scores_evidence_level_check" CHECK ((evidence_level = ANY (ARRAY['minimal'::text, 'some'::text, 'substantial'::text, 'extensive'::text])));
alter table public."identity_evidence_scores" add constraint "identity_evidence_scores_evidence_score_check" CHECK (((evidence_score >= 0) AND (evidence_score <= 100)));
alter table public."identity_evidence_scores" add constraint "identity_evidence_scores_pkey" PRIMARY KEY (identity_id);
alter table public."identity_link_candidates" add constraint "identity_link_candidates_confidence_check" CHECK (((link_confidence >= (0)::numeric) AND (link_confidence <= (1)::numeric)));
alter table public."identity_link_candidates" add constraint "identity_link_candidates_link_type_check" CHECK ((link_type = ANY (ARRAY['email_match'::text, 'phone_match'::text, 'address_match'::text, 'device_match'::text, 'name_fuzzy_match'::text])));
alter table public."identity_link_candidates" add constraint "identity_link_candidates_pkey" PRIMARY KEY (id);
alter table public."identity_link_candidates" add constraint "identity_link_candidates_unique" UNIQUE (primary_customer_email_hash, linked_customer_email_hash, merchant_id_a, merchant_id_b, link_type);
alter table public."identity_members" add constraint "identity_members_match_confidence_check" CHECK (((match_confidence >= (0)::numeric) AND (match_confidence <= (100)::numeric)));
alter table public."identity_members" add constraint "identity_members_pkey" PRIMARY KEY (identity_id, identifier_type, identifier_hash);
alter table public."identity_notes" add constraint "identity_notes_pkey" PRIMARY KEY (id);
alter table public."identity_profiles" add constraint "identity_profiles_pkey" PRIMARY KEY (identity_id);
alter table public."identity_resolution_events" add constraint "identity_resolution_events_event_type_check" CHECK ((event_type = ANY (ARRAY['created'::text, 'member_added'::text, 'member_removed'::text, 'merged'::text, 'split'::text, 'grade_changed'::text, 'false_positive_reported'::text, 'false_positive_confirmed'::text])));
alter table public."identity_resolution_events" add constraint "identity_resolution_events_pkey" PRIMARY KEY (id);
alter table public."identity_signals" add constraint "identity_signals_hash_format" CHECK (((identifier_type = ANY (ARRAY['platform_customer_id'::public.identifier_type, 'helpdesk_contact_id'::public.identifier_type])) OR (identifier_hash ~ '^[0-9a-f]{64}$'::text)));
alter table public."identity_signals" add constraint "identity_signals_one_provenance" CHECK ((((((source_order_id IS NOT NULL))::integer + ((source_customer_id IS NOT NULL))::integer) + ((source_ticket_id IS NOT NULL))::integer) = 1));
alter table public."identity_signals" add constraint "identity_signals_pkey" PRIMARY KEY (id);
alter table public."ingest_rate_limits" add constraint "ingest_rate_limits_pkey" PRIMARY KEY (ip_hash, window_start);
alter table public."ingestion_events" add constraint "ingestion_events_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."ingestion_events" add constraint "ingestion_events_merchant_id_idempotency_key_key" UNIQUE (merchant_id, idempotency_key);
alter table public."ingestion_events" add constraint "ingestion_events_pkey" PRIMARY KEY (id);
alter table public."ingestion_events" add constraint "ingestion_events_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'normalized'::text, 'failed'::text, 'dead_letter'::text, 'ignored'::text])));
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_pkey" PRIMARY KEY (id);
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_resolution_status_check" CHECK ((resolution_status = ANY (ARRAY['open'::text, 'resolved'::text, 'ignored'::text])));
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text])));
alter table public."integration_credentials" add constraint "integration_credentials_pkey" PRIMARY KEY (id);
alter table public."integration_documents" add constraint "integration_documents_document_type_check" CHECK ((document_type = ANY (ARRAY['carrier_agreement'::text, 'three_pl_sla'::text, 'supplier_terms'::text, 'insurance_policy'::text])));
alter table public."integration_documents" add constraint "integration_documents_extraction_status_check" CHECK ((extraction_status = ANY (ARRAY['quarantined'::text, 'uploaded'::text, 'needs_merchant_approval'::text, 'approved'::text, 'rejected'::text, 'failed'::text])));
alter table public."integration_documents" add constraint "integration_documents_malware_scan_status_check" CHECK ((malware_scan_status = ANY (ARRAY['pending'::text, 'clean'::text, 'infected'::text, 'failed'::text])));
alter table public."integration_documents" add constraint "integration_documents_pkey" PRIMARY KEY (id);
alter table public."integration_evidence_items" add constraint "integration_evidence_items_confidence_check" CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])));
alter table public."integration_evidence_items" add constraint "integration_evidence_items_evidence_type_check" CHECK ((evidence_type = ANY (ARRAY['ticket_messages'::text, 'ticket_attachments'::text, 'customer_claim_reason'::text, 'requested_action'::text, 'order_value'::text, 'line_items'::text, 'customer_history'::text, 'refund_history'::text, 'reship_history'::text, 'tracking_number'::text, 'tracking_events'::text, 'delivery_status'::text, 'delivery_photo'::text, 'signature'::text, 'dispute_status'::text, 'chargeback_evidence'::text, 'contract_terms'::text, 'recovery_deadline'::text, 'return_request_status'::text, 'return_inspection_outcome'::text, 'warehouse_pick_pack'::text, 'warehouse_exception'::text, 'three_pl_sla_claim_status'::text, 'carrier_claim_submission_status'::text, 'carrier_claim_outcome'::text, 'recovery_amount_approved'::text, 'recovery_amount_paid'::text])));
alter table public."integration_evidence_items" add constraint "integration_evidence_items_pkey" PRIMARY KEY (id);
alter table public."integration_evidence_items" add constraint "integration_evidence_items_source_category_check" CHECK ((source_category = ANY (ARRAY['helpdesk'::text, 'commerce'::text, 'tracking'::text, 'carrier'::text, 'warehouse_3pl'::text, 'returns'::text, 'payments_disputes'::text, 'documents'::text])));
alter table public."loss_attribution_candidates" add constraint "loss_attribution_candidates_merchant_id_source_loss_id_key" UNIQUE (merchant_id, source_loss_id);
alter table public."loss_attribution_candidates" add constraint "loss_attribution_candidates_pkey" PRIMARY KEY (id);
alter table public."loss_case_events" add constraint "loss_case_events_pkey" PRIMARY KEY (id);
alter table public."loss_case_evidence" add constraint "loss_case_evidence_extraction_confidence_check" CHECK (((extraction_confidence IS NULL) OR ((extraction_confidence >= (0)::numeric) AND (extraction_confidence <= (1)::numeric))));
alter table public."loss_case_evidence" add constraint "loss_case_evidence_pkey" PRIMARY KEY (id);
alter table public."loss_cases" add constraint "loss_cases_evidence_completion_score_check" CHECK (((evidence_completion_score >= (0)::numeric) AND (evidence_completion_score <= (100)::numeric)));
alter table public."loss_cases" add constraint "loss_cases_missing_evidence_count_check" CHECK ((missing_evidence_count >= 0));
alter table public."loss_cases" add constraint "loss_cases_nonnegative_minor_amounts" CHECK ((((order_value_minor IS NULL) OR (order_value_minor >= 0)) AND ((refund_value_minor IS NULL) OR (refund_value_minor >= 0)) AND ((chargeback_value_minor IS NULL) OR (chargeback_value_minor >= 0)) AND ((estimated_recovery_minor IS NULL) OR (estimated_recovery_minor >= 0)) AND ((approved_recovery_minor IS NULL) OR (approved_recovery_minor >= 0))));
alter table public."loss_cases" add constraint "loss_cases_pkey" PRIMARY KEY (id);
alter table public."loss_sources" add constraint "loss_sources_accountable_party_type_check" CHECK ((accountable_party_type = ANY (ARRAY['CUSTOMER'::text, 'CARRIER'::text, 'WAREHOUSE_3PL'::text, 'MERCHANT'::text, 'SUPPORT_TEAM'::text, 'AI_AGENT'::text, 'PAYMENT_PROVIDER'::text, 'UNKNOWN'::text])));
alter table public."loss_sources" add constraint "loss_sources_confidence_check" CHECK ((confidence = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])));
alter table public."loss_sources" add constraint "loss_sources_pkey" PRIMARY KEY (id);
alter table public."loss_sources" add constraint "loss_sources_source_type_check" CHECK ((source_type = ANY (ARRAY['CUSTOMER_CLAIM'::text, 'CARRIER_FAILURE'::text, 'WAREHOUSE_3PL_ERROR'::text, 'MERCHANT_POLICY_LEAKAGE'::text, 'SUPPORT_AGENT_OVERRIDE'::text, 'AI_AGENT_OVERRIDE'::text, 'PRODUCT_ISSUE'::text, 'PAYMENT_DISPUTE_RISK'::text, 'RETURN_ABUSE'::text, 'UNKNOWN'::text])));
alter table public."loss_sources" add constraint "loss_sources_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'recovery_pending'::text, 'recovered'::text, 'written_off'::text, 'closed'::text, 'not_economically_recoverable'::text, 'agreement_excluded'::text, 'pending_required_evidence'::text, 'eligible_to_chase'::text, 'auto_recovery_expected'::text])));
alter table public."merchant_api_keys" add constraint "merchant_api_keys_key_hash_key" UNIQUE (key_hash);
alter table public."merchant_api_keys" add constraint "merchant_api_keys_pkey" PRIMARY KEY (id);
alter table public."merchant_credits" add constraint "merchant_credits_monthly_credits_remaining_check" CHECK ((monthly_credits_remaining >= 0));
alter table public."merchant_credits" add constraint "merchant_credits_pkey" PRIMARY KEY (merchant_id);
alter table public."merchant_credits" add constraint "merchant_credits_topup_credits_remaining_check" CHECK ((topup_credits_remaining >= 0));
alter table public."merchant_customer_signals" add constraint "merchant_customer_signals_pkey" PRIMARY KEY (merchant_customer_id, identifier_type, identifier_hash, source_entity_type, source_entity_id);
alter table public."merchant_customer_signals" add constraint "merchant_customer_signals_seen_count_check" CHECK ((seen_count >= 1));
alter table public."merchant_customers" add constraint "merchant_customers_pkey" PRIMARY KEY (id);
alter table public."merchant_customers" add constraint "merchant_customers_resolution_status_check" CHECK ((resolution_status = ANY (ARRAY['active'::text, 'superseded'::text, 'merged'::text, 'split'::text])));
alter table public."merchant_identity_state" add constraint "merchant_identity_state_investigation_status_check" CHECK ((investigation_status = ANY (ARRAY['new'::text, 'under_review'::text, 'contacted'::text, 'resolved'::text, 'cleared'::text])));
alter table public."merchant_identity_state" add constraint "merchant_identity_state_pkey" PRIMARY KEY (merchant_id, identity_id);
alter table public."merchant_integrations" add constraint "merchant_integrations_auth_mode_check" CHECK ((auth_mode = ANY (ARRAY['oauth'::text, 'api_key'::text, 'webhook'::text, 'custom'::text])));
alter table public."merchant_integrations" add constraint "merchant_integrations_category_check" CHECK ((category = ANY (ARRAY['commerce'::text, 'helpdesk'::text, 'tracking'::text, 'carrier'::text, 'email'::text, '3pl'::text, 'wms'::text, 'returns'::text, 'payments'::text, 'chargebacks'::text, 'marketplace'::text, 'shipping_protection'::text, 'erp'::text, 'supplier'::text, 'internal_comms'::text, 'warehouse_3pl'::text, 'payments_disputes'::text, 'documents'::text])));
alter table public."merchant_integrations" add constraint "merchant_integrations_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."merchant_integrations" add constraint "merchant_integrations_last_verification_status_check" CHECK (((last_verification_status IS NULL) OR (last_verification_status = ANY (ARRAY['verified'::text, 'failed'::text, 'inconclusive'::text]))));
alter table public."merchant_integrations" add constraint "merchant_integrations_pkey" PRIMARY KEY (id);
alter table public."merchant_integrations" add constraint "merchant_integrations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'connected'::text, 'not_connected'::text, 'degraded'::text, 'syncing'::text, 'disabled'::text, 'revoked'::text, 'error'::text, 'connection_error'::text])));
alter table public."merchant_integrations" add constraint "shipbob_environment_valid" CHECK (((provider_id <> 'shipbob'::text) OR (environment = ANY (ARRAY['sandbox'::text, 'production'::text])))) NOT VALID;
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_merchant_rule_id_version_key" UNIQUE (merchant_rule_id, version);
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_pkey" PRIMARY KEY (id);
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text, 'discarded'::text])));
alter table public."merchant_rules" add constraint "merchant_rules_action_check" CHECK ((action = ANY (ARRAY['approve'::text, 'manual_review'::text, 'deny'::text])));
alter table public."merchant_rules" add constraint "merchant_rules_condition_operator_check" CHECK ((condition_operator = ANY (ARRAY['and'::text, 'or'::text])));
alter table public."merchant_rules" add constraint "merchant_rules_pkey" PRIMARY KEY (id);
alter table public."merchant_subscriptions" add constraint "merchant_subscriptions_pkey" PRIMARY KEY (id);
alter table public."merchant_subscriptions" add constraint "merchant_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'grace_period'::text, 'cancelled'::text, 'free'::text])));
alter table public."merchant_users" add constraint "merchant_users_merchant_id_invited_email_key" UNIQUE (merchant_id, invited_email);
alter table public."merchant_users" add constraint "merchant_users_pkey" PRIMARY KEY (id);
alter table public."merchant_widget_tokens" add constraint "merchant_widget_tokens_pkey" PRIMARY KEY (id);
alter table public."merchant_widget_tokens" add constraint "merchant_widget_tokens_token_hash_key" UNIQUE (token_hash);
alter table public."merchants" add constraint "merchants_pkey" PRIMARY KEY (id);
alter table public."migration_orphans" add constraint "migration_orphans_pkey" PRIMARY KEY (id);
alter table public."network_access_log" add constraint "network_access_log_pkey" PRIMARY KEY (id);
alter table public."notification_preferences" add constraint "notification_preferences_email_disabled_check" CHECK ((email_enabled = false));
alter table public."notification_preferences" add constraint "notification_preferences_kind_check" CHECK ((kind = ANY (ARRAY['assignment'::text, 'mention'::text, 'approaching_deadline'::text, 'evidence_update'::text, 'decision_request'::text, 'recovery_outcome'::text, 'sync_failure'::text, 'daily_work_summary'::text, 'high_value_case_alert'::text, 'scheduled_report'::text])));
alter table public."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY (merchant_id, user_id, kind);
alter table public."notifications" add constraint "notifications_kind_check" CHECK ((kind = ANY (ARRAY['assignment'::text, 'mention'::text, 'approaching_deadline'::text, 'evidence_update'::text, 'decision_request'::text, 'recovery_outcome'::text, 'sync_failure'::text, 'daily_work_summary'::text, 'high_value_case_alert'::text, 'scheduled_report'::text])));
alter table public."notifications" add constraint "notifications_merchant_id_recipient_user_id_deduplication_k_key" UNIQUE (merchant_id, recipient_user_id, deduplication_key);
alter table public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table public."notifications" add constraint "notifications_target_href_check" CHECK ((target_href ~~ '/%'::text));
alter table public."oauth_connection_transactions" add constraint "oauth_connection_transactions_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
alter table public."oauth_connection_transactions" add constraint "oauth_connection_transactions_pkey" PRIMARY KEY (id);
alter table public."oauth_connection_transactions" add constraint "oauth_connection_transactions_state_hash_key" UNIQUE (state_hash);
alter table public."order_claim_context" add constraint "order_claim_context_pkey" PRIMARY KEY (id);
alter table public."order_claim_context" add constraint "order_claim_context_support_case_unique" UNIQUE (support_case_id);
alter table public."pack_confirmations" add constraint "pack_confirmations_merchant_id_order_id_fulfillment_id_key" UNIQUE (merchant_id, order_id, fulfillment_id);
alter table public."pack_confirmations" add constraint "pack_confirmations_pkey" PRIMARY KEY (id);
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_deadline_days_check" CHECK (((deadline_days IS NULL) OR (deadline_days >= 0)));
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_no_manual_source" CHECK ((source_type <> 'manual'::public.recovery_rule_source_type));
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_no_manual_submission" CHECK (((submission_method IS NULL) OR (submission_method <> 'manual'::public.recovery_submission_method)));
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_pkey" PRIMARY KEY (id);
alter table public."partners" add constraint "partners_pkey" PRIMARY KEY (id);
alter table public."pending_provider_account_selections" add constraint "pending_provider_account_selections_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
alter table public."pending_provider_account_selections" add constraint "pending_provider_account_selections_pkey" PRIMARY KEY (id);
alter table public."plans" add constraint "plans_pkey" PRIMARY KEY (plan_id);
alter table public."processed_webhooks" add constraint "processed_webhooks_pkey" PRIMARY KEY (idempotency_key);
alter table public."profile_view_tokens" add constraint "profile_view_tokens_pkey" PRIMARY KEY (id);
alter table public."profile_view_tokens" add constraint "profile_view_tokens_token_hash_key" UNIQUE (token_hash);
alter table public."record_match_candidates" add constraint "record_match_candidates_pkey" PRIMARY KEY (id);
alter table public."record_match_candidates" add constraint "record_match_candidates_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'selected'::text, 'rejected'::text, 'superseded'::text])));
alter table public."record_match_resolutions" add constraint "record_match_resolutions_pkey" PRIMARY KEY (id);
alter table public."recovery_case_events" add constraint "recovery_case_events_pkey" PRIMARY KEY (id);
alter table public."recovery_cases" add constraint "recovery_cases_nonnegative_amounts" CHECK (((merchant_loss_amount >= (0)::numeric) AND ((eligible_loss_amount IS NULL) OR (eligible_loss_amount >= (0)::numeric)) AND ((estimated_recoverable_min IS NULL) OR (estimated_recoverable_min >= (0)::numeric)) AND ((estimated_recoverable_max IS NULL) OR (estimated_recoverable_max >= (0)::numeric)) AND ((amount_recovered IS NULL) OR (amount_recovered >= (0)::numeric))));
alter table public."recovery_cases" add constraint "recovery_cases_pkey" PRIMARY KEY (id);
alter table public."recovery_tasks" add constraint "recovery_tasks_owner_type_check" CHECK ((owner_type = ANY (ARRAY['CX_MANAGER'::text, 'OPS_MANAGER'::text, 'FINANCE'::text, 'LOGISTICS'::text, 'SUPPORT_AGENT'::text, 'THIRD_PARTY'::text, 'UNKNOWN'::text])));
alter table public."recovery_tasks" add constraint "recovery_tasks_pkey" PRIMARY KEY (id);
alter table public."recovery_tasks" add constraint "recovery_tasks_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text])));
alter table public."recovery_tasks" add constraint "recovery_tasks_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'blocked'::text, 'completed'::text, 'cancelled'::text, 'overdue'::text, 'not_economically_recoverable'::text, 'agreement_excluded'::text, 'pending_required_evidence'::text, 'eligible_to_chase'::text, 'auto_recovery_expected'::text])));
alter table public."recovery_tasks" add constraint "recovery_tasks_task_type_check" CHECK ((task_type = ANY (ARRAY['OPEN_CARRIER_CLAIM'::text, 'CONTACT_3PL'::text, 'REQUEST_CUSTOMER_EVIDENCE'::text, 'REQUEST_CARRIER_EVIDENCE'::text, 'ESCALATE_TO_MANAGER'::text, 'PREPARE_CHARGEBACK_EVIDENCE'::text, 'REVIEW_POLICY_OVERRIDE'::text, 'REVIEW_AGENT_ACTION'::text, 'WRITE_OFF_APPROVAL'::text, 'OTHER'::text])));
alter table public."rule_evaluations" add constraint "rule_evaluations_pkey" PRIMARY KEY (id);
alter table public."rule_evaluations" add constraint "rule_evaluations_recommendation_check" CHECK ((recommendation = ANY (ARRAY['approve'::text, 'manual_review'::text, 'deny'::text, 'no_match'::text])));
alter table public."source_accounts" add constraint "shipbob_source_environment_valid" CHECK (((provider_id <> 'shipbob'::text) OR (environment = ANY (ARRAY['sandbox'::text, 'production'::text])))) NOT VALID;
alter table public."source_accounts" add constraint "source_accounts_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."source_accounts" add constraint "source_accounts_merchant_id_connection_id_external_account__key" UNIQUE NULLS NOT DISTINCT (merchant_id, connection_id, external_account_id);
alter table public."source_accounts" add constraint "source_accounts_pkey" PRIMARY KEY (id);
alter table public."source_addresses" add constraint "source_addresses_kind_check" CHECK ((kind = ANY (ARRAY['shipping'::text, 'billing'::text, 'saved'::text])));
alter table public."source_addresses" add constraint "source_addresses_pkey" PRIMARY KEY (id);
alter table public."source_customers" add constraint "source_customers_pkey" PRIMARY KEY (id);
alter table public."source_disputes" add constraint "source_disputes_pkey" PRIMARY KEY (id);
alter table public."source_fulfillments" add constraint "source_fulfillments_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."source_fulfillments" add constraint "source_fulfillments_merchant_id_source_order_id_external_id_key" UNIQUE (merchant_id, source_order_id, external_id);
alter table public."source_fulfillments" add constraint "source_fulfillments_pkey" PRIMARY KEY (id);
alter table public."source_locations" add constraint "source_locations_merchant_id_source_account_id_external_id_key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_locations" add constraint "source_locations_pkey" PRIMARY KEY (id);
alter table public."source_messages" add constraint "source_messages_merchant_id_source_ticket_id_external_id_key" UNIQUE (merchant_id, source_ticket_id, external_id);
alter table public."source_messages" add constraint "source_messages_pkey" PRIMARY KEY (id);
alter table public."source_order_lines" add constraint "source_order_lines_merchant_id_source_order_id_external_id_key" UNIQUE (merchant_id, source_order_id, external_id);
alter table public."source_order_lines" add constraint "source_order_lines_pkey" PRIMARY KEY (id);
alter table public."source_orders" add constraint "source_orders_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."source_orders" add constraint "source_orders_pkey" PRIMARY KEY (id);
alter table public."source_payments" add constraint "source_payments_merchant_id_source_account_id_external_id_key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_payments" add constraint "source_payments_pkey" PRIMARY KEY (id);
alter table public."source_records" add constraint "source_records_freshness_state_check" CHECK ((freshness_state = ANY (ARRAY['fresh'::text, 'ageing'::text, 'stale'::text, 'unknown'::text])));
alter table public."source_records" add constraint "source_records_id_merchant_id_key" UNIQUE (id, merchant_id);
alter table public."source_records" add constraint "source_records_merchant_id_connection_id_source_entity_type_key" UNIQUE (merchant_id, connection_id, source_entity_type, external_id);
alter table public."source_records" add constraint "source_records_pkey" PRIMARY KEY (id);
alter table public."source_records" add constraint "source_records_sync_state_check" CHECK ((sync_state = ANY (ARRAY['current'::text, 'pending'::text, 'stale'::text, 'failed'::text, 'deleted'::text])));
alter table public."source_refunds" add constraint "source_refunds_merchant_id_source_order_id_external_id_key" UNIQUE (merchant_id, source_order_id, external_id);
alter table public."source_refunds" add constraint "source_refunds_pkey" PRIMARY KEY (id);
alter table public."source_replacements" add constraint "source_replacements_merchant_id_source_account_id_external__key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_replacements" add constraint "source_replacements_pkey" PRIMARY KEY (id);
alter table public."source_returns" add constraint "source_returns_merchant_id_source_account_id_external_id_key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_returns" add constraint "source_returns_pkey" PRIMARY KEY (id);
alter table public."source_shipments" add constraint "source_shipments_merchant_id_source_account_id_external_id_key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_shipments" add constraint "source_shipments_pkey" PRIMARY KEY (id);
alter table public."source_ticket_events" add constraint "source_ticket_events_pkey" PRIMARY KEY (id);
alter table public."source_tickets" add constraint "source_tickets_merchant_id_provider_external_id_key" UNIQUE (merchant_id, provider, external_id);
alter table public."source_tickets" add constraint "source_tickets_pkey" PRIMARY KEY (id);
alter table public."source_tracking_events" add constraint "source_tracking_events_merchant_id_source_shipment_id_exter_key" UNIQUE (merchant_id, source_shipment_id, external_id);
alter table public."source_tracking_events" add constraint "source_tracking_events_pkey" PRIMARY KEY (id);
alter table public."source_transactions" add constraint "source_transactions_merchant_id_source_account_id_external__key" UNIQUE NULLS NOT DISTINCT (merchant_id, source_account_id, external_id);
alter table public."source_transactions" add constraint "source_transactions_pkey" PRIMARY KEY (id);
alter table public."store_connections" add constraint "store_connections_last_verification_status_check" CHECK (((last_verification_status IS NULL) OR (last_verification_status = ANY (ARRAY['verified'::text, 'failed'::text, 'inconclusive'::text]))));
alter table public."store_connections" add constraint "store_connections_pkey" PRIMARY KEY (id);
alter table public."store_connections" add constraint "store_connections_platform_store_key_key" UNIQUE (platform, store_key);
alter table public."support_case_events" add constraint "support_case_events_pkey" PRIMARY KEY (id);
alter table public."support_case_events" add constraint "support_case_events_provider_check" CHECK ((provider = ANY (ARRAY['zendesk'::text, 'gorgias'::text, 'intercom'::text, 'freshdesk'::text])));
alter table public."support_case_intake" add constraint "support_case_intake_claim_type_check" CHECK (((claim_type IS NULL) OR (claim_type = ANY (ARRAY['INR'::text, 'damaged'::text, 'wrong_item'::text, 'not_as_described'::text, 'other'::text]))));
alter table public."support_case_intake" add constraint "support_case_intake_claim_type_confidence_check" CHECK (((claim_type_confidence IS NULL) OR ((claim_type_confidence >= (0)::numeric) AND (claim_type_confidence <= (1)::numeric))));
alter table public."support_case_intake" add constraint "support_case_intake_link_status_check" CHECK ((link_status = ANY (ARRAY['unlinked'::text, 'linked'::text, 'partial'::text, 'ambiguous'::text, 'not_found'::text])));
alter table public."support_case_intake" add constraint "support_case_intake_merchant_provider_external_unique" UNIQUE (merchant_id, provider, external_case_id);
alter table public."support_case_intake" add constraint "support_case_intake_pkey" PRIMARY KEY (id);
alter table public."support_case_intake" add constraint "support_case_intake_provider_check" CHECK ((provider = ANY (ARRAY['zendesk'::text, 'gorgias'::text, 'intercom'::text, 'freshdesk'::text])));
alter table public."support_payout_cases" add constraint "claims_anchor_required" CHECK (((source_ticket_id IS NOT NULL) OR (source_order_id IS NOT NULL) OR (manual_reference IS NOT NULL)));
alter table public."support_payout_cases" add constraint "claims_pkey" PRIMARY KEY (id);
alter table public."support_payout_cases" add constraint "support_payout_cases_case_origin_check" CHECK ((case_origin = ANY (ARRAY['connector'::text, 'canonical_webhook'::text, 'api'::text, 'csv_import'::text, 'manual'::text])));
alter table public."support_provider_connections" add constraint "support_provider_connections_merchant_provider_account_unique" UNIQUE (merchant_id, provider, provider_account_id);
alter table public."support_provider_connections" add constraint "support_provider_connections_pkey" PRIMARY KEY (id);
alter table public."support_provider_connections" add constraint "support_provider_connections_provider_check" CHECK ((provider = ANY (ARRAY['zendesk'::text, 'gorgias'::text, 'intercom'::text, 'freshdesk'::text])));
alter table public."support_provider_connections" add constraint "support_provider_connections_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text, 'revoked'::text, 'error'::text])));
alter table public."sync_job_chunks" add constraint "sync_job_chunks_job_id_chunk_index_key" UNIQUE (job_id, chunk_index);
alter table public."sync_job_chunks" add constraint "sync_job_chunks_pkey" PRIMARY KEY (id);
alter table public."sync_jobs" add constraint "sync_jobs_job_kind_check" CHECK ((job_kind = ANY (ARRAY['csv_audit'::text, 'platform_backfill'::text, 'helpdesk_backfill'::text, 'reprocess'::text, 'initial_import'::text, 'incremental_sync'::text, 'webhook_replay'::text, 'csv_import'::text, 'api_import'::text])));
alter table public."sync_jobs" add constraint "sync_jobs_pkey" PRIMARY KEY (id);
alter table public."unmatched_correspondence" add constraint "unmatched_correspondence_pkey" PRIMARY KEY (id);
alter table public."user_action_log" add constraint "user_action_log_pkey" PRIMARY KEY (id);
alter table public."user_permission_grants" add constraint "user_permission_grants_merchant_id_grantee_user_id_permissi_key" UNIQUE (merchant_id, grantee_user_id, permission);
alter table public."user_permission_grants" add constraint "user_permission_grants_pkey" PRIMARY KEY (id);
alter table public."webhook_logs" add constraint "webhook_logs_pkey" PRIMARY KEY (id);
alter table public."webhook_logs" add constraint "webhook_logs_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'validation_error'::text, 'error'::text])));
alter table public."work_tasks" add constraint "work_tasks_pkey" PRIMARY KEY (id);
alter table public."work_tasks" add constraint "work_tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));
alter table public."work_tasks" add constraint "work_tasks_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'blocked'::text, 'completed'::text, 'cancelled'::text])));
alter table public."workflow_definitions" add constraint "workflow_definitions_merchant_id_name_version_key" UNIQUE (merchant_id, name, version);
alter table public."workflow_definitions" add constraint "workflow_definitions_pkey" PRIMARY KEY (id);
alter table public."workflow_definitions" add constraint "workflow_definitions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])));
alter table public."workflow_runs" add constraint "workflow_runs_pkey" PRIMARY KEY (id);
alter table public."workflow_runs" add constraint "workflow_runs_status_check" CHECK ((status = ANY (ARRAY['matched'::text, 'not_matched'::text, 'completed'::text, 'failed'::text])));
alter table public."workflow_runs" add constraint "workflow_runs_workflow_definition_id_domain_event_id_key" UNIQUE (workflow_definition_id, domain_event_id);
alter table public."workflow_step_runs" add constraint "workflow_step_runs_pkey" PRIMARY KEY (id);
alter table public."workflow_step_runs" add constraint "workflow_step_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'skipped'::text])));
alter table public."workflow_step_runs" add constraint "workflow_step_runs_workflow_run_id_step_index_key" UNIQUE (workflow_run_id, step_index);


-- foreign keys (deferred until all referenced keys exist)
alter table public."access_audit_log" add constraint "access_audit_log_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."accountability_events" add constraint "accountability_events_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."accountability_events" add constraint "accountability_events_loss_source_id_fkey" FOREIGN KEY (loss_source_id) REFERENCES public.loss_sources(id) ON DELETE SET NULL;
alter table public."accountability_events" add constraint "accountability_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."accountability_events" add constraint "accountability_events_recovery_task_id_fkey" FOREIGN KEY (recovery_task_id) REFERENCES public.recovery_tasks(id) ON DELETE SET NULL;
alter table public."agreement_clauses" add constraint "agreement_clauses_agreement_id_fkey" FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;
alter table public."agreement_clauses" add constraint "agreement_clauses_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."agreement_rule_evaluations" add constraint "agreement_rule_evaluations_agreement_id_fkey" FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;
alter table public."agreement_rule_evaluations" add constraint "agreement_rule_evaluations_agreement_rule_id_fkey" FOREIGN KEY (agreement_rule_id) REFERENCES public.agreement_rules(id) ON DELETE SET NULL;
alter table public."agreement_rule_evaluations" add constraint "agreement_rule_evaluations_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."agreement_rule_evaluations" add constraint "agreement_rule_evaluations_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."agreement_rules" add constraint "agreement_rules_agreement_id_fkey" FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;
alter table public."agreement_rules" add constraint "agreement_rules_clause_id_fkey" FOREIGN KEY (clause_id) REFERENCES public.agreement_clauses(id) ON DELETE SET NULL;
alter table public."agreement_rules" add constraint "agreement_rules_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."agreements" add constraint "agreements_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."api_key_minute_counts" add constraint "api_key_minute_counts_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES public.merchant_api_keys(id) ON DELETE CASCADE;
alter table public."audit_customer_summaries" add constraint "audit_customer_summaries_audit_id_fkey" FOREIGN KEY (audit_id) REFERENCES public.sync_jobs(id) ON DELETE CASCADE;
alter table public."audit_customer_summaries" add constraint "audit_customer_summaries_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."audit_result_summaries" add constraint "audit_result_summaries_audit_id_fkey" FOREIGN KEY (audit_id) REFERENCES public.sync_jobs(id) ON DELETE CASCADE;
alter table public."audit_result_summaries" add constraint "audit_result_summaries_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."billing_events_log" add constraint "fk_v2_bel_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_clarification_requests" add constraint "case_clarification_requests_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_clarification_requests" add constraint "case_clarification_requests_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_comment_events" add constraint "case_comment_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_comment_events" add constraint "case_comment_events_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.case_comments(id) ON DELETE CASCADE;
alter table public."case_comment_events" add constraint "case_comment_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_comments" add constraint "case_comments_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_comments" add constraint "case_comments_evidence_item_id_fkey" FOREIGN KEY (evidence_item_id) REFERENCES public.evidence_items(id) ON DELETE SET NULL;
alter table public."case_comments" add constraint "case_comments_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_comments" add constraint "case_comments_recovery_case_id_fkey" FOREIGN KEY (recovery_case_id) REFERENCES public.recovery_cases(id) ON DELETE SET NULL;
alter table public."case_comments" add constraint "case_comments_rule_evaluation_id_fkey" FOREIGN KEY (rule_evaluation_id) REFERENCES public.rule_evaluations(id) ON DELETE SET NULL;
alter table public."case_comments" add constraint "case_comments_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_decisions" add constraint "case_decisions_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_decisions" add constraint "case_decisions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_decisions" add constraint "case_decisions_reverses_decision_id_fkey" FOREIGN KEY (reverses_decision_id) REFERENCES public.case_decisions(id) ON DELETE SET NULL;
alter table public."case_decisions" add constraint "case_decisions_supersedes_decision_id_fkey" FOREIGN KEY (supersedes_decision_id) REFERENCES public.case_decisions(id) ON DELETE SET NULL;
alter table public."case_decisions" add constraint "case_decisions_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_exceptions" add constraint "case_exceptions_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_exceptions" add constraint "case_exceptions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_exceptions" add constraint "case_exceptions_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_exceptions" add constraint "case_exceptions_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_financial_entries" add constraint "case_financial_entries_domain_event_id_fkey" FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE SET NULL;
alter table public."case_financial_entries" add constraint "case_financial_entries_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_financial_entries" add constraint "case_financial_entries_reverses_entry_id_fkey" FOREIGN KEY (reverses_entry_id) REFERENCES public.case_financial_entries(id) ON DELETE SET NULL;
alter table public."case_financial_entries" add constraint "case_financial_entries_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."case_financial_entries" add constraint "case_financial_entries_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_financial_summaries" add constraint "case_financial_summaries_last_event_id_fkey" FOREIGN KEY (last_event_id) REFERENCES public.case_financial_entries(id) ON DELETE SET NULL;
alter table public."case_financial_summaries" add constraint "case_financial_summaries_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_financial_summaries" add constraint "case_financial_summaries_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."case_outcomes" add constraint "case_outcomes_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."case_outcomes" add constraint "case_outcomes_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."case_outcomes" add constraint "case_outcomes_reverses_outcome_id_fkey" FOREIGN KEY (reverses_outcome_id) REFERENCES public.case_outcomes(id) ON DELETE SET NULL;
alter table public."case_outcomes" add constraint "case_outcomes_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."category_applicability" add constraint "category_applicability_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."category_applicability" add constraint "category_applicability_set_by_fkey" FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."checkout_signal_order_links" add constraint "checkout_signal_order_links_checkout_signal_id_fkey" FOREIGN KEY (checkout_signal_id) REFERENCES public.checkout_signals(id) ON DELETE CASCADE;
alter table public."checkout_signal_order_links" add constraint "checkout_signal_order_links_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."checkout_signal_order_links" add constraint "checkout_signal_order_links_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."checkout_signals" add constraint "checkout_signals_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."claim_events" add constraint "claim_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."claim_events" add constraint "claim_events_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."claim_events" add constraint "claim_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."claim_evidence" add constraint "claim_evidence_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."claim_evidence" add constraint "claim_evidence_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."claim_evidence" add constraint "claim_evidence_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."claim_outcomes" add constraint "claim_outcomes_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."claim_outcomes" add constraint "claim_outcomes_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."comment_mentions" add constraint "comment_mentions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.case_comments(id) ON DELETE CASCADE;
alter table public."comment_mentions" add constraint "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY (mentioned_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."comment_mentions" add constraint "comment_mentions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."connector_action_runs" add constraint "connector_action_runs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."connector_action_runs" add constraint "connector_action_runs_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE CASCADE;
alter table public."connector_action_runs" add constraint "connector_action_runs_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."connector_action_runs" add constraint "connector_action_runs_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."context_credit_events" add constraint "fk_v2_cce_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."correspondence_automation_settings" add constraint "correspondence_automation_settings_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."credit_topup_log" add constraint "fk_v2_ctl_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."customer_claim_summary" add constraint "customer_claim_summary_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."customer_identity_signals" add constraint "customer_identity_signals_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."document_upload_jobs" add constraint "document_upload_jobs_agreement_id_fkey" FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;
alter table public."document_upload_jobs" add constraint "document_upload_jobs_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_domain_event_id_fkey" FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE CASCADE;
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_event_merchant_fkey" FOREIGN KEY (domain_event_id, merchant_id) REFERENCES public.domain_events(id, merchant_id) ON DELETE CASCADE;
alter table public."domain_event_deliveries" add constraint "domain_event_deliveries_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."domain_events" add constraint "domain_events_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE SET NULL;
alter table public."domain_events" add constraint "domain_events_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id);
alter table public."domain_events" add constraint "domain_events_ingestion_event_id_fkey" FOREIGN KEY (ingestion_event_id) REFERENCES public.ingestion_events(id) ON DELETE SET NULL;
alter table public."domain_events" add constraint "domain_events_ingestion_merchant_fkey" FOREIGN KEY (ingestion_event_id, merchant_id) REFERENCES public.ingestion_events(id, merchant_id);
alter table public."domain_events" add constraint "domain_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."domain_events" add constraint "domain_events_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."domain_events" add constraint "domain_events_source_record_merchant_fkey" FOREIGN KEY (source_record_id, merchant_id) REFERENCES public.source_records(id, merchant_id);
alter table public."entity_relationships" add constraint "entity_relationships_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."evidence_download_tokens" add constraint "evidence_download_tokens_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES public.evidence_packages(id) ON DELETE CASCADE;
alter table public."evidence_download_tokens" add constraint "evidence_download_tokens_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."evidence_items" add constraint "evidence_items_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."evidence_items" add constraint "evidence_items_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE SET NULL;
alter table public."evidence_items" add constraint "evidence_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."evidence_items" add constraint "evidence_items_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."evidence_items" add constraint "evidence_items_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."evidence_links" add constraint "evidence_links_evidence_item_id_fkey" FOREIGN KEY (evidence_item_id) REFERENCES public.evidence_items(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_recovery_case_id_fkey" FOREIGN KEY (recovery_case_id) REFERENCES public.recovery_cases(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE CASCADE;
alter table public."evidence_links" add constraint "evidence_links_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."evidence_packages" add constraint "evidence_packages_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.source_customers(id) ON DELETE SET NULL;
alter table public."evidence_packages" add constraint "evidence_packages_generated_for_order_id_fkey" FOREIGN KEY (generated_for_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."evidence_packages" add constraint "evidence_packages_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."external_clarification_requests" add constraint "external_clarification_requests_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE CASCADE;
alter table public."external_clarification_requests" add constraint "external_clarification_requests_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."external_correspondence" add constraint "external_correspondence_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE SET NULL;
alter table public."external_correspondence" add constraint "external_correspondence_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.integration_documents(id) ON DELETE CASCADE;
alter table public."extracted_partner_terms" add constraint "extracted_partner_terms_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."founding_merchant_applications" add constraint "founding_merchant_applications_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."helpdesk_connections" add constraint "helpdesk_connections_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;
alter table public."identities" add constraint "identities_superseded_by_fkey" FOREIGN KEY (superseded_by) REFERENCES public.identities(id) ON DELETE SET NULL;
alter table public."identity_catch_events" add constraint "identity_catch_events_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."identity_catch_events" add constraint "identity_catch_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."identity_catch_events" add constraint "identity_catch_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."identity_catch_events" add constraint "identity_catch_events_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.identities(id) ON DELETE SET NULL;
alter table public."identity_edges" add constraint "identity_edges_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."identity_evidence_scores" add constraint "identity_evidence_scores_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."identity_members" add constraint "identity_members_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."identity_notes" add constraint "identity_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."identity_notes" add constraint "identity_notes_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."identity_notes" add constraint "identity_notes_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."identity_profiles" add constraint "identity_profiles_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."identity_resolution_events" add constraint "identity_resolution_events_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."identity_signals" add constraint "identity_signals_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."identity_signals" add constraint "identity_signals_source_customer_id_fkey" FOREIGN KEY (source_customer_id) REFERENCES public.source_customers(id) ON DELETE CASCADE;
alter table public."identity_signals" add constraint "identity_signals_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."identity_signals" add constraint "identity_signals_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE CASCADE;
alter table public."ingestion_events" add constraint "ingestion_events_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE SET NULL;
alter table public."ingestion_events" add constraint "ingestion_events_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id);
alter table public."ingestion_events" add constraint "ingestion_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_ingestion_event_id_fkey" FOREIGN KEY (ingestion_event_id) REFERENCES public.ingestion_events(id) ON DELETE SET NULL;
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."ingestion_field_errors" add constraint "ingestion_field_errors_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."integration_credentials" add constraint "integration_credentials_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE CASCADE;
alter table public."integration_credentials" add constraint "integration_credentials_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id) ON DELETE CASCADE;
alter table public."integration_credentials" add constraint "integration_credentials_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."integration_documents" add constraint "integration_documents_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."integration_documents" add constraint "integration_documents_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."integration_evidence_items" add constraint "integration_evidence_items_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."integration_evidence_items" add constraint "integration_evidence_items_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."loss_attribution_candidates" add constraint "loss_attribution_candidates_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE CASCADE;
alter table public."loss_attribution_candidates" add constraint "loss_attribution_candidates_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."loss_case_events" add constraint "loss_case_events_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE CASCADE;
alter table public."loss_case_events" add constraint "loss_case_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."loss_case_evidence" add constraint "loss_case_evidence_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE CASCADE;
alter table public."loss_case_evidence" add constraint "loss_case_evidence_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."loss_cases" add constraint "loss_cases_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."loss_cases" add constraint "loss_cases_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."loss_cases" add constraint "loss_cases_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."loss_cases" add constraint "loss_cases_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."loss_sources" add constraint "loss_sources_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."loss_sources" add constraint "loss_sources_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_api_keys" add constraint "merchant_api_keys_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_credits" add constraint "fk_v2_mcred_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_customer_signals" add constraint "merchant_customer_signals_merchant_customer_id_fkey" FOREIGN KEY (merchant_customer_id) REFERENCES public.merchant_customers(id) ON DELETE CASCADE;
alter table public."merchant_customer_signals" add constraint "merchant_customer_signals_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_customers" add constraint "merchant_customers_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_customers" add constraint "merchant_customers_superseded_by_fkey" FOREIGN KEY (superseded_by) REFERENCES public.merchant_customers(id) ON DELETE SET NULL;
alter table public."merchant_identity_state" add constraint "merchant_identity_state_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
alter table public."merchant_identity_state" add constraint "merchant_identity_state_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_identity_state" add constraint "merchant_identity_state_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."merchant_integrations" add constraint "merchant_integrations_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_merchant_rule_id_fkey" FOREIGN KEY (merchant_rule_id) REFERENCES public.merchant_rules(id) ON DELETE CASCADE;
alter table public."merchant_rule_versions" add constraint "merchant_rule_versions_supersedes_version_id_fkey" FOREIGN KEY (supersedes_version_id) REFERENCES public.merchant_rule_versions(id) ON DELETE SET NULL;
alter table public."merchant_rules" add constraint "merchant_rules_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_subscriptions" add constraint "fk_v2_msub_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_subscriptions" add constraint "fk_v2_msub_plan" FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id);
alter table public."merchant_users" add constraint "merchant_users_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."merchant_users" add constraint "merchant_users_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."merchant_users" add constraint "merchant_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."merchant_widget_tokens" add constraint "merchant_widget_tokens_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES public.merchant_api_keys(id) ON DELETE CASCADE;
alter table public."merchant_widget_tokens" add constraint "merchant_widget_tokens_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."network_access_log" add constraint "network_access_log_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."notification_preferences" add constraint "notification_preferences_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_domain_event_id_fkey" FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE SET NULL;
alter table public."notifications" add constraint "notifications_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."oauth_connection_transactions" add constraint "oauth_connection_transactions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."oauth_connection_transactions" add constraint "oauth_connection_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."order_claim_context" add constraint "order_claim_context_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."order_claim_context" add constraint "order_claim_context_support_case_id_fkey" FOREIGN KEY (support_case_id) REFERENCES public.support_case_intake(id) ON DELETE CASCADE;
alter table public."pack_confirmations" add constraint "pack_confirmations_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."partner_recovery_rules" add constraint "partner_recovery_rules_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
alter table public."partners" add constraint "partners_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."pending_provider_account_selections" add constraint "pending_provider_account_selections_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."pending_provider_account_selections" add constraint "pending_provider_account_selections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profile_view_tokens" add constraint "profile_view_tokens_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."profile_view_tokens" add constraint "profile_view_tokens_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.source_customers(id) ON DELETE CASCADE;
alter table public."record_match_candidates" add constraint "record_match_candidates_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."record_match_resolutions" add constraint "record_match_resolutions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."record_match_resolutions" add constraint "record_match_resolutions_selected_candidate_id_fkey" FOREIGN KEY (selected_candidate_id) REFERENCES public.record_match_candidates(id) ON DELETE SET NULL;
alter table public."recovery_case_events" add constraint "recovery_case_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."recovery_case_events" add constraint "recovery_case_events_recovery_case_id_fkey" FOREIGN KEY (recovery_case_id) REFERENCES public.recovery_cases(id) ON DELETE CASCADE;
alter table public."recovery_cases" add constraint "recovery_cases_internal_owner_user_id_fkey" FOREIGN KEY (internal_owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."recovery_cases" add constraint "recovery_cases_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE SET NULL;
alter table public."recovery_cases" add constraint "recovery_cases_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."recovery_cases" add constraint "recovery_cases_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;
alter table public."recovery_cases" add constraint "recovery_cases_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."recovery_tasks" add constraint "recovery_tasks_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."recovery_tasks" add constraint "recovery_tasks_loss_source_id_fkey" FOREIGN KEY (loss_source_id) REFERENCES public.loss_sources(id) ON DELETE CASCADE;
alter table public."recovery_tasks" add constraint "recovery_tasks_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."rule_evaluations" add constraint "rule_evaluations_claim_id_fkey" FOREIGN KEY (claim_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."rule_evaluations" add constraint "rule_evaluations_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE SET NULL;
alter table public."rule_evaluations" add constraint "rule_evaluations_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."rule_evaluations" add constraint "rule_evaluations_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES public.merchant_rules(id) ON DELETE SET NULL;
alter table public."rule_evaluations" add constraint "rule_evaluations_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE SET NULL;
alter table public."source_accounts" add constraint "source_accounts_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE CASCADE;
alter table public."source_accounts" add constraint "source_accounts_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id) ON DELETE CASCADE;
alter table public."source_accounts" add constraint "source_accounts_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_addresses" add constraint "source_addresses_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_addresses" add constraint "source_addresses_source_customer_id_fkey" FOREIGN KEY (source_customer_id) REFERENCES public.source_customers(id) ON DELETE CASCADE;
alter table public."source_customers" add constraint "source_customers_merchant_customer_id_fkey" FOREIGN KEY (merchant_customer_id) REFERENCES public.merchant_customers(id) ON DELETE SET NULL;
alter table public."source_customers" add constraint "source_customers_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_disputes" add constraint "source_disputes_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_disputes" add constraint "source_disputes_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_fulfillments" add constraint "source_fulfillments_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_fulfillments" add constraint "source_fulfillments_order_merchant_fkey" FOREIGN KEY (source_order_id, merchant_id) REFERENCES public.source_orders(id, merchant_id) ON DELETE CASCADE;
alter table public."source_fulfillments" add constraint "source_fulfillments_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."source_locations" add constraint "source_locations_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."source_locations" add constraint "source_locations_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_locations" add constraint "source_locations_record_merchant_fkey" FOREIGN KEY (source_record_id, merchant_id) REFERENCES public.source_records(id, merchant_id);
alter table public."source_locations" add constraint "source_locations_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_locations" add constraint "source_locations_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_messages" add constraint "source_messages_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_messages" add constraint "source_messages_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_messages" add constraint "source_messages_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE CASCADE;
alter table public."source_order_lines" add constraint "source_order_lines_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_order_lines" add constraint "source_order_lines_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."source_order_lines" add constraint "source_order_lines_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."source_orders" add constraint "source_orders_billing_address_id_fkey" FOREIGN KEY (billing_address_id) REFERENCES public.source_addresses(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.store_connections(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.sync_jobs(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_merchant_customer_id_fkey" FOREIGN KEY (merchant_customer_id) REFERENCES public.merchant_customers(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_orders" add constraint "source_orders_shipping_address_id_fkey" FOREIGN KEY (shipping_address_id) REFERENCES public.source_addresses(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_orders" add constraint "source_orders_source_customer_id_fkey" FOREIGN KEY (source_customer_id) REFERENCES public.source_customers(id) ON DELETE SET NULL;
alter table public."source_payments" add constraint "source_payments_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_payments" add constraint "source_payments_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_payments" add constraint "source_payments_source_customer_id_fkey" FOREIGN KEY (source_customer_id) REFERENCES public.source_customers(id) ON DELETE SET NULL;
alter table public."source_payments" add constraint "source_payments_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_payments" add constraint "source_payments_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_records" add constraint "source_records_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."source_records" add constraint "source_records_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE SET NULL;
alter table public."source_records" add constraint "source_records_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id);
alter table public."source_records" add constraint "source_records_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_records" add constraint "source_records_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_refunds" add constraint "source_refunds_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_refunds" add constraint "source_refunds_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE CASCADE;
alter table public."source_replacements" add constraint "source_replacements_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_replacements" add constraint "source_replacements_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_replacements" add constraint "source_replacements_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_replacements" add constraint "source_replacements_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_replacements" add constraint "source_replacements_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."source_returns" add constraint "source_returns_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."source_returns" add constraint "source_returns_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_returns" add constraint "source_returns_order_merchant_fkey" FOREIGN KEY (source_order_id, merchant_id) REFERENCES public.source_orders(id, merchant_id);
alter table public."source_returns" add constraint "source_returns_record_merchant_fkey" FOREIGN KEY (source_record_id, merchant_id) REFERENCES public.source_records(id, merchant_id);
alter table public."source_returns" add constraint "source_returns_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_returns" add constraint "source_returns_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_returns" add constraint "source_returns_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_returns" add constraint "source_returns_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."source_shipments" add constraint "source_shipments_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."source_shipments" add constraint "source_shipments_fulfillment_merchant_fkey" FOREIGN KEY (source_fulfillment_id, merchant_id) REFERENCES public.source_fulfillments(id, merchant_id);
alter table public."source_shipments" add constraint "source_shipments_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_shipments" add constraint "source_shipments_order_merchant_fkey" FOREIGN KEY (source_order_id, merchant_id) REFERENCES public.source_orders(id, merchant_id);
alter table public."source_shipments" add constraint "source_shipments_record_merchant_fkey" FOREIGN KEY (source_record_id, merchant_id) REFERENCES public.source_records(id, merchant_id);
alter table public."source_shipments" add constraint "source_shipments_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_shipments" add constraint "source_shipments_source_fulfillment_id_fkey" FOREIGN KEY (source_fulfillment_id) REFERENCES public.source_fulfillments(id) ON DELETE SET NULL;
alter table public."source_shipments" add constraint "source_shipments_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_shipments" add constraint "source_shipments_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_ticket_events" add constraint "source_ticket_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_ticket_events" add constraint "source_ticket_events_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE CASCADE;
alter table public."source_tickets" add constraint "source_tickets_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.helpdesk_connections(id) ON DELETE SET NULL;
alter table public."source_tickets" add constraint "source_tickets_merchant_customer_id_fkey" FOREIGN KEY (merchant_customer_id) REFERENCES public.merchant_customers(id) ON DELETE SET NULL;
alter table public."source_tickets" add constraint "source_tickets_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_tickets" add constraint "source_tickets_source_customer_id_fkey" FOREIGN KEY (source_customer_id) REFERENCES public.source_customers(id) ON DELETE SET NULL;
alter table public."source_tracking_events" add constraint "source_tracking_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_tracking_events" add constraint "source_tracking_events_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."source_tracking_events" add constraint "source_tracking_events_source_shipment_id_fkey" FOREIGN KEY (source_shipment_id) REFERENCES public.source_shipments(id) ON DELETE CASCADE;
alter table public."source_transactions" add constraint "source_transactions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."source_transactions" add constraint "source_transactions_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."source_transactions" add constraint "source_transactions_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."source_transactions" add constraint "source_transactions_source_payment_id_fkey" FOREIGN KEY (source_payment_id) REFERENCES public.source_payments(id) ON DELETE SET NULL;
alter table public."source_transactions" add constraint "source_transactions_source_record_id_fkey" FOREIGN KEY (source_record_id) REFERENCES public.source_records(id) ON DELETE SET NULL;
alter table public."store_connections" add constraint "store_connections_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;
alter table public."support_case_events" add constraint "support_case_events_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."support_case_events" add constraint "support_case_events_support_case_id_fkey" FOREIGN KEY (support_case_id) REFERENCES public.support_case_intake(id) ON DELETE CASCADE;
alter table public."support_case_intake" add constraint "support_case_intake_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.identities(id) ON DELETE SET NULL;
alter table public."support_case_intake" add constraint "support_case_intake_merchant_claim_id_fkey" FOREIGN KEY (merchant_claim_id) REFERENCES public.support_payout_cases(id) ON DELETE SET NULL;
alter table public."support_case_intake" add constraint "support_case_intake_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."support_case_intake" add constraint "support_case_intake_provider_connection_id_fkey" FOREIGN KEY (provider_connection_id) REFERENCES public.support_provider_connections(id) ON DELETE SET NULL;
alter table public."support_payout_cases" add constraint "claims_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."support_payout_cases" add constraint "claims_identity_id_fkey" FOREIGN KEY (identity_id) REFERENCES public.identities(id) ON DELETE SET NULL;
alter table public."support_payout_cases" add constraint "claims_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."support_payout_cases" add constraint "claims_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.source_orders(id) ON DELETE SET NULL;
alter table public."support_payout_cases" add constraint "claims_source_ticket_id_fkey" FOREIGN KEY (source_ticket_id) REFERENCES public.source_tickets(id) ON DELETE SET NULL;
alter table public."support_payout_cases" add constraint "support_payout_cases_merchant_customer_id_fkey" FOREIGN KEY (merchant_customer_id) REFERENCES public.merchant_customers(id) ON DELETE SET NULL;
alter table public."support_provider_connections" add constraint "support_provider_connections_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."sync_job_chunks" add constraint "sync_job_chunks_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.sync_jobs(id) ON DELETE CASCADE;
alter table public."sync_jobs" add constraint "sync_jobs_account_merchant_fkey" FOREIGN KEY (source_account_id, merchant_id) REFERENCES public.source_accounts(id, merchant_id);
alter table public."sync_jobs" add constraint "sync_jobs_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.merchant_integrations(id) ON DELETE SET NULL;
alter table public."sync_jobs" add constraint "sync_jobs_connection_merchant_fkey" FOREIGN KEY (connection_id, merchant_id) REFERENCES public.merchant_integrations(id, merchant_id);
alter table public."sync_jobs" add constraint "sync_jobs_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."sync_jobs" add constraint "sync_jobs_source_account_id_fkey" FOREIGN KEY (source_account_id) REFERENCES public.source_accounts(id) ON DELETE SET NULL;
alter table public."unmatched_correspondence" add constraint "unmatched_correspondence_id_fkey" FOREIGN KEY (id) REFERENCES public.external_correspondence(id) ON DELETE CASCADE;
alter table public."unmatched_correspondence" add constraint "unmatched_correspondence_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."user_action_log" add constraint "user_action_log_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_action_log" add constraint "user_action_log_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."user_permission_grants" add constraint "user_permission_grants_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."user_permission_grants" add constraint "user_permission_grants_grantee_user_id_fkey" FOREIGN KEY (grantee_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_permission_grants" add constraint "user_permission_grants_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."work_tasks" add constraint "work_tasks_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."work_tasks" add constraint "work_tasks_domain_event_id_fkey" FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE SET NULL;
alter table public."work_tasks" add constraint "work_tasks_loss_case_id_fkey" FOREIGN KEY (loss_case_id) REFERENCES public.loss_cases(id) ON DELETE SET NULL;
alter table public."work_tasks" add constraint "work_tasks_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."work_tasks" add constraint "work_tasks_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."work_tasks" add constraint "work_tasks_recovery_case_id_fkey" FOREIGN KEY (recovery_case_id) REFERENCES public.recovery_cases(id) ON DELETE SET NULL;
alter table public."work_tasks" add constraint "work_tasks_support_payout_case_id_fkey" FOREIGN KEY (support_payout_case_id) REFERENCES public.support_payout_cases(id) ON DELETE CASCADE;
alter table public."workflow_definitions" add constraint "workflow_definitions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."workflow_definitions" add constraint "workflow_definitions_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."workflow_definitions" add constraint "workflow_definitions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."workflow_runs" add constraint "workflow_runs_domain_event_id_fkey" FOREIGN KEY (domain_event_id) REFERENCES public.domain_events(id) ON DELETE CASCADE;
alter table public."workflow_runs" add constraint "workflow_runs_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."workflow_runs" add constraint "workflow_runs_workflow_definition_id_fkey" FOREIGN KEY (workflow_definition_id) REFERENCES public.workflow_definitions(id) ON DELETE RESTRICT;
alter table public."workflow_step_runs" add constraint "workflow_step_runs_merchant_id_fkey" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;
alter table public."workflow_step_runs" add constraint "workflow_step_runs_workflow_run_id_fkey" FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id) ON DELETE CASCADE;

-- ============ indexes (exact; constraint-backed indexes skipped) ============
CREATE INDEX idx_access_audit_log_merchant ON public.access_audit_log USING btree (merchant_id, created_at DESC);
CREATE INDEX accountability_events_claim_idx ON public.accountability_events USING btree (claim_id, created_at);
CREATE INDEX accountability_events_merchant_idx ON public.accountability_events USING btree (merchant_id, event_type, created_at);
CREATE INDEX agreement_clauses_agreement_idx ON public.agreement_clauses USING btree (agreement_id);
CREATE INDEX agreement_clauses_review_idx ON public.agreement_clauses USING btree (merchant_id, reviewed, approved);
CREATE INDEX agreement_rule_evaluations_claim_idx ON public.agreement_rule_evaluations USING btree (claim_id, created_at);
CREATE INDEX agreement_rules_agreement_idx ON public.agreement_rules USING btree (agreement_id);
CREATE INDEX agreement_rules_merchant_idx ON public.agreement_rules USING btree (merchant_id, status, priority);
CREATE INDEX agreements_merchant_idx ON public.agreements USING btree (merchant_id, agreement_type, status);
CREATE INDEX api_key_minute_counts_window_idx ON public.api_key_minute_counts USING btree (window_minute);
CREATE INDEX idx_audit_customer_summaries_audit_updated ON public.audit_customer_summaries USING btree (audit_id, updated_at DESC);
CREATE INDEX idx_audit_customer_summaries_merchant_audit_score ON public.audit_customer_summaries USING btree (merchant_id, audit_id, max_score DESC, order_count DESC);
CREATE INDEX idx_audit_result_summaries_merchant_audit ON public.audit_result_summaries USING btree (merchant_id, audit_id);
CREATE INDEX billing_events_log_merchant_id_created_at_idx ON public.billing_events_log USING btree (merchant_id, created_at DESC);
CREATE UNIQUE INDEX billing_events_log_stripe_event_id_idx ON public.billing_events_log USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);
CREATE INDEX idx_case_clarification_requests_case ON public.case_clarification_requests USING btree (support_payout_case_id, created_at DESC);
CREATE INDEX idx_case_clarification_requests_merchant_status ON public.case_clarification_requests USING btree (merchant_id, status, due_at);
CREATE INDEX idx_case_clarification_requests_target ON public.case_clarification_requests USING btree (merchant_id, target_type, status);
CREATE INDEX case_comment_events_comment_idx ON public.case_comment_events USING btree (comment_id, created_at DESC);
CREATE INDEX case_comments_case_idx ON public.case_comments USING btree (merchant_id, support_payout_case_id, created_at DESC);
CREATE INDEX case_decisions_case_idx ON public.case_decisions USING btree (merchant_id, support_payout_case_id, effective_at DESC);
CREATE INDEX idx_case_exceptions_assignee ON public.case_exceptions USING btree (merchant_id, assigned_to) WHERE (assigned_to IS NOT NULL);
CREATE INDEX idx_case_exceptions_case ON public.case_exceptions USING btree (merchant_id, support_payout_case_id) WHERE (support_payout_case_id IS NOT NULL);
CREATE INDEX idx_case_exceptions_queue ON public.case_exceptions USING btree (merchant_id, status, created_at DESC);
CREATE UNIQUE INDEX case_financial_entries_migration_key_unique ON public.case_financial_entries USING btree (merchant_id, ((metadata ->> 'migration_key'::text))) WHERE (metadata ? 'migration_key'::text);
CREATE INDEX idx_financial_entries_case ON public.case_financial_entries USING btree (merchant_id, support_payout_case_id, currency);
CREATE INDEX idx_financial_entries_effective ON public.case_financial_entries USING btree (merchant_id, effective_at);
CREATE INDEX financial_summaries_case_currency_idx ON public.case_financial_summaries USING btree (merchant_id, support_payout_case_id, currency);
CREATE INDEX idx_case_financial_summaries_merchant_currency ON public.case_financial_summaries USING btree (merchant_id, currency, support_payout_case_id);
CREATE INDEX case_outcomes_case_idx ON public.case_outcomes USING btree (merchant_id, support_payout_case_id, effective_at DESC);
CREATE INDEX category_applicability_merchant_idx ON public.category_applicability USING btree (merchant_id, category);
CREATE INDEX checkout_signal_order_links_merchant_id_idx ON public.checkout_signal_order_links USING btree (merchant_id);
CREATE INDEX checkout_signal_order_links_order_id_idx ON public.checkout_signal_order_links USING btree (order_id);
CREATE INDEX checkout_signals_created_at_idx ON public.checkout_signals USING btree (created_at);
CREATE INDEX checkout_signals_device_fp_idx ON public.checkout_signals USING btree (device_fp) WHERE (device_fp IS NOT NULL);
CREATE INDEX checkout_signals_email_hash_idx ON public.checkout_signals USING btree (email_hash) WHERE (email_hash IS NOT NULL);
CREATE INDEX checkout_signals_merchant_created_at_idx ON public.checkout_signals USING btree (merchant_id, created_at DESC);
CREATE INDEX checkout_signals_merchant_visitor_idx ON public.checkout_signals USING btree (merchant_id, visitor_id);
CREATE INDEX checkout_signals_visitor_session_idx ON public.checkout_signals USING btree (visitor_id, session_id);
CREATE INDEX idx_claim_events_claim ON public.claim_events USING btree (claim_id, created_at DESC);
CREATE UNIQUE INDEX claim_evidence_fulfillment_sync_uniq ON public.claim_evidence USING btree (claim_id) WHERE ((metadata ->> 'auto_source'::text) = 'fulfillment_sync'::text);
CREATE INDEX idx_claim_evidence_claim ON public.claim_evidence USING btree (claim_id);
CREATE INDEX comment_mentions_user_idx ON public.comment_mentions USING btree (merchant_id, mentioned_user_id, created_at DESC);
CREATE INDEX connector_action_runs_case_idx ON public.connector_action_runs USING btree (merchant_id, support_payout_case_id, created_at DESC);
CREATE INDEX context_credit_events_claim_id_idx ON public.context_credit_events USING btree (claim_id) WHERE (claim_id IS NOT NULL);
CREATE INDEX context_credit_events_merchant_id_occurred_at_idx ON public.context_credit_events USING btree (merchant_id, occurred_at DESC);
CREATE INDEX credit_topup_log_merchant_id_created_at_idx ON public.credit_topup_log USING btree (merchant_id, created_at DESC);
CREATE INDEX customer_claim_summary_email_hash_idx ON public.customer_claim_summary USING btree (customer_email_hash);
CREATE INDEX customer_identity_signals_device_idx ON public.customer_identity_signals USING btree (device_fingerprint);
CREATE INDEX customer_identity_signals_email_hash_idx ON public.customer_identity_signals USING btree (customer_email_hash);
CREATE INDEX customer_identity_signals_phone_hash_idx ON public.customer_identity_signals USING btree (phone_hash);
CREATE INDEX customer_identity_signals_shipping_hash_idx ON public.customer_identity_signals USING btree (shipping_address_hash);
CREATE INDEX document_upload_jobs_merchant_idx ON public.document_upload_jobs USING btree (merchant_id, status);
CREATE INDEX domain_event_deliveries_retry_idx ON public.domain_event_deliveries USING btree (merchant_id, handler_name, status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text, 'dead_letter'::text]));
CREATE INDEX idx_domain_event_deliveries_claim ON public.domain_event_deliveries USING btree (handler_name, status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));
CREATE INDEX domain_events_case_timeline_idx ON public.domain_events USING btree (merchant_id, aggregate_id, occurred_at DESC) WHERE (aggregate_type = 'case'::text);
CREATE INDEX idx_domain_events_aggregate ON public.domain_events USING btree (merchant_id, aggregate_type, aggregate_id);
CREATE INDEX idx_domain_events_merchant ON public.domain_events USING btree (merchant_id, occurred_at DESC);
CREATE INDEX idx_domain_events_type ON public.domain_events USING btree (merchant_id, event_type);
CREATE INDEX entity_relationships_neighbors_idx ON public.entity_relationships USING btree (merchant_id, from_entity_type, from_entity_id, match_status);
CREATE INDEX idx_entity_relationships_from ON public.entity_relationships USING btree (merchant_id, from_entity_type, from_entity_id);
CREATE INDEX idx_entity_relationships_status ON public.entity_relationships USING btree (merchant_id, match_status);
CREATE INDEX idx_entity_relationships_to ON public.entity_relationships USING btree (merchant_id, to_entity_type, to_entity_id);
CREATE INDEX evidence_download_tokens_active_idx ON public.evidence_download_tokens USING btree (token_hash, expires_at) WHERE (used_at IS NULL);
CREATE INDEX evidence_download_tokens_evidence_id_idx ON public.evidence_download_tokens USING btree (evidence_id);
CREATE INDEX evidence_download_tokens_merchant_id_idx ON public.evidence_download_tokens USING btree (merchant_id);
CREATE INDEX evidence_items_claim_idx ON public.evidence_items USING btree (claim_id, created_at);
CREATE INDEX evidence_items_claim_origin_idx ON public.evidence_items USING btree (merchant_id, claim_id) WHERE ((claim_id IS NOT NULL) AND (((source_metadata ->> 'origin_store'::text) = 'claim_evidence'::text) OR ((source_metadata ->> 'legacy_table'::text) = 'claim_evidence'::text)));
CREATE UNIQUE INDEX evidence_items_fulfillment_sync_uniq ON public.evidence_items USING btree (claim_id) WHERE ((source_metadata ->> 'auto_source'::text) = 'fulfillment_sync'::text);
CREATE INDEX evidence_items_merchant_idx ON public.evidence_items USING btree (merchant_id, source_system, evidence_type);
CREATE UNIQUE INDEX evidence_items_migration_key_unique ON public.evidence_items USING btree (merchant_id, ((source_metadata ->> 'migration_key'::text))) WHERE ((source_metadata ->> 'migration_key'::text) IS NOT NULL);
CREATE UNIQUE INDEX evidence_links_case_unique ON public.evidence_links USING btree (evidence_item_id, support_payout_case_id) WHERE (support_payout_case_id IS NOT NULL);
CREATE UNIQUE INDEX evidence_links_loss_unique ON public.evidence_links USING btree (evidence_item_id, loss_case_id) WHERE (loss_case_id IS NOT NULL);
CREATE UNIQUE INDEX evidence_links_order_unique ON public.evidence_links USING btree (evidence_item_id, source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE UNIQUE INDEX evidence_links_recovery_unique ON public.evidence_links USING btree (evidence_item_id, recovery_case_id) WHERE (recovery_case_id IS NOT NULL);
CREATE UNIQUE INDEX evidence_links_ticket_unique ON public.evidence_links USING btree (evidence_item_id, source_ticket_id) WHERE (source_ticket_id IS NOT NULL);
CREATE INDEX evidence_packages_customer_profile_id_idx ON public.evidence_packages USING btree (customer_profile_id);
CREATE INDEX evidence_packages_generated_for_order_id_idx ON public.evidence_packages USING btree (generated_for_order_id);
CREATE INDEX evidence_packages_merchant_id_idx ON public.evidence_packages USING btree (merchant_id, generated_at DESC);
CREATE UNIQUE INDEX external_clarification_requests_token_unique ON public.external_clarification_requests USING btree (merchant_id, hidden_threading_token);
CREATE INDEX idx_external_clarification_requests_case ON public.external_clarification_requests USING btree (loss_case_id, created_at DESC);
CREATE UNIQUE INDEX external_correspondence_source_unique ON public.external_correspondence USING btree (merchant_id, source_provider, source_record_id, direction);
CREATE INDEX idx_external_correspondence_case ON public.external_correspondence USING btree (loss_case_id, created_at DESC) WHERE (loss_case_id IS NOT NULL);
CREATE INDEX idx_external_correspondence_thread ON public.external_correspondence USING btree (merchant_id, source_provider, source_thread_id) WHERE (source_thread_id IS NOT NULL);
CREATE INDEX extracted_partner_terms_merchant_idx ON public.extracted_partner_terms USING btree (merchant_id, partner_type);
CREATE UNIQUE INDEX helpdesk_connections_global_account_owner_key ON public.helpdesk_connections USING btree (provider, provider_account_id) WHERE (provider_account_id IS NOT NULL);
CREATE UNIQUE INDEX helpdesk_connections_one_active_provider_key ON public.helpdesk_connections USING btree (merchant_id, provider) WHERE (status = 'active'::public.connection_status);
CREATE INDEX helpdesk_connections_verification_idx ON public.helpdesk_connections USING btree (status, last_verified_at);
CREATE INDEX idx_helpdesk_connections_merchant ON public.helpdesk_connections USING btree (merchant_id, provider);
CREATE INDEX idx_identities_grade ON public.identities USING btree (confidence_grade, last_seen_at DESC);
CREATE INDEX identity_catch_events_claim_id_idx ON public.identity_catch_events USING btree (claim_id) WHERE (claim_id IS NOT NULL);
CREATE UNIQUE INDEX identity_catch_events_claim_pair_uidx ON public.identity_catch_events USING btree (claim_id, submitted_identifier_hash, linked_identifier_hash) WHERE (claim_id IS NOT NULL);
CREATE INDEX identity_catch_events_merchant_created_idx ON public.identity_catch_events USING btree (merchant_id, created_at DESC);
CREATE INDEX identity_catch_events_profile_id_idx ON public.identity_catch_events USING btree (profile_id) WHERE (profile_id IS NOT NULL);
CREATE INDEX idx_identity_edges_left ON public.identity_edges USING btree (left_type, left_hash);
CREATE INDEX idx_identity_edges_right ON public.identity_edges USING btree (right_type, right_hash);
CREATE INDEX idx_identity_evidence_scores_computed_at ON public.identity_evidence_scores USING btree (computed_at);
CREATE INDEX idx_identity_evidence_scores_level ON public.identity_evidence_scores USING btree (evidence_level);
CREATE INDEX identity_link_candidates_linked_idx ON public.identity_link_candidates USING btree (linked_customer_email_hash);
CREATE INDEX identity_link_candidates_primary_idx ON public.identity_link_candidates USING btree (primary_customer_email_hash);
CREATE INDEX idx_identity_members_identifier ON public.identity_members USING btree (identifier_type, identifier_hash);
CREATE UNIQUE INDEX ux_identity_members_strong_identifier ON public.identity_members USING btree (identifier_type, identifier_hash) WHERE (identifier_type = ANY (ARRAY['email'::public.identifier_type, 'email_root'::public.identifier_type, 'phone'::public.identifier_type, 'shipping_address'::public.identifier_type, 'billing_address'::public.identifier_type, 'address_unit'::public.identifier_type, 'payment_fingerprint'::public.identifier_type, 'platform_customer_id'::public.identifier_type, 'helpdesk_contact_id'::public.identifier_type]));
CREATE INDEX idx_identity_notes ON public.identity_notes USING btree (merchant_id, identity_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_resolution_events_identity ON public.identity_resolution_events USING btree (identity_id, created_at DESC);
CREATE INDEX idx_identity_signals_lookup ON public.identity_signals USING btree (identifier_type, identifier_hash);
CREATE INDEX idx_identity_signals_merchant ON public.identity_signals USING btree (merchant_id, observed_at DESC);
CREATE UNIQUE INDEX ux_identity_signals_dedupe ON public.identity_signals USING btree (identifier_type, identifier_hash, merchant_id, COALESCE(source_order_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(source_customer_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(source_ticket_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX ingest_rate_limits_window_start_idx ON public.ingest_rate_limits USING btree (window_start);
CREATE INDEX idx_ingestion_events_claim ON public.ingestion_events USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));
CREATE INDEX idx_ingestion_events_merchant ON public.ingestion_events USING btree (merchant_id, received_at DESC);
CREATE INDEX ingestion_events_connection_issues_idx ON public.ingestion_events USING btree (merchant_id, connection_id, received_at DESC) WHERE (status = ANY (ARRAY['failed'::text, 'dead_letter'::text]));
CREATE INDEX idx_ingestion_field_errors_merchant ON public.ingestion_field_errors USING btree (merchant_id, created_at DESC);
CREATE INDEX idx_integration_credentials_connection ON public.integration_credentials USING btree (connection_id) WHERE (connection_id IS NOT NULL);
CREATE UNIQUE INDEX integration_credentials_connection_key ON public.integration_credentials USING btree (connection_id);
CREATE INDEX integration_credentials_merchant_idx ON public.integration_credentials USING btree (merchant_id, provider_id);
CREATE INDEX integration_documents_merchant_idx ON public.integration_documents USING btree (merchant_id, document_type);
CREATE INDEX integration_evidence_items_case_idx ON public.integration_evidence_items USING btree (merchant_id, support_payout_case_id);
CREATE INDEX integration_evidence_items_reference_idx ON public.integration_evidence_items USING btree (merchant_id, raw_reference);
CREATE INDEX idx_loss_case_events_case ON public.loss_case_events USING btree (loss_case_id, created_at DESC);
CREATE INDEX idx_loss_case_events_merchant ON public.loss_case_events USING btree (merchant_id, created_at DESC);
CREATE INDEX idx_loss_case_evidence_case ON public.loss_case_evidence USING btree (loss_case_id, created_at DESC);
CREATE UNIQUE INDEX loss_case_evidence_source_unique ON public.loss_case_evidence USING btree (merchant_id, loss_case_id, evidence_type, source_provider, source_record_id, raw_payload_hash);
CREATE INDEX idx_loss_cases_category ON public.loss_cases USING btree (merchant_id, case_category);
CREATE INDEX idx_loss_cases_deadline ON public.loss_cases USING btree (merchant_id, claim_deadline_at) WHERE (claim_deadline_at IS NOT NULL);
CREATE INDEX idx_loss_cases_merchant_status ON public.loss_cases USING btree (merchant_id, status);
CREATE INDEX idx_loss_cases_support_payout_case ON public.loss_cases USING btree (support_payout_case_id) WHERE (support_payout_case_id IS NOT NULL);
CREATE UNIQUE INDEX loss_cases_source_fingerprint_unique ON public.loss_cases USING btree (merchant_id, source_fingerprint) WHERE (source_fingerprint IS NOT NULL);
CREATE INDEX loss_sources_claim_idx ON public.loss_sources USING btree (claim_id);
CREATE INDEX loss_sources_merchant_type_idx ON public.loss_sources USING btree (merchant_id, source_type, status);
CREATE INDEX idx_api_keys_active ON public.merchant_api_keys USING btree (key_hash) WHERE (revoked_at IS NULL);
CREATE INDEX idx_merchant_customer_signals_customer ON public.merchant_customer_signals USING btree (merchant_id, merchant_customer_id);
CREATE INDEX idx_merchant_customer_signals_lookup ON public.merchant_customer_signals USING btree (merchant_id, identifier_type, identifier_hash);
CREATE INDEX idx_merchant_customers_active ON public.merchant_customers USING btree (merchant_id, updated_at DESC) WHERE (resolution_status = 'active'::text);
CREATE INDEX idx_merchant_customers_identity ON public.merchant_customers USING btree (identity_id) WHERE (identity_id IS NOT NULL);
CREATE INDEX idx_merchant_customers_merchant ON public.merchant_customers USING btree (merchant_id);
CREATE UNIQUE INDEX merchant_integrations_account_key ON public.merchant_integrations USING btree (merchant_id, provider_id, provider_account_id) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX merchant_integrations_global_account_owner_key ON public.merchant_integrations USING btree (provider_id, COALESCE(environment, 'production'::text), provider_account_id) WHERE (provider_account_id IS NOT NULL);
CREATE INDEX merchant_integrations_merchant_idx ON public.merchant_integrations USING btree (merchant_id, provider_id);
CREATE UNIQUE INDEX merchant_integrations_one_active_provider_key ON public.merchant_integrations USING btree (merchant_id, provider_id) WHERE (status = ANY (ARRAY['pending'::text, 'connected'::text, 'degraded'::text, 'syncing'::text]));
CREATE INDEX merchant_integrations_verification_idx ON public.merchant_integrations USING btree (status, last_verified_at);
CREATE INDEX idx_rule_versions_merchant ON public.merchant_rule_versions USING btree (merchant_id, merchant_rule_id, version DESC);
CREATE UNIQUE INDEX idx_rule_versions_one_draft ON public.merchant_rule_versions USING btree (merchant_rule_id) WHERE (status = 'draft'::text);
CREATE UNIQUE INDEX idx_rule_versions_one_published ON public.merchant_rule_versions USING btree (merchant_rule_id) WHERE (status = 'published'::text);
CREATE INDEX merchant_rules_merchant_priority ON public.merchant_rules USING btree (merchant_id, priority) WHERE (is_active = true);
CREATE UNIQUE INDEX merchant_subscriptions_merchant_id_idx ON public.merchant_subscriptions USING btree (merchant_id) WHERE (status = ANY (ARRAY['active'::text, 'grace_period'::text, 'past_due'::text, 'free'::text]));
CREATE INDEX merchant_subscriptions_merchant_id_idx1 ON public.merchant_subscriptions USING btree (merchant_id);
CREATE INDEX merchant_subscriptions_stripe_customer_id_idx ON public.merchant_subscriptions USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);
CREATE INDEX merchant_subscriptions_stripe_subscription_id_idx ON public.merchant_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);
CREATE INDEX idx_merchant_users_user ON public.merchant_users USING btree (user_id) WHERE (invite_status = 'active'::public.invite_status);
CREATE INDEX idx_widget_tokens_merchant ON public.merchant_widget_tokens USING btree (merchant_id) WHERE (revoked_at IS NULL);
CREATE INDEX idx_network_access_log ON public.network_access_log USING btree (merchant_id, created_at DESC);
CREATE INDEX notifications_recipient_unread_idx ON public.notifications USING btree (merchant_id, recipient_user_id, created_at DESC) WHERE (read_at IS NULL);
CREATE INDEX notifications_unread_idx ON public.notifications USING btree (merchant_id, recipient_user_id, created_at DESC) WHERE (read_at IS NULL);
CREATE INDEX oauth_connection_transactions_expiry_idx ON public.oauth_connection_transactions USING btree (expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX order_claim_context_merchant_idx ON public.order_claim_context USING btree (merchant_id);
CREATE INDEX order_claim_context_merchant_order_ref_idx ON public.order_claim_context USING btree (merchant_id, order_ref);
CREATE INDEX pack_confirmations_order_idx ON public.pack_confirmations USING btree (merchant_id, order_id, fulfillment_id);
CREATE INDEX idx_partner_recovery_rules_active ON public.partner_recovery_rules USING btree (merchant_id, active);
CREATE INDEX idx_partner_recovery_rules_claim_type ON public.partner_recovery_rules USING btree (merchant_id, applies_to_claim_type);
CREATE INDEX idx_partner_recovery_rules_merchant ON public.partner_recovery_rules USING btree (merchant_id);
CREATE INDEX idx_partner_recovery_rules_partner ON public.partner_recovery_rules USING btree (partner_id) WHERE (partner_id IS NOT NULL);
CREATE INDEX idx_partner_recovery_rules_recovery_type ON public.partner_recovery_rules USING btree (merchant_id, recovery_type);
CREATE INDEX idx_partners_merchant ON public.partners USING btree (merchant_id);
CREATE INDEX idx_partners_partner_type ON public.partners USING btree (merchant_id, partner_type);
CREATE INDEX idx_partners_status ON public.partners USING btree (merchant_id, status);
CREATE INDEX pending_provider_account_selections_expiry_idx ON public.pending_provider_account_selections USING btree (expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX idx_processed_webhooks_age ON public.processed_webhooks USING btree (processed_at);
CREATE INDEX profile_view_tokens_active_idx ON public.profile_view_tokens USING btree (token_hash, expires_at);
CREATE INDEX profile_view_tokens_merchant_id_idx ON public.profile_view_tokens USING btree (merchant_id);
CREATE INDEX profile_view_tokens_profile_id_idx ON public.profile_view_tokens USING btree (profile_id);
CREATE INDEX idx_match_candidates_subject ON public.record_match_candidates USING btree (merchant_id, subject_entity_type, subject_entity_id, status);
CREATE INDEX record_match_candidates_open_idx ON public.record_match_candidates USING btree (merchant_id, created_at DESC) WHERE (status = 'open'::text);
CREATE INDEX idx_match_resolutions_subject ON public.record_match_resolutions USING btree (merchant_id, subject_entity_type, subject_entity_id);
CREATE INDEX idx_recovery_case_events_case ON public.recovery_case_events USING btree (recovery_case_id, created_at DESC);
CREATE INDEX idx_recovery_case_events_merchant ON public.recovery_case_events USING btree (merchant_id, created_at DESC);
CREATE UNIQUE INDEX recovery_case_events_idempotency_key ON public.recovery_case_events USING btree (merchant_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_recovery_cases_deadline ON public.recovery_cases USING btree (merchant_id, deadline_at) WHERE (deadline_at IS NOT NULL);
CREATE INDEX idx_recovery_cases_merchant ON public.recovery_cases USING btree (merchant_id);
CREATE INDEX idx_recovery_cases_next_chase ON public.recovery_cases USING btree (merchant_id, next_chase_at) WHERE (next_chase_at IS NOT NULL);
CREATE INDEX idx_recovery_cases_partner ON public.recovery_cases USING btree (partner_id) WHERE (partner_id IS NOT NULL);
CREATE INDEX idx_recovery_cases_recovery_type ON public.recovery_cases USING btree (merchant_id, recovery_type);
CREATE INDEX idx_recovery_cases_reporting_period ON public.recovery_cases USING btree (merchant_id, updated_at, currency, status);
CREATE INDEX idx_recovery_cases_status ON public.recovery_cases USING btree (merchant_id, status);
CREATE INDEX idx_recovery_cases_support_payout_case ON public.recovery_cases USING btree (support_payout_case_id);
CREATE INDEX recovery_cases_loss_idx ON public.recovery_cases USING btree (merchant_id, loss_case_id) WHERE (loss_case_id IS NOT NULL);
CREATE INDEX recovery_tasks_claim_idx ON public.recovery_tasks USING btree (claim_id);
CREATE INDEX recovery_tasks_merchant_status_idx ON public.recovery_tasks USING btree (merchant_id, status, due_at);
CREATE INDEX rule_evaluations_dedupe_key_evaluated ON public.rule_evaluations USING btree (merchant_id, dedupe_key, evaluated_at DESC) WHERE (dedupe_key IS NOT NULL);
CREATE INDEX rule_evaluations_identity ON public.rule_evaluations USING btree (identity_id);
CREATE INDEX rule_evaluations_merchant_claim ON public.rule_evaluations USING btree (merchant_id, claim_id);
CREATE INDEX rule_evaluations_source_ticket ON public.rule_evaluations USING btree (merchant_id, source_ticket_id) WHERE (source_ticket_id IS NOT NULL);
CREATE INDEX idx_source_accounts_connection ON public.source_accounts USING btree (connection_id) WHERE (connection_id IS NOT NULL);
CREATE INDEX idx_source_accounts_merchant ON public.source_accounts USING btree (merchant_id);
CREATE INDEX idx_source_addresses_customer ON public.source_addresses USING btree (source_customer_id);
CREATE INDEX idx_source_addresses_norm ON public.source_addresses USING btree (merchant_id, normalized_full);
CREATE INDEX idx_source_customers_email ON public.source_customers USING btree (merchant_id, lower(email));
CREATE INDEX idx_source_customers_link ON public.source_customers USING btree (merchant_id, linked_platform_customer_external_id) WHERE (linked_platform_customer_external_id IS NOT NULL);
CREATE INDEX idx_source_customers_merchant_customer ON public.source_customers USING btree (merchant_id, merchant_customer_id) WHERE (merchant_customer_id IS NOT NULL);
CREATE UNIQUE INDEX source_customers_connection_external_key ON public.source_customers USING btree (merchant_id, source, connection_id, external_id) NULLS NOT DISTINCT;
CREATE INDEX idx_source_disputes_merchant_external ON public.source_disputes USING btree (merchant_id, external_id);
CREATE UNIQUE INDEX source_disputes_order_external_key ON public.source_disputes USING btree (merchant_id, source_order_id, external_id) NULLS NOT DISTINCT;
CREATE INDEX idx_source_fulfillments_order ON public.source_fulfillments USING btree (source_order_id);
CREATE INDEX idx_source_locations_account ON public.source_locations USING btree (source_account_id);
CREATE INDEX idx_source_locations_merchant ON public.source_locations USING btree (merchant_id);
CREATE INDEX idx_source_messages_ticket ON public.source_messages USING btree (source_ticket_id, sent_at);
CREATE INDEX idx_source_order_lines_order ON public.source_order_lines USING btree (source_order_id);
CREATE INDEX idx_source_orders_customer ON public.source_orders USING btree (source_customer_id);
CREATE INDEX idx_source_orders_email ON public.source_orders USING btree (merchant_id, lower(email));
CREATE INDEX idx_source_orders_ip ON public.source_orders USING btree (browser_ip) WHERE (browser_ip IS NOT NULL);
CREATE INDEX idx_source_orders_job_id ON public.source_orders USING btree (job_id) WHERE (job_id IS NOT NULL);
CREATE INDEX idx_source_orders_merchant_customer ON public.source_orders USING btree (merchant_id, merchant_customer_id, placed_at DESC) WHERE (merchant_customer_id IS NOT NULL);
CREATE INDEX idx_source_orders_placed ON public.source_orders USING btree (merchant_id, placed_at DESC);
CREATE UNIQUE INDEX source_orders_account_external_key ON public.source_orders USING btree (merchant_id, source, connection_id, source_account_id, external_id) NULLS NOT DISTINCT;
CREATE INDEX source_orders_source_account_idx ON public.source_orders USING btree (merchant_id, source_account_id) WHERE (source_account_id IS NOT NULL);
CREATE INDEX idx_source_payments_order ON public.source_payments USING btree (source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_source_records_account ON public.source_records USING btree (source_account_id) WHERE (source_account_id IS NOT NULL);
CREATE INDEX idx_source_records_canonical ON public.source_records USING btree (merchant_id, canonical_entity_type, canonical_entity_id);
CREATE INDEX idx_source_records_lookup ON public.source_records USING btree (merchant_id, source_entity_type, external_id);
CREATE INDEX idx_source_records_merchant ON public.source_records USING btree (merchant_id);
CREATE INDEX source_records_external_lookup_idx ON public.source_records USING btree (merchant_id, source_system, source_entity_type, external_id);
CREATE INDEX idx_source_refunds_merchant_external ON public.source_refunds USING btree (merchant_id, external_id);
CREATE INDEX idx_source_refunds_order ON public.source_refunds USING btree (source_order_id);
CREATE INDEX idx_source_replacements_order ON public.source_replacements USING btree (source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_source_returns_merchant_external ON public.source_returns USING btree (merchant_id, external_id);
CREATE INDEX idx_source_returns_order ON public.source_returns USING btree (source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_source_shipments_order ON public.source_shipments USING btree (source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_source_shipments_tracking ON public.source_shipments USING btree (merchant_id, tracking_number) WHERE (tracking_number IS NOT NULL);
CREATE INDEX idx_ticket_events_ticket ON public.source_ticket_events USING btree (source_ticket_id, occurred_at);
CREATE UNIQUE INDEX source_ticket_events_idempotency_key ON public.source_ticket_events USING btree (event_idempotency_key) WHERE (event_idempotency_key IS NOT NULL);
CREATE INDEX idx_source_tickets_customer ON public.source_tickets USING btree (source_customer_id);
CREATE INDEX idx_source_tickets_merchant ON public.source_tickets USING btree (merchant_id, created_at_provider DESC);
CREATE INDEX idx_source_tickets_merchant_customer ON public.source_tickets USING btree (merchant_id, merchant_customer_id, created_at_provider DESC) WHERE (merchant_customer_id IS NOT NULL);
CREATE INDEX idx_source_tickets_merchant_external ON public.source_tickets USING btree (merchant_id, external_id);
CREATE INDEX idx_source_tracking_events_shipment ON public.source_tracking_events USING btree (source_shipment_id, event_at);
CREATE INDEX idx_source_transactions_order ON public.source_transactions USING btree (source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_store_connections_merchant ON public.store_connections USING btree (merchant_id, platform);
CREATE UNIQUE INDEX store_connections_global_account_owner_key ON public.store_connections USING btree (platform, store_key);
CREATE UNIQUE INDEX store_connections_one_active_provider_key ON public.store_connections USING btree (merchant_id, platform) WHERE ((status = 'active'::public.connection_status) AND (uninstalled_at IS NULL));
CREATE INDEX store_connections_verification_idx ON public.store_connections USING btree (status, last_verified_at);
CREATE INDEX support_case_events_merchant_case_idx ON public.support_case_events USING btree (merchant_id, support_case_id);
CREATE INDEX support_case_events_merchant_provider_type_idx ON public.support_case_events USING btree (merchant_id, provider, event_type);
CREATE INDEX support_case_events_occurred_at_provider_idx ON public.support_case_events USING btree (occurred_at_provider);
CREATE INDEX support_case_intake_created_at_provider_idx ON public.support_case_intake USING btree (created_at_provider);
CREATE INDEX support_case_intake_merchant_case_status_idx ON public.support_case_intake USING btree (merchant_id, case_status);
CREATE INDEX support_case_intake_merchant_claim_idx ON public.support_case_intake USING btree (merchant_id, merchant_claim_id);
CREATE INDEX support_case_intake_merchant_claim_type_idx ON public.support_case_intake USING btree (merchant_id, claim_type);
CREATE INDEX support_case_intake_merchant_customer_profile_idx ON public.support_case_intake USING btree (merchant_id, customer_profile_id);
CREATE INDEX support_case_intake_merchant_is_claim_idx ON public.support_case_intake USING btree (merchant_id, is_claim);
CREATE INDEX support_case_intake_merchant_link_status_idx ON public.support_case_intake USING btree (merchant_id, link_status);
CREATE INDEX support_case_intake_merchant_order_ref_idx ON public.support_case_intake USING btree (merchant_id, order_ref);
CREATE INDEX support_case_intake_merchant_provider_idx ON public.support_case_intake USING btree (merchant_id, provider);
CREATE INDEX support_case_intake_merchant_shop_domain_idx ON public.support_case_intake USING btree (merchant_id, shop_domain);
CREATE INDEX support_case_intake_merchant_shopify_order_idx ON public.support_case_intake USING btree (merchant_id, shopify_order_id);
CREATE INDEX support_case_intake_updated_at_provider_idx ON public.support_case_intake USING btree (updated_at_provider);
CREATE INDEX idx_support_cases_merchant_customer ON public.support_payout_cases USING btree (merchant_id, merchant_customer_id, submitted_at DESC) WHERE (merchant_customer_id IS NOT NULL);
CREATE INDEX idx_support_payout_cases_identity ON public.support_payout_cases USING btree (identity_id) WHERE (identity_id IS NOT NULL);
CREATE INDEX idx_support_payout_cases_loss_attribution ON public.support_payout_cases USING btree (merchant_id, loss_attribution) WHERE (loss_attribution IS NOT NULL);
CREATE INDEX idx_support_payout_cases_merchant_status ON public.support_payout_cases USING btree (merchant_id, status);
CREATE INDEX idx_support_payout_cases_merchant_submitted ON public.support_payout_cases USING btree (merchant_id, submitted_at DESC);
CREATE INDEX idx_support_payout_cases_next_action ON public.support_payout_cases USING btree (merchant_id, next_action) WHERE (next_action IS NOT NULL);
CREATE INDEX idx_support_payout_cases_order ON public.support_payout_cases USING btree (merchant_id, source_order_id) WHERE (source_order_id IS NOT NULL);
CREATE INDEX idx_support_payout_cases_payout_decision_state ON public.support_payout_cases USING btree (merchant_id, payout_decision_state);
CREATE INDEX idx_support_payout_cases_recoverability ON public.support_payout_cases USING btree (merchant_id, recoverability) WHERE (recoverability IS NOT NULL);
CREATE INDEX idx_support_payout_cases_recovery_state ON public.support_payout_cases USING btree (merchant_id, recovery_state);
CREATE INDEX idx_support_payout_cases_reporting_period ON public.support_payout_cases USING btree (merchant_id, submitted_at, currency, status);
CREATE INDEX idx_support_payout_cases_reporting_reason ON public.support_payout_cases USING btree (merchant_id, reason_normalized, submitted_at);
CREATE INDEX idx_support_payout_cases_requested_action ON public.support_payout_cases USING btree (merchant_id, requested_action);
CREATE INDEX support_provider_connections_merchant_provider_idx ON public.support_provider_connections USING btree (merchant_id, provider);
CREATE INDEX support_provider_connections_status_idx ON public.support_provider_connections USING btree (status);
CREATE INDEX idx_sync_job_chunks_pending ON public.sync_job_chunks USING btree (job_id) WHERE (status = 'pending'::public.sync_job_status);
CREATE INDEX idx_sync_jobs_dedupe ON public.sync_jobs USING btree (merchant_id, file_hash) WHERE (file_hash IS NOT NULL);
CREATE INDEX idx_sync_jobs_merchant ON public.sync_jobs USING btree (merchant_id, created_at DESC) WHERE (NOT hidden);
CREATE UNIQUE INDEX sync_jobs_active_connector_job_unique ON public.sync_jobs USING btree (merchant_id, connection_id) WHERE ((status = ANY (ARRAY['pending'::public.sync_job_status, 'running'::public.sync_job_status])) AND (job_kind = ANY (ARRAY['initial_import'::text, 'incremental_sync'::text])) AND (connection_id IS NOT NULL));
CREATE INDEX idx_unmatched_correspondence_merchant ON public.unmatched_correspondence USING btree (merchant_id, created_at DESC);
CREATE INDEX idx_user_action_log_merchant ON public.user_action_log USING btree (merchant_id, created_at DESC);
CREATE INDEX idx_user_permission_grants_lookup ON public.user_permission_grants USING btree (merchant_id, grantee_user_id) WHERE (NOT revoked);
CREATE INDEX webhook_logs_provider_created_idx ON public.webhook_logs USING btree (provider, created_at DESC);
CREATE INDEX webhook_logs_status_created_idx ON public.webhook_logs USING btree (status, created_at DESC);
CREATE UNIQUE INDEX work_tasks_migration_key_unique ON public.work_tasks USING btree (merchant_id, ((source_metadata ->> 'migration_key'::text))) WHERE ((source_metadata ->> 'migration_key'::text) IS NOT NULL);
CREATE INDEX work_tasks_owner_queue_idx ON public.work_tasks USING btree (merchant_id, owner_user_id, status, due_at) WHERE (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'blocked'::text]));
CREATE INDEX work_tasks_queue_idx ON public.work_tasks USING btree (merchant_id, status, due_at);
CREATE INDEX idx_workflow_definitions_family ON public.workflow_definitions USING btree (merchant_id, name, version DESC);
CREATE UNIQUE INDEX idx_workflow_one_published ON public.workflow_definitions USING btree (merchant_id, name) WHERE (status = 'published'::text);
CREATE INDEX workflow_definitions_trigger_idx ON public.workflow_definitions USING btree (merchant_id, trigger_event_type) WHERE active;
CREATE UNIQUE INDEX idx_workflow_run_idempotency ON public.workflow_runs USING btree (workflow_definition_id, domain_event_id);
CREATE INDEX workflow_runs_merchant_idx ON public.workflow_runs USING btree (merchant_id, started_at DESC);

-- ============ views / matviews (exact pg_get_viewdef) ============
create view public."commerce_store_connections" as
 SELECT id,
    merchant_id,
    platform::text AS platform,
    store_key,
    COALESCE(store_url, ''::text) AS store_url,
    status::text AS status,
    credentials_encrypted,
    uninstalled_at,
    last_sync_at,
    last_error,
    created_at,
    updated_at
   FROM public.store_connections
  WHERE platform::text = ANY (ARRAY['woocommerce'::text, 'bigcommerce'::text]);
create view public."reporting_case_dimensions" as
 SELECT c.merchant_id,
    c.id AS support_payout_case_id,
    COALESCE(c.submitted_at, c.created_at) AS period_at,
    c.currency,
    c.status,
    c.claim_type,
    c.reason_normalized,
    c.loss_attribution,
    c.recovery_owner,
    f.requested_minor,
    f.paid_minor,
    f.prevented_minor,
    f.confirmed_loss_minor,
    f.recoverable_minor,
    f.recovered_minor,
    f.written_off_minor,
    f.updated_at AS financial_updated_at
   FROM public.support_payout_cases c
     LEFT JOIN public.case_financial_summaries f ON f.merchant_id = c.merchant_id AND f.support_payout_case_id = c.id;

-- ============ functions (exact pg_get_functiondef; secret-scan HIGH-clean) ============
CREATE OR REPLACE FUNCTION public.add_merchant_topup_credits(p_merchant_id uuid, p_credits integer, p_amount_gbp numeric, p_stripe_payment_intent_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing UUID;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be positive';
  END IF;

  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM credit_topup_log
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
  SELECT p_merchant_id, 100, 0, date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
  WHERE NOT EXISTS (SELECT 1 FROM merchant_credits WHERE merchant_id = p_merchant_id);

  UPDATE merchant_credits
  SET
    topup_credits_remaining = topup_credits_remaining + p_credits,
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  INSERT INTO credit_topup_log (merchant_id, credits_added, amount_gbp, stripe_payment_intent_id)
  VALUES (p_merchant_id, p_credits, p_amount_gbp, p_stripe_payment_intent_id);

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$function$;
CREATE OR REPLACE FUNCTION public.all_processing_job_chunks_complete(p_job_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.sync_job_chunks
    WHERE job_id = p_job_id AND status <> 'completed'::sync_job_status
  )
  AND EXISTS (
    SELECT 1 FROM public.sync_job_chunks WHERE job_id = p_job_id
  );
$function$;
CREATE OR REPLACE FUNCTION public.archive_merchant_rule(p_merchant_id uuid, p_actor_id uuid, p_rule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  archived_id uuid;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  update public.merchant_rules
  set is_active = false, archived_at = now(), updated_at = now()
  where id = p_rule_id and merchant_id = p_merchant_id and archived_at is null
  returning id into archived_id;

  if archived_id is null then
    raise exception 'rule_not_found';
  end if;

  update public.merchant_rule_versions
  set status = case
    when status = 'draft' then 'discarded'
    when status = 'published' then 'retired'
    else status
  end
  where merchant_id = p_merchant_id
    and merchant_rule_id = p_rule_id
    and status in ('draft', 'published');

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rule.archived', 'merchant_rule', p_rule_id,
    'user', p_actor_id,
    'rule-archived:' || p_rule_id::text,
    now(),
    jsonb_build_object('rule_id', p_rule_id)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object('rule_id', archived_id, 'archived', true);
end;
$function$;
CREATE OR REPLACE FUNCTION public.audit_claim_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status is distinct from old.status then
    insert into claim_events (claim_id, merchant_id, event_type, from_status, to_status, metadata)
    values (new.id, new.merchant_id, 'status_changed', old.status, new.status,
            jsonb_build_object('source', 'db_trigger'));
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.begin_processing_job_chunk(p_job_id uuid, p_chunk_index integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status sync_job_status;
BEGIN
  SELECT status INTO v_status
  FROM public.sync_job_chunks
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF v_status = 'completed' THEN
    RETURN 'completed';
  END IF;

  UPDATE public.sync_job_chunks
  SET status = 'running'::sync_job_status,
      claimed_at = COALESCE(claimed_at, now())
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;

  RETURN 'processing';
END;
$function$;
CREATE OR REPLACE FUNCTION public.bulk_transition_work_tasks(p_merchant_id uuid, p_user_id uuid, p_task_ids uuid[], p_action text, p_until timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS SETOF public.work_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_task public.work_tasks%rowtype;
begin
  if coalesce(array_length(p_task_ids, 1), 0) = 0 or array_length(p_task_ids, 1) > 100 then
    raise exception 'task_ids_must_contain_1_to_100_items';
  end if;
  if p_action not in ('assign_to_me','start','complete','snooze') then
    raise exception 'unsupported_work_task_action';
  end if;
  if p_action = 'snooze' and (p_until is null or p_until <= v_now) then
    raise exception 'snooze_time_must_be_future';
  end if;
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id and user_id = p_user_id and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;
  if (select count(*) from public.work_tasks where merchant_id = p_merchant_id and id = any(p_task_ids)) <> array_length(p_task_ids, 1) then
    raise exception 'work_task_scope_mismatch';
  end if;

  for v_task in
    select * from public.work_tasks
    where merchant_id = p_merchant_id and id = any(p_task_ids)
    order by id for update
  loop
    if p_action = 'start' and v_task.status not in ('open','blocked') then
      raise exception 'task_not_startable:%', v_task.id;
    end if;
    if p_action = 'complete' and v_task.status in ('completed','cancelled') then
      raise exception 'task_already_closed:%', v_task.id;
    end if;

    update public.work_tasks set
      owner_user_id = case when p_action in ('assign_to_me','start') then coalesce(owner_user_id, p_user_id) else owner_user_id end,
      status = case when p_action = 'start' then 'in_progress' when p_action = 'complete' then 'completed' when p_action = 'snooze' then 'open' else status end,
      blocking_reason = case when p_action = 'start' then null else blocking_reason end,
      due_at = case when p_action = 'snooze' then p_until else due_at end,
      completed_at = case when p_action = 'complete' then v_now else completed_at end,
      completed_by = case when p_action = 'complete' then p_user_id else completed_by end,
      completion_outcome = case when p_action = 'complete' then jsonb_build_object('note','Bulk completion from Work') else completion_outcome end,
      updated_at = v_now
    where id = v_task.id;

    insert into public.domain_events (
      merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
      idempotency_key, occurred_at, payload
    ) values (
      p_merchant_id, 'work_task.' || p_action, 'work_task', v_task.id, 'user', p_user_id,
      'work-task-bulk:' || v_task.id::text || ':' || p_action || ':' || v_now::text,
      v_now,
      jsonb_build_object('task_id',v_task.id,'from_status',v_task.status,'bulk',true)
    );
  end loop;

  return query select * from public.work_tasks where merchant_id = p_merchant_id and id = any(p_task_ids) order by due_at nulls last, id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_domain_event_deliveries(p_handler_name text, p_limit integer DEFAULT 20, p_worker_id text DEFAULT 'worker'::text, p_lease_seconds integer DEFAULT 60)
 RETURNS SETOF public.domain_event_deliveries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with claimed as (
    select d.id from public.domain_event_deliveries d
     where d.handler_name = p_handler_name
       and d.status in ('pending','failed')
       and d.next_attempt_at <= now()
     order by d.next_attempt_at
     for update skip locked
     limit greatest(p_limit, 1)
  )
  update public.domain_event_deliveries d
     set status = 'processing',
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempts = d.attempts + 1
    from claimed
   where d.id = claimed.id
  returning d.*;
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_ingestion_event(p_event_id uuid, p_worker_id text, p_lease_seconds integer DEFAULT 60)
 RETURNS public.ingestion_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.ingestion_events;
begin
  select * into v_row from public.ingestion_events
   where id = p_event_id
     and status in ('pending','failed')
     and next_attempt_at <= now()
   for update skip locked;
  if not found then
    return null;
  end if;
  update public.ingestion_events
     set status = 'processing',
         leased_by = p_worker_id,
         leased_until = now() + make_interval(secs => p_lease_seconds),
         attempts = attempts + 1
   where id = v_row.id
  returning * into v_row;
  return v_row;
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_processed_webhook(p_key text, p_provider text, p_store_key text, p_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rows integer;
begin
  insert into public.processed_webhooks
    (idempotency_key, provider, store_key, topic, status, attempts, last_error, updated_at)
  values
    (p_key, p_provider, p_store_key, p_topic, 'processing', 1, null, now())
  on conflict (idempotency_key) do update
    set attempts = public.processed_webhooks.attempts + 1,
        status = 'processing',
        last_error = null,
        updated_at = now()
    where public.processed_webhooks.status <> 'completed';

  get diagnostics v_rows = row_count;
  -- row_count = 1 when inserted or (re)claimed; 0 when the conflict target was an
  -- already-completed row (the WHERE excluded the update) => duplicate.
  return v_rows = 0;
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_sync_job(p_limit integer DEFAULT 5, p_worker text DEFAULT 'worker'::text, p_lease_seconds integer DEFAULT 300)
 RETURNS SETOF public.sync_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with claimed as (
    select j.id
      from public.sync_jobs j
     where j.job_kind in ('initial_import', 'incremental_sync')
       and (
         (j.status in ('pending', 'failed')
          and (j.next_attempt_at is null or j.next_attempt_at <= now()))
         or (j.status = 'running'
          and j.started_at is not null
          and j.started_at < now() - make_interval(secs => p_lease_seconds))
       )
     order by j.next_attempt_at nulls first
     for update skip locked
     limit greatest(p_limit, 1)
  )
  update public.sync_jobs j
     set status = 'running',
         started_at = now(),
         last_error_code = null,
         updated_at = now()
    from claimed
   where j.id = claimed.id
  returning j.*;
end;
$function$;
CREATE OR REPLACE FUNCTION public.complete_domain_event_delivery(p_delivery_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.domain_event_deliveries
     set status = 'completed', completed_at = now(), last_error = null,
         leased_by = null, leased_until = null
   where id = p_delivery_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.complete_processing_job_chunk(p_job_id uuid, p_chunk_index integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.sync_job_chunks
  SET status = 'completed'::sync_job_status,
      completed_at = now(),
      last_error = NULL
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$function$;
CREATE OR REPLACE FUNCTION public.consume_context_credits_if_available(p_merchant_id uuid, p_user_id uuid, p_plan_tier text, p_context_type text, p_credits_to_spend integer, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_monthly_allowance integer, p_claim_id uuid DEFAULT NULL::uuid, p_ticket_ref text DEFAULT NULL::text, p_order_ref text DEFAULT NULL::text, p_customer_ref text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_allow_soft_cap boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_monthly INTEGER;
  v_topup INTEGER;
  v_total INTEGER;
  v_soft_cap BOOLEAN;
  v_deduct JSONB;
  v_used INTEGER;
  v_allowance INTEGER;
BEGIN
  IF p_credits_to_spend < 0 THEN
    RAISE EXCEPTION 'p_credits_to_spend must be non-negative';
  END IF;

  IF p_monthly_allowance IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'allowance_required',
      'used', 0,
      'remaining', 0,
      'credits_required', p_credits_to_spend
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  SELECT monthly_credits_remaining, topup_credits_remaining
    INTO v_monthly, v_topup
  FROM merchant_credits
  WHERE merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
    VALUES (p_merchant_id, p_monthly_allowance, 0, p_period_end)
    RETURNING monthly_credits_remaining, topup_credits_remaining INTO v_monthly, v_topup;
  END IF;

  v_total := v_monthly + v_topup;
  v_allowance := p_monthly_allowance;

  v_soft_cap := COALESCE(p_allow_soft_cap, FALSE)
    AND p_context_type = 'basic_context'
    AND p_credits_to_spend = 1
    AND v_total = 0;

  IF NOT v_soft_cap AND p_credits_to_spend > v_total THEN
    v_used := v_allowance - v_monthly;
    RETURN jsonb_build_object(
      'ok', false,
      'used', GREATEST(v_used, 0),
      'remaining', v_total,
      'credits_required', p_credits_to_spend
    );
  END IF;

  IF NOT v_soft_cap THEN
    v_deduct := deduct_merchant_credits(p_merchant_id, p_credits_to_spend);
    IF NOT (v_deduct->>'ok')::BOOLEAN THEN
      RETURN jsonb_build_object(
        'ok', false,
        'used', v_allowance - v_monthly,
        'remaining', v_total,
        'credits_required', p_credits_to_spend
      );
    END IF;
    SELECT monthly_credits_remaining, topup_credits_remaining
      INTO v_monthly, v_topup
    FROM merchant_credits
    WHERE merchant_id = p_merchant_id;
  END IF;

  INSERT INTO context_credit_events (
    merchant_id,
    user_id,
    plan_tier,
    context_type,
    credits_spent,
    claim_id,
    ticket_ref,
    order_ref,
    customer_ref,
    reason,
    metadata
  ) VALUES (
    p_merchant_id,
    p_user_id,
    p_plan_tier,
    p_context_type,
    CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    p_claim_id,
    p_ticket_ref,
    p_order_ref,
    p_customer_ref,
    p_reason,
    CASE
      WHEN v_soft_cap THEN COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('soft_cap_exhausted', true)
      ELSE COALESCE(p_metadata, '{}'::jsonb)
    END
  );

  v_used := v_allowance - v_monthly;

  RETURN jsonb_build_object(
    'ok', true,
    'used', GREATEST(v_used, 0),
    'remaining', v_monthly + v_topup,
    'monthly_remaining', v_monthly,
    'topup_remaining', v_topup,
    'credits_spent', CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    'soft_cap', v_soft_cap
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.create_merchant_rule_draft(p_merchant_id uuid, p_actor_id uuid, p_name text, p_description text, p_conditions jsonb, p_action text, p_condition_operator text, p_priority integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.create_merchant_rule_draft_pack(p_merchant_id uuid, p_actor_id uuid, p_rules jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.deduct_merchant_credits(p_merchant_id uuid, p_credits integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_monthly INTEGER;
  v_topup INTEGER;
  v_from_topup INTEGER;
  v_from_monthly INTEGER;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be positive';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  SELECT monthly_credits_remaining, topup_credits_remaining
    INTO v_monthly, v_topup
  FROM merchant_credits
  WHERE merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'credits_not_found');
  END IF;

  IF (v_topup + v_monthly) < p_credits THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'insufficient_credits',
      'monthly_remaining', v_monthly,
      'topup_remaining', v_topup
    );
  END IF;

  v_from_topup := LEAST(v_topup, p_credits);
  v_from_monthly := p_credits - v_from_topup;

  UPDATE merchant_credits
  SET
    topup_credits_remaining = topup_credits_remaining - v_from_topup,
    monthly_credits_remaining = monthly_credits_remaining - v_from_monthly,
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'from_topup', v_from_topup,
    'from_monthly', v_from_monthly,
    'monthly_remaining', v_monthly - v_from_monthly,
    'topup_remaining', v_topup - v_from_topup
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.discard_merchant_rule_draft(p_merchant_id uuid, p_actor_id uuid, p_rule_id uuid, p_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  discarded public.merchant_rule_versions%rowtype;
  archived_rule boolean := false;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  update public.merchant_rule_versions
  set status = 'discarded'
  where id = p_version_id
    and merchant_rule_id = p_rule_id
    and merchant_id = p_merchant_id
    and status = 'draft'
  returning * into discarded;

  if discarded.id is null then
    raise exception 'editable_draft_not_found';
  end if;

  if not exists (
    select 1 from public.merchant_rule_versions
    where merchant_id = p_merchant_id
      and merchant_rule_id = p_rule_id
      and status = 'published'
  ) then
    update public.merchant_rules
    set is_active = false, archived_at = now(), updated_at = now()
    where id = p_rule_id and merchant_id = p_merchant_id and archived_at is null;
    archived_rule := found;
  end if;

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rule.draft_discarded', 'merchant_rule', p_rule_id,
    'user', p_actor_id,
    'rule-draft-discarded:' || p_version_id::text,
    now(),
    jsonb_build_object('version_id', p_version_id, 'rule_archived', archived_rule)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'version_id', discarded.id,
    'status', discarded.status,
    'rule_archived', archived_rule
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.enforce_recovery_case_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not new.prevention_only and new.loss_case_id is null then
    raise exception 'recovery case requires a canonical loss case';
  end if;
  if new.loss_case_id is not null and not exists (
    select 1 from public.loss_cases l
    where l.id = new.loss_case_id and l.merchant_id = new.merchant_id
  ) then
    raise exception 'recovery case loss must belong to the same merchant';
  end if;
  if new.eligible_loss_amount is not null and new.eligible_loss_amount > new.merchant_loss_amount then
    raise exception 'eligible recovery cannot exceed merchant loss';
  end if;
  if new.estimated_recoverable_min is not null and new.estimated_recoverable_max is not null
     and new.estimated_recoverable_min > new.estimated_recoverable_max then
    raise exception 'minimum recovery estimate cannot exceed maximum';
  end if;
  if new.estimated_recoverable_max is not null
     and new.estimated_recoverable_max > coalesce(new.eligible_loss_amount, new.merchant_loss_amount) then
    raise exception 'recovery estimate cannot exceed eligible loss';
  end if;
  if new.amount_recovered is not null and new.amount_recovered > new.merchant_loss_amount then
    raise exception 'recovered amount cannot exceed merchant loss';
  end if;
  return new;
end
$function$;
CREATE OR REPLACE FUNCTION public.fail_domain_event_delivery(p_delivery_id uuid, p_error text, p_backoff_seconds integer DEFAULT 30)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_attempts integer; v_max integer;
begin
  select attempts, max_attempts into v_attempts, v_max
    from public.domain_event_deliveries where id = p_delivery_id;
  update public.domain_event_deliveries
     set status = case when v_attempts >= v_max then 'dead_letter' else 'failed' end,
         last_error = p_error,
         next_attempt_at = now() + make_interval(secs => p_backoff_seconds),
         leased_by = null, leased_until = null
   where id = p_delivery_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.fail_processing_job_chunk(p_job_id uuid, p_chunk_index integer, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.sync_job_chunks
  SET status = 'failed'::sync_job_status,
      last_error = p_error,
      completed_at = now()
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_domain_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_domain_event_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'domain_events is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_financial_entry_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_financial_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception 'case_financial_entries is append-only (% not allowed)', tg_op;
end;
$function$;
CREATE OR REPLACE FUNCTION public.forbid_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name;
end $function$;
CREATE OR REPLACE FUNCTION public.forbid_phase7_history_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_history_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end $function$;
CREATE OR REPLACE FUNCTION public.generate_evidence_reference()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  today text := to_char(now(), 'YYYYMMDD');
  seq_val bigint;
BEGIN
  seq_val := nextval('public.evidence_package_daily_seq');
  RETURN 'UNAUTH-' || today || '-' || lpad(seq_val::text, 6, '0');
END;
$function$;
CREATE OR REPLACE FUNCTION public.increment_api_key_minute_count(p_key_id uuid, p_window_minute bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count int;
BEGIN
  INSERT INTO api_key_minute_counts (api_key_id, window_minute, count)
  VALUES (p_key_id, p_window_minute, 1)
  ON CONFLICT (api_key_id, window_minute)
  DO UPDATE SET count = api_key_minute_counts.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$function$;
CREATE OR REPLACE FUNCTION public.increment_job_progress(p_job_id uuid, p_processed_delta integer, p_failed_delta integer DEFAULT 0)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'v2', 'public'
AS $function$
  update sync_jobs
  set processed_rows = processed_rows + p_processed_delta,
      failed_rows = failed_rows + p_failed_delta
  where id = p_job_id;
$function$;
CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_ip_hash text, p_window_start timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.ingest_rate_limits (ip_hash, window_start, request_count)
  VALUES (p_ip_hash, p_window_start, 1)
  ON CONFLICT (ip_hash, window_start)
  DO UPDATE SET request_count = public.ingest_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$function$;
CREATE OR REPLACE FUNCTION public.ingest_identity_observations(p_merchant_id uuid, p_signals jsonb, p_edges jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'v2', 'public'
AS $function$
begin
  insert into identity_signals
    (merchant_id, identifier_type, identifier_hash, source,
     source_order_id, source_customer_id, source_ticket_id, observed_at)
  select p_merchant_id,
         (s->>'identifier_type')::identifier_type,
         s->>'identifier_hash',
         (s->>'source')::signal_source,
         nullif(s->>'source_order_id','')::uuid,
         nullif(s->>'source_customer_id','')::uuid,
         nullif(s->>'source_ticket_id','')::uuid,
         coalesce(nullif(s->>'observed_at','')::timestamptz, now())
  from jsonb_array_elements(p_signals) s
  where coalesce(s->>'identifier_hash','') <> ''
  on conflict do nothing;

  insert into identity_edges
    (merchant_id, left_type, left_hash, right_type, right_hash, seen_count, source)
  select p_merchant_id,
         (e->>'left_type')::identifier_type, e->>'left_hash',
         (e->>'right_type')::identifier_type, e->>'right_hash',
         greatest(coalesce((e->>'count_delta')::int,1),1),
         coalesce((e->>'source')::signal_source,'manual')
  from jsonb_array_elements(p_edges) e
  where ((e->>'left_type'), e->>'left_hash') < ((e->>'right_type'), e->>'right_hash')
  on conflict (merchant_id, left_type, left_hash, right_type, right_hash)
  do update set seen_count = identity_edges.seen_count + excluded.seen_count,
                last_seen_at = now();
end $function$;
CREATE OR REPLACE FUNCTION public.is_merchant_member(p_merchant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'v2', 'public'
AS $function$
  select exists (
    select 1 from merchant_users mu
    where mu.merchant_id = p_merchant_id
      and mu.user_id = auth.uid()
      and mu.invite_status = 'active'
  );
$function$;
CREATE OR REPLACE FUNCTION public.lookup_network_identity(p_merchant_id uuid, p_identifier_hashes jsonb, p_request_ip inet DEFAULT NULL::inet)
 RETURNS TABLE(identity_id uuid, confidence_grade public.confidence_grade, confidence_score numeric, merchant_count integer, total_orders integer, total_claims integer, total_chargebacks integer, claim_rate numeric, fastest_claim_days numeric, claim_type_counts jsonb, first_seen_at timestamp with time zone, last_seen_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'v2', 'public'
AS $function$
declare
  v_ids uuid[];
  v_k_ok boolean;
begin
  select array_agg(distinct im.identity_id) into v_ids
  from jsonb_array_elements(p_identifier_hashes) q
  join identity_members im
    on im.identifier_type = (q->>'type')::identifier_type
   and im.identifier_hash = q->>'hash';

  -- k-anonymity: only disclose identities seen at >= 3 distinct merchants,
  -- OR identities the querying merchant has its own signals for.
  return query
  select i.id, i.confidence_grade, i.confidence_score, i.merchant_count,
         p.total_orders, p.total_claims, p.total_chargebacks, p.claim_rate,
         p.fastest_claim_days, p.claim_type_counts, p.first_seen_at, p.last_seen_at
  from identities i
  join identity_profiles p on p.identity_id = i.id
  where i.id = any(coalesce(v_ids,'{}')) and i.superseded_by is null
    and (i.merchant_count >= 3
         or exists (select 1 from identity_members im2
                    join identity_signals s
                      on s.identifier_type = im2.identifier_type
                     and s.identifier_hash = im2.identifier_hash
                    where im2.identity_id = i.id and s.merchant_id = p_merchant_id));

  select bool_and(i.merchant_count >= 3) into v_k_ok
  from identities i where i.id = any(coalesce(v_ids,'{}'));

  insert into network_access_log
    (merchant_id, queried_hashes, matched_identity_count, k_anonymity_satisfied, request_ip)
  select p_merchant_id,
         coalesce(array(select q->>'hash' from jsonb_array_elements(p_identifier_hashes) q),'{}'),
         coalesce(array_length(v_ids,1),0),
         coalesce(v_k_ok, true),
         p_request_ip;
end $function$;
CREATE OR REPLACE FUNCTION public.merchant_role(p_merchant_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role::text from merchant_users
  where merchant_id = p_merchant_id and user_id = auth.uid() and invite_status = 'active'
  limit 1;
$function$;
CREATE OR REPLACE FUNCTION public.next_pending_processing_chunk_index(p_job_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT chunk_index
  FROM public.sync_job_chunks
  WHERE job_id = p_job_id AND status = 'pending'::sync_job_status
  ORDER BY chunk_index ASC
  LIMIT 1;
$function$;
CREATE OR REPLACE FUNCTION public.protect_published_rule_version_payload()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.protect_published_workflow_payload()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.publish_merchant_rule_version(p_merchant_id uuid, p_rule_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.publish_workflow_definition(p_merchant_id uuid, p_workflow_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.purge_merchant_source_agnostic(p_merchant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.record_domain_event(p_merchant_id uuid, p_event_type text, p_aggregate_type text, p_aggregate_id uuid, p_idempotency_key text, p_payload jsonb DEFAULT '{}'::jsonb, p_source_record_id uuid DEFAULT NULL::uuid, p_connection_id uuid DEFAULT NULL::uuid, p_ingestion_event_id uuid DEFAULT NULL::uuid, p_actor_type text DEFAULT 'system'::text, p_actor_id uuid DEFAULT NULL::uuid, p_occurred_at timestamp with time zone DEFAULT now(), p_correlation_id uuid DEFAULT NULL::uuid, p_causation_id uuid DEFAULT NULL::uuid, p_handlers text[] DEFAULT '{}'::text[])
 RETURNS public.domain_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.domain_events;
  v_handler text;
begin
  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, idempotency_key,
    payload, source_record_id, connection_id, ingestion_event_id,
    actor_type, actor_id, occurred_at, correlation_id, causation_id
  ) values (
    p_merchant_id, p_event_type, p_aggregate_type, p_aggregate_id, p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb), p_source_record_id, p_connection_id, p_ingestion_event_id,
    p_actor_type, p_actor_id, coalesce(p_occurred_at, now()), p_correlation_id, p_causation_id
  )
  on conflict (merchant_id, idempotency_key) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- idempotent replay: return the existing row, register no new deliveries
    select * into v_row from public.domain_events
     where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
    return v_row;
  end if;

  foreach v_handler in array coalesce(p_handlers, '{}') loop
    insert into public.domain_event_deliveries (domain_event_id, merchant_id, handler_name)
    values (v_row.id, p_merchant_id, v_handler)
    on conflict (domain_event_id, handler_name) do nothing;
  end loop;

  return v_row;
end;
$function$;
CREATE OR REPLACE FUNCTION public.refresh_audit_customer_summaries(p_audit_id uuid, p_merchant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rows_written integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.sync_jobs
    WHERE id = p_audit_id
      AND merchant_id = p_merchant_id
  ) THEN
    RAISE EXCEPTION 'Audit % is not owned by merchant %', p_audit_id, p_merchant_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.audit_customer_summaries
  WHERE audit_id = p_audit_id
    AND merchant_id = p_merchant_id;

  WITH inserted AS (
    INSERT INTO public.audit_customer_summaries (
      audit_id,
      merchant_id,
      customer_key,
      customer_email,
      customer_name,
      order_count,
      total_spend,
      max_score,
      first_seen,
      last_seen,
      highest_grade,
      updated_at
    )
    SELECT
      p_audit_id,
      p_merchant_id,
      COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), NULLIF(LOWER(TRIM(email)), ''), 'unknown customer') AS customer_key,
      MIN(NULLIF(COALESCE(customer_email, email), '')) AS customer_email,
      MIN(NULLIF(customer_name, '')) AS customer_name,
      COUNT(*)::integer AS order_count,
      COALESCE(SUM(COALESCE(order_value, total_price, 0)), 0) AS total_spend,
      COALESCE(MAX(identity_score), 0) AS max_score,
      MIN(COALESCE(processed_at, placed_at, ingested_at)) AS first_seen,
      MAX(COALESCE(processed_at, placed_at, ingested_at)) AS last_seen,
      (ARRAY_AGG(
        identity_confidence_grade
        ORDER BY CASE identity_confidence_grade
          WHEN 'definite' THEN 4
          WHEN 'probable' THEN 3
          WHEN 'possible' THEN 2
          WHEN 'weak' THEN 1
          ELSE 0
        END DESC
      ))[1] AS highest_grade,
      now()
    FROM public.source_orders
    WHERE job_id = p_audit_id
      AND merchant_id = p_merchant_id
      AND (
        identity_confidence_grade IN ('probable', 'definite')
        OR match_status IN ('probable', 'definite')
      )
      AND dismissed_by_merchant IS NOT TRUE
    GROUP BY COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), NULLIF(LOWER(TRIM(email)), ''), 'unknown customer')
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO rows_written FROM inserted;

  INSERT INTO public.audit_result_summaries (
    audit_id,
    merchant_id,
    flagged_transactions,
    definite_count,
    probable_count,
    possible_count,
    weak_count,
    linked_cluster_count,
    customer_count,
    value_at_risk,
    estimated_exposure,
    updated_at
  )
  SELECT
    p_audit_id,
    p_merchant_id,
    COALESCE(tx.flagged_transactions, 0),
    COALESCE(tx.definite_count, 0),
    COALESCE(tx.probable_count, 0),
    COALESCE(tx.possible_count, 0),
    COALESCE(tx.weak_count, 0),
    COALESCE(tx.linked_cluster_count, 0),
    COALESCE(customers.customer_count, 0),
    COALESCE(customers.value_at_risk, 0),
    COALESCE(customers.value_at_risk, 0) * 0.42,
    now()
  FROM (
    SELECT
      COUNT(*) FILTER (
        WHERE (
          identity_confidence_grade IN ('probable', 'definite')
          OR match_status IN ('probable', 'definite')
        )
        AND dismissed_by_merchant IS NOT TRUE
      )::integer AS flagged_transactions,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'definite')::integer AS definite_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'probable')::integer AS probable_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'possible')::integer AS possible_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'weak')::integer AS weak_count,
      COUNT(cluster_id)::integer AS linked_cluster_count
    FROM public.source_orders
    WHERE job_id = p_audit_id
      AND merchant_id = p_merchant_id
  ) tx
  CROSS JOIN (
    SELECT
      COUNT(*)::integer AS customer_count,
      COALESCE(SUM(total_spend), 0) AS value_at_risk
    FROM public.audit_customer_summaries
    WHERE audit_id = p_audit_id
      AND merchant_id = p_merchant_id
  ) customers
  ON CONFLICT (audit_id) DO UPDATE
    SET flagged_transactions = EXCLUDED.flagged_transactions,
        definite_count = EXCLUDED.definite_count,
        probable_count = EXCLUDED.probable_count,
        possible_count = EXCLUDED.possible_count,
        weak_count = EXCLUDED.weak_count,
        linked_cluster_count = EXCLUDED.linked_cluster_count,
        customer_count = EXCLUDED.customer_count,
        value_at_risk = EXCLUDED.value_at_risk,
        estimated_exposure = EXCLUDED.estimated_exposure,
        updated_at = now();

  RETURN rows_written;
END;
$function$;
CREATE OR REPLACE FUNCTION public.register_processing_job_chunks(p_job_id uuid, p_merchant_id uuid, p_total_chunks integer, p_storage_path text, p_column_map jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_total_chunks < 1 THEN
    RETURN;
  END IF;

  UPDATE public.sync_jobs
  SET storage_path = p_storage_path,
      column_map = p_column_map,
      updated_at = now()
  WHERE id = p_job_id
    AND merchant_id = p_merchant_id;

  INSERT INTO public.sync_job_chunks (job_id, chunk_index, status)
  SELECT p_job_id, g.i, 'pending'::sync_job_status
  FROM generate_series(0, p_total_chunks - 1) AS g(i)
  ON CONFLICT (job_id, chunk_index) DO NOTHING;
END;
$function$;
CREATE OR REPLACE FUNCTION public.reorder_merchant_rules(p_merchant_id uuid, p_actor_id uuid, p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  entry jsonb;
  item_count integer;
  scoped_count integer;
begin
  if not exists (
    select 1 from public.merchant_users
    where merchant_id = p_merchant_id
      and user_id = p_actor_id
      and invite_status = 'active'
  ) then
    raise exception 'merchant_membership_required';
  end if;

  if jsonb_typeof(p_order) <> 'array' then
    raise exception 'rule_order_must_be_array';
  end if;
  item_count := jsonb_array_length(p_order);
  if item_count < 1 or item_count > 500 then
    raise exception 'rule_order_must_contain_1_to_500_items';
  end if;
  if (
    select count(distinct (item->>'id')::uuid)
    from jsonb_array_elements(p_order) item
  ) <> item_count then
    raise exception 'rule_order_contains_duplicate_ids';
  end if;

  perform 1
  from public.merchant_rules
  where merchant_id = p_merchant_id
    and archived_at is null
    and id in (
      select (item->>'id')::uuid from jsonb_array_elements(p_order) item
    )
  order by id
  for update;

  select count(*) into scoped_count
  from public.merchant_rules
  where merchant_id = p_merchant_id
    and archived_at is null
    and id in (
      select (item->>'id')::uuid from jsonb_array_elements(p_order) item
    );
  if scoped_count <> item_count then
    raise exception 'rule_order_scope_mismatch';
  end if;

  for entry in select value from jsonb_array_elements(p_order)
  loop
    update public.merchant_rules
    set priority = (entry->>'priority')::integer, updated_at = now()
    where merchant_id = p_merchant_id
      and archived_at is null
      and id = (entry->>'id')::uuid;
  end loop;

  insert into public.domain_events (
    merchant_id, event_type, aggregate_type, aggregate_id, actor_type, actor_id,
    idempotency_key, occurred_at, payload
  ) values (
    p_merchant_id, 'rules.reordered', 'merchant', p_merchant_id,
    'user', p_actor_id,
    'rules-reordered:' || p_merchant_id::text || ':' || md5(p_order::text),
    now(), jsonb_build_object('order', p_order)
  ) on conflict (merchant_id, idempotency_key) do nothing;

  return jsonb_build_object('updated', item_count);
end;
$function$;
CREATE OR REPLACE FUNCTION public.reset_merchant_monthly_credits(p_merchant_id uuid, p_monthly_allowance integer, p_cycle_reset_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
  VALUES (p_merchant_id, p_monthly_allowance, 0, p_cycle_reset_at)
  ON CONFLICT (merchant_id) DO UPDATE SET
    monthly_credits_remaining = EXCLUDED.monthly_credits_remaining,
    last_reset_at = now(),
    cycle_reset_at = EXCLUDED.cycle_reset_at,
    usage_warning_sent_at = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$function$;
CREATE OR REPLACE FUNCTION public.set_checkout_signal_cross_merchant_hits(p_signal_id uuid, p_hit_count integer)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.checkout_signals
  SET raw_payload = COALESCE(raw_payload, '{}'::jsonb)
    || jsonb_build_object('cross_merchant_device_hits', GREATEST(COALESCE(p_hit_count, 0), 0))
  WHERE id = p_signal_id;
$function$;
CREATE OR REPLACE FUNCTION public.set_merchant_monthly_credits(p_merchant_id uuid, p_monthly_credits integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  UPDATE merchant_credits
  SET
    monthly_credits_remaining = GREATEST(p_monthly_credits, monthly_credits_remaining),
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  IF NOT FOUND THEN
    INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
    VALUES (
      p_merchant_id,
      p_monthly_credits,
      0,
      date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.try_claim_job_finalize(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_claimed boolean;
BEGIN
  IF NOT public.all_processing_job_chunks_complete(p_job_id) THEN
    RETURN false;
  END IF;

  UPDATE public.sync_jobs
  SET finalize_claimed_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND finalize_claimed_at IS NULL
    AND status NOT IN ('completed'::sync_job_status, 'failed'::sync_job_status)
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$function$;

-- ============ triggers (exact pg_get_triggerdef) ============
CREATE TRIGGER trg_agreement_rules_updated BEFORE UPDATE ON public.agreement_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agreements_updated BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_case_clarification_requests_updated BEFORE UPDATE ON public.case_clarification_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_case_comment_events_noupd BEFORE DELETE OR UPDATE ON public.case_comment_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER trg_case_comments_updated BEFORE UPDATE ON public.case_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER case_decisions_immutable BEFORE DELETE OR UPDATE ON public.case_decisions FOR EACH ROW EXECUTE FUNCTION public.forbid_phase7_history_mutation();
CREATE TRIGGER trg_case_exceptions_updated BEFORE UPDATE ON public.case_exceptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_financial_entries_immutable BEFORE DELETE OR UPDATE ON public.case_financial_entries FOR EACH ROW EXECUTE FUNCTION public.forbid_financial_entry_mutation();
CREATE TRIGGER case_outcomes_immutable BEFORE DELETE OR UPDATE ON public.case_outcomes FOR EACH ROW EXECUTE FUNCTION public.forbid_phase7_history_mutation();
CREATE TRIGGER trg_claim_events_noupd BEFORE DELETE OR UPDATE ON public.claim_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER trg_claim_outcomes_updated BEFORE UPDATE ON public.claim_outcomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_correspondence_automation_settings_updated BEFORE UPDATE ON public.correspondence_automation_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_document_upload_jobs_updated BEFORE UPDATE ON public.document_upload_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_domain_event_deliveries_updated BEFORE UPDATE ON public.domain_event_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_domain_events_immutable BEFORE DELETE OR UPDATE ON public.domain_events FOR EACH ROW EXECUTE FUNCTION public.forbid_domain_event_mutation();
CREATE TRIGGER trg_entity_relationships_updated BEFORE UPDATE ON public.entity_relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_extracted_partner_terms_updated BEFORE UPDATE ON public.extracted_partner_terms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_helpdesk_connections_updated BEFORE UPDATE ON public.helpdesk_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_identities_updated BEFORE UPDATE ON public.identities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_resolution_events_noupd BEFORE DELETE OR UPDATE ON public.identity_resolution_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER trg_ingestion_events_updated BEFORE UPDATE ON public.ingestion_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_integration_credentials_updated BEFORE UPDATE ON public.integration_credentials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_integration_documents_updated BEFORE UPDATE ON public.integration_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_loss_case_events_noupd BEFORE DELETE OR UPDATE ON public.loss_case_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER trg_loss_cases_updated BEFORE UPDATE ON public.loss_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_loss_sources_updated BEFORE UPDATE ON public.loss_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_merchant_customers_updated BEFORE UPDATE ON public.merchant_customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mis_updated BEFORE UPDATE ON public.merchant_identity_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_merchant_integrations_updated BEFORE UPDATE ON public.merchant_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER protect_published_rule_version_payload BEFORE UPDATE ON public.merchant_rule_versions FOR EACH ROW EXECUTE FUNCTION public.protect_published_rule_version_payload();
CREATE TRIGGER trg_merchants_updated BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_network_access_log_noupd BEFORE DELETE OR UPDATE ON public.network_access_log FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER trg_notification_preferences_updated BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_partner_recovery_rules_updated BEFORE UPDATE ON public.partner_recovery_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_record_match_candidates_updated BEFORE UPDATE ON public.record_match_candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recovery_case_events_noupd BEFORE DELETE OR UPDATE ON public.recovery_case_events FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER recovery_case_integrity BEFORE INSERT OR UPDATE ON public.recovery_cases FOR EACH ROW EXECUTE FUNCTION public.enforce_recovery_case_integrity();
CREATE TRIGGER trg_recovery_cases_updated BEFORE UPDATE ON public.recovery_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recovery_tasks_updated BEFORE UPDATE ON public.recovery_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_accounts_updated BEFORE UPDATE ON public.source_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_customers_updated BEFORE UPDATE ON public.source_customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_order_lines_updated BEFORE UPDATE ON public.source_order_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_orders_updated BEFORE UPDATE ON public.source_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_payments_updated BEFORE UPDATE ON public.source_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_records_updated BEFORE UPDATE ON public.source_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_replacements_updated BEFORE UPDATE ON public.source_replacements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_returns_updated BEFORE UPDATE ON public.source_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_shipments_updated BEFORE UPDATE ON public.source_shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_tickets_updated BEFORE UPDATE ON public.source_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_source_transactions_updated BEFORE UPDATE ON public.source_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_store_connections_updated BEFORE UPDATE ON public.store_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_payout_cases_status_audit AFTER UPDATE OF status ON public.support_payout_cases FOR EACH ROW EXECUTE FUNCTION public.audit_claim_status_change();
CREATE TRIGGER trg_support_payout_cases_updated BEFORE UPDATE ON public.support_payout_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sync_jobs_updated BEFORE UPDATE ON public.sync_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER protect_published_workflow_payload BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.protect_published_workflow_payload();
CREATE TRIGGER trg_workflow_definitions_updated BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS enable + policies (public) ============
alter table public."access_audit_log" enable row level security;
alter table public."accountability_events" enable row level security;
alter table public."agreement_clauses" enable row level security;
alter table public."agreement_rule_evaluations" enable row level security;
alter table public."agreement_rules" enable row level security;
alter table public."agreements" enable row level security;
alter table public."audit_customer_summaries" enable row level security;
alter table public."audit_result_summaries" enable row level security;
alter table public."billing_events_log" enable row level security;
alter table public."case_clarification_requests" enable row level security;
alter table public."case_comment_events" enable row level security;
alter table public."case_comments" enable row level security;
alter table public."case_decisions" enable row level security;
alter table public."case_exceptions" enable row level security;
alter table public."case_financial_entries" enable row level security;
alter table public."case_financial_summaries" enable row level security;
alter table public."case_outcomes" enable row level security;
alter table public."category_applicability" enable row level security;
alter table public."checkout_signals" enable row level security;
alter table public."claim_events" enable row level security;
alter table public."claim_evidence" enable row level security;
alter table public."claim_outcomes" enable row level security;
alter table public."comment_mentions" enable row level security;
alter table public."connector_action_runs" enable row level security;
alter table public."context_credit_events" enable row level security;
alter table public."correspondence_automation_settings" enable row level security;
alter table public."credit_topup_log" enable row level security;
alter table public."customer_claim_summary" enable row level security;
alter table public."customer_identity_signals" enable row level security;
alter table public."default_rule_templates" enable row level security;
alter table public."document_upload_jobs" enable row level security;
alter table public."domain_event_deliveries" enable row level security;
alter table public."domain_events" enable row level security;
alter table public."entity_relationships" enable row level security;
alter table public."evidence_items" enable row level security;
alter table public."evidence_links" enable row level security;
alter table public."evidence_packages" enable row level security;
alter table public."external_clarification_requests" enable row level security;
alter table public."external_correspondence" enable row level security;
alter table public."extracted_partner_terms" enable row level security;
alter table public."helpdesk_connections" enable row level security;
alter table public."identities" enable row level security;
alter table public."identity_catch_events" enable row level security;
alter table public."identity_edges" enable row level security;
alter table public."identity_evidence_scores" enable row level security;
alter table public."identity_link_candidates" enable row level security;
alter table public."identity_members" enable row level security;
alter table public."identity_notes" enable row level security;
alter table public."identity_profiles" enable row level security;
alter table public."identity_resolution_events" enable row level security;
alter table public."identity_signals" enable row level security;
alter table public."ingestion_events" enable row level security;
alter table public."ingestion_field_errors" enable row level security;
alter table public."integration_credentials" enable row level security;
alter table public."integration_documents" enable row level security;
alter table public."integration_evidence_items" enable row level security;
alter table public."loss_attribution_candidates" enable row level security;
alter table public."loss_case_events" enable row level security;
alter table public."loss_case_evidence" enable row level security;
alter table public."loss_cases" enable row level security;
alter table public."loss_sources" enable row level security;
alter table public."merchant_api_keys" enable row level security;
alter table public."merchant_credits" enable row level security;
alter table public."merchant_customer_signals" enable row level security;
alter table public."merchant_customers" enable row level security;
alter table public."merchant_identity_state" enable row level security;
alter table public."merchant_integrations" enable row level security;
alter table public."merchant_rule_versions" enable row level security;
alter table public."merchant_rules" enable row level security;
alter table public."merchant_subscriptions" enable row level security;
alter table public."merchant_users" enable row level security;
alter table public."merchant_widget_tokens" enable row level security;
alter table public."merchants" enable row level security;
alter table public."network_access_log" enable row level security;
alter table public."notification_preferences" enable row level security;
alter table public."notifications" enable row level security;
alter table public."oauth_connection_transactions" enable row level security;
alter table public."order_claim_context" enable row level security;
alter table public."pack_confirmations" enable row level security;
alter table public."partner_recovery_rules" enable row level security;
alter table public."partners" enable row level security;
alter table public."pending_provider_account_selections" enable row level security;
alter table public."plans" enable row level security;
alter table public."processed_webhooks" enable row level security;
alter table public."record_match_candidates" enable row level security;
alter table public."record_match_resolutions" enable row level security;
alter table public."recovery_case_events" enable row level security;
alter table public."recovery_cases" enable row level security;
alter table public."recovery_tasks" enable row level security;
alter table public."rule_evaluations" enable row level security;
alter table public."source_accounts" enable row level security;
alter table public."source_addresses" enable row level security;
alter table public."source_customers" enable row level security;
alter table public."source_disputes" enable row level security;
alter table public."source_fulfillments" enable row level security;
alter table public."source_locations" enable row level security;
alter table public."source_messages" enable row level security;
alter table public."source_order_lines" enable row level security;
alter table public."source_orders" enable row level security;
alter table public."source_payments" enable row level security;
alter table public."source_records" enable row level security;
alter table public."source_refunds" enable row level security;
alter table public."source_replacements" enable row level security;
alter table public."source_returns" enable row level security;
alter table public."source_shipments" enable row level security;
alter table public."source_ticket_events" enable row level security;
alter table public."source_tickets" enable row level security;
alter table public."source_tracking_events" enable row level security;
alter table public."source_transactions" enable row level security;
alter table public."store_connections" enable row level security;
alter table public."support_case_events" enable row level security;
alter table public."support_case_intake" enable row level security;
alter table public."support_payout_cases" enable row level security;
alter table public."support_provider_connections" enable row level security;
alter table public."sync_job_chunks" enable row level security;
alter table public."sync_jobs" enable row level security;
alter table public."unmatched_correspondence" enable row level security;
alter table public."user_action_log" enable row level security;
alter table public."user_permission_grants" enable row level security;
alter table public."webhook_logs" enable row level security;
alter table public."work_tasks" enable row level security;
alter table public."workflow_definitions" enable row level security;
alter table public."workflow_runs" enable row level security;
alter table public."workflow_step_runs" enable row level security;
create policy "access_audit_log_member_select" on public."access_audit_log" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "accountability_events_member_select" on public."accountability_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "agreement_clauses_member_select" on public."agreement_clauses" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "agreement_rule_evaluations_member_select" on public."agreement_rule_evaluations" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "agreement_rules_member_select" on public."agreement_rules" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "agreements_member_select" on public."agreements" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "audit_customer_summaries_service_all" on public."audit_customer_summaries" for ALL to service_role using (true) with check (true);
create policy "audit_result_summaries_service_all" on public."audit_result_summaries" for ALL to service_role using (true) with check (true);
create policy "billing_events_log_select_own" on public."billing_events_log" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_clarification_requests_member_insert" on public."case_clarification_requests" for INSERT to public with check ((EXISTS ( SELECT 1
   FROM public.merchant_users mu
  WHERE ((mu.merchant_id = case_clarification_requests.merchant_id) AND (mu.user_id = auth.uid())))));
create policy "case_clarification_requests_member_select" on public."case_clarification_requests" for SELECT to public using ((EXISTS ( SELECT 1
   FROM public.merchant_users mu
  WHERE ((mu.merchant_id = case_clarification_requests.merchant_id) AND (mu.user_id = auth.uid())))));
create policy "case_clarification_requests_member_update" on public."case_clarification_requests" for UPDATE to public using ((EXISTS ( SELECT 1
   FROM public.merchant_users mu
  WHERE ((mu.merchant_id = case_clarification_requests.merchant_id) AND (mu.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM public.merchant_users mu
  WHERE ((mu.merchant_id = case_clarification_requests.merchant_id) AND (mu.user_id = auth.uid())))));
create policy "case_comment_events_member_select" on public."case_comment_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_comments_member_select" on public."case_comments" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_decisions_member_all" on public."case_decisions" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "case_exceptions_member_select" on public."case_exceptions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_exceptions_service_write" on public."case_exceptions" for ALL to service_role using (true) with check (true);
create policy "case_financial_entries_member_select" on public."case_financial_entries" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_financial_summaries_member_select" on public."case_financial_summaries" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "case_outcomes_member_all" on public."case_outcomes" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "category_applicability_admin_write" on public."category_applicability" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "category_applicability_member_select" on public."category_applicability" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchants_read_own_signals" on public."checkout_signals" for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM public.merchant_users mu
  WHERE ((mu.merchant_id = checkout_signals.merchant_id) AND (mu.user_id = auth.uid()) AND (mu.invite_status = 'active'::public.invite_status)))));
create policy "claim_events_member_select" on public."claim_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "claim_evidence_member_select" on public."claim_evidence" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "claim_outcomes_member_select" on public."claim_outcomes" for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM public.support_payout_cases c
  WHERE ((c.id = claim_outcomes.claim_id) AND public.is_merchant_member(c.merchant_id)))));
create policy "comment_mentions_member_select" on public."comment_mentions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "connector_action_runs_member_select" on public."connector_action_runs" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "context_credit_events_select_own_merchant" on public."context_credit_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "correspondence_automation_settings_admin_write" on public."correspondence_automation_settings" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "correspondence_automation_settings_member_select" on public."correspondence_automation_settings" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "credit_topup_log_select_own" on public."credit_topup_log" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "service_role_only_customer_claim_summary_all" on public."customer_claim_summary" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "service_role_only_customer_identity_signals_all" on public."customer_identity_signals" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "authenticated read templates" on public."default_rule_templates" for SELECT to public using ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])));
create policy "service role manage templates" on public."default_rule_templates" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "document_upload_jobs_member_select" on public."document_upload_jobs" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "domain_event_deliveries_service" on public."domain_event_deliveries" for ALL to service_role using (true) with check (true);
create policy "domain_events_member_select" on public."domain_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "entity_relationships_member_select" on public."entity_relationships" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "evidence_items_member_select" on public."evidence_items" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "evidence_links_member_all" on public."evidence_links" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "evidence_packages_member_all" on public."evidence_packages" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "external_clarification_requests_member_select" on public."external_clarification_requests" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "external_correspondence_member_select" on public."external_correspondence" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "extracted_partner_terms_admin_write" on public."extracted_partner_terms" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "extracted_partner_terms_member_select" on public."extracted_partner_terms" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "helpdesk_connections_service_only" on public."helpdesk_connections" for ALL to service_role using (true) with check (true);
create policy "identities_service_only" on public."identities" for ALL to service_role using (true);
create policy "merchant read own catch events" on public."identity_catch_events" for SELECT to public using ((merchant_id IN ( SELECT merchant_users.merchant_id
   FROM public.merchant_users
  WHERE (merchant_users.user_id = auth.uid()))));
create policy "service role manage catch events" on public."identity_catch_events" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "identity_edges_service_only" on public."identity_edges" for ALL to service_role using (true);
create policy "service role manage evidence scores" on public."identity_evidence_scores" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "service_role_only_identity_link_candidates_all" on public."identity_link_candidates" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "identity_members_service_only" on public."identity_members" for ALL to service_role using (true);
create policy "identity_notes_member_all" on public."identity_notes" for ALL to authenticated using (public.is_merchant_member(merchant_id));
create policy "identity_profiles_service_only" on public."identity_profiles" for ALL to service_role using (true);
create policy "identity_resolution_events_service_only" on public."identity_resolution_events" for ALL to service_role using (true);
create policy "identity_signals_service_only" on public."identity_signals" for ALL to service_role using (true);
create policy "ingestion_events_service" on public."ingestion_events" for ALL to service_role using (true) with check (true);
create policy "ingestion_field_errors_member_select" on public."ingestion_field_errors" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "integration_credentials_service_only" on public."integration_credentials" for ALL to service_role using (true) with check (true);
create policy "integration_documents_admin_write" on public."integration_documents" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "integration_documents_member_select" on public."integration_documents" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "integration_evidence_items_admin_write" on public."integration_evidence_items" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "integration_evidence_items_member_select" on public."integration_evidence_items" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "loss_attribution_candidates_member_all" on public."loss_attribution_candidates" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "loss_case_events_member_select" on public."loss_case_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "loss_case_evidence_member_select" on public."loss_case_evidence" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "loss_cases_member_select" on public."loss_cases" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "loss_sources_member_select" on public."loss_sources" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "api_keys_member_select" on public."merchant_api_keys" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_credits_select_own" on public."merchant_credits" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_customer_signals_member_select" on public."merchant_customer_signals" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_customers_member_select" on public."merchant_customers" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "mis_member_all" on public."merchant_identity_state" for ALL to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_integrations_member_select" on public."merchant_integrations" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_rule_versions_member_select" on public."merchant_rule_versions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant manage own rules" on public."merchant_rules" for ALL to public using ((merchant_id IN ( SELECT merchant_users.merchant_id
   FROM public.merchant_users
  WHERE (merchant_users.user_id = auth.uid())))) with check ((merchant_id IN ( SELECT merchant_users.merchant_id
   FROM public.merchant_users
  WHERE (merchant_users.user_id = auth.uid()))));
create policy "service role manage rules" on public."merchant_rules" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "merchant_subscriptions_select_own" on public."merchant_subscriptions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_users_member_select" on public."merchant_users" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant_users_owner_write" on public."merchant_users" for ALL to authenticated using ((public.merchant_role(merchant_id) = 'owner'::text));
create policy "widget_tokens_member_select" on public."merchant_widget_tokens" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchants_member_select" on public."merchants" for SELECT to authenticated using (public.is_merchant_member(id));
create policy "merchants_owner_update" on public."merchants" for UPDATE to authenticated using ((public.merchant_role(id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "network_access_log_service_only" on public."network_access_log" for ALL to service_role using (true);
create policy "notification_preferences_own_all" on public."notification_preferences" for ALL to authenticated using ((public.is_merchant_member(merchant_id) AND (user_id = auth.uid()))) with check ((public.is_merchant_member(merchant_id) AND (user_id = auth.uid())));
create policy "notifications_recipient_select" on public."notifications" for SELECT to authenticated using ((public.is_merchant_member(merchant_id) AND (recipient_user_id = auth.uid())));
create policy "oauth_connection_transactions_service_role" on public."oauth_connection_transactions" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "service_role_only_order_claim_context_all" on public."order_claim_context" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "pack_confirmations_admin_write" on public."pack_confirmations" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text]))) with check ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "pack_confirmations_member_select" on public."pack_confirmations" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "partner_recovery_rules_member_all" on public."partner_recovery_rules" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "partners_member_all" on public."partners" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "pending_provider_account_selections_service_role" on public."pending_provider_account_selections" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "plans_select_all" on public."plans" for SELECT to anon,authenticated using (true);
create policy "processed_webhooks_service" on public."processed_webhooks" for ALL to service_role using (true);
create policy "record_match_candidates_member_select" on public."record_match_candidates" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "record_match_resolutions_member_select" on public."record_match_resolutions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "recovery_case_events_member_select" on public."recovery_case_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "recovery_cases_member_all" on public."recovery_cases" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "recovery_tasks_member_select" on public."recovery_tasks" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "merchant read own evaluations" on public."rule_evaluations" for SELECT to public using ((merchant_id IN ( SELECT merchant_users.merchant_id
   FROM public.merchant_users
  WHERE (merchant_users.user_id = auth.uid()))));
create policy "service role manage evaluations" on public."rule_evaluations" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "source_accounts_member_select" on public."source_accounts" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_addresses_member_select" on public."source_addresses" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_customers_member_select" on public."source_customers" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_customers_service_write" on public."source_customers" for ALL to service_role using (true) with check (true);
create policy "source_disputes_member_select" on public."source_disputes" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_disputes_service_write" on public."source_disputes" for ALL to service_role using (true) with check (true);
create policy "source_fulfillments_member_select" on public."source_fulfillments" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_fulfillments_service_write" on public."source_fulfillments" for ALL to service_role using (true) with check (true);
create policy "source_locations_member_select" on public."source_locations" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_locations_service_write" on public."source_locations" for ALL to service_role using (true) with check (true);
create policy "source_messages_member_select" on public."source_messages" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_order_lines_member_select" on public."source_order_lines" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_orders_member_select" on public."source_orders" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_orders_service_write" on public."source_orders" for ALL to service_role using (true) with check (true);
create policy "source_payments_member_select" on public."source_payments" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_records_member_select" on public."source_records" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_refunds_member_select" on public."source_refunds" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_replacements_member_select" on public."source_replacements" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_returns_member_select" on public."source_returns" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_returns_service_write" on public."source_returns" for ALL to service_role using (true) with check (true);
create policy "source_shipments_member_select" on public."source_shipments" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_shipments_service_write" on public."source_shipments" for ALL to service_role using (true) with check (true);
create policy "source_ticket_events_member_select" on public."source_ticket_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_tickets_member_select" on public."source_tickets" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_tracking_events_member_select" on public."source_tracking_events" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "source_transactions_member_select" on public."source_transactions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "store_connections_service_only" on public."store_connections" for ALL to service_role using (true) with check (true);
create policy "service_role_only_support_case_events_all" on public."support_case_events" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "service_role_only_support_case_intake_all" on public."support_case_intake" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "support_payout_cases_member_select" on public."support_payout_cases" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "support_payout_cases_member_update" on public."support_payout_cases" for UPDATE to authenticated using (public.is_merchant_member(merchant_id));
create policy "service_role_only_support_provider_connections_all" on public."support_provider_connections" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "sync_job_chunks_service" on public."sync_job_chunks" for ALL to service_role using (true);
create policy "sync_jobs_member_select" on public."sync_jobs" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "sync_jobs_service_write" on public."sync_jobs" for ALL to service_role using (true) with check (true);
create policy "unmatched_correspondence_member_select" on public."unmatched_correspondence" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "user_action_log_member_select" on public."user_action_log" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "user_permission_grants_member_select" on public."user_permission_grants" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "user_permission_grants_owner_write" on public."user_permission_grants" for ALL to authenticated using ((public.merchant_role(merchant_id) = ANY (ARRAY['owner'::text, 'admin'::text])));
create policy "service_role_only_webhook_logs_all" on public."webhook_logs" for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "work_tasks_member_all" on public."work_tasks" for ALL to authenticated using (public.is_merchant_member(merchant_id)) with check (public.is_merchant_member(merchant_id));
create policy "workflow_definitions_member_select" on public."workflow_definitions" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "workflow_runs_member_select" on public."workflow_runs" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
create policy "workflow_step_runs_member_select" on public."workflow_step_runs" for SELECT to authenticated using (public.is_merchant_member(merchant_id));
