import type { LookupResponse } from '../shared/types';

/**
 * Visual for the identity confidence grade — reflects how certain we are about
 * WHO the person is, never how risky. CSS class names are grade-keyed (a clean
 * DEFINITE match is a calm confirmation, not a warning). No risk score/band.
 */
export type GradeVisual = {
  label: string;
  className: 'grade-definite' | 'grade-probable' | 'grade-possible' | 'grade-weak';
};

export function gradeVisualForLookup(lookup: LookupResponse): GradeVisual {
  switch (lookup.confidence) {
    case 'definite': return { label: 'Definite match', className: 'grade-definite' };
    case 'probable': return { label: 'Probable match', className: 'grade-probable' };
    case 'possible': return { label: 'Possible match', className: 'grade-possible' };
    default: return { label: 'Weak match', className: 'grade-weak' };
  }
}

function formatClaimDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** One-line factual claims record: counts, amount, date, and explicit source. */
export function claimsLine(claims: LookupResponse['claims_record']): string {
  if (claims.source !== 'your_store') return 'No merchant-owned payout history found';
  const refunds = claims?.refunds ?? 0;
  const chargebacks = claims?.chargebacks ?? 0;
  if (refunds + chargebacks === 0) return 'No prior payouts on record';
  const parts: string[] = [];
  if (refunds > 0) parts.push(`${refunds} ${refunds === 1 ? 'refund' : 'refunds'}`);
  if (chargebacks > 0) parts.push(`${chargebacks} ${chargebacks === 1 ? 'chargeback' : 'chargebacks'}`);
  if (claims.refund_value != null) parts.push(`$${claims.refund_value.toLocaleString()} at your store`);
  const date = formatClaimDate(claims.last_claim_at);
  if (date) parts.push(`last ${date}`);
  return parts.join(' · ');
}

export function maskApiKey(key: string): string {
  if (!key.startsWith('unauth_sk_')) return '••••••••';
  return `${key.slice(0, 18)}...`;
}
