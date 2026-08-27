import type { ReportRange } from '@/lib/reporting/intelligence';
import { formatDateAbsolute } from '@/lib/utils/format';

export type OverviewReferenceRange = Exclude<ReportRange, 'all'>;

export type OverviewReferenceDay = {
  key: string;
  date: Date;
  identifiedMinor: number;
  preventedMinor: number;
  recoveredMinor: number;
  realisedMinor: number;
  openMinor: number;
};

export type OverviewReferenceCause = {
  name: string;
  valueMinor: number;
  share: string;
  confirmedWidth: number;
  recoverableWidth: number;
  trend: string;
  trendTone: 'positive' | 'negative';
};

export type OverviewReferenceAttention = {
  label: string;
  meta: string;
  valueMinor: number;
  status: string;
  tone: 'red' | 'amber' | 'blue' | 'grey';
};

export type OverviewReferenceSource = {
  name: string;
  coverage: number;
  freshness: string;
  records: string;
  state: 'current' | 'stale' | 'partial' | 'manual';
};

export type OverviewReferenceCase = {
  id: string;
  customer: string;
  initials: string;
  reason: string;
  tone: 'red' | 'amber' | 'blue' | 'grey';
  exposureMinor: number;
  evidence: number;
  sla: string;
  slaTone: 'red' | 'amber' | 'neutral';
  owner: string;
};

export type OverviewReferenceSnapshot = {
  range: OverviewReferenceRange;
  current: OverviewReferenceDay[];
  previous: OverviewReferenceDay[];
  totals: Omit<OverviewReferenceDay, 'key' | 'date'>;
  previousTotals: Omit<OverviewReferenceDay, 'key' | 'date'>;
  causes: OverviewReferenceCause[];
  attention: OverviewReferenceAttention[];
  attentionTotalMinor: number;
  sources: OverviewReferenceSource[];
  cases: OverviewReferenceCase[];
  rangeLabel: string;
};

const DAY_MS = 86_400_000;
const REFERENCE_END = Date.UTC(2026, 7, 13);

function toMinor(value: number): number {
  return value * 100;
}

function generateSeries(): OverviewReferenceDay[] {
  let seed = 20260813 >>> 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const output: OverviewReferenceDay[] = [];
  for (let index = 199; index >= 0; index -= 1) {
    const timestamp = REFERENCE_END - index * DAY_MS;
    const date = new Date(timestamp);
    const weekday = date.getUTCDay();
    const season = 1 + 0.18 * Math.sin(index / 9) + ((weekday === 0 || weekday === 6) ? -0.3 : 0.07);
    const identified = Math.round((7200 * season + random() * 2800) / 5) * 5;
    const prevented = Math.round(identified * (0.20 + random() * 0.09));
    const recovered = Math.round(identified * (0.11 + random() * 0.08));
    const realised = Math.round(identified * (0.21 + random() * 0.11));
    output.push({
      key: date.toISOString().slice(0, 10),
      date,
      identifiedMinor: toMinor(identified),
      preventedMinor: toMinor(prevented),
      recoveredMinor: toMinor(recovered),
      realisedMinor: toMinor(realised),
      openMinor: toMinor(identified - prevented - recovered - realised),
    });
  }
  return output;
}

function sumDays(rows: OverviewReferenceDay[]) {
  return rows.reduce((total, row) => ({
    identifiedMinor: total.identifiedMinor + row.identifiedMinor,
    preventedMinor: total.preventedMinor + row.preventedMinor,
    recoveredMinor: total.recoveredMinor + row.recoveredMinor,
    realisedMinor: total.realisedMinor + row.realisedMinor,
    openMinor: total.openMinor + row.openMinor,
  }), {
    identifiedMinor: 0,
    preventedMinor: 0,
    recoveredMinor: 0,
    realisedMinor: 0,
    openMinor: 0,
  });
}

const ALL_DAYS = generateSeries();

const ATTENTION: OverviewReferenceAttention[] = [
  { label: 'Delivery disputes past SLA', meta: '14 items · oldest 3d 4h · 6 unassigned', valueMinor: toMinor(22940), status: 'Breached', tone: 'red' },
  { label: 'Recovery deadline inside 48h — ShipBob', meta: '6 claims · earliest tomorrow 09:00', valueMinor: toMinor(18300), status: 'Urgent', tone: 'amber' },
  { label: 'Evidence gap: carrier photo missing', meta: '9 cases · blocked on Royal Mail', valueMinor: toMinor(11205), status: 'Blocked', tone: 'amber' },
  { label: 'High-value cases awaiting decision', meta: '4 cases · above £1,000 approval limit', valueMinor: toMinor(7230), status: 'Review', tone: 'blue' },
  { label: 'Unmatched refunds in reconciliation', meta: '21 records · Stripe vs ledger', valueMinor: toMinor(6410), status: 'Exception', tone: 'grey' },
];

const SOURCES: OverviewReferenceSource[] = [
  { name: 'Shopify — orders, refunds', coverage: 100, freshness: '2 min', records: '18,412', state: 'current' },
  { name: 'Gorgias — tickets', coverage: 100, freshness: '6 min', records: '5,208', state: 'current' },
  { name: 'Stripe — payments, disputes', coverage: 100, freshness: '4 min', records: '9,120', state: 'current' },
  { name: 'ShipBob — fulfilment', coverage: 82, freshness: '19 hrs', records: '3,764', state: 'stale' },
  { name: 'Royal Mail — tracking', coverage: 76, freshness: '41 min', records: '2,905', state: 'partial' },
  { name: 'CSV import — returns', coverage: 54, freshness: '3 days', records: '612', state: 'manual' },
];

const CASES: OverviewReferenceCase[] = [
  { id: 'CASE-4821', customer: 'Lawrence Okafor', initials: 'LO', reason: 'Not received', tone: 'red', exposureMinor: toMinor(1412), evidence: 5, sla: 'Breached 4h', slaTone: 'red', owner: 'RC' },
  { id: 'CASE-4809', customer: 'Mariam Iqbal', initials: 'MI', reason: 'Damaged', tone: 'amber', exposureMinor: toMinor(1128), evidence: 5, sla: 'Due 3h', slaTone: 'amber', owner: 'JP' },
  { id: 'CASE-4796', customer: 'Priya Raghunathan', initials: 'PR', reason: 'Chargeback', tone: 'red', exposureMinor: toMinor(986), evidence: 4, sla: 'Due 9h', slaTone: 'amber', owner: 'RC' },
  { id: 'CASE-4788', customer: 'Tomas Wieczorek', initials: 'TW', reason: 'Return missing', tone: 'blue', exposureMinor: toMinor(742), evidence: 5, sla: 'Due 1d', slaTone: 'neutral', owner: 'AL' },
  { id: 'CASE-4771', customer: 'Grace Adeyemi', initials: 'GA', reason: 'Wrong item', tone: 'grey', exposureMinor: toMinor(508), evidence: 3, sla: 'Due 2d', slaTone: 'neutral', owner: 'JP' },
  { id: 'CASE-4765', customer: 'Callum Beattie', initials: 'CB', reason: 'Not received', tone: 'red', exposureMinor: toMinor(431), evidence: 5, sla: 'Due 2d', slaTone: 'neutral', owner: 'RC' },
];

export function buildOverviewReferenceSnapshot(inputRange: ReportRange): OverviewReferenceSnapshot {
  const range: OverviewReferenceRange = inputRange === 'all' ? '30d' : inputRange;
  const count = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const current = ALL_DAYS.slice(-count);
  const previous = ALL_DAYS.slice(-2 * count, -count);
  const totals = sumDays(current);
  const previousTotals = sumDays(previous);
  const causeShares = [0.34, 0.21, 0.17, 0.13, 0.09];
  const causeNames = ['Delivery not received', 'Damaged in transit', 'Chargeback — fraud', 'Return never arrived', 'Wrong item shipped', 'Carrier loss in transit'];
  const recoverableShares = [0.28, 0.44, 0.06, 0.19, 0.12, 0.38];
  const trends = ['+12.4%', '−4.1%', '+31.0%', '+2.2%', '−9.6%', '−18.3%'];
  let allocated = 0;
  const causeValues = causeShares.map((share) => {
    const value = Math.round((totals.realisedMinor / 100) * share) * 100;
    allocated += value;
    return value;
  });
  causeValues.push(totals.realisedMinor - allocated);
  const maximumCause = Math.max(...causeValues);
  const causes = causeValues.map((valueMinor, index) => {
    const fullWidth = valueMinor / maximumCause * 100;
    const recoverableWidth = valueMinor * recoverableShares[index] / maximumCause * 100;
    return {
      name: causeNames[index],
      valueMinor,
      share: (valueMinor / totals.realisedMinor * 100).toFixed(1) + '%',
      confirmedWidth: Math.max(0, fullWidth - recoverableWidth),
      recoverableWidth,
      trend: trends[index],
      trendTone: trends[index].startsWith('+') ? 'negative' : 'positive',
    } satisfies OverviewReferenceCause;
  });
  return {
    range,
    current,
    previous,
    totals,
    previousTotals,
    causes,
    attention: ATTENTION,
    attentionTotalMinor: ATTENTION.reduce((total, item) => total + item.valueMinor, 0),
    sources: SOURCES,
    cases: CASES,
    rangeLabel: `${formatDateAbsolute(current[0].date)} – ${formatDateAbsolute(current[current.length - 1].date)}`,
  };
}
