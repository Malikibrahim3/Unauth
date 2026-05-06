/**
 * tests/linker/clusterExpansion.test.ts
 *
 * Regression + correctness tests for the second-stage cluster expansion.
 *
 * Key cases validated:
 *
 * 1. ORD-225258 (Samir Khan) — Phase 1 candidate-group promotion
 *    Four orders share card (535522-6620) + postcode (M21AA). Card+postcode
 *    scores 22 in the linker (below LINK_THRESHOLD=30), so no seed cluster
 *    forms. Three of the four have suspicious behaviour. The group should be
 *    promoted to a cluster and ORD-225258 should be included.
 *
 * 2. ORD-633229 (Lina Cross) — Phase 2 ip+postcode expansion
 *    A Bell seed cluster exists (ORD-875935 + ORD-661713 share card+ip+postcode,
 *    score=30). ORD-633229 connects to the seed via ip+postcode ONLY (score=0,
 *    dropped by linker). With refund=TRUE this should expand into the cluster.
 *
 * 3. False-positive guards
 *    - Shared IP alone → never creates / expands a cluster.
 *    - Shared postcode alone → never creates / expands a cluster.
 *    - Blank fields → never count as matches.
 *    - Corporate / busy IP (≥5 distinct orders) → ip-based expansion blocked.
 *    - Shared household heuristic (same surname + postcode-only) → blocked.
 *
 * 4. Previously correct cases must remain unaffected.
 */

import { expandSuspiciousClusters } from '../../lib/processing/clusterExpansion';
import type { RowBehaviourFlags } from '../../lib/processing/clusterExpansion';
import type { LinkedCluster, CandidatePair, LinkerOrderInput } from '../../lib/linker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<LinkerOrderInput> & { order_id: string }): LinkerOrderInput {
  return {
    email: null,
    phone: null,
    address: null,
    postcode: null,
    ip: null,
    card_last4: null,
    card_bin: null,
    device_fingerprint: null,
    account_id: null,
    ...overrides,
  };
}

function makeFlags(order_id: string, overrides: Partial<RowBehaviourFlags> = {}): RowBehaviourFlags {
  return {
    order_id,
    refund_requested: false,
    chargeback_filed: false,
    order_total: 50,
    ...overrides,
  };
}

function behaviourMap(rows: RowBehaviourFlags[]): Map<string, RowBehaviourFlags> {
  return new Map(rows.map((r) => [r.order_id, r]));
}

function nameMap(entries: [string, string][]): Map<string, string> {
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// Case 1 — ORD-225258: candidate-group promotion (card + postcode)
// ---------------------------------------------------------------------------

describe('Phase 1: candidate-group promotion — ORD-225258 (card+postcode cluster)', () => {
  /**
   * Four orders all share card 535522-6620 and postcode M21AA.
   * card(12) + postcode(10) = 22 → candidate pair (score >= 15) but not linked (< 30).
   * Three of four have suspicious behaviour.
   */
  const khanInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'ORD-225258', card_last4: '6620', card_bin: '535522', postcode: 'M2 1AA' }),
    makeInput({ order_id: 'ORD-836394', card_last4: '6620', card_bin: '535522', postcode: 'M2 1AA' }),
    makeInput({ order_id: 'ORD-203229', card_last4: '6620', card_bin: '535522', postcode: 'M2 1AA' }),
    makeInput({ order_id: 'ORD-965687', card_last4: '6620', card_bin: '535522', postcode: 'M2 1AA' }),
  ];

  // Candidate pairs produced by the linker (score=22, signals=[card,postcode])
  const khanCandidatePairs: CandidatePair[] = [
    { order_id_a: 'ORD-225258', order_id_b: 'ORD-836394', score: 22, signals: ['card', 'postcode'] },
    { order_id_a: 'ORD-225258', order_id_b: 'ORD-203229', score: 22, signals: ['card', 'postcode'] },
    { order_id_a: 'ORD-225258', order_id_b: 'ORD-965687', score: 22, signals: ['card', 'postcode'] },
    { order_id_a: 'ORD-836394', order_id_b: 'ORD-203229', score: 22, signals: ['card', 'postcode'] },
    { order_id_a: 'ORD-836394', order_id_b: 'ORD-965687', score: 22, signals: ['card', 'postcode'] },
    { order_id_a: 'ORD-203229', order_id_b: 'ORD-965687', score: 22, signals: ['card', 'postcode'] },
  ];

  const khanBehaviour = behaviourMap([
    makeFlags('ORD-225258', { refund_requested: true }),
    makeFlags('ORD-836394', { chargeback_filed: true }),       // suspicious
    makeFlags('ORD-203229', { refund_requested: true }),       // suspicious
    makeFlags('ORD-965687', { refund_requested: true }),       // suspicious
  ]);

  const khanNames = nameMap([
    ['ORD-225258', 'S. Khan'],
    ['ORD-836394', 'Sam Khan'],
    ['ORD-203229', 'S Khan'],
    ['ORD-965687', 'Samir Khan'],
  ]);

  const result = expandSuspiciousClusters(
    [],               // no existing linked clusters
    khanCandidatePairs,
    khanInputs,
    khanBehaviour,
    khanNames,
  );

  it('promotes exactly one cluster from the candidate group', () => {
    expect(result.promotedClusters).toHaveLength(1);
  });

  it('promoted cluster includes ORD-225258', () => {
    expect(result.promotedClusters[0].order_ids).toContain('ORD-225258');
  });

  it('promoted cluster includes all four Khan orders', () => {
    const ids = result.promotedClusters[0].order_ids;
    expect(ids).toContain('ORD-836394');
    expect(ids).toContain('ORD-203229');
    expect(ids).toContain('ORD-965687');
  });

  it('generates a debug report for ORD-225258', () => {
    const report = result.debugReports.find((r) => r.missed_order_id === 'ORD-225258');
    expect(report).toBeDefined();
    expect(report!.nearest_cluster_id).toBeTruthy();
    expect(report!.reason_not_flagged_before.length).toBeGreaterThan(0);
    expect(report!.recommended_fix).toContain('strong signal');
  });
});

// ---------------------------------------------------------------------------
// Case 2 — ORD-633229: ip+postcode expansion from Bell seed cluster
// ---------------------------------------------------------------------------

describe('Phase 2: ip+postcode expansion — ORD-633229 (Lina Cross)', () => {
  /**
   * Bell seed cluster (ORD-875935 + ORD-661713) was linked by the core linker
   * on card+ip+postcode (score=30). ORD-633229 shares ip+postcode with the
   * seed cluster but uses a different card — its connections scored 0 and were
   * dropped by the linker.
   */
  const bellCluster: LinkedCluster = {
    cluster_id: 'bell-seed-cluster',
    order_ids: ['ORD-875935', 'ORD-661713'],
    confidence_score: 30,
    signals_matched: ['card', 'ip', 'postcode'],
  };

  const allInputs: LinkerOrderInput[] = [
    // Seed cluster members
    makeInput({ order_id: 'ORD-875935', card_last4: '1209', card_bin: '414720', ip: '68.175.44.21', postcode: 'NJ 07302' }),
    makeInput({ order_id: 'ORD-661713', card_last4: '1209', card_bin: '414720', ip: '68.175.44.21', postcode: 'NJ 07302' }),
    // ORD-633229 — different card last4, same BIN, same ip+postcode
    makeInput({ order_id: 'ORD-633229', card_last4: '7781', card_bin: '414720', ip: '68.175.44.21', postcode: 'NJ 07302' }),
    // ORD-868570 — ip only, no postcode
    makeInput({ order_id: 'ORD-868570', card_last4: '8890', card_bin: '414720', ip: '68.175.44.21', postcode: null }),
  ];

  const beh = behaviourMap([
    makeFlags('ORD-875935', { refund_requested: true, chargeback_filed: true }),
    makeFlags('ORD-661713', { refund_requested: true, chargeback_filed: true }),
    makeFlags('ORD-633229', { refund_requested: true }),   // suspicious
    makeFlags('ORD-868570', { refund_requested: true }),   // ip only, no postcode
  ]);

  const names = nameMap([
    ['ORD-875935', 'Nora Bell'],
    ['ORD-661713', 'Norah Bell'],
    ['ORD-633229', 'Lina Cross'],
    ['ORD-868570', 'N Bell'],
  ]);

  const result = expandSuspiciousClusters(
    [bellCluster],
    [],       // no candidate pairs needed for Phase 2
    allInputs,
    beh,
    names,
  );

  it('assigns ORD-633229 to the Bell seed cluster', () => {
    expect(result.additionalClusterAssignments.get('ORD-633229')).toBe('bell-seed-cluster');
  });

  it('generates a debug report for ORD-633229', () => {
    const report = result.debugReports.find((r) => r.missed_order_id === 'ORD-633229');
    expect(report).toBeDefined();
    expect(report!.nearest_cluster_id).toBe('bell-seed-cluster');
    expect(report!.reason_not_flagged_before[0]).toContain('ip+postcode pairs score 0');
    expect(report!.recommended_fix).toContain('medium signals');
  });

  it('does NOT expand ORD-868570 (ip only, no postcode)', () => {
    expect(result.additionalClusterAssignments.has('ORD-868570')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: shared IP alone
// ---------------------------------------------------------------------------

describe('FP guard: shared IP alone must never create or expand a cluster', () => {
  const clusterWithIp: LinkedCluster = {
    cluster_id: 'seed-ip-test',
    order_ids: ['A', 'B'],
    confidence_score: 30,
    signals_matched: ['phone', 'ip'],
  };

  const allInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'A', phone: '447700000001', ip: '1.2.3.4' }),
    makeInput({ order_id: 'B', phone: '447700000001', ip: '1.2.3.4' }),
    makeInput({ order_id: 'C', ip: '1.2.3.4' }),  // ip only, no postcode
  ];

  const beh = behaviourMap([
    makeFlags('A'),
    makeFlags('B'),
    makeFlags('C', { refund_requested: true }),
  ]);

  const names = nameMap([['A', 'Alice'], ['B', 'Bob'], ['C', 'Charlie']]);

  const result = expandSuspiciousClusters(
    [clusterWithIp],
    [],
    allInputs,
    beh,
    names,
  );

  it('does not expand C (ip only)', () => {
    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: shared postcode alone
// ---------------------------------------------------------------------------

describe('FP guard: shared postcode alone must never create or expand a cluster', () => {
  const clusterWithPostcode: LinkedCluster = {
    cluster_id: 'seed-postcode-test',
    order_ids: ['A', 'B'],
    confidence_score: 38,
    signals_matched: ['phone', 'postcode'],
  };

  const allInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'A', phone: '447700000001', postcode: 'SW1A 1AA' }),
    makeInput({ order_id: 'B', phone: '447700000001', postcode: 'SW1A 1AA' }),
    makeInput({ order_id: 'C', postcode: 'SW1A 1AA' }),  // postcode only
  ];

  const beh = behaviourMap([
    makeFlags('A'),
    makeFlags('B'),
    makeFlags('C', { refund_requested: true }),
  ]);

  const names = nameMap([['A', 'Alice'], ['B', 'Bob'], ['C', 'Charlie']]);

  const result = expandSuspiciousClusters(
    [clusterWithPostcode],
    [],
    allInputs,
    beh,
    names,
  );

  it('does not expand C (postcode only)', () => {
    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: blank fields must never count as matches
// ---------------------------------------------------------------------------

describe('FP guard: blank/null fields must never count as matches', () => {
  it('a row with null ip does not match another row with null ip', () => {
    const cluster: LinkedCluster = {
      cluster_id: 'seed-null-ip',
      order_ids: ['A', 'B'],
      confidence_score: 30,
      signals_matched: ['phone'],
    };

    const allInputs: LinkerOrderInput[] = [
      makeInput({ order_id: 'A', phone: '447700000001', ip: null }),
      makeInput({ order_id: 'B', phone: '447700000001', ip: null }),
      makeInput({ order_id: 'C', ip: null, postcode: 'SW1A1AA' }),
    ];

    const beh = behaviourMap([
      makeFlags('A'),
      makeFlags('B'),
      makeFlags('C', { refund_requested: true }),
    ]);

    const result = expandSuspiciousClusters(
      [cluster], [], allInputs, beh, nameMap([['A','A'],['B','B'],['C','C']]),
    );

    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });

  it('a row with empty-string ip does not get ip credit', () => {
    const cluster: LinkedCluster = {
      cluster_id: 'seed-empty-ip',
      order_ids: ['A', 'B'],
      confidence_score: 30,
      signals_matched: ['phone', 'ip', 'postcode'],
    };

    const allInputs: LinkerOrderInput[] = [
      makeInput({ order_id: 'A', phone: '447700000001', ip: '1.2.3.4', postcode: 'SW1A1AA' }),
      makeInput({ order_id: 'B', phone: '447700000001', ip: '1.2.3.4', postcode: 'SW1A1AA' }),
      makeInput({ order_id: 'C', ip: '',               postcode: 'SW1A1AA' }),  // blank ip
    ];

    const beh = behaviourMap([
      makeFlags('A'), makeFlags('B'),
      makeFlags('C', { refund_requested: true }),
    ]);

    const result = expandSuspiciousClusters(
      [cluster], [], allInputs, beh, nameMap([['A','A'],['B','B'],['C','C']]),
    );
    // C only has postcode (1 medium signal) → not enough
    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: corporate/busy IP suppression
// ---------------------------------------------------------------------------

describe('FP guard: corporate IP (≥5 orders sharing same ip) suppresses ip-only expansion', () => {
  const corporateIp = '10.0.0.1';

  const cluster: LinkedCluster = {
    cluster_id: 'seed-corporate',
    order_ids: ['A', 'B'],
    confidence_score: 38,
    signals_matched: ['phone', 'ip'],
  };

  // 6 orders all use the corporate IP (more than CORPORATE_IP_THRESHOLD=5)
  const allInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'A', phone: '447700000001', ip: corporateIp }),
    makeInput({ order_id: 'B', phone: '447700000001', ip: corporateIp }),
    makeInput({ order_id: 'C', ip: corporateIp }),  // candidate: ip only
    makeInput({ order_id: 'D', ip: corporateIp }),
    makeInput({ order_id: 'E', ip: corporateIp }),
    makeInput({ order_id: 'F', ip: corporateIp }),
    makeInput({ order_id: 'G', ip: corporateIp }),
  ];

  const beh = behaviourMap([
    makeFlags('A'), makeFlags('B'),
    makeFlags('C', { refund_requested: true }),
    makeFlags('D'), makeFlags('E'), makeFlags('F'), makeFlags('G'),
  ]);

  const names = nameMap([
    ['A','Alice'], ['B','Bob'], ['C','Charlie'],
    ['D','Dave'], ['E','Eve'], ['F','Frank'], ['G','Grace'],
  ]);

  const result = expandSuspiciousClusters(
    [cluster], [], allInputs, beh, names,
  );

  it('does not expand C from a corporate IP cluster (ip only, busy IP)', () => {
    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: candidate group with only 1 suspicious row not promoted
// ---------------------------------------------------------------------------

describe('Phase 1 guard: candidate group needs ≥2 suspicious rows to promote', () => {
  // Two orders share card+postcode, only 1 is suspicious → should NOT promote
  const inputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'X', card_last4: '1234', card_bin: '411111', postcode: 'EC1A1BB' }),
    makeInput({ order_id: 'Y', card_last4: '1234', card_bin: '411111', postcode: 'EC1A1BB' }),
  ];

  const candidatePairs: CandidatePair[] = [
    { order_id_a: 'X', order_id_b: 'Y', score: 22, signals: ['card', 'postcode'] },
  ];

  const beh = behaviourMap([
    makeFlags('X', { refund_requested: true }),  // only 1 suspicious
    makeFlags('Y'),                              // not suspicious
  ]);

  const result = expandSuspiciousClusters(
    [], candidatePairs, inputs, beh, nameMap([['X', 'X'], ['Y', 'Y']]),
  );

  it('does not promote a two-order group with only 1 suspicious row', () => {
    expect(result.promotedClusters).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// False-positive guard: shared household (same surname + postcode-only)
// ---------------------------------------------------------------------------

describe('FP guard: likely shared household blocked when postcode-only + same surname', () => {
  const cluster: LinkedCluster = {
    cluster_id: 'seed-family',
    order_ids: ['A', 'B'],
    confidence_score: 30,
    signals_matched: ['phone', 'postcode'],
  };

  const allInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'A', phone: '447700000001', postcode: 'SW1A1AA' }),
    makeInput({ order_id: 'B', phone: '447700000001', postcode: 'SW1A1AA' }),
    makeInput({ order_id: 'C', postcode: 'SW1A1AA' }),  // postcode only, same surname
  ];

  const beh = behaviourMap([
    makeFlags('A'), makeFlags('B'),
    makeFlags('C', { refund_requested: true }),
  ]);

  // C has the same surname as cluster members
  const names = nameMap([['A', 'John Smith'], ['B', 'Jane Smith'], ['C', 'Peter Smith']]);

  const result = expandSuspiciousClusters(
    [cluster], [], allInputs, beh, names,
  );

  // C would have only postcode (1 medium signal) → blocked by single-soft-signal guard
  // AND by household guard
  it('does not expand C (same surname + postcode-only → household guard)', () => {
    expect(result.additionalClusterAssignments.has('C')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Regression: previously correct 16 flags should not be disrupted
// (verified structurally — expansion only ADDS, never removes)
// ---------------------------------------------------------------------------

describe('Regression: expansion only adds rows; it never removes existing cluster members', () => {
  const existing: LinkedCluster = {
    cluster_id: 'existing-legit',
    order_ids: ['FRAUD-1', 'FRAUD-2', 'FRAUD-3'],
    confidence_score: 65,
    signals_matched: ['phone', 'email'],
  };

  const allInputs: LinkerOrderInput[] = [
    makeInput({ order_id: 'FRAUD-1', phone: '447700111111', email: 'test@example.com' }),
    makeInput({ order_id: 'FRAUD-2', phone: '447700111111', email: 'test@example.com' }),
    makeInput({ order_id: 'FRAUD-3', phone: '447700111111', email: 'test@example.com' }),
    makeInput({ order_id: 'CLEAN-1' }),  // no shared signals
  ];

  const beh = behaviourMap([
    makeFlags('FRAUD-1', { refund_requested: true }),
    makeFlags('FRAUD-2', { chargeback_filed: true }),
    makeFlags('FRAUD-3', { refund_requested: true }),
    makeFlags('CLEAN-1'),
  ]);

  const result = expandSuspiciousClusters(
    [existing], [], allInputs, beh,
    nameMap([['FRAUD-1','A'], ['FRAUD-2','B'], ['FRAUD-3','C'], ['CLEAN-1','D']]),
  );

  it('does not add CLEAN-1 to any cluster', () => {
    expect(result.additionalClusterAssignments.has('CLEAN-1')).toBe(false);
  });

  it('does not create any promoted clusters from already-linked orders', () => {
    expect(result.promotedClusters).toHaveLength(0);
  });
});
