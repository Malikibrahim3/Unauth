/**
 * SINGLE SOURCE OF TRUTH — Supabase table names, column names, and storage buckets
 *
 * Every table name, column name, and storage bucket must be imported from here.
 * Never write a raw string for a database or storage reference anywhere else.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

export const TABLES = {
  PROCESSING_JOBS: 'processing_jobs',
  AUDIT_TRANSACTIONS: 'audit_transactions',
  MERCHANT_CLAIMS: 'merchant_claims',
  CUSTOMER_PROFILES: 'customer_profiles',
  CUSTOMER_PROFILE_IDENTITIES: 'customer_profile_identities',
  PUBLIC_AUDITS: 'public_audits',
  MERCHANTS: 'merchants',
  MERCHANT_MEMBERS: 'merchant_members',
  SUBSCRIPTIONS: 'subscriptions',
  PLANS: 'plans',
  MERCHANT_SUBSCRIPTIONS: 'merchant_subscriptions',
  MERCHANT_CREDITS: 'merchant_credits',
  CREDIT_TOPUP_LOG: 'credit_topup_log',
  BILLING_EVENTS_LOG: 'billing_events_log',
  CONTEXT_CREDIT_EVENTS: 'context_credit_events',
  WATCHLIST_ENTRIES: 'watchlist_entries',
  CSV_UPLOAD_QUEUE: 'csv_upload_queue',
  EVIDENCE_PACKAGES: 'evidence_packages',
  MERCHANT_API_KEYS: 'merchant_api_keys',
  EVIDENCE_DOWNLOAD_TOKENS: 'evidence_download_tokens',
  PROFILE_VIEW_TOKENS: 'profile_view_tokens',
  MERCHANT_WIDGET_TOKENS: 'merchant_widget_tokens',
  SUPPORT_PROVIDER_CONNECTIONS: 'support_provider_connections',
  MERCHANT_SHOPIFY_CONNECTIONS: 'merchant_shopify_connections',
  SUPPORT_CASE_INTAKE: 'support_case_intake',
  SUPPORT_CASE_EVENTS: 'support_case_events',
  ORDER_CLAIM_CONTEXT: 'order_claim_context',
  CUSTOMER_IDENTITY_SIGNALS: 'customer_identity_signals',
  CUSTOMER_CLAIM_SUMMARY: 'customer_claim_summary',
  IDENTITY_LINK_CANDIDATES: 'identity_link_candidates',
  WEBHOOK_LOGS: 'webhook_logs',
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
