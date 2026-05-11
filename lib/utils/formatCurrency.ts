export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyNullable(amount: number | null | undefined, currency = 'GBP'): string {
  if (amount == null) return '—';
  return formatCurrency(amount, currency);
}
