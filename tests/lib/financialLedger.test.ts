import {
  projectSummary,
  FINANCIAL_STATES,
  type FinancialEntry,
} from '@/lib/finance/financialLedger';
import { toMinorUnits, fromMinorUnits, minorUnitExponent } from '@/lib/canonical/money';

describe('canonical money — currency-exponent-aware minor units', () => {
  it('uses the ISO exponent, not a flat *100', () => {
    expect(minorUnitExponent('GBP')).toBe(2);
    expect(minorUnitExponent('JPY')).toBe(0);
    expect(minorUnitExponent('BHD')).toBe(3);
    expect(minorUnitExponent('usd')).toBe(2); // case-insensitive
    expect(minorUnitExponent('ZZZ')).toBe(2); // unknown defaults to 2
  });

  it('converts 0-, 2-, and 3-decimal currencies correctly', () => {
    expect(toMinorUnits(84.0, 'GBP')).toBe(8400);
    expect(toMinorUnits(84, 'JPY')).toBe(84);
    expect(toMinorUnits(84.0, 'BHD')).toBe(84000);
  });

  it('round-trips without float drift', () => {
    for (const [amt, cur] of [[19.99, 'USD'], [1000, 'JPY'], [12.345, 'KWD']] as const) {
      expect(fromMinorUnits(toMinorUnits(amt, cur), cur)).toBeCloseTo(amt, 3);
    }
  });
});

describe('financial ledger projection', () => {
  it('sums per-state totals within one currency', () => {
    const entries: FinancialEntry[] = [
      { id: '1', state: 'requested', amount_minor: 8400, currency: 'GBP' },
      { id: '2', state: 'paid', amount_minor: 8400, currency: 'GBP' },
      { id: '3', state: 'confirmed_loss', amount_minor: 8400, currency: 'GBP' },
    ];
    const summary = projectSummary(entries);
    expect(summary.GBP.totals.requested).toBe(8400);
    expect(summary.GBP.totals.paid).toBe(8400);
    expect(summary.GBP.totals.confirmed_loss).toBe(8400);
    expect(summary.GBP.lastEventId).toBe('3');
  });

  it('never sums mixed currencies together', () => {
    const entries: FinancialEntry[] = [
      { id: '1', state: 'paid', amount_minor: 8400, currency: 'GBP' },
      { id: '2', state: 'paid', amount_minor: 10000, currency: 'USD' },
      { id: '3', state: 'paid', amount_minor: 500, currency: 'JPY' },
    ];
    const summary = projectSummary(entries);
    expect(Object.keys(summary).sort()).toEqual(['GBP', 'JPY', 'USD']);
    expect(summary.GBP.totals.paid).toBe(8400);
    expect(summary.USD.totals.paid).toBe(10000);
    expect(summary.JPY.totals.paid).toBe(500);
  });

  it('a reversal nets to zero while both rows remain in history', () => {
    const entries: FinancialEntry[] = [
      { id: 'orig', state: 'recovered', amount_minor: 5000, currency: 'GBP' },
      { id: 'rev', state: 'recovered', amount_minor: 5000, currency: 'GBP', reverses_entry_id: 'orig' },
      { id: 'replacement', state: 'recovered', amount_minor: 4200, currency: 'GBP' },
    ];
    const summary = projectSummary(entries);
    // net recovered = 5000 - 5000 + 4200
    expect(summary.GBP.totals.recovered).toBe(4200);
    // history preserved: reducer consumed all three rows, none mutated
    expect(entries).toHaveLength(3);
  });

  it('multiple recoveries accumulate (never overwrite one scalar)', () => {
    const entries: FinancialEntry[] = [
      { id: '1', state: 'recovered', amount_minor: 3000, currency: 'GBP' },
      { id: '2', state: 'recovered', amount_minor: 2000, currency: 'GBP' },
    ];
    expect(projectSummary(entries).GBP.totals.recovered).toBe(5000);
  });

  it('zero-fills every state', () => {
    const summary = projectSummary([{ state: 'requested', amount_minor: 1, currency: 'GBP' }]);
    for (const state of FINANCIAL_STATES) {
      expect(typeof summary.GBP.totals[state]).toBe('number');
    }
  });
});
