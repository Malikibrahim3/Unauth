/**
 * tests/engine/identityScoring.test.ts
 *
 * Tests for scoreIdentityFromSignals and the cluster-level grade assignment
 * that was missing for same-identity repeat clusters.
 *
 * Root cause being tested against:
 *   buildClusterIdentityResults had a `hasIdentityDiversity` gate that forced
 *   grade=null for any cluster where all orders shared the same email/card/
 *   phone/account (i.e. the repeat-offender pattern). This is now removed.
 *   scoreIdentityFromSignals is the authoritative deterministic scorer.
 */

import {
  scoreIdentityFromSignals,
  scoreAllClusters,
  type ScorerOrder,
} from '../../lib/scorer';
import type { LinkedCluster } from '../../lib/linker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOrder(id: string, overrides: Partial<ScorerOrder> = {}): ScorerOrder {
  return {
    order_id: id,
    order_date: '2025-01-01T00:00:00Z',
    order_total: 50,
    customer_email: 'test@example.com',
    ...overrides,
  };
}

function makeCluster(
  signals: string[],
  orderIds: string[],
  confidenceScore: number = 123
): LinkedCluster {
  return {
    cluster_id: `cluster-${signals.join('-')}`,
    order_ids: orderIds,
    confidence_score: confidenceScore,
    signals_matched: signals as any,
  };
}

// ---------------------------------------------------------------------------
// scoreIdentityFromSignals — deterministic unit tests
// ---------------------------------------------------------------------------

describe('scoreIdentityFromSignals', () => {
  it('["card","phone","account","email","ip"] → 100, definite', () => {
    const result = scoreIdentityFromSignals(['card', 'phone', 'account', 'email', 'ip']);
    // 35+30+30+25+10 = 130, capped at 100
    expect(result.identity_score).toBe(100);
    expect(result.identity_confidence_grade).toBe('definite');
    expect(result.recommended_action).not.toBeNull();
  });

  it('["phone","account","email","ip"] → 95, definite', () => {
    const result = scoreIdentityFromSignals(['phone', 'account', 'email', 'ip']);
    // 30+30+25+10 = 95
    expect(result.identity_score).toBe(95);
    expect(result.identity_confidence_grade).toBe('definite');
  });

  it('["card","phone","email"] → 90, definite', () => {
    const result = scoreIdentityFromSignals(['card', 'phone', 'email']);
    // 35+30+25 = 90
    expect(result.identity_score).toBe(90);
    expect(result.identity_confidence_grade).toBe('definite');
  });

  it('["account","email"] → 55, possible', () => {
    const result = scoreIdentityFromSignals(['account', 'email']);
    // 30+25 = 55  (>= 35 possible, < 60 probable)
    expect(result.identity_score).toBe(55);
    expect(result.identity_confidence_grade).toBe('possible');
  });

  it('["card","email"] → 60, probable (exactly at threshold)', () => {
    const result = scoreIdentityFromSignals(['card', 'email']);
    // 35+25 = 60 (>= 60 → probable)
    expect(result.identity_score).toBe(60);
    expect(result.identity_confidence_grade).toBe('probable');
  });

  it('["card","phone","account","email"] → 100, definite (cap at 100)', () => {
    const result = scoreIdentityFromSignals(['card', 'phone', 'account', 'email']);
    // 35+30+30+25 = 120, capped 100
    expect(result.identity_score).toBe(100);
    expect(result.identity_confidence_grade).toBe('definite');
  });

  it('["ip"] alone → 10, null (below possible threshold)', () => {
    const result = scoreIdentityFromSignals(['ip']);
    // 10 < 35 → null
    expect(result.identity_score).toBe(10);
    expect(result.identity_confidence_grade).toBeNull();
    expect(result.recommended_action).toBeNull();
  });

  it('[] empty → 0, null', () => {
    const result = scoreIdentityFromSignals([]);
    expect(result.identity_score).toBe(0);
    expect(result.identity_confidence_grade).toBeNull();
  });

  it('["postcode","ip"] → below threshold, null', () => {
    const result = scoreIdentityFromSignals(['postcode', 'ip']);
    // 10+10 = 20 < 35 → null
    expect(result.identity_score).toBe(20);
    expect(result.identity_confidence_grade).toBeNull();
  });

  it('["email","ip"] → 35, exactly possible', () => {
    const result = scoreIdentityFromSignals(['email', 'ip']);
    // 25+10 = 35 >= 35 → possible
    expect(result.identity_score).toBe(35);
    expect(result.identity_confidence_grade).toBe('possible');
  });

  it('["phone","email"] → 55, possible', () => {
    const result = scoreIdentityFromSignals(['phone', 'email']);
    // 30+25 = 55 >= 35, < 60 → possible
    expect(result.identity_score).toBe(55);
    expect(result.identity_confidence_grade).toBe('possible');
  });

  it('["card","account"] → 65, probable', () => {
    const result = scoreIdentityFromSignals(['card', 'account']);
    // 35+30 = 65 >= 60 → probable
    expect(result.identity_score).toBe(65);
    expect(result.identity_confidence_grade).toBe('probable');
  });

  it('is case-insensitive', () => {
    const lower = scoreIdentityFromSignals(['CARD', 'PHONE', 'EMAIL']);
    const upper = scoreIdentityFromSignals(['card', 'phone', 'email']);
    expect(lower.identity_score).toBe(upper.identity_score);
    expect(lower.identity_confidence_grade).toBe(upper.identity_confidence_grade);
  });

  it('ignores unknown signal names gracefully', () => {
    // Unknown signals contribute 0 weight; no crash
    const result = scoreIdentityFromSignals(['card', 'unknown_signal', 'email']);
    // 35+0+25 = 60 → probable
    expect(result.identity_score).toBe(60);
    expect(result.identity_confidence_grade).toBe('probable');
  });
});

// ---------------------------------------------------------------------------
// DB regression cases — real clusters from production that were returning
// identity_score=null / identity_confidence_grade=null despite having
// strong signals_matched.
// ---------------------------------------------------------------------------

describe('DB regression: same-identity repeat clusters', () => {
  /**
   * David Harris: 11 orders, same email+card+phone+account+ip.
   * Previously null because hasIdentityDiversity=false (all same values).
   * Must now be definite.
   */
  it('David Harris cluster: ["card","phone","account","email","ip"] → definite', () => {
    const signals = ['card', 'phone', 'account', 'email', 'ip'];
    const result = scoreIdentityFromSignals(signals);
    expect(result.identity_confidence_grade).toBe('definite');
    expect(result.identity_score).toBe(100);
  });

  /**
   * Oliver Smith: same pattern, same bug.
   */
  it('Oliver Smith cluster: ["card","phone","account","email","ip"] → definite', () => {
    const signals = ['card', 'phone', 'account', 'email', 'ip'];
    const result = scoreIdentityFromSignals(signals);
    expect(result.identity_confidence_grade).toBe('definite');
    expect(result.identity_score).toBe(100);
  });

  /**
   * Alex Grant: variant emails (plus-alias normalisation) → already worked.
   * Confirm it still works post-refactor.
   */
  it('Alex Grant cluster (email+card): still definite', () => {
    const cluster = makeCluster(['card', 'email'], ['ag1', 'ag2', 'ag3', 'ag4'], 120);
    const orders = [
      makeOrder('ag1', { customer_email: 'alex.grant@example.com', card_last4: '4242' }),
      makeOrder('ag2', { customer_email: 'alexgrant+orders@example.com', card_last4: '4242' }),
      makeOrder('ag3', { customer_email: 'alexgrant@example.com', card_last4: '4242' }),
      makeOrder('ag4', { customer_email: 'a.l.e.x.grant@example.com', card_last4: '4242' }),
    ];
    const ordersById = new Map(orders.map((o) => [o.order_id, o]));
    const [scored] = scoreAllClusters([cluster], ordersById);
    expect(scored.confidence_grade).toBe('DEFINITE');
    expect(scored.review_priority_score).toBeGreaterThanOrEqual(85);
  });

  /**
   * Lisa Chan: account+email only.
   * Should be at least "possible" (55 >= 35), never null.
   */
  it('Lisa Chan cluster: ["account","email"] → possible (not null)', () => {
    const signals = ['account', 'email'];
    const result = scoreIdentityFromSignals(signals);
    expect(result.identity_confidence_grade).not.toBeNull();
    expect(result.identity_confidence_grade).toBe('possible');
    expect(result.identity_score).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// scoreAllClusters — verify the full scorer also reaches DEFINITE for
// same-identity high-signal clusters.
// ---------------------------------------------------------------------------

describe('scoreAllClusters: same-identity cluster gets DEFINITE grade', () => {
  it('11 orders, same email/card/phone/account/ip → DEFINITE', () => {
    const orderIds = Array.from({ length: 11 }, (_, i) => `order-${i}`);
    const cluster = makeCluster(
      ['card', 'phone', 'account', 'email', 'ip'],
      orderIds,
      123 // linker confidence_score: 35+30+25+30+8=128, capped at 123 typical
    );

    const orders = orderIds.map((id) =>
      makeOrder(id, {
        customer_email: 'davidharris@example.com',
        customer_phone: '07912345678',
        card_last4: '1234',
        account_id: 'acc_harris',
        ip_address: '192.168.1.1',
      })
    );

    const ordersById = new Map(orders.map((o) => [o.order_id, o]));
    const [scored] = scoreAllClusters([cluster], ordersById);

    expect(scored.confidence_grade).toBe('DEFINITE');
    expect(scored.review_priority_score).toBeGreaterThanOrEqual(85);
  });

  it('single-signal ip-only cluster stays WEAK (hard cap)', () => {
    const cluster = makeCluster(['ip'], ['o1', 'o2'], 8);
    const orders = [
      makeOrder('o1', { ip_address: '1.2.3.4' }),
      makeOrder('o2', { ip_address: '1.2.3.4' }),
    ];
    const ordersById = new Map(orders.map((o) => [o.order_id, o]));
    const [scored] = scoreAllClusters([cluster], ordersById);
    expect(scored.confidence_grade).toBe('WEAK');
  });
});

// ---------------------------------------------------------------------------
// scoreIdentityFromSignals — ensures clustered rows never get null grade
// when signal score >= POSSIBLE threshold.
// ---------------------------------------------------------------------------

describe('invariant: clustered rows with score >= 35 never have null grade', () => {
  const STRONG_SIGNAL_COMBOS = [
    ['card', 'phone', 'account', 'email', 'ip'],
    ['phone', 'account', 'email', 'ip'],
    ['card', 'phone', 'email'],
    ['card', 'account'],
    ['phone', 'email'],
    ['account', 'email'],
    ['email', 'ip'],
  ];

  for (const signals of STRONG_SIGNAL_COMBOS) {
    it(`${JSON.stringify(signals)} has non-null grade`, () => {
      const result = scoreIdentityFromSignals(signals);
      expect(result.identity_confidence_grade).not.toBeNull();
      expect(result.identity_score).toBeGreaterThanOrEqual(35);
    });
  }
});
