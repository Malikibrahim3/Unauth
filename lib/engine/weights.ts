import type { IdentitySignalName } from './types';

export const SIGNAL_WEIGHTS = {
  refundRate: 20,
  inrAbuse: 25,
  velocity: 10,
  inrSpeed: 10,
  emailPattern: 8,
  addressClustering: 12,
  valueAnomaly: 5,
  paymentChurn: 5,
  refundPattern: 20,
  crossMerchant: 30,
} as const;

export const RISK_TIER_THRESHOLDS = {
  medium: 25,
  high: 50,
  critical: 75,
} as const;

export const FLAG_THRESHOLD = Number(process.env.FLAG_THRESHOLD ?? 5);

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
