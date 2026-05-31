export const API_BASE = __UNAUTH_API_BASE__;
export const APP_ORIGIN = __UNAUTH_API_BASE__;

export type LookupResponse = {
  email: string;
  /** Identity confidence grade — who the person is, NOT how risky they are. */
  confidence: 'definite' | 'probable' | 'possible' | 'weak';
  matched_on: string[];
  claims_record: {
    refunds: number;
    chargebacks: number;
    source: 'your_store' | 'network';
    cross_merchant: {
      merchant_count: number;
      claim_count: number;
    } | null;
    /** Total refund value of your store's own claims (own data; null if none). */
    refund_value: number | null;
    /** ISO date of your store's most recent claim (own data; null if none). */
    last_claim_at: string | null;
  };
  ce3_evidence_available: boolean;
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
