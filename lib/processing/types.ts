export interface ParsedCsvRow {
  order_id: string;
  order_date: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  order_total: string;
  currency?: string;
  order_status?: string;
  customer_phone?: string;
  billing_address?: string;
  shipping_postcode?: string;
  postcode?: string;
  refund_status?: string;
  refund_reason?: string;
  refund_date?: string;
  refund_amount?: string;
  payment_method?: string;
  ip_address?: string;
  device_id?: string;
  card_last4?: string;
  card_bin?: string;
  account_id?: string;
  ground_truth_label?: string;
  [key: string]: string | undefined;
}

export interface FraudTransactionInsert {
  job_id: string;
  order_id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  billing_address?: string;
  order_value: number;
  payment_method?: string;
  card_last4?: string;
  device_ip?: string;
  account_created_at?: string | null;
  previous_order_count?: number | null;
  delivery_status?: string;
  refund_claimed?: boolean;
  refund_reason?: string;
  chargeback_filed?: boolean | null;
  match_score: number;
  fraud_flags: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  identity_confidence_grade?: 'weak' | 'possible' | 'probable' | 'definite' | null;
  identity_score?: number | null;
  signals_matched?: string[];
  behavioural_flags?: string[];
  recommended_action?: string | null;
  ce3_eligible?: boolean;
  ce3_qualifying_transactions?: string[];
  cluster_id?: string | null;
}
