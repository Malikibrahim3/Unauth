/**
 * SINGLE SOURCE OF TRUTH — Supabase PostgREST filter helpers
 *
 * Shared filter strings encoding core business rules.
 * Do not duplicate these filter strings in query files.
 */
import { COLUMNS } from './tables';
import { FLAG_THRESHOLD } from '@/lib/engine/weights';

/**
 * Returns the PostgREST filter for transactions that represent a reviewable identity match.
 * "Reviewable" means identity_confidence_grade is 'probable' or 'definite',
 * or match_status is 'probable' or 'definite'.
 * Consistent with isReviewableIdentityMatch() in lib/analysis/auditSummary.ts.
 */
export function buildReviewableFilter(): string {
  return `${COLUMNS.IDENTITY_CONFIDENCE_GRADE}.in.(probable,definite),match_status.in.(probable,definite)`;
}

/**
 * Returns a PostgREST filter that includes all "All flagged" rows:
 * identity matches (probable/definite) OR risk_score above FLAG_THRESHOLD.
 * Does not change what FLAG_THRESHOLD is — only reads it.
 */
export function buildRiskQueueFilter(): string {
  return `${COLUMNS.IDENTITY_CONFIDENCE_GRADE}.in.(probable,definite),match_status.in.(probable,definite),risk_score.gte.${FLAG_THRESHOLD}`;
}
