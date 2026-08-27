import type { RecoveryCase, RecoveryCaseStatus } from '@/lib/recoveries/types';

export type RecoveryFinancialEntry = {
  recovery_case_id: string | null;
  state: 'recoverable' | 'recovered' | 'written_off';
  amount_minor: number;
  currency: string;
  effective_at: string;
};

export type RecoveryStageKey = 'eligible' | 'submitted' | 'approved' | 'recovered' | 'outstanding';

export type RecoveryStageTotal = {
  key: RecoveryStageKey;
  label: string;
  valueMinor: number;
  supportingCount: number;
  boardStage: 'financial-eligible' | 'financial-submitted' | 'financial-approved' | 'financial-recovered' | 'financial-outstanding';
};

export type RecoveryIntervalPoint = {
  key: string;
  label: string;
  from: string;
  to: string;
  newRecoverableMinor: number;
  receivedMinor: number;
  writtenOffMinor: number;
  outstandingMinor: number;
  supportingCount: number;
};

export type RecoveryCommandModel = {
  currency: string;
  stages: RecoveryStageTotal[];
  intervals: RecoveryIntervalPoint[];
  recoveredMinor: number;
  eligibleMinor: number;
  conversionRate: number | null;
};

const SUBMITTED_STATUSES = new Set<RecoveryCaseStatus>([
  'submitted',
  'waiting_response',
  'chase_due',
  'approved',
  'partially_approved',
  'rejected',
  'appealed',
  'paid',
]);

function startOfIsoWeek(value: string): Date | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const day = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
}

/** Canonical Monday-start bucket key used by financial addition charts. */
export function financialWeekStart(value: string): string | null {
  return startOfIsoWeek(value)?.toISOString().slice(0, 10) ?? null;
}

function formatWeek(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Builds R3's recovery command model from canonical integer-minor-unit rows.
 * Stage totals are independent positions on one scale; they are not a funnel.
 * Interval values come only from append-only financial entries.
 */
export function buildRecoveryCommandModel(input: {
  recoveries: RecoveryCase[];
  entries: RecoveryFinancialEntry[];
  currency: string;
}): RecoveryCommandModel {
  const currency = input.currency.toUpperCase();
  const recoveries = input.recoveries.filter((row) => row.currency.toUpperCase() === currency);
  const entries = input.entries
    .filter((row) => row.currency.toUpperCase() === currency)
    .filter((row) => Number.isInteger(row.amount_minor) && row.amount_minor >= 0)
    .slice()
    .sort((left, right) => left.effective_at.localeCompare(right.effective_at));

  const eligibleMinor = recoveries.reduce((sum, row) => sum + Math.max(0, row.amount_sought_minor), 0);
  const submittedRows = recoveries.filter((row) => SUBMITTED_STATUSES.has(row.status));
  const approvedRows = recoveries.filter((row) => row.amount_approved_minor > 0);
  const recoveredRows = recoveries.filter((row) => row.amount_recovered_minor > 0);
  const outstandingRows = recoveries.filter((row) => (
    row.amount_sought_minor - row.amount_recovered_minor - row.amount_written_off_minor
  ) > 0);
  const recoveredMinor = recoveredRows.reduce((sum, row) => sum + row.amount_recovered_minor, 0);

  const stages: RecoveryStageTotal[] = [
    {
      key: 'eligible',
      label: 'Eligible / sought',
      valueMinor: eligibleMinor,
      supportingCount: recoveries.filter((row) => row.amount_sought_minor > 0).length,
      boardStage: 'financial-eligible',
    },
    {
      key: 'submitted',
      label: 'Submitted externally',
      valueMinor: submittedRows.reduce((sum, row) => sum + Math.max(0, row.amount_sought_minor), 0),
      supportingCount: submittedRows.length,
      boardStage: 'financial-submitted',
    },
    {
      key: 'approved',
      label: 'Approved by source',
      valueMinor: approvedRows.reduce((sum, row) => sum + row.amount_approved_minor, 0),
      supportingCount: approvedRows.length,
      boardStage: 'financial-approved',
    },
    {
      key: 'recovered',
      label: 'Received / credited',
      valueMinor: recoveredMinor,
      supportingCount: recoveredRows.length,
      boardStage: 'financial-recovered',
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      valueMinor: outstandingRows.reduce(
        (sum, row) => sum + Math.max(0, row.amount_sought_minor - row.amount_recovered_minor - row.amount_written_off_minor),
        0,
      ),
      supportingCount: outstandingRows.length,
      boardStage: 'financial-outstanding',
    },
  ];

  const buckets = new Map<string, {
    start: Date;
    newRecoverableMinor: number;
    receivedMinor: number;
    writtenOffMinor: number;
    supportingIds: Set<string>;
  }>();

  for (const entry of entries) {
    const start = startOfIsoWeek(entry.effective_at);
    if (!start) continue;
    const key = start.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? {
      start,
      newRecoverableMinor: 0,
      receivedMinor: 0,
      writtenOffMinor: 0,
      supportingIds: new Set<string>(),
    };
    if (entry.state === 'recoverable') {
      bucket.newRecoverableMinor += entry.amount_minor;
    } else if (entry.state === 'recovered') {
      bucket.receivedMinor += entry.amount_minor;
    } else {
      bucket.writtenOffMinor += entry.amount_minor;
    }
    if (entry.recovery_case_id) bucket.supportingIds.add(entry.recovery_case_id);
    buckets.set(key, bucket);
  }

  // Replay in order so each interval's outstanding value is a truthful
  // end-of-week balance rather than the final balance copied to every point.
  let runningOutstanding = 0;
  const intervals = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, bucket]) => {
      runningOutstanding = Math.max(
        0,
        runningOutstanding + bucket.newRecoverableMinor - bucket.receivedMinor - bucket.writtenOffMinor,
      );
      const end = new Date(bucket.start);
      end.setUTCDate(end.getUTCDate() + 7);
      return {
        key,
        label: `Week of ${formatWeek(bucket.start)}`,
        from: key,
        to: end.toISOString().slice(0, 10),
        newRecoverableMinor: bucket.newRecoverableMinor,
        receivedMinor: bucket.receivedMinor,
        writtenOffMinor: bucket.writtenOffMinor,
        outstandingMinor: runningOutstanding,
        supportingCount: bucket.supportingIds.size,
      };
    });

  return {
    currency,
    stages,
    intervals,
    recoveredMinor,
    eligibleMinor,
    conversionRate: eligibleMinor > 0 ? recoveredMinor / eligibleMinor : null,
  };
}

export type ReconciliationLifecycleRow = {
  created_at: string;
  resolved_at: string | null;
  status: string;
};

export type ReconciliationBacklogPoint = {
  key: string;
  label: string;
  opened: number;
  settled: number;
  backlog: number;
};

/** Reconstructs weekly unresolved backlog from immutable opened/settled dates. */
export function buildReconciliationBacklog(
  rows: ReconciliationLifecycleRow[],
): ReconciliationBacklogPoint[] {
  const events = new Map<string, { start: Date; opened: number; settled: number }>();
  for (const row of rows) {
    const openedAt = startOfIsoWeek(row.created_at);
    if (openedAt) {
      const key = openedAt.toISOString().slice(0, 10);
      const bucket = events.get(key) ?? { start: openedAt, opened: 0, settled: 0 };
      bucket.opened += 1;
      events.set(key, bucket);
    }
    const settledAt = row.resolved_at ? startOfIsoWeek(row.resolved_at) : null;
    if (settledAt) {
      const key = settledAt.toISOString().slice(0, 10);
      const bucket = events.get(key) ?? { start: settledAt, opened: 0, settled: 0 };
      bucket.settled += 1;
      events.set(key, bucket);
    }
  }

  const sorted = [...events.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (!sorted.length) return [];
  const start = new Date(`${sorted[0][0]}T00:00:00.000Z`);
  const end = new Date(`${sorted.at(-1)![0]}T00:00:00.000Z`);
  const points: ReconciliationBacklogPoint[] = [];
  let backlog = 0;
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const key = cursor.toISOString().slice(0, 10);
    const bucket = events.get(key);
    const opened = bucket?.opened ?? 0;
    const settled = bucket?.settled ?? 0;
    backlog = Math.max(0, backlog + opened - settled);
    points.push({ key, label: `Week of ${formatWeek(cursor)}`, opened, settled, backlog });
  }
  return points;
}
