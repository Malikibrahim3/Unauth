import type { ConfidenceGrade } from '@/lib/engine/weights';

// ---------------------------------------------------------------------------
// CSV field types (preserved for audit result display)
// ---------------------------------------------------------------------------

export type RequiredField =
  | 'order_id'
  | 'order_date'
  | 'customer_email'
  | 'customer_name'
  | 'shipping_address'
  | 'order_total'
  | 'currency'
  | 'order_status'
  | 'customer_phone'
  | 'billing_address'
  | 'refund_status'
  | 'refund_reason'
  | 'refund_date'
  | 'refund_amount'
  | 'payment_method'
  | 'ip_address'
  | 'device_id'
  | 'card_last4'
  | 'card_bin'
  | 'card_fingerprint'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'user_agent'
  | 'asn'
  | 'account_id'
  | 'ground_truth_label'
  | 'chargeback_dispute'
  | 'chargeback_date'
  | 'chargeback_reason_code'
  | 'refund_requested'
  | 'return_requested'
  | 'delivery_status'
  | 'delivery_method'
  | 'tracking_number';

export const REQUIRED_FIELDS: RequiredField[] = [
  'order_id',
  'order_date',
  'customer_email',
  'order_total',
];

export type DataQualityGrade = 'rich' | 'adequate' | 'sparse' | 'minimal';

export interface PipelineWarningCounters {
  fastContextReadRetries: number;
  fastContextReadFailures: number;
  entityResolutionErrors: number;
  coOccurrenceUpstreamDown: number;
  transactionUpsertFailedRows: number;
}

export interface DataQualityRecommendation {
  field: string;
  humanLabel: string;
  impact: string;
  howToExport: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DataQualityReport {
  score: number;
  grade: DataQualityGrade;
  presentFields: string[];
  missingHighValue: string[];
  missingMediumValue: string[];
  rowCoverage: Record<string, number>;
  partlyEmptyFields: string[];
  maxAchievableGrade: ConfidenceGrade;
  recommendations: DataQualityRecommendation[];
  pipelineWarnings?: PipelineWarningCounters;
}
