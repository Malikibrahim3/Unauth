import type { LinkerOrderInput } from '../linker';
import type { IdentityMatchResult } from './matchScorer';

export type ReviewDecision = {
  reviewWorthy: boolean;
  reason: string;
};

function norm(value: string | null | undefined): string | null {
  const v = value?.trim().toLowerCase();
  return v ? v : null;
}

function signalSet(identity: IdentityMatchResult | null): Set<string> {
  return new Set((identity?.identity_evidence ?? []).map((e) => e.signal));
}

function hasCrossSurfaceChange(row: LinkerOrderInput, clusterRows: LinkerOrderInput[]): boolean {
  const rowEmail = norm(row.email);
  const rowAccount = norm(row.account_id);

  let differentEmail = false;
  let differentAccount = false;

  for (const other of clusterRows) {
    if (other.order_id === row.order_id) continue;
    const otherEmail = norm(other.email);
    const otherAccount = norm(other.account_id);
    if (rowEmail && otherEmail && otherEmail !== rowEmail) differentEmail = true;
    if (rowAccount && otherAccount && otherAccount !== rowAccount) differentAccount = true;
    if (differentEmail || differentAccount) return true;
  }

  return false;
}

export function classifyIdentityReview(
  row: LinkerOrderInput,
  clusterRows: LinkerOrderInput[],
  identity: IdentityMatchResult | null
): ReviewDecision {
  const grade = identity?.identity_match_grade ?? 'none';
  if (grade === 'none') {
    return { reviewWorthy: false, reason: 'no_identity_grade' };
  }

  const signals = signalSet(identity);
  if (signals.size === 0) {
    return { reviewWorthy: false, reason: 'no_signals' };
  }

  // High-confidence anchors that should always stay review-worthy.
  if (signals.has('phone') || signals.has('device') || signals.has('card')) {
    return { reviewWorthy: true, reason: 'strong_anchor_signal' };
  }

  const crossSurface = hasCrossSurfaceChange(row, clusterRows);
  if ((signals.has('shipping_address') || signals.has('billing_address')) && crossSurface) {
    return { reviewWorthy: true, reason: 'address_plus_cross_surface' };
  }

  const weakOrRepeatOnly = new Set(['name', 'postcode', 'ip', 'email', 'account']);
  const onlyWeakOrRepeat = Array.from(signals).every((s) => weakOrRepeatOnly.has(s));
  if (onlyWeakOrRepeat) {
    return { reviewWorthy: false, reason: 'normal_repeat_or_weak_only' };
  }

  if (crossSurface && (signals.has('account') || signals.has('email'))) {
    return { reviewWorthy: true, reason: 'cross_surface_account_or_email' };
  }

  return { reviewWorthy: false, reason: 'insufficient_review_risk' };
}

