import { label } from '@/lib/ui/labels';
import { dominantCurrency } from '@/lib/utils/format';

export const LOSS_QUERY_STATUSES = [
  'all',
  'confirmed',
  'estimated',
  'recoverable',
  'prevented',
  'written_off',
] as const;

export type LossQueryStatus = (typeof LOSS_QUERY_STATUSES)[number];
export type LossQuerySort = 'updated_desc' | 'updated_asc' | 'loss_desc' | 'outstanding_desc';

type LossQueryRow = {
  id: string;
  category: string;
  attribution: string | null;
  counterpartyType: string | null;
  counterpartyName: string | null;
  status: string;
  recoverability: string | null;
  financialState: string;
  preventionOnly: boolean;
  writtenOff: boolean;
  realisedLossMinor: number | null;
  estimatedLossMinor: number | null;
  netUnrecoveredMinor?: number | null;
  source: string | null;
  updatedAt?: string | null;
  supportPayoutCaseId: string | null;
};

export type LossMinorSummary = {
  totalMinor: number | null;
  currency: string | null;
  mixedCount: number;
  omittedCount: number;
  known: boolean;
};

export function summarizeLossMinor<T extends { currency: string | null; writtenOff: boolean }>(
  rows: T[],
  getValue: (row: T) => number | null | undefined,
  excludeWrittenOff = false,
): LossMinorSummary {
  const eligible = rows.filter((row) => !excludeWrittenOff || !row.writtenOff);
  const represented = eligible.filter((row) => {
    const value = getValue(row);
    return value != null && Number.isFinite(value) && Boolean(row.currency);
  });
  const omittedCount = eligible.length - represented.length;
  if (!represented.length) return { totalMinor: null, currency: null, mixedCount: 0, omittedCount, known: false };

  const currency = dominantCurrency(represented);
  let totalMinor = 0;
  let mixedCount = 0;
  for (const row of represented) {
    if (row.currency?.toUpperCase() !== currency) {
      mixedCount += 1;
      continue;
    }
    totalMinor += getValue(row) ?? 0;
  }
  return { totalMinor, currency, mixedCount, omittedCount, known: true };
}

function matchesStatus(row: LossQueryRow, status: LossQueryStatus) {
  if (status === 'all') return true;
  if (status === 'confirmed') return row.financialState === 'confirmed' && !row.writtenOff;
  if (status === 'estimated') return row.financialState === 'estimated' && !row.writtenOff;
  if (status === 'recoverable') return ['recoverable', 'eligible_to_chase'].includes(row.recoverability ?? '') && !row.writtenOff;
  if (status === 'prevented') return row.preventionOnly;
  return row.writtenOff;
}

function lossCauseKey(row: LossQueryRow) {
  return row.attribution ?? row.category ?? 'unattributed';
}

function amountFor(row: LossQueryRow, key: 'loss' | 'outstanding') {
  if (key === 'outstanding') return row.netUnrecoveredMinor ?? Number.NEGATIVE_INFINITY;
  return row.realisedLossMinor ?? row.estimatedLossMinor ?? Number.NEGATIVE_INFINITY;
}

export function filterAndSortLossRows<T extends LossQueryRow>(
  rows: T[],
  input: {
    cutoff: string | null;
    source: string | null;
    status: LossQueryStatus;
    search: string | null;
    sort: LossQuerySort;
    otherCauseKeys?: string[];
  },
): T[] {
  const search = input.search?.trim().toLowerCase() ?? '';
  const otherCauseKeys = new Set(input.otherCauseKeys ?? []);
  const filtered = rows.filter((row) => {
    if (input.cutoff && (!row.updatedAt || row.updatedAt < input.cutoff)) return false;
    if (input.source && (row.source ?? 'unavailable') !== input.source) return false;
    if (!matchesStatus(row, input.status)) return false;
    if (!search) return true;
    if (search === '__other') return otherCauseKeys.has(lossCauseKey(row));
    const searchable = [
      row.id,
      row.supportPayoutCaseId,
      lossCauseKey(row),
      label('lossCategory', row.category),
      row.attribution ? label('attribution', row.attribution) : null,
      row.counterpartyName,
      row.counterpartyType ? label('counterparty', row.counterpartyType) : null,
      row.status,
      row.source,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(search);
  });

  return filtered.toSorted((left, right) => {
    if (input.sort === 'loss_desc') return amountFor(right, 'loss') - amountFor(left, 'loss');
    if (input.sort === 'outstanding_desc') return amountFor(right, 'outstanding') - amountFor(left, 'outstanding');
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return input.sort === 'updated_asc' ? leftTime - rightTime : rightTime - leftTime;
  });
}
