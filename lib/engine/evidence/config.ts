/**
 * Evidence Scoring Engine — versioned configuration.
 *
 * Separate, intentionally-isolated config: it is NOT related to SIGNAL_WEIGHTS or
 * IDENTITY_SIGNAL_WEIGHTS in lib/engine/weights.ts (those govern identity
 * matching — a different axis). Evidence scoring answers "given it is them, how
 * concerning is the accumulated pattern?" and never touches confidence grade.
 *
 * Bump EVIDENCE_SCORING_CONFIG_VERSION on ANY weight change. Cached rows keep the
 * version tag they were computed under; weights are never re-interpreted across
 * versions (honest audit trail).
 *
 * Point budget: 35 (frequency) + 25 (breadth) + 20 (recency) + 15 (severity)
 * + 5 (network flag) = 100.
 */
import type { ClaimTypeValue } from '@/lib/claims/claimTypes';

export const EVIDENCE_SCORING_CONFIG_VERSION = 'v1.0';

export const MAX_FREQUENCY_POINTS = 35;
export const MAX_BREADTH_POINTS = 25;
export const MAX_RECENCY_POINTS = 20;
export const MAX_SEVERITY_POINTS = 15;

/** Total claims across the network (all merchants combined). */
export const NETWORK_CLAIM_FREQUENCY_TIERS: ReadonlyArray<{ max: number; points: number }> = [
  { max: 0, points: 0 },
  { max: 1, points: 8 },
  { max: 2, points: 18 },
  { max: 3, points: 27 },
  { max: Infinity, points: MAX_FREQUENCY_POINTS },
];

/** Distinct merchants this identity has claimed at. */
export const NETWORK_BREADTH_TIERS: ReadonlyArray<{ max: number; points: number }> = [
  { max: 1, points: 0 },
  { max: 2, points: 12 },
  { max: 3, points: 20 },
  { max: Infinity, points: MAX_BREADTH_POINTS },
];

/** How recently the most recent claim (any merchant) was filed. */
export const RECENCY_TIERS: ReadonlyArray<{ maxDays: number; points: number }> = [
  { maxDays: 7, points: MAX_RECENCY_POINTS },
  { maxDays: 30, points: 16 },
  { maxDays: 90, points: 10 },
  { maxDays: Infinity, points: 4 },
];

/**
 * Severity of the single most significant claim type on record (max across types
 * present, not additive — keeps it explainable). Keyed on the canonical DB
 * claim_type enum; `Record<ClaimTypeValue, number>` enforces exhaustiveness at
 * compile time (a missing or extra key fails the build).
 */
export const CLAIM_TYPE_SEVERITY: Record<ClaimTypeValue, number> = {
  chargeback: MAX_SEVERITY_POINTS,
  return_abuse: 12,
  refund_request: 9,
  item_not_received: 9,
  not_as_described: 6,
  damaged: 4,
  wrong_item: 4,
  other: 2,
};

export const NETWORK_FLAG_BONUS = 5;

export const EVIDENCE_LEVEL_THRESHOLDS: ReadonlyArray<{
  max: number;
  level: 'minimal' | 'some' | 'substantial' | 'extensive';
}> = [
  { max: 19, level: 'minimal' },
  { max: 44, level: 'some' },
  { max: 69, level: 'substantial' },
  { max: 100, level: 'extensive' },
];
