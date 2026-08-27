import { normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { formatCurrencyNullable } from '@/lib/utils/format';

export function evidencePackageOrderAmount(input: {
  amount: number | null;
  currency: string | null;
}): string {
  if (input.amount == null || !Number.isFinite(input.amount)) {
    return 'Amount unavailable — source amount missing';
  }
  const currency = normaliseCurrencyOrNull(input.currency);
  if (!currency) return 'Amount unavailable — currency missing';
  return formatCurrencyNullable(input.amount, currency);
}
