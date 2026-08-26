'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock3,
  FileCheck2,
  RefreshCw,
  RotateCcw,
  UserRoundCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink, PageFrame } from '@/components/ui';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import styles from './NotificationCentreOperations.module.css';
import type { NotificationCounts, NotificationFilter } from '@/lib/notifications/store';
import { NEEDS_NOTIFICATION_KINDS, type NotificationKind } from '@/lib/notifications/kinds';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  target_href: string;
  read_at: string | null;
  created_at: string;
};

type NotificationTone = 'critical' | 'warning' | 'success' | 'info' | 'neutral';

const KIND_META: Record<NotificationKind, { label: string; icon: typeof Bell; tone: NotificationTone }> = {
  assignment: { label: 'Assignment', icon: UserRoundCheck, tone: 'info' },
  mention: { label: 'Mention', icon: Bell, tone: 'info' },
  approaching_deadline: { label: 'Deadline', icon: Clock3, tone: 'warning' },
  evidence_update: { label: 'Evidence', icon: FileCheck2, tone: 'info' },
  decision_request: { label: 'Decision', icon: UserRoundCheck, tone: 'critical' },
  recovery_outcome: { label: 'Recovery', icon: RotateCcw, tone: 'success' },
  sync_failure: { label: 'Connection', icon: RefreshCw, tone: 'warning' },
  high_value_case_alert: { label: 'High value', icon: AlertTriangle, tone: 'critical' },
};

const NEEDS_KINDS = new Set<NotificationKind>(NEEDS_NOTIFICATION_KINDS);

function notificationMeta(item: NotificationItem) {
  return KIND_META[item.kind];
}

function isSourceNotification(item: NotificationItem) {
  return item.kind === 'sync_failure' || item.target_href.startsWith('/sources/') || item.target_href.startsWith('/financials/reconciliation');
}

function groupLabel(item: NotificationItem) {
  if (!item.read_at && NEEDS_KINDS.has(item.kind)) return 'Needs you';
  const created = Date.parse(item.created_at);
  if (Number.isNaN(created)) return 'This week';
  const now = Date.now();
  const age = now - created;
  if (age <= 24 * 60 * 60 * 1000) return 'Earlier today';
  if (age <= 7 * 24 * 60 * 60 * 1000) return 'This week';
  return 'Earlier';
}

function relativeTime(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return 'Time unavailable';
  const elapsed = Math.max(0, Date.now() - time);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(value);
}

function destinationLabel(href: string) {
  if (href.startsWith('/cases/')) return 'Open case';
  if (href.startsWith('/financials/recovery/')) return 'Open recovery';
  if (href.startsWith('/financials/reconciliation')) return 'Open reconciliation';
  if (href.startsWith('/financials/reports')) return 'Open report';
  if (href.startsWith('/sources/')) return 'Open connection';
  if (href.startsWith('/work')) return 'Open work queue';
  return 'Open record';
}

function moveNotificationFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const region = event.currentTarget.closest('#notification-list');
  const triggers = region ? [...region.querySelectorAll<HTMLButtonElement>('[data-notification-trigger]')] : [];
  if (!triggers.length) return;
  const current = triggers.indexOf(event.currentTarget);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? triggers.length - 1 : event.key === 'ArrowDown' ? Math.min(triggers.length - 1, current + 1) : Math.max(0, current - 1);
  event.preventDefault();
  triggers[next]?.focus();
}

export function NotificationCentre({
  initialNotifications,
  initialCounts,
  initialNextCursor = null,
  initialFilter = 'all',
  initialCursor = null,
}: {
  initialNotifications: NotificationItem[];
  initialCounts?: NotificationCounts;
  initialNextCursor?: string | null;
  initialFilter?: NotificationFilter;
  initialCursor?: string | null;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [counts, setCounts] = useState<NotificationCounts>(() => initialCounts ?? {
    all: initialNotifications.length,
    unread: initialNotifications.filter((item) => !item.read_at).length,
    needs: initialNotifications.filter((item) => !item.read_at && NEEDS_KINDS.has(item.kind)).length,
    sources: initialNotifications.filter(isSourceNotification).length,
  });
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([initialCursor]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotifications[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const unread = counts.unread;
  const selected = notifications.find((item) => item.id === selectedId) ?? notifications[0] ?? null;
  const groups = useMemo(() => {
    const order = ['Needs you', 'Earlier today', 'This week', 'Earlier'];
    return order.map((label) => {
      const items = notifications.filter((item) => groupLabel(item) === label);
      return { label, items, unread: items.filter((item) => !item.read_at).length };
    }).filter((group) => group.items.length);
  }, [notifications]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('unauth:notification-unread-change', { detail: { unreadCount: unread } }));
  }, [unread]);

  function updateLocation(nextFilter: NotificationFilter, cursor: string | null) {
    const params = new URLSearchParams();
    if (nextFilter !== 'all') params.set('tab', nextFilter);
    if (cursor) params.set('cursor', cursor);
    window.history.replaceState(null, '', `/notifications${params.size ? `?${params.toString()}` : ''}`);
  }

  async function loadPage(nextFilter: NotificationFilter, cursor: string | null) {
    setLoadingPage(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ filter: nextFilter, limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/notifications?${params.toString()}`);
      const body = await response.json() as {
        items?: NotificationItem[];
        counts?: NotificationCounts;
        pageInfo?: { nextCursor?: string | null };
        error?: string;
      };
      if (!response.ok || !body.items || !body.counts || !body.pageInfo) {
        throw new Error(body.error ?? 'Notifications could not be loaded.');
      }
      setNotifications(body.items);
      setCounts(body.counts);
      setNextCursor(body.pageInfo.nextCursor ?? null);
      setSelectedId(body.items[0]?.id ?? null);
      updateLocation(nextFilter, cursor);
      return true;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Notifications could not be loaded.');
      return false;
    } finally {
      setLoadingPage(false);
    }
  }

  function changeFilter(nextFilter: NotificationFilter) {
    if (nextFilter === filter || loadingPage) return;
    setFilter(nextFilter);
    setCursorHistory([null]);
    setPageIndex(0);
    void loadPage(nextFilter, null);
  }

  async function movePage(cursor: string | null, nextIndex: number) {
    if (loadingPage) return;
    const loaded = await loadPage(filter, cursor);
    if (loaded) setPageIndex(nextIndex);
  }

  function goNext() {
    if (!nextCursor) return;
    const history = [...cursorHistory.slice(0, pageIndex + 1), nextCursor];
    setCursorHistory(history);
    void movePage(nextCursor, pageIndex + 1);
  }

  function goPrevious() {
    if (pageIndex <= 0) return;
    void movePage(cursorHistory[pageIndex - 1] ?? null, pageIndex - 1);
  }

  async function markRead(item: NotificationItem) {
    if (item.read_at) return true;
    setBusy(item.id);
    setMessage('');
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not mark this notification as read');
      const readAt = new Date().toISOString();
      setNotifications((rows) => (filter === 'unread' || filter === 'needs')
        ? rows.filter((row) => row.id !== item.id)
        : rows.map((row) => row.id === item.id ? { ...row, read_at: readAt } : row));
      setCounts((value) => ({
        ...value,
        unread: Math.max(0, value.unread - 1),
        needs: NEEDS_KINDS.has(item.kind) ? Math.max(0, value.needs - 1) : value.needs,
      }));
      return true;
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Notification action failed');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function open(item: NotificationItem) {
    const ready = await markRead(item);
    if (ready) router.push(item.target_href);
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
      setNotifications((rows) => (filter === 'unread' || filter === 'needs')
        ? []
        : rows.map((row) => ({ ...row, read_at: row.read_at ?? body.readAt })));
      setCounts((value) => ({ ...value, unread: 0, needs: 0 }));
      setMessage(`${body.updated} notification${body.updated === 1 ? '' : 's'} marked as read.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Notification action failed');
    } finally {
      setBusy(null);
    }
  }

  const selectedMeta = selected ? notificationMeta(selected) : null;
  const SelectedIcon = selectedMeta?.icon ?? Bell;

  return (
    <PageFrame
      title="Notifications"
      breadcrumbs={[{ label: 'Unauth', href: '/overview' }, { label: 'Notifications' }]}
      showCurrentBreadcrumb
      actions={(
        <>
          <ButtonLink href="/settings/product/notifications" variant="secondary" size="sm">Preferences</ButtonLink>
          <Button size="sm" loading={busy === 'all'} disabled={unread === 0} onClick={() => void markAllRead()}>Mark all read</Button>
        </>
      )}
      surfaceId="notifications-inbox"
      archetype="P5"
    >
      <section className={styles.root} data-operations-surface="notifications" data-surface-id="notifications-inbox">
        <div className={styles.listPane}>
          <div className={styles.tabs}>
            <div className={styles.tabList} role="tablist" aria-label="Notification filters">
              {([
                ['all', 'All'],
                ['unread', 'Unread'],
                ['needs', 'Needs you'],
                ['sources', 'Sources'],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={filter === key} data-active={filter === key} className={styles.tab} onClick={() => changeFilter(key)}>{label} · {formatNumber(counts[key])}</button>
              ))}
            </div>
            <button type="button" className={styles.markCompact} disabled={unread === 0 || busy === 'all'} onClick={() => void markAllRead()}>Mark all read</button>
          </div>

          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <div id="notification-list" className={styles.list} role="tabpanel">
            {loadingPage ? (
              <div className={styles.empty} role="status"><RefreshCw size={22} aria-hidden="true" /><h2>Loading notifications…</h2><p>The current filter and cursor are being resolved.</p></div>
            ) : notifications.length ? groups.map((group) => (
              <section key={group.label} aria-labelledby={`notification-group-${group.label.replaceAll(' ', '-').toLowerCase()}`}>
                <header className={styles.groupHeader}>
                  <strong id={`notification-group-${group.label.replaceAll(' ', '-').toLowerCase()}`}>{group.label}</strong>
                  <span>{formatNumber(group.items.length)} {group.items.length === 1 ? 'item' : 'items'}{group.unread ? ` · ${formatNumber(group.unread)} unread` : ''}</span>
                </header>
                {group.items.map((item) => {
                  const meta = notificationMeta(item);
                  const Icon = meta.icon;
                  const isSelected = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-notification-trigger
                      data-unread={!item.read_at}
                      data-selected={isSelected || undefined}
                      className={styles.row}
                      onClick={() => isSelected ? void open(item) : setSelectedId(item.id)}
                      onKeyDown={moveNotificationFocus}
                      disabled={busy === item.id}
                      aria-label={`${isSelected ? 'Open' : 'Select'} ${item.title}`}
                    >
                      <span className={styles.unread} data-unread={!item.read_at} aria-hidden="true" />
                      <span className={styles.icon} data-tone={meta.tone}><Icon size={12} aria-hidden="true" /></span>
                      <span className={styles.copy}><strong>{item.title}</strong><small>{meta.label} · {item.body ?? destinationLabel(item.target_href)}</small></span>
                      <span className={styles.time}>{relativeTime(item.created_at)}</span>
                    </button>
                  );
                })}
              </section>
            )) : (
              <div className={styles.empty} data-state-id={filter === 'unread' ? 'notifications-caught-up' : 'notifications-first-use'}>
                <Bell size={22} aria-hidden="true" />
                <h2>{filter === 'unread' ? 'You are caught up' : filter === 'needs' ? 'Nothing needs you' : filter === 'sources' ? 'No source notifications' : 'No notifications yet'}</h2>
                <p>{filter === 'unread' || filter === 'needs' ? 'New assignments, evidence, decisions, deadlines and connection issues will appear here.' : filter === 'sources' ? 'Connection and reconciliation issues will appear here when they are recorded.' : 'Nothing needs your attention yet. We will notify you when a record does.'}</p>
              </div>
            )}
            <footer className={styles.footer}>
              <span>Arrow keys move selection · Enter opens the selected record</span>
              <span>{formatNumber(notifications.length)} shown of {formatNumber(counts[filter])} · {formatNumber(unread)} unread</span>
            </footer>
            {pageIndex > 0 || nextCursor ? <div className={styles.pager}><button type="button" aria-label="Previous notification page" disabled={pageIndex <= 0 || loadingPage} onClick={goPrevious}>←</button><button type="button" aria-label="Next notification page" disabled={!nextCursor || loadingPage} onClick={goNext}>→</button></div> : null}
          </div>
        </div>

        {selected && selectedMeta ? (
          <aside className={styles.inspector} aria-label="Selected notification">
            <header className={styles.inspectorHeader}>
              <span className={styles.icon} data-tone={selectedMeta.tone}><SelectedIcon size={14} aria-hidden="true" /></span>
              <div><h2>{selected.title}</h2><p>{selectedMeta.label} · {relativeTime(selected.created_at)}</p></div>
            </header>
            <div className={styles.body}><p>{selected.body ?? 'No additional notification detail was recorded.'}</p></div>
            <dl className={styles.facts}>
              <div><dt>Status</dt><dd>{selected.read_at ? 'Read' : 'Unread'}</dd></div>
              <div><dt>Type</dt><dd>{selectedMeta.label}</dd></div>
              <div><dt>Recorded</dt><dd>{formatDateTime(selected.created_at)}</dd></div>
              <div><dt>Destination</dt><dd title={selected.target_href}>{destinationLabel(selected.target_href)}</dd></div>
            </dl>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} disabled={busy === selected.id} onClick={() => void open(selected)}>{destinationLabel(selected.target_href)}</button>
              <div>
                <button type="button" className={styles.secondary} disabled={Boolean(selected.read_at) || busy === selected.id} onClick={() => void markRead(selected)}>Mark read</button>
              </div>
            </div>
          </aside>
        ) : (
          <aside className={styles.inspector} aria-label="No selected notification">
            <div className={styles.empty}><Bell size={22} aria-hidden="true" /><h2>Select a notification</h2><p>Its recorded context and valid destination will appear here.</p></div>
          </aside>
        )}
      </section>
    </PageFrame>
  );
}
