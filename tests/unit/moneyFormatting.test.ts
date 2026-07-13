import {
  formatCurrency,
  formatMinorCurrencyNullable,
} from '@/lib/utils/format';
import {
  isSupportedCurrency,
  normaliseCurrencyOrNull,
} from '@/lib/canonical/money';

describe('canonical money presentation', () => {
  it('normalises valid ISO currencies and rejects source sentinel values', () => {
    expect(normaliseCurrencyOrNull(' gbp ')).toBe('GBP');
    expect(isSupportedCurrency('USD')).toBe(true);
    expect(normaliseCurrencyOrNull('UNKNOWN')).toBeNull();
    expect(normaliseCurrencyOrNull('XXX')).toBeNull();
    expect(normaliseCurrencyOrNull(null)).toBeNull();
  });

  it('never throws when an invalid source currency reaches a general formatter', () => {
    expect(() => formatCurrency(10, 'UNKNOWN')).not.toThrow();
    expect(formatCurrency(10, 'UNKNOWN')).toContain('10.00');
  });

  it('formats minor units using the currency exponent', () => {
    expect(formatMinorCurrencyNullable(1234, 'GBP')).toContain('12.34');
    expect(formatMinorCurrencyNullable(1234, 'JPY')).toContain('1,234');
    expect(formatMinorCurrencyNullable(1234, 'UNKNOWN')).toBe('—');
  });
});
