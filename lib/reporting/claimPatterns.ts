import { normaliseCurrencyOrNull } from '@/lib/canonical/money';

export const PATTERN_DIMENSIONS = ['issue', 'carrier', 'sku', 'warehouse'] as const;
export type PatternDimension = typeof PATTERN_DIMENSIONS[number];
export type PatternMoney = { currency: string | null; confirmed: number | null; matched: number | null; net: number | null };
export type PatternCase = {
  id: string; orderId: string | null; submittedAt: string;
  groups: Record<PatternDimension, Array<{ key: string; label: string }>>;
  allocationEligible: Record<PatternDimension, boolean>;
  money: PatternMoney[];
  work: Array<{ id: string; title: string; status: string }>;
  evidenceHrefs: string[];
};
export type PatternReport = {
  from: string | null; to: string; readAt: string; timezone: string;
  state: 'complete' | 'partial' | 'unavailable' | 'capped';
  issues: string[]; cases: PatternCase[]; workAvailable: boolean;
};
export type PatternTotals = PatternMoney & { unvalued: number };
export type PatternGroup = {
  key: string; label: string; caseIds: string[]; orderCount: number;
  share: number | null; recurring: boolean; amounts: PatternTotals[];
};
export const UNASSIGNED_LABELS: Record<PatternDimension, string> = {
  issue: 'Reported issue not established', carrier: 'Affected carrier not established',
  sku: 'Affected SKU not confirmed', warehouse: 'Warehouse not established',
};

/** Missing stages remain null; known subsets are accompanied by unvalued counts. */
export function patternTotals(cases: PatternCase[]): PatternTotals[] {
  const currencies = new Set(cases.flatMap(row => row.money.map(m => normaliseCurrencyOrNull(m.currency))));
  if (cases.some(row => !row.money.length)) currencies.add(null);
  return [...currencies].sort((a,b) => (a ?? '').localeCompare(b ?? '')).map(currency => {
    const values = cases.flatMap(row => row.money.filter(m => normaliseCurrencyOrNull(m.currency) === currency));
    const sum = (key: 'confirmed' | 'matched' | 'net') => {
      const known = values.map(m => m[key]).filter((v): v is number => v !== null && Number.isSafeInteger(v));
      const total = known.reduce((a,b) => a+b, 0);
      return known.length && Number.isSafeInteger(total) ? total : null;
    };
    return { currency, confirmed: sum('confirmed'), matched: sum('matched'), net: sum('net'),
      unvalued: cases.filter(row => !row.money.length && currency === null || row.money.some(m => normaliseCurrencyOrNull(m.currency) === currency && (m.confirmed === null || m.matched === null || m.net === null))).length };
  });
}

/** Counts can overlap. Money is allocated only for a single established group. */
export function groupClaimPatterns(report: PatternReport, dimension: PatternDimension) {
  const byKey = new Map<string, { label: string; cases: PatternCase[] }>();
  const unallocated: PatternCase[] = [];
  for (const row of report.cases) {
    const groups = [...new Map(row.groups[dimension].map(group => [group.key, group])).values()];
    if (groups.length !== 1 || !row.allocationEligible[dimension]) unallocated.push(row);
    const visible = groups.length ? groups : [{ key: '', label: UNASSIGNED_LABELS[dimension] }];
    for (const group of visible) {
      const entry = byKey.get(group.key) ?? { label: group.label, cases: [] };
      entry.cases.push(row); byKey.set(group.key, entry);
    }
  }
  const groups: PatternGroup[] = [...byKey].map(([key, value]) => {
    const orderCount = new Set(value.cases.map(row => row.orderId).filter(Boolean)).size;
    return { key, label: value.label, caseIds: value.cases.map(row => row.id), orderCount,
      share: report.state === 'complete' && report.cases.length ? value.cases.length / report.cases.length : null,
      recurring: Boolean(key) && value.cases.length >= 5 && orderCount >= 3,
      amounts: patternTotals(value.cases.filter(row => row.groups[dimension].length === 1 && row.allocationEligible[dimension] && Boolean(key))),
    };
  }).sort((a,b) => b.caseIds.length-a.caseIds.length || a.key.localeCompare(b.key));
  return { groups, concentrations: report.state === 'complete' ? groups.filter(group => group.recurring).slice(0,3) : [],
    totals: patternTotals(report.cases), unallocated: patternTotals(unallocated), unallocatedCount: unallocated.length,
    orderCount: new Set(report.cases.map(row => row.orderId).filter(Boolean)).size };
}

/** Exactly the selected group's rows, including unknown currency and unvalued cases. */
export function patternCaseRows(report: PatternReport, dimension: PatternDimension, key: string | null) {
  if (key === null) return report.cases;
  return report.cases.filter(row => key === '' ? !row.groups[dimension].length : row.groups[dimension].some(group => group.key === key));
}
