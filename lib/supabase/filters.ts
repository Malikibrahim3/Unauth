/**
 * SINGLE SOURCE OF TRUTH — Supabase PostgREST filter helpers
 *
 * Shared filter strings encoding core business rules.
 * Do not duplicate these filter strings in query files.
 */
import { COLUMNS } from './tables';

/**
 * Returns the PostgREST filter for transactions that represent a reviewable identity match.
 * "Reviewable" means identity_confidence_grade is 'probable' or 'definite',
 * or match_status is 'probable' or 'definite'.
 * Consistent with isReviewableIdentityMatch() in lib/analysis/auditSummary.ts.
 */
export function buildReviewableFilter(): string {
  return `${COLUMNS.IDENTITY_CONFIDENCE_GRADE}.in.(probable,definite),match_status.in.(probable,definite)`;
}
