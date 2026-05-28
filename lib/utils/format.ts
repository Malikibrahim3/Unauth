const CURRENCY_COMPACT_SYMBOL: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

function compactSymbol(currency: string): string {
  return CURRENCY_COMPACT_SYMBOL[currency.toUpperCase()] ?? '';
}

export function formatRiskScore(score: number | null | undefined): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return Math.round(score).toString();
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const code = currency.toUpperCase();
  const locale = code === 'GBP' ? 'en-GB' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency = 'USD'): string {
  const code = currency.toUpperCase();
  const sym = compactSymbol(code);
  if (!sym) {
    return formatCurrency(amount, code);
  }

  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) return `${sign}${sym}${Math.round(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${sym}${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${sym}${Math.round(abs / 1_000)}k`;
  if (abs >= 100) return `${sign}${sym}${Math.round(abs)}`;
  return `${sign}${sym}${abs.toFixed(abs >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}`;
}

/** Null-safe currency formatter — returns '—' for null/undefined values. */
export function formatCurrencyNullable(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—';
  return formatCurrency(amount, currency);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).formatToParts(d);

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
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/London',
    }).formatToParts(d);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
  }

  if (mode === 'prose') {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Europe/London',
    }).format(d);
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
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
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
