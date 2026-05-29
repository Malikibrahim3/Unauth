/**
 * SINGLE SOURCE OF TRUTH — Supabase PostgREST filter helpers
 *
 * Shared filter strings encoding core business rules.
 * Do not duplicate these filter strings in query files.
 */
import { COLUMNS } from './tables';
import { FLAG_THRESHOLD } from '@/lib/engine/weights';

/**
 * Returns the PostgREST filter for transactions that are review-worthy.
 *
 * "Review-worthy" = a real identity match AND suspicious behaviour. This is
 * persisted per-row as `review_worthy` (set by the worker and re-stitch paths,
 * and backfilled by migration), so a high-confidence identity match with NO
 * suspicious behaviour — e.g. a loyal repeat customer — is correctly excluded.
 * Gating on identity grade alone surfaced those customers (≈20% false-positive
 * rate on clean repeat customers); the behaviour gate removes that.
 */
export function buildReviewableFilter(): string {
  return `${COLUMNS.REVIEW_WORTHY}.eq.true`;
}

/**
 * Returns a PostgREST filter that includes all "All flagged" rows:
 * review-worthy identity matches OR risk_score above FLAG_THRESHOLD.
 * Does not change what FLAG_THRESHOLD is — only reads it.
 */
export function buildRiskQueueFilter(): string {
  return `${COLUMNS.REVIEW_WORTHY}.eq.true,risk_score.gte.${FLAG_THRESHOLD}`;
}
