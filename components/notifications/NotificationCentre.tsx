'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock3,
  FileCheck2,
  RefreshCw,
  RotateCcw,
  UserRoundCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, InsetGroup, Surface, Tabs } from '@/components/ui';
import { formatDateTime } from '@/lib/utils/format';
import { selectNotificationActivity } from '@/lib/visualisation/chartSelectors';

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  target_href: string;
  read_at: string | null;
  created_at: string;
};

const KIND_META: Record<string, { label: string; icon: typeof Bell }> = {
  assignment: { label: 'Assignment', icon: UserRoundCheck },
  mention: { label: 'Mention', icon: Bell },
  approaching_deadline: { label: 'Deadline', icon: Clock3 },
  evidence_update: { label: 'Evidence', icon: FileCheck2 },
  decision_request: { label: 'Decision', icon: UserRoundCheck },
  recovery_outcome: { label: 'Recovery', icon: RotateCcw },
  sync_failure: { label: 'Connection', icon: AlertTriangle },
  daily_work_summary: { label: 'Work summary', icon: Bell },
  high_value_case_alert: { label: 'High value', icon: AlertTriangle },
  scheduled_report: { label: 'Report', icon: FileCheck2 },
};

function destinationLabel(href: string) {
  if (href.startsWith('/claims/')) return 'Open case';
  if (href.startsWith('/recoveries/')) return 'Open recovery';
  if (href.startsWith('/integrations/')) return 'Open connection';
  if (href.startsWith('/work')) return 'Open work queue';
  return 'Open record';
}

function groupLabel(createdAt: string): string {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return 'Earlier';
  const today = new Date();
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const age = startOfToday - Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
  if (age <= 0) return 'Today';
  if (age <= 6 * 24 * 60 * 60 * 1000) return 'Previous 7 days';
  return 'Earlier';
}

function NotificationActivity({ notifications }: { notifications: NotificationItem[] }) {
  const activity = useMemo(
    () => selectNotificationActivity(
      notifications.map((item) => ({ createdAt: item.created_at, readAt: item.read_at })),
      14,
    ),
    [notifications],
  );
  const highest = Math.max(1, ...activity.map((day) => day.read + day.unread));

  return (
    <InsetGroup className="p-3" aria-label="Notification activity over the last 14 days">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="ua-text-working-title text-[var(--ua-text-primary)]">Recent activity</h2>
          <p className="mt-0.5 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">Messages received over 14 days</p>
        </div>
        <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Unread uses the violet marker</span>
      </div>
      <div className="mt-3 grid h-16 grid-cols-14 items-end gap-1" role="img" aria-label="Fourteen-day notification activity; violet portions show notifications still unread.">
        {activity.map((day) => {
          const total = day.read + day.unread;
          const height = `${Math.max(total ? 16 : 4, (total / highest) * 100)}%`;
          const unreadHeight = total ? `${(day.unread / total) * 100}%` : '0%';
          return (
            <div key={day.dateLabel} className="flex h-full min-w-0 items-end" title={`${day.dateLabel}: ${total} received, ${day.unread} unread`}>
              <span className="relative block w-full overflow-hidden rounded-[var(--ua-radius-xs)] bg-[var(--ua-chart-track)]" style={{ height }}>
                {day.unread > 0 ? <span className="absolute inset-x-0 bottom-0 bg-[var(--ua-chart-primary)]" style={{ height: unreadHeight }} /> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-14 gap-1" aria-hidden="true">
        {activity.map((day) => <span key={day.dateLabel} className="truncate text-center text-[length:var(--ua-text-metadata-size)] leading-[var(--ua-text-metadata-leading)] text-[var(--ua-text-tertiary)]">{day.label.slice(0, 1)}</span>)}
      </div>
    </InsetGroup>
  );
}

export function NotificationCentre({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const unread = notifications.filter((item) => !item.read_at).length;
  const visible = useMemo(
    () => filter === 'unread' ? notifications.filter((item) => !item.read_at) : notifications,
    [filter, notifications],
  );
  const groups = useMemo(() => {
    const next = new Map<string, NotificationItem[]>();
    for (const item of visible) {
      const label = groupLabel(item.created_at);
      next.set(label, [...(next.get(label) ?? []), item]);
    }
    return [...next.entries()];
  }, [visible]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('unauth:notification-unread-change', {
      detail: { unreadCount: unread },
    }));
  }, [unread]);

  async function open(item: NotificationItem) {
    setBusy(item.id);
    setMessage('');
    try {
      if (!item.read_at) {
        const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
        if (!response.ok) throw new Error('Could not mark this notification as read');
        setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
      }
      router.push(item.target_href);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Notification action failed');
    } finally {
      setBusy(null);
    }
  }

  async function markAllRead() {
    setBusy('all');
    setMessage('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not mark notifications as read');
      setNotifications((rows) => rows.map((row) => ({ ...row, read_at: row.read_at ?? body.readAt })));
      setMessage(`${body.updated} notification${body.updated === 1 ? '' : 's'} marked as read.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Notification action failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="ua-text-working-title text-[var(--ua-text-primary)]">{unread ? `${unread} unread` : 'Inbox clear'}</h2>
          <p className="ua-text-caption-role mt-0.5">Newest notifications first. Opening one marks it as read.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/notifications" className="ua-text-label text-[var(--ua-text-link)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)]">Preferences</Link>
          {unread > 0 ? <Button variant="secondary" size="sm" leadingIcon={<CheckCheck />} loading={busy === 'all'} onClick={markAllRead}>Mark all read</Button> : null}
        </div>
      </div>
      {notifications.length ? <div className="border-t border-[var(--ua-border-subtle)] px-5 py-3"><NotificationActivity notifications={notifications} /></div> : null}
      <div className="border-t border-[var(--ua-border-subtle)] px-5 pt-3">
        <Tabs
          id="notification-filter"
          panelId="notification-list"
          aria-label="Notification filters"
          value={filter}
          onValueChange={(value) => setFilter(value as 'all' | 'unread')}
          items={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]}
        />
      </div>
      {message ? <p role="status" className="ua-text-body px-5 py-3 text-[var(--ua-text-secondary)]">{message}</p> : null}
      {visible.length ? <div id="notification-list" role="tabpanel" aria-labelledby={`notification-filter-tab-${filter}`} className="divide-y divide-[var(--ua-border-subtle)]">
        {groups.map(([label, items]) => (
          <section key={label} aria-labelledby={`notification-group-${label.replaceAll(' ', '-').toLowerCase()}`}>
            <h3 id={`notification-group-${label.replaceAll(' ', '-').toLowerCase()}`} className="ua-text-label bg-[var(--ua-surface-secondary)] px-5 py-2 text-[var(--ua-text-secondary)]">{label}</h3>
            <ul className="divide-y divide-[var(--ua-border-subtle)]">
              {items.map((item) => {
                const meta = KIND_META[item.kind] ?? { label: item.kind.replaceAll('_', ' '), icon: Bell };
                const Icon = meta.icon;
                return <li key={item.id}>
                  <button type="button" onClick={() => open(item)} disabled={busy === item.id} className="group grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)] disabled:opacity-60 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]"><Icon className="h-4 w-4 text-[var(--ua-icon-secondary)]" aria-hidden="true" />{!item.read_at ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--ua-surface-primary)] bg-[var(--ua-action-primary)]"><span className="sr-only">Unread</span></span> : null}</span>
                    <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className={item.read_at ? 'ua-text-body font-medium text-[var(--ua-text-primary)]' : 'ua-text-body font-semibold text-[var(--ua-text-primary)]'}>{item.title}</strong><span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{meta.label}</span></span>{item.body ? <span className="ua-text-body mt-1 block max-w-3xl text-[var(--ua-text-secondary)]">{item.body}</span> : null}<span className="mt-1 block text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{formatDateTime(item.created_at)}</span></span>
                    <span className="ua-text-label self-center text-[var(--ua-text-link)]">{busy === item.id ? 'Opening…' : destinationLabel(item.target_href)}</span>
                  </button>
                </li>;
              })}
            </ul>
          </section>
        ))}
      </div> : <div id="notification-list" role="tabpanel" aria-labelledby={`notification-filter-tab-${filter}`} className="p-6 text-center">
        <Bell className="mx-auto h-6 w-6 text-[var(--ua-icon-secondary)]" aria-hidden="true" />
        <h2 className="ua-text-working-title mt-3 text-[var(--ua-text-primary)]">{filter === 'unread' ? 'You are caught up' : 'No notifications yet'}</h2>
        <p className="ua-text-body mx-auto mt-1 max-w-lg text-[var(--ua-text-secondary)]">{filter === 'unread' ? 'New assignments, evidence, decisions, deadlines, recovery outcomes, and connection issues will appear here.' : 'Nothing needs your attention yet. We will notify you when a case does.'}</p>
        {filter === 'unread' ? <Button className="mt-4" variant="secondary" size="sm" onClick={() => setFilter('all')}>View all</Button> : <Link className="ua-text-label mt-4 inline-flex items-center gap-1 text-[var(--ua-text-link)] hover:underline" href="/settings/notifications"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Review preferences</Link>}
      </div>}
    </Surface>
  );
}
