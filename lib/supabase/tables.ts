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
  CUSTOMER_PROFILES: 'customer_profiles',
  PUBLIC_AUDITS: 'public_audits',
  MERCHANTS: 'merchants',
  MERCHANT_MEMBERS: 'merchant_members',
  WATCHLIST_ENTRIES: 'watchlist_entries',
  CSV_UPLOAD_QUEUE: 'csv_upload_queue',
  EVIDENCE_PACKAGES: 'evidence_packages',
  MERCHANT_API_KEYS: 'merchant_api_keys',
  EVIDENCE_DOWNLOAD_TOKENS: 'evidence_download_tokens',
  PROFILE_VIEW_TOKENS: 'profile_view_tokens',
  MERCHANT_WIDGET_TOKENS: 'merchant_widget_tokens',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];

export const STORAGE_BUCKETS = {
  MERCHANT_CSV_UPLOADS: 'merchant-csv-uploads-2',
  EVIDENCE_PACKAGES: 'evidence-packages',
} as const;

export const COLUMNS = {
  IDENTITY_CONFIDENCE_GRADE: 'identity_confidence_grade',
} as const;
