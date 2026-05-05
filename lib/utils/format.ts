export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
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
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };
  return map[tier];
}

export function riskTierBadge(tier: 'low' | 'medium' | 'high' | 'critical'): string {
  const map = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return map[tier];
}
