import { fromMinorUnits, normaliseCurrencyOrNull } from '@/lib/canonical/money';

const MERCHANT_DISPLAY_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const currencySymbolCache = new Map<string, string>();

function getCurrencyFormatter(currency: string | null | undefined): Intl.NumberFormat {
  const code = normaliseCurrencyOrNull(currency) ?? DEFAULT_CURRENCY;
  const cached = currencyFormatterCache.get(code);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(MERCHANT_DISPLAY_LOCALE, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
    });
  } catch {
    formatter = getCurrencyFormatter(DEFAULT_CURRENCY);
  }
  currencyFormatterCache.set(code, formatter);
  return formatter;
}

/** Symbol for a currency code (e.g. 'GBP' → '£'). Cached; falls back to '$'. */
export function currencySymbolFor(currency: string): string {
  return getCurrencySymbol(currency);
}

function getCurrencySymbol(currency: string | null | undefined): string {
  const code = normaliseCurrencyOrNull(currency) ?? DEFAULT_CURRENCY;
  const cached = currencySymbolCache.get(code);
  if (cached) return cached;
  const symbol =
    getCurrencyFormatter(code)
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? '$';
  currencySymbolCache.set(code, symbol);
  return symbol;
}

/**
 * Pick a display currency for an aggregate of rows: the most common non-null
 * currency code among them, falling back to `fallback` (default USD).
 */
export function dominantCurrency(
  rows: Array<{ currency?: string | null }>,
  fallback = DEFAULT_CURRENCY,
): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.currency) continue;
    const code = row.currency.toUpperCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  return best ?? fallback;
}

/**
 * Sum a money field across rows without silently mixing currencies.
 * Rows in the dominant currency are summed; rows in any other currency are
 * excluded from `total` and counted in `mixedCount` so the UI can disclose
 * them ("+ N cases in other currencies") instead of showing a wrong number.
 * Rows with a null currency are treated as the dominant currency.
 */
export function sumSameCurrency<T>(
  rows: T[],
  getAmount: (row: T) => number | null | undefined,
  getCurrency: (row: T) => string | null | undefined,
  fallback = DEFAULT_CURRENCY,
): { total: number; currency: string; mixedCount: number } {
  const currency = dominantCurrency(
    rows.map((row) => ({ currency: getCurrency(row) })),
    fallback,
  );
  let total = 0;
  let mixedCount = 0;
  for (const row of rows) {
    const rowCurrency = getCurrency(row)?.toUpperCase() ?? currency;
    if (rowCurrency !== currency) {
      mixedCount += 1;
      continue;
    }
    total += getAmount(row) ?? 0;
  }
  return { total, currency, mixedCount };
}

const dateTimePartsFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

const dateTableFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const dateProseFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateShortFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatRiskScore(score: number | null | undefined): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return Math.round(score).toString();
}

/** Merchant UI: US locale, honouring the record's currency code (default USD). */
export function formatCurrency(amount: number, currency: string | null | undefined = DEFAULT_CURRENCY): string {
  return getCurrencyFormatter(currency).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const symbol = getCurrencySymbol(currency);

  if (abs >= 1_000_000_000) return `${sign}${symbol}${Math.round(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${Math.round(abs / 1_000)}k`;
  if (abs >= 100) return `${sign}${symbol}${Math.round(abs)}`;
  return `${sign}${symbol}${abs.toFixed(abs >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}`;
}

/** Null-safe currency formatter — returns '—' for null/undefined values. */
export function formatCurrencyNullable(
  amount: number | string | null | undefined,
  currency: string | null | undefined = DEFAULT_CURRENCY,
): string {
  if (amount == null) return '—';
  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) || 0 : amount;
  return formatCurrency(numericAmount, currency);
}

/** Format integer minor units without assuming a two-decimal currency. */
export function formatMinorCurrencyNullable(
  minor: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  const currencyCode = normaliseCurrencyOrNull(currency);
  if (minor == null || !currencyCode) return '—';
  const numericMinor = typeof minor === 'string' ? Number.parseInt(minor, 10) : minor;
  if (!Number.isFinite(numericMinor)) return '—';
  return formatCurrency(fromMinorUnits(numericMinor, currencyCode), currencyCode);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = dateTimePartsFormatter.formatToParts(d);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.day} ${lookup.month} ${lookup.year}, ${lookup.hour}:${lookup.minute}`;
}

export function formatDateMode(
  date: Date | string,
  mode: 'table' | 'prose' | 'recent' | 'timestamp' = 'timestamp',
  now: Date | number = Date.now(),
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);

  if (mode === 'table') {
    return dateTableFormatter.format(d);
  }

  if (mode === 'prose') {
    return dateProseFormatter.format(d);
  }

  if (mode === 'recent') {
    const nowMs = now instanceof Date ? now.getTime() : now;
    const diffMs = nowMs - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'just now';
  }

  return formatDate(d);
}

/** Short date format — day, month, year only. No time. */
export function formatDateShort(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateShortFormatter.format(d);
  } catch {
    return String(date);
  }
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatScore(score: number, tier?: string): string {
  const base = `${Math.round(score)} / 100`;
  if (!tier) return base;
  const tierLabel: Record<string, string> = {
    low: 'Low risk',
    medium: 'Medium risk',
    high: 'High risk',
    critical: 'Critical risk',
  };
  return `${base} — ${tierLabel[tier] ?? tier}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay > 0) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  if (diffHr > 0) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  return 'just now';
}

export function riskTierColour(tier: 'low' | 'medium' | 'high' | 'critical'): string {
  const map = {
    low: 'text-[var(--risk-low)] bg-[var(--risk-low-bg)] border-[var(--risk-low-bd)]',
    medium: 'text-[var(--risk-medium)] bg-[var(--risk-medium-bg)] border-[var(--risk-medium-bd)]',
    high: 'text-[var(--risk-high)] bg-[var(--risk-high-bg)] border-[var(--risk-high-bd)]',
    critical: 'text-[var(--risk-critical)] bg-[var(--risk-critical-bg)] border-[var(--risk-critical-bd)]',
  };
  return map[tier];
}

export function riskTierBadge(tier: 'low' | 'medium' | 'high' | 'critical'): string {
  const map = {
    low: 'bg-[var(--risk-low-bg)] text-[var(--risk-low)]',
    medium: 'bg-[var(--risk-medium-bg)] text-[var(--risk-medium)]',
    high: 'bg-[var(--risk-high-bg)] text-[var(--risk-high)]',
    critical: 'bg-[var(--risk-critical-bg)] text-[var(--risk-critical)]',
  };
  return map[tier];
}
