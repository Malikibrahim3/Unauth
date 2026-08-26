import {
  ANALYTICS_COMPARISONS,
  ANALYTICS_RANGE_KEYS,
  type AnalyticsRangeKey,
  type AnalyticsScope,
  type AnalyticsScopeInput,
} from '@/lib/analytics/contracts';

const DAY_MS = 86_400_000;
const MAX_RANGE_MS = 366 * DAY_MS;

function isSupportedTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function parseInstant(value: string, field: 'start' | 'end'): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`analytics_scope_invalid_${field}`);
  }
  return parsed;
}

function startForRange(end: Date, range: Exclude<AnalyticsRangeKey, 'custom'>): Date {
  const start = new Date(end);
  if (range === '12m') {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return start;
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  start.setTime(start.getTime() - days * DAY_MS);
  return start;
}

/**
 * Resolve URL-safe scope into one stable server read boundary. Call this once
 * and reuse the result for every domain request on a page.
 */
export function resolveAnalyticsScope(
  input: AnalyticsScopeInput,
  options?: { asOf?: Date },
): AnalyticsScope {
  const timezone = input.timezone.trim();
  if (!timezone || !isSupportedTimeZone(timezone)) {
    throw new Error('analytics_scope_invalid_timezone');
  }

  const range = input.range ?? '30d';
  if (!ANALYTICS_RANGE_KEYS.includes(range)) {
    throw new Error('analytics_scope_invalid_range');
  }

  const comparison = input.comparison ?? 'none';
  if (!ANALYTICS_COMPARISONS.includes(comparison)) {
    throw new Error('analytics_scope_invalid_comparison');
  }

  const asOf = options?.asOf ? new Date(options.asOf) : new Date();
  if (!Number.isFinite(asOf.getTime())) {
    throw new Error('analytics_scope_invalid_as_of');
  }

  let start: Date;
  let end: Date;
  if (range === 'custom') {
    if (!input.start || !input.end) {
      throw new Error('analytics_scope_custom_bounds_required');
    }
    start = parseInstant(input.start, 'start');
    end = parseInstant(input.end, 'end');
  } else {
    end = input.end ? parseInstant(input.end, 'end') : asOf;
    start = input.start ? parseInstant(input.start, 'start') : startForRange(end, range);
  }

  if (end.getTime() <= start.getTime()) {
    throw new Error('analytics_scope_invalid_bounds');
  }
  if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
    throw new Error('analytics_scope_range_too_large');
  }
  if (end.getTime() > asOf.getTime() + 1_000) {
    throw new Error('analytics_scope_future_end');
  }

  const rawCurrency = input.currency?.trim();
  const currency = rawCurrency ? rawCurrency.toUpperCase() : undefined;
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    throw new Error('analytics_scope_invalid_currency');
  }

  return {
    range,
    start: start.toISOString(),
    end: end.toISOString(),
    timezone,
    ...(currency ? { currency } : {}),
    comparison,
    asOf: asOf.toISOString(),
  };
}
