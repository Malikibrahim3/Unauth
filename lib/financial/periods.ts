export const FINANCIAL_TIMEZONE = 'Europe/London' as const;

export type FinancialScope = {
  from: string | null;
  to: string;
  timezone: typeof FINANCIAL_TIMEZONE;
  timeBasis: 'case_submitted_at';
  population: 'merchant_support_payout_cases';
  boundary: 'start_inclusive_end_exclusive';
  asOf: string;
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const londonParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: FINANCIAL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partsAt(instantMs: number): LocalParts {
  const values = Object.fromEntries(
    londonParts.formatToParts(new Date(instantMs))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return values as LocalParts;
}

/** Resolve a Europe/London wall-clock instant without hardcoding BST months. */
function londonWallClockToUtc(parts: LocalParts): Date {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = partsAt(guess);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const adjustment = target - observedAsUtc;
    guess += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(guess);
}

export function financialPeriodForInstant(value: Date = new Date()): string {
  const parts = partsAt(value.getTime());
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

export function financialPeriodBounds(period: string): { period: string; start: Date; end: Date } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    period,
    start: londonWallClockToUtc({ year, month, day: 1, hour: 0, minute: 0, second: 0 }),
    end: londonWallClockToUtc({ year: nextYear, month: nextMonth, day: 1, hour: 0, minute: 0, second: 0 }),
  };
}

export function isWithinFinancialScope(value: string | null | undefined, scope: Pick<FinancialScope, 'from' | 'to'>): boolean {
  if (!value) return false;
  const at = Date.parse(value);
  const from = scope.from == null ? Number.NEGATIVE_INFINITY : Date.parse(scope.from);
  const to = Date.parse(scope.to);
  return Number.isFinite(at) && Number.isFinite(to) && at >= from && at < to;
}

export function describeFinancialScope(scope: FinancialScope): string {
  const from = scope.from ?? 'all recorded history';
  return `${from} inclusive to ${scope.to} exclusive · ${scope.timezone} · case submitted · as of ${scope.asOf}`;
}
