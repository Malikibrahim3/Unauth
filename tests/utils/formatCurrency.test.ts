import { formatCurrency, formatCurrencyCompact, formatCurrencyNullable } from '@/lib/utils/format';

describe('formatCurrencyNullable', () => {
  it('returns an em dash for null values', () => {
    expect(formatCurrencyNullable(null)).toBe('—');
  });

  it('formats non-null currency values as USD', () => {
    expect(formatCurrencyNullable(123.45, 'GBP')).toBe('$123.45');
  });

  it('defaults to USD', () => {
    expect(formatCurrencyNullable(1234)).toBe('$1,234.00');
  });
});

describe('formatCurrency', () => {
  it('formats USD with en-US locale', () => {
    expect(formatCurrency(1234, 'USD')).toBe('$1,234.00');
  });
});

describe('formatCurrencyCompact', () => {
  it('renders compact USD', () => {
    expect(formatCurrencyCompact(4000, 'USD')).toBe('$4k');
  });
});
