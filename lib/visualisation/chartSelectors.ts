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
    key: string;
    label: string;
    amountMinor: number | null;
    currency: string | null;
    writtenOff: boolean;
  }>,
  currency: string | null,
): Array<{ key: string; label: string; valueMajor: number; count: number; share: number; cumulativeShare: number }> {
  if (!currency) return [];
  const grouped = new Map<string, { label: string; minor: number; count: number }>();
  for (const row of rows) {
    if (row.currency !== currency || row.amountMinor == null || row.amountMinor <= 0) continue;
    const existing = grouped.get(row.key);
    grouped.set(row.key, { label: row.label, minor: (existing?.minor ?? 0) + row.amountMinor, count: (existing?.count ?? 0) + 1 });
  }
  const ranked = [...grouped.entries()]
    .map(([key, { label, minor, count }]) => ({ key, label, valueMajor: minor / 100, count }))
    .sort((left, right) => right.valueMajor - left.valueMajor);
  const total = ranked.reduce((sum, row) => sum + row.valueMajor, 0);
  let cumulative = 0;
  return ranked.map((row) => {
    const share = total > 0 ? row.valueMajor / total : 0;
    cumulative += share;
    return { ...row, share, cumulativeShare: Math.min(1, cumulative) };
  });
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
  asOf: Date | string = new Date(),
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
  // Zero-fill the represented window — an inbox day with no notifications is a
  // real zero (the account existed that day), never an absent/hatched period.
  const end = new Date(asOf);
  const days = Math.max(1, representedDateLimit);
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - offset));
    const key = day.toISOString().slice(0, 10);
    if (!grouped.has(key)) {
      grouped.set(key, {
        label: new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(day),
        dateLabel: key,
        read: 0,
        unread: 0,
      });
    }
  }
  return [...grouped.values()]
    .sort((left, right) => left.dateLabel.localeCompare(right.dateLabel))
    .slice(-days);
}
