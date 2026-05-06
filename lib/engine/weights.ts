import type { IdentitySignalName } from './types';

export const SIGNAL_WEIGHTS = {
  refundRate: 20,
  inrAbuse: 25,
  velocity: 18,            // multi-bucket 1h/24h/7d — strong corroborating behavioral signal
  inrSpeed: 10,
  emailPattern: 8,
  addressClustering: 9,    // reduced to curb household/shared-address false positives
  valueAnomaly: 5,
  paymentChurn: 15,        // tight-window (24h/7d) — stronger than soft profile signals
  refundPattern: 20,
  crossMerchant: 24,       // keep strong, but avoid overwhelming other corroborating signals
  disputeHistory: 40,      // §1 — highest-precision industry signal (prior chargebacks / claims)
  addressMismatch: 4,      // §2 — cheap baseline; meaningful only when corroborated
} as const;

export const RISK_TIER_THRESHOLDS = {
  medium: 25,
  high: 50,
  critical: 75,
} as const;

// Merchant-safe default. Can still be overridden per environment.
// Set conservatively to reduce false positives on clean merchant datasets.
// Current calibration:
//  - clean.csv: 0 false positives at threshold=28
//  - deployment benchmarks: precision/recall unchanged vs prior baseline
export const FLAG_THRESHOLD = Number(process.env.FLAG_THRESHOLD ?? 28);

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
export const IDENTITY_SIGNAL_WEIGHTS: Record<IdentitySignalName, number> = {
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
