'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCheck, Clock3, FileCheck2, RefreshCw, RotateCcw, UserRoundCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge, Button, PanelCard } from '@/components/ui';
import { formatDateTime } from '@/lib/utils/format';

export type NotificationItem = { id: string; kind: string; title: string; body: string | null; target_href: string; read_at: string | null; created_at: string };

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
  if (href.startsWith('/claims/')) return 'Open payout case';
  if (href.startsWith('/recoveries/')) return 'Open recovery';
  if (href.startsWith('/integrations/')) return 'Open connection';
  if (href.startsWith('/work')) return 'Open work queue';
  return 'Open record';
}

export function NotificationCentre({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const unread = notifications.filter((item) => !item.read_at).length;
  const visible = useMemo(() => filter === 'unread' ? notifications.filter((item) => !item.read_at) : notifications, [filter, notifications]);

  async function open(item: NotificationItem) {
    setBusy(item.id); setMessage('');
    try {
      if (!item.read_at) {
        const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
        if (!response.ok) throw new Error('Could not mark this notification as read');
        setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
      }
      router.push(item.target_href);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Notification action failed'); }
    finally { setBusy(null); }
  }

  async function markAllRead() {
    setBusy('all'); setMessage('');
    try {
      const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not mark notifications as read');
      setNotifications((rows) => rows.map((row) => ({ ...row, read_at: row.read_at ?? body.readAt })));
      setMessage(`${body.updated} notification${body.updated === 1 ? '' : 's'} marked as read.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Notification action failed'); }
    finally { setBusy(null); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-muted)] px-4 py-3">
      <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] p-0.5" role="tablist" aria-label="Notification filters">
        {([{ value: 'all', label: `All ${notifications.length}` }, { value: 'unread', label: `Unread ${unread}` }] as const).map((item) => <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} className="rounded px-3 py-1.5 text-xs font-semibold" style={{ background: filter === item.value ? 'var(--surface)' : 'transparent', color: filter === item.value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</button>)}
      </div>
      <div className="flex items-center gap-2"><Link href="/settings/notifications" className="text-xs font-semibold text-[var(--accent)] hover:underline">Preferences</Link>{unread > 0 ? <Button variant="secondary" size="sm" leadingIcon={<CheckCheck className="h-3.5 w-3.5" />} loading={busy === 'all'} onClick={markAllRead}>Mark all read</Button> : null}</div>
    </div>
    <p aria-live="polite" className="px-4 text-xs text-[var(--text-secondary)]">{message}</p>
    {visible.length ? <ul className="divide-y divide-[var(--border-muted)]">{visible.map((item) => {
      const meta = KIND_META[item.kind] ?? { label: item.kind.replaceAll('_', ' '), icon: Bell };
      const Icon = meta.icon;
      return <li key={item.id}><button type="button" onClick={() => open(item)} disabled={busy === item.id} className="group grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-60 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-muted)] bg-[var(--surface)]"><Icon className="h-4 w-4 text-[var(--text-secondary)]" />{!item.read_at ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)]"><span className="sr-only">Unread</span></span> : null}</span>
        <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[var(--text-primary)]">{item.title}</strong><Badge tone="info" size="sm">{meta.label}</Badge></span>{item.body ? <span className="mt-1 block max-w-3xl text-sm text-[var(--text-secondary)]">{item.body}</span> : null}<span className="mt-1 block text-xs text-[var(--text-tertiary)]">{formatDateTime(item.created_at)}</span></span>
        <span className="self-center text-xs font-semibold text-[var(--accent)]">{busy === item.id ? 'Opening…' : destinationLabel(item.target_href)}</span>
      </button></li>;
    })}</ul> : <PanelCard variant="plain" className="mx-4 p-6 text-center"><Bell className="mx-auto h-6 w-6 text-[var(--text-tertiary)]" /><h2 className="mt-3 text-sm font-semibold">{filter === 'unread' ? 'You are caught up' : 'No notifications yet'}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-[var(--text-secondary)]">{filter === 'unread' ? 'New assignments, evidence, decisions, deadlines, recovery outcomes and connection issues will appear here.' : 'Nothing needs your attention yet. We\'ll notify you when a case does.'}</p>{filter === 'unread' ? <Button className="mt-4" variant="secondary" size="sm" onClick={() => setFilter('all')}>View all</Button> : <Link className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]" href="/settings/notifications"><RefreshCw className="h-3.5 w-3.5" /> Review preferences</Link>}</PanelCard>}
  </div>;
}
