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
  MERCHANT_CLAIMS: 'claims',
  CUSTOMER_PROFILES: 'identities',
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
} as const;

export const COLUMNS = {
  IDENTITY_CONFIDENCE_GRADE: 'identity_confidence_grade',
  REVIEW_WORTHY: 'review_worthy',
} as const;
