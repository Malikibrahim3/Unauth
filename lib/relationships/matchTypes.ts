/**
 * Shared vocabulary for record matching.
 *
 * A match is explicit and reviewable. The four statuses are distinct states —
 * never collapse them into a boolean or null:
 *   - confirmed:  unique strong identifier or a user resolution. May update the
 *                 case FK / read projections.
 *   - probable:   one plausible candidate from weaker evidence. Display only —
 *                 do not execute financial/case side effects that assume it.
 *   - ambiguous:  multiple plausible candidates. Requires user resolution.
 *   - unmatched:  no candidate. Retain the source record; surface it in health
 *                 / work queues.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §8.
 */

export const MATCH_STATUSES = ['confirmed', 'probable', 'ambiguous', 'unmatched'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/**
 * Deterministic match methods, ordered strongest → weakest. The index in this
 * array is the priority: a lower index wins. `email` alone is intentionally
 * weak and must never silently select one of several plausible orders.
 */
export const MATCH_METHODS = [
  'connector_declared',
  'transaction_id',
  'external_reference',
  'order_number',
  'tracking_number',
  'customer_id',
  'email',
  'manual',
] as const;
export type MatchMethod = (typeof MATCH_METHODS)[number];

/** Candidate lifecycle status in `record_match_candidates`. */
export const CANDIDATE_STATUSES = ['open', 'selected', 'rejected', 'superseded'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

/** Methods considered strong enough to auto-confirm a single unique match. */
const STRONG_METHODS: ReadonlySet<MatchMethod> = new Set<MatchMethod>([
  'connector_declared',
  'transaction_id',
  'external_reference',
  'order_number',
  'tracking_number',
  'customer_id',
]);

export function isMatchMethod(value: string): value is MatchMethod {
  return (MATCH_METHODS as readonly string[]).includes(value);
}

export function isMatchStatus(value: string): value is MatchStatus {
  return (MATCH_STATUSES as readonly string[]).includes(value);
}

/** Priority index for a method — lower is stronger. Unknown methods sort last. */
export function methodPriority(method: MatchMethod): number {
  const idx = (MATCH_METHODS as readonly string[]).indexOf(method);
  return idx === -1 ? MATCH_METHODS.length : idx;
}

/** Whether a method is strong enough to confirm a single unique candidate. */
export function isStrongMethod(method: MatchMethod): boolean {
  return STRONG_METHODS.has(method);
}

export type MatchCandidate = {
  entityType: string;
  entityId: string;
  method: MatchMethod;
  confidence?: number | null;
  evidence?: Record<string, unknown>;
};

/**
 * A resolved matching decision for a subject entity: the status plus the
 * candidate set that produced it. `confirmed` implies exactly one candidate.
 */
export type MatchResult = {
  status: MatchStatus;
  method: MatchMethod | null;
  candidates: MatchCandidate[];
  /** The chosen candidate when status is confirmed/probable. */
  selected: MatchCandidate | null;
};

/**
 * Derive a match status from a candidate set produced by a single matching
 * pass. Callers pass candidates already filtered to a single method tier
 * (strongest available); this only decides confirmed / probable / ambiguous /
 * unmatched from the count and method strength.
 */
export function deriveMatchResult(candidates: MatchCandidate[]): MatchResult {
  if (candidates.length === 0) {
    return { status: 'unmatched', method: null, candidates: [], selected: null };
  }
  // Strongest (lowest priority index) method present in the set.
  const sorted = [...candidates].sort((a, b) => methodPriority(a.method) - methodPriority(b.method));
  const best = sorted[0];
  const sameStrength = sorted.filter((c) => c.method === best.method);

  if (sameStrength.length === 1) {
    const status: MatchStatus = isStrongMethod(best.method) ? 'confirmed' : 'probable';
    return { status, method: best.method, candidates: sorted, selected: best };
  }
  return { status: 'ambiguous', method: best.method, candidates: sorted, selected: null };
}
