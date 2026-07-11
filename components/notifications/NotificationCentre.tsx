'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type NotificationItem = { id: string; kind: string; title: string; body: string | null; target_href: string; read_at: string | null; created_at: string };

export function NotificationCentre({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  async function open(item: NotificationItem) {
    if (!item.read_at) {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      if (response.ok) setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
    }
    router.push(item.target_href);
  }
  if (!notifications.length) return <p className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No notifications yet.</p>;
  return <ul className="space-y-2">{notifications.map((item) => <li key={item.id}>
    <button type="button" onClick={() => open(item)} className="flex w-full items-start gap-3 rounded-lg border bg-white p-4 text-left">
      <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: item.read_at ? 'var(--border-muted)' : 'var(--accent)' }} />
      <span className="min-w-0"><span className="block text-sm font-semibold">{item.title}</span>{item.body ? <span className="mt-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>{item.body}</span> : null}<span className="mt-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.created_at.slice(0, 16).replace('T', ' ')}</span></span>
    </button>
  </li>)}</ul>;
}
