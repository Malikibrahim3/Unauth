type AuditRow = {
  cluster_id: string | null;
  order_value: number | string | null;
  fraud_flags: unknown;
  behavioural_flags: unknown;
  signals_matched: unknown;
  context_flags: unknown;
};

export interface AuditResultsSummary {
  repeatIdentityClusters: number;
  refundPatternOrders: number;
  inrFlaggedAccounts: number;
  estimatedExposure: number;
}

function flattenTokens(value: unknown, bag: string[]) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const entry of value) flattenTokens(entry, bag);
    return;
  }

  if (typeof value === 'string') {
    bag.push(value.toLowerCase());
    return;
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      bag.push(key.toLowerCase());
      flattenTokens(nested, bag);
    }
  }
}

function hasAnyToken(row: AuditRow, patterns: RegExp[]): boolean {
  const bag: string[] = [];
  flattenTokens(row.fraud_flags, bag);
  flattenTokens(row.behavioural_flags, bag);
  flattenTokens(row.signals_matched, bag);
  flattenTokens(row.context_flags, bag);
  const haystack = bag.join(' ');
  return patterns.some((pattern) => pattern.test(haystack));
}

function toNumber(value: number | string | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function summarizeAuditResults(rows: AuditRow[]): AuditResultsSummary {
  const repeatIdentityClusters = new Set(
    rows
      .map((row) => row.cluster_id)
      .filter((clusterId): clusterId is string => Boolean(clusterId))
  ).size;

  const refundPatterns = [/refund/, /chargeback/, /friendly[_\s-]?fraud/];
  const inrPatterns = [/\binr\b/, /item[_\s-]?not[_\s-]?received/, /delivery/];

  let refundPatternOrders = 0;
  let inrFlaggedAccounts = 0;
  let estimatedExposure = 0;

  for (const row of rows) {
    const value = toNumber(row.order_value);
    estimatedExposure += value;

    if (hasAnyToken(row, refundPatterns)) {
      refundPatternOrders += 1;
    }

    if (hasAnyToken(row, inrPatterns)) {
      inrFlaggedAccounts += 1;
    }
  }

  return {
    repeatIdentityClusters,
    refundPatternOrders,
    inrFlaggedAccounts,
    estimatedExposure,
  };
}
