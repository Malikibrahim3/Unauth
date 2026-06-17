/**
 * Canonical claim-type vocabulary for the rules engine and evidence scoring.
 *
 * The DB `claim_type` enum (supabase/rebuild/001_new_schema.sql) is the single
 * source of truth for any claim-type value that is STORED or EVALUATED — these
 * are exactly the values found in `claims.claim_type` and the keys of
 * `identity_profiles.claim_type_counts`.
 *
 * Friendly labels here are display-only. Legacy shorthand (`INR`, `refund`) is
 * NOT a canonical value: `INR` maps to `item_not_received`, `refund` to
 * `refund_request`. Such shorthand must never be stored or used as a rule
 * condition value (it may appear only as a UI search synonym).
 *
 * CANONICAL_CLAIM_TYPES is kept in lock-step with
 * Database['public']['Enums']['claim_type']; the regression test in
 * tests/unit/claimTypeTaxonomy.test.ts fails if they ever drift.
 *
 * NOTE: this is the rules/evidence vocabulary only. The support-intake signal
 * layer (lib/support/intake/classifyClaim.ts) maintains a separate, narrower
 * vocabulary that does not reach claims.claim_type; aligning it is tracked
 * independently and intentionally out of scope here.
 */
import type { Database } from '@/lib/supabase/types';

export type ClaimTypeValue = Database['public']['Enums']['claim_type'];

export const CANONICAL_CLAIM_TYPES = [
  'item_not_received',
  'damaged',
  'wrong_item',
  'not_as_described',
  'refund_request',
  'chargeback',
  'return_abuse',
  'other',
] as const satisfies readonly ClaimTypeValue[];

/** Display-only labels. Changing copy here never changes a stored value. */
export const CLAIM_TYPE_LABELS: Record<ClaimTypeValue, string> = {
  item_not_received: 'Item not received',
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  not_as_described: 'Not as described',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

/** Legacy shorthand → canonical DB enum value. For migration/search only; never stored. */
export const LEGACY_CLAIM_TYPE_ALIASES: Record<string, ClaimTypeValue> = {
  INR: 'item_not_received',
  refund: 'refund_request',
  missing_parcel: 'item_not_received',
};

/** Resolve any value (canonical or legacy shorthand) to a canonical enum value, or null. */
export function toCanonicalClaimType(value: string): ClaimTypeValue | null {
  if ((CANONICAL_CLAIM_TYPES as readonly string[]).includes(value)) {
    return value as ClaimTypeValue;
  }
  return LEGACY_CLAIM_TYPE_ALIASES[value] ?? null;
}
