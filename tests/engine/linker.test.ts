/**
 * Unit tests for lib/linker.ts.
 *
 * Coverage goals:
 *   - Email normalisation variants (dots, plus-aliases, case)
 *   - Phone format variants (UK +44 / 0 prefix, spaces/dashes)
 *   - Same card, different emails → linked
 *   - Same IP only → not linked
 *   - Name differences → ignored entirely (never appear in scoring)
 *   - Postcode-only → not linked
 *   - Union-find: A–B + B–C → {A,B,C}
 *   - Determinism: identical input → identical cluster_ids
 */

import {
  linkIdentities,
  normaliseEmail,
  normalisePhone,
  normalisePostcode,
  normaliseCard,
  normaliseAddress,
  type LinkerOrderInput,
} from '../../lib/linker';

// ---------------------------------------------------------------------------
// Step 1 — Normalisation
// ---------------------------------------------------------------------------

describe('normaliseEmail', () => {
  test.each([
    ['James.Harrison@Gmail.com', 'jamesharrison@gmail.com'],
    ['james.harrison+orders@gmail.com', 'jamesharrison@gmail.com'],
    ['JAMES.HARRISON+ORDERS+NESTED@gmail.com', 'jamesharrison@gmail.com'],
    ['  James.Harrison@gmail.com  ', 'jamesharrison@gmail.com'],
    ['a.b.c@proton.me', 'abc@proton.me'],
    ['user+anything@icloud.com', 'user@icloud.com'],
  ])('%s → %s', (input, expected) => {
    expect(normaliseEmail(input)).toBe(expected);
  });

  test('empty / invalid returns null', () => {
    expect(normaliseEmail('')).toBeNull();
    expect(normaliseEmail('no-at-sign')).toBeNull();
    expect(normaliseEmail('@nolocal.com')).toBeNull();
    expect(normaliseEmail('nodomain@')).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
    expect(normaliseEmail(undefined)).toBeNull();
    expect(normaliseEmail('+@gmail.com')).toBeNull(); // strips to empty local
  });
});

describe('normalisePhone', () => {
  test.each([
    ['+44 7700 900123', '447700900123'],
    ['+447700900123', '447700900123'],
    ['07700 900123', '447700900123'],
    ['07700-900-123', '447700900123'],
    ['0044 7700 900123', '447700900123'],
    // Non-UK: pass-through of digits only
    ['+1 (555) 010-0100', '15550100100'],
  ])('%s → %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  test('rejects too-short input', () => {
    expect(normalisePhone('123')).toBeNull();
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone(null)).toBeNull();
  });
});

describe('normalisePostcode', () => {
  test('strips spaces and uppercases', () => {
    expect(normalisePostcode('sw1a 1aa')).toBe('SW1A1AA');
    expect(normalisePostcode('  EC1A 1BB  ')).toBe('EC1A1BB');
    expect(normalisePostcode('')).toBe('');
    expect(normalisePostcode(null)).toBe('');
  });
});

describe('normaliseCard', () => {
  test('combines BIN and last4 when both present', () => {
    expect(normaliseCard('4242', '411111')).toBe('411111-4242');
    expect(normaliseCard(' 4242 ', '4111-1111')).toBe('41111111-4242');
  });
  test('returns last4 alone when BIN missing or too short', () => {
    expect(normaliseCard('4242', null)).toBe('4242');
    expect(normaliseCard('4242', '123')).toBe('4242');
  });
  test('returns null when last4 invalid', () => {
    expect(normaliseCard('12', '411111')).toBeNull();
    expect(normaliseCard(null, '411111')).toBeNull();
  });
  test('prefers PSP card fingerprint when present', () => {
    const a = normaliseCard('1111', '411111', 'CARD-ABC');
    const b = normaliseCard('9999', '555555', ' card-abc ');
    expect(a).toBe(b);
    expect(a).toMatch(/^fp:[a-f0-9]{64}$/);
  });
});

describe('normaliseAddress', () => {
  test('expands abbreviations and sorts tokens', () => {
    expect(normaliseAddress('23 Baker St.')).toEqual(['23', 'baker', 'street']);
    expect(normaliseAddress('23 Baker Street')).toEqual(['23', 'baker', 'street']);
    expect(normaliseAddress('Flat 4, 12 Oak Rd.')).toEqual(['12', '4', 'flat', 'oak', 'road']);
  });
  test('empty input yields empty array', () => {
    expect(normaliseAddress('')).toEqual([]);
    expect(normaliseAddress(null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Step 3–5 — End-to-end linker behaviour
// ---------------------------------------------------------------------------

function mkOrder(id: string, overrides: Partial<LinkerOrderInput> = {}): LinkerOrderInput {
  return { order_id: id, ...overrides };
}

describe('linkIdentities', () => {
  test('card BIN+last4 alone (different emails) → NOT linked, not a candidate (conservative model)', () => {
    // card weight = 12 in linker, below POSSIBLE_THRESHOLD (15).
    // BIN+last4 collisions are real; card alone cannot anchor a link.
    const result = linkIdentities([
      mkOrder('A', { email: 'alice@example.com', card_last4: '4242', card_bin: '411111' }),
      mkOrder('B', { email: 'bob@example.com',   card_last4: '4242', card_bin: '411111' }),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.candidatePairs).toHaveLength(0); // 12 < POSSIBLE_THRESHOLD 15
  });

  test('card fingerprint alone links as a strong payment identity signal', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'alice@example.com', card_fingerprint: 'CARD-FP-1' }),
      mkOrder('B', { email: 'bob@example.com', card_fingerprint: 'card-fp-1' }),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].order_ids).toEqual(['A', 'B']);
    expect(result.clusters[0].signals_matched).toContain('card');
    expect(result.clusters[0].evidence_summary).toContain('card:fingerprint');
  });

  test('same card (BIN+last4) + same phone with different emails → linked', () => {
    // card(12) + phone(30) = 42 ≥ LINK_THRESHOLD(30) → linked
    const result = linkIdentities([
      mkOrder('A', { email: 'alice@example.com', card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
      mkOrder('B', { email: 'bob@example.com',   card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].order_ids).toEqual(['A', 'B']);
    expect(result.clusters[0].signals_matched).toContain('card');
    expect(result.clusters[0].confidence_score).toBeGreaterThanOrEqual(30);
  });

  test('email base match via plus-alias and dot variation → linked', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'James.Harrison@gmail.com' }),
      mkOrder('B', { email: 'jamesharrison+orders@gmail.com' }),
    ]);
    // Email alone is 20 pts — below the 30 link threshold — so should NOT link.
    // But must still surface as a candidate (POSSIBLE 15–29).
    expect(result.clusters).toHaveLength(0);
    expect(result.candidatePairs).toHaveLength(1);
    expect(result.candidatePairs[0].signals).toEqual(['email']);
    expect(result.candidatePairs[0].score).toBe(20);
  });

  test('email + postcode → linked (20 + 10 = 30)', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'james.harrison@gmail.com', postcode: 'SW1A 1AA' }),
      mkOrder('B', { email: 'jamesharrison+orders@gmail.com', postcode: 'sw1a1aa' }),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].order_ids).toEqual(['A', 'B']);
  });

  test('IP-only match → NOT linked and NOT surfaced as candidate', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'alice@example.com', ip: '203.0.113.42' }),
      mkOrder('B', { email: 'bob@different.com', ip: '203.0.113.42' }),
    ]);
    expect(result.clusters).toHaveLength(0);
    // IP on its own is filtered out entirely — the pair contributes score 0.
    expect(result.candidatePairs).toHaveLength(0);
  });

  test('postcode-only match → NOT linked and NOT surfaced', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'alice@example.com', postcode: 'SW1A 1AA' }),
      mkOrder('B', { email: 'bob@elsewhere.com', postcode: 'sw1a1aa' }),
    ]);
    expect(result.clusters).toHaveLength(0);
    expect(result.candidatePairs).toHaveLength(0);
  });

  test('IP + another weak signal (e.g. email base) DOES contribute', () => {
    const result = linkIdentities([
      mkOrder('A', { email: 'james.harrison@gmail.com', ip: '203.0.113.42' }),
      mkOrder('B', { email: 'jamesharrison+aliased@gmail.com', ip: '203.0.113.42' }),
    ]);
    // email (20) + ip (8) = 28 — possible, not linked
    expect(result.clusters).toHaveLength(0);
    expect(result.candidatePairs).toHaveLength(1);
    expect(result.candidatePairs[0].score).toBe(28);
    expect(result.candidatePairs[0].signals).toEqual(expect.arrayContaining(['email', 'ip']));
  });

  test('name differences are ignored entirely (no signal emitted)', () => {
    // Two orders with DIFFERENT names but SAME card+phone should still link.
    // Name is not a field in LinkerOrderInput at all — it cannot contribute.
    // card(12)+phone(30) = 42 ≥ LINK_THRESHOLD(30) → linked.
    const linked = linkIdentities([
      mkOrder('A', { email: 'a@x.com', card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
      mkOrder('B', { email: 'b@y.com', card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
    ]);
    expect(linked.clusters).toHaveLength(1);

    const notLinked = linkIdentities([
      // Linker input has no "name" field at all — nothing to share.
      mkOrder('A', { email: 'alice@one.com', ip: '1.1.1.1' }),
      mkOrder('B', { email: 'bob@two.com',   ip: '1.1.1.1' }),
    ]);
    expect(notLinked.clusters).toHaveLength(0);
  });

  test('phone normalisation (+44 and 0 prefix) links orders', () => {
    const result = linkIdentities([
      // +44 international form
      mkOrder('A', { email: 'a@x.com', phone: '+44 7700 900123' }),
      // Domestic 0 form — should normalise to the same 447700900123
      mkOrder('B', { email: 'b@y.com', phone: '07700 900123' }),
    ]);
    // phone (30) → exactly at the link threshold
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].signals_matched).toContain('phone');
  });

  test('union-find: transitive clustering A–B–C', () => {
    // A and B share card+phone (12+30=42 ≥ 30 → linked)
    // B and C share phone (30 ≥ 30 → linked)
    // Transitively: {A, B, C} in one cluster; D is isolated
    const result = linkIdentities([
      mkOrder('A', { card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
      mkOrder('B', { card_last4: '4242', card_bin: '411111', phone: '+447700900123' }),
      mkOrder('C', { phone: '+44 7700 900123' }),                        // linked to B via phone
      mkOrder('D', { card_last4: '9999', card_bin: '555555' }),          // isolated
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].order_ids).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(result.clusters[0].order_ids).toHaveLength(3);
  });

  test('deterministic cluster_id: identical input → identical id', () => {
    // Use phone (weight 30 ≥ LINK_THRESHOLD 30) so the cluster forms.
    const orders: LinkerOrderInput[] = [
      mkOrder('A', { phone: '+447700900123' }),
      mkOrder('B', { phone: '+447700900123' }),
    ];
    const r1 = linkIdentities(orders);
    const r2 = linkIdentities([...orders].reverse()); // different input order
    expect(r1.clusters).toHaveLength(1);
    expect(r1.clusters[0].cluster_id).toBe(r2.clusters[0].cluster_id);
  });

  test('singleton input produces no clusters and no pairs', () => {
    expect(linkIdentities([mkOrder('A', { email: 'a@x.com' })]).clusters).toHaveLength(0);
    expect(linkIdentities([]).candidatePairs).toHaveLength(0);
  });
});
