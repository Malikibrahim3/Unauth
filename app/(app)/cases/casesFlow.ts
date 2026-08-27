import { isFinalClaimStatus } from '@/lib/claims/sla';
import { formatDayMonthInTimeZone } from '@/lib/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;
const SLA_MS = 7 * DAY_MS;

export type CasesFlowSnapshot = {
  opened30d: number;
  closed30d: number;
  netChange: number;
  medianOpenAgeDays: number | null;
  medianTimeToCloseDays: number | null;
  closedWithinSlaPercent: number | null;
  daily: Array<{
    date: string;
    label: string;
    opened: number;
    closed: number;
    backlog: number;
  }>;
};

type FlowClaim = {
  id: string;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type FlowClosure = {
  claim_id: string;
  updated_at: string | null;
};

function validTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function utcDayStart(time: number): number {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function buildCasesFlowSnapshot(
  claims: FlowClaim[],
  closures: FlowClosure[],
  now = new Date(),
): CasesFlowSnapshot {
  const nowMs = now.getTime();
  const todayStart = utcDayStart(nowMs);
  const windowStart = todayStart - 29 * DAY_MS;
  const windowEnd = todayStart + DAY_MS;
  const closureByClaimId = new Map<string, number>();

  for (const closure of closures) {
    const closedAt = validTime(closure.updated_at);
    if (closedAt === null) continue;
    const current = closureByClaimId.get(closure.claim_id);
    if (current === undefined || closedAt > current) closureByClaimId.set(closure.claim_id, closedAt);
  }

  const opened = claims.flatMap((claim) => {
    const openedAt = validTime(claim.submitted_at ?? claim.created_at);
    return openedAt === null ? [] : [{ claim, openedAt, closedAt: closureByClaimId.get(claim.id) ?? null }];
  });
  const closeDurations = opened.flatMap(({ openedAt, closedAt }) =>
    closedAt !== null && closedAt >= openedAt ? [closedAt - openedAt] : [],
  );
  const activeAges = opened.flatMap(({ claim, openedAt }) =>
    !isFinalClaimStatus(claim.status) ? [Math.max(0, nowMs - openedAt)] : [],
  );
  const daily = Array.from({ length: 30 }, (_, index) => {
    const dayStart = windowStart + index * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    return {
      date: new Date(dayStart).toISOString().slice(0, 10),
      label: formatDayMonthInTimeZone(new Date(dayStart), 'UTC'),
      opened: opened.filter((row) => row.openedAt >= dayStart && row.openedAt < dayEnd).length,
      closed: opened.filter((row) => row.closedAt !== null && row.closedAt >= dayStart && row.closedAt < dayEnd).length,
      backlog: opened.filter((row) => row.openedAt < dayEnd && (row.closedAt === null || row.closedAt >= dayEnd)).length,
    };
  });
  const medianOpenAge = median(activeAges);
  const medianClose = median(closeDurations);

  return {
    opened30d: opened.filter((row) => row.openedAt >= windowStart && row.openedAt < windowEnd).length,
    closed30d: opened.filter((row) => row.closedAt !== null && row.closedAt >= windowStart && row.closedAt < windowEnd).length,
    netChange: daily.reduce((sum, day) => sum + day.opened - day.closed, 0),
    medianOpenAgeDays: medianOpenAge === null ? null : medianOpenAge / DAY_MS,
    medianTimeToCloseDays: medianClose === null ? null : medianClose / DAY_MS,
    closedWithinSlaPercent: closeDurations.length === 0
      ? null
      : Math.round((closeDurations.filter((duration) => duration <= SLA_MS).length / closeDurations.length) * 100),
    daily,
  };
}
