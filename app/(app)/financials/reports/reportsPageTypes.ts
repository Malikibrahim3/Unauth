export const REPORTS_TABS = ['overview', 'recovery'] as const;
export type ReportsTab = (typeof REPORTS_TABS)[number];

export type ClaimRow = {
  id: string;
  status: string;
  claim_type?: string | null;
  currency?: string | null;
  amount_at_risk: number | null;
  total_estimated_loss?: number | null;
  refund_amount?: number | null;
  replacement_item_value?: number | null;
  replacement_shipping_cost?: number | null;
  discount_amount?: number | null;
  store_credit_amount?: number | null;
  requested_action?: string | null;
  recoverability?: string | null;
  recovery_owner?: string | null;
  recommended_payout_action?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClaimTypeBreakdown = Array<{
  type: string;
  label: string;
  count: number;
  value: number;
}>;

export type OutcomeBreakdown = Array<{
  decision: string;
  label: string;
  count: number;
  value: number;
}>;

export type SourcesCoverage = {
  customerProfiles: number;
  merchantClaims: number;
  supportCases: number;
  evidencePackages: number;
  auditTransactions: number;
  recoveryCases: number;
  partners: number;
  partnerRules: number;
};

export type RunSummary = {
  id: string;
  created_at: string;
  total_rows: number;
  flagged_count: number | null;
  filename?: string | null;
  status?: string | null;
};

export type GradeBucket = 'definite' | 'probable' | 'possible' | 'weak';

export type TxGradeRow = {
  identity_confidence_grade: string | null;
  match_status: string | null;
};

export type GradeBucketDisplay = {
  key: GradeBucket;
  label: string;
  color: string;
  count: number;
  pct: number;
};

export type OutcomeRow = {
  claim_id: string;
  decision: string | null;
  outcome: string | null;
  amount_refunded: number | null;
  amount_recovered: number | null;
  recommended_payout_action: string | null;
  followed_recommendation: boolean | null;
  decided_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RecoveryMetrics = {
  totalCases: number;
  openCases: number;
  evidenceNeeded: number;
  chaseDue: number;
  submittedCases: number;
  approvedCases: number;
  rejectedCases: number;
  recoveredAmount: number;
  unrecoveredAmount: number;
  openRecoveryValue: number;
  estimatedRecoverableMax: number;
  winRate: number;
};

export type RecoveryStatusBreakdown = Array<{
  status: string;
  label: string;
  count: number;
  value: number;
}>;

export type PartnerPerformanceRow = {
  partnerId: string;
  partnerName: string;
  ownerType: string;
  cases: number;
  recoveredAmount: number;
  openRecoveryValue: number;
};
