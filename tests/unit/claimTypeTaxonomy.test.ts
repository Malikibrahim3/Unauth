import { Constants } from '@/lib/supabase/types';
import { CANONICAL_CLAIM_TYPES, CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';
import { CLAIM_TYPE_OPTIONS } from '@/lib/rules/fields';

// Regression guard for the claim-type taxonomy decision: the DB `claim_type`
// enum is canonical everywhere rules/evidence store or evaluate claim types.
// Iteration 2 (evidence severity map) extends this with a CLAIM_TYPE_SEVERITY
// key-coverage assertion once that map exists.
describe('claim-type taxonomy', () => {
  const dbEnum = Constants.public.Enums.claim_type as readonly string[];

  it('CANONICAL_CLAIM_TYPES matches the DB claim_type enum exactly', () => {
    expect([...CANONICAL_CLAIM_TYPES].sort()).toEqual([...dbEnum].sort());
  });

  it('every canonical value has a display label', () => {
    for (const t of CANONICAL_CLAIM_TYPES) {
      expect(CLAIM_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it('rules CLAIM_TYPE_OPTIONS values are all canonical DB enum values', () => {
    for (const option of CLAIM_TYPE_OPTIONS) {
      expect(dbEnum).toContain(option.value);
    }
  });

  it('no legacy shorthand remains as a rules option value', () => {
    const values = CLAIM_TYPE_OPTIONS.map((o) => o.value);
    expect(values).not.toContain('INR');
    expect(values).not.toContain('refund');
  });
});
