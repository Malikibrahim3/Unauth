import { formatCurrency, formatCurrencyCompact, formatCurrencyNullable } from '@/lib/utils/format';

describe('formatCurrencyNullable', () => {
  it('returns an em dash for null values', () => {
    expect(formatCurrencyNullable(null)).toBe('—');
  });

  it('formats non-null currency values with the requested currency', () => {
    expect(formatCurrencyNullable(123.45, 'GBP')).toBe('£123.45');
  });

  it('keeps a missing currency unavailable instead of guessing USD', () => {
    expect(formatCurrencyNullable(1234, null)).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('formats USD in the en-GB display locale', () => {
    expect(formatCurrency(1234, 'USD')).toBe('US$1,234.00');
  });
});

describe('formatCurrencyCompact', () => {
  it('renders compact USD', () => {
    expect(formatCurrencyCompact(4000, 'USD')).toBe('US$4k');
  });
});
