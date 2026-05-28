export const API_BASE = 'https://app.unauth.co';
export const APP_ORIGIN = 'https://app.unauth.co';

export type LookupResponse = {
  email: string;
  risk_grade: 'A' | 'B' | 'C' | 'D';
  confidence: 'definite' | 'probable' | 'possible' | 'weak';
  risk_score: number;
  signals: string[];
  cross_merchant: {
    merchant_count: number;
    claim_count: number;
    flagged?: boolean;
  } | null;
  looked_up_at: string;
};

export type EvidenceResponse = {
  evidence_id: string;
  reference: string;
  has_prior_match_evidence: boolean;
  matched_prior_signals: unknown[];
  pdf_url: string;
  download_url?: string;
  created_at: string;
};

export type ApiErrorCode = 401 | 404 | 429 | 'network' | 'unknown';

export type StorageState = {
  apiKey?: string;
  badgeDismissed?: boolean;
  pendingEmail?: string;
  detectedEmail?: string;
};
