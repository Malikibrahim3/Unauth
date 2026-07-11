/**
 * SINGLE SOURCE OF TRUTH — Supabase table names, column names, and storage buckets
 *
 * Every table name, column name, and storage bucket must be imported from here.
 * Never write a raw string for a database or storage reference anywhere else.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

export const TABLES = {
  // ── v2 schema names (post-cutover 2026-06-11). Entries still pointing at
  // legacy names reference tables that were dropped or archived in legacy_v1;
  // their call sites are being migrated incrementally post-cutover. ──
  PROCESSING_JOBS: 'sync_jobs',
  AUDIT_TRANSACTIONS: 'source_orders',
  SOURCE_CUSTOMERS: 'source_customers',
  SOURCE_ADDRESSES: 'source_addresses',
  SOURCE_ORDERS: 'source_orders',
  MERCHANT_CLAIMS: 'support_payout_cases',
  CUSTOMER_PROFILES: 'identities',
  IDENTITY_PROFILES: 'identity_profiles',
  CUSTOMER_PROFILE_IDENTITIES: 'customer_profile_identities',
  PUBLIC_AUDITS: 'public_audits',
  MERCHANTS: 'merchants',
  MERCHANT_MEMBERS: 'merchant_users',
  SUBSCRIPTIONS: 'subscriptions',
  PLANS: 'plans',
  MERCHANT_SUBSCRIPTIONS: 'merchant_subscriptions',
  MERCHANT_CREDITS: 'merchant_credits',
  CREDIT_TOPUP_LOG: 'credit_topup_log',
  BILLING_EVENTS_LOG: 'billing_events_log',
  CONTEXT_CREDIT_EVENTS: 'context_credit_events',
  WATCHLIST_ENTRIES: 'merchant_identity_state',
  CSV_UPLOAD_QUEUE: 'csv_upload_queue',
  EVIDENCE_PACKAGES: 'evidence_packages',
  MERCHANT_API_KEYS: 'merchant_api_keys',
  EVIDENCE_DOWNLOAD_TOKENS: 'evidence_download_tokens',
  PROFILE_VIEW_TOKENS: 'profile_view_tokens',
  MERCHANT_WIDGET_TOKENS: 'merchant_widget_tokens',
  SUPPORT_PROVIDER_CONNECTIONS: 'helpdesk_connections',
  MERCHANT_SHOPIFY_CONNECTIONS: 'store_connections',
  SUPPORT_CASE_INTAKE: 'source_tickets',
  SUPPORT_CASE_EVENTS: 'source_ticket_events',
  ORDER_CLAIM_CONTEXT: 'order_claim_context',
  CUSTOMER_IDENTITY_SIGNALS: 'customer_identity_signals',
  CUSTOMER_CLAIM_SUMMARY: 'customer_claim_summary',
  IDENTITY_LINK_CANDIDATES: 'identity_link_candidates',
  WEBHOOK_LOGS: 'webhook_logs',
  IDENTITY_IDENTIFIERS: 'identity_identifiers',
  IDENTIFIER_CO_OCCURRENCE_EDGES: 'identity_edges',
  CHECKOUT_SIGNALS: 'checkout_signals',
  CHECKOUT_SIGNAL_ORDER_LINKS: 'checkout_signal_order_links',
  INGEST_RATE_LIMITS: 'ingest_rate_limits',
  IDENTITY_CATCH_EVENTS: 'identity_catch_events',
  MERCHANT_RULES: 'merchant_rules',
  RULE_EVALUATIONS: 'rule_evaluations',
  DEFAULT_RULE_TEMPLATES: 'default_rule_templates',
  IDENTITY_EVIDENCE_SCORES: 'identity_evidence_scores',
  PARTNERS: 'partners',
  PARTNER_RECOVERY_RULES: 'partner_recovery_rules',
  RECOVERY_CASES: 'recovery_cases',
  RECOVERY_CASE_EVENTS: 'recovery_case_events',
  CASE_CLARIFICATION_REQUESTS: 'case_clarification_requests',
  MERCHANT_INTEGRATIONS: 'merchant_integrations',
  INTEGRATION_CREDENTIALS: 'integration_credentials',
  INTEGRATION_EVIDENCE_ITEMS: 'integration_evidence_items',
  INTEGRATION_DOCUMENTS: 'integration_documents',
  EXTRACTED_PARTNER_TERMS: 'extracted_partner_terms',
  CATEGORY_APPLICABILITY: 'category_applicability',
  PACK_CONFIRMATIONS: 'pack_confirmations',
  LOSS_CASES: 'loss_cases',
  LOSS_CASE_EVIDENCE: 'loss_case_evidence',
  EXTERNAL_CORRESPONDENCE: 'external_correspondence',
  UNMATCHED_CORRESPONDENCE: 'unmatched_correspondence',
  EXTERNAL_CLARIFICATION_REQUESTS: 'external_clarification_requests',
  CORRESPONDENCE_AUTOMATION_SETTINGS: 'correspondence_automation_settings',
  LOSS_CASE_EVENTS: 'loss_case_events',
  EVIDENCE_ITEMS: 'evidence_items',
  LOSS_SOURCES: 'loss_sources',
  RECOVERY_TASKS: 'recovery_tasks',
  ACCOUNTABILITY_EVENTS: 'accountability_events',
  AGREEMENTS: 'agreements',
  AGREEMENT_CLAUSES: 'agreement_clauses',
  AGREEMENT_RULES: 'agreement_rules',
  AGREEMENT_RULE_EVALUATIONS: 'agreement_rule_evaluations',
  DOCUMENT_UPLOAD_JOBS: 'document_upload_jobs',
  PROCESSED_WEBHOOKS: 'processed_webhooks',
  // ── Source-agnostic MVP+ foundation (Phase 1) ──
  SOURCE_ACCOUNTS: 'source_accounts',
  SOURCE_RECORDS: 'source_records',
  INGESTION_EVENTS: 'ingestion_events',
  DOMAIN_EVENTS: 'domain_events',
  DOMAIN_EVENT_DELIVERIES: 'domain_event_deliveries',
  ENTITY_RELATIONSHIPS: 'entity_relationships',
  RECORD_MATCH_CANDIDATES: 'record_match_candidates',
  RECORD_MATCH_RESOLUTIONS: 'record_match_resolutions',
  CASE_FINANCIAL_ENTRIES: 'case_financial_entries',
  CASE_FINANCIAL_SUMMARIES: 'case_financial_summaries',
  // ── Canonical entity model (Phase 3) ──
  MERCHANT_CUSTOMERS: 'merchant_customers',
  SOURCE_ORDER_LINES: 'source_order_lines',
  SOURCE_PAYMENTS: 'source_payments',
  SOURCE_TRANSACTIONS: 'source_transactions',
  SOURCE_REPLACEMENTS: 'source_replacements',
  SOURCE_FULFILLMENTS: 'source_fulfillments',
  SOURCE_SHIPMENTS: 'source_shipments',
  SOURCE_TRACKING_EVENTS: 'source_tracking_events',
  SOURCE_RETURNS: 'source_returns',
  SOURCE_MESSAGES: 'source_messages',
  INGESTION_FIELD_ERRORS: 'ingestion_field_errors',
} as const;

/** Step 3 compatibility / derived views — see PHASE_2_IMPLEMENTATION_SPEC.md */
export const VIEWS = {
  IDENTIFIER_EDGES_CROSS_MERCHANT: 'v_identifier_edges_cross_merchant',
  AUDIT_TRANSACTIONS_LEGACY: 'v_audit_transactions_legacy',
  TIME_TO_CLAIM_BUCKETS: 'v_time_to_claim_buckets',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];

export const STORAGE_BUCKETS = {
  MERCHANT_CSV_UPLOADS: 'merchant-csv-uploads-2',
  EVIDENCE_PACKAGES: 'evidence-packages',
  INTEGRATION_DOCUMENTS: 'integration-documents',
  PACK_CONFIRMATION_PHOTOS: 'pack-confirmation-photos',
} as const;

export const COLUMNS = {
  IDENTITY_CONFIDENCE_GRADE: 'identity_confidence_grade',
} as const;
