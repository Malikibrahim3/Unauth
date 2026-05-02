import {
  assessDataQuality,
  assessDataQualityFromMapping,
  FIELD_TIERS,
} from '@/lib/csv/dataQuality';
import type { NormalisedOrder } from '@/lib/engine/types';
import { ipCluster } from '@/lib/engine/identitySignals';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal NormalisedOrder with only required fields populated */
function makeOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    orderId: 'ORD-001',
    orderDate: new Date('2025-01-01'),
    emailHash: 'hash_email',
    addressHash: 'hash_addr',
    phoneHash: null,
    nameHash: null,
    billingAddressHash: null,
    ipHash: null,
    deviceIdHash: null,
    cardFingerprint: null,
    cardBin: null,
    cardLast4: null,
    cardBinLast4: null,
    browserFingerprint: null,
    cookieIdHash: null,
    userAgentHash: null,
    asnHash: null,
    accountIdHash: null,
    customerNameNorm: 'test customer',
    orderTotal: 50,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
    groundTruthLabel: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1 — Minimal CSV: only required fields
// ---------------------------------------------------------------------------
describe('assessDataQuality — minimal CSV', () => {
  const rows = [
    makeOrder({ orderId: 'A' }),
    makeOrder({ orderId: 'B' }),
    makeOrder({ orderId: 'C' }),
  ];

  const report = assessDataQuality(rows);

  it('grade is minimal', () => {
    expect(report.grade).toBe('minimal');
  });

  it('score is below 15', () => {
    expect(report.score).toBeLessThan(15);
  });

  it('score is 0 when no optional fields present', () => {
    // All optional fields are null in makeOrder — score should be exactly 0
    expect(report.score).toBe(0);
  });

  it('maxAchievableGrade is possible', () => {
    expect(report.maxAchievableGrade).toBe('possible');
  });

  it('all 6 high-value fields are missing', () => {
    expect(report.missingHighValue).toEqual(
      expect.arrayContaining(FIELD_TIERS.high as unknown as string[]),
    );
    expect(report.missingHighValue).toHaveLength(FIELD_TIERS.high.length);
  });

  it('presentFields is empty', () => {
    expect(report.presentFields).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Rich CSV: required + all high-value fields
// ---------------------------------------------------------------------------
describe('assessDataQuality — rich CSV', () => {
  const rows = [
    makeOrder({
      orderId: 'A',
      cardFingerprint: 'fp_abc',
      browserFingerprint: 'bf_abc',
      ipHash: 'ip_abc',
      deviceIdHash: 'dev_abc',
      cardLast4: '4242',
      cookieIdHash: 'cookie_abc',
    }),
    makeOrder({
      orderId: 'B',
      cardFingerprint: 'fp_def',
      browserFingerprint: 'bf_def',
      ipHash: 'ip_def',
      deviceIdHash: 'dev_def',
      cardLast4: '1234',
      cookieIdHash: 'cookie_def',
    }),
  ];

  const report = assessDataQuality(rows);

  it('grade is rich', () => {
    expect(report.grade).toBe('rich');
  });

  it('score is above 60', () => {
    expect(report.score).toBeGreaterThan(60);
  });

  it('maxAchievableGrade is definite', () => {
    expect(report.maxAchievableGrade).toBe('definite');
  });

  it('all high-value fields are present', () => {
    for (const f of FIELD_TIERS.high) {
      expect(report.presentFields).toContain(f);
    }
  });

  it('missingHighValue is empty', () => {
    expect(report.missingHighValue).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Row coverage threshold (< 20% = treated as absent)
// ---------------------------------------------------------------------------
describe('assessDataQuality — row coverage threshold', () => {
  // 10 rows: ip_address present in only 1 (= 10% coverage, below threshold)
  const rows = Array.from({ length: 10 }, (_, i) =>
    makeOrder({
      orderId: `ORD-${i}`,
      ipHash: i === 0 ? 'ip_only_one' : null,
    }),
  );

  const report = assessDataQuality(rows);

  it('ip_address is NOT in presentFields (< 20% coverage)', () => {
    expect(report.presentFields).not.toContain('ip_address');
  });

  it('ip_address IS in partlyEmptyFields', () => {
    expect(report.partlyEmptyFields).toContain('ip_address');
  });

  it('ip_address row coverage is 0.1', () => {
    expect(report.rowCoverage['ip_address']).toBeCloseTo(0.1);
  });

  it('score does not include ip_address points', () => {
    // ip_address is worth 12 pts — since excluded, score should not include it
    const reportWithIp = assessDataQuality(
      rows.map((r) => makeOrder({ ...r, ipHash: 'always_present' })),
    );
    expect(reportWithIp.score - report.score).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — assessDataQualityFromMapping (client-side)
// ---------------------------------------------------------------------------
describe('assessDataQualityFromMapping — client-side mapping only', () => {
  it('empty map → minimal grade', () => {
    const report = assessDataQualityFromMapping({});
    expect(report.grade).toBe('minimal');
    expect(report.score).toBe(0);
    expect(report.presentFields).toHaveLength(0);
  });

  it('card_fingerprint + browser_fingerprint + ip_address + device_id mapped → rich', () => {
    const report = assessDataQualityFromMapping({
      card_fingerprint:    'PSP Token',
      browser_fingerprint: 'Browser Hash',
      ip_address:          'IP Address',
      device_id:           'Device ID',
      card_last4:          'Card Last 4',
      cookie_id:           'Cookie ID',
    });
    expect(report.grade).toBe('rich');
    expect(report.score).toBeGreaterThanOrEqual(60); // 25+15+12+15+10+8 = 85
  });

  it('row coverage threshold applies in client-side assessment', () => {
    const samples: Array<Record<string, string>> = Array.from({ length: 10 }, (_, i) => ({
      'IP Address': i === 0 ? '1.2.3.4' : '',
    }));
    const report = assessDataQualityFromMapping(
      { ip_address: 'IP Address' },
      samples,
    );
    expect(report.presentFields).not.toContain('ip_address');
    expect(report.partlyEmptyFields).toContain('ip_address');
  });
});

// ---------------------------------------------------------------------------
// Test 5 — ipCluster null handling (Phase 5 — asymmetric null)
// ---------------------------------------------------------------------------
describe('ipCluster — asymmetric null field handling', () => {
  const orderWithIp = makeOrder({ ipHash: 'hash_ip_abc' });
  const orderWithoutIp = makeOrder({ ipHash: null });

  it('returns fired: false when orderA has IP but orderB does not', () => {
    const result = ipCluster(orderWithIp, orderWithoutIp, false, 0);
    expect(result.fired).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('evidence message says "missing on one order" for asymmetric case', () => {
    const result = ipCluster(orderWithIp, orderWithoutIp, false, 0);
    expect(result.evidence).toMatch(/missing on one order/i);
  });

  it('dataPointsMissing includes ip_address', () => {
    const result = ipCluster(orderWithIp, orderWithoutIp, false, 0);
    expect(result.dataPointsMissing).toContain('ip_address');
  });

  it('does not throw when both IPs are null', () => {
    expect(() => ipCluster(orderWithoutIp, orderWithoutIp, false, 0)).not.toThrow();
    const result = ipCluster(orderWithoutIp, orderWithoutIp, false, 0);
    expect(result.fired).toBe(false);
  });

  it('evidence says "both orders" when both IPs are missing', () => {
    const result = ipCluster(orderWithoutIp, orderWithoutIp, false, 0);
    expect(result.evidence).toMatch(/both orders/i);
  });
});
