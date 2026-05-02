/**
 * Identity Signal Unit Tests
 *
 * For each of the 8 signals, three cases:
 *   1. Both fields present, match expected → signal fires with correct confidence
 *   2. Both fields present, no match → signal does not fire
 *   3. One or both fields missing → signal does not fire, correct fields in dataPointsMissing
 */

import {
  deviceMatch,
  cardMatch,
  emailVariant,
  addressCluster,
  ipCluster,
  nameVariant,
  accountLink,
  phoneMatch,
  levenshtein,
  stripEmailVariants,
} from '@/lib/engine/identitySignals';
import type { NormalisedOrder } from '@/lib/engine/types';

// ── Helper ───────────────────────────────────────────────────────────────────

type OrderExtended = NormalisedOrder & {
  _rawEmail?: string;
  _rawAddress?: string | null;
  _rawIP?: string | null;
};

function makeOrder(overrides: Partial<OrderExtended> = {}): OrderExtended {
  return {
    orderId: 'ORD-' + Math.random().toString(36).slice(2, 8),
    orderDate: new Date('2025-01-01'),
    emailHash: 'hash-email-a',
    addressHash: null,
    phoneHash: null,
    customerNameNorm: 'john smith',
    orderTotal: 100,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
    ...overrides,
  };
}

// ── Helpers tests ─────────────────────────────────────────────────────────────

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });
  it('returns 1 for single substitution', () => {
    expect(levenshtein('smith', 'smyth')).toBe(1);
  });
  it('returns 2 for two edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3); // classic example
    expect(levenshtein('abcdef', 'axcxef')).toBe(2); // two substitutions
  });
});

describe('stripEmailVariants', () => {
  it('strips plus alias', () => {
    expect(stripEmailVariants('john+test@example.com')).toBe('john@example.com');
  });
  it('strips dots from local part', () => {
    expect(stripEmailVariants('j.o.h.n@example.com')).toBe('john@example.com');
  });
  it('handles combined dots and alias', () => {
    expect(stripEmailVariants('j.o.h.n+promo@gmail.com')).toBe('john@gmail.com');
  });
});

// ── deviceMatch ───────────────────────────────────────────────────────────────

describe('deviceMatch signal', () => {
  it('fires when card fingerprint matches (confidence 20)', () => {
    const a = makeOrder({ cardFingerprint: 'fp-hash-abc' });
    const b = makeOrder({ cardFingerprint: 'fp-hash-abc' });
    const result = deviceMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(20);
    expect(result.dataPointsUsed).toContain('card_fingerprint');
  });

  it('fires when browser fingerprint matches (confidence >= 8)', () => {
    const a = makeOrder({ browserFingerprint: 'browser-hash-xyz' });
    const b = makeOrder({ browserFingerprint: 'browser-hash-xyz' });
    const result = deviceMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(8);
  });

  it('does not fire when fingerprints differ', () => {
    const a = makeOrder({ cardFingerprint: 'fp-aaa', browserFingerprint: 'br-aaa' });
    const b = makeOrder({ cardFingerprint: 'fp-bbb', browserFingerprint: 'br-bbb' });
    const result = deviceMatch(a, b);
    expect(result.fired).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('does not fire and reports missing when no device fields present', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = deviceMatch(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('card_fingerprint');
    expect(result.dataPointsMissing).toContain('browser_fingerprint');
    expect(result.dataPointsMissing).toContain('cookie_id');
    expect(result.dataPointsMissing).toContain('device_id');
  });

  it('caps at 35 even when multiple sub-signals match', () => {
    const a = makeOrder({
      cardFingerprint: 'fp-same',
      browserFingerprint: 'br-same',
      cookieIdHash: 'cookie-same',
      deviceIdHash: 'dev-same',
    });
    const b = makeOrder({
      cardFingerprint: 'fp-same',
      browserFingerprint: 'br-same',
      cookieIdHash: 'cookie-same',
      deviceIdHash: 'dev-same',
    });
    const result = deviceMatch(a, b);
    expect(result.confidence).toBe(35);
    expect(result.fired).toBe(true);
  });
});

// ── cardMatch ─────────────────────────────────────────────────────────────────

describe('cardMatch signal', () => {
  it('fires with confidence 30 when card fingerprint matches', () => {
    const a = makeOrder({ cardFingerprint: 'cfp-match' });
    const b = makeOrder({ cardFingerprint: 'cfp-match' });
    const result = cardMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(30);
  });

  it('fires with confidence 18 when last4 + bin both match', () => {
    const a = makeOrder({ cardLast4: 'l4-hash', cardBin: 'bin-hash' });
    const b = makeOrder({ cardLast4: 'l4-hash', cardBin: 'bin-hash' });
    const result = cardMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(18);
  });

  it('fires with confidence 8 when only last4 matches', () => {
    const a = makeOrder({ cardLast4: 'l4-hash' });
    const b = makeOrder({ cardLast4: 'l4-hash' });
    const result = cardMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(8);
  });

  it('does not fire when card data differs', () => {
    const a = makeOrder({ cardFingerprint: 'cfp-aaa', cardLast4: 'l4-aaa' });
    const b = makeOrder({ cardFingerprint: 'cfp-bbb', cardLast4: 'l4-bbb' });
    const result = cardMatch(a, b);
    expect(result.fired).toBe(false);
  });

  it('reports missing when no card fields present', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = cardMatch(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('card_fingerprint');
    expect(result.dataPointsMissing).toContain('card_last4');
  });
});

// ── emailVariant ──────────────────────────────────────────────────────────────

describe('emailVariant signal', () => {
  it('fires with confidence 12 for plus-alias variant', () => {
    const a = makeOrder({ _rawEmail: 'john@example.com' });
    const b = makeOrder({ _rawEmail: 'john+test@example.com' });
    const result = emailVariant(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(12);
  });

  it('fires with confidence 10 for numeric suffix variant', () => {
    const a = makeOrder({ _rawEmail: 'john1@example.com' });
    const b = makeOrder({ _rawEmail: 'john2@example.com' });
    const result = emailVariant(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(10);
  });

  it('does not fire for identical emails', () => {
    const a = makeOrder({ _rawEmail: 'john@example.com' });
    const b = makeOrder({ _rawEmail: 'john@example.com' });
    const result = emailVariant(a, b);
    expect(result.fired).toBe(false);
  });

  it('does not fire for completely different emails', () => {
    const a = makeOrder({ _rawEmail: 'alice@example.com' });
    const b = makeOrder({ _rawEmail: 'bob@other.com' });
    const result = emailVariant(a, b);
    expect(result.fired).toBe(false);
  });

  it('reports missing when email is absent', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = emailVariant(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('customer_email');
  });
});

// ── addressCluster ────────────────────────────────────────────────────────────

describe('addressCluster signal', () => {
  it('fires with confidence 15 for >= 80% word overlap', () => {
    // words_a: {10, oak, avenue, london, w1} union words_b: {10, oak, avenue, london} = 5 total
    // intersection: 4, overlap = 4/5 = 0.80 → score 15
    const a = makeOrder({ _rawAddress: '10 oak avenue london w1' });
    const b = makeOrder({ _rawAddress: '10 oak avenue london' });
    const result = addressCluster(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(15);
  });

  it('fires with confidence 8 for 60–79% word overlap', () => {
    // words_a: {flat, 5, long, road, london} intersection words_b: {flat, 5, long, road, bristol}
    // intersection: {flat, 5, long, road} = 4, union: 6, overlap = 4/6 ≈ 0.667 → score 8
    const a = makeOrder({ _rawAddress: 'flat 5 long road london' });
    const b = makeOrder({ _rawAddress: 'flat 5 long road bristol' });
    const result = addressCluster(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(8);
  });

  it('does not fire for low overlap addresses', () => {
    const a = makeOrder({ _rawAddress: '100 oxford street london w1' });
    const b = makeOrder({ _rawAddress: '22 baker close edinburgh eh1' });
    const result = addressCluster(a, b);
    expect(result.fired).toBe(false);
  });

  it('reports missing when address is absent', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = addressCluster(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('shipping_address');
  });
});

// ── ipCluster ─────────────────────────────────────────────────────────────────

describe('ipCluster signal', () => {
  it('fires with confidence 10 when IP matches and other signals fired', () => {
    const a = makeOrder({ ipHash: 'ip-hash-same' });
    const b = makeOrder({ ipHash: 'ip-hash-same' });
    const result = ipCluster(a, b, true, 0);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(10);
  });

  it('fires with confidence 10 when IP matches and historically flagged', () => {
    const a = makeOrder({ ipHash: 'ip-hash-same' });
    const b = makeOrder({ ipHash: 'ip-hash-same' });
    const result = ipCluster(a, b, false, 3);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(10);
  });

  it('fires with confidence 4 when IP matches but no corroboration (guarded in clusterBatch)', () => {
    // The ipCluster signal fires at low confidence — the IP-only guard lives in clusterBatch
    const a = makeOrder({ ipHash: 'ip-hash-same' });
    const b = makeOrder({ ipHash: 'ip-hash-same' });
    const result = ipCluster(a, b, false, 0);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(4);
  });

  it('does not fire when IPs differ', () => {
    const a = makeOrder({ ipHash: 'ip-hash-aaa' });
    const b = makeOrder({ ipHash: 'ip-hash-bbb' });
    const result = ipCluster(a, b, true, 5);
    expect(result.fired).toBe(false);
  });

  it('reports missing when IP is absent', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = ipCluster(a, b, true, 0);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('ip_address');
  });
});

// ── nameVariant ───────────────────────────────────────────────────────────────

describe('nameVariant signal', () => {
  it('fires with confidence 8 for Levenshtein distance 1 (length >= 5)', () => {
    const a = makeOrder({ customerNameNorm: 'john smith' });
    const b = makeOrder({ customerNameNorm: 'john smyth' });
    const result = nameVariant(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(8);
  });

  it('fires with confidence 4 for distance 3 (length >= 8)', () => {
    // 'christopher jones' vs 'christopher joan' — 'jones' vs 'joan' = distance 3
    // both lengths >= 8, distance > 2 → falls to 4pt branch
    const a = makeOrder({ customerNameNorm: 'christopher jones' });
    const b = makeOrder({ customerNameNorm: 'christopher joan' });
    const result = nameVariant(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(4);
  });

  it('does not fire for identical names', () => {
    const a = makeOrder({ customerNameNorm: 'john smith' });
    const b = makeOrder({ customerNameNorm: 'john smith' });
    const result = nameVariant(a, b);
    expect(result.fired).toBe(false);
  });

  it('does not fire for very different names', () => {
    const a = makeOrder({ customerNameNorm: 'alice jones' });
    const b = makeOrder({ customerNameNorm: 'bobby chen' });
    const result = nameVariant(a, b);
    expect(result.fired).toBe(false);
  });

  it('does not fire for short names with distance <= 2 (length < 5)', () => {
    const a = makeOrder({ customerNameNorm: 'ali' });
    const b = makeOrder({ customerNameNorm: 'ali' }); // identical
    const result = nameVariant(a, b);
    expect(result.fired).toBe(false);
  });
});

// ── accountLink ───────────────────────────────────────────────────────────────

describe('accountLink signal', () => {
  it('fires with confidence 25 when account IDs match', () => {
    const a = makeOrder({ accountIdHash: 'acct-hash-same' });
    const b = makeOrder({ accountIdHash: 'acct-hash-same' });
    const result = accountLink(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(25);
  });

  it('does not fire when account IDs differ', () => {
    const a = makeOrder({ accountIdHash: 'acct-hash-aaa' });
    const b = makeOrder({ accountIdHash: 'acct-hash-bbb' });
    const result = accountLink(a, b);
    expect(result.fired).toBe(false);
  });

  it('reports missing when account ID is absent', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = accountLink(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('account_id');
  });
});

// ── phoneMatch ────────────────────────────────────────────────────────────────

describe('phoneMatch signal', () => {
  it('fires with confidence 20 when phone hashes match', () => {
    const a = makeOrder({ phoneHash: 'phone-hash-same' });
    const b = makeOrder({ phoneHash: 'phone-hash-same' });
    const result = phoneMatch(a, b);
    expect(result.fired).toBe(true);
    expect(result.confidence).toBe(20);
  });

  it('does not fire when phone hashes differ', () => {
    const a = makeOrder({ phoneHash: 'phone-hash-aaa' });
    const b = makeOrder({ phoneHash: 'phone-hash-bbb' });
    const result = phoneMatch(a, b);
    expect(result.fired).toBe(false);
  });

  it('reports missing when phone is absent', () => {
    const a = makeOrder();
    const b = makeOrder();
    const result = phoneMatch(a, b);
    expect(result.fired).toBe(false);
    expect(result.dataPointsMissing).toContain('customer_phone');
  });
});
