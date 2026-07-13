import { formatCurrency, formatCurrencyCompact, formatCurrencyNullable } from '@/lib/utils/format';

describe('formatCurrencyNullable', () => {
  it('returns an em dash for null values', () => {
    expect(formatCurrencyNullable(null)).toBe('—');
  });

  it('formats non-null currency values with the requested currency', () => {
    expect(formatCurrencyNullable(123.45, 'GBP')).toBe('£123.45');
  });

  // WS0.1: the merchant display locale is en-GB, which prefixes non-GBP
  // currencies (USD -> "US$"). GBP still renders "£". This is intentional.
  it('defaults to USD (en-GB renders US$)', () => {
    expect(formatCurrencyNullable(1234)).toBe('US$1,234.00');
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
