/**
 * Shared compact number and currency formatters for charts and KPI cards.
 * Use compact forms in chart axes/labels; full forms in tooltips and detail views.
 */

import { currencySymbolFor } from '@/lib/utils/format';

/** $53,652 → "$53.7k" / $139,000 → "$139k" / $520 → "$520". Honours the currency code's symbol. */
export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const symbol = currencySymbolFor(currency);
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  if (abs >= 100) return `${sign}${symbol}${Math.round(abs)}`;
  return `${sign}${symbol}${abs.toFixed(abs >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}`;
}

/** 31,700 → "31.7k" / 1,200,000 → "1.2M" / 850 → "850" */
export function formatCountCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Axis label: show compact value */
export function axisLabelFormatter(value: number): string {
  return formatCountCompact(value);
}

/** Axis label for currency axes */
export function currencyAxisFormatter(value: number, currency = 'USD'): string {
  return formatCurrencyCompact(value, currency);
}

/** Percentage, 0-100 input: "47.2%" */
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
