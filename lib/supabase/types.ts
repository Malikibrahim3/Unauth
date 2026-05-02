export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SignalType =
  | 'email'
  | 'phone'
  | 'address_shipping'
  | 'address_billing'
  | 'name'
  | 'card_fingerprint'
  | 'card_bin'
  | 'card_last4'
  | 'card_bin_last4'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'user_agent'
  | 'asn'
  | 'account_id'
  | 'ip'
  | 'device';

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Legacy run table removed in migration 0025. processing_jobs is
      // now the single source of truth for all upload runs.
      transactions: {
        Row: {
          id: string;
          run_id: string;
          merchant_id: string;
          external_order_id: string;
          order_date: string;
          order_total: number;
          currency: string;
          order_status: string | null;
          refund_status: string | null;
          refund_reason: string | null;
          refund_date: string | null;
          email_hash: string;
          address_hash: string | null;
          phone_hash: string | null;
          name_hash: string | null;
          billing_address_hash: string | null;
          ip_hash: string | null;
          device_id_hash: string | null;
          card_fingerprint: string | null;
          identity_id: string | null;
          match_score: number;
          risk_tier: 'low' | 'medium' | 'high' | 'critical';
          flagged: boolean;
          signals_fired: Json;
          ground_truth_label: 'fraud' | 'legitimate' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          merchant_id: string;
          external_order_id: string;
          order_date: string;
          order_total: number;
          currency?: string;
          order_status?: string | null;
          refund_status?: string | null;
          refund_reason?: string | null;
          refund_date?: string | null;
          email_hash: string;
          address_hash?: string | null;
          phone_hash?: string | null;
          name_hash?: string | null;
          billing_address_hash?: string | null;
          ip_hash?: string | null;
          device_id_hash?: string | null;
          card_fingerprint?: string | null;
          identity_id?: string | null;
          match_score: number;
          risk_tier: 'low' | 'medium' | 'high' | 'critical';
          flagged?: boolean;
          signals_fired?: Json;
          ground_truth_label?: 'fraud' | 'legitimate' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          merchant_id?: string;
          external_order_id?: string;
          order_date?: string;
          order_total?: number;
          currency?: string;
          order_status?: string | null;
          refund_status?: string | null;
          refund_reason?: string | null;
          refund_date?: string | null;
          email_hash?: string;
          address_hash?: string | null;
          phone_hash?: string | null;
          name_hash?: string | null;
          billing_address_hash?: string | null;
          ip_hash?: string | null;
          device_id_hash?: string | null;
          card_fingerprint?: string | null;
          identity_id?: string | null;
          match_score?: number;
          risk_tier?: 'low' | 'medium' | 'high' | 'critical';
          flagged?: boolean;
          signals_fired?: Json;
          ground_truth_label?: 'fraud' | 'legitimate' | null;
          created_at?: string;
        };
        Relationships: [];
      };
      identities: {
        Row: {
          id: string;
          primary_email_hash: string;
          merchant_count: number;
          total_orders: number;
          total_refunds: number;
          total_inr_claims: number;
          is_merged: boolean;
          merged_into: string | null;
          first_seen_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          primary_email_hash: string;
          merchant_count?: number;
          total_orders?: number;
          total_refunds?: number;
          total_inr_claims?: number;
          is_merged?: boolean;
          merged_into?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          primary_email_hash?: string;
          merchant_count?: number;
          total_orders?: number;
          total_refunds?: number;
          total_inr_claims?: number;
          is_merged?: boolean;
          merged_into?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      identity_signal_links: {
        Row: {
          id: string;
          identity_id: string;
          signal_type: SignalType;
          signal_hash: string;
          confidence: number;
          first_seen_at: string;
          last_seen_at: string;
          occurrence_count: number;
        };
        Insert: {
          id?: string;
          identity_id: string;
          signal_type: SignalType;
          signal_hash: string;
          confidence: number;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
        };
        Update: {
          id?: string;
          identity_id?: string;
          signal_type?: SignalType;
          signal_hash?: string;
          confidence?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
        };
        Relationships: [];
      };
      identity_merges: {
        Row: {
          id: string;
          surviving_identity_id: string;
          absorbed_identity_id: string;
          merge_trigger: string;
          merge_confidence: number;
          merged_at: string;
        };
        Insert: {
          id?: string;
          surviving_identity_id: string;
          absorbed_identity_id: string;
          merge_trigger: string;
          merge_confidence: number;
          merged_at?: string;
        };
        Update: {
          id?: string;
          surviving_identity_id?: string;
          absorbed_identity_id?: string;
          merge_trigger?: string;
          merge_confidence?: number;
          merged_at?: string;
        };
        Relationships: [];
      };
      identity_sightings: {
        Row: {
          id: string;
          identity_id: string;
          merchant_id: string;
          first_seen_at: string;
          last_seen_at: string;
          order_count: number;
          refund_count: number;
          inr_count: number;
        };
        Insert: {
          id?: string;
          identity_id: string;
          merchant_id: string;
          first_seen_at?: string;
          last_seen_at?: string;
          order_count?: number;
          refund_count?: number;
          inr_count?: number;
        };
        Update: {
          id?: string;
          identity_id?: string;
          merchant_id?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          order_count?: number;
          refund_count?: number;
          inr_count?: number;
        };
        Relationships: [];
      };
      access_audit_log: {
        Row: {
          id: string;
          merchant_id: string;
          identity_id: string | null;
          query_type: string;
          k_anonymity_satisfied: boolean;
          result_returned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          identity_id?: string | null;
          query_type: string;
          k_anonymity_satisfied: boolean;
          result_returned: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          identity_id?: string | null;
          query_type?: string;
          k_anonymity_satisfied?: boolean;
          result_returned?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      lookup_daily_counts: {
        Row: {
          merchant_id: string;
          lookup_date: string;
          count: number;
        };
        Insert: {
          merchant_id: string;
          lookup_date?: string;
          count?: number;
        };
        Update: {
          merchant_id?: string;
          lookup_date?: string;
          count?: number;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          id: string;
          merchant_id: string;
          status: string;
          total_rows: number;
          processed_rows: number;
          failed_rows: number;
          error_log: Json;
          has_ground_truth: boolean | null;
          flagged_count: number | null;
          filename: string;
          completed_at: string | null;
          hidden_by_merchant: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string;
          status: string;
          total_rows?: number;
          processed_rows?: number;
          failed_rows?: number;
          error_log?: Json;
          has_ground_truth?: boolean | null;
          flagged_count?: number | null;
          filename?: string;
          completed_at?: string | null;
          hidden_by_merchant?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          status?: string;
          total_rows?: number;
          processed_rows?: number;
          failed_rows?: number;
          error_log?: Json;
          has_ground_truth?: boolean | null;
          flagged_count?: number | null;
          filename?: string;
          completed_at?: string | null;
          hidden_by_merchant?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_transactions: {
        Row: {
          id: string;
          job_id: string;
          order_id: string;
          customer_email: string | null;
          customer_name: string | null;
          shipping_address: string | null;
          billing_address: string | null;
          order_value: number | null;
          payment_method: string | null;
          card_last4: string | null;
          device_ip: string | null;
          account_created_at: string | null;
          previous_order_count: number | null;
          delivery_status: string | null;
          refund_claimed: boolean | null;
          refund_reason: string | null;
          chargeback_filed: boolean | null;
          match_score: number;
          fraud_flags: Json;
          risk_level: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          order_id: string;
          customer_email?: string | null;
          customer_name?: string | null;
          shipping_address?: string | null;
          billing_address?: string | null;
          order_value?: number | null;
          payment_method?: string | null;
          card_last4?: string | null;
          device_ip?: string | null;
          account_created_at?: string | null;
          previous_order_count?: number | null;
          delivery_status?: string | null;
          refund_claimed?: boolean | null;
          refund_reason?: string | null;
          chargeback_filed?: boolean | null;
          match_score?: number;
          fraud_flags?: Json;
          risk_level?: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          order_id?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          shipping_address?: string | null;
          billing_address?: string | null;
          order_value?: number | null;
          payment_method?: string | null;
          card_last4?: string | null;
          device_ip?: string | null;
          account_created_at?: string | null;
          previous_order_count?: number | null;
          delivery_status?: string | null;
          refund_claimed?: boolean | null;
          refund_reason?: string | null;
          chargeback_filed?: boolean | null;
          match_score?: number;
          fraud_flags?: Json;
          risk_level?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      upsert_identity_v2: {
        Args: {
          p_email_hash: string;
          p_merchant_id: string;
          p_is_refund: boolean;
          p_is_inr: boolean;
          p_signals: Record<string, string>;
        };
        Returns: string;
      };
      search_customer_profiles: {
        Args: {
          p_email?:   string | null;
          p_name?:    string | null;
          p_address?: string | null;
          p_card?:    string | null;
          p_ip?:      string | null;
        };
        Returns: Array<{
          id: string;
          primary_email: string | null;
          emails: Json;
          ips: Json;
          addresses: Json;
          card_last4s: Json;
          phones: Json;
          names: Json;
          risk_score: number;
          risk_level: string;
          fraud_flags: Json;
          total_orders: number;
          total_refund_claims: number;
          total_chargebacks: number;
          total_merchants_seen_at: number;
          refund_rate: number;
          refund_timestamps: Json;
          fastest_claim_days: number | null;
          avg_claim_days: number | null;
          refund_acceleration_score: number;
          merchant_ids: Json;
          first_seen: string;
          last_seen: string;
          last_audit_id: string | null;
          profile_confidence: number;
          manually_reviewed: boolean;
          merchant_notes: string | null;
          on_watchlist: boolean;
        }>;
      };
      search_customer_profiles_batch: {
        Args: {
          p_emails?: string[] | null;
          p_cards?:  string[] | null;
          p_ips?:    string[] | null;
        };
        Returns: Array<{
          id: string;
          primary_email: string | null;
          emails: Json;
          ips: Json;
          addresses: Json;
          card_last4s: Json;
          names: Json;
          risk_score: number;
          risk_level: string;
          fraud_flags: Json;
          total_orders: number;
          total_refund_claims: number;
          total_merchants_seen_at: number;
          refund_rate: number;
          merchant_ids: Json;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
