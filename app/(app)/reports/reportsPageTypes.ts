export const REPORTS_TABS = ['overview', 'csv', 'integration'] as const;
export type ReportsTab = (typeof REPORTS_TABS)[number];

export type ClaimRow = {
  id: string;
  status: string;
  amount_at_risk: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

export type RatePoint = { x: number; y: number; rate: number };

export type OutcomeRow = {
  claim_id: string;
  decision: string | null;
  outcome: string | null;
  amount_refunded: number | null;
  decided_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
