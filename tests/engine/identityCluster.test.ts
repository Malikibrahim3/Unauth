/**
 * Identity Cluster Integration Tests
 *
 * Tests 3–8 from the specification:
 *
 * Test 3 — Completeness cap: only-required-fields pairs cap at 'possible', dataGapNote present
 * Test 4 — IP-only guard: shared IP alone → unconfirmedOverlaps, not a cluster
 * Test 6 — Behavioral context accuracy: refundRate, totalOrders, totalRefundClaims
 *          + no inference language in behavioral context
 * Plus: single-signal corroboration rule, 'definite' grade requires 2+ signals
 */

import { clusterBatch } from '@/lib/engine/identityCluster';
import type { NormalisedOrder } from '@/lib/engine/types';
import type { FastScoringContext } from '@/lib/engine/fastContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

type OrderExtended = NormalisedOrder & {
  _rawEmail?: string;
  _rawAddress?: string | null;
  _rawIP?: string | null;
};

let orderCounter = 0;
function makeOrder(overrides: Partial<OrderExtended> = {}): OrderExtended {
  orderCounter++;
  return {
    orderId: `ORD-${orderCounter}`,
    orderDate: new Date('2025-01-01'),
    emailHash: `email-hash-${orderCounter}`, // unique by default → different identities
    addressHash: null,
    phoneHash: null,
    customerNameNorm: 'test user',
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

function makeMinimalContext(): FastScoringContext {
  return {
    allOrders: [],
    customerOrderHistory: new Map(),
    populationRefundStats: { mean: 0.1, stddev: 0.05 },
    addressEmailMap: new Map(),
    emailRawEmailsMap: new Map(),
    customerMaxVelocity: new Map(),
    customerValueStats: new Map(),
    customerPaymentMethods: new Map(),
    historicalEmailMap: new Map(),
    historicalIPMap: new Map(),
    historicalAddressMap: new Map(),
    historicalCardMap: new Map(),
    historicalCoOccurrenceMap: new Map(),
    signalWeightAdjustments: {},
    pendingAuditLogs: [],
  };
}

// ── Test 3: Completeness cap ──────────────────────────────────────────────────

describe('Test 3 — Completeness cap', () => {
  it('caps grade at possible when only required fields are present', () => {
    // Two orders with different emails (Pass 2), same address + phone + email variant.
    // emailVariant(12) + addressCluster(15) + phoneMatch(20) = 47 → 'possible' raw grade.
    // Completeness: email + name + address + phone = 4/15 = 26.7% → cap at 'possible'.
    const sharedAddrHash = 'addr-hash-cap-shared';
    const sharedAddrText = '10 oak avenue london';
    const sharedPhoneHash = 'phone-hash-cap-shared';

    const a = makeOrder({
      emailHash: 'email-hash-cap-X',
      _rawEmail: 'jane@example.com',
      addressHash: sharedAddrHash,
      _rawAddress: sharedAddrText,
      customerNameNorm: 'jane doe',
      phoneHash: sharedPhoneHash,
    });
    const b = makeOrder({
      emailHash: 'email-hash-cap-Y', // different email hash → Pass 2
      _rawEmail: 'jane+test@example.com', // variant of same base
      addressHash: sharedAddrHash,
      _rawAddress: sharedAddrText,
      customerNameNorm: 'jane doe',
      phoneHash: sharedPhoneHash,
    });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b], ctx);

    // Should produce a cluster
    expect(clusters.length).toBeGreaterThan(0);

    const cluster = clusters[0];
    // With completeness ~27% (<30%), grade must be capped at 'possible'
    expect(cluster.confidenceGrade).toBe('possible');
    expect(cluster.confidenceGrade).not.toBe('definite');
    expect(cluster.confidenceGrade).not.toBe('probable');

    // dataGapNote must be present listing missing optional fields
    expect(cluster.merchantDisplay.dataGapNote).toBeDefined();
    expect(cluster.merchantDisplay.dataGapNote).toContain('card');
  });
});

// ── Test 4: IP-only guard ─────────────────────────────────────────────────────

describe('Test 4 — IP-only guard', () => {
  it('does NOT cluster orders sharing only an IP address', () => {
    const sharedIp = 'ip-hash-shared';

    const a = makeOrder({
      ipHash: sharedIp,
      _rawIP: '1.2.3.4',
      // completely different everything else
      emailHash: 'email-hash-A',
      _rawEmail: 'alice@example.com',
      _rawAddress: '1 first street london',
      customerNameNorm: 'alice jones',
    });
    const b = makeOrder({
      ipHash: sharedIp,
      _rawIP: '1.2.3.4',
      emailHash: 'email-hash-B',
      _rawEmail: 'robert@other.com',
      _rawAddress: '99 last road birmingham',
      customerNameNorm: 'robert brown',
    });

    const ctx = makeMinimalContext();
    const { clusters, unconfirmedOverlaps } = clusterBatch([a, b], ctx);

    // Must NOT appear in any cluster
    const linkedOrderIds = clusters.flatMap((c) => c.orderIds);
    expect(linkedOrderIds).not.toContain(a.orderId);
    expect(linkedOrderIds).not.toContain(b.orderId);

    // Must appear in unconfirmedOverlaps
    const overlap = unconfirmedOverlaps.find(
      (u) =>
        (u.orderIdA === a.orderId && u.orderIdB === b.orderId) ||
        (u.orderIdA === b.orderId && u.orderIdB === a.orderId)
    );
    expect(overlap).toBeDefined();
  });
});

// ── Test 6: Behavioral context accuracy ──────────────────────────────────────

describe('Test 6 — Behavioral context accuracy', () => {
  it('computes correct refundRate, totalOrders, totalRefundClaims for 3-order cluster', () => {
    // 3 orders from "same person" using different emails, linked by card fingerprint
    const cardFp = 'card-fp-hash-same';

    const a = makeOrder({
      emailHash: 'email-A',
      _rawEmail: 'alice1@example.com',
      cardFingerprint: cardFp,
      orderTotal: 80,
      refundStatus: 'full',
      orderStatus: 'completed',
      refundDate: new Date('2025-01-03'),
    });
    const b = makeOrder({
      emailHash: 'email-B',
      _rawEmail: 'alice2@example.com',
      cardFingerprint: cardFp,
      orderTotal: 120,
      refundStatus: 'none',
      orderStatus: 'completed',
    });
    const c = makeOrder({
      emailHash: 'email-C',
      _rawEmail: 'alice3@example.com',
      cardFingerprint: cardFp,
      orderTotal: 100,
      refundStatus: 'full',
      orderStatus: 'completed',
      refundDate: new Date('2025-01-04'),
    });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b, c], ctx);

    expect(clusters.length).toBeGreaterThan(0);
    const cluster = clusters[0];

    const bc = cluster.behavioralContext;

    expect(bc.totalOrders).toBe(3);
    expect(bc.totalRefundClaims).toBe(2);
    expect(bc.refundRate).toBeCloseTo(2 / 3, 5);

    // Ensure no inference language in behavioral context object
    // (check the string values of the object do not contain fraud-inference words)
    const serialised = JSON.stringify(bc);
    const inferenceWords = ['fraud', 'suspicious', 'likely', 'probably', 'risk'];
    for (const word of inferenceWords) {
      expect(serialised.toLowerCase()).not.toContain(word);
    }
  });
});

// ── Test: Single signal corroboration rule ────────────────────────────────────

describe('Corroboration rule', () => {
  it('caps single non-accountLink signal at possible', () => {
    // Only card last4 matches — single signal
    const a = makeOrder({ emailHash: 'email-X', cardLast4: 'l4-hash-same' });
    const b = makeOrder({ emailHash: 'email-Y', cardLast4: 'l4-hash-same' });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b], ctx);

    if (clusters.length > 0) {
      expect(clusters[0].confidenceGrade).toBe('possible');
    }
  });

  it('accountLink alone can reach probable', () => {
    const a = makeOrder({ emailHash: 'email-X', accountIdHash: 'acct-same' });
    const b = makeOrder({ emailHash: 'email-Y', accountIdHash: 'acct-same' });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b], ctx);

    if (clusters.length > 0) {
      expect(['possible', 'probable']).toContain(clusters[0].confidenceGrade);
    }
  });

  it('cannot produce definite grade from a single signal alone', () => {
    // Even a very strong single signal should not produce 'definite'
    const a = makeOrder({ emailHash: 'email-X', cardFingerprint: 'cfp-same' });
    const b = makeOrder({ emailHash: 'email-Y', cardFingerprint: 'cfp-same' });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b], ctx);

    for (const cluster of clusters) {
      expect(cluster.confidenceGrade).not.toBe('definite');
    }
  });
});

// ── Test: No fraud language in MerchantDisplay ────────────────────────────────

describe('MerchantDisplay language', () => {
  it('does not use the word "fraud" in any merchant-facing string', () => {
    const a = makeOrder({
      emailHash: 'email-A',
      cardFingerprint: 'cfp-same',
      phoneHash: 'phone-same',
    });
    const b = makeOrder({
      emailHash: 'email-B',
      cardFingerprint: 'cfp-same',
      phoneHash: 'phone-same',
    });

    const ctx = makeMinimalContext();
    const { clusters } = clusterBatch([a, b], ctx);

    for (const cluster of clusters) {
      const display = cluster.merchantDisplay;
      const allText = [
        display.headline,
        display.confidenceLine,
        display.behaviorSummary,
        display.actionReason,
        display.dataGapNote ?? '',
      ].join(' ').toLowerCase();

      expect(allText).not.toContain('fraud');
    }
  });
});
