export type DeadlineBandCounts = {
  overdue: number;
  dueToday: number;
  upcoming: number;
  unscheduled: number;
  invalid: number;
};

export function selectDeadlineBands(
  rows: Array<{ dueAt: string | null }>,
  todayStartMs: number,
  todayEndMs: number,
): DeadlineBandCounts {
  return rows.reduce<DeadlineBandCounts>((counts, row) => {
    if (!row.dueAt) counts.unscheduled += 1;
    else {
      const due = Date.parse(row.dueAt);
      if (!Number.isFinite(due)) counts.invalid += 1;
      else if (due < todayStartMs) counts.overdue += 1;
      else if (due < todayEndMs) counts.dueToday += 1;
      else counts.upcoming += 1;
    }
    return counts;
  }, { overdue: 0, dueToday: 0, upcoming: 0, unscheduled: 0, invalid: 0 });
}

export function selectLossContributions(
  rows: Array<{
    label: string;
    amountMinor: number | null;
    currency: string | null;
    writtenOff: boolean;
  }>,
  currency: string | null,
): Array<{ label: string; valueMajor: number }> {
  if (!currency) return [];
  const grouped = new Map<string, number>();
  for (const row of rows) {
    if (row.writtenOff || row.currency !== currency || row.amountMinor == null || row.amountMinor <= 0) continue;
    grouped.set(row.label, (grouped.get(row.label) ?? 0) + row.amountMinor);
  }
  return [...grouped.entries()]
    .map(([label, valueMinor]) => ({ label, valueMajor: valueMinor / 100 }))
    .sort((left, right) => right.valueMajor - left.valueMajor);
}

export type NotificationActivityDay = {
  label: string;
  dateLabel: string;
  read: number;
  unread: number;
};

export function selectNotificationActivity(
  rows: Array<{ createdAt: string; readAt: string | null }>,
  representedDateLimit = 7,
): NotificationActivityDay[] {
  const grouped = new Map<string, NotificationActivityDay>();
  for (const row of rows) {
    const date = new Date(row.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    const current = grouped.get(key) ?? {
      label: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(date),
      dateLabel: key,
      read: 0,
      unread: 0,
    };
    if (row.readAt) current.read += 1;
    else current.unread += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .sort((left, right) => left.dateLabel.localeCompare(right.dateLabel))
    .slice(-Math.max(1, representedDateLimit));
}
