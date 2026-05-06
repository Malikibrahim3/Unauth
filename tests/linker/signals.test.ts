/**
 * Unit tests for lib/processing/signals.ts
 *
 * Covers the two helpers:
 *   - hasValue()
 *   - getRowMatchedSignals()
 *
 * Key regression test: blank-IP orders in a cluster must NOT have "ip"
 * in their signals_matched even when other orders in the cluster share an IP.
 *
 * Test fixture orders (mimicking the 4-order cluster from the bug report):
 *
 *   ORD-257123  phone=447700000001  postcode=SW1A1AA  ip=192.168.1.100
 *   ORD-851978  phone=447700000001  postcode=SW1A1AA  ip=192.168.1.100
 *   ORD-851501  phone=447700000001  postcode=SW1A1AA  ip=""  (blank)
 *   ORD-438399  phone=447700000001  postcode=SW1A1AA  ip=""  (blank)
 *
 * Expected signals:
 *   ORD-257123 → phone, postcode, ip
 *   ORD-851978 → phone, postcode, ip
 *   ORD-851501 → phone, postcode      (no ip — blank ip must not match)
 *   ORD-438399 → phone, postcode      (no ip — blank ip must not match)
 */

import { hasValue, getRowMatchedSignals } from '../../lib/processing/signals';
import type { LinkerOrderInput } from '../../lib/linker';

// ---------------------------------------------------------------------------
// hasValue
// ---------------------------------------------------------------------------

describe('hasValue', () => {
  it('returns false for null', () => {
    expect(hasValue(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasValue(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasValue('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(hasValue('   ')).toBe(false);
  });

  it.each(['n/a', 'N/A', 'na', 'NA', 'none', 'None', 'NONE', 'null', 'NULL', 'undefined'])(
    'returns false for placeholder "%s"',
    (placeholder) => {
      expect(hasValue(placeholder)).toBe(false);
    },
  );

  it('returns true for a real string value', () => {
    expect(hasValue('192.168.1.1')).toBe(true);
  });

  it('returns true for a phone number', () => {
    expect(hasValue('+44 7700 000001')).toBe(true);
  });

  it('returns true for 0 (numeric)', () => {
    // 0 is not a placeholder — it's a legitimate zero value
    expect(hasValue(0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRowMatchedSignals — core 4-order cluster test
// ---------------------------------------------------------------------------

describe('getRowMatchedSignals — blank-IP cluster regression', () => {
  /**
   * Cluster fixture: 4 orders share phone + postcode; only 2 share an IP.
   * All have unique emails so they don't link on email.
   */
  const clusterRows: LinkerOrderInput[] = [
    {
      order_id: 'ORD-257123',
      phone: '+44 7700 000001',
      postcode: 'SW1A 1AA',
      ip: '192.168.1.100',
      email: 'alice@example.com',
    },
    {
      order_id: 'ORD-851978',
      phone: '+44 7700 000001',
      postcode: 'SW1A 1AA',
      ip: '192.168.1.100',
      email: 'bob@example.com',
    },
    {
      order_id: 'ORD-851501',
      phone: '+44 7700 000001',
      postcode: 'SW1A 1AA',
      ip: '',           // blank — must NOT match
      email: 'carol@example.com',
    },
    {
      order_id: 'ORD-438399',
      phone: '+44 7700 000001',
      postcode: 'SW1A 1AA',
      ip: '',           // blank — must NOT match
      email: 'dave@example.com',
    },
  ];

  it('ORD-257123 includes phone, postcode, ip', () => {
    const signals = getRowMatchedSignals(clusterRows[0], clusterRows);
    expect(signals).toContain('phone');
    expect(signals).toContain('postcode');
    expect(signals).toContain('ip');
  });

  it('ORD-851978 includes phone, postcode, ip', () => {
    const signals = getRowMatchedSignals(clusterRows[1], clusterRows);
    expect(signals).toContain('phone');
    expect(signals).toContain('postcode');
    expect(signals).toContain('ip');
  });

  it('ORD-851501 includes phone and postcode but NOT ip', () => {
    const signals = getRowMatchedSignals(clusterRows[2], clusterRows);
    expect(signals).toContain('phone');
    expect(signals).toContain('postcode');
    expect(signals).not.toContain('ip');
  });

  it('ORD-438399 includes phone and postcode but NOT ip', () => {
    const signals = getRowMatchedSignals(clusterRows[3], clusterRows);
    expect(signals).toContain('phone');
    expect(signals).toContain('postcode');
    expect(signals).not.toContain('ip');
  });
});

// ---------------------------------------------------------------------------
// getRowMatchedSignals — null / placeholder IP variants
// ---------------------------------------------------------------------------

describe('getRowMatchedSignals — null and placeholder IP variants', () => {
  const base: LinkerOrderInput[] = [
    {
      order_id: 'A',
      phone: '447700000001',
      postcode: 'SW1A1AA',
      ip: '10.0.0.1',
      email: 'a@example.com',
    },
    {
      order_id: 'B',
      phone: '447700000001',
      postcode: 'SW1A1AA',
      ip: '10.0.0.1',
      email: 'b@example.com',
    },
  ];

  it.each([null, undefined, '', '   ', 'N/A', 'na', 'none', 'null'])(
    'ip=%s on a third row does not get ip in signals',
    (badIp) => {
      const rows: LinkerOrderInput[] = [
        ...base,
        {
          order_id: 'C',
          phone: '447700000001',
          postcode: 'SW1A1AA',
          ip: badIp as string | null | undefined,
          email: 'c@example.com',
        },
      ];
      const signals = getRowMatchedSignals(rows[2], rows);
      expect(signals).not.toContain('ip');
    },
  );
});

// ---------------------------------------------------------------------------
// getRowMatchedSignals — email matching
// ---------------------------------------------------------------------------

describe('getRowMatchedSignals — email normalisation', () => {
  it('matches plus-alias emails as the same normalised email', () => {
    const rows: LinkerOrderInput[] = [
      { order_id: 'X', email: 'james.harrison+orders@gmail.com', phone: null, postcode: null, ip: null },
      { order_id: 'Y', email: 'jamesharrison@gmail.com', phone: null, postcode: null, ip: null },
    ];
    const signals = getRowMatchedSignals(rows[0], rows);
    expect(signals).toContain('email');
  });

  it('does not include email when row email is blank', () => {
    const rows: LinkerOrderInput[] = [
      { order_id: 'X', email: '', phone: '447700000001', postcode: 'SW1A1AA', ip: null },
      { order_id: 'Y', email: 'someone@example.com', phone: '447700000001', postcode: 'SW1A1AA', ip: null },
    ];
    const signals = getRowMatchedSignals(rows[0], rows);
    expect(signals).not.toContain('email');
  });
});

// ---------------------------------------------------------------------------
// getRowMatchedSignals — no spurious cross-signal contamination
// ---------------------------------------------------------------------------

describe('getRowMatchedSignals — signal isolation', () => {
  it('does not include ip just because another row in the cluster has an ip', () => {
    const rows: LinkerOrderInput[] = [
      { order_id: 'P', phone: '447700000001', postcode: 'SW1A1AA', ip: '1.2.3.4', email: 'p@example.com' },
      { order_id: 'Q', phone: '447700000001', postcode: 'SW1A1AA', ip: '5.6.7.8', email: 'q@example.com' },
      { order_id: 'R', phone: '447700000001', postcode: 'SW1A1AA', ip: null,      email: 'r@example.com' },
    ];
    // P and Q each have a unique IP — no IP match for either
    const signalsP = getRowMatchedSignals(rows[0], rows);
    const signalsQ = getRowMatchedSignals(rows[1], rows);
    const signalsR = getRowMatchedSignals(rows[2], rows);

    expect(signalsP).not.toContain('ip');
    expect(signalsQ).not.toContain('ip');
    expect(signalsR).not.toContain('ip');

    // All three still match on phone and postcode
    expect(signalsP).toContain('phone');
    expect(signalsP).toContain('postcode');
  });
});
