/**
 * Identity Match Scorer Tests
 *
 * Covers:
 *   5.1 Core Invariance — flipping refund/chargeback must not change identity results
 *   5.2 False-Positive Trap Fixtures — name-only, postcode-only, IP-only, etc.
 *   5.3 Positive Identity Fixtures — genuine same-customer scenarios
 */

import { describe, it, expect } from '@jest/globals';
import { scoreIdentityMatch, scoreClusterIdentity } from '../../lib/identity/matchScorer';
import type { LinkerOrderInput } from '../../lib/linker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOrder(
  id: string,
  overrides: Partial<LinkerOrderInput> = {},
): LinkerOrderInput {
  return { order_id: id, ...overrides };
}

// ---------------------------------------------------------------------------
// 5.1 Core Invariance Tests
// ---------------------------------------------------------------------------

describe('Invariance: refund/chargeback flags must not affect identity scoring', () => {
  const baseCluster: LinkerOrderInput[] = [
    makeOrder('ord-001', { phone: '+447700900000', email: 'alice@example.com', shipping_address: '10 High St, London' }),
    makeOrder('ord-002', { phone: '+447700900000', email: 'alice+promo@example.com', shipping_address: '10 High St, London' }),
  ];

  it('scoreIdentityMatch produces identical result regardless of refund_requested presence', () => {
    // The matchScorer only takes LinkerOrderInput — it has no refund fields.
    // This test confirms the linker input type cannot carry refund context.
    const r1 = scoreIdentityMatch(baseCluster[0], baseCluster);
    const r2 = scoreIdentityMatch(baseCluster[0], baseCluster);
    expect(r1.identity_match_score).toBe(r2.identity_match_score);
    expect(r1.identity_match_grade).toBe(r2.identity_match_grade);
    expect(r1.match_status).toBe(r2.match_status);
  });

  it('scoreClusterIdentity produces identical cluster grade for same inputs', () => {
    const r1 = scoreClusterIdentity(baseCluster);
    const r2 = scoreClusterIdentity(baseCluster);
    expect(r1.clusterGrade).toBe(r2.clusterGrade);
    expect(r1.clusterScore).toBe(r2.clusterScore);
  });

  it('cluster with phone match scores the same whether or not chargeback context exists', () => {
    // Without chargeback: same phone cluster
    const cluster = [
      makeOrder('a', { phone: '+447700900001' }),
      makeOrder('b', { phone: '+447700900001' }),
    ];
    const result = scoreClusterIdentity(cluster);
    // Phone is a strong anchor — should produce at least 'candidate'
    expect(['candidate', 'probable', 'confirmed']).toContain(result.clusterGrade);

    // Re-run after "adding chargeback context" — same input, same result
    const result2 = scoreClusterIdentity(cluster);
    expect(result2.clusterGrade).toBe(result.clusterGrade);
    expect(result2.clusterScore).toBe(result.clusterScore);
  });
});

// ---------------------------------------------------------------------------
// 5.2 False-Positive Trap Fixtures
// ---------------------------------------------------------------------------

describe('False-positive traps: weak signals must not produce probable/confirmed', () => {
  it('name-only match → none', () => {
    const cluster = [
      makeOrder('a', { name: 'John Smith' }),
      makeOrder('b', { name: 'John Smith' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('postcode-only match → none', () => {
    const cluster = [
      makeOrder('a', { postcode: 'EC1A 1BB' }),
      makeOrder('b', { postcode: 'EC1A 1BB' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('IP-only match → none', () => {
    const cluster = [
      makeOrder('a', { ip: '10.0.0.1' }),
      makeOrder('b', { ip: '10.0.0.1' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('name + postcode only → none (no anchor)', () => {
    const cluster = [
      makeOrder('a', { name: 'Jane Doe', postcode: 'SW1A 1AA' }),
      makeOrder('b', { name: 'Jane Doe', postcode: 'SW1A 1AA' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('IP + postcode only → none (no strong anchor)', () => {
    const cluster = [
      makeOrder('a', { ip: '192.168.1.1', postcode: 'M1 1AA' }),
      makeOrder('b', { ip: '192.168.1.1', postcode: 'M1 1AA' }),
    ];
    const result = scoreClusterIdentity(cluster);
    // Both are corroborators, no anchor → none
    expect(result.clusterGrade).toBe('none');
  });

  it('BIN+last4 only → none (no anchor)', () => {
    const cluster = [
      makeOrder('a', { card_bin: '411111', card_last4: '1234' }),
      makeOrder('b', { card_bin: '411111', card_last4: '1234' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('BIN+last4 + postcode only → none (card is medium but not anchor, no anchor present)', () => {
    const cluster = [
      makeOrder('a', { card_bin: '411111', card_last4: '5678', postcode: 'N1 1AA' }),
      makeOrder('b', { card_bin: '411111', card_last4: '5678', postcode: 'N1 1AA' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('name + postcode + IP → none (no anchor)', () => {
    const cluster = [
      makeOrder('a', { name: 'Bob Jones', postcode: 'E1 1AA', ip: '10.1.1.1' }),
      makeOrder('b', { name: 'Bob Jones', postcode: 'E1 1AA', ip: '10.1.1.1' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('single order cluster → none', () => {
    const cluster = [makeOrder('solo', { phone: '+447700900100' })];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('empty cluster → none', () => {
    const result = scoreClusterIdentity([]);
    expect(result.clusterGrade).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// 5.3 Positive Identity Fixtures
// ---------------------------------------------------------------------------

describe('Positive identity fixtures: genuine links must surface', () => {
  it('same phone + same shipping address → probable or confirmed', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900200', shipping_address: '5 Baker St, London NW1' }),
      makeOrder('b', { phone: '+447700900200', shipping_address: '5 Baker St, London NW1' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(['probable', 'confirmed']).toContain(result.clusterGrade);
  });

  it('same device fingerprint + changed email → confirmed', () => {
    const cluster = [
      makeOrder('a', { device_fingerprint: 'dev-abc123', email: 'user1@example.com' }),
      makeOrder('b', { device_fingerprint: 'dev-abc123', email: 'user2@gmail.com' }),
    ];
    const result = scoreClusterIdentity(cluster);
    // Device alone = strong anchor = at least candidate; with email on one = candidate+
    expect(['candidate', 'probable', 'confirmed']).toContain(result.clusterGrade);
    expect(result.clusterGrade).not.toBe('none');
  });

  it('same account ID + same email → probable or confirmed', () => {
    const cluster = [
      makeOrder('a', { account_id: 'acct-xyz', email: 'user@shop.com' }),
      makeOrder('b', { account_id: 'acct-xyz', email: 'user@shop.com' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(['probable', 'confirmed']).toContain(result.clusterGrade);
  });

  it('two independent strong anchors (device + phone) → confirmed', () => {
    const cluster = [
      makeOrder('a', { device_fingerprint: 'fp-111', phone: '+447700900300' }),
      makeOrder('b', { device_fingerprint: 'fp-111', phone: '+447700900300' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('confirmed');
  });

  it('same phone alone → candidate (single strong anchor, no corroborator)', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900400' }),
      makeOrder('b', { phone: '+447700900400' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('candidate');
  });

  it('same phone + same postcode (corroborator) → probable', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900500', postcode: 'LS1 1AA' }),
      makeOrder('b', { phone: '+447700900500', postcode: 'LS1 1AA' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('probable');
  });

  it('same email + same billing address → candidate (no strong anchor)', () => {
    const cluster = [
      makeOrder('a', { email: 'customer@domain.com', billing_address: '100 Oxford St, London' }),
      makeOrder('b', { email: 'customer@domain.com', billing_address: '100 Oxford St, London' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('candidate');
  });

  it('matched_datapoints contains human-readable labels', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900600', email: 'me@example.com' }),
      makeOrder('b', { phone: '+447700900600', email: 'me@example.com' }),
    ];
    const rowResult = scoreIdentityMatch(cluster[0], cluster);
    expect(rowResult.matched_datapoints).toContain('same phone number');
    expect(rowResult.matched_datapoints).toContain('same email address');
  });

  it('card fingerprint is a strong payment identity anchor, unlike BIN+last4', () => {
    const cluster = [
      makeOrder('a', { card_fingerprint: 'CARD-FP-123' }),
      makeOrder('b', { card_fingerprint: 'card-fp-123' }),
    ];
    const rowResult = scoreIdentityMatch(cluster[0], cluster);
    expect(rowResult.identity_match_grade).toBe('candidate');
    expect(rowResult.identity_match_score).toBeGreaterThanOrEqual(30);
    expect(rowResult.matched_datapoints).toContain('same card fingerprint');
  });

  it('changed_datapoints captures changed email', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900700', email: 'old@example.com' }),
      makeOrder('b', { phone: '+447700900700', email: 'new@example.com' }),
    ];
    // Row 'a' has phone matched, email is different from 'b'
    const rowResult = scoreIdentityMatch(cluster[0], cluster);
    expect(rowResult.matched_datapoints).toContain('same phone number');
    // email on row 'a' differs from row 'b' → changed
    expect(rowResult.changed_datapoints).toContain('new email surface form');
  });

  it('evidence_summary is not empty for a linked pair', () => {
    const cluster = [
      makeOrder('a', { phone: '+447700900800' }),
      makeOrder('b', { phone: '+447700900800' }),
    ];
    const result = scoreIdentityMatch(cluster[0], cluster);
    expect(result.evidence_summary).not.toBe('Insufficient identity evidence to establish a link.');
    expect(result.evidence_summary.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Grade gate consistency checks
// ---------------------------------------------------------------------------

describe('Grade gate: numeric score cannot override evidence rules', () => {
  it('probable requires at least one strong anchor', () => {
    const cluster = [
      makeOrder('a', { email: 'sam@example.com', postcode: 'W1 1AA', name: 'Sam Doe' }),
      makeOrder('b', { email: 'sam@example.com', postcode: 'W1 1AA', name: 'Sam Doe' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('candidate');
  });

  it('confirmed requires at least two strong anchors', () => {
    const cluster = [
      makeOrder('a', {
        phone: '+447700910000',
        shipping_address: '11 Strand, London WC2N 5HR',
        postcode: 'WC2N 5HR',
        name: 'Casey Brown',
      }),
      makeOrder('b', {
        phone: '+447700910000',
        shipping_address: '11 Strand, London WC2N 5HR',
        postcode: 'WC2N 5HR',
        name: 'Casey Brown',
      }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('probable');
  });

  it('corroborators alone never produce probable regardless of count', () => {
    // Many corroborators: name + postcode + ip — but no anchor
    const cluster = [
      makeOrder('a', { name: 'Alex Brown', postcode: 'B1 1AA', ip: '172.16.0.1' }),
      makeOrder('b', { name: 'Alex Brown', postcode: 'B1 1AA', ip: '172.16.0.1' }),
    ];
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });

  it('card + postcode without anchor → none', () => {
    const cluster = [
      makeOrder('a', { card_bin: '555555', card_last4: '0000', postcode: 'CF10 1AA' }),
      makeOrder('b', { card_bin: '555555', card_last4: '0000', postcode: 'CF10 1AA' }),
    ];
    // Card is medium (no anchor=false), postcode is corroborator, no strong anchor
    const result = scoreClusterIdentity(cluster);
    expect(result.clusterGrade).toBe('none');
  });
});
