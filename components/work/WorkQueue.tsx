'use client';

import { useMemo, useState } from 'react';

export type WorkQueueItem = {
  id: string;
  title: string;
  description: string | null;
  ownerRole: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  supportPayoutCaseId: string | null;
  blockingReason: string | null;
};

type TabKey = 'open' | 'in_progress' | 'blocked' | 'due_soon' | 'completed' | 'all';

const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000;

const TABS: Array<{ key: TabKey; label: string; match: (t: WorkQueueItem, nowMs: number) => boolean }> = [
  { key: 'open', label: 'Open', match: (t) => t.status === 'open' },
  { key: 'in_progress', label: 'In progress', match: (t) => t.status === 'in_progress' },
  { key: 'blocked', label: 'Blocked', match: (t) => t.status === 'blocked' },
  {
    key: 'due_soon',
    label: 'Approaching deadline',
    match: (t, nowMs) =>
      t.status !== 'completed' && t.status !== 'cancelled' && t.dueAt != null &&
      Date.parse(t.dueAt) - nowMs <= DUE_SOON_MS,
  },
  { key: 'completed', label: 'Completed', match: (t) => t.status === 'completed' },
  { key: 'all', label: 'All', match: () => true },
];

function titleCase(value: string | null): string {
  if (!value) return '—';
  return value.split(/[_\s]+/).map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(' ');
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return 'No due date';
  const d = Date.parse(dueAt);
  if (Number.isNaN(d)) return 'No due date';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'var(--danger, #dc2626)',
  high: 'var(--warning, #d97706)',
  medium: 'var(--text-secondary)',
  low: 'var(--text-tertiary)',
};

export function WorkQueue({ items, nowMs }: { items: WorkQueueItem[]; nowMs: number }) {
  const [tab, setTab] = useState<TabKey>('open');
  const counts = useMemo(() => {
    const map = {} as Record<TabKey, number>;
    for (const t of TABS) map[t.key] = items.filter((item) => t.match(item, nowMs)).length;
    return map;
  }, [items, nowMs]);
  const visible = useMemo(
    () => items.filter((item) => TABS.find((t) => t.key === tab)!.match(item, nowMs)),
    [items, tab, nowMs],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Work views">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--surface-muted, rgba(0,0,0,0.06))' : 'transparent',
              }}
            >
              {t.label}
              <span className="ml-1.5" style={{ color: 'var(--text-tertiary)' }}>{counts[t.key]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Nothing in this queue.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const inner = (
              <div
                className="flex items-start justify-between gap-4 rounded-lg px-3 py-2.5"
                style={{ border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: PRIORITY_COLOR[item.priority] ?? 'var(--text-tertiary)' }}
                    />
                    <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  </div>
                  {item.description ? (
                    <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  ) : null}
                  {item.blockingReason ? (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--warning, #d97706)' }}>Blocked: {item.blockingReason}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{titleCase(item.ownerRole)}</span>
                  <span>{formatDue(item.dueAt)}</span>
                </div>
              </div>
            );
            return (
              <li key={item.id}>
                {item.supportPayoutCaseId ? (
                  <a href={`/claims/${item.supportPayoutCaseId}`} className="block no-underline">{inner}</a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
