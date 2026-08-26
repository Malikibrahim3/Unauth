'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from '@/components/navigation/AppNavLink';
import { ExceptionResolutionDrawer } from '@/components/work/ExceptionResolutionDrawer';
import { Button, Input, Inspector, Pagination, Select } from '@/components/ui';
import { nowMs } from '@/lib/time/clock';
import { formatNumber } from '@/lib/utils/format';
import type {
  WorkAction,
  WorkQueueItem,
  WorkSavedViewDefinition,
  WorkView,
  WorkViewCounts,
} from '@/lib/work/types';
import styles from './WorkQueueOperations.module.css';

type DuePresentation = {
  bucket: 'overdue' | 'today' | 'week' | 'none';
  label: string;
  tone: 'critical' | 'warning' | 'neutral';
};

type SavedView = {
  id: string;
  name: string;
  definition: WorkSavedViewDefinition;
  is_shared: boolean;
  owner_user_id: string;
};

const VIEW_TABS: Array<{ view: WorkView; label: string; count: keyof WorkViewCounts }> = [
  { view: 'open', label: 'Open', count: 'open' },
  { view: 'mine', label: 'Mine', count: 'mine' },
  { view: 'unassigned', label: 'Unassigned', count: 'unassigned' },
  { view: 'snoozed', label: 'Snoozed', count: 'snoozed' },
  { view: 'overdue', label: 'Overdue', count: 'overdue' },
  { view: 'integration-exceptions', label: 'Exceptions', count: 'integration-exceptions' },
  { view: 'completed', label: 'Completed', count: 'completed' },
];

const PRIMARY_VIEW_IDS = new Set<WorkView>(['mine', 'open', 'overdue', 'integration-exceptions']);
const PRIMARY_VIEW_TABS = VIEW_TABS.filter((tab) => PRIMARY_VIEW_IDS.has(tab.view));
const SECONDARY_VIEW_TABS = VIEW_TABS.filter((tab) => !PRIMARY_VIEW_IDS.has(tab.view));

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

function ownerInitials(item: WorkQueueItem) {
  if (item.ownerInitials) return item.ownerInitials.toUpperCase();
  const source = item.ownerName ?? item.ownerRole ?? 'UA';
  const words = source.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2)).toUpperCase();
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
  view,
  viewCounts,
  page,
  pageSize,
  asOf,
  initialQuery,
  currentUserId,
  canManage,
  canManageViews,
  sourceNotice,
  savedViewId,
}: {
  items: WorkQueueItem[];
  total: number;
  view: WorkView;
  viewCounts: WorkViewCounts;
  page: number;
  pageSize: number;
  asOf: string;
  initialQuery: string;
  currentUserId: string;
  canManage: boolean;
  canManageViews: boolean;
  sourceNotice: string | null;
  savedViewId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceTimeMs = Number.isFinite(Date.parse(asOf)) ? Date.parse(asOf) : nowMs();
  const selectedParam = searchParams.get('selected');
  const [selectedId, setSelectedId] = useState<string | null>(
    items.find((item) => item.id === selectedParam)?.id ?? items[0]?.id ?? null,
  );
  const [selectedException, setSelectedException] = useState<WorkQueueItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialQuery);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savedViewsState, setSavedViewsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveName, setSaveName] = useState('');
  const [saveShared, setSaveShared] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [externalReference, setExternalReference] = useState('');

  useEffect(() => setSearch(initialQuery), [initialQuery]);
  useEffect(() => {
    setSelectedId(items.find((item) => item.id === selectedParam)?.id ?? items[0]?.id ?? null);
  }, [items, selectedParam]);

  const loadSavedViews = useCallback(async () => {
    setSavedViewsState('loading');
    try {
      const response = await fetch('/api/work/views', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableError(body, 'Saved views could not be loaded.'));
      setSavedViews(Array.isArray(body.views) ? body.views : []);
      setSavedViewsState('ready');
    } catch {
      setSavedViewsState('error');
    }
  }, []);
  useEffect(() => { void loadSavedViews(); }, [loadSavedViews]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const currentReturnHref = `/work${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  const selectedHref = selectedItem ? itemHref(selectedItem, currentReturnHref) : null;
  const activeSecondaryView = SECONDARY_VIEW_TABS.find((tab) => tab.view === view) ?? null;
  const activeFilterCount = [searchParams.get('priority'), searchParams.get('state'), searchParams.get('assignee')]
    .filter(Boolean).length;

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
    setSelectedId(item.id);
    window.history.replaceState(null, '', routeHref({ selected: item.id }, false));
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

  async function reportExternalAttempt(item: WorkQueueItem) {
    const actionId = item.sourceMetadata.external_action_id;
    const expectedVersion = Number(item.sourceMetadata.external_action_state_version ?? 1);
    if (typeof actionId !== 'string') return;
    setBusy(`${item.id}:external-attempt`);
    setError(null);
    try {
      const response = await fetch(`/api/external-actions/${actionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          expectedVersion,
          method: 'shopify_admin',
          externalReference: externalReference.trim() || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableError(body, 'External attempt could not be recorded.'));
      setExternalReference('');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'External attempt could not be recorded.');
    } finally {
      setBusy(null);
    }
  }

  async function saveCurrentView() {
    const name = saveName.trim();
    if (!name) return;
    setBusy('save-view');
    setError(null);
    const definition: WorkSavedViewDefinition = {
      view,
      search: initialQuery,
      priority: (searchParams.get('priority') as WorkSavedViewDefinition['priority']) ?? null,
      state: (searchParams.get('state') as WorkSavedViewDefinition['state']) ?? null,
      assignee: searchParams.get('assignee'),
      sort: (searchParams.get('sort') as WorkSavedViewDefinition['sort']) ?? 'deadline',
    };
    try {
      const response = await fetch('/api/work/views', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, definition, isShared: canManageViews && saveShared }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableError(body, 'Saved view could not be created.'));
      setSaveName('');
      setSaveShared(false);
      setShowSave(false);
      await loadSavedViews();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Saved view could not be created.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteSavedView(id: string) {
    setBusy(`delete-view:${id}`);
    setError(null);
    try {
      const response = await fetch(`/api/work/views/${id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableError(body, 'Saved view could not be deleted.'));
      await loadSavedViews();
      if (savedViewId === id) router.replace(routeHref({ savedView: null }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Saved view could not be deleted.');
    } finally {
      setBusy(null);
    }
  }

  function applySavedView(id: string) {
    const saved = savedViews.find((candidate) => candidate.id === id);
    if (!saved) return;
    const definition = saved.definition;
    router.push(routeHref({
      savedView: saved.id,
      view: definition.view,
      search: definition.search || null,
      priority: definition.priority,
      state: definition.state,
      assignee: definition.assignee,
      sort: definition.sort,
      selected: null,
    }));
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

  return (
    <section className={styles.root} aria-label="Work queue">
      <nav className={styles.tabs} aria-label="Work views">
        <span className={styles.viewGroupLabel}>System views</span>
        {PRIMARY_VIEW_TABS.map((tab) => (
          <Link key={tab.view} href={routeHref({ view: tab.view, selected: null })} className={styles.tab} aria-current={view === tab.view ? 'page' : undefined}>
            {tab.label} <span className={styles.tabCount}>{formatNumber(viewCounts[tab.count])}</span>
          </Link>
        ))}
        <details className={styles.moreViews} open={Boolean(activeSecondaryView)}>
          <summary aria-label="More system views">
            {activeSecondaryView ? activeSecondaryView.label : 'More'}
            <span>{activeSecondaryView ? formatNumber(viewCounts[activeSecondaryView.count]) : formatNumber(SECONDARY_VIEW_TABS.length)}</span>
          </summary>
          <div>
            {SECONDARY_VIEW_TABS.map((tab) => (
              <Link key={tab.view} href={routeHref({ view: tab.view, selected: null })} aria-current={view === tab.view ? 'page' : undefined}>
                <span>{tab.label}</span><strong>{formatNumber(viewCounts[tab.count])}</strong>
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className={styles.toolbar}>
        <form className={styles.filterForm} onSubmit={(event) => { event.preventDefault(); router.push(routeHref({ search: search.trim() || null, selected: null })); }}>
          <Input aria-label="Search work" placeholder="Search tasks, cases and sources" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={160} />
          <Select aria-label="Sort work" value={searchParams.get('sort') ?? 'deadline'} onChange={(event) => router.push(routeHref({ sort: event.target.value, selected: null }))}>
            <option value="deadline">Deadline</option><option value="priority">Priority</option><option value="oldest">Oldest</option><option value="newest">Newest</option>
          </Select>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
          <details className={styles.advancedFilters} open={activeFilterCount > 0}>
            <summary>Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}</summary>
            <div>
              <label>Priority<Select aria-label="Priority" value={searchParams.get('priority') ?? ''} onChange={(event) => router.push(routeHref({ priority: event.target.value || null, selected: null }))}>
                <option value="">All priorities</option>
                <option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </Select></label>
              <label>State<Select aria-label="State" value={searchParams.get('state') ?? ''} onChange={(event) => router.push(routeHref({ state: event.target.value || null, selected: null }))}>
                <option value="">All states</option>
                <option value="open">Open</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option>
              </Select></label>
              {activeFilterCount ? <Link href={routeHref({ priority: null, state: null, assignee: null, selected: null })}>Clear filters</Link> : <p>Owner, priority and lifecycle filters keep the current view and search.</p>}
            </div>
          </details>
        </form>
        <div className={styles.savedViews}>
          {savedViewsState === 'loading' ? <span>Loading saved views…</span> : null}
          {savedViewsState === 'error' ? <button type="button" onClick={() => void loadSavedViews()}>Saved views unavailable · Retry</button> : null}
          {savedViewsState === 'ready' ? (
            <>
              <Select aria-label="Saved Work view" value={savedViewId ?? ''} onChange={(event) => applySavedView(event.target.value)}>
                <option value="">Saved views</option>
                {savedViews.map((saved) => <option key={saved.id} value={saved.id}>{saved.name}{saved.is_shared ? ' · shared' : ''}</option>)}
              </Select>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowSave((value) => !value)}>Save view</Button>
              {savedViewId && savedViews.some((saved) => saved.id === savedViewId && (saved.owner_user_id === currentUserId || canManageViews)) ? (
                <Button type="button" variant="ghost" size="sm" loading={busy === `delete-view:${savedViewId}`} onClick={() => void deleteSavedView(savedViewId)}>Delete</Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {showSave ? (
        <div className={styles.saveViewForm}>
          <Input aria-label="Saved view name" placeholder="View name" value={saveName} onChange={(event) => setSaveName(event.target.value)} maxLength={80} />
          {canManageViews ? <label><input type="checkbox" checked={saveShared} onChange={(event) => setSaveShared(event.target.checked)} /> Share with workspace</label> : null}
          <Button type="button" size="sm" loading={busy === 'save-view'} disabled={!saveName.trim()} onClick={() => void saveCurrentView()}>Save</Button>
        </div>
      ) : null}
      {sourceNotice ? <p className={styles.notice}>{sourceNotice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error} <button type="button" onClick={() => setError(null)}>Dismiss</button></p> : null}

      <div className={styles.layout}>
        <div className={styles.queue}>
          {groups.length ? groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <header className={styles.groupHeader}><strong data-tone={group.tone}>{group.label}</strong><span>{formatNumber(group.items.length)} on this page</span></header>
              {group.items.map((item) => {
                const due = duePresentation(item.dueAt, referenceTimeMs);
                return (
                  <button key={item.key} type="button" className={styles.row} data-selected={item.id === selectedId || undefined} onClick={() => choose(item)}>
                    <span className={styles.dot} data-tone={due.tone === 'neutral' ? (item.kind === 'exception' ? 'success' : undefined) : due.tone} aria-hidden="true" />
                    <span className={styles.rowCopy}><strong>{item.title}</strong><small>{item.objectLabel} · {pretty(item.taskKind)} · {item.source ? pretty(item.source) : 'Source unavailable'} · {item.ownerName ?? pretty(item.ownerRole)}</small></span>
                    <span className={styles.rowMeta}><strong>{pretty(item.status)}</strong><span className={styles.sla} data-tone={due.tone}>{due.label}</span></span>
                    <span className={styles.avatar} aria-label={item.ownerName ?? pretty(item.ownerRole)}>{ownerInitials(item)}</span>
                  </button>
                );
              })}
            </section>
          )) : (
            <div className={styles.empty}><h2>No work matches this view</h2><p>Change the search or filters. Nothing has been represented as zero outside this exact query.</p></div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} href={(nextPage) => routeHref({ page: String(nextPage), selected: null }, false)} />
          <footer className={styles.queueFooter}><span><kbd>J K</kbd> move</span><span><kbd>↵</kbd> open record</span>{canManage ? <span><kbd>A</kbd> assign</span> : null}<span>{formatNumber(items.length)} rows on this page</span></footer>
        </div>

        {selectedItem ? (
          <Inspector className={styles.inspector} header={<div><span>{selectedItem.objectLabel}</span><h2>{selectedItem.title}</h2></div>} onClose={() => setSelectedId(null)}>
            <dl className={styles.facts}>
              <div><dt>Owner</dt><dd>{selectedItem.ownerName ?? pretty(selectedItem.ownerRole)}</dd></div>
              <div><dt>Deadline</dt><dd><span className={styles.sla} data-tone={duePresentation(selectedItem.dueAt, referenceTimeMs).tone}>{duePresentation(selectedItem.dueAt, referenceTimeMs).label}</span></dd></div>
              <div><dt>Waiting on</dt><dd>{pretty(selectedItem.waitingParty)}</dd></div>
              <div><dt>State</dt><dd>{pretty(selectedItem.status)}</dd></div>
            </dl>
            <section className={styles.section}><h3>Required next step</h3><p>{selectedItem.description ?? 'Review the linked record and its source evidence before recording an outcome.'}</p></section>
            <section className={styles.section}><h3>Source context</h3><p>{selectedItem.source ? `${pretty(selectedItem.source)} · ${selectedItem.objectLabel}` : 'No source identity is available for this item.'}</p>{selectedItem.blockingReason ? <p className={styles.blocker}>Blocked by: {pretty(selectedItem.blockingReason)}</p> : null}</section>
            {selectedItem.taskKind === 'external_handoff' && typeof selectedItem.sourceMetadata.external_action_id === 'string' ? (
              <section className={styles.section}>
                <h3>Record provider attempt</h3>
                <p>Record only what you performed in Shopify. Provider success remains unconfirmed until a source refund event is observed.</p>
                <Input aria-label="Provider reference" placeholder="Optional Shopify reference" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} maxLength={160} />
                <Button type="button" variant="secondary" size="sm" loading={busy === `${selectedItem.id}:external-attempt`} onClick={() => void reportExternalAttempt(selectedItem)}>Record attempt</Button>
              </section>
            ) : null}
            <div className={styles.inspectorActions}>
              {selectedHref ? <Link href={selectedHref} className={styles.primaryButton}>Open full record</Link> : <button type="button" className={styles.primaryButton} onClick={() => setSelectedException(selectedItem)}>Review exception</button>}
              {selectedItem.kind === 'task' && selectedItem.validActions.length ? <div className={styles.actionGrid}>{selectedItem.validActions.map((action) => <button type="button" key={action} disabled={busy !== null} onClick={() => void act(selectedItem, action)}>{ACTION_LABELS[action]}</button>)}</div> : null}
              {!canManage && selectedItem.kind === 'task' ? <p className={styles.permissionNote}>You can review this item, but your role cannot change its lifecycle.</p> : null}
            </div>
          </Inspector>
        ) : (
          <Inspector className={styles.inspector} header={<h2>Select a work item</h2>}><div className={styles.empty}><p>Its source context, owner, deadline and valid next actions will appear here.</p></div></Inspector>
        )}
      </div>

      <ExceptionResolutionDrawer item={selectedException} onClose={() => setSelectedException(null)} onUpdated={() => router.refresh()} />
    </section>
  );
}
