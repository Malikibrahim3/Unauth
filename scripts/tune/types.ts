/**
 * Shared types for the identity engine test harness.
 */

// ---------------------------------------------------------------------------
// Ground truth manifest — produced BEFORE the engine sees the data
// ---------------------------------------------------------------------------

export interface CanonicalCustomer {
  /** Stable canonical customer ID (e.g. "cust-001"). Engine must not see this. */
  id: string;
  /** All order IDs that belong to this customer. */
  orderIds: string[];
  /**
   * Scenario tag: what linking challenge this customer represents.
   * e.g. 'email_variants', 'card_only', 'ip_card', 'fraud_ring_member', etc.
   */
  scenario: string;
  /**
   * Which signals are available to the engine to identify this customer.
   * Used in failure analysis to know which signal tier should have caught the match.
   */
  availableSignals: SignalType[];
  /** Minimum expected confidence for a correct match (informational only). */
  minExpectedConfidence?: number;
}

export interface FalsePositiveTrap {
  /**
   * These orders MUST NEVER be merged into the same profile.
   * Any pair from this list that ends up in the same profile = false positive.
   */
  orderIds: string[];
  reason: string; // e.g. 'household_shared_ip', 'similar_names', 'office_wifi'
  /** Which shared signal might confuse the engine. */
  sharedSignal: SignalType;
}

export interface GroundTruth {
  datasetId: string;
  canonicalCustomers: CanonicalCustomer[];
  /** Orders that are entirely new customers — should never be merged with anyone. */
  genuinelyNewOrders: string[];
  /** Traps: pairs of DIFFERENT people that share a weak signal. */
  falsePositiveTraps: FalsePositiveTrap[];
}

export type SignalType =
  | 'email_exact'
  | 'email_variant'       // dots / plus aliases / different domain same username
  | 'card_full'           // BIN + last4
  | 'card_last4'          // last4 only
  | 'card_fingerprint'
  | 'ip_exact'
  | 'ip_subnet'
  | 'address_exact'
  | 'address_partial'
  | 'phone_exact'
  | 'phone_partial'
  | 'device_exact'
  | 'account_exact'
  | 'name_exact'
  | 'name_fuzzy'
  | 'none';               // no overlapping signals at all

// ---------------------------------------------------------------------------
// Engine output — what the engine produces per order
// ---------------------------------------------------------------------------

export interface EngineResult {
  /** Assigned profile ID (UUID-like string) */
  profileId: string;
  /** The order ID */
  orderId: string;
  /** Canonical customer ID from ground truth (used for comparison) */
  canonicalId?: string;
}

// ---------------------------------------------------------------------------
// Accuracy measurement
// ---------------------------------------------------------------------------

export interface AccuracyResult {
  datasetId: string;
  totalOrders: number;
  /** Pair-based metrics */
  truePairs: number;    // pairs that are truly the same person
  falsePairs: number;   // pairs that are truly different people
  truePositives: number;   // same person, same profile
  falsePositives: number;  // different person, same profile
  falseNegatives: number;  // same person, different profile
  trueNegatives: number;   // different person, different profile
  precision: number;   // TP / (TP + FP)
  recall: number;      // TP / (TP + FN)
  f1: number;          // 2 * P * R / (P + R)
  /** False positive detail: which signal caused the bad merge */
  fpDetails: FailureDetail[];
  /** False negative detail: which signal was missing */
  fnDetails: FailureDetail[];
}

export interface FailureDetail {
  orderId_a: string;
  orderId_b: string;
  type: 'false_positive' | 'false_negative';
  /** For FP: signal that incorrectly linked them */
  confusingSignal?: SignalType;
  /** For FN: signals that were available but engine missed */
  missedSignals?: SignalType[];
  canonicalId_a?: string;
  canonicalId_b?: string;
  assignedProfileId_a: string;
  assignedProfileId_b: string;
}

// ---------------------------------------------------------------------------
// Aggregate accuracy across all datasets
// ---------------------------------------------------------------------------

export interface AggregateAccuracy {
  iterationId: number;
  config: TuneConfig;
  perDataset: AccuracyResult[];
  overallPrecision: number;
  overallRecall: number;
  overallF1: number;
  totalTP: number;
  totalFP: number;
  totalFN: number;
  totalTN: number;
}

// ---------------------------------------------------------------------------
// Tuning configuration — all tunable thresholds in the engine
// ---------------------------------------------------------------------------

export interface TuneConfig {
  // Linker thresholds
  LINK_THRESHOLD: number;        // default: 30
  POSSIBLE_THRESHOLD: number;    // default: 15

  // Linker signal family tier weights
  phone_exact: number;           // default: 30
  phone_partial: number;         // default: 15
  device_exact: number;          // default: 30
  account_exact: number;         // default: 25
  shipping_exact: number;        // default: 22
  shipping_partial: number;      // default: 12
  billing_exact: number;         // default: 22
  billing_partial: number;       // default: 12
  billing_cross: number;         // default: 18
  email_exact: number;           // default: 20
  email_username: number;        // default: 15
  name_exact: number;            // default: 18
  name_fuzzy: number;            // default: 10
  card_fingerprint: number;      // default: 30
  card_full: number;             // default: 12
  card_last4: number;            // default: 8
  postcode_full: number;         // default: 10
  postcode_outward: number;      // default: 5
  ip_exact: number;              // default: 8
  ip_subnet: number;             // default: 4

  // Entity resolution thresholds
  ER_IP_RISK_GATE: number;       // default: 50
  ER_CONF_EMAIL: number;         // default: 99
  ER_CONF_CARD: number;          // default: 90
  ER_CONF_IP_ADDR: number;       // default: 85
  ER_CONF_IP_ONLY: number;       // default: 60
}

// ---------------------------------------------------------------------------
// Tuning log entry
// ---------------------------------------------------------------------------

export interface TuningLogEntry {
  iteration: number;
  paramChanged: keyof TuneConfig;
  previousValue: number;
  newValue: number;
  reasoning: string;
  beforeF1: number;
  afterF1: number;
  beforePrecision: number;
  afterPrecision: number;
  beforeRecall: number;
  afterRecall: number;
  accepted: boolean;
  dominantFailureMode: 'fp' | 'fn' | 'balanced';
}

// ---------------------------------------------------------------------------
// Synthetic order — what the generator produces (before engine normalisation)
// ---------------------------------------------------------------------------

export interface SyntheticOrder {
  order_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  device_ip: string | null;
  card_last4: string | null;
  card_bin: string | null;
  card_fingerprint: string | null;
  device_fingerprint: string | null;
  account_id: string | null;
  phone: string | null;
  postcode: string | null;
  order_date: string;
  order_value: number;
  order_status: string;
  refund_status: string | null;
  refund_reason: string | null;
  refund_date: string | null;
  payment_method: string | null;
  /** Canonical customer ID — ONLY in ground truth, not visible to engine. */
  _canonicalCustomerId: string;
  /** Scenario tag for failure analysis. */
  _scenario: string;
}
