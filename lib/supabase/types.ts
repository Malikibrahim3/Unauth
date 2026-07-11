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
          query_type: string
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
      accountability_events: {
        Row: {
          actor_name: string | null
          actor_type: string
          claim_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          loss_source_id: string | null
          merchant_id: string
          metadata: Json
          recovery_task_id: string | null
        }
        Insert: {
          actor_name?: string | null
          actor_type?: string
          claim_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          loss_source_id?: string | null
          merchant_id: string
          metadata?: Json
          recovery_task_id?: string | null
        }
        Update: {
          actor_name?: string | null
          actor_type?: string
          claim_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          loss_source_id?: string | null
          merchant_id?: string
          metadata?: Json
          recovery_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountability_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_events_loss_source_id_fkey"
            columns: ["loss_source_id"]
            isOneToOne: false
            referencedRelation: "loss_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_events_recovery_task_id_fkey"
            columns: ["recovery_task_id"]
            isOneToOne: false
            referencedRelation: "recovery_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_clauses: {
        Row: {
          agreement_id: string
          approved: boolean
          clause_text: string
          clause_type: string
          confidence: string
          created_at: string
          extracted_value: Json
          id: string
          merchant_id: string
          page_number: number | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          source_location: string | null
        }
        Insert: {
          agreement_id: string
          approved?: boolean
          clause_text: string
          clause_type: string
          confidence?: string
          created_at?: string
          extracted_value?: Json
          id?: string
          merchant_id: string
          page_number?: number | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_location?: string | null
        }
        Update: {
          agreement_id?: string
          approved?: boolean
          clause_text?: string
          clause_type?: string
          confidence?: string
          created_at?: string
          extracted_value?: Json
          id?: string
          merchant_id?: string
          page_number?: number | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_clauses_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_clauses_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_rule_evaluations: {
        Row: {
          agreement_id: string | null
          agreement_rule_id: string | null
          claim_id: string
          created_at: string
          evaluation_summary: string | null
          id: string
          matched: boolean
          merchant_id: string
          result: Json | null
        }
        Insert: {
          agreement_id?: string | null
          agreement_rule_id?: string | null
          claim_id: string
          created_at?: string
          evaluation_summary?: string | null
          id?: string
          matched: boolean
          merchant_id: string
          result?: Json | null
        }
        Update: {
          agreement_id?: string | null
          agreement_rule_id?: string | null
          claim_id?: string
          created_at?: string
          evaluation_summary?: string | null
          id?: string
          matched?: boolean
          merchant_id?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agreement_rule_evaluations_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_rule_evaluations_agreement_rule_id_fkey"
            columns: ["agreement_rule_id"]
            isOneToOne: false
            referencedRelation: "agreement_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_rule_evaluations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_rule_evaluations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_rules: {
        Row: {
          agreement_id: string
          applies_to_claim_type: string
          clause_id: string | null
          conditions: Json
          counterparty_name: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          merchant_id: string
          priority: number
          result: Json
          rule_code: string
          rule_name: string
          rule_type: string
          status: string
          updated_at: string
        }
        Insert: {
          agreement_id: string
          applies_to_claim_type?: string
          clause_id?: string | null
          conditions: Json
          counterparty_name?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          merchant_id: string
          priority?: number
          result: Json
          rule_code: string
          rule_name: string
          rule_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_id?: string
          applies_to_claim_type?: string
          clause_id?: string | null
          conditions?: Json
          counterparty_name?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          merchant_id?: string
          priority?: number
          result?: Json
          rule_code?: string
          rule_name?: string
          rule_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_rules_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_rules_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "agreement_clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          agreement_type: string
          counterparty_name: string | null
          created_at: string
          document_name: string | null
          document_url: string | null
          effective_from: string | null
          effective_to: string | null
          file_mime_type: string | null
          file_size_bytes: number | null
          id: string
          merchant_id: string
          raw_text: string | null
          service_name: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          version_label: string | null
        }
        Insert: {
          agreement_type: string
          counterparty_name?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          effective_from?: string | null
          effective_to?: string | null
          file_mime_type?: string | null
          file_size_bytes?: number | null
          id?: string
          merchant_id: string
          raw_text?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version_label?: string | null
        }
        Update: {
          agreement_type?: string
          counterparty_name?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          effective_from?: string | null
          effective_to?: string | null
          file_mime_type?: string | null
          file_size_bytes?: number | null
          id?: string
          merchant_id?: string
          raw_text?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_minute_counts: {
        Row: {
          api_key_id: string
          count: number
          window_minute: number
        }
        Insert: {
          api_key_id: string
          count?: number
          window_minute: number
        }
        Update: {
          api_key_id?: string
          count?: number
          window_minute?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_key_minute_counts_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "merchant_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_customer_summaries: {
        Row: {
          audit_id: string
          customer_email: string | null
          customer_key: string
          customer_name: string | null
          first_seen: string | null
          highest_grade: string | null
          last_seen: string | null
          max_score: number
          merchant_id: string
          order_count: number
          total_spend: number
          updated_at: string
        }
        Insert: {
          audit_id: string
          customer_email?: string | null
          customer_key: string
          customer_name?: string | null
          first_seen?: string | null
          highest_grade?: string | null
          last_seen?: string | null
          max_score?: number
          merchant_id: string
          order_count?: number
          total_spend?: number
          updated_at?: string
        }
        Update: {
          audit_id?: string
          customer_email?: string | null
          customer_key?: string
          customer_name?: string | null
          first_seen?: string | null
          highest_grade?: string | null
          last_seen?: string | null
          max_score?: number
          merchant_id?: string
          order_count?: number
          total_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_customer_summaries_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_customer_summaries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_result_summaries: {
        Row: {
          audit_id: string
          customer_count: number
          definite_count: number
          estimated_exposure: number
          flagged_transactions: number
          linked_cluster_count: number
          merchant_id: string
          possible_count: number
          probable_count: number
          updated_at: string
          value_at_risk: number
          weak_count: number
        }
        Insert: {
          audit_id: string
          customer_count?: number
          definite_count?: number
          estimated_exposure?: number
          flagged_transactions?: number
          linked_cluster_count?: number
          merchant_id: string
          possible_count?: number
          probable_count?: number
          updated_at?: string
          value_at_risk?: number
          weak_count?: number
        }
        Update: {
          audit_id?: string
          customer_count?: number
          definite_count?: number
          estimated_exposure?: number
          flagged_transactions?: number
          linked_cluster_count?: number
          merchant_id?: string
          possible_count?: number
          probable_count?: number
          updated_at?: string
          value_at_risk?: number
          weak_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_result_summaries_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: true
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_result_summaries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      case_clarification_requests: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          merchant_id: string
          request_summary: string
          requested_evidence: string[]
          response_received_at: string | null
          response_summary: string | null
          sent_at: string | null
          source_channel: string | null
          status: string
          support_payout_case_id: string
          target_name: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          merchant_id: string
          request_summary: string
          requested_evidence?: string[]
          response_received_at?: string | null
          response_summary?: string | null
          sent_at?: string | null
          source_channel?: string | null
          status?: string
          support_payout_case_id: string
          target_name?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          merchant_id?: string
          request_summary?: string
          requested_evidence?: string[]
          response_received_at?: string | null
          response_summary?: string | null
          sent_at?: string | null
          source_channel?: string | null
          status?: string
          support_payout_case_id?: string
          target_name?: string | null
          target_type?: string
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
      case_financial_entries: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          direction: string
          domain_event_id: string | null
          effective_at: string
          id: string
          loss_case_id: string | null
          merchant_id: string
          metadata: Json
          recorded_at: string
          recovery_case_id: string | null
          reverses_entry_id: string | null
          source_record_id: string | null
          state: string
          support_payout_case_id: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          direction?: string
          domain_event_id?: string | null
          effective_at?: string
          id?: string
          loss_case_id?: string | null
          merchant_id: string
          metadata?: Json
          recorded_at?: string
          recovery_case_id?: string | null
          reverses_entry_id?: string | null
          source_record_id?: string | null
          state: string
          support_payout_case_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          direction?: string
          domain_event_id?: string | null
          effective_at?: string
          id?: string
          loss_case_id?: string | null
          merchant_id?: string
          metadata?: Json
          recorded_at?: string
          recovery_case_id?: string | null
          reverses_entry_id?: string | null
          source_record_id?: string | null
          state?: string
          support_payout_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_financial_entries_domain_event_id_fkey"
            columns: ["domain_event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_entries_reverses_entry_id_fkey"
            columns: ["reverses_entry_id"]
            isOneToOne: false
            referencedRelation: "case_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_entries_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_entries_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_financial_summaries: {
        Row: {
          approved_minor: number
          confirmed_loss_minor: number
          currency: string
          estimated_loss_minor: number
          exposed_minor: number
          last_event_id: string | null
          merchant_id: string
          paid_minor: number
          prevented_minor: number
          recoverable_minor: number
          recovered_minor: number
          requested_minor: number
          support_payout_case_id: string
          updated_at: string
          written_off_minor: number
        }
        Insert: {
          approved_minor?: number
          confirmed_loss_minor?: number
          currency: string
          estimated_loss_minor?: number
          exposed_minor?: number
          last_event_id?: string | null
          merchant_id: string
          paid_minor?: number
          prevented_minor?: number
          recoverable_minor?: number
          recovered_minor?: number
          requested_minor?: number
          support_payout_case_id: string
          updated_at?: string
          written_off_minor?: number
        }
        Update: {
          approved_minor?: number
          confirmed_loss_minor?: number
          currency?: string
          estimated_loss_minor?: number
          exposed_minor?: number
          last_event_id?: string | null
          merchant_id?: string
          paid_minor?: number
          prevented_minor?: number
          recoverable_minor?: number
          recovered_minor?: number
          requested_minor?: number
          support_payout_case_id?: string
          updated_at?: string
          written_off_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_financial_summaries_last_event_id_fkey"
            columns: ["last_event_id"]
            isOneToOne: false
            referencedRelation: "case_financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_summaries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_financial_summaries_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      category_applicability: {
        Row: {
          category: string
          merchant_id: string
          set_at: string
          set_by: string | null
          status: string
        }
        Insert: {
          category: string
          merchant_id: string
          set_at?: string
          set_by?: string | null
          status: string
        }
        Update: {
          category?: string
          merchant_id?: string
          set_at?: string
          set_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_applicability_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_signal_order_links: {
        Row: {
          checkout_signal_id: string
          id: string
          linked_at: string
          merchant_id: string
          order_id: string
        }
        Insert: {
          checkout_signal_id: string
          id?: string
          linked_at?: string
          merchant_id: string
          order_id: string
        }
        Update: {
          checkout_signal_id?: string
          id?: string
          linked_at?: string
          merchant_id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_signal_order_links_checkout_signal_id_fkey"
            columns: ["checkout_signal_id"]
            isOneToOne: false
            referencedRelation: "checkout_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_signal_order_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_signal_order_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_signals: {
        Row: {
          account_type: string | null
          cart_count: number | null
          checkout_reached: boolean
          created_at: string
          device_fp: string | null
          email_hash: string | null
          event_type: string
          id: string
          ip_hash: string | null
          merchant_id: string
          page: string | null
          platform: string
          raw_payload: Json | null
          referrer: string | null
          session_id: string
          visitor_id: string
        }
        Insert: {
          account_type?: string | null
          cart_count?: number | null
          checkout_reached?: boolean
          created_at?: string
          device_fp?: string | null
          email_hash?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          merchant_id: string
          page?: string | null
          platform: string
          raw_payload?: Json | null
          referrer?: string | null
          session_id: string
          visitor_id: string
        }
        Update: {
          account_type?: string | null
          cart_count?: number | null
          checkout_reached?: boolean
          created_at?: string
          device_fp?: string | null
          email_hash?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          merchant_id?: string
          page?: string | null
          platform?: string
          raw_payload?: Json | null
          referrer?: string | null
          session_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_signals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
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
          followed_recommendation: boolean | null
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action: string | null
          updated_at: string
        }
        Insert: {
          amount_recovered?: number | null
          amount_refunded?: number | null
          claim_id: string
          decided_at?: string
          decided_by?: string | null
          decision: Database["public"]["Enums"]["claim_decision"]
          followed_recommendation?: boolean | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action?: string | null
          updated_at?: string
        }
        Update: {
          amount_recovered?: number | null
          amount_refunded?: number | null
          claim_id?: string
          decided_at?: string
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["claim_decision"]
          followed_recommendation?: boolean | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["claim_outcome"]
          recommended_payout_action?: string | null
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
      correspondence_automation_settings: {
        Row: {
          allowed_counterparty_types: string[]
          allowed_outbound_channels: string[]
          auto_extract_facts_from_correspondence: boolean
          auto_generate_clarification_requests: boolean
          auto_ingest_external_correspondence: boolean
          auto_send_clarification_requests: boolean
          created_at: string
          max_auto_request_value_minor: number | null
          merchant_id: string
          updated_at: string
        }
        Insert: {
          allowed_counterparty_types?: string[]
          allowed_outbound_channels?: string[]
          auto_extract_facts_from_correspondence?: boolean
          auto_generate_clarification_requests?: boolean
          auto_ingest_external_correspondence?: boolean
          auto_send_clarification_requests?: boolean
          created_at?: string
          max_auto_request_value_minor?: number | null
          merchant_id: string
          updated_at?: string
        }
        Update: {
          allowed_counterparty_types?: string[]
          allowed_outbound_channels?: string[]
          auto_extract_facts_from_correspondence?: boolean
          auto_generate_clarification_requests?: boolean
          auto_ingest_external_correspondence?: boolean
          auto_send_clarification_requests?: boolean
          created_at?: string
          max_auto_request_value_minor?: number | null
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_automation_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
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
      customer_claim_summary: {
        Row: {
          claim_rate: number
          customer_email_hash: string
          id: string
          last_claim_at: string | null
          merchant_id: string
          primary_reason: string | null
          total_claims: number
          total_orders: number
          updated_at: string
        }
        Insert: {
          claim_rate?: number
          customer_email_hash: string
          id?: string
          last_claim_at?: string | null
          merchant_id: string
          primary_reason?: string | null
          total_claims?: number
          total_orders?: number
          updated_at?: string
        }
        Update: {
          claim_rate?: number
          customer_email_hash?: string
          id?: string
          last_claim_at?: string | null
          merchant_id?: string
          primary_reason?: string | null
          total_claims?: number
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_claim_summary_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_identity_signals: {
        Row: {
          account_created_at: string | null
          billing_address_hash: string | null
          created_at: string
          customer_account_type: string | null
          customer_email_hash: string
          days_between_account_creation_and_first_claim: number | null
          device_fingerprint: string | null
          first_seen_at: string | null
          id: string
          ip_hash: string | null
          last_seen_at: string | null
          merchant_id: string
          phone_hash: string | null
          shipping_address_hash: string | null
          updated_at: string
        }
        Insert: {
          account_created_at?: string | null
          billing_address_hash?: string | null
          created_at?: string
          customer_account_type?: string | null
          customer_email_hash: string
          days_between_account_creation_and_first_claim?: number | null
          device_fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string | null
          merchant_id: string
          phone_hash?: string | null
          shipping_address_hash?: string | null
          updated_at?: string
        }
        Update: {
          account_created_at?: string | null
          billing_address_hash?: string | null
          created_at?: string
          customer_account_type?: string | null
          customer_email_hash?: string
          days_between_account_creation_and_first_claim?: number | null
          device_fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string | null
          merchant_id?: string
          phone_hash?: string | null
          shipping_address_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_identity_signals_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      default_rule_templates: {
        Row: {
          action: string
          condition_operator: string
          conditions: Json
          description: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          action: string
          condition_operator?: string
          conditions: Json
          description: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          action?: string
          condition_operator?: string
          conditions?: Json
          description?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      document_upload_jobs: {
        Row: {
          agreement_id: string | null
          created_at: string
          error_message: string | null
          id: string
          merchant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agreement_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          merchant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          merchant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_upload_jobs_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_jobs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_event_deliveries: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          domain_event_id: string
          handler_name: string
          id: string
          last_error: string | null
          leased_by: string | null
          leased_until: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          domain_event_id: string
          handler_name: string
          id?: string
          last_error?: string | null
          leased_by?: string | null
          leased_until?: string | null
          max_attempts?: number
          merchant_id: string
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          domain_event_id?: string
          handler_name?: string
          id?: string
          last_error?: string | null
          leased_by?: string | null
          leased_until?: string | null
          max_attempts?: number
          merchant_id?: string
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_event_deliveries_domain_event_id_fkey"
            columns: ["domain_event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_event_deliveries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          aggregate_id: string | null
          aggregate_type: string
          causation_id: string | null
          connection_id: string | null
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          ingestion_event_id: string | null
          merchant_id: string
          occurred_at: string
          payload: Json
          recorded_at: string
          schema_version: number
          source_record_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          aggregate_id?: string | null
          aggregate_type: string
          causation_id?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          ingestion_event_id?: string | null
          merchant_id: string
          occurred_at?: string
          payload?: Json
          recorded_at?: string
          schema_version?: number
          source_record_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          aggregate_id?: string | null
          aggregate_type?: string
          causation_id?: string | null
          connection_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          ingestion_event_id?: string | null
          merchant_id?: string
          occurred_at?: string
          payload?: Json
          recorded_at?: string
          schema_version?: number
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_ingestion_event_id_fkey"
            columns: ["ingestion_event_id"]
            isOneToOne: false
            referencedRelation: "ingestion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          confidence: number | null
          created_at: string
          evidence: Json
          from_entity_id: string
          from_entity_type: string
          id: string
          match_method: string | null
          match_status: string
          merchant_id: string
          relationship_type: string
          resolved_at: string | null
          resolved_by: string | null
          to_entity_id: string
          to_entity_type: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          from_entity_id: string
          from_entity_type: string
          id?: string
          match_method?: string | null
          match_status?: string
          merchant_id: string
          relationship_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          to_entity_id: string
          to_entity_type: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          from_entity_id?: string
          from_entity_type?: string
          id?: string
          match_method?: string | null
          match_status?: string
          merchant_id?: string
          relationship_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          to_entity_id?: string
          to_entity_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_download_tokens: {
        Row: {
          created_at: string
          evidence_id: string
          expires_at: string
          id: string
          merchant_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          evidence_id: string
          expires_at: string
          id?: string
          merchant_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          evidence_id?: string
          expires_at?: string
          id?: string
          merchant_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_download_tokens_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_download_tokens_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          claim_id: string
          created_at: string
          evidence_type: string
          external_url: string | null
          id: string
          merchant_id: string
          occurred_at: string | null
          proves: string | null
          raw_payload: Json | null
          source_system: string
          summary: string | null
          title: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          evidence_type: string
          external_url?: string | null
          id?: string
          merchant_id: string
          occurred_at?: string | null
          proves?: string | null
          raw_payload?: Json | null
          source_system: string
          summary?: string | null
          title?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          evidence_type?: string
          external_url?: string | null
          id?: string
          merchant_id?: string
          occurred_at?: string | null
          proves?: string | null
          raw_payload?: Json | null
          source_system?: string
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_packages: {
        Row: {
          ce3_eligible: boolean
          ce3_prior_transactions: Json
          ce3_qualifying_signals: Json
          created_at: string
          cross_merchant_indicator: boolean
          customer_profile_id: string | null
          generated_at: string
          generated_for_order_id: string | null
          id: string
          merchant_id: string
          merchant_notes: string | null
          narrative_summary: string | null
          pdf_storage_path: string | null
          reference_number: string
          signal_snapshot: Json
        }
        Insert: {
          ce3_eligible?: boolean
          ce3_prior_transactions?: Json
          ce3_qualifying_signals?: Json
          created_at?: string
          cross_merchant_indicator?: boolean
          customer_profile_id?: string | null
          generated_at?: string
          generated_for_order_id?: string | null
          id?: string
          merchant_id: string
          merchant_notes?: string | null
          narrative_summary?: string | null
          pdf_storage_path?: string | null
          reference_number: string
          signal_snapshot?: Json
        }
        Update: {
          ce3_eligible?: boolean
          ce3_prior_transactions?: Json
          ce3_qualifying_signals?: Json
          created_at?: string
          cross_merchant_indicator?: boolean
          customer_profile_id?: string | null
          generated_at?: string
          generated_for_order_id?: string | null
          id?: string
          merchant_id?: string
          merchant_notes?: string | null
          narrative_summary?: string | null
          pdf_storage_path?: string | null
          reference_number?: string
          signal_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "evidence_packages_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_generated_for_order_id_fkey"
            columns: ["generated_for_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
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
      external_clarification_requests: {
        Row: {
          body_hash: string | null
          counterparty_name: string | null
          counterparty_type: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at: string
          hidden_threading_token: string
          id: string
          loss_case_id: string
          merchant_id: string
          outbound_channel: Database["public"]["Enums"]["external_correspondence_channel"]
          recipient_or_endpoint: string | null
          reply_received_at: string | null
          requested_evidence_types: string[]
          sent_at: string | null
          source_message_id: string | null
          source_thread_id: string | null
          status: Database["public"]["Enums"]["external_clarification_request_status"]
          subject: string | null
        }
        Insert: {
          body_hash?: string | null
          counterparty_name?: string | null
          counterparty_type: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          hidden_threading_token: string
          id?: string
          loss_case_id: string
          merchant_id: string
          outbound_channel: Database["public"]["Enums"]["external_correspondence_channel"]
          recipient_or_endpoint?: string | null
          reply_received_at?: string | null
          requested_evidence_types?: string[]
          sent_at?: string | null
          source_message_id?: string | null
          source_thread_id?: string | null
          status?: Database["public"]["Enums"]["external_clarification_request_status"]
          subject?: string | null
        }
        Update: {
          body_hash?: string | null
          counterparty_name?: string | null
          counterparty_type?: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          hidden_threading_token?: string
          id?: string
          loss_case_id?: string
          merchant_id?: string
          outbound_channel?: Database["public"]["Enums"]["external_correspondence_channel"]
          recipient_or_endpoint?: string | null
          reply_received_at?: string | null
          requested_evidence_types?: string[]
          sent_at?: string | null
          source_message_id?: string | null
          source_thread_id?: string | null
          status?: Database["public"]["Enums"]["external_clarification_request_status"]
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_clarification_requests_loss_case_id_fkey"
            columns: ["loss_case_id"]
            isOneToOne: false
            referencedRelation: "loss_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_clarification_requests_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_correspondence: {
        Row: {
          attachment_hashes: string[]
          body_hash: string | null
          channel: Database["public"]["Enums"]["external_correspondence_channel"]
          counterparty_name: string | null
          counterparty_type: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at: string
          direction: Database["public"]["Enums"]["external_correspondence_direction"]
          extracted_facts_json: Json | null
          extraction_status: Database["public"]["Enums"]["correspondence_extraction_status"]
          id: string
          loss_case_id: string | null
          matched_confidence: number
          merchant_id: string
          pulled_at: string
          received_at: string | null
          sent_at: string | null
          source_provider: string
          source_record_id: string
          source_thread_id: string | null
          source_url: string | null
          subject: string | null
        }
        Insert: {
          attachment_hashes?: string[]
          body_hash?: string | null
          channel: Database["public"]["Enums"]["external_correspondence_channel"]
          counterparty_name?: string | null
          counterparty_type?: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          direction: Database["public"]["Enums"]["external_correspondence_direction"]
          extracted_facts_json?: Json | null
          extraction_status?: Database["public"]["Enums"]["correspondence_extraction_status"]
          id?: string
          loss_case_id?: string | null
          matched_confidence?: number
          merchant_id: string
          pulled_at?: string
          received_at?: string | null
          sent_at?: string | null
          source_provider: string
          source_record_id: string
          source_thread_id?: string | null
          source_url?: string | null
          subject?: string | null
        }
        Update: {
          attachment_hashes?: string[]
          body_hash?: string | null
          channel?: Database["public"]["Enums"]["external_correspondence_channel"]
          counterparty_name?: string | null
          counterparty_type?: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          direction?: Database["public"]["Enums"]["external_correspondence_direction"]
          extracted_facts_json?: Json | null
          extraction_status?: Database["public"]["Enums"]["correspondence_extraction_status"]
          id?: string
          loss_case_id?: string | null
          matched_confidence?: number
          merchant_id?: string
          pulled_at?: string
          received_at?: string | null
          sent_at?: string | null
          source_provider?: string
          source_record_id?: string
          source_thread_id?: string | null
          source_url?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_correspondence_loss_case_id_fkey"
            columns: ["loss_case_id"]
            isOneToOne: false
            referencedRelation: "loss_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_correspondence_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_partner_terms: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          claim_deadline_days: number | null
          claim_submission_method: string | null
          confidence: string
          covered_loss_types: string[]
          created_at: string
          deductible_amount: number | null
          document_id: string
          escalation_contact: string | null
          exclusions: string[]
          id: string
          max_recoverable_amount: number | null
          merchant_id: string
          partner_type: string
          required_evidence: string[]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          claim_deadline_days?: number | null
          claim_submission_method?: string | null
          confidence?: string
          covered_loss_types?: string[]
          created_at?: string
          deductible_amount?: number | null
          document_id: string
          escalation_contact?: string | null
          exclusions?: string[]
          id?: string
          max_recoverable_amount?: number | null
          merchant_id: string
          partner_type: string
          required_evidence?: string[]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          claim_deadline_days?: number | null
          claim_submission_method?: string | null
          confidence?: string
          covered_loss_types?: string[]
          created_at?: string
          deductible_amount?: number | null
          document_id?: string
          escalation_contact?: string | null
          exclusions?: string[]
          id?: string
          max_recoverable_amount?: number | null
          merchant_id?: string
          partner_type?: string
          required_evidence?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_partner_terms_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "integration_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_partner_terms_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_merchant_applications: {
        Row: {
          agreed_to_terms_at: string | null
          created_at: string
          created_by_user_id: string | null
          fraud_problem: string
          id: string
          internal_notified_at: string | null
          merchant_id: string
          monthly_order_volume: string
          monthly_refund_chargeback_volume: string | null
          store_name: string
          updated_at: string
        }
        Insert: {
          agreed_to_terms_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          fraud_problem: string
          id?: string
          internal_notified_at?: string | null
          merchant_id: string
          monthly_order_volume: string
          monthly_refund_chargeback_volume?: string | null
          store_name: string
          updated_at?: string
        }
        Update: {
          agreed_to_terms_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          fraud_problem?: string
          id?: string
          internal_notified_at?: string | null
          merchant_id?: string
          monthly_order_volume?: string
          monthly_refund_chargeback_volume?: string | null
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
          webhook_secret_created_at: string | null
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
          webhook_secret_created_at?: string | null
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
          webhook_secret_created_at?: string | null
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
      identity_catch_events: {
        Row: {
          claim_id: string | null
          confidence_grade: string
          confidence_score: number
          created_at: string
          dismissed_at: string | null
          estimated_exposure_amount: number | null
          estimated_exposure_currency: string
          evidence_pack_id: string | null
          id: string
          linked_identifier_display: string | null
          linked_identifier_hash: string
          matched_signal_types: string[]
          merchant_id: string
          order_id: string | null
          profile_id: string | null
          submitted_identifier_display: string | null
          submitted_identifier_hash: string
        }
        Insert: {
          claim_id?: string | null
          confidence_grade: string
          confidence_score?: number
          created_at?: string
          dismissed_at?: string | null
          estimated_exposure_amount?: number | null
          estimated_exposure_currency?: string
          evidence_pack_id?: string | null
          id?: string
          linked_identifier_display?: string | null
          linked_identifier_hash: string
          matched_signal_types?: string[]
          merchant_id: string
          order_id?: string | null
          profile_id?: string | null
          submitted_identifier_display?: string | null
          submitted_identifier_hash: string
        }
        Update: {
          claim_id?: string | null
          confidence_grade?: string
          confidence_score?: number
          created_at?: string
          dismissed_at?: string | null
          estimated_exposure_amount?: number | null
          estimated_exposure_currency?: string
          evidence_pack_id?: string | null
          id?: string
          linked_identifier_display?: string | null
          linked_identifier_hash?: string
          matched_signal_types?: string[]
          merchant_id?: string
          order_id?: string | null
          profile_id?: string | null
          submitted_identifier_display?: string | null
          submitted_identifier_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_catch_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_catch_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_catch_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_catch_events_profile_id_fkey"
            columns: ["profile_id"]
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
      identity_evidence_scores: {
        Row: {
          computed_at: string
          evidence_level: string
          evidence_score: number
          has_sufficient_data: boolean
          identity_id: string
          score_breakdown: Json
          scoring_config_version: string
        }
        Insert: {
          computed_at?: string
          evidence_level?: string
          evidence_score?: number
          has_sufficient_data?: boolean
          identity_id: string
          score_breakdown?: Json
          scoring_config_version: string
        }
        Update: {
          computed_at?: string
          evidence_level?: string
          evidence_score?: number
          has_sufficient_data?: boolean
          identity_id?: string
          score_breakdown?: Json
          scoring_config_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_evidence_scores_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_link_candidates: {
        Row: {
          detected_at: string
          id: string
          link_confidence: number
          link_type: string
          linked_customer_email_hash: string
          merchant_id_a: string
          merchant_id_b: string
          primary_customer_email_hash: string
        }
        Insert: {
          detected_at?: string
          id?: string
          link_confidence: number
          link_type: string
          linked_customer_email_hash: string
          merchant_id_a: string
          merchant_id_b: string
          primary_customer_email_hash: string
        }
        Update: {
          detected_at?: string
          id?: string
          link_confidence?: number
          link_type?: string
          linked_customer_email_hash?: string
          merchant_id_a?: string
          merchant_id_b?: string
          primary_customer_email_hash?: string
        }
        Relationships: []
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
      ingest_rate_limits: {
        Row: {
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          ip_hash: string
          request_count?: number
          window_start: string
        }
        Update: {
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      ingestion_events: {
        Row: {
          attempts: number
          connection_id: string | null
          created_at: string
          event_type: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          leased_by: string | null
          leased_until: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string
          payload: Json | null
          payload_hash: string
          payload_ref: string | null
          provider_event_id: string | null
          received_at: string
          retention_deadline: string | null
          source_account_ref: string | null
          source_system: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          leased_by?: string | null
          leased_until?: string | null
          max_attempts?: number
          merchant_id: string
          next_attempt_at?: string
          payload?: Json | null
          payload_hash: string
          payload_ref?: string | null
          provider_event_id?: string | null
          received_at?: string
          retention_deadline?: string | null
          source_account_ref?: string | null
          source_system: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          leased_by?: string | null
          leased_until?: string | null
          max_attempts?: number
          merchant_id?: string
          next_attempt_at?: string
          payload?: Json | null
          payload_hash?: string
          payload_ref?: string | null
          provider_event_id?: string | null
          received_at?: string
          retention_deadline?: string | null
          source_account_ref?: string | null
          source_system?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_field_errors: {
        Row: {
          code: string
          created_at: string
          field: string
          id: string
          ingestion_event_id: string | null
          merchant_id: string
          message: string | null
          raw_value_hash: string | null
          resolution_status: string
          severity: string
          source_record_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          field: string
          id?: string
          ingestion_event_id?: string | null
          merchant_id: string
          message?: string | null
          raw_value_hash?: string | null
          resolution_status?: string
          severity?: string
          source_record_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          field?: string
          id?: string
          ingestion_event_id?: string | null
          merchant_id?: string
          message?: string | null
          raw_value_hash?: string | null
          resolution_status?: string
          severity?: string
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_field_errors_ingestion_event_id_fkey"
            columns: ["ingestion_event_id"]
            isOneToOne: false
            referencedRelation: "ingestion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_field_errors_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_field_errors_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          connection_id: string | null
          created_at: string
          encrypted_payload: string
          expires_at: string | null
          id: string
          key_version: number
          merchant_id: string
          provider_id: string
          rotated_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          encrypted_payload: string
          expires_at?: string | null
          id?: string
          key_version?: number
          merchant_id: string
          provider_id: string
          rotated_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          encrypted_payload?: string
          expires_at?: string | null
          id?: string
          key_version?: number
          merchant_id?: string
          provider_id?: string
          rotated_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_credentials_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_type: string
          extraction_status: string
          file_path: string
          id: string
          merchant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_type: string
          extraction_status?: string
          file_path: string
          id?: string
          merchant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_type?: string
          extraction_status?: string
          file_path?: string
          id?: string
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_documents_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_evidence_items: {
        Row: {
          confidence: string
          created_at: string
          evidence_type: string
          id: string
          merchant_id: string
          occurred_at: string | null
          raw_reference: string | null
          source_category: string
          source_provider: string
          summary: string
          support_payout_case_id: string | null
          title: string
          value: Json | null
        }
        Insert: {
          confidence: string
          created_at?: string
          evidence_type: string
          id?: string
          merchant_id: string
          occurred_at?: string | null
          raw_reference?: string | null
          source_category: string
          source_provider: string
          summary: string
          support_payout_case_id?: string | null
          title: string
          value?: Json | null
        }
        Update: {
          confidence?: string
          created_at?: string
          evidence_type?: string
          id?: string
          merchant_id?: string
          occurred_at?: string | null
          raw_reference?: string | null
          source_category?: string
          source_provider?: string
          summary?: string
          support_payout_case_id?: string | null
          title?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_evidence_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_evidence_items_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_case_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["loss_case_event_type"]
          id: string
          loss_case_id: string
          merchant_id: string
          metadata_json: Json
          source_provider: string | null
          source_record_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["loss_case_event_type"]
          id?: string
          loss_case_id: string
          merchant_id: string
          metadata_json?: Json
          source_provider?: string | null
          source_record_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["loss_case_event_type"]
          id?: string
          loss_case_id?: string
          merchant_id?: string
          metadata_json?: Json
          source_provider?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loss_case_events_loss_case_id_fkey"
            columns: ["loss_case_id"]
            isOneToOne: false
            referencedRelation: "loss_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_case_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_case_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          extracted_by: Database["public"]["Enums"]["evidence_extraction_method"]
          extraction_confidence: number | null
          id: string
          loss_case_id: string
          merchant_id: string
          pulled_at: string
          raw_payload_hash: string
          source_provider: Database["public"]["Enums"]["loss_case_evidence_source_provider"]
          source_record_id: string
          source_thread_id: string | null
          source_url: string | null
          source_verified: boolean
          value_json: Json
        }
        Insert: {
          created_at?: string
          evidence_type: string
          extracted_by: Database["public"]["Enums"]["evidence_extraction_method"]
          extraction_confidence?: number | null
          id?: string
          loss_case_id: string
          merchant_id: string
          pulled_at: string
          raw_payload_hash: string
          source_provider: Database["public"]["Enums"]["loss_case_evidence_source_provider"]
          source_record_id: string
          source_thread_id?: string | null
          source_url?: string | null
          source_verified?: boolean
          value_json: Json
        }
        Update: {
          created_at?: string
          evidence_type?: string
          extracted_by?: Database["public"]["Enums"]["evidence_extraction_method"]
          extraction_confidence?: number | null
          id?: string
          loss_case_id?: string
          merchant_id?: string
          pulled_at?: string
          raw_payload_hash?: string
          source_provider?: Database["public"]["Enums"]["loss_case_evidence_source_provider"]
          source_record_id?: string
          source_thread_id?: string | null
          source_url?: string | null
          source_verified?: boolean
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "loss_case_evidence_loss_case_id_fkey"
            columns: ["loss_case_id"]
            isOneToOne: false
            referencedRelation: "loss_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_case_evidence_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_cases: {
        Row: {
          approved_recovery_minor: number | null
          case_category: Database["public"]["Enums"]["loss_case_category"]
          case_type: string
          chargeback_value_minor: number | null
          claim_deadline_at: string | null
          counterparty_name: string | null
          counterparty_type: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at: string
          currency: string | null
          customer_identity_id: string | null
          dispute_id: string | null
          estimated_recovery_minor: number | null
          evidence_completion_score: number
          fulfilment_id: string | null
          helpdesk_ticket_id: string | null
          id: string
          merchant_id: string
          missing_evidence_count: number
          order_id: string | null
          order_value_minor: number | null
          payment_id: string | null
          recovery_route: Database["public"]["Enums"]["loss_recovery_route"]
          refund_value_minor: number | null
          return_id: string | null
          shipment_id: string | null
          source_confidence: Database["public"]["Enums"]["loss_source_confidence"]
          source_fingerprint: string | null
          status: Database["public"]["Enums"]["loss_case_status"]
          support_payout_case_id: string | null
          updated_at: string
        }
        Insert: {
          approved_recovery_minor?: number | null
          case_category: Database["public"]["Enums"]["loss_case_category"]
          case_type: string
          chargeback_value_minor?: number | null
          claim_deadline_at?: string | null
          counterparty_name?: string | null
          counterparty_type?: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          currency?: string | null
          customer_identity_id?: string | null
          dispute_id?: string | null
          estimated_recovery_minor?: number | null
          evidence_completion_score?: number
          fulfilment_id?: string | null
          helpdesk_ticket_id?: string | null
          id?: string
          merchant_id: string
          missing_evidence_count?: number
          order_id?: string | null
          order_value_minor?: number | null
          payment_id?: string | null
          recovery_route: Database["public"]["Enums"]["loss_recovery_route"]
          refund_value_minor?: number | null
          return_id?: string | null
          shipment_id?: string | null
          source_confidence?: Database["public"]["Enums"]["loss_source_confidence"]
          source_fingerprint?: string | null
          status?: Database["public"]["Enums"]["loss_case_status"]
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_recovery_minor?: number | null
          case_category?: Database["public"]["Enums"]["loss_case_category"]
          case_type?: string
          chargeback_value_minor?: number | null
          claim_deadline_at?: string | null
          counterparty_name?: string | null
          counterparty_type?: Database["public"]["Enums"]["loss_counterparty_type"]
          created_at?: string
          currency?: string | null
          customer_identity_id?: string | null
          dispute_id?: string | null
          estimated_recovery_minor?: number | null
          evidence_completion_score?: number
          fulfilment_id?: string | null
          helpdesk_ticket_id?: string | null
          id?: string
          merchant_id?: string
          missing_evidence_count?: number
          order_id?: string | null
          order_value_minor?: number | null
          payment_id?: string | null
          recovery_route?: Database["public"]["Enums"]["loss_recovery_route"]
          refund_value_minor?: number | null
          return_id?: string | null
          shipment_id?: string | null
          source_confidence?: Database["public"]["Enums"]["loss_source_confidence"]
          source_fingerprint?: string | null
          status?: Database["public"]["Enums"]["loss_case_status"]
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_cases_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_cases_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      loss_sources: {
        Row: {
          accountable_party_name: string | null
          accountable_party_type: string
          claim_id: string
          confidence: string
          created_at: string
          evidence_item_ids: string[]
          evidence_summary: string | null
          id: string
          merchant_id: string
          money_at_risk: number
          potential_recovery_amount: number
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          accountable_party_name?: string | null
          accountable_party_type?: string
          claim_id: string
          confidence?: string
          created_at?: string
          evidence_item_ids?: string[]
          evidence_summary?: string | null
          id?: string
          merchant_id: string
          money_at_risk?: number
          potential_recovery_amount?: number
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          accountable_party_name?: string | null
          accountable_party_type?: string
          claim_id?: string
          confidence?: string
          created_at?: string
          evidence_item_ids?: string[]
          evidence_summary?: string | null
          id?: string
          merchant_id?: string
          money_at_risk?: number
          potential_recovery_amount?: number
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_sources_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loss_sources_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
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
      merchant_customers: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          identity_id: string | null
          merchant_id: string
          raw_metadata: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          identity_id?: string | null
          merchant_id: string
          raw_metadata?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          identity_id?: string | null
          merchant_id?: string
          raw_metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
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
      merchant_integrations: {
        Row: {
          auth_mode: string
          capabilities_snapshot: Json
          category: string
          connector_version: string | null
          created_at: string
          data_fresh_through: string | null
          disconnected_at: string | null
          display_name: string | null
          granted_scopes: string[]
          id: string
          imported_record_count: number
          last_error: string | null
          last_error_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_successful_sync_at: string | null
          last_sync_at: string | null
          last_sync_completed_at: string | null
          last_sync_started_at: string | null
          merchant_id: string
          next_scheduled_sync_at: string | null
          provider_account_id: string | null
          provider_account_name: string | null
          provider_base_url: string | null
          provider_id: string
          status: string
          subscribed: boolean
          sync_cursor: Json | null
          updated_at: string
          webhook_last_received_at: string | null
          webhook_status: string | null
          writeback_enabled: boolean
        }
        Insert: {
          auth_mode: string
          capabilities_snapshot?: Json
          category: string
          connector_version?: string | null
          created_at?: string
          data_fresh_through?: string | null
          disconnected_at?: string | null
          display_name?: string | null
          granted_scopes?: string[]
          id?: string
          imported_record_count?: number
          last_error?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          merchant_id: string
          next_scheduled_sync_at?: string | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          provider_id: string
          status?: string
          subscribed?: boolean
          sync_cursor?: Json | null
          updated_at?: string
          webhook_last_received_at?: string | null
          webhook_status?: string | null
          writeback_enabled?: boolean
        }
        Update: {
          auth_mode?: string
          capabilities_snapshot?: Json
          category?: string
          connector_version?: string | null
          created_at?: string
          data_fresh_through?: string | null
          disconnected_at?: string | null
          display_name?: string | null
          granted_scopes?: string[]
          id?: string
          imported_record_count?: number
          last_error?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_successful_sync_at?: string | null
          last_sync_at?: string | null
          last_sync_completed_at?: string | null
          last_sync_started_at?: string | null
          merchant_id?: string
          next_scheduled_sync_at?: string | null
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          provider_id?: string
          status?: string
          subscribed?: boolean
          sync_cursor?: Json | null
          updated_at?: string
          webhook_last_received_at?: string | null
          webhook_status?: string | null
          writeback_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "merchant_integrations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          action: string
          condition_operator: string
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default_template: boolean
          merchant_id: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          action: string
          condition_operator?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default_template?: boolean
          merchant_id: string
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          action?: string
          condition_operator?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default_template?: boolean
          merchant_id?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_merchant_id_fkey"
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
      merchant_widget_tokens: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: string
          merchant_id: string
          revoked_at: string | null
          token_hash: string
          token_prefix: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_widget_tokens_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "merchant_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_widget_tokens_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          bigcommerce_script_uuid: string | null
          created_at: string
          id: string
          is_demo: boolean
          is_internal: boolean
          name: string
          settings: Json
          shopify_collector_init_script_tag_id: string | null
          shopify_collector_script_tag_id: string | null
          updated_at: string
        }
        Insert: {
          bigcommerce_script_uuid?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          name: string
          settings?: Json
          shopify_collector_init_script_tag_id?: string | null
          shopify_collector_script_tag_id?: string | null
          updated_at?: string
        }
        Update: {
          bigcommerce_script_uuid?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          is_internal?: boolean
          name?: string
          settings?: Json
          shopify_collector_init_script_tag_id?: string | null
          shopify_collector_script_tag_id?: string | null
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
      order_claim_context: {
        Row: {
          created_at: string
          days_since_delivery_at_claim: number | null
          days_since_order_at_claim: number | null
          delivery_status_at_claim: string | null
          discount_amount: number | null
          discount_code_used: boolean | null
          fulfillment_status_at_claim: string | null
          id: string
          is_first_order: boolean | null
          merchant_id: string
          order_created_at: string | null
          order_ref: string | null
          order_value: number | null
          partial_refund: boolean | null
          payment_method: string | null
          refund_amount_approved: number | null
          refund_amount_requested: number | null
          shipping_carrier: string | null
          shipping_equals_billing: boolean | null
          support_case_id: string
          tracking_number: string | null
          was_refunded_previously: boolean | null
        }
        Insert: {
          created_at?: string
          days_since_delivery_at_claim?: number | null
          days_since_order_at_claim?: number | null
          delivery_status_at_claim?: string | null
          discount_amount?: number | null
          discount_code_used?: boolean | null
          fulfillment_status_at_claim?: string | null
          id?: string
          is_first_order?: boolean | null
          merchant_id: string
          order_created_at?: string | null
          order_ref?: string | null
          order_value?: number | null
          partial_refund?: boolean | null
          payment_method?: string | null
          refund_amount_approved?: number | null
          refund_amount_requested?: number | null
          shipping_carrier?: string | null
          shipping_equals_billing?: boolean | null
          support_case_id: string
          tracking_number?: string | null
          was_refunded_previously?: boolean | null
        }
        Update: {
          created_at?: string
          days_since_delivery_at_claim?: number | null
          days_since_order_at_claim?: number | null
          delivery_status_at_claim?: string | null
          discount_amount?: number | null
          discount_code_used?: boolean | null
          fulfillment_status_at_claim?: string | null
          id?: string
          is_first_order?: boolean | null
          merchant_id?: string
          order_created_at?: string | null
          order_ref?: string | null
          order_value?: number | null
          partial_refund?: boolean | null
          payment_method?: string | null
          refund_amount_approved?: number | null
          refund_amount_requested?: number | null
          shipping_carrier?: string | null
          shipping_equals_billing?: boolean | null
          support_case_id?: string
          tracking_number?: string | null
          was_refunded_previously?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_claim_context_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_claim_context_support_case_id_fkey"
            columns: ["support_case_id"]
            isOneToOne: true
            referencedRelation: "support_case_intake"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          fulfillment_id: string
          id: string
          item_match_confirmed: boolean
          merchant_id: string
          order_id: string
          photo_url: string | null
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          fulfillment_id: string
          id?: string
          item_match_confirmed?: boolean
          merchant_id: string
          order_id: string
          photo_url?: string | null
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          fulfillment_id?: string
          id?: string
          item_match_confirmed?: boolean
          merchant_id?: string
          order_id?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_confirmations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_recovery_rules: {
        Row: {
          active: boolean
          applies_to_claim_type: Database["public"]["Enums"]["recovery_rule_claim_type"]
          claimable_costs: string[]
          confidence: Database["public"]["Enums"]["recovery_confidence"]
          created_at: string
          deadline_days: number | null
          excluded_costs: string[]
          id: string
          liability_cap_amount: number | null
          liability_cap_basis:
            | Database["public"]["Enums"]["recovery_liability_cap_basis"]
            | null
          liability_cap_currency: string | null
          merchant_id: string
          partner_id: string | null
          recovery_type: Database["public"]["Enums"]["recovery_case_type"]
          required_evidence: string[]
          rule_name: string
          source_type: Database["public"]["Enums"]["recovery_rule_source_type"]
          submission_email: string | null
          submission_method:
            | Database["public"]["Enums"]["recovery_submission_method"]
            | null
          submission_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_claim_type: Database["public"]["Enums"]["recovery_rule_claim_type"]
          claimable_costs?: string[]
          confidence?: Database["public"]["Enums"]["recovery_confidence"]
          created_at?: string
          deadline_days?: number | null
          excluded_costs?: string[]
          id?: string
          liability_cap_amount?: number | null
          liability_cap_basis?:
            | Database["public"]["Enums"]["recovery_liability_cap_basis"]
            | null
          liability_cap_currency?: string | null
          merchant_id: string
          partner_id?: string | null
          recovery_type: Database["public"]["Enums"]["recovery_case_type"]
          required_evidence?: string[]
          rule_name: string
          source_type?: Database["public"]["Enums"]["recovery_rule_source_type"]
          submission_email?: string | null
          submission_method?:
            | Database["public"]["Enums"]["recovery_submission_method"]
            | null
          submission_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_claim_type?: Database["public"]["Enums"]["recovery_rule_claim_type"]
          claimable_costs?: string[]
          confidence?: Database["public"]["Enums"]["recovery_confidence"]
          created_at?: string
          deadline_days?: number | null
          excluded_costs?: string[]
          id?: string
          liability_cap_amount?: number | null
          liability_cap_basis?:
            | Database["public"]["Enums"]["recovery_liability_cap_basis"]
            | null
          liability_cap_currency?: string | null
          merchant_id?: string
          partner_id?: string | null
          recovery_type?: Database["public"]["Enums"]["recovery_case_type"]
          required_evidence?: string[]
          rule_name?: string
          source_type?: Database["public"]["Enums"]["recovery_rule_source_type"]
          submission_email?: string | null
          submission_method?:
            | Database["public"]["Enums"]["recovery_submission_method"]
            | null
          submission_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_recovery_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recovery_rules_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contact_email: string | null
          contact_url: string | null
          created_at: string
          external_reference: string | null
          id: string
          merchant_id: string
          name: string
          notes: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_url?: string | null
          created_at?: string
          external_reference?: string | null
          id?: string
          merchant_id: string
          name: string
          notes?: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_url?: string | null
          created_at?: string
          external_reference?: string | null
          id?: string
          merchant_id?: string
          name?: string
          notes?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_merchant_id_fkey"
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
      profile_view_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          merchant_id: string
          profile_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          merchant_id: string
          profile_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          merchant_id?: string
          profile_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_view_tokens_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_view_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      record_match_candidates: {
        Row: {
          candidate_entity_id: string
          candidate_entity_type: string
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          match_method: string
          merchant_id: string
          status: string
          subject_entity_id: string
          subject_entity_type: string
          updated_at: string
        }
        Insert: {
          candidate_entity_id: string
          candidate_entity_type: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          match_method: string
          merchant_id: string
          status?: string
          subject_entity_id: string
          subject_entity_type: string
          updated_at?: string
        }
        Update: {
          candidate_entity_id?: string
          candidate_entity_type?: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          match_method?: string
          merchant_id?: string
          status?: string
          subject_entity_id?: string
          subject_entity_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_match_candidates_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      record_match_resolutions: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          metadata: Json
          new_status: string
          prior_status: string | null
          reason: string | null
          resolved_at: string
          resolved_by: string | null
          selected_candidate_id: string | null
          subject_entity_id: string
          subject_entity_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          metadata?: Json
          new_status: string
          prior_status?: string | null
          reason?: string | null
          resolved_at?: string
          resolved_by?: string | null
          selected_candidate_id?: string | null
          subject_entity_id: string
          subject_entity_type: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          metadata?: Json
          new_status?: string
          prior_status?: string | null
          reason?: string | null
          resolved_at?: string
          resolved_by?: string | null
          selected_candidate_id?: string | null
          subject_entity_id?: string
          subject_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_match_resolutions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_match_resolutions_selected_candidate_id_fkey"
            columns: ["selected_candidate_id"]
            isOneToOne: false
            referencedRelation: "record_match_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_case_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["recovery_case_event_type"]
          from_status:
            | Database["public"]["Enums"]["recovery_case_status"]
            | null
          id: string
          merchant_id: string
          metadata: Json
          note: string | null
          recovery_case_id: string
          to_status: Database["public"]["Enums"]["recovery_case_status"] | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["recovery_case_event_type"]
          from_status?:
            | Database["public"]["Enums"]["recovery_case_status"]
            | null
          id?: string
          merchant_id: string
          metadata?: Json
          note?: string | null
          recovery_case_id: string
          to_status?: Database["public"]["Enums"]["recovery_case_status"] | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["recovery_case_event_type"]
          from_status?:
            | Database["public"]["Enums"]["recovery_case_status"]
            | null
          id?: string
          merchant_id?: string
          metadata?: Json
          note?: string | null
          recovery_case_id?: string
          to_status?: Database["public"]["Enums"]["recovery_case_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_case_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_case_events_recovery_case_id_fkey"
            columns: ["recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_cases: {
        Row: {
          amount_recovered: number | null
          calculation_reason: string[]
          created_at: string
          currency: string
          deadline_at: string | null
          eligible_loss_amount: number | null
          estimated_recoverable_max: number | null
          estimated_recoverable_min: number | null
          evidence_complete: boolean
          evidence_missing: string[]
          evidence_required: string[]
          excluded_costs: Json
          id: string
          internal_owner_user_id: string | null
          last_chased_at: string | null
          merchant_id: string
          merchant_loss_amount: number
          next_chase_at: string | null
          owner_type: Database["public"]["Enums"]["recovery_case_owner_type"]
          partner_id: string | null
          recovery_type: Database["public"]["Enums"]["recovery_case_type"]
          rejection_reason: string | null
          status: Database["public"]["Enums"]["recovery_case_status"]
          support_payout_case_id: string
          updated_at: string
        }
        Insert: {
          amount_recovered?: number | null
          calculation_reason?: string[]
          created_at?: string
          currency?: string
          deadline_at?: string | null
          eligible_loss_amount?: number | null
          estimated_recoverable_max?: number | null
          estimated_recoverable_min?: number | null
          evidence_complete?: boolean
          evidence_missing?: string[]
          evidence_required?: string[]
          excluded_costs?: Json
          id?: string
          internal_owner_user_id?: string | null
          last_chased_at?: string | null
          merchant_id: string
          merchant_loss_amount?: number
          next_chase_at?: string | null
          owner_type?: Database["public"]["Enums"]["recovery_case_owner_type"]
          partner_id?: string | null
          recovery_type: Database["public"]["Enums"]["recovery_case_type"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["recovery_case_status"]
          support_payout_case_id: string
          updated_at?: string
        }
        Update: {
          amount_recovered?: number | null
          calculation_reason?: string[]
          created_at?: string
          currency?: string
          deadline_at?: string | null
          eligible_loss_amount?: number | null
          estimated_recoverable_max?: number | null
          estimated_recoverable_min?: number | null
          evidence_complete?: boolean
          evidence_missing?: string[]
          evidence_required?: string[]
          excluded_costs?: Json
          id?: string
          internal_owner_user_id?: string | null
          last_chased_at?: string | null
          merchant_id?: string
          merchant_loss_amount?: number
          next_chase_at?: string | null
          owner_type?: Database["public"]["Enums"]["recovery_case_owner_type"]
          partner_id?: string | null
          recovery_type?: Database["public"]["Enums"]["recovery_case_type"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["recovery_case_status"]
          support_payout_case_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_cases_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_tasks: {
        Row: {
          amount_to_recover: number
          claim_id: string
          created_at: string
          due_at: string | null
          external_reference: string | null
          id: string
          loss_source_id: string | null
          merchant_id: string
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_type: string
          priority: string
          recovery_deadline: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          amount_to_recover?: number
          claim_id: string
          created_at?: string
          due_at?: string | null
          external_reference?: string | null
          id?: string
          loss_source_id?: string | null
          merchant_id: string
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_type?: string
          priority?: string
          recovery_deadline?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          amount_to_recover?: number
          claim_id?: string
          created_at?: string
          due_at?: string | null
          external_reference?: string | null
          id?: string
          loss_source_id?: string | null
          merchant_id?: string
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_type?: string
          priority?: string
          recovery_deadline?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_tasks_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_tasks_loss_source_id_fkey"
            columns: ["loss_source_id"]
            isOneToOne: false
            referencedRelation: "loss_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_tasks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_evaluations: {
        Row: {
          all_rules_evaluated: Json | null
          claim_id: string | null
          context_hash: string | null
          dedupe_key: string | null
          evaluated_at: string
          evaluation_source: string | null
          id: string
          identity_id: string | null
          justification_summary: string | null
          matched_conditions: Json | null
          merchant_id: string
          recommendation: string | null
          rule_id: string | null
          rule_snapshot: Json | null
          rules_hash: string | null
          signals_hash: string | null
          source_ticket_id: string | null
        }
        Insert: {
          all_rules_evaluated?: Json | null
          claim_id?: string | null
          context_hash?: string | null
          dedupe_key?: string | null
          evaluated_at?: string
          evaluation_source?: string | null
          id?: string
          identity_id?: string | null
          justification_summary?: string | null
          matched_conditions?: Json | null
          merchant_id: string
          recommendation?: string | null
          rule_id?: string | null
          rule_snapshot?: Json | null
          rules_hash?: string | null
          signals_hash?: string | null
          source_ticket_id?: string | null
        }
        Update: {
          all_rules_evaluated?: Json | null
          claim_id?: string | null
          context_hash?: string | null
          dedupe_key?: string | null
          evaluated_at?: string
          evaluation_source?: string | null
          id?: string
          identity_id?: string | null
          justification_summary?: string | null
          matched_conditions?: Json | null
          merchant_id?: string
          recommendation?: string | null
          rule_id?: string | null
          rule_snapshot?: Json | null
          rules_hash?: string | null
          signals_hash?: string | null
          source_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_evaluations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluations_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluations_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "merchant_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_evaluations_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "source_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_accounts: {
        Row: {
          base_url: string | null
          connection_id: string | null
          created_at: string
          display_name: string | null
          external_account_id: string | null
          id: string
          is_synthetic: boolean
          merchant_id: string
          metadata: Json
          provider_id: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          is_synthetic?: boolean
          merchant_id: string
          metadata?: Json
          provider_id: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          is_synthetic?: boolean
          merchant_id?: string
          metadata?: Json
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
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
      source_messages: {
        Row: {
          actor_type: string | null
          attachment_metadata: Json
          body_ref: string | null
          channel: string | null
          created_at: string
          external_id: string
          id: string
          merchant_id: string
          raw_metadata: Json
          sent_at: string | null
          source_record_id: string | null
          source_sent_at: string | null
          source_ticket_id: string
          summary: string | null
          visibility: string | null
        }
        Insert: {
          actor_type?: string | null
          attachment_metadata?: Json
          body_ref?: string | null
          channel?: string | null
          created_at?: string
          external_id: string
          id?: string
          merchant_id: string
          raw_metadata?: Json
          sent_at?: string | null
          source_record_id?: string | null
          source_sent_at?: string | null
          source_ticket_id: string
          summary?: string | null
          visibility?: string | null
        }
        Update: {
          actor_type?: string | null
          attachment_metadata?: Json
          body_ref?: string | null
          channel?: string | null
          created_at?: string
          external_id?: string
          id?: string
          merchant_id?: string
          raw_metadata?: Json
          sent_at?: string | null
          source_record_id?: string | null
          source_sent_at?: string | null
          source_ticket_id?: string
          summary?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_messages_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_messages_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_messages_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "source_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_order_lines: {
        Row: {
          cost_minor: number | null
          created_at: string
          currency: string | null
          external_id: string
          id: string
          merchant_id: string
          product_ref: string | null
          quantity: number | null
          raw_metadata: Json
          sku: string | null
          source_order_id: string
          source_record_id: string | null
          title: string | null
          total_minor: number | null
          unit_price_minor: number | null
          updated_at: string
          variant_ref: string | null
        }
        Insert: {
          cost_minor?: number | null
          created_at?: string
          currency?: string | null
          external_id: string
          id?: string
          merchant_id: string
          product_ref?: string | null
          quantity?: number | null
          raw_metadata?: Json
          sku?: string | null
          source_order_id: string
          source_record_id?: string | null
          title?: string | null
          total_minor?: number | null
          unit_price_minor?: number | null
          updated_at?: string
          variant_ref?: string | null
        }
        Update: {
          cost_minor?: number | null
          created_at?: string
          currency?: string | null
          external_id?: string
          id?: string
          merchant_id?: string
          product_ref?: string | null
          quantity?: number | null
          raw_metadata?: Json
          sku?: string | null
          source_order_id?: string
          source_record_id?: string | null
          title?: string | null
          total_minor?: number | null
          unit_price_minor?: number | null
          updated_at?: string
          variant_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_order_lines_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_order_lines_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_order_lines_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
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
          card_last4: string | null
          cluster_id: string | null
          connection_id: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          discount_codes: Json
          dismissed_by_merchant: boolean
          email: string | null
          external_id: string
          financial_status: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state: Database["public"]["Enums"]["fulfillment_state"]
          id: string
          identity_confidence_grade: string | null
          identity_score: number | null
          ingested_at: string
          job_id: string | null
          landing_site: string | null
          line_items_count: number | null
          match_status: string | null
          merchant_id: string
          note: string | null
          order_number: string | null
          order_value: number | null
          payment_gateway: string | null
          phone: string | null
          placed_at: string | null
          processed_at: string | null
          raw_payload_hash: string | null
          referring_site: string | null
          shipping_address_id: string | null
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
          card_last4?: string | null
          cluster_id?: string | null
          connection_id?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          discount_codes?: Json
          dismissed_by_merchant?: boolean
          email?: string | null
          external_id: string
          financial_status?: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          identity_confidence_grade?: string | null
          identity_score?: number | null
          ingested_at?: string
          job_id?: string | null
          landing_site?: string | null
          line_items_count?: number | null
          match_status?: string | null
          merchant_id: string
          note?: string | null
          order_number?: string | null
          order_value?: number | null
          payment_gateway?: string | null
          phone?: string | null
          placed_at?: string | null
          processed_at?: string | null
          raw_payload_hash?: string | null
          referring_site?: string | null
          shipping_address_id?: string | null
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
          card_last4?: string | null
          cluster_id?: string | null
          connection_id?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          discount_codes?: Json
          dismissed_by_merchant?: boolean
          email?: string | null
          external_id?: string
          financial_status?: Database["public"]["Enums"]["order_financial_status"]
          fulfillment_state?: Database["public"]["Enums"]["fulfillment_state"]
          id?: string
          identity_confidence_grade?: string | null
          identity_score?: number | null
          ingested_at?: string
          job_id?: string | null
          landing_site?: string | null
          line_items_count?: number | null
          match_status?: string | null
          merchant_id?: string
          note?: string | null
          order_number?: string | null
          order_value?: number | null
          payment_gateway?: string | null
          phone?: string | null
          placed_at?: string | null
          processed_at?: string | null
          raw_payload_hash?: string | null
          referring_site?: string | null
          shipping_address_id?: string | null
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
            referencedRelation: "commerce_store_connections"
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
            foreignKeyName: "source_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
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
      source_payments: {
        Row: {
          amount_minor: number | null
          captured_at: string | null
          created_at: string
          currency: string | null
          external_id: string
          id: string
          merchant_id: string
          method_category: string | null
          provider: string | null
          raw_metadata: Json
          refunded_at: string | null
          source_account_id: string | null
          source_customer_id: string | null
          source_order_id: string | null
          source_record_id: string | null
          source_status: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_minor?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string | null
          external_id: string
          id?: string
          merchant_id: string
          method_category?: string | null
          provider?: string | null
          raw_metadata?: Json
          refunded_at?: string | null
          source_account_id?: string | null
          source_customer_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string | null
          external_id?: string
          id?: string
          merchant_id?: string
          method_category?: string | null
          provider?: string | null
          raw_metadata?: Json
          refunded_at?: string | null
          source_account_id?: string | null
          source_customer_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_payments_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_payments_source_customer_id_fkey"
            columns: ["source_customer_id"]
            isOneToOne: false
            referencedRelation: "source_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_payments_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_payments_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      source_records: {
        Row: {
          canonical_entity_id: string | null
          canonical_entity_type: string | null
          connection_id: string | null
          connector_version: string | null
          created_at: string
          external_id: string
          freshness_state: string
          id: string
          ingested_at: string
          last_synced_at: string | null
          merchant_id: string
          payload_hash: string | null
          source_account_id: string | null
          source_created_at: string | null
          source_entity_type: string
          source_metadata: Json
          source_system: string
          source_updated_at: string | null
          source_url: string | null
          sync_state: string
          updated_at: string
        }
        Insert: {
          canonical_entity_id?: string | null
          canonical_entity_type?: string | null
          connection_id?: string | null
          connector_version?: string | null
          created_at?: string
          external_id: string
          freshness_state?: string
          id?: string
          ingested_at?: string
          last_synced_at?: string | null
          merchant_id: string
          payload_hash?: string | null
          source_account_id?: string | null
          source_created_at?: string | null
          source_entity_type: string
          source_metadata?: Json
          source_system: string
          source_updated_at?: string | null
          source_url?: string | null
          sync_state?: string
          updated_at?: string
        }
        Update: {
          canonical_entity_id?: string | null
          canonical_entity_type?: string | null
          connection_id?: string | null
          connector_version?: string | null
          created_at?: string
          external_id?: string
          freshness_state?: string
          id?: string
          ingested_at?: string
          last_synced_at?: string | null
          merchant_id?: string
          payload_hash?: string | null
          source_account_id?: string | null
          source_created_at?: string | null
          source_entity_type?: string
          source_metadata?: Json
          source_system?: string
          source_updated_at?: string | null
          source_url?: string | null
          sync_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_records_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_records_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_records_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
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
      source_replacements: {
        Row: {
          created_at: string
          currency: string | null
          external_id: string
          id: string
          issued_at: string | null
          item_value_minor: number | null
          merchant_id: string
          original_line_ref: string | null
          raw_metadata: Json
          replacement_line_ref: string | null
          shipping_cost_minor: number | null
          source_account_id: string | null
          source_order_id: string | null
          source_record_id: string | null
          source_status: string | null
          status: string | null
          support_payout_case_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          external_id: string
          id?: string
          issued_at?: string | null
          item_value_minor?: number | null
          merchant_id: string
          original_line_ref?: string | null
          raw_metadata?: Json
          replacement_line_ref?: string | null
          shipping_cost_minor?: number | null
          source_account_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          external_id?: string
          id?: string
          issued_at?: string | null
          item_value_minor?: number | null
          merchant_id?: string
          original_line_ref?: string | null
          raw_metadata?: Json
          replacement_line_ref?: string | null
          shipping_cost_minor?: number | null
          source_account_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_replacements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_replacements_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_replacements_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_replacements_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_replacements_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      source_returns: {
        Row: {
          created_at: string
          disposition: string | null
          external_id: string
          id: string
          inspected_at: string | null
          merchant_id: string
          raw_metadata: Json
          received_at: string | null
          refund_reference: string | null
          replacement_reference: string | null
          requested_at: string | null
          source_account_id: string | null
          source_order_id: string | null
          source_record_id: string | null
          source_status: string | null
          status: string | null
          support_payout_case_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disposition?: string | null
          external_id: string
          id?: string
          inspected_at?: string | null
          merchant_id: string
          raw_metadata?: Json
          received_at?: string | null
          refund_reference?: string | null
          replacement_reference?: string | null
          requested_at?: string | null
          source_account_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disposition?: string | null
          external_id?: string
          id?: string
          inspected_at?: string | null
          merchant_id?: string
          raw_metadata?: Json
          received_at?: string | null
          refund_reference?: string | null
          replacement_reference?: string | null
          requested_at?: string | null
          source_account_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          support_payout_case_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_returns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_returns_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_returns_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_returns_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_returns_support_payout_case_id_fkey"
            columns: ["support_payout_case_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      source_shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          external_id: string
          id: string
          merchant_id: string
          raw_metadata: Json
          service: string | null
          shipped_at: string | null
          source_account_id: string | null
          source_fulfillment_id: string | null
          source_order_id: string | null
          source_record_id: string | null
          source_status: string | null
          status: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          external_id: string
          id?: string
          merchant_id: string
          raw_metadata?: Json
          service?: string | null
          shipped_at?: string | null
          source_account_id?: string | null
          source_fulfillment_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          external_id?: string
          id?: string
          merchant_id?: string
          raw_metadata?: Json
          service?: string | null
          shipped_at?: string | null
          source_account_id?: string | null
          source_fulfillment_id?: string | null
          source_order_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_shipments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_shipments_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_shipments_source_fulfillment_id_fkey"
            columns: ["source_fulfillment_id"]
            isOneToOne: false
            referencedRelation: "source_fulfillments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_shipments_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_shipments_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      source_ticket_events: {
        Row: {
          actor_type: string | null
          created_at: string
          event_idempotency_key: string | null
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
          event_idempotency_key?: string | null
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
          event_idempotency_key?: string | null
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
      source_tracking_events: {
        Row: {
          created_at: string
          description: string | null
          event_at: string | null
          external_id: string
          id: string
          location_text: string | null
          merchant_id: string
          raw_metadata: Json
          source_event_at: string | null
          source_record_id: string | null
          source_shipment_id: string
          source_status: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_at?: string | null
          external_id: string
          id?: string
          location_text?: string | null
          merchant_id: string
          raw_metadata?: Json
          source_event_at?: string | null
          source_record_id?: string | null
          source_shipment_id: string
          source_status?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_at?: string | null
          external_id?: string
          id?: string
          location_text?: string | null
          merchant_id?: string
          raw_metadata?: Json
          source_event_at?: string | null
          source_record_id?: string | null
          source_shipment_id?: string
          source_status?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_tracking_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_tracking_events_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_tracking_events_source_shipment_id_fkey"
            columns: ["source_shipment_id"]
            isOneToOne: false
            referencedRelation: "source_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      source_transactions: {
        Row: {
          amount_minor: number | null
          created_at: string
          currency: string | null
          external_id: string
          id: string
          merchant_id: string
          occurred_at: string | null
          parent_transaction_ref: string | null
          provider_reference: string | null
          raw_metadata: Json
          source_account_id: string | null
          source_order_id: string | null
          source_payment_id: string | null
          source_record_id: string | null
          source_status: string | null
          status: string | null
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          external_id: string
          id?: string
          merchant_id: string
          occurred_at?: string | null
          parent_transaction_ref?: string | null
          provider_reference?: string | null
          raw_metadata?: Json
          source_account_id?: string | null
          source_order_id?: string | null
          source_payment_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          external_id?: string
          id?: string
          merchant_id?: string
          occurred_at?: string | null
          parent_transaction_ref?: string | null
          provider_reference?: string | null
          raw_metadata?: Json
          source_account_id?: string | null
          source_order_id?: string | null
          source_payment_id?: string | null
          source_record_id?: string | null
          source_status?: string | null
          status?: string | null
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_transactions_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "source_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_transactions_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "source_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_transactions_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      store_connections: {
        Row: {
          collector_metadata: Json
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
          collector_metadata?: Json
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
          collector_metadata?: Json
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
      support_case_events: {
        Row: {
          actor_identifier_hash: string | null
          actor_type: string | null
          created_at: string
          event_summary: string | null
          event_type: string
          id: string
          merchant_id: string
          metadata: Json
          occurred_at_provider: string | null
          provider: string
          raw_payload_hash: string | null
          support_case_id: string
        }
        Insert: {
          actor_identifier_hash?: string | null
          actor_type?: string | null
          created_at?: string
          event_summary?: string | null
          event_type: string
          id?: string
          merchant_id: string
          metadata?: Json
          occurred_at_provider?: string | null
          provider: string
          raw_payload_hash?: string | null
          support_case_id: string
        }
        Update: {
          actor_identifier_hash?: string | null
          actor_type?: string | null
          created_at?: string
          event_summary?: string | null
          event_type?: string
          id?: string
          merchant_id?: string
          metadata?: Json
          occurred_at_provider?: string | null
          provider?: string
          raw_payload_hash?: string | null
          support_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_case_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_events_support_case_id_fkey"
            columns: ["support_case_id"]
            isOneToOne: false
            referencedRelation: "support_case_intake"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_intake: {
        Row: {
          accepted_first_resolution: boolean | null
          agent_notes_summary: string | null
          attachments_metadata: Json
          case_status: string | null
          channel: string | null
          chargeback_threatened: boolean
          claim_reason: string | null
          claim_type: string | null
          claim_type_confidence: number | null
          created_at_provider: string | null
          customer_email_hash: string | null
          customer_identifier: string | null
          customer_message_summary: string | null
          customer_profile_id: string | null
          customer_reply_count: number | null
          decision: string | null
          escalation_count: number | null
          external_case_id: string
          external_url: string | null
          id: string
          ingested_at: string
          is_claim: boolean
          link_metadata: Json
          link_status: string
          linked_at: string | null
          macros_used: Json
          merchant_claim_id: string | null
          merchant_id: string
          message_count: number | null
          order_ref: string | null
          outcome: string | null
          provided_evidence: boolean | null
          provider: string
          provider_connection_id: string | null
          raw_payload_hash: string
          resolution_type: string | null
          sentiment_score: number | null
          shop_domain: string | null
          shopify_order_id: string | null
          tags: Json
          time_to_first_claim_message_seconds: number | null
          updated_at: string
          updated_at_provider: string | null
          was_reopened: boolean | null
        }
        Insert: {
          accepted_first_resolution?: boolean | null
          agent_notes_summary?: string | null
          attachments_metadata?: Json
          case_status?: string | null
          channel?: string | null
          chargeback_threatened?: boolean
          claim_reason?: string | null
          claim_type?: string | null
          claim_type_confidence?: number | null
          created_at_provider?: string | null
          customer_email_hash?: string | null
          customer_identifier?: string | null
          customer_message_summary?: string | null
          customer_profile_id?: string | null
          customer_reply_count?: number | null
          decision?: string | null
          escalation_count?: number | null
          external_case_id: string
          external_url?: string | null
          id?: string
          ingested_at?: string
          is_claim?: boolean
          link_metadata?: Json
          link_status?: string
          linked_at?: string | null
          macros_used?: Json
          merchant_claim_id?: string | null
          merchant_id: string
          message_count?: number | null
          order_ref?: string | null
          outcome?: string | null
          provided_evidence?: boolean | null
          provider: string
          provider_connection_id?: string | null
          raw_payload_hash: string
          resolution_type?: string | null
          sentiment_score?: number | null
          shop_domain?: string | null
          shopify_order_id?: string | null
          tags?: Json
          time_to_first_claim_message_seconds?: number | null
          updated_at?: string
          updated_at_provider?: string | null
          was_reopened?: boolean | null
        }
        Update: {
          accepted_first_resolution?: boolean | null
          agent_notes_summary?: string | null
          attachments_metadata?: Json
          case_status?: string | null
          channel?: string | null
          chargeback_threatened?: boolean
          claim_reason?: string | null
          claim_type?: string | null
          claim_type_confidence?: number | null
          created_at_provider?: string | null
          customer_email_hash?: string | null
          customer_identifier?: string | null
          customer_message_summary?: string | null
          customer_profile_id?: string | null
          customer_reply_count?: number | null
          decision?: string | null
          escalation_count?: number | null
          external_case_id?: string
          external_url?: string | null
          id?: string
          ingested_at?: string
          is_claim?: boolean
          link_metadata?: Json
          link_status?: string
          linked_at?: string | null
          macros_used?: Json
          merchant_claim_id?: string | null
          merchant_id?: string
          message_count?: number | null
          order_ref?: string | null
          outcome?: string | null
          provided_evidence?: boolean | null
          provider?: string
          provider_connection_id?: string | null
          raw_payload_hash?: string
          resolution_type?: string | null
          sentiment_score?: number | null
          shop_domain?: string | null
          shopify_order_id?: string | null
          tags?: Json
          time_to_first_claim_message_seconds?: number | null
          updated_at?: string
          updated_at_provider?: string | null
          was_reopened?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "support_case_intake_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_intake_merchant_claim_id_fkey"
            columns: ["merchant_claim_id"]
            isOneToOne: false
            referencedRelation: "support_payout_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_intake_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_intake_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "support_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      support_payout_cases: {
        Row: {
          amount_at_risk: number | null
          assigned_at: string | null
          assigned_to: string | null
          attribution_confidence:
            | Database["public"]["Enums"]["attribution_confidence"]
            | null
          case_origin: string
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
          loss_attribution:
            | Database["public"]["Enums"]["loss_attribution"]
            | null
          manual_reference: string | null
          manual_source_url: string | null
          merchant_id: string
          next_action: string | null
          next_action_reason: string | null
          payout_decision_state: string
          primary_currency: string | null
          reason_normalized: string | null
          reason_raw: string | null
          recommended_payout_action: string | null
          recommended_rule_id: string | null
          recommended_rule_name: string | null
          recoverability: Database["public"]["Enums"]["recoverability"] | null
          recovery_next_action: string | null
          recovery_owner: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence: string[]
          recovery_state: string
          refund_amount: number | null
          replacement_item_value: number | null
          replacement_shipping_cost: number | null
          requested_action: Database["public"]["Enums"]["requested_action"]
          requires_review: boolean
          snoozed_until: string | null
          source_order_id: string | null
          source_ticket_id: string | null
          state_version: number
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
          attribution_confidence?:
            | Database["public"]["Enums"]["attribution_confidence"]
            | null
          case_origin?: string
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
          loss_attribution?:
            | Database["public"]["Enums"]["loss_attribution"]
            | null
          manual_reference?: string | null
          manual_source_url?: string | null
          merchant_id: string
          next_action?: string | null
          next_action_reason?: string | null
          payout_decision_state?: string
          primary_currency?: string | null
          reason_normalized?: string | null
          reason_raw?: string | null
          recommended_payout_action?: string | null
          recommended_rule_id?: string | null
          recommended_rule_name?: string | null
          recoverability?: Database["public"]["Enums"]["recoverability"] | null
          recovery_next_action?: string | null
          recovery_owner?: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence?: string[]
          recovery_state?: string
          refund_amount?: number | null
          replacement_item_value?: number | null
          replacement_shipping_cost?: number | null
          requested_action?: Database["public"]["Enums"]["requested_action"]
          requires_review?: boolean
          snoozed_until?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
          state_version?: number
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
          attribution_confidence?:
            | Database["public"]["Enums"]["attribution_confidence"]
            | null
          case_origin?: string
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
          loss_attribution?:
            | Database["public"]["Enums"]["loss_attribution"]
            | null
          manual_reference?: string | null
          manual_source_url?: string | null
          merchant_id?: string
          next_action?: string | null
          next_action_reason?: string | null
          payout_decision_state?: string
          primary_currency?: string | null
          reason_normalized?: string | null
          reason_raw?: string | null
          recommended_payout_action?: string | null
          recommended_rule_id?: string | null
          recommended_rule_name?: string | null
          recoverability?: Database["public"]["Enums"]["recoverability"] | null
          recovery_next_action?: string | null
          recovery_owner?: Database["public"]["Enums"]["recovery_owner"] | null
          recovery_required_evidence?: string[]
          recovery_state?: string
          refund_amount?: number | null
          replacement_item_value?: number | null
          replacement_shipping_cost?: number | null
          requested_action?: Database["public"]["Enums"]["requested_action"]
          requires_review?: boolean
          snoozed_until?: string | null
          source_order_id?: string | null
          source_ticket_id?: string | null
          state_version?: number
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
      support_provider_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          merchant_id: string
          provider: string
          provider_account_id: string | null
          provider_account_name: string | null
          provider_base_url: string | null
          refresh_token_encrypted: string | null
          scopes: Json
          status: string
          token_expires_at: string | null
          updated_at: string
          webhook_secret_created_at: string | null
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
          provider: string
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          refresh_token_encrypted?: string | null
          scopes?: Json
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret_created_at?: string | null
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
          provider?: string
          provider_account_id?: string | null
          provider_account_name?: string | null
          provider_base_url?: string | null
          refresh_token_encrypted?: string | null
          scopes?: Json
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret_created_at?: string | null
          webhook_secret_hash?: string | null
          webhook_secret_rotated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_provider_connections_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_job_chunks: {
        Row: {
          attempts: number
          chunk_index: number
          claimed_at: string | null
          completed_at: string | null
          id: string
          job_id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
        }
        Insert: {
          attempts?: number
          chunk_index: number
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          job_id: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
        }
        Update: {
          attempts?: number
          chunk_index?: number
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          job_id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
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
          attempts: number
          column_map: Json | null
          completed_at: string | null
          connection_id: string | null
          created_at: string
          cursor: Json | null
          error_log: Json
          failed_rows: number
          file_hash: string | null
          finalize_claimed_at: string | null
          hidden: boolean
          id: string
          job_kind: string
          label: string | null
          last_error_code: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string | null
          processed_rows: number
          source: Database["public"]["Enums"]["signal_source"] | null
          source_account_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
          storage_path: string | null
          total_rows: number | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          column_map?: Json | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          cursor?: Json | null
          error_log?: Json
          failed_rows?: number
          file_hash?: string | null
          finalize_claimed_at?: string | null
          hidden?: boolean
          id?: string
          job_kind: string
          label?: string | null
          last_error_code?: string | null
          max_attempts?: number
          merchant_id: string
          next_attempt_at?: string | null
          processed_rows?: number
          source?: Database["public"]["Enums"]["signal_source"] | null
          source_account_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          storage_path?: string | null
          total_rows?: number | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          column_map?: Json | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          cursor?: Json | null
          error_log?: Json
          failed_rows?: number
          file_hash?: string | null
          finalize_claimed_at?: string | null
          hidden?: boolean
          id?: string
          job_kind?: string
          label?: string | null
          last_error_code?: string | null
          max_attempts?: number
          merchant_id?: string
          next_attempt_at?: string | null
          processed_rows?: number
          source?: Database["public"]["Enums"]["signal_source"] | null
          source_account_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          storage_path?: string | null
          total_rows?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "merchant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "source_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      unmatched_correspondence: {
        Row: {
          candidate_json: Json
          created_at: string
          id: string
          merchant_id: string
          reason: string
          source_provider: string
          source_record_id: string
          source_thread_id: string | null
          source_url: string | null
        }
        Insert: {
          candidate_json?: Json
          created_at?: string
          id: string
          merchant_id: string
          reason: string
          source_provider: string
          source_record_id: string
          source_thread_id?: string | null
          source_url?: string | null
        }
        Update: {
          candidate_json?: Json
          created_at?: string
          id?: string
          merchant_id?: string
          reason?: string
          source_provider?: string
          source_record_id?: string
          source_thread_id?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unmatched_correspondence_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "external_correspondence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmatched_correspondence_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_action_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          created_at: string
          id: string
          merchant_id: string
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
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
          created_at: string
          granted_by: string | null
          grantee_user_id: string
          id: string
          merchant_id: string
          permission: string
          revoked: boolean
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          grantee_user_id: string
          id?: string
          merchant_id: string
          permission: string
          revoked?: boolean
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          grantee_user_id?: string
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
      webhook_logs: {
        Row: {
          claim_type: string | null
          created_at: string
          error: string | null
          external_case_id: string | null
          http_status: number | null
          id: string
          is_claim: boolean | null
          merchant_id: string | null
          provider: string
          status: string
        }
        Insert: {
          claim_type?: string | null
          created_at?: string
          error?: string | null
          external_case_id?: string | null
          http_status?: number | null
          id?: string
          is_claim?: boolean | null
          merchant_id?: string | null
          provider: string
          status: string
        }
        Update: {
          claim_type?: string | null
          created_at?: string
          error?: string | null
          external_case_id?: string | null
          http_status?: number | null
          id?: string
          is_claim?: boolean | null
          merchant_id?: string | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      commerce_store_connections: {
        Row: {
          created_at: string | null
          credentials_encrypted: string | null
          id: string | null
          last_error: string | null
          last_sync_at: string | null
          merchant_id: string | null
          platform: string | null
          status: string | null
          store_key: string | null
          store_url: string | null
          uninstalled_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id?: string | null
          platform?: never
          status?: never
          store_key?: string | null
          store_url?: never
          uninstalled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials_encrypted?: string | null
          id?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          merchant_id?: string | null
          platform?: never
          status?: never
          store_key?: string | null
          store_url?: never
          uninstalled_at?: string | null
          updated_at?: string | null
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
    }
    Functions: {
      add_merchant_topup_credits: {
        Args: {
          p_amount_gbp: number
          p_credits: number
          p_merchant_id: string
          p_stripe_payment_intent_id?: string
        }
        Returns: Json
      }
      all_processing_job_chunks_complete: {
        Args: { p_job_id: string }
        Returns: boolean
      }
      begin_processing_job_chunk: {
        Args: { p_chunk_index: number; p_job_id: string }
        Returns: string
      }
      claim_domain_event_deliveries: {
        Args: {
          p_handler_name: string
          p_lease_seconds?: number
          p_limit?: number
          p_worker_id?: string
        }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          domain_event_id: string
          handler_name: string
          id: string
          last_error: string | null
          leased_by: string | null
          leased_until: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_event_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_ingestion_event: {
        Args: {
          p_event_id: string
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempts: number
          connection_id: string | null
          created_at: string
          event_type: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          leased_by: string | null
          leased_until: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string
          payload: Json | null
          payload_hash: string
          payload_ref: string | null
          provider_event_id: string | null
          received_at: string
          retention_deadline: string | null
          source_account_ref: string | null
          source_system: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_processed_webhook: {
        Args: {
          p_key: string
          p_provider: string
          p_store_key: string
          p_topic: string
        }
        Returns: boolean
      }
      claim_sync_job: {
        Args: { p_lease_seconds?: number; p_limit?: number; p_worker?: string }
        Returns: {
          attempts: number
          column_map: Json | null
          completed_at: string | null
          connection_id: string | null
          created_at: string
          cursor: Json | null
          error_log: Json
          failed_rows: number
          file_hash: string | null
          finalize_claimed_at: string | null
          hidden: boolean
          id: string
          job_kind: string
          label: string | null
          last_error_code: string | null
          max_attempts: number
          merchant_id: string
          next_attempt_at: string | null
          processed_rows: number
          source: Database["public"]["Enums"]["signal_source"] | null
          source_account_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
          storage_path: string | null
          total_rows: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sync_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_domain_event_delivery: {
        Args: { p_delivery_id: string }
        Returns: undefined
      }
      complete_processing_job_chunk: {
        Args: { p_chunk_index: number; p_job_id: string }
        Returns: undefined
      }
      consume_context_credits_if_available: {
        Args: {
          p_allow_soft_cap?: boolean
          p_claim_id?: string
          p_context_type: string
          p_credits_to_spend: number
          p_customer_ref?: string
          p_merchant_id: string
          p_metadata?: Json
          p_monthly_allowance: number
          p_order_ref?: string
          p_period_end: string
          p_period_start: string
          p_plan_tier: string
          p_reason?: string
          p_ticket_ref?: string
          p_user_id: string
        }
        Returns: Json
      }
      deduct_merchant_credits: {
        Args: { p_credits: number; p_merchant_id: string }
        Returns: Json
      }
      fail_domain_event_delivery: {
        Args: {
          p_backoff_seconds?: number
          p_delivery_id: string
          p_error: string
        }
        Returns: undefined
      }
      fail_processing_job_chunk: {
        Args: { p_chunk_index: number; p_error: string; p_job_id: string }
        Returns: undefined
      }
      generate_evidence_reference: { Args: never; Returns: string }
      increment_api_key_minute_count: {
        Args: { p_key_id: string; p_window_minute: number }
        Returns: number
      }
      increment_job_progress: {
        Args: {
          p_failed_delta?: number
          p_job_id: string
          p_processed_delta: number
        }
        Returns: undefined
      }
      increment_rate_limit: {
        Args: { p_ip_hash: string; p_window_start: string }
        Returns: number
      }
      ingest_identity_observations: {
        Args: { p_edges: Json; p_merchant_id: string; p_signals: Json }
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
      merchant_role: { Args: { p_merchant_id: string }; Returns: string }
      next_pending_processing_chunk_index: {
        Args: { p_job_id: string }
        Returns: number
      }
      purge_merchant_source_agnostic: {
        Args: { p_merchant_id: string }
        Returns: undefined
      }
      record_domain_event: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_aggregate_id: string
          p_aggregate_type: string
          p_causation_id?: string
          p_connection_id?: string
          p_correlation_id?: string
          p_event_type: string
          p_handlers?: string[]
          p_idempotency_key: string
          p_ingestion_event_id?: string
          p_merchant_id: string
          p_occurred_at?: string
          p_payload?: Json
          p_source_record_id?: string
        }
        Returns: {
          actor_id: string | null
          actor_type: string
          aggregate_id: string | null
          aggregate_type: string
          causation_id: string | null
          connection_id: string | null
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          ingestion_event_id: string | null
          merchant_id: string
          occurred_at: string
          payload: Json
          recorded_at: string
          schema_version: number
          source_record_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "domain_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_audit_customer_summaries: {
        Args: { p_audit_id: string; p_merchant_id: string }
        Returns: number
      }
      register_processing_job_chunks: {
        Args: {
          p_column_map?: Json
          p_job_id: string
          p_merchant_id: string
          p_storage_path: string
          p_total_chunks: number
        }
        Returns: undefined
      }
      reset_merchant_monthly_credits: {
        Args: {
          p_cycle_reset_at: string
          p_merchant_id: string
          p_monthly_allowance: number
        }
        Returns: Json
      }
      set_checkout_signal_cross_merchant_hits: {
        Args: { p_hit_count: number; p_signal_id: string }
        Returns: undefined
      }
      set_merchant_monthly_credits: {
        Args: { p_merchant_id: string; p_monthly_credits: number }
        Returns: Json
      }
      try_claim_job_finalize: { Args: { p_job_id: string }; Returns: boolean }
    }
    Enums: {
      attribution_confidence: "high" | "medium" | "low" | "needs_more_evidence"
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
      claim_type:
        | "item_not_received"
        | "damaged"
        | "wrong_item"
        | "not_as_described"
        | "refund_request"
        | "chargeback"
        | "return_abuse"
        | "other"
      confidence_grade: "weak" | "possible" | "probable" | "definite"
      connection_status: "active" | "disabled" | "revoked" | "error"
      correspondence_extraction_status:
        | "not_required"
        | "pending"
        | "extracted"
        | "failed"
        | "low_confidence"
      evidence_extraction_method:
        | "direct_api"
        | "webhook"
        | "email_parser"
        | "helpdesk_parser"
        | "llm_extractor"
        | "deterministic_rule"
      external_clarification_request_status:
        | "generated"
        | "blocked_by_settings"
        | "sent"
        | "failed"
        | "reply_received"
        | "expired"
      external_correspondence_channel:
        | "provider_api"
        | "gmail"
        | "outlook"
        | "gorgias"
        | "zendesk"
        | "intercom"
        | "slack"
        | "erp"
        | "wms"
        | "marketplace_portal_api"
        | "payment_processor_api"
      external_correspondence_direction: "inbound" | "outbound"
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
      loss_attribution:
        | "customer_claim"
        | "carrier_loss"
        | "carrier_damage"
        | "delivery_confirmed_evidence"
        | "warehouse_mispick"
        | "warehouse_missing_item"
        | "three_pl_late_dispatch"
        | "supplier_defect"
        | "packaging_failure"
        | "merchant_policy"
        | "unknown"
        | "repeat_claimant"
        | "policy_override"
      loss_case_category:
        | "delivery_loss"
        | "chargeback_or_payment_dispute"
        | "refund_dispute"
        | "returns_abuse_or_exception"
        | "damaged_goods"
        | "wrong_item_or_missing_item"
        | "fulfilment_or_warehouse_error"
        | "3pl_accountability"
        | "shipping_protection_claim"
        | "marketplace_dispute"
        | "supplier_or_vendor_issue"
        | "tax_duty_or_customs_issue"
        | "subscription_or_digital_fulfilment_issue"
        | "unknown_post_purchase_loss"
      loss_case_event_type:
        | "case_detected"
        | "evidence_pulled"
        | "missing_evidence_identified"
        | "correspondence_ingested"
        | "correspondence_matched"
        | "correspondence_unmatched"
        | "facts_extracted"
        | "clarification_request_generated"
        | "clarification_request_sent"
        | "external_response_received"
        | "evidence_pack_generated"
        | "claim_submitted"
        | "status_synced"
        | "case_closed"
        | "sync_failed"
      loss_case_evidence_source_provider:
        | "shopify"
        | "gorgias"
        | "zendesk"
        | "intercom"
        | "aftership"
        | "carrier_api"
        | "gmail"
        | "outlook"
        | "stripe"
        | "paypal"
        | "adyen"
        | "shopify_payments"
        | "returns_provider"
        | "3pl"
        | "wms"
        | "erp"
        | "marketplace"
        | "shipping_protection_provider"
        | "supplier_portal"
        | "slack"
      loss_case_status:
        | "detected"
        | "collecting_evidence"
        | "missing_source_data"
        | "needs_external_correspondence"
        | "external_correspondence_requested"
        | "external_response_received"
        | "evidence_pack_ready"
        | "submitted"
        | "approved"
        | "partially_approved"
        | "denied"
        | "expired"
        | "closed_unrecoverable"
      loss_counterparty_type:
        | "carrier"
        | "3pl"
        | "warehouse"
        | "payment_processor"
        | "bank"
        | "card_network"
        | "marketplace"
        | "returns_provider"
        | "shipping_protection_provider"
        | "supplier"
        | "customs_broker"
        | "customer"
        | "internal_team"
        | "unknown"
      loss_recovery_route:
        | "carrier_claim"
        | "carrier_service_refund"
        | "3pl_claim"
        | "shipping_protection_claim"
        | "payment_processor_dispute"
        | "chargeback_evidence_pack"
        | "bank_or_card_network_response"
        | "returns_platform_claim"
        | "marketplace_claim"
        | "supplier_vendor_claim"
        | "internal_fulfilment_issue"
        | "customer_evidence_review"
        | "not_recoverable"
        | "needs_more_evidence"
      loss_source_confidence:
        | "source_verified"
        | "partial_source_verified"
        | "insufficient_source_data"
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
      partner_status: "active" | "inactive"
      partner_type:
        | "carrier"
        | "three_pl"
        | "warehouse"
        | "supplier"
        | "returns_provider"
        | "payment_dispute_provider"
        | "internal_team"
        | "other"
      platform_kind: "shopify" | "woocommerce" | "bigcommerce"
      recoverability:
        | "recoverable"
        | "possibly_recoverable"
        | "not_recoverable"
        | "needs_more_evidence"
        | "unknown"
      recovery_case_event_type:
        | "created"
        | "status_changed"
        | "evidence_added"
        | "submitted"
        | "chased"
        | "approved"
        | "partially_approved"
        | "rejected"
        | "appealed"
        | "paid"
        | "closed"
      recovery_case_owner_type:
        | "carrier"
        | "three_pl"
        | "warehouse"
        | "supplier"
        | "returns_provider"
        | "payment_dispute_provider"
        | "merchant_support"
        | "merchant_ops"
        | "merchant_finance"
        | "unknown"
      recovery_case_status:
        | "draft"
        | "evidence_needed"
        | "ready_to_submit"
        | "submitted"
        | "waiting_response"
        | "chase_due"
        | "approved"
        | "partially_approved"
        | "rejected"
        | "appealed"
        | "paid"
        | "closed_unrecoverable"
      recovery_case_type:
        | "carrier_claim"
        | "three_pl_claim"
        | "warehouse_error"
        | "supplier_defect"
        | "packaging_issue"
        | "returns_provider_claim"
        | "chargeback_evidence"
        | "internal_policy_fix"
        | "other"
      recovery_confidence: "high" | "medium" | "low"
      recovery_liability_cap_basis:
        | "fixed"
        | "declared_value"
        | "insured_value"
        | "contractual"
        | "unknown"
      recovery_owner:
        | "carrier"
        | "three_pl"
        | "warehouse"
        | "supplier"
        | "merchant"
        | "unknown"
      recovery_rule_claim_type:
        | "item_not_received"
        | "damaged_item"
        | "wrong_item"
        | "missing_item"
        | "late_delivery"
        | "returnless_refund"
        | "discount_request"
        | "store_credit_request"
        | "chargeback_related"
        | "replacement_request"
        | "other"
      recovery_rule_source_type:
        | "unauth_default"
        | "merchant_configured"
        | "contract_extracted"
        | "manual"
      recovery_submission_method:
        | "portal"
        | "email"
        | "api"
        | "manual"
        | "unknown"
      requested_action:
        | "refund"
        | "reship"
        | "replacement"
        | "discount"
        | "store_credit"
        | "escalation"
        | "unknown"
        | "return_label"
        | "investigation"
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
      attribution_confidence: ["high", "medium", "low", "needs_more_evidence"],
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
      confidence_grade: ["weak", "possible", "probable", "definite"],
      connection_status: ["active", "disabled", "revoked", "error"],
      correspondence_extraction_status: [
        "not_required",
        "pending",
        "extracted",
        "failed",
        "low_confidence",
      ],
      evidence_extraction_method: [
        "direct_api",
        "webhook",
        "email_parser",
        "helpdesk_parser",
        "llm_extractor",
        "deterministic_rule",
      ],
      external_clarification_request_status: [
        "generated",
        "blocked_by_settings",
        "sent",
        "failed",
        "reply_received",
        "expired",
      ],
      external_correspondence_channel: [
        "provider_api",
        "gmail",
        "outlook",
        "gorgias",
        "zendesk",
        "intercom",
        "slack",
        "erp",
        "wms",
        "marketplace_portal_api",
        "payment_processor_api",
      ],
      external_correspondence_direction: ["inbound", "outbound"],
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
      loss_attribution: [
        "customer_claim",
        "carrier_loss",
        "carrier_damage",
        "delivery_confirmed_evidence",
        "warehouse_mispick",
        "warehouse_missing_item",
        "three_pl_late_dispatch",
        "supplier_defect",
        "packaging_failure",
        "merchant_policy",
        "unknown",
        "repeat_claimant",
        "policy_override",
      ],
      loss_case_category: [
        "delivery_loss",
        "chargeback_or_payment_dispute",
        "refund_dispute",
        "returns_abuse_or_exception",
        "damaged_goods",
        "wrong_item_or_missing_item",
        "fulfilment_or_warehouse_error",
        "3pl_accountability",
        "shipping_protection_claim",
        "marketplace_dispute",
        "supplier_or_vendor_issue",
        "tax_duty_or_customs_issue",
        "subscription_or_digital_fulfilment_issue",
        "unknown_post_purchase_loss",
      ],
      loss_case_event_type: [
        "case_detected",
        "evidence_pulled",
        "missing_evidence_identified",
        "correspondence_ingested",
        "correspondence_matched",
        "correspondence_unmatched",
        "facts_extracted",
        "clarification_request_generated",
        "clarification_request_sent",
        "external_response_received",
        "evidence_pack_generated",
        "claim_submitted",
        "status_synced",
        "case_closed",
        "sync_failed",
      ],
      loss_case_evidence_source_provider: [
        "shopify",
        "gorgias",
        "zendesk",
        "intercom",
        "aftership",
        "carrier_api",
        "gmail",
        "outlook",
        "stripe",
        "paypal",
        "adyen",
        "shopify_payments",
        "returns_provider",
        "3pl",
        "wms",
        "erp",
        "marketplace",
        "shipping_protection_provider",
        "supplier_portal",
        "slack",
      ],
      loss_case_status: [
        "detected",
        "collecting_evidence",
        "missing_source_data",
        "needs_external_correspondence",
        "external_correspondence_requested",
        "external_response_received",
        "evidence_pack_ready",
        "submitted",
        "approved",
        "partially_approved",
        "denied",
        "expired",
        "closed_unrecoverable",
      ],
      loss_counterparty_type: [
        "carrier",
        "3pl",
        "warehouse",
        "payment_processor",
        "bank",
        "card_network",
        "marketplace",
        "returns_provider",
        "shipping_protection_provider",
        "supplier",
        "customs_broker",
        "customer",
        "internal_team",
        "unknown",
      ],
      loss_recovery_route: [
        "carrier_claim",
        "carrier_service_refund",
        "3pl_claim",
        "shipping_protection_claim",
        "payment_processor_dispute",
        "chargeback_evidence_pack",
        "bank_or_card_network_response",
        "returns_platform_claim",
        "marketplace_claim",
        "supplier_vendor_claim",
        "internal_fulfilment_issue",
        "customer_evidence_review",
        "not_recoverable",
        "needs_more_evidence",
      ],
      loss_source_confidence: [
        "source_verified",
        "partial_source_verified",
        "insufficient_source_data",
      ],
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
      partner_status: ["active", "inactive"],
      partner_type: [
        "carrier",
        "three_pl",
        "warehouse",
        "supplier",
        "returns_provider",
        "payment_dispute_provider",
        "internal_team",
        "other",
      ],
      platform_kind: ["shopify", "woocommerce", "bigcommerce"],
      recoverability: [
        "recoverable",
        "possibly_recoverable",
        "not_recoverable",
        "needs_more_evidence",
        "unknown",
      ],
      recovery_case_event_type: [
        "created",
        "status_changed",
        "evidence_added",
        "submitted",
        "chased",
        "approved",
        "partially_approved",
        "rejected",
        "appealed",
        "paid",
        "closed",
      ],
      recovery_case_owner_type: [
        "carrier",
        "three_pl",
        "warehouse",
        "supplier",
        "returns_provider",
        "payment_dispute_provider",
        "merchant_support",
        "merchant_ops",
        "merchant_finance",
        "unknown",
      ],
      recovery_case_status: [
        "draft",
        "evidence_needed",
        "ready_to_submit",
        "submitted",
        "waiting_response",
        "chase_due",
        "approved",
        "partially_approved",
        "rejected",
        "appealed",
        "paid",
        "closed_unrecoverable",
      ],
      recovery_case_type: [
        "carrier_claim",
        "three_pl_claim",
        "warehouse_error",
        "supplier_defect",
        "packaging_issue",
        "returns_provider_claim",
        "chargeback_evidence",
        "internal_policy_fix",
        "other",
      ],
      recovery_confidence: ["high", "medium", "low"],
      recovery_liability_cap_basis: [
        "fixed",
        "declared_value",
        "insured_value",
        "contractual",
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
      recovery_rule_claim_type: [
        "item_not_received",
        "damaged_item",
        "wrong_item",
        "missing_item",
        "late_delivery",
        "returnless_refund",
        "discount_request",
        "store_credit_request",
        "chargeback_related",
        "replacement_request",
        "other",
      ],
      recovery_rule_source_type: [
        "unauth_default",
        "merchant_configured",
        "contract_extracted",
        "manual",
      ],
      recovery_submission_method: [
        "portal",
        "email",
        "api",
        "manual",
        "unknown",
      ],
      requested_action: [
        "refund",
        "reship",
        "replacement",
        "discount",
        "store_credit",
        "escalation",
        "unknown",
        "return_label",
        "investigation",
      ],
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
