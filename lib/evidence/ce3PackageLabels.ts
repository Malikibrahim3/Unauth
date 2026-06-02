/** User-visible CE 3.0 / evidence status labels (Phase 0 — does not change engine eligibility). */

export function ce3ListStatusLabel(ce3Eligible: boolean, hasNarrative: boolean): string {
  if (ce3Eligible) return 'CE 3.0 ready';
  if (hasNarrative) return 'Evidence ready';
  return 'Needs stronger checkout-time data';
}

export function ce3DetailStatusLabel(
  ce3Eligible: boolean,
  identityMatchLevel: 'Strong' | 'Partial' | 'None',
): string {
  if (ce3Eligible && identityMatchLevel === 'Strong') return 'CE 3.0 ready';
  if (ce3Eligible || identityMatchLevel === 'Partial') return 'CE 3.0 partial';
  if (identityMatchLevel === 'None') return 'Needs stronger checkout-time data';
  return 'Evidence ready';
}
