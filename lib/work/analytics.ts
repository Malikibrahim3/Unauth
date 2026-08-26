export type WorkLifecycleRecord = {
  id: string;
  kind: 'task' | 'exception';
  createdAt: string;
  closedAt: string | null;
};

export type WorkTimelinePoint = {
  day: string;
  label: string;
  opened: number;
  completed: number;
  backlog: number;
};

export type WorkTimeline = {
  state: 'ready' | 'empty' | 'unavailable';
  points: WorkTimelinePoint[];
  opened: number;
  completed: number;
  closingBacklog: number;
  unavailableReason?: string;
};

const DAY_MS = 86_400_000;

function utcDay(value: Date) {
  const day = new Date(value);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}
function validTime(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function workTimelineRange(asOf: Date, days = 14) {
  const end = utcDay(asOf);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days));
  return { start, end };
}

/**
 * Builds interval throughput and an end-of-day backlog step series from the
 * scoped lifecycle records. Unknown timestamps fail closed: they never become
 * a zero or a made-up event.
 */
export function buildWorkTimeline(
  records: WorkLifecycleRecord[],
  asOf: Date,
  days = 14,
  unavailableReason?: string,
): WorkTimeline {
  if (unavailableReason) {
    return {
      state: 'unavailable',
      points: [],
      opened: 0,
      completed: 0,
      closingBacklog: 0,
      unavailableReason,
    };
  }

  const { start, end } = workTimelineRange(asOf, days);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const usable = records
    .map((record) => ({
      ...record,
      createdMs: validTime(record.createdAt),
      closedMs: validTime(record.closedAt),
    }))
    .filter((record) => record.createdMs != null && record.createdMs < endMs);

  let backlog = usable.filter((record) =>
    record.createdMs! < startMs && (record.closedMs == null || record.closedMs >= startMs),
  ).length;

  const points: WorkTimelinePoint[] = [];
  for (let index = 0; index < Math.max(1, days); index += 1) {
    const dayStart = startMs + index * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const opened = usable.filter((record) =>
      record.createdMs! >= dayStart && record.createdMs! < dayEnd,
    ).length;
    const completed = usable.filter((record) =>
      record.closedMs != null && record.closedMs >= dayStart && record.closedMs < dayEnd,
    ).length;
    backlog = Math.max(0, backlog + opened - completed);
    points.push({
      day: new Date(dayStart).toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(dayStart)),
      opened,
      completed,
      backlog,
    });
  }

  const opened = points.reduce((sum, point) => sum + point.opened, 0);
  const completed = points.reduce((sum, point) => sum + point.completed, 0);
  return {
    state: opened === 0 && completed === 0 && backlog === 0 ? 'empty' : 'ready',
    points,
    opened,
    completed,
    closingBacklog: backlog,
  };
}
