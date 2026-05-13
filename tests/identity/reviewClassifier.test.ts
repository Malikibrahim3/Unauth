import { classifyIdentityReview } from '../../lib/identity/reviewClassifier';
import type { LinkerOrderInput } from '../../lib/linker';
import type { IdentityMatchResult } from '../../lib/identity/matchScorer';

function row(overrides: Partial<LinkerOrderInput>): LinkerOrderInput {
  return {
    order_id: overrides.order_id ?? 'o1',
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    address: overrides.address ?? null,
    shipping_address: overrides.shipping_address ?? null,
    billing_address: overrides.billing_address ?? null,
    postcode: overrides.postcode ?? null,
    ip: overrides.ip ?? null,
    card_last4: overrides.card_last4 ?? null,
    card_bin: overrides.card_bin ?? null,
    card_fingerprint: overrides.card_fingerprint ?? null,
    device_fingerprint: overrides.device_fingerprint ?? null,
    account_id: overrides.account_id ?? null,
    name: overrides.name ?? null,
  };
}

function identity(signals: Array<'device' | 'account' | 'phone' | 'email' | 'card' | 'shipping_address' | 'billing_address' | 'postcode' | 'ip' | 'name'>, grade: IdentityMatchResult['identity_match_grade'] = 'candidate'): IdentityMatchResult {
  return {
    identity_match_score: 50,
    identity_match_grade: grade,
    match_status: grade === 'confirmed' ? 'confirmed' : grade,
    identity_evidence: signals.map((signal) => ({
      signal,
      tier: signal === 'phone' || signal === 'device' ? 'strong' : 'corroborator',
      matchType: 'exact',
      matchedValueLabel: signal,
      points: 5,
      anchor: signal === 'phone' || signal === 'device',
    })),
    matched_datapoints: [],
    changed_datapoints: [],
    evidence_summary: 'test',
  };
}

describe('classifyIdentityReview', () => {
  test('suppresses normal repeat customer signals (account+email+name)', () => {
    const a = row({ order_id: 'a', email: 'same@example.com', account_id: 'acct-1', name: 'Jane Doe' });
    const b = row({ order_id: 'b', email: 'same@example.com', account_id: 'acct-1', name: 'Jane Doe' });
    const res = classifyIdentityReview(a, [a, b], identity(['account', 'email', 'name']));
    expect(res.reviewWorthy).toBe(false);
  });

  test('suppresses weak-only signals', () => {
    const a = row({ order_id: 'a', email: 'a@example.com' });
    const b = row({ order_id: 'b', email: 'b@example.com' });
    const res = classifyIdentityReview(a, [a, b], identity(['name', 'postcode']));
    expect(res.reviewWorthy).toBe(false);
  });

  test('keeps strong anchor signals review-worthy', () => {
    const a = row({ order_id: 'a', phone: '07111111111', email: 'a@example.com' });
    const b = row({ order_id: 'b', phone: '07111111111', email: 'b@example.com' });
    const res = classifyIdentityReview(a, [a, b], identity(['phone', 'name'], 'probable'));
    expect(res.reviewWorthy).toBe(true);
  });

  test('keeps address links when cross-surface change exists', () => {
    const a = row({ order_id: 'a', email: 'a@example.com', account_id: 'acct-1', shipping_address: '1 Main Street' });
    const b = row({ order_id: 'b', email: 'b@example.com', account_id: 'acct-2', shipping_address: '1 Main Street' });
    const res = classifyIdentityReview(a, [a, b], identity(['shipping_address', 'postcode', 'name'], 'candidate'));
    expect(res.reviewWorthy).toBe(true);
  });
});

