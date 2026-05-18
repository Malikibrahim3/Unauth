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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          created_at: string
          id: string
          identity_id: string | null
          k_anonymity_satisfied: boolean
          lookup_type: string | null
          matched_merchant_count: number | null
          merchant_id: string
          queried_hashes: string[] | null
          query_type: string
          request_ip: string | null
          result_returned: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identity_id?: string | null
          k_anonymity_satisfied: boolean
          lookup_type?: string | null
          matched_merchant_count?: number | null
          merchant_id: string
          queried_hashes?: string[] | null
          query_type?: string
          request_ip?: string | null
          result_returned: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identity_id?: string | null
          k_anonymity_satisfied?: boolean
          lookup_type?: string | null
          matched_merchant_count?: number | null
          merchant_id?: string
          queried_hashes?: string[] | null
          query_type?: string
          request_ip?: string | null
          result_returned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_transactions: {
        Row: {
          account_created_at: string | null
          behavioural_flags: Json
          billing_address: string | null
          candidate_cluster_id: string | null
          card_last4: string | null
          ce3_eligible: boolean
          ce3_qualifying_transactions: Json
          changed_datapoints: Json
          chargeback_filed: boolean | null
          cluster_id: string | null
          confirmed_identity_id: string | null
          context_flags: Json
          context_summary: string | null
          customer_email: string | null
          customer_name: string | null
          delivery_status: string | null
          device_ip: string | null
          dismissed_by_merchant: boolean
          engine_version_id: string | null
          evidence_summary: string | null
          false_positive_reported: boolean
          false_positive_reported_at: string | null
          feedback_at: string | null
          feedback_outcome: string | null
          fraud_flags: Json
          id: string
          identity_confidence_grade: string | null
          identity_evidence: Json
          identity_match_grade: string | null
          identity_match_score: number | null
          identity_score: number | null
          job_id: string
          match_score: number
          match_status: string
          matched_datapoints: Json
          order_id: string
          order_value: number | null
          payment_method: string | null
          previous_order_count: number | null
          processed_at: string
          recommended_action: string | null
          refund_claimed: boolean | null
          refund_reason: string | null
          risk_level: string
          shipping_address: string | null
          signals_matched: Json
        }
        Insert: {
          account_created_at?: string | null
          behavioural_flags?: Json
          billing_address?: string | null
          candidate_cluster_id?: string | null
          card_last4?: string | null
          ce3_eligible?: boolean
          ce3_qualifying_transactions?: Json
          changed_datapoints?: Json
          chargeback_filed?: boolean | null
          cluster_id?: string | null
          confirmed_identity_id?: string | null
          context_flags?: Json
          context_summary?: string | null
          customer_email?: string | null
          customer_name?: string | null
          delivery_status?: string | null
          device_ip?: string | null
          dismissed_by_merchant?: boolean
          engine_version_id?: string | null
          evidence_summary?: string | null
          false_positive_reported?: boolean
          false_positive_reported_at?: string | null
          feedback_at?: string | null
          feedback_outcome?: string | null
          fraud_flags?: Json
          id?: string
          identity_confidence_grade?: string | null
          identity_evidence?: Json
          identity_match_grade?: string | null
          identity_match_score?: number | null
          identity_score?: number | null
          job_id: string
          match_score?: number
          match_status?: string
          matched_datapoints?: Json
          order_id: string
          order_value?: number | null
          payment_method?: string | null
          previous_order_count?: number | null
          processed_at?: string
          recommended_action?: string | null
          refund_claimed?: boolean | null
          refund_reason?: string | null
          risk_level?: string
          shipping_address?: string | null
          signals_matched?: Json
        }
        Update: {
          account_created_at?: string | null
          behavioural_flags?: Json
          billing_address?: string | null
          candidate_cluster_id?: string | null
          card_last4?: string | null
          ce3_eligible?: boolean
          ce3_qualifying_transactions?: Json
          changed_datapoints?: Json
          chargeback_filed?: boolean | null
          cluster_id?: string | null
          confirmed_identity_id?: string | null
          context_flags?: Json
          context_summary?: string | null
          customer_email?: string | null
          customer_name?: string | null
          delivery_status?: string | null
          device_ip?: string | null
          dismissed_by_merchant?: boolean
          engine_version_id?: string | null
          evidence_summary?: string | null
          false_positive_reported?: boolean
          false_positive_reported_at?: string | null
          feedback_at?: string | null
          feedback_outcome?: string | null
          fraud_flags?: Json
          id?: string
          identity_confidence_grade?: string | null
          identity_evidence?: Json
          identity_match_grade?: string | null
          identity_match_score?: number | null
          identity_score?: number | null
          job_id?: string
          match_score?: number
          match_status?: string
          matched_datapoints?: Json
          order_id?: string
          order_value?: number | null
          payment_method?: string | null
          previous_order_count?: number | null
          processed_at?: string
          recommended_action?: string | null
          refund_claimed?: boolean | null
          refund_reason?: string | null
          risk_level?: string
          shipping_address?: string | null
          signals_matched?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_transactions_engine_version_id_fkey"
            columns: ["engine_version_id"]
            isOneToOne: false
            referencedRelation: "engine_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_upload_queue: {
        Row: {
          column_map: Json | null
          completed_at: string | null
          created_at: string
          id: string
          job_id: string
          merchant_id: string
          started_at: string | null
          status: string
          storage_path: string
        }
        Insert: {
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          merchant_id: string
          started_at?: string | null
          status?: string
          storage_path: string
        }
        Update: {
          column_map?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          merchant_id?: string
          started_at?: string | null
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_upload_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity_log: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          merchant_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          merchant_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          merchant_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          body: string
          created_at: string | null
          customer_profile_id: string | null
          deleted_by_merchant: boolean
          email_hash: string | null
          id: string
          merchant_id: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          customer_profile_id?: string | null
          deleted_by_merchant?: boolean
          email_hash?: string | null
          id?: string
          merchant_id: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          customer_profile_id?: string | null
          deleted_by_merchant?: boolean
          email_hash?: string | null
          id?: string
          merchant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profile_audit_appearances: {
        Row: {
          appeared_at: string
          audit_id: string
          flags_at_time: Json
          id: string
          profile_id: string
          score_at_time: number
          transaction_id: string | null
        }
        Insert: {
          appeared_at?: string
          audit_id: string
          flags_at_time?: Json
          id?: string
          profile_id: string
          score_at_time?: number
          transaction_id?: string | null
        }
        Update: {
          appeared_at?: string
          audit_id?: string
          flags_at_time?: Json
          id?: string
          profile_id?: string
          score_at_time?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profile_audit_appearances_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profile_audit_appearances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profile_audit_appearances_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "audit_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          addresses: Json
          avg_claim_days: number | null
          card_last4s: Json
          emails: Json
          false_positive_reported: boolean
          fastest_claim_days: number | null
          first_seen: string
          fraud_flags: Json
          id: string
          identity_cluster_id: string | null
          identity_confidence_grade: string | null
          identity_signals_summary: Json
          identity_status: string | null
          investigation_status: string
          ips: Json
          last_audit_id: string | null
          last_seen: string
          manually_reviewed: boolean
          merchant_ids: Json
          merchant_notes: string | null
          names: Json
          on_watchlist: boolean
          phones: Json
          primary_email: string | null
          profile_confidence: number
          refund_acceleration_score: number
          refund_rate: number
          refund_timestamps: Json
          risk_level: string
          risk_score: number
          total_chargebacks: number
          total_merchants_seen_at: number
          total_orders: number
          total_refund_claims: number
        }
        Insert: {
          addresses?: Json
          avg_claim_days?: number | null
          card_last4s?: Json
          emails?: Json
          false_positive_reported?: boolean
          fastest_claim_days?: number | null
          first_seen?: string
          fraud_flags?: Json
          id?: string
          identity_cluster_id?: string | null
          identity_confidence_grade?: string | null
          identity_signals_summary?: Json
          identity_status?: string | null
          investigation_status?: string
          ips?: Json
          last_audit_id?: string | null
          last_seen?: string
          manually_reviewed?: boolean
          merchant_ids?: Json
          merchant_notes?: string | null
          names?: Json
          on_watchlist?: boolean
          phones?: Json
          primary_email?: string | null
          profile_confidence?: number
          refund_acceleration_score?: number
          refund_rate?: number
          refund_timestamps?: Json
          risk_level?: string
          risk_score?: number
          total_chargebacks?: number
          total_merchants_seen_at?: number
          total_orders?: number
          total_refund_claims?: number
        }
        Update: {
          addresses?: Json
          avg_claim_days?: number | null
          card_last4s?: Json
          emails?: Json
          false_positive_reported?: boolean
          fastest_claim_days?: number | null
          first_seen?: string
          fraud_flags?: Json
          id?: string
          identity_cluster_id?: string | null
          identity_confidence_grade?: string | null
          identity_signals_summary?: Json
          identity_status?: string | null
          investigation_status?: string
          ips?: Json
          last_audit_id?: string | null
          last_seen?: string
          manually_reviewed?: boolean
          merchant_ids?: Json
          merchant_notes?: string | null
          names?: Json
          on_watchlist?: boolean
          phones?: Json
          primary_email?: string | null
          profile_confidence?: number
          refund_acceleration_score?: number
          refund_rate?: number
          refund_timestamps?: Json
          risk_level?: string
          risk_score?: number
          total_chargebacks?: number
          total_merchants_seen_at?: number
          total_orders?: number
          total_refund_claims?: number
        }
        Relationships: []
      }
      engine_versions: {
        Row: {
          deployed_at: string
          id: string
          notes: string | null
          signal_weights: Json
          thresholds: Json
          version_number: string
        }
        Insert: {
          deployed_at?: string
          id?: string
          notes?: string | null
          signal_weights: Json
          thresholds: Json
          version_number: string
        }
        Update: {
          deployed_at?: string
          id?: string
          notes?: string | null
          signal_weights?: Json
          thresholds?: Json
          version_number?: string
        }
        Relationships: []
      }
      eval_history: {
        Row: {
          dataset_path: string
          engine_version: string | null
          f1_score: number | null
          full_report: Json | null
          id: string
          labelled_count: number | null
          precision_score: number | null
          recall_score: number | null
          row_count: number | null
          run_at: string
        }
        Insert: {
          dataset_path: string
          engine_version?: string | null
          f1_score?: number | null
          full_report?: Json | null
          id?: string
          labelled_count?: number | null
          precision_score?: number | null
          recall_score?: number | null
          row_count?: number | null
          run_at?: string
        }
        Update: {
          dataset_path?: string
          engine_version?: string | null
          f1_score?: number | null
          full_report?: Json | null
          id?: string
          labelled_count?: number | null
          precision_score?: number | null
          recall_score?: number | null
          row_count?: number | null
          run_at?: string
        }
        Relationships: []
      }
      evidence_packages: {
        Row: {
          ce3_eligible: boolean | null
          ce3_prior_transactions: Json | null
          ce3_qualifying_signals: Json | null
          created_at: string | null
          cross_merchant_indicator: boolean | null
          customer_profile_id: string | null
          generated_at: string | null
          generated_for_order_id: string | null
          id: string
          merchant_id: string
          merchant_notes: string | null
          narrative_summary: string | null
          pdf_storage_path: string | null
          reference_number: string
          signal_snapshot: Json | null
        }
        Insert: {
          ce3_eligible?: boolean | null
          ce3_prior_transactions?: Json | null
          ce3_qualifying_signals?: Json | null
          created_at?: string | null
          cross_merchant_indicator?: boolean | null
          customer_profile_id?: string | null
          generated_at?: string | null
          generated_for_order_id?: string | null
          id?: string
          merchant_id: string
          merchant_notes?: string | null
          narrative_summary?: string | null
          pdf_storage_path?: string | null
          reference_number: string
          signal_snapshot?: Json | null
        }
        Update: {
          ce3_eligible?: boolean | null
          ce3_prior_transactions?: Json | null
          ce3_qualifying_signals?: Json | null
          created_at?: string | null
          cross_merchant_indicator?: boolean | null
          customer_profile_id?: string | null
          generated_at?: string | null
          generated_for_order_id?: string | null
          id?: string
          merchant_id?: string
          merchant_notes?: string | null
          narrative_summary?: string | null
          pdf_storage_path?: string | null
          reference_number?: string
          signal_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_packages_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_generated_for_order_id_fkey"
            columns: ["generated_for_order_id"]
            isOneToOne: false
            referencedRelation: "audit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_merchant_applications: {
        Row: {
          agreed_to_terms_at: string
          created_at: string
          created_by_user_id: string
          fraud_problem: string
          id: string
          internal_notified_at: string | null
          merchant_id: string
          monthly_order_volume: string
          monthly_refund_chargeback_volume: string | null
          status: string
          store_name: string
          updated_at: string
        }
        Insert: {
          agreed_to_terms_at: string
          created_at?: string
          created_by_user_id: string
          fraud_problem: string
          id?: string
          internal_notified_at?: string | null
          merchant_id: string
          monthly_order_volume: string
          monthly_refund_chargeback_volume?: string | null
          status?: string
          store_name: string
          updated_at?: string
        }
        Update: {
          agreed_to_terms_at?: string
          created_at?: string
          created_by_user_id?: string
          fraud_problem?: string
          id?: string
          internal_notified_at?: string | null
          merchant_id?: string
          monthly_order_volume?: string
          monthly_refund_chargeback_volume?: string | null
          status?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_merchant_applications_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_entities: {
        Row: {
          entity_type: string
          entity_value: string
          fastest_claim_days: number | null
          first_seen: string
          flagged_count: number
          id: string
          last_seen: string
          match_score_avg: number | null
          refund_acceleration_score: number | null
          refund_intervals_avg_days: number | null
          refund_timestamps: Json | null
          total_chargebacks: number
          total_merchants: number
          total_merchants_refunded_at: number | null
          total_orders: number
          total_refund_claims: number
        }
        Insert: {
          entity_type: string
          entity_value: string
          fastest_claim_days?: number | null
          first_seen?: string
          flagged_count?: number
          id?: string
          last_seen?: string
          match_score_avg?: number | null
          refund_acceleration_score?: number | null
          refund_intervals_avg_days?: number | null
          refund_timestamps?: Json | null
          total_chargebacks?: number
          total_merchants?: number
          total_merchants_refunded_at?: number | null
          total_orders?: number
          total_refund_claims?: number
        }
        Update: {
          entity_type?: string
          entity_value?: string
          fastest_claim_days?: number | null
          first_seen?: string
          flagged_count?: number
          id?: string
          last_seen?: string
          match_score_avg?: number | null
          refund_acceleration_score?: number | null
          refund_intervals_avg_days?: number | null
          refund_timestamps?: Json | null
          total_chargebacks?: number
          total_merchants?: number
          total_merchants_refunded_at?: number | null
          total_orders?: number
          total_refund_claims?: number
        }
        Relationships: []
      }
      fraud_entity_co_occurrences: {
        Row: {
          co_occurrence_count: number
          entity_a_type: string
          entity_a_value: string
          entity_b_type: string
          entity_b_value: string
          first_seen: string
          id: string
          last_seen: string
        }
        Insert: {
          co_occurrence_count?: number
          entity_a_type: string
          entity_a_value: string
          entity_b_type: string
          entity_b_value: string
          first_seen?: string
          id?: string
          last_seen?: string
        }
        Update: {
          co_occurrence_count?: number
          entity_a_type?: string
          entity_a_value?: string
          entity_b_type?: string
          entity_b_value?: string
          first_seen?: string
          id?: string
          last_seen?: string
        }
        Relationships: []
      }
      fraud_identity_clusters: {
        Row: {
          cluster_id: string
          confidence: number
          entity_type: string
          entity_value: string
          first_seen: string | null
          id: string
          last_seen: string | null
          match_reasons: Json
        }
        Insert: {
          cluster_id: string
          confidence: number
          entity_type: string
          entity_value: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          match_reasons?: Json
        }
        Update: {
          cluster_id?: string
          confidence?: number
          entity_type?: string
          entity_value?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          match_reasons?: Json
        }
        Relationships: []
      }
      identity_false_positive_reports: {
        Row: {
          cluster_id: string
          created_at: string
          evidence_snapshot: Json | null
          id: string
          reported_at: string
          reported_by_merchant_id: string
          reviewer_notes: string | null
          status: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          evidence_snapshot?: Json | null
          id?: string
          reported_at?: string
          reported_by_merchant_id: string
          reviewer_notes?: string | null
          status?: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          evidence_snapshot?: Json | null
          id?: string
          reported_at?: string
          reported_by_merchant_id?: string
          reviewer_notes?: string | null
          status?: string
        }
        Relationships: []
      }
      identity_transitions: {
        Row: {
          cluster_id: string
          from_status: string | null
          id: string
          score_after: number | null
          score_before: number | null
          to_status: string
          transitioned_at: string
          triggering_transaction_id: string | null
        }
        Insert: {
          cluster_id: string
          from_status?: string | null
          id?: string
          score_after?: number | null
          score_before?: number | null
          to_status: string
          transitioned_at?: string
          triggering_transaction_id?: string | null
        }
        Update: {
          cluster_id?: string
          from_status?: string | null
          id?: string
          score_after?: number | null
          score_before?: number | null
          to_status?: string
          transitioned_at?: string
          triggering_transaction_id?: string | null
        }
        Relationships: []
      }
      lookup_daily_counts: {
        Row: {
          count: number
          lookup_date: string
          merchant_id: string
        }
        Insert: {
          count?: number
          lookup_date?: string
          merchant_id: string
        }
        Update: {
          count?: number
          lookup_date?: string
          merchant_id?: string
        }
        Relationships: []
      }
      merchant_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_status: string
          invited_by: string | null
          invited_email: string
          merchant_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: string
          invited_by?: string | null
          invited_email: string
          merchant_id: string
          role?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_status?: string
          invited_by?: string | null
          invited_email?: string
          merchant_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey"
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
          default_column_map: Json | null
          id: string
          is_demo: boolean
          is_internal: boolean
          monthly_order_volume: string | null
          name: string
          platform: string | null
          primary_fraud_concern: string | null
          setup_complete: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_column_map?: Json | null
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          monthly_order_volume?: string | null
          name: string
          platform?: string | null
          primary_fraud_concern?: string | null
          setup_complete?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_column_map?: Json | null
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          monthly_order_volume?: string | null
          name?: string
          platform?: string | null
          primary_fraud_concern?: string | null
          setup_complete?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_metrics_snapshots: {
        Row: {
          active_merchants_30d: number | null
          audits_in_last_30d: number | null
          audits_with_cross_merchant_signal_30d: number | null
          created_at: string | null
          id: string
          identities_at_2_merchants: number | null
          identities_at_3plus_merchants: number | null
          network_inr_claim_rate: number | null
          network_refund_rate: number | null
          snapshot_date: string
          total_cross_merchant_matches_lifetime: number | null
          total_identities: number | null
          uploads_in_last_30d: number | null
        }
        Insert: {
          active_merchants_30d?: number | null
          audits_in_last_30d?: number | null
          audits_with_cross_merchant_signal_30d?: number | null
          created_at?: string | null
          id?: string
          identities_at_2_merchants?: number | null
          identities_at_3plus_merchants?: number | null
          network_inr_claim_rate?: number | null
          network_refund_rate?: number | null
          snapshot_date: string
          total_cross_merchant_matches_lifetime?: number | null
          total_identities?: number | null
          uploads_in_last_30d?: number | null
        }
        Update: {
          active_merchants_30d?: number | null
          audits_in_last_30d?: number | null
          audits_with_cross_merchant_signal_30d?: number | null
          created_at?: string | null
          id?: string
          identities_at_2_merchants?: number | null
          identities_at_3plus_merchants?: number | null
          network_inr_claim_rate?: number | null
          network_refund_rate?: number | null
          snapshot_date?: string
          total_cross_merchant_matches_lifetime?: number | null
          total_identities?: number | null
          uploads_in_last_30d?: number | null
        }
        Relationships: []
      }
      normalisation_learning: {
        Row: {
          confirmed_same: boolean
          created_at: string
          field_type: string
          id: string
          merchant_id: string | null
          similarity_at_time: number | null
          value_a: string
          value_b: string
        }
        Insert: {
          confirmed_same: boolean
          created_at?: string
          field_type: string
          id?: string
          merchant_id?: string | null
          similarity_at_time?: number | null
          value_a: string
          value_b: string
        }
        Update: {
          confirmed_same?: boolean
          created_at?: string
          field_type?: string
          id?: string
          merchant_id?: string | null
          similarity_at_time?: number | null
          value_a?: string
          value_b?: string
        }
        Relationships: []
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
          file_hash: string | null
          filename: string
          flagged_count: number | null
          has_ground_truth: boolean | null
          hidden_by_merchant: boolean
          id: string
          is_demo: boolean
          label: string | null
          merchant_id: string
          processed_rows: number
          progress_message: string
          progress_pct: number
          public_audit_id: string | null
          results_email_error: string | null
          results_email_sent_at: string | null
          started_at: string | null
          status: string
          total_rows: number
          updated_at: string
          upload_type: string
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
          file_hash?: string | null
          filename: string
          flagged_count?: number | null
          has_ground_truth?: boolean | null
          hidden_by_merchant?: boolean
          id?: string
          is_demo?: boolean
          label?: string | null
          merchant_id: string
          processed_rows?: number
          progress_message?: string
          progress_pct?: number
          public_audit_id?: string | null
          results_email_error?: string | null
          results_email_sent_at?: string | null
          started_at?: string | null
          status: string
          total_rows?: number
          updated_at?: string
          upload_type?: string
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
          file_hash?: string | null
          filename?: string
          flagged_count?: number | null
          has_ground_truth?: boolean | null
          hidden_by_merchant?: boolean
          id?: string
          is_demo?: boolean
          label?: string | null
          merchant_id?: string
          processed_rows?: number
          progress_message?: string
          progress_pct?: number
          public_audit_id?: string | null
          results_email_error?: string | null
          results_email_sent_at?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          upload_type?: string
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
        ]
      }
      public_audits: {
        Row: {
          account_created: boolean
          created_at: string
          csv_path: string | null
          deletion_scheduled_at: string | null
          id: string
          linked_merchant_id: string | null
          linked_user_id: string | null
          original_filename: string
          processing_job_id: string | null
          row_count: number | null
          status: string
          submitted_at: string
          submitted_email: string
          updated_at: string
        }
        Insert: {
          account_created?: boolean
          created_at?: string
          csv_path?: string | null
          deletion_scheduled_at?: string | null
          id?: string
          linked_merchant_id?: string | null
          linked_user_id?: string | null
          original_filename: string
          processing_job_id?: string | null
          row_count?: number | null
          status?: string
          submitted_at?: string
          submitted_email: string
          updated_at?: string
        }
        Update: {
          account_created?: boolean
          created_at?: string
          csv_path?: string | null
          deletion_scheduled_at?: string | null
          id?: string
          linked_merchant_id?: string | null
          linked_user_id?: string | null
          original_filename?: string
          processing_job_id?: string | null
          row_count?: number | null
          status?: string
          submitted_at?: string
          submitted_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_audits_linked_merchant_id_fkey"
            columns: ["linked_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_audits_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_performance: {
        Row: {
          false_negative_count: number
          false_positive_count: number
          id: string
          last_updated: string
          precision_score: number | null
          signal_name: string
          true_negative_count: number
          true_positive_count: number
          weight_adjustment: number
        }
        Insert: {
          false_negative_count?: number
          false_positive_count?: number
          id?: string
          last_updated?: string
          precision_score?: number | null
          signal_name: string
          true_negative_count?: number
          true_positive_count?: number
          weight_adjustment?: number
        }
        Update: {
          false_negative_count?: number
          false_positive_count?: number
          id?: string
          last_updated?: string
          precision_score?: number | null
          signal_name?: string
          true_negative_count?: number
          true_positive_count?: number
          weight_adjustment?: number
        }
        Relationships: []
      }
      user_action_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          created_at: string
          id: string
          merchant_id: string
          metadata: Json | null
          request_ip: string | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          created_at?: string
          id?: string
          merchant_id: string
          metadata?: Json | null
          request_ip?: string | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          merchant_id?: string
          metadata?: Json | null
          request_ip?: string | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_action_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_grants: {
        Row: {
          granted_at: string
          grantee_user_id: string
          grantor_user_id: string
          id: string
          merchant_id: string
          permission: string
          revoked: boolean
          revoked_at: string | null
        }
        Insert: {
          granted_at?: string
          grantee_user_id: string
          grantor_user_id: string
          id?: string
          merchant_id: string
          permission: string
          revoked?: boolean
          revoked_at?: string | null
        }
        Update: {
          granted_at?: string
          grantee_user_id?: string
          grantor_user_id?: string
          id?: string
          merchant_id?: string
          permission?: string
          revoked?: boolean
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_grants_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_appearances: {
        Row: {
          audit_id: string
          customer_profile_id: string
          first_seen_in_audit: string | null
          highest_grade: string | null
          id: string
          merchant_id: string
          reviewed_at: string | null
          transaction_count: number
        }
        Insert: {
          audit_id: string
          customer_profile_id: string
          first_seen_in_audit?: string | null
          highest_grade?: string | null
          id?: string
          merchant_id: string
          reviewed_at?: string | null
          transaction_count?: number
        }
        Update: {
          audit_id?: string
          customer_profile_id?: string
          first_seen_in_audit?: string | null
          highest_grade?: string | null
          id?: string
          merchant_id?: string
          reviewed_at?: string | null
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_appearances_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_appearances_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_appearances_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_entries: {
        Row: {
          added_at: string | null
          customer_profile_id: string | null
          display_email: string | null
          display_name: string | null
          email_hash: string | null
          id: string
          last_seen_at: string | null
          last_seen_risk: string | null
          merchant_id: string
          removed_by_merchant: boolean
        }
        Insert: {
          added_at?: string | null
          customer_profile_id?: string | null
          display_email?: string | null
          display_name?: string | null
          email_hash?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_risk?: string | null
          merchant_id: string
          removed_by_merchant?: boolean
        }
        Update: {
          added_at?: string | null
          customer_profile_id?: string | null
          display_email?: string | null
          display_name?: string | null
          email_hash?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_risk?: string | null
          merchant_id?: string
          removed_by_merchant?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_entries_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_upsert_co_occurrences: {
        Args: { p_pairs: Json }
        Returns: undefined
      }
      bulk_upsert_fraud_entities: {
        Args: { p_entities: Json }
        Returns: undefined
      }
      current_database_size_bytes: {
        Args: never
        Returns: {
          database_bytes: number
        }[]
      }
      generate_evidence_reference: { Args: never; Returns: string }
      increment_job_progress: {
        Args: {
          p_failed_delta: number
          p_job_id: string
          p_processed_delta: number
        }
        Returns: undefined
      }
      increment_lookup_count: {
        Args: { p_date: string; p_merchant_id: string }
        Returns: number
      }
      record_refund_claim: {
        Args: {
          p_claimed_at: string
          p_days_to_claim: number
          p_entity_type: string
          p_entity_value: string
        }
        Returns: undefined
      }
      record_signal_feedback: {
        Args: {
          p_all_signals: string[]
          p_fired: string[]
          p_outcome: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      search_customer_profiles: {
        Args: {
          p_address?: string
          p_card?: string
          p_email?: string
          p_ip?: string
          p_name?: string
        }
        Returns: {
          addresses: Json
          avg_claim_days: number
          card_last4s: Json
          emails: Json
          fastest_claim_days: number
          first_seen: string
          fraud_flags: Json
          id: string
          ips: Json
          last_audit_id: string
          last_seen: string
          manually_reviewed: boolean
          merchant_ids: Json
          merchant_notes: string
          names: Json
          on_watchlist: boolean
          phones: Json
          primary_email: string
          profile_confidence: number
          refund_acceleration_score: number
          refund_rate: number
          refund_timestamps: Json
          risk_level: string
          risk_score: number
          total_chargebacks: number
          total_merchants_seen_at: number
          total_orders: number
          total_refund_claims: number
        }[]
      }
      search_customer_profiles_batch: {
        Args: { p_cards?: string[]; p_emails?: string[]; p_ips?: string[] }
        Returns: {
          addresses: Json
          card_last4s: Json
          emails: Json
          fraud_flags: Json
          id: string
          ips: Json
          merchant_ids: Json
          names: Json
          primary_email: string
          refund_rate: number
          risk_level: string
          risk_score: number
          total_merchants_seen_at: number
          total_orders: number
          total_refund_claims: number
        }[]
      }
      seed_fraud_intelligence: {
        Args: never
        Returns: {
          addresses_seeded: number
          cards_seeded: number
          clusters_created: number
          emails_seeded: number
          ips_seeded: number
        }[]
      }
      update_fraud_entity_with_intelligence: {
        Args: {
          p_chargebacks_delta: number
          p_entity_type: string
          p_entity_value: string
          p_fastest_claim_days: number
          p_flagged_delta: number
          p_orders_delta: number
          p_refund_claims_delta: number
          p_refund_this_batch: boolean
          p_refund_timestamps: string[]
          p_score_avg: number
        }
        Returns: undefined
      }
      upsert_co_occurrence: {
        Args: {
          p_a_type: string
          p_a_value: string
          p_b_type: string
          p_b_value: string
          p_count_delta: number
        }
        Returns: undefined
      }
      upsert_fraud_entity: {
        Args: {
          p_chargeback: number
          p_entity_type: string
          p_entity_value: string
          p_flagged: number
          p_refund_claim: number
          p_score: number
        }
        Returns: undefined
      }
      upsert_fraud_entity_v2: {
        Args: {
          p_chargebacks_delta: number
          p_entity_type: string
          p_entity_value: string
          p_fastest_claim_days: number
          p_flagged_delta: number
          p_orders_delta: number
          p_refund_claims_delta: number
          p_refund_this_batch: boolean
          p_refund_timestamps: string[]
          p_score_avg: number
        }
        Returns: undefined
      }
      upsert_identity_v2: {
        Args: {
          p_email_hash: string
          p_is_inr: boolean
          p_is_refund: boolean
          p_merchant_id: string
          p_signals: Json
        }
        Returns: string
      }
      upsert_refund_pattern: {
        Args: {
          p_days_to_claim: number
          p_entity_type: string
          p_entity_value: string
          p_merchant_identifier: string
          p_refund_timestamp: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
