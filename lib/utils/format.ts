import { fromMinorUnits, minorUnitExponent, normaliseCurrencyOrNull } from '@/lib/canonical/money';
import { reportDataQuality } from '@/lib/observability/dataQuality';
import { nowMs as clockNowMs } from '@/lib/time/clock';

// Merchant-facing forms accept major-unit values (for example, £55.00). Keep
// the conversion helpers available from the established formatting module so
// callers do not reach into the storage-level money implementation.
export {
  formatMajorUnitInput,
  parseMajorUnitInput,
} from '@/lib/ui/merchantCopy';

// Unambiguous day-month ordering for UK/EU merchants. Currency symbols are
// unaffected by the display locale — they follow the row's own currency code.
const MERCHANT_DISPLAY_LOCALE = 'en-GB';
// USD is retained ONLY as a last-resort aggregate fallback (see dominantCurrency).
// It must never be used to render a single row's money value — prefer a dash.
const DEFAULT_CURRENCY = 'USD';

const isDev = process.env.NODE_ENV !== 'production';

/** The single marker for "this value is not available", distinct from a known zero. */
export const UNAVAILABLE = '—';

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
  if (!best && isDev) {
    console.warn(
      `[format] dominantCurrency: no row carried a currency; falling back to ${fallback}. ` +
        'Aggregate totals may show the wrong symbol — ensure rows carry a currency code.',
    );
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

const dayMonthInTimeZoneFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** Compact chart/date label in the workspace timezone, with an optional weekday. */
export function formatDayMonthInTimeZone(
  value: Date | string,
  timeZone: string,
  weekday = false,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  const cacheKey = `${timeZone}:${weekday ? 'weekday' : 'date'}`;
  let formatter = dayMonthInTimeZoneFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
      ...(weekday ? { weekday: 'short' as const } : {}),
      day: 'numeric',
      month: 'short',
      timeZone,
    });
    dayMonthInTimeZoneFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(date);
}

// ── Canonical money renderers (WS0.1) ────────────────────────────────────────
// These are the ONLY money formatters new code should reach for. They take
// integer minor units and a currency code; they never guess a currency.
// Unlike getCurrencyFormatter, these honour each currency's natural precision
// (GBP/USD → 2 decimals, JPY → 0) rather than forcing two decimals.

const moneyFormatterCache = new Map<string, Intl.NumberFormat>();

function getMoneyFormatter(code: string): Intl.NumberFormat {
  const cached = moneyFormatterCache.get(code);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(MERCHANT_DISPLAY_LOCALE, {
    style: 'currency',
    currency: code,
  });
  moneyFormatterCache.set(code, formatter);
  return formatter;
}

/**
 * Format integer minor units in the given currency. Currency is REQUIRED — this
 * is the canonical single-value renderer. An unusable currency code is rendered
 * without a symbol (never a guessed one) so a wrong symbol can never appear.
 * "£214.50", "¥1,234"
 */
export function formatMoney(minor: number, currency: string): string {
  const code = normaliseCurrencyOrNull(currency);
  if (!code) {
    // Never invent a symbol for an unknown code, and never assume a 2-decimal
    // exponent — a zero-exponent currency (e.g. JPY) would render 100x too
    // large. minorUnitExponent looks up the ISO exponent independent of
    // whether Intl recognises the code for symbol display.
    if (!Number.isFinite(minor)) return '—';
    const exponent = minorUnitExponent(currency);
    return fromMinorUnits(minor, currency).toFixed(exponent);
  }
  return getMoneyFormatter(code).format(fromMinorUnits(minor, code));
}

/**
 * Null-safe canonical renderer: returns '—' when the amount OR the currency is
 * missing/invalid. Better a dash than the wrong symbol.
 */
export function formatMoneyOrDash(
  minor?: number | null,
  currency?: string | null,
): string {
  if (minor == null || !Number.isFinite(minor)) return '—';
  const code = normaliseCurrencyOrNull(currency);
  if (!code) return '—';
  return getMoneyFormatter(code).format(fromMinorUnits(minor, code));
}

const integerFormatter = new Intl.NumberFormat(MERCHANT_DISPLAY_LOCALE);

/**
 * Canonical count/number renderer — deterministic en-GB thousands separators
 * (no runtime-locale drift, no hydration mismatch). Use for every count, not
 * `.toLocaleString()`. Returns '—' for null/undefined/non-finite.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return integerFormatter.format(value);
}

export function formatRiskScore(score: number | null | undefined): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return Math.round(score).toString();
}

/**
 * RUN-09: a record's money value is rendered in the record's own currency or
 * not at all. Substituting a merchant or platform default is how GBP records
 * came to display as USD, so a missing or unrecognised code now yields the
 * unavailable marker and a monitored data-quality report instead of a
 * confidently wrong number.
 *
 * `formatCurrency` keeps a non-null return for the many callers that already
 * hold a real code; callers that may not should use `formatMoneyOrDash`.
 */
export function formatCurrency(amount: number, currency: string | null | undefined): string {
  const code = normaliseCurrencyOrNull(currency);
  if (!code) {
    reportDataQuality({
      kind: currency ? 'money.currency_unrecognised' : 'money.currency_missing',
      subject: currency ? String(currency) : 'null',
      detail: 'A money value was rendered without a usable currency code; showing the unavailable marker instead of a default currency.',
    });
    return UNAVAILABLE;
  }
  return getCurrencyFormatter(code).format(amount);
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

/**
 * §18.5 — donut/segment centre-total abbreviation rule. Below 240px wide, a
 * centre total abbreviates to 3 significant figures with a unit suffix
 * (`£244k`); above it, full precision. Applied identically wherever a chart
 * shows a big centred total (currently C2 and C7) so the same value at the
 * same width never renders two different ways.
 */
export function formatCentreTotal(minorUnits: number, currency: string | null | undefined, widthPx: number): string {
  if (!Number.isFinite(minorUnits)) return UNAVAILABLE;
  if (widthPx > 240) return formatMoney(minorUnits, currency ?? DEFAULT_CURRENCY);
  const code = normaliseCurrencyOrNull(currency);
  if (!code) return UNAVAILABLE;
  const symbol = currencySymbolFor(code);
  const major = fromMinorUnits(minorUnits, code);
  const sign = major < 0 ? '-' : '';
  const abs = Math.abs(major);
  const [scaled, suffix]: [number, string] =
    abs >= 1_000_000_000 ? [abs / 1_000_000_000, 'B']
    : abs >= 1_000_000 ? [abs / 1_000_000, 'M']
    : abs >= 1_000 ? [abs / 1_000, 'k']
    : [abs, ''];
  const threeSigFigs = scaled === 0 ? 0 : Number(scaled.toPrecision(3));
  return `${sign}${symbol}${threeSigFigs}${suffix}`;
}

/** Null-safe currency formatter — returns '—' for null/undefined values. */
export function formatCurrencyNullable(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount == null) return UNAVAILABLE;
  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(numericAmount)) return UNAVAILABLE;
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

// ── Canonical date renderers (WS0.1) ─────────────────────────────────────────
// §2.10: relative under 7 days, "14 Jun" same year, "14 Jun 2025" otherwise;
// timestamps ("14 Jun, 09:42") only in audit/timeline contexts. Never US order,
// never seconds, never ISO in the UI.

const dayMonthFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const dayMonthYearFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateTimeFormatter = new Intl.DateTimeFormat(MERCHANT_DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const MS_PER_DAY = 86_400_000;

function utcYear(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' }).format(d),
  );
}

/**
 * Smart list/inline date. Relative under 7 days ("just now" / "3h ago" / "2d
 * ago"); otherwise "14 Jun" in the current year and "14 Jun 2025" for other
 * years. No seconds, no time-of-day.
 */
export function formatDate(date: Date | string, now: Date | number = clockNowMs()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  const nowMs = now instanceof Date ? now.getTime() : now;
  const nowDate = new Date(nowMs);
  const diffMs = nowMs - d.getTime();

  if (diffMs >= 0 && diffMs < 7 * MS_PER_DAY) {
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay >= 1) return `${diffDay}d ago`;
    if (diffHr >= 1) return `${diffHr}h ago`;
    if (diffMin >= 1) return `${diffMin}m ago`;
    return 'just now';
  }

  return utcYear(d) === utcYear(nowDate)
    ? dayMonthFormatter.format(d)
    : dayMonthYearFormatter.format(d);
}

/** Absolute day-month-year, always with the year. Tables/exports. "14 Jun 2026" */
export function formatDateAbsolute(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  return dayMonthYearFormatter.format(d);
}

/** Timestamp for timelines/audit only. "14 Jun, 09:42" */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  const parts = dateTimeFormatter.formatToParts(d);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.day} ${lookup.month}, ${lookup.hour}:${lookup.minute}`;
}

export function formatDateMode(
  date: Date | string,
  mode: 'table' | 'prose' | 'recent' | 'timestamp' = 'timestamp',
  now: Date | number = clockNowMs(),
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

  return formatDateTime(d);
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

/**
 * Confidence arrives from older projections in both 0–1 and 0–100 scales.
 * Normalise at the display boundary so a valid 85 score can never render as
 * 8,500%, while a canonical 0.85 ratio continues to render as 85%.
 */
export function formatConfidencePercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const percentage = Math.abs(value) <= 1 ? value * 100 : value;
  const bounded = Math.min(100, Math.max(0, percentage));
  return `${bounded.toFixed(decimals)}%`;
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

export function formatRelativeTime(date: Date | string, now: Date | number = clockNowMs()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = (now instanceof Date ? now.getTime() : now) - d.getTime();
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
