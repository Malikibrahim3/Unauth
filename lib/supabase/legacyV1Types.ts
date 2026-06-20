import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';

/**
 * LEGACY V1 SCHEMA BRIDGE — quarantine only. Do not extend or use in new code.
 *
 * `processing_jobs`, `audit_transactions`, and the `bulk_upsert_identity_*` RPCs
 * were DROPPED in the v2 schema cutover (verified: the live REST API returns 404
 * for these tables). The v1 CSV-audit / identity dual-write pipeline that still
 * references them has NO live runtime callers — the live Shopify webhook ingests
 * via `lib/shopify/ingest` into `support_payout_cases`. This dead code is retained
 * only for the legacy_v1 cutover window (until 2026-09-09).
 *
 * This bridge exists solely so that intentionally-retained dead code keeps
 * compiling against the regenerated, accurate v2 types in `lib/supabase/types.ts`
 * (instead of forcing those types to stay stale, or scattering `as any`). It must
 * be deleted when the v1 pipeline is retired at the cutover.
 * See CODEBASE_STABILISATION_AUDIT.md.
 */

type LegacyV1Tables = {
      processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          data_quality: Json | null
          data_quality_warning: string | null
          date_range_end: string | null
          date_range_start: string | null
          engine_version_id: string | null
          error_log: Json
          error_message: string | null
          failed_at: string | null
          failed_rows: number
          filename: string
          flagged_count: number
          finalize_claimed_at: string | null
          has_ground_truth: boolean | null
          hidden_by_merchant: boolean
          id: string
          is_demo: boolean | null
          label: string | null
          merchant_id: string
          processed_rows: number
          progress_message: string | null
          progress_pct: number | null
          public_audit_id: string | null
          results_email_error: string | null
          results_email_sent_at: string | null
          started_at: string | null
          status: string
          total_rows: number
          updated_at: string
          upload_type: string | null
          watchlist_sync_status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_quality?: Json | null
          data_quality_warning?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          engine_version_id?: string | null
          error_log?: Json
          error_message?: string | null
          failed_at?: string | null
          failed_rows?: number
          filename?: string
          flagged_count?: number
          finalize_claimed_at?: string | null
          has_ground_truth?: boolean | null
          hidden_by_merchant?: boolean
          id?: string
          is_demo?: boolean | null
          label?: string | null
          merchant_id: string
          processed_rows?: number
          progress_message?: string | null
          progress_pct?: number | null
          public_audit_id?: string | null
          results_email_error?: string | null
          results_email_sent_at?: string | null
          started_at?: string | null
          status: string
          total_rows?: number
          updated_at?: string
          upload_type?: string | null
          watchlist_sync_status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_quality?: Json | null
          data_quality_warning?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          engine_version_id?: string | null
          error_log?: Json
          error_message?: string | null
          failed_at?: string | null
          failed_rows?: number
          filename?: string
          flagged_count?: number
          finalize_claimed_at?: string | null
          has_ground_truth?: boolean | null
          hidden_by_merchant?: boolean
          id?: string
          is_demo?: boolean | null
          label?: string | null
          merchant_id?: string
          processed_rows?: number
          progress_message?: string | null
          progress_pct?: number | null
          public_audit_id?: string | null
          results_email_error?: string | null
          results_email_sent_at?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          upload_type?: string | null
          watchlist_sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_engine_version_id_fkey"
            columns: ["engine_version_id"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_jobs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_transactions: {
        Row: {
          amount: number | null
          behavioural_flags: Json | null
          candidate_cluster_id: string | null
          cluster_id: string | null
          created_at: string
          identity_match_grade: string | null
          match_status: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          dismissed_by_merchant: boolean | null
          fraud_flags: Json | null
          id: string
          identity_confidence_grade: string | null
          identity_score: number | null
          identity_signals: Json | null
          job_id: string
          match_score: number | null
          merchant_id: string | null
          order_id: string | null
          order_value: number | string | null
          processed_at: string | null
          refund_reason: string | null
          signals_matched: string[] | null
        }
        Insert: {
          amount?: number | null
          behavioural_flags?: Json | null
          candidate_cluster_id?: string | null
          cluster_id?: string | null
          created_at?: string
          identity_match_grade?: string | null
          match_status?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dismissed_by_merchant?: boolean | null
          fraud_flags?: Json | null
          id?: string
          identity_confidence_grade?: string | null
          identity_score?: number | null
          identity_signals?: Json | null
          job_id: string
          match_score?: number | null
          merchant_id?: string | null
          order_id?: string | null
          order_value?: number | string | null
          processed_at?: string | null
          refund_reason?: string | null
          signals_matched?: string[] | null
        }
        Update: {
          amount?: number | null
          behavioural_flags?: Json | null
          candidate_cluster_id?: string | null
          cluster_id?: string | null
          created_at?: string
          identity_match_grade?: string | null
          match_status?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dismissed_by_merchant?: boolean | null
          fraud_flags?: Json | null
          id?: string
          identity_confidence_grade?: string | null
          identity_score?: number | null
          identity_signals?: Json | null
          job_id?: string
          match_score?: number | null
          merchant_id?: string | null
          order_id?: string | null
          order_value?: number | string | null
          processed_at?: string | null
          refund_reason?: string | null
          signals_matched?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
};

type LegacyV1Functions = {
  bulk_upsert_identity_identifiers: {
    Args: { p_identifiers: Json; p_source_provider: string };
    Returns: undefined;
  };
  bulk_upsert_identifier_co_occurrence_edges: {
    Args: { p_edges: Json; p_merchant_id: string; p_source_provider: string };
    Returns: undefined;
  };
};

/**
 * The v2 schema augmented with the dropped v1 objects, for dead-but-retained
 * code only. Preserves the full `Database` shape (so the supabase-js client type
 * stays valid) while re-adding `processing_jobs` / `audit_transactions` and the
 * `bulk_upsert_*` RPCs. Used via {@link asLegacyV1Client} at dead v1 call sites.
 */
export type LegacyV1Database = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & LegacyV1Tables;
    Functions: Database['public']['Functions'] & LegacyV1Functions;
  };
};

export type LegacyProcessingJobRow = LegacyV1Tables['processing_jobs']['Row'];
export type LegacyAuditTransactionRow = LegacyV1Tables['audit_transactions']['Row'];
export type LegacyAuditTransactionInsert = LegacyV1Tables['audit_transactions']['Insert'];

/**
 * View a v2 service client as the legacy-v1-augmented schema. Use ONLY at the
 * dead v1 audit/processing call sites so they typecheck against the dropped
 * tables/RPCs. Never use for live code.
 */
export function asLegacyV1Client(
  client: SupabaseClient<Database>,
): SupabaseClient<LegacyV1Database> {
  return client as unknown as SupabaseClient<LegacyV1Database>;
}
