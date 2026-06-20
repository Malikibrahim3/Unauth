export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_events_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          merchant_id: string | null
          payload: Json
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          merchant_id?: string | null
          payload?: Json
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          merchant_id?: string | null
          payload?: Json
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_v2_bel_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          cluster_id: string | null
          created_at: string
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
          cluster_id?: string | null
          created_at?: string
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
          cluster_id?: string | null
          created_at?: string
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
      claim_events: {
        Row: {
          actor_user_id: string | null
          claim_id: string
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["claim_status"] | null
          id: string
          merchant_id: string
          metadata: Json
          note: string | null
          to_status: Database["public"]["Enums"]["claim_status"] | null
        }
        Insert: {
          actor_user_id?: string | null
          claim_id: string
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["claim_status"] | null
          id?: string
          merchant_id: string
          metadata?: Json
          note?: string | null
          to_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Update: {
          actor_user_id?: string | null
          claim_id?: string
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["claim_status"] | null
          id?: string
          merchant_id?: string
          metadata?: Json
          note?: string | null
          to_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_evidence: {
        Row: {
          added_by: string | null
          claim_id: string
          created_at: string
          evidence_hash: string | null
          evidence_type: string
          id: string
          merchant_id: string
          metadata: Json
          storage_path: string | null
        }
        Insert: {
          added_by?: string | null
          claim_id: string
          created_at?: string
          evidence_hash?: string | null
          evidence_type: string
          id?: string
          merchant_id: string
          metadata?: Json
          storage_path?: string | null
        }
        Update: {
          added_by?: string | null
          claim_id?: string
          created_at?: string
          evidence_hash?: string | null
          evidence_type?: string
          id?: string
          merchant_id?: string
          metadata?: Json
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_evidence_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_outcomes: {
        Row: {
          amount_recovered: number | null
          amount_refunded: number | null
          claim_id: string
          decided_at: string
          decided_by: string | null
          decision: Database["public"]["Enums"]["claim_decision"]
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action: string | null
          followed_recommendation: boolean | null
          updated_at: string
        }
        Insert: {
          amount_recovered?: number | null
          amount_refunded?: number | null
          claim_id: string
          decided_at?: string
          decided_by?: string | null
          decision: Database["public"]["Enums"]["claim_decision"]
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action?: string | null
          followed_recommendation?: boolean | null
          updated_at?: string
        }
        Update: {
          amount_recovered?: number | null
          amount_refunded?: number | null
          claim_id?: string
          decided_at?: string
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["claim_decision"]
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action?: string | null
          followed_recommendation?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_outcomes_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_clarification_requests: {
        Row: {
          id: string
          merchant_id: string
          support_payout_case_id: string
          target_type: string
          target_name: string | null
          status: string
          requested_evidence: string[]
          request_summary: string
          response_summary: string | null
          source_channel: string | null
          due_at: string | null
          sent_at: string | null
          response_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          support_payout_case_id: string
          target_type: string
          target_name?: string | null
          status?: string
          requested_evidence?: string[]
          request_summary: string
          response_summary?: string | null
          source_channel?: string | null
          due_at?: string | null
          sent_at?: string | null
          response_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          support_payout_case_id?: string
          target_type?: string
          target_name?: string | null
          status?: string
          requested_evidence?: string[]
          request_summary?: string
          response_summary?: string | null
          source_channel?: string | null
          due_at?: string | null
          sent_at?: string | null
          response_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_clarification_requests_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_clarification_requests_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_payout_cases: {
        Row: {
          amount_at_risk: number | null
          assigned_at: string | null
          assigned_to: string | null
          attribution_confidence: Database["public"]["Enums"]["attribution_confidence"] | null
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          currency: string | null
          detection_detail: Json
          detection_method: Database["public"]["Enums"]["claim_detection_method"]
          discount_amount: number | null
          estimated_support_cost: number | null
          first_viewed_at: string | null
          id: string
          identity_id: string | null
          loss_attribution: Database["public"]["Enums"]["loss_attribution"] | null
          merchant_id: string
          next_action: string | null
          next_action_reason: string | null
          payout_decision_state: string
          reason_normalized: string | null
          reason_raw: string | null
          recoverability: Database["public"]["Enums"]["recoverability"] | null
          recovery_state: string
          recommended_payout_action: string | null
          recommended_rule_name: string | null
          recommended_rule_id: string | null
          recovery_next_action: string | null
          recovery_owner: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence: string[]
          refund_amount: number | null
          replacement_item_value: number | null
          replacement_shipping_cost: number | null
          requested_action: Database["public"]["Enums"]["requested_action"]
          requires_review: boolean
          snoozed_until: string | null
          source_order_id: string | null
          source_ticket_id: string | null
          status: Database["public"]["Enums"]["claim_status"]
          store_credit_amount: number | null
          submitted_at: string
          total_estimated_loss: number | null
          updated_at: string
        }
        Insert: {
          amount_at_risk?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          attribution_confidence?: Database["public"]["Enums"]["attribution_confidence"] | null
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          currency?: string | null
          detection_detail?: Json
          detection_method?: Database["public"]["Enums"]["claim_detection_method"]
          discount_amount?: number | null
          estimated_support_cost?: number | null
          first_viewed_at?: string | null
          id?: string
          identity_id?: string | null
          loss_attribution?: Database["public"]["Enums"]["loss_attribution"] | null
          merchant_id: string
          next_action?: string | null
          next_action_reason?: string | null
          payout_decision_state?: string
          reason_normalized?: string | null
          reason_raw?: string | null
          recoverability?: Database["public"]["Enums"]["recoverability"] | null
          recovery_state?: string
          recommended_payout_action?: string | null
          recommended_rule_name?: string | null
          recommended_rule_id?: string | null
          recovery_next_action?: string | null
          recovery_owner?: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence?: string[]
          refund_amount?: number | null
          replacement_item_value?: number | null
          replacement_shipping_cost?: number | null
          requested_action?: Database["public"]["Enums"]["requested_action"]
          requires_review?: boolean
          snoozed_until?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          store_credit_amount?: number | null
          submitted_at?: string
          total_estimated_loss?: number | null
          updated_at?: string
        }
        Update: {
          amount_at_risk?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          attribution_confidence?: Database["public"]["Enums"]["attribution_confidence"] | null
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          currency?: string | null
          detection_detail?: Json
          detection_method?: Database["public"]["Enums"]["claim_detection_method"]
          discount_amount?: number | null
          estimated_support_cost?: number | null
          first_viewed_at?: string | null
          id?: string
          identity_id?: string | null
          loss_attribution?: Database["public"]["Enums"]["loss_attribution"] | null
          merchant_id?: string
          next_action?: string | null
          next_action_reason?: string | null
          payout_decision_state?: string
          reason_normalized?: string | null
          reason_raw?: string | null
          recoverability?: Database["public"]["Enums"]["recoverability"] | null
          recovery_state?: string
          recommended_payout_action?: string | null
          recommended_rule_name?: string | null
          recommended_rule_id?: string | null
          recovery_next_action?: string | null
          recovery_owner?: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence?: string[]
          refund_amount?: number | null
          replacement_item_value?: number | null
          replacement_shipping_cost?: number | null
          requested_action?: Database["public"]["Enums"]["requested_action"]
          requires_review?: boolean
          snoozed_until?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          store_credit_amount?: number | null
          submitted_at?: string
          total_estimated_loss?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "source_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      context_credit_events: {
        Row: {
          claim_id: string | null
          context_type: string
          credits_spent: number
          customer_ref: string | null
          id: string
          merchant_id: string
          metadata: Json
          occurred_at: string
          order_ref: string | null
          plan_tier: string
          reason: string | null
          ticket_ref: string | null
          user_id: string | null
        }
        Insert: {
          claim_id?: string | null
          context_type: string
          credits_spent: number
          customer_ref?: string | null
          id?: string
          merchant_id: string
          metadata?: Json
          occurred_at?: string
          order_ref?: string | null
          plan_tier: string
          reason?: string | null
          ticket_ref?: string | null
          user_id?: string | null
        }
        Update: {
          claim_id?: string | null
          context_type?: string
          credits_spent?: number
          customer_ref?: string | null
          id?: string
          merchant_id?: string
          metadata?: Json
          occurred_at?: string
          order_ref?: string | null
          plan_tier?: string
          reason?: string | null
          ticket_ref?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_v2_cce_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_topup_log: {
        Row: {
          amount_gbp: number
          created_at: string
          credits_added: number
          id: string
          merchant_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_gbp: number
          created_at?: string
          credits_added: number
          id?: string
          merchant_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_gbp?: number
          created_at?: string
          credits_added?: number
          id?: string
          merchant_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_v2_ctl_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          merchant_id: string
          provider: Database["public"]["Enums"]["helpdesk_kind"]
          provider_account_id: string | null
          provider_account_name: string | null
          provider_base_url: string | null
          refresh_token_encrypted: string | null
          scopes: Json
          status: Database["public"]["Enums"]["connection_status"]
          token_expires_at: string | null
          updated_at: string
          webhook_secret_hash: string | null
          webhook_secret_rotated_at: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id: string
          provider: Database["public"]["Enums"]["helpdesk_kind"]
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          refresh_token_encrypted?: string | null
          scopes?: Json
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret_hash?: string | null
          webhook_secret_rotated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id?: string
          provider?: Database["public"]["Enums"]["helpdesk_kind"]
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          refresh_token_encrypted?: string | null
          scopes?: Json
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret_hash?: string | null
          webhook_secret_rotated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_connections_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      identities: {
        Row: {
          confidence_grade: Database["public"]["Enums"]["confidence_grade"]
          confidence_score: number
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          merchant_count: number
          signal_count: number
          superseded_by: string | null
          updated_at: string
        }
        Insert: {
          confidence_grade?: Database["public"]["Enums"]["confidence_grade"]
          confidence_score?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          merchant_count?: number
          signal_count?: number
          superseded_by?: string | null
          updated_at?: string
        }
        Update: {
          confidence_grade?: Database["public"]["Enums"]["confidence_grade"]
          confidence_score?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          merchant_count?: number
          signal_count?: number
          superseded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_edges: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          left_hash: string
          left_type: Database["public"]["Enums"]["identifier_type"]
          merchant_id: string
          right_hash: string
          right_type: Database["public"]["Enums"]["identifier_type"]
          seen_count: number
          source: Database["public"]["Enums"]["signal_source"]
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          left_hash: string
          left_type: Database["public"]["Enums"]["identifier_type"]
          merchant_id: string
          right_hash: string
          right_type: Database["public"]["Enums"]["identifier_type"]
          seen_count?: number
          source: Database["public"]["Enums"]["signal_source"]
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          left_hash?: string
          left_type?: Database["public"]["Enums"]["identifier_type"]
          merchant_id?: string
          right_hash?: string
          right_type?: Database["public"]["Enums"]["identifier_type"]
          seen_count?: number
          source?: Database["public"]["Enums"]["signal_source"]
        }
        Relationships: [
          {
            foreignKeyName: "identity_edges_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_members: {
        Row: {
          added_at: string
          identifier_hash: string
          identifier_type: Database["public"]["Enums"]["identifier_type"]
          identity_id: string
          match_confidence: number
          matched_via: Json
        }
        Insert: {
          added_at?: string
          identifier_hash: string
          identifier_type: Database["public"]["Enums"]["identifier_type"]
          identity_id: string
          match_confidence: number
          matched_via?: Json
        }
        Update: {
          added_at?: string
          identifier_hash?: string
          identifier_type?: Database["public"]["Enums"]["identifier_type"]
          identity_id?: string
          match_confidence?: number
          matched_via?: Json
        }
        Relationships: [
          {
            foreignKeyName: "identity_members_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          identity_id: string
          merchant_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          identity_id: string
          merchant_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          identity_id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_notes_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_notes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_profiles: {
        Row: {
          avg_claim_days: number | null
          claim_rate: number | null
          claim_type_counts: Json
          fastest_claim_days: number | null
          first_seen_at: string | null
          identity_id: string
          last_seen_at: string | null
          merchant_count: number
          refreshed_at: string
          total_chargebacks: number
          total_claims: number
          total_orders: number
          total_refund_amount: number
        }
        Insert: {
          avg_claim_days?: number | null
          claim_rate?: number | null
          claim_type_counts?: Json
          fastest_claim_days?: number | null
          first_seen_at?: string | null
          identity_id: string
          last_seen_at?: string | null
          merchant_count?: number
          refreshed_at?: string
          total_chargebacks?: number
          total_claims?: number
          total_orders?: number
          total_refund_amount?: number
        }
        Update: {
          avg_claim_days?: number | null
          claim_rate?: number | null
          claim_type_counts?: Json
          fastest_claim_days?: number | null
          first_seen_at?: string | null
          identity_id?: string
          last_seen_at?: string | null
          merchant_count?: number
          refreshed_at?: string
          total_chargebacks?: number
          total_claims?: number
          total_orders?: number
          total_refund_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "identity_profiles_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_resolution_events: {
        Row: {
          actor: string
          created_at: string
          detail: Json
          event_type: string
          from_grade: Database["public"]["Enums"]["confidence_grade"] | null
          id: string
          identity_id: string
          to_grade: Database["public"]["Enums"]["confidence_grade"] | null
        }
        Insert: {
          actor?: string
          created_at?: string
          detail?: Json
          event_type: string
          from_grade?: Database["public"]["Enums"]["confidence_grade"] | null
          id?: string
          identity_id: string
          to_grade?: Database["public"]["Enums"]["confidence_grade"] | null
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: Json
          event_type?: string
          from_grade?: Database["public"]["Enums"]["confidence_grade"] | null
          id?: string
          identity_id?: string
          to_grade?: Database["public"]["Enums"]["confidence_grade"] | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_resolution_events_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_signals: {
        Row: {
          created_at: string
          id: string
          identifier_hash: string
          identifier_type: Database["public"]["Enums"]["identifier_type"]
          merchant_id: string
          observed_at: string
          source: Database["public"]["Enums"]["signal_source"]
          source_customer_id: string | null
          source_order_id: string | null
          source_ticket_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_hash: string
          identifier_type: Database["public"]["Enums"]["identifier_type"]
          merchant_id: string
          observed_at?: string
          source: Database["public"]["Enums"]["signal_source"]
          source_customer_id?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier_hash?: string
          identifier_type?: Database["public"]["Enums"]["identifier_type"]
          merchant_id?: string
          observed_at?: string
          source?: Database["public"]["Enums"]["signal_source"]
          source_customer_id?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_signals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_signals_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_signals_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_signals_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "source_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          merchant_id: string
          name: string | null
          rate_limit_per_minute: number
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          merchant_id: string
          name?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          merchant_id?: string
          name?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_api_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_credits: {
        Row: {
          cycle_reset_at: string
          last_reset_at: string | null
          merchant_id: string
          monthly_credits_remaining: number
          topup_credits_remaining: number
          updated_at: string
          usage_warning_sent_at: string | null
        }
        Insert: {
          cycle_reset_at: string
          last_reset_at?: string | null
          merchant_id: string
          monthly_credits_remaining?: number
          topup_credits_remaining?: number
          updated_at?: string
          usage_warning_sent_at?: string | null
        }
        Update: {
          cycle_reset_at?: string
          last_reset_at?: string | null
          merchant_id?: string
          monthly_credits_remaining?: number
          topup_credits_remaining?: number
          updated_at?: string
          usage_warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_v2_mcred_merchant"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_identity_state: {
        Row: {
          created_at: string
          display_email: string | null
          display_name: string | null
          identity_id: string
          investigation_status: string
          merchant_id: string
          on_watchlist: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          display_email?: string | null
          display_name?: string | null
          identity_id: string
          investigation_status?: string
          merchant_id: string
          on_watchlist?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          display_email?: string | null
          display_name?: string | null
          identity_id?: string
          investigation_status?: string
          merchant_id?: string
          on_watchlist?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_identity_state_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_identity_state_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          context_credits_monthly: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          downgrade_to_plan_id: string | null
          grace_period_ends_at: string | null
          id: string
          merchant_id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          context_credits_monthly?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          downgrade_to_plan_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          merchant_id: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          context_credits_monthly?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          downgrade_to_plan_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          merchant_id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_v2_msub_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_v2_msub_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      merchant_users: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_status: Database["public"]["Enums"]["invite_status"]
          invited_by: string | null
          invited_email: string
          merchant_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: Database["public"]["Enums"]["invite_status"]
          invited_by?: string | null
          invited_email: string
          merchant_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: Database["public"]["Enums"]["invite_status"]
          invited_by?: string | null
          invited_email?: string
          merchant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_users_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          business_name: string | null
          id: string
          is_demo: boolean
          is_internal: boolean
          monthly_order_volume: string | null
          name: string
          platform: string | null
          primary_fraud_concern: string | null
          setup_complete: boolean | null
          user_id: string | null
          settings: Json
          invite_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          business_name?: string | null
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          monthly_order_volume?: string | null
          name: string
          platform?: string | null
          primary_fraud_concern?: string | null
          setup_complete?: boolean | null
          user_id?: string | null
          settings?: Json
          invite_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          business_name?: string | null
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          monthly_order_volume?: string | null
          name?: string
          platform?: string | null
          primary_fraud_concern?: string | null
          setup_complete?: boolean | null
          user_id?: string | null
          settings?: Json
          invite_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      migration_orphans: {
        Row: {
          created_at: string
          detail: Json
          id: number
          phase: string
          reason: string
          source_key: string
          source_table: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: number
          phase: string
          reason: string
          source_key: string
          source_table: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: number
          phase?: string
          reason?: string
          source_key?: string
          source_table?: string
        }
        Relationships: []
      }
      network_access_log: {
        Row: {
          created_at: string
          id: string
          k_anonymity_satisfied: boolean
          matched_identity_count: number
          merchant_id: string
          queried_hashes: string[]
          request_ip: unknown
        }
        Insert: {
          created_at?: string
          id?: string
          k_anonymity_satisfied: boolean
          matched_identity_count?: number
          merchant_id: string
          queried_hashes: string[]
          request_ip?: unknown
        }
        Update: {
          created_at?: string
          id?: string
          k_anonymity_satisfied?: boolean
          matched_identity_count?: number
          merchant_id?: string
          queried_hashes?: string[]
          request_ip?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "network_access_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          credits_monthly: number | null
          name: string
          plan_id: string
          price_gbp: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string
          credits_monthly?: number | null
          name: string
          plan_id: string
          price_gbp?: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string
          credits_monthly?: number | null
          name?: string
          plan_id?: string
          price_gbp?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      processed_webhooks: {
        Row: {
          attempts: number
          idempotency_key: string
          last_error: string | null
          processed_at: string
          provider: string
          status: string
          store_key: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          idempotency_key: string
          last_error?: string | null
          processed_at?: string
          provider: string
          status?: string
          store_key?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          idempotency_key?: string
          last_error?: string | null
          processed_at?: string
          provider?: string
          status?: string
          store_key?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      source_addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          kind: string
          line1: string | null
          line2: string | null
          merchant_id: string
          normalized_full: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          source_customer_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          kind: string
          line1?: string | null
          line2?: string | null
          merchant_id: string
          normalized_full?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          source_customer_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          kind?: string
          line1?: string | null
          line2?: string | null
          merchant_id?: string
          normalized_full?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          source_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_addresses_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_addresses_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      source_customers: {
        Row: {
          account_created_at: string | null
          connection_id: string | null
          created_at: string
          email: string | null
          external_id: string
          first_name: string | null
          id: string
          last_name: string | null
          linked_platform_customer_external_id: string | null
          merchant_id: string
          note: string | null
          orders_count: number | null
          other_emails: Json
          phone: string | null
          raw_metadata: Json
          source: Database["public"]["Enums"]["signal_source"]
          tags: Json
          total_spent: number | null
          updated_at: string
          verified_email: boolean | null
        }
        Insert: {
          account_created_at?: string | null
          connection_id?: string | null
          created_at?: string
          email?: string | null
          external_id: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_platform_customer_external_id?: string | null
          merchant_id: string
          note?: string | null
          orders_count?: number | null
          other_emails?: Json
          phone?: string | null
          raw_metadata?: Json
          source: Database["public"]["Enums"]["signal_source"]
          tags?: Json
          total_spent?: number | null
          updated_at?: string
          verified_email?: boolean | null
        }
        Update: {
          account_created_at?: string | null
          connection_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_platform_customer_external_id?: string | null
          merchant_id?: string
          note?: string | null
          orders_count?: number | null
          other_emails?: Json
          phone?: string | null
          raw_metadata?: Json
          source?: Database["public"]["Enums"]["signal_source"]
          tags?: Json
          total_spent?: number | null
          updated_at?: string
          verified_email?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "source_customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      source_disputes: {
        Row: {
          amount: number | null
          currency: string | null
          dispute_type: string | null
          external_id: string
          finalized_at: string | null
          id: string
          ingested_at: string
          initiated_at: string | null
          merchant_id: string
          reason: string | null
          source_order_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          dispute_type?: string | null
          external_id: string
          finalized_at?: string | null
          id?: string
          ingested_at?: string
          initiated_at?: string | null
          merchant_id: string
          reason?: string | null
          source_order_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          currency?: string | null
          dispute_type?: string | null
          external_id?: string
          finalized_at?: string | null
          id?: string
          ingested_at?: string
          initiated_at?: string | null
          merchant_id?: string
          reason?: string | null
          source_order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_disputes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_disputes_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      source_fulfillments: {
        Row: {
          external_id: string
          id: string
          ingested_at: string
          merchant_id: string
          occurred_at: string | null
          shipment_status: string | null
          source_order_id: string
          status: string | null
          tracking_company: string | null
          tracking_number: string | null
          updated_at_source: string | null
        }
        Insert: {
          external_id: string
          id?: string
          ingested_at?: string
          merchant_id: string
          occurred_at?: string | null
          shipment_status?: string | null
          source_order_id: string
          status?: string | null
          tracking_company?: string | null
          tracking_number?: string | null
          updated_at_source?: string | null
        }
        Update: {
          external_id?: string
          id?: string
          ingested_at?: string
          merchant_id?: string
          occurred_at?: string | null
          shipment_status?: string | null
          source_order_id?: string
          status?: string | null
          tracking_company?: string | null
          tracking_number?: string | null
          updated_at_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_fulfillments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_fulfillments_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      source_orders: {
        Row: {
          accept_language: string | null
          billing_address_id: string | null
          browser_ip: unknown
          cancel_reason: string | null
          cancelled_at: string | null
          candidate_cluster_id: string | null
          card_last4: string | null
          cluster_id: string | null
          connection_id: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          dismissed_by_merchant: boolean | null
          discount_codes: Json
          email: string | null
          external_id: string
          fraud_flags: Json | null
          financial_status: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state: Database["public"]["Enums"]["fulfillment_state"]
          id: string
          identity_confidence_grade: string | null
          identity_match_grade: string | null
          identity_score: number | null
          identity_signals: Json | null
          ingested_at: string
          job_id: string | null
          landing_site: string | null
          line_items_count: number | null
          match_score: number | null
          match_status: string | null
          merchant_id: string
          note: string | null
          order_id: string | null
          order_value: number | string | null
          order_number: string | null
          payment_gateway: string | null
          phone: string | null
          placed_at: string | null
          processed_at: string | null
          raw_payload_hash: string | null
          referring_site: string | null
          refund_reason: string | null
          shipping_address_id: string | null
          signals_matched: string[] | null
          behavioural_flags: string[] | null
          source: Database["public"]["Enums"]["signal_source"]
          source_customer_id: string | null
          source_name: string | null
          subtotal_price: number | null
          tags: Json
          total_discounts: number | null
          total_price: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          accept_language?: string | null
          billing_address_id?: string | null
          browser_ip?: unknown
          cancel_reason?: string | null
          cancelled_at?: string | null
          candidate_cluster_id?: string | null
          card_last4?: string | null
          cluster_id?: string | null
          connection_id?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dismissed_by_merchant?: boolean | null
          discount_codes?: Json
          email?: string | null
          external_id: string
          fraud_flags?: Json | null
          financial_status?: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          identity_confidence_grade?: string | null
          identity_match_grade?: string | null
          identity_score?: number | null
          identity_signals?: Json | null
          ingested_at?: string
          job_id?: string | null
          landing_site?: string | null
          line_items_count?: number | null
          match_score?: number | null
          match_status?: string | null
          merchant_id: string
          note?: string | null
          order_id?: string | null
          order_value?: number | string | null
          order_number?: string | null
          payment_gateway?: string | null
          phone?: string | null
          placed_at?: string | null
          processed_at?: string | null
          raw_payload_hash?: string | null
          referring_site?: string | null
          refund_reason?: string | null
          shipping_address_id?: string | null
          signals_matched?: string[] | null
          behavioural_flags?: string[] | null
          source: Database["public"]["Enums"]["signal_source"]
          source_customer_id?: string | null
          source_name?: string | null
          subtotal_price?: number | null
          tags?: Json
          total_discounts?: number | null
          total_price?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          accept_language?: string | null
          billing_address_id?: string | null
          browser_ip?: unknown
          cancel_reason?: string | null
          cancelled_at?: string | null
          candidate_cluster_id?: string | null
          card_last4?: string | null
          cluster_id?: string | null
          connection_id?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          dismissed_by_merchant?: boolean | null
          discount_codes?: Json
          email?: string | null
          external_id?: string
          fraud_flags?: Json | null
          financial_status?: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          identity_confidence_grade?: string | null
          identity_match_grade?: string | null
          identity_score?: number | null
          identity_signals?: Json | null
          ingested_at?: string
          job_id?: string | null
          landing_site?: string | null
          line_items_count?: number | null
          match_score?: number | null
          match_status?: string | null
          merchant_id?: string
          note?: string | null
          order_id?: string | null
          order_value?: number | string | null
          order_number?: string | null
          payment_gateway?: string | null
          phone?: string | null
          placed_at?: string | null
          processed_at?: string | null
          raw_payload_hash?: string | null
          referring_site?: string | null
          refund_reason?: string | null
          shipping_address_id?: string | null
          signals_matched?: string[] | null
          behavioural_flags?: string[] | null
          source?: Database["public"]["Enums"]["signal_source"]
          source_customer_id?: string | null
          source_name?: string | null
          subtotal_price?: number | null
          tags?: Json
          total_discounts?: number | null
          total_price?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "source_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "store_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "source_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_orders_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      source_refunds: {
        Row: {
          amount: number | null
          currency: string | null
          external_id: string
          id: string
          ingested_at: string
          is_full_refund: boolean | null
          merchant_id: string
          raw_payload_hash: string | null
          reason: string | null
          refunded_at: string | null
          source_order_id: string
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          external_id: string
          id?: string
          ingested_at?: string
          is_full_refund?: boolean | null
          merchant_id: string
          raw_payload_hash?: string | null
          reason?: string | null
          refunded_at?: string | null
          source_order_id: string
        }
        Update: {
          amount?: number | null
          currency?: string | null
          external_id?: string
          id?: string
          ingested_at?: string
          is_full_refund?: boolean | null
          merchant_id?: string
          raw_payload_hash?: string | null
          reason?: string | null
          refunded_at?: string | null
          source_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_refunds_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_refunds_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ticket_events: {
        Row: {
          actor_type: string | null
          created_at: string
          event_type: string
          extracted_identifiers: Json
          id: string
          merchant_id: string
          metadata: Json
          occurred_at: string | null
          raw_payload_hash: string | null
          source_ticket_id: string
          summary: string | null
        }
        Insert: {
          actor_type?: string | null
          created_at?: string
          event_type: string
          extracted_identifiers?: Json
          id?: string
          merchant_id: string
          metadata?: Json
          occurred_at?: string | null
          raw_payload_hash?: string | null
          source_ticket_id: string
          summary?: string | null
        }
        Update: {
          actor_type?: string | null
          created_at?: string
          event_type?: string
          extracted_identifiers?: Json
          id?: string
          merchant_id?: string
          metadata?: Json
          occurred_at?: string | null
          raw_payload_hash?: string | null
          source_ticket_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_ticket_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_ticket_events_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "source_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_tickets: {
        Row: {
          channel: Database["public"]["Enums"]["ticket_channel"]
          closed_at_provider: string | null
          connection_id: string | null
          created_at_provider: string | null
          customer_reply_count: number | null
          external_id: string
          external_url: string | null
          id: string
          ingested_at: string
          is_spam: boolean | null
          linked_order_external_ids: Json
          merchant_id: string
          message_count: number | null
          opened_at_provider: string | null
          provider: Database["public"]["Enums"]["helpdesk_kind"]
          raw_payload_hash: string | null
          satisfaction_score: number | null
          source_customer_id: string | null
          status: string | null
          subject: string | null
          tags: Json
          updated_at: string
          updated_at_provider: string | null
          was_reopened: boolean | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["ticket_channel"]
          closed_at_provider?: string | null
          connection_id?: string | null
          created_at_provider?: string | null
          customer_reply_count?: number | null
          external_id: string
          external_url?: string | null
          id?: string
          ingested_at?: string
          is_spam?: boolean | null
          linked_order_external_ids?: Json
          merchant_id: string
          message_count?: number | null
          opened_at_provider?: string | null
          provider: Database["public"]["Enums"]["helpdesk_kind"]
          raw_payload_hash?: string | null
          satisfaction_score?: number | null
          source_customer_id?: string | null
          status?: string | null
          subject?: string | null
          tags?: Json
          updated_at?: string
          updated_at_provider?: string | null
          was_reopened?: boolean | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["ticket_channel"]
          closed_at_provider?: string | null
          connection_id?: string | null
          created_at_provider?: string | null
          customer_reply_count?: number | null
          external_id?: string
          external_url?: string | null
          id?: string
          ingested_at?: string
          is_spam?: boolean | null
          linked_order_external_ids?: Json
          merchant_id?: string
          message_count?: number | null
          opened_at_provider?: string | null
          provider?: Database["public"]["Enums"]["helpdesk_kind"]
          raw_payload_hash?: string | null
          satisfaction_score?: number | null
          source_customer_id?: string | null
          status?: string | null
          subject?: string | null
          tags?: Json
          updated_at?: string
          updated_at_provider?: string | null
          was_reopened?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "source_tickets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_tickets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_tickets_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_connections: {
        Row: {
          created_at: string
          credentials_encrypted: string
          id: string
          installed_at: string
          last_error: string | null
          last_sync_at: string | null
          merchant_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          scopes: Json
          status: Database["public"]["Enums"]["connection_status"]
          store_key: string
          store_url: string | null
          uninstalled_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted: string
          id?: string
          installed_at?: string
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id: string
          platform: Database["public"]["Enums"]["platform_kind"]
          scopes?: Json
          status?: Database["public"]["Enums"]["connection_status"]
          store_key: string
          store_url?: string | null
          uninstalled_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string
          id?: string
          installed_at?: string
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id?: string
          platform?: Database["public"]["Enums"]["platform_kind"]
          scopes?: Json
          status?: Database["public"]["Enums"]["connection_status"]
          store_key?: string
          store_url?: string | null
          uninstalled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_connections_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_job_chunks: {
        Row: {
          chunk_index: number
          claimed_at: string | null
          completed_at: string | null
          id: string
          job_id: string
          last_error: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
        }
        Insert: {
          chunk_index: number
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          job_id: string
          last_error?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
        }
        Update: {
          chunk_index?: number
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          job_id?: string
          last_error?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sync_job_chunks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          column_map: Json | null
          completed_at: string | null
          created_at: string
          error_log: Json
          failed_rows: number
          file_hash: string | null
          finalize_claimed_at: string | null
          hidden: boolean
          id: string
          job_kind: string
          label: string | null
          merchant_id: string
          processed_rows: number
          progress_message: string | null
          progress_pct: number | null
          source: Database["public"]["Enums"]["signal_source"] | null
          status: Database["public"]["Enums"]["sync_job_status"]
          storage_path: string | null
          total_rows: number | null
          updated_at: string
        }
        Insert: {
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          error_log?: Json
          failed_rows?: number
          file_hash?: string | null
          finalize_claimed_at?: string | null
          hidden?: boolean
          id?: string
          job_kind: string
          label?: string | null
          merchant_id: string
          processed_rows?: number
          progress_message?: string | null
          progress_pct?: number | null
          source?: Database["public"]["Enums"]["signal_source"] | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          storage_path?: string | null
          total_rows?: number | null
          updated_at?: string
        }
        Update: {
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          error_log?: Json
          failed_rows?: number
          file_hash?: string | null
          finalize_claimed_at?: string | null
          hidden?: boolean
          id?: string
          job_kind?: string
          label?: string | null
          merchant_id?: string
          processed_rows?: number
          progress_message?: string | null
          progress_pct?: number | null
          source?: Database["public"]["Enums"]["signal_source"] | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          storage_path?: string | null
          total_rows?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_job_progress: {
        Args: {
          p_failed_delta?: number
          p_job_id: string
          p_processed_delta: number
        }
        Returns: undefined
      }
      ingest_identity_observations: {
        Args: { p_edges: Json; p_merchant_id: string; p_signals: Json }
        Returns: undefined
      }
      bulk_upsert_identity_identifiers: {
        Args: {
          p_identifiers: Json
          p_source_provider: string
        }
        Returns: undefined
      }
      bulk_upsert_identifier_co_occurrence_edges: {
        Args: {
          p_edges: Json
          p_merchant_id: string
          p_source_provider: string
        }
        Returns: undefined
      }
      is_merchant_member: { Args: { p_merchant_id: string }; Returns: boolean }
      lookup_network_identity: {
        Args: {
          p_identifier_hashes: Json
          p_merchant_id: string
          p_request_ip?: unknown
        }
        Returns: {
          claim_rate: number
          claim_type_counts: Json
          confidence_grade: Database["public"]["Enums"]["confidence_grade"]
          confidence_score: number
          fastest_claim_days: number
          first_seen_at: string
          identity_id: string
          last_seen_at: string
          merchant_count: number
          total_chargebacks: number
          total_claims: number
          total_orders: number
        }[]
      }
    }
    Enums: {
      claim_decision:
        | "approved"
        | "denied"
        | "escalated"
        | "partial_refund"
        | "full_refund"
        | "chargeback_disputed"
        | "no_action"
      claim_detection_method:
        | "tag"
        | "keyword"
        | "manual"
        | "platform_dispute"
        | "platform_refund"
        | "model"
      claim_outcome:
        | "loss"
        | "recovered"
        | "pending"
        | "chargeback_won"
        | "chargeback_lost"
        | "customer_verified"
        | "suspected_fraud"
        | "legitimate"
      claim_status:
        | "new"
        | "evidence_needed"
        | "awaiting_customer_evidence"
        | "awaiting_carrier_response"
        | "awaiting_3pl_response"
        | "awaiting_supplier_response"
        | "ready_for_decision"
        | "manual_review"
        | "decision_recorded"
        | "recovery_opened"
        | "closed"
        | "pending"
        | "open"
        | "escalated"
        | "resolved_refunded"
        | "resolved_won"
        | "resolved_lost"
        | "resolved_denied"
        | "resolved_exchanged"
        | "voided"
        | "stale"
      claim_type:
        | "item_not_received"
        | "damaged"
        | "wrong_item"
        | "not_as_described"
        | "refund_request"
        | "chargeback"
        | "return_abuse"
        | "other"
      attribution_confidence: "high" | "medium" | "low" | "needs_more_evidence"
      loss_attribution:
        | "customer_claim"
        | "carrier_loss"
        | "carrier_damage"
        | "failed_delivery_evidence"
        | "warehouse_mispick"
        | "warehouse_missing_item"
        | "three_pl_late_dispatch"
        | "supplier_defect"
        | "packaging_failure"
        | "merchant_policy"
        | "unknown"
      recoverability:
        | "recoverable"
        | "possibly_recoverable"
        | "not_recoverable"
        | "needs_more_evidence"
        | "unknown"
      recovery_owner:
        | "carrier"
        | "three_pl"
        | "warehouse"
        | "supplier"
        | "merchant"
        | "unknown"
      requested_action:
        | "refund"
        | "reship"
        | "replacement"
        | "discount"
        | "store_credit"
        | "escalation"
        | "unknown"
      confidence_grade: "weak" | "possible" | "probable" | "definite"
      connection_status: "active" | "disabled" | "revoked" | "error"
      fulfillment_state:
        | "unfulfilled"
        | "partial"
        | "fulfilled"
        | "delivered"
        | "in_transit"
        | "failure"
        | "returned"
        | "unknown"
      helpdesk_kind: "gorgias" | "zendesk" | "freshdesk"
      identifier_type:
        | "email"
        | "email_root"
        | "phone"
        | "shipping_address"
        | "billing_address"
        | "address_unit"
        | "ip"
        | "name"
        | "payment_fingerprint"
        | "platform_customer_id"
        | "helpdesk_contact_id"
      invite_status: "pending" | "active" | "revoked"
      member_role: "owner" | "admin" | "analyst" | "viewer"
      order_financial_status:
        | "pending"
        | "authorized"
        | "paid"
        | "partially_paid"
        | "partially_refunded"
        | "refunded"
        | "voided"
        | "cancelled"
        | "unknown"
      platform_kind: "shopify" | "woocommerce" | "bigcommerce"
      signal_source:
        | "shopify"
        | "woocommerce"
        | "bigcommerce"
        | "gorgias"
        | "zendesk"
        | "freshdesk"
        | "csv"
        | "manual"
      sync_job_status: "pending" | "running" | "completed" | "failed"
      ticket_channel:
        | "email"
        | "chat"
        | "sms"
        | "phone"
        | "social"
        | "portal"
        | "api"
        | "bot"
        | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_decision: [
        "approved",
        "denied",
        "escalated",
        "partial_refund",
        "full_refund",
        "chargeback_disputed",
        "no_action",
      ],
      claim_detection_method: [
        "tag",
        "keyword",
        "manual",
        "platform_dispute",
        "platform_refund",
        "model",
      ],
      claim_outcome: [
        "loss",
        "recovered",
        "pending",
        "chargeback_won",
        "chargeback_lost",
        "customer_verified",
        "suspected_fraud",
        "legitimate",
      ],
      claim_status: [
        "new",
        "evidence_needed",
        "awaiting_customer_evidence",
        "awaiting_carrier_response",
        "awaiting_3pl_response",
        "awaiting_supplier_response",
        "ready_for_decision",
        "manual_review",
        "decision_recorded",
        "recovery_opened",
        "closed",
        "pending",
        "open",
        "escalated",
        "resolved_refunded",
        "resolved_won",
        "resolved_lost",
        "resolved_denied",
        "resolved_exchanged",
        "voided",
        "stale",
      ],
      claim_type: [
        "item_not_received",
        "damaged",
        "wrong_item",
        "not_as_described",
        "refund_request",
        "chargeback",
        "return_abuse",
        "other",
      ],
      attribution_confidence: ["high", "medium", "low", "needs_more_evidence"],
      loss_attribution: [
        "customer_claim",
        "carrier_loss",
        "carrier_damage",
        "failed_delivery_evidence",
        "warehouse_mispick",
        "warehouse_missing_item",
        "three_pl_late_dispatch",
        "supplier_defect",
        "packaging_failure",
        "merchant_policy",
        "unknown",
      ],
      recoverability: [
        "recoverable",
        "possibly_recoverable",
        "not_recoverable",
        "needs_more_evidence",
        "unknown",
      ],
      recovery_owner: [
        "carrier",
        "three_pl",
        "warehouse",
        "supplier",
        "merchant",
        "unknown",
      ],
      requested_action: [
        "refund",
        "reship",
        "replacement",
        "discount",
        "store_credit",
        "return_label",
        "investigation",
        "escalation",
        "unknown",
      ],
      confidence_grade: ["weak", "possible", "probable", "definite"],
      connection_status: ["active", "disabled", "revoked", "error"],
      fulfillment_state: [
        "unfulfilled",
        "partial",
        "fulfilled",
        "delivered",
        "in_transit",
        "failure",
        "returned",
        "unknown",
      ],
      helpdesk_kind: ["gorgias", "zendesk", "freshdesk"],
      identifier_type: [
        "email",
        "email_root",
        "phone",
        "shipping_address",
        "billing_address",
        "address_unit",
        "ip",
        "name",
        "payment_fingerprint",
        "platform_customer_id",
        "helpdesk_contact_id",
      ],
      invite_status: ["pending", "active", "revoked"],
      member_role: ["owner", "admin", "analyst", "viewer"],
      order_financial_status: [
        "pending",
        "authorized",
        "paid",
        "partially_paid",
        "partially_refunded",
        "refunded",
        "voided",
        "cancelled",
        "unknown",
      ],
      platform_kind: ["shopify", "woocommerce", "bigcommerce"],
      signal_source: [
        "shopify",
        "woocommerce",
        "bigcommerce",
        "gorgias",
        "zendesk",
        "freshdesk",
        "csv",
        "manual",
      ],
      sync_job_status: ["pending", "running", "completed", "failed"],
      ticket_channel: [
        "email",
        "chat",
        "sms",
        "phone",
        "social",
        "portal",
        "api",
        "bot",
        "unknown",
      ],
    },
  },
} as const
