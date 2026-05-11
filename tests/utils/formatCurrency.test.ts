import { formatCurrencyNullable } from '@/lib/utils/formatCurrency';

describe('formatCurrencyNullable', () => {
  it('returns an em dash for null values', () => {
    expect(formatCurrencyNullable(null)).toBe('—');
  });

  it('formats non-null currency values', () => {
    expect(formatCurrencyNullable(123.45, 'GBP')).toBe('£123.45');
  });
});
