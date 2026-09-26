'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/navigation/AppNavLink';
import { ExceptionResolutionDrawer } from '@/components/work/ExceptionResolutionDrawer';
import { nowMs } from '@/lib/time/clock';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import { formatNumber } from '@/lib/utils/format';
import type {
  WorkAction,
  WorkQueueItem,
  WorkViewCounts,
} from '@/lib/work/types';

type DuePresentation = {
  bucket: 'overdue' | 'today' | 'week' | 'none';
  label: string;
  tone: 'critical' | 'warning' | 'neutral';
};

const ACTION_LABELS: Record<WorkAction, string> = {
  assign_to_me: 'Assign to me',
  release: 'Release',
  start: 'Start work',
  snooze: 'Snooze one day',
  complete: 'Complete',
  reopen: 'Reopen',
};

function pretty(value: string | null) {
  if (!value) return 'Unassigned';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function duePresentation(value: string | null, referenceTimeMs: number): DuePresentation {
  if (!value || Number.isNaN(Date.parse(value))) return { bucket: 'none', label: 'No deadline', tone: 'neutral' };
  const due = Date.parse(value);
  const hours = Math.max(1, Math.ceil(Math.abs(due - referenceTimeMs) / 3_600_000));
  if (due < referenceTimeMs) return { bucket: 'overdue', label: `Breached ${hours}h`, tone: 'critical' };
  const tomorrow = new Date(referenceTimeMs);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (due < tomorrow.getTime()) return { bucket: 'today', label: `Due ${hours}h`, tone: 'warning' };
  const days = Math.max(1, Math.ceil((due - referenceTimeMs) / 86_400_000));
  return { bucket: 'week', label: `Due ${days}d`, tone: 'neutral' };
}

function itemHref(item: WorkQueueItem, returnHref: string) {
  if (!item.objectHref) return null;
  const [pathAndQuery, fragment] = item.objectHref.split('#', 2);
  const withReturn = `${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}return=${encodeURIComponent(returnHref)}`;
  return fragment ? `${withReturn}#${fragment}` : withReturn;
}

function readableError(value: unknown, fallback: string) {
  if (!value || typeof value !== 'object') return fallback;
  const message = (value as Record<string, unknown>).error;
  return typeof message === 'string' ? message : fallback;
}

export function WorkQueueOperations({
  items,
  total,
  viewCounts,
  page,
  pageSize,
  asOf,
  currentUserId,
  canManage: _canManage,
  sourceNotice,
}: {
  items: WorkQueueItem[];
  total: number;
  viewCounts: WorkViewCounts;
  page: number;
  pageSize: number;
  asOf: string;
  currentUserId: string;
  canManage: boolean;
  sourceNotice: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceTimeMs = Number.isFinite(Date.parse(asOf)) ? Date.parse(asOf) : nowMs();
  const selectedParam = searchParams.get('selected');
  const [selectedId, setSelectedId] = useState<string | null>(
    items.find((item) => item.id === selectedParam)?.id ?? items[0]?.id ?? null,
  );
  const dismissedSelection = useRef<string | null>(null);
  const [selectedException, setSelectedException] = useState<WorkQueueItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A close is an explicit operator action. Preserve that dismissal when
    // the URL-backed search params notify the client about the cleared query;
    // otherwise the normal no-query fallback would immediately reopen the
    // first item.
    if (selectedParam === null && dismissedSelection.current) {
      dismissedSelection.current = null;
      setSelectedId(null);
      return;
    }
    setSelectedId(items.find((item) => item.id === selectedParam)?.id ?? items[0]?.id ?? null);
  }, [items, selectedParam]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const currentReturnHref = `/work${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  const selectedHref = selectedItem ? itemHref(selectedItem, currentReturnHref) : null;

  const groups = useMemo(() => {
    const definitions: Array<{ key: DuePresentation['bucket']; label: string; tone: 'critical' | 'warning' | 'neutral' }> = [
      { key: 'overdue', label: 'Past SLA', tone: 'critical' },
      { key: 'today', label: 'Due today', tone: 'warning' },
      { key: 'week', label: 'Upcoming', tone: 'neutral' },
      { key: 'none', label: 'No deadline', tone: 'neutral' },
    ];
    return definitions.map((definition) => ({
      ...definition,
      items: items.filter((item) => duePresentation(item.dueAt, referenceTimeMs).bucket === definition.key),
    })).filter((group) => group.items.length > 0);
  }, [items, referenceTimeMs]);

  function routeHref(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (resetPage) params.delete('page');
    return `/work${params.size ? `?${params.toString()}` : ''}`;
  }

  function choose(item: WorkQueueItem) {
    dismissedSelection.current = null;
    setSelectedId(item.id);
    replaceHistoryUrlIfChanged(routeHref({ selected: item.id }, false));
  }

  function closeInspector() {
    dismissedSelection.current = selectedId;
    setSelectedId(null);
    // Selection is URL-backed so a dismissed inspector must also clear the
    // query parameter. Otherwise refresh/back-forward navigation reopens the
    // item the operator explicitly closed.
    const url = new URL(window.location.href);
    url.searchParams.delete('selected');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  }

  async function act(item: WorkQueueItem, action: WorkAction) {
    setBusy(`${item.id}:${action}`);
    setError(null);
    try {
      const response = await fetch(`/api/work-tasks/${item.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          action,
          expectedVersion: item.stateVersion,
          ...(action === 'snooze' ? { until: new Date(nowMs() + 86_400_000).toISOString() } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableError(body, 'Task update failed. It is safe to retry.'));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Task update failed. It is safe to retry.');
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,select,textarea,button,a,[contenteditable="true"]')) return;
      const index = Math.max(0, items.findIndex((item) => item.id === selectedId));
      if (event.key.toLowerCase() === 'j' && items[index + 1]) {
        event.preventDefault();
        choose(items[index + 1]);
      } else if (event.key.toLowerCase() === 'k' && items[index - 1]) {
        event.preventDefault();
        choose(items[index - 1]);
      } else if (event.key === 'Enter' && selectedItem) {
        event.preventDefault();
        if (selectedItem.kind === 'exception') setSelectedException(selectedItem);
        else if (selectedHref) router.push(selectedHref);
      } else if (event.key.toLowerCase() === 'a' && selectedItem?.validActions.includes('assign_to_me')) {
        event.preventDefault();
        void act(selectedItem, 'assign_to_me');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const control = { minHeight: 30, border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif" } as const;
  const selectedItems = items.filter((item) => item.id === selectedId);
  const itemAmount = (item: WorkQueueItem) => {
    const candidate = item.sourceMetadata.amount_display ?? item.sourceMetadata.amount ?? item.sourceMetadata.value_display;
    return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : 'Unavailable';
  };
  const itemReference = (item: WorkQueueItem) => {
    const candidate = item.sourceMetadata.order_ref ?? item.sourceMetadata.reference ?? item.sourceMetadata.case_ref;
    return typeof candidate === 'string' ? candidate : item.source ? pretty(item.source) : 'Source unavailable';
  };
  const compactAction = (item: WorkQueueItem) => item.validActions.find((action) => action !== 'release') ?? item.validActions[0] ?? null;
  return (
    <section data-screen-label="Work" data-surface-id="work-queue" data-visual-world="supplied-package" aria-label="Work queue" style={{ width: '100%', maxWidth: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', overflowX: 'auto', borderBottom: '1px solid #eae8e5' }}>
        <select aria-label="Assigned" value={searchParams.get('assignee') ?? ''} onChange={(event) => router.push(routeHref({ assignee: event.target.value || null, selected: null }))} style={{ ...control, padding: '0 30px 0 10px' }}><option value="">Assigned: anyone</option><option value={currentUserId}>Assigned: me</option></select>
        <select aria-label="Priority" value={searchParams.get('priority') ?? ''} onChange={(event) => router.push(routeHref({ priority: event.target.value || null, selected: null }))} style={{ ...control, padding: '0 30px 0 10px' }}><option value="">Priority: all</option><option value="urgent">Priority: urgent</option><option value="high">Priority: high</option><option value="medium">Priority: medium</option><option value="low">Priority: low</option></select>
        <select aria-label="State" value={searchParams.get('state') ?? ''} onChange={(event) => router.push(routeHref({ state: event.target.value || null, selected: null }))} style={{ ...control, padding: '0 30px 0 10px' }}><option value="">State: all</option><option value="open">State: open</option><option value="in_progress">State: in progress</option><option value="blocked">State: blocked</option><option value="completed">State: completed</option></select>
        <div style={{ flex: 1 }}/>
        <div aria-label="Queue depth, 14 days" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 4 }}><div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>QUEUE DEPTH · 14D</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>open {formatNumber(viewCounts.open)} · now {formatNumber(total)}</span></div><svg width="118" height="28" viewBox="0 0 118 28" fill="none" aria-hidden="true"><path d="M0 20 10 16 20 22 30 13 40 8 50 4 60 10 70 19 80 14 90 21 100 24 110 23 118 26 118 28 0 28Z" fill="rgba(242,118,26,.12)"/><path d="M0 20 10 16 20 22 30 13 40 8 50 4 60 10 70 19 80 14 90 21 100 24 110 23 118 26" stroke="#ff7a30" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="118" cy="26" r="2.4" fill="#ff7a30"/></svg></div>
        <span style={{ width: 1, height: 22, background: '#eae8e5' }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>dots: order · dispatch · tracking · support</span>
        <select aria-label="Sort work" value={searchParams.get('sort') ?? 'deadline'} onChange={(event) => router.push(routeHref({ sort: event.target.value, selected: null }))} style={{ ...control, padding: '0 30px 0 10px' }}><option value="deadline">Sort by deadline</option><option value="priority">Sort by priority</option><option value="oldest">Sort by oldest</option><option value="newest">Sort by newest</option></select>
      </div>
      {sourceNotice ? <p style={{ margin: 0, padding: '8px 22px', background: '#fff3e9', color: '#8a4b2e', fontSize: 11 }}>{sourceNotice}</p> : null}{error ? <p role="alert" style={{ margin: 0, padding: '8px 22px', background: '#fdf0e6', color: '#b0431a', fontSize: 11 }}>{error} <button type="button" onClick={() => setError(null)} style={{ border: 0, background: 'transparent', color: 'inherit', textDecoration: 'underline' }}>Dismiss</button></p> : null}
      <div style={{ flex: 1, minHeight: 0, padding: '14px 22px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', borderRadius: 12, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
          {groups.length ? groups.map((group) => <section key={group.key} aria-label={group.label}><header style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '13px 14px 9px' }}><strong style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d', textTransform: 'uppercase' }}>{group.key === 'today' ? 'Decide today' : group.key === 'week' ? 'This week' : group.key === 'none' ? 'Waiting on someone else' : group.label}</strong><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatNumber(group.items.length)} items</span><span style={{ flex: 1 }}/><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{group.key === 'overdue' || group.key === 'today' ? 'a window closes within 24 hours' : group.key === 'none' ? 'nothing you can do today' : 'evidence complete, ordered by deadline'}</span></header>{group.items.map((item) => { const due = duePresentation(item.dueAt, referenceTimeMs); const selected = item.id === selectedId; const action = compactAction(item); const href = itemHref(item, currentReturnHref); return <div key={item.key} data-selected={selected || undefined} onClick={() => choose(item)} style={{ display: 'flex', alignItems: 'center', gap: 13, minHeight: 58, padding: '9px 14px', borderTop: '1px solid #f4f2ef', background: selected ? '#fbfaf8' : '#fff', cursor: 'pointer' }}><span aria-hidden="true" style={{ width: 14, height: 14, flex: '0 0 14px', borderRadius: 4, background: selected ? '#1c1f23' : '#fff', boxShadow: selected ? 'none' : 'inset 0 0 0 1.3px rgba(28,27,25,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selected ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"><path d="M2 5.2 4.1 7.3 8 3.2"/></svg> : null}</span><span style={{ width: 190, flex: '0 0 190px', minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "500 12.5px/1.3 'Inter',sans-serif" }}>{item.objectLabel}</strong><small style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{itemReference(item)}</small></span><span style={{ width: 132, flex: '0 0 132px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 12px/1.3 'Inter',sans-serif", color: '#40454a' }}>{item.ownerName ?? pretty(item.ownerRole)}</span><span style={{ width: 150, flex: '0 0 150px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 12px/1.3 'Inter',sans-serif", color: '#40454a' }}>{item.title}</span><span role="img" aria-label={`${pretty(item.priority)} priority`} style={{ width: 56, flex: '0 0 56px', display: 'flex', gap: 3 }}>{[0,1,2,3].map((dot) => <i key={dot} style={{ width: 10, height: 10, borderRadius: 3, background: dot <= (item.priority === 'urgent' ? 3 : item.priority === 'high' ? 2 : item.priority === 'medium' ? 1 : 0) ? (due.tone === 'critical' && dot === 3 ? '#b0431a' : '#1c1f23') : '#e4e3e0' }}/>)}</span><span style={{ width: 130, flex: '0 0 130px', display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 72, flex: '0 0 72px', textAlign: 'right', font: "400 11.5px/1 'IBM Plex Mono',monospace" }}>{itemAmount(item)}</span><span style={{ flex: 1, height: 4, borderRadius: 3, background: '#f2f0ed', overflow: 'hidden' }}><i style={{ display: 'block', width: item.priority === 'urgent' ? '100%' : item.priority === 'high' ? '78%' : item.priority === 'medium' ? '50%' : '28%', height: '100%', background: '#1c1f23' }}/></span></span><span style={{ width: 104, flex: '0 0 104px', display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ height: 4, borderRadius: 3, background: '#f2f0ed', overflow: 'hidden' }}><i style={{ display: 'block', width: due.tone === 'critical' ? '94%' : due.tone === 'warning' ? '62%' : '30%', height: '100%', background: due.tone === 'critical' ? '#b0431a' : due.tone === 'warning' ? '#7a5310' : '#a7abad' }}/></span><small style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: due.tone === 'critical' ? '#b0431a' : '#64686d' }}>{due.label}</small></span><span style={{ flex: 1 }}/><span style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>{href ? <Link href={href} onClick={(event) => event.stopPropagation()} style={{ ...control, display: 'inline-flex', alignItems: 'center', padding: '0 10px', textDecoration: 'none' }}>Open</Link> : <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedException(item); }} style={{ ...control, padding: '0 10px' }}>Review</button>}{action ? <button type="button" disabled={busy !== null} onClick={(event) => { event.stopPropagation(); void act(item, action); }} style={{ ...control, padding: '0 11px', background: '#1c1f23', color: '#fff' }}>{ACTION_LABELS[action]}</button> : null}</span></div>; })}</section>) : <div data-state-id="work-empty-search-states" style={{ margin: 'auto', padding: 32, maxWidth: 420, textAlign: 'center' }}><h2 style={{ margin: 0, font: "500 17px/1.35 'Inter',sans-serif" }}>No filter match</h2><p style={{ color: '#64686d', fontSize: 12 }}>Work exists outside this exact view. Clear the current filters to return to the queue.</p><Link href="/work" style={{ color: '#9f4f08' }}>Clear filters</Link></div>}
          <span style={{ flex: 1 }}/><footer style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff' }}><span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{formatNumber(items.length)} of {formatNumber(total)} shown · every row retains its source and deadline</span><span style={{ flex: 1 }}/>{page > 1 ? <Link href={routeHref({ page: String(page - 1), selected: null }, false)} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#40454a', textDecoration: 'none', font: "400 11.5px/1 'Inter',sans-serif" }}>Previous</Link> : null}{page * pageSize < total ? <Link href={routeHref({ page: String(page + 1), selected: null }, false)} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#40454a', textDecoration: 'none', font: "400 11.5px/1 'Inter',sans-serif" }}>Next</Link> : null}</footer>
        </div>
        {selectedItems.length ? <div style={{ flex: '0 0 auto', borderRadius: 12, background: '#1c1f23', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 22px rgba(28,27,25,.22)' }}><span style={{ font: "500 12.5px/1 'Inter',sans-serif", color: '#fff' }}>{selectedItems.length} selected</span><span style={{ font: "400 11.5px/1 'IBM Plex Mono',monospace", color: 'rgba(255,255,255,.72)' }}>{itemAmount(selectedItems[0])} at risk · {duePresentation(selectedItems[0].dueAt, referenceTimeMs).label}</span><span style={{ flex: 1 }}/><button type="button" onClick={closeInspector} style={{ border: 0, borderRadius: 8, padding: '7px 10px', background: 'transparent', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)', color: '#fff', font: "400 12px/1 'Inter',sans-serif" }}>Clear selection</button>{selectedHref ? <Link href={selectedHref} style={{ borderRadius: 8, padding: '7px 11px', background: '#fff', color: '#1c1f23', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Open selected</Link> : null}<span style={{ maxWidth: 104, color: 'rgba(255,255,255,.58)', font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>A decision still requires review</span></div> : null}
      </div>
      <ExceptionResolutionDrawer item={selectedException} onClose={() => setSelectedException(null)} onUpdated={() => router.refresh()}/>
    </section>
  );
}
