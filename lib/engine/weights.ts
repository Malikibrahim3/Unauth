/**
 * SINGLE SOURCE OF TRUTH — Engine constants, weights, and thresholds
 *
 * All canonical engine constants are defined here and only here.
 * Do not define, redefine, or duplicate these constants anywhere else.
 * Do not import weights or thresholds from any other file.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */

import type { IdentitySignalName } from './types';

export const SIGNAL_WEIGHTS = {
  refundRate: 20,
  inrAbuse: 25,
  velocity: 18,            // multi-bucket 1h/24h/7d — strong corroborating behavioral signal
  inrSpeed: 10,
  emailPattern: 8,
  addressClustering: 9,    // reduced to curb household/shared-address false positives
  billingAddressClustering: 9, // Fix 4 — mirrors addressClustering for billing-address-anchored fraud
  billingAddressClusteringActive: 9, // Active variant when billing-address chargeback cluster is corroborated by current dispute behavior
  valueAnomaly: 5,
  paymentChurn: 15,        // tight-window (24h/7d) — stronger than soft profile signals
  refundPattern: 20,
  crossMerchant: 24,       // keep strong, but avoid overwhelming other corroborating signals
  disputeHistory: 40,      // §1 — highest-precision industry signal (prior chargebacks / claims)
  addressMismatch: 4,      // §2 — cheap baseline; meaningful only when corroborated
  networkDeviceLink: 15,        // Fix 5 — broad-overlap variant (penalty applies)
  networkDeviceLinkActive: 25,  // Fix 5 — strong evidence variant when current order itself is active
} as const;

export const RISK_TIER_THRESHOLDS = {
  medium: 25,
  high: 50,
  critical: 75,
} as const;

// Merchant-safe default. Can still be overridden per environment.
// Set conservatively to reduce false positives on clean merchant datasets.
// Current benchmark calibration:
//  - us_benchmark_v1.csv: P=0.985, R=0.876, F1=0.927 at threshold=44
//  - clean merchant datasets should remain near-zero false positives at this threshold
export const FLAG_THRESHOLD = Number(process.env.FLAG_THRESHOLD ?? 44);

// =============================================================================
// IDENTITY CONFIDENCE MODEL WEIGHTS
// =============================================================================

/**
 * Baseline weights for each identity signal.
 * Hardware/PSP-assigned identifiers are strongest because they are deliberately
 * assigned and very hard to spoof simultaneously.
 * Soft signals (email variants, name similarity) are weaker — corroborating, not definitive.
 *
 * DO NOT change these values during implementation — only change signal firing
 * THRESHOLDS during eval harness tuning. Weights control relative importance;
 * thresholds control sensitivity.
 */
/**
 * Per-signal weights keyed by IdentitySignalName (the 8-way pair comparison signals).
 * Used by identityCluster.ts to compute pair-level confidence scores.
 * Named separately from the canonical IDENTITY_SIGNAL_WEIGHTS to avoid collision.
 */
export const IDENTITY_PAIR_SIGNAL_WEIGHTS: Record<IdentitySignalName, number> = {
  deviceMatch: 35,    // card_fingerprint + browser_fingerprint + cookie_id + device_id
  cardMatch: 30,      // card_fingerprint alone: 30 | last4+bin: 18 | last4 alone: 8
  accountLink: 25,    // same account_id — merchant controls this namespace
  phoneMatch: 20,     // phone numbers change but less often than emails
  addressCluster: 15, // same normalised address — strong when combined, weak alone
  emailVariant: 12,   // plus-aliasing or numeric suffix — deliberate variation
  ipCluster: 10,      // weakest soft signal — only meaningful with corroboration
  nameVariant: 8,     // Levenshtein distance 1–2 — catches typos AND obfuscation
};

/**
 * Confidence grade thresholds.
 * Score >= threshold → that grade.
 * Multiple hardware signals or 3+ soft signals → 'definite' (act on this).
 * Single soft signal only → 'weak' (informational, no action recommended).
 */
export const CONFIDENCE_GRADES = {
  definite: 75,  // multiple hardware signals or 3+ soft signals
  probable: 55,  // 2 hardware signals or 2+ strong soft signals
  possible: 35,  // 1 hardware + 1 soft, or 3 soft signals
  weak: 0,       // single soft signal only — informational
} as const;

// =============================================================================
// CANONICAL SIGNAL WEIGHTS — SINGLE SOURCE OF TRUTH
// =============================================================================

/**
 * SINGLE SOURCE OF TRUTH — Identity signal weights
 * Do not define signal weights anywhere else.
 *
 * NOTE: lib/scorer.ts uses a separate internal scoring table with different
 * values because it was calibrated independently. Do NOT modify scorer.ts weights
 * without explicit instruction — they affect scoring output.
 */
export const IDENTITY_SIGNAL_WEIGHTS = {
  device: 35,
  card: 30,
  phone: 20,
  email: 12,
  ip: 8,
  shipping_address: 15,
} as const;

export type IdentitySignalKey = keyof typeof IDENTITY_SIGNAL_WEIGHTS;

// =============================================================================
// CONFIDENCE THRESHOLDS AND GRADE FUNCTIONS — SINGLE SOURCE OF TRUTH
// =============================================================================

/**
 * SINGLE SOURCE OF TRUTH — Confidence score thresholds and grade conversion
 * Do not define thresholds or scoreToGrade anywhere else.
 *
 * NOTE: lib/scorer.ts uses internal thresholds (GRADE_THRESHOLDS) with different
 * values calibrated for its specific scoring algorithm. Do NOT replace scorer.ts
 * thresholds with these without explicit instruction.
 */
export const CONFIDENCE_THRESHOLDS = {
  DEFINITE: 85,
  PROBABLE: 65,
  POSSIBLE: 45,
} as const;

export type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';

export function scoreToGrade(score: number): ConfidenceGrade {
  if (score >= CONFIDENCE_THRESHOLDS.DEFINITE) return 'definite';
  if (score >= CONFIDENCE_THRESHOLDS.PROBABLE) return 'probable';
  if (score >= CONFIDENCE_THRESHOLDS.POSSIBLE) return 'possible';
  return 'weak';
}

// =============================================================================
// GRADE-TO-LETTER CONVERSION — SINGLE SOURCE OF TRUTH
// =============================================================================

export type ConfidenceLetterGrade = 'A' | 'B' | 'C' | 'D';

export function gradeToLetter(grade: ConfidenceGrade): ConfidenceLetterGrade {
  const map: Record<ConfidenceGrade, ConfidenceLetterGrade> = {
    definite: 'A',
    probable: 'B',
    possible: 'C',
    weak: 'D',
  };
  return map[grade];
}

// =============================================================================
// NAMED MAGIC CONSTANTS
// =============================================================================

export const ESTIMATED_CHARGEBACK_RATE = 0.42;
export const K_ANONYMITY_MIN = 3;
export const CE3_PRIOR_ORDER_WINDOW_DAYS = 120;
export const ADDRESS_TOKEN_OVERLAP_THRESHOLD = 0.6;
export const GRADE_ORDER: Record<ConfidenceGrade, number> = {
  definite: 4,
  probable: 3,
  possible: 2,
  weak: 1,
};

// =============================================================================
// CORROBORATION HALVING — SIGNAL CLASSIFICATION SSOT
// =============================================================================

/**
 * Signals that indicate broad overlap but not confirmed fraud on their own.
 * When ONLY these fire (no strong-fraud-evidence signal), the raw score is
 * multiplied by 0.45 to prevent household / shared-address false positives.
 * Do not add crossMerchant here — it requires behavioral evidence to fire,
 * making its presence already corroborating (see crossMerchantSignal.ts:48-62).
 */
export const BROAD_OVERLAP_SIGNALS = new Set<string>([
  'addressClustering',
  'billingAddressClustering',
  'emailPattern',
  'addressMismatch',
  'networkDeviceLink',
]);

/**
 * Signals that constitute strong fraud evidence and unlock the full raw score
 * (removing the 0.45 corroboration penalty when BROAD_OVERLAP_SIGNALS fire).
 * crossMerchant is included because every fired crossMerchant already has
 * behavioral evidence baked in (networkOrders ≥ 3 or inrRate ≥ 0.20 gate).
 */
export const STRONG_FRAUD_EVIDENCE_SIGNALS = new Set<string>([
  'refundRate',
  'inrAbuse',
  'inrSpeed',
  'paymentChurn',
  'refundPattern',
  'disputeHistory',
  'valueAnomaly',
  'billingAddressClusteringActive',
  'networkDeviceLinkActive',
  'crossMerchant',
]);

/**
 * Signals where a score-based floor determines strong-evidence status.
 * A signal listed here counts as strong evidence only when its score >= the value.
 * Scores below the threshold indicate plausible-legitimate behaviour.
 * velocity: burst-level (≥70) is near-definitive; moderate (35–55) is ambient.
 */
export const STRONG_EVIDENCE_BY_SCORE: Record<string, number> = {
  velocity: 70,
};

/**
 * Behavioral fraud signals — at least one of these MUST fire for an order to
 * be flagged. Composition gate (not a score change): broad-overlap signals
 * like `billingAddressClustering(Active)` and `networkDeviceLink(Active)`
 * indicate shared infrastructure (household IP, shared device, shared billing
 * address) rather than confirmed fraud behavior. On legit high-return /
 * wardrobing shoppers these can fire as Active variants because a legit return
 * itself is a "refund event", with no actual fraud behavior present.
 *
 * If NONE of these fire, the order is downgraded regardless of score.
 */
export const BEHAVIORAL_FRAUD_SIGNALS = new Set<string>([
  'inrAbuse',
  'inrSpeed',
  'disputeHistory',
  'crossMerchant',
  'refundPattern',
]);
