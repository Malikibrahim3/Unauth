'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Work-Clean';
import { consumeSuppliedText } from '@/components/visual-authority/bindSuppliedTree';
import { formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import type { WorkAction, WorkQueueItem, WorkViewCounts } from '@/lib/work/types';
import { Modal } from '@/components/ui/Modal';
import { SavedWorkViews } from '@/components/work/SavedWorkViews';

type Props = {
  items: WorkQueueItem[];
  total: number;
  viewCounts: WorkViewCounts;
  page: number;
  pageSize: number;
  asOf: string;
  currentUserId: string;
  canManage: boolean;
  sourceNotice: string | null;
};

const SOURCE_ROWS = [
  ['CASE-4187', '#AS-88214 · UPS', 'Maya Cheng', 'Not delivered', '£4,180.00', '4h left'],
  ['CASE-4193', '#AS-88301 · UPS', 'Jonah Baptiste', 'Not delivered', '£248.00', '9h left'],
  ['CASE-4191', '#AS-88296 · Evri', 'Alina Sorescu', 'Damaged on arrival', '£132.50', '14h left'],
  ['CASE-4186', '#AS-88277 · Royal Mail', 'Hannah Boyle', 'Return never scanned', '£226.00', '22h left'],
  ['CASE-4188', '#AS-88289 · ShipBob', 'Théo Marchand', 'Wrong item sent', '£96.00', '3 days'],
  ['CASE-4181', '#AS-88189 · Visa', 'Hannah Boyle', 'Chargeback · not received', '£333.00', '4 days'],
  ['CASE-4176', '#AS-88176 · Evri', 'Alina Sorescu', 'Damaged on arrival', '£224.40', '5 days'],
  ['CASE-4171', '#AS-88190 · ShipBob', 'Théo Marchand', 'Wrong item sent', '£188.00', '6 days'],
  ['CASE-4165', '#AS-88041 · Royal Mail', 'Priya Nandal', 'Photo requested', '£486.00', 'customer · 32h'],
  ['CASE-4159', '#AS-87996 · UPS', 'Jonah Baptiste', 'Carrier chase open', '£74.20', 'carrier · 41 days'],
] as const;

function subscribeCompactDesk(onChange: () => void) {
  const query = window.matchMedia('(max-width: 1280px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const compactDeskSnapshot = () => window.matchMedia('(max-width: 1280px)').matches;

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

function pretty(value: string | null): string {
  if (!value) return 'Unassigned';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function itemValue(item: WorkQueueItem): string {
  const value = item.sourceMetadata.amount_display ?? item.sourceMetadata.amount ?? item.sourceMetadata.value_display;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Unavailable';
}

function valueSummary(input: readonly WorkQueueItem[]) {
  if (input.some((item) => !item.supportPayoutCaseId)) return '—';
  const items = [...new Map(input.map((item) => [item.supportPayoutCaseId, item])).values()];
  const currencies = new Set(items.map((item) => item.sourceMetadata.currency));
  if (!items.length || currencies.size !== 1 || typeof [...currencies][0] !== 'string'
    || items.some((item) => typeof item.sourceMetadata.amount_minor !== 'number' || !Number.isSafeInteger(item.sourceMetadata.amount_minor))) return '—';
  return formatMinorCurrencyNullable(items.reduce((sum, item) => sum + Number(item.sourceMetadata.amount_minor), 0), String([...currencies][0]));
}

function itemReference(item: WorkQueueItem): string {
  const value = item.sourceMetadata.order_ref ?? item.sourceMetadata.reference ?? item.sourceMetadata.case_ref;
  return typeof value === 'string' ? value : item.source ? pretty(item.source) : 'Source unavailable';
}

function itemPerson(item: WorkQueueItem): string {
  const value = item.sourceMetadata.customer_name ?? item.sourceMetadata.customer;
  return typeof value === 'string' ? value : 'Customer unavailable';
}

function workGroups(items: readonly WorkQueueItem[], referenceTimeMs: number) {
  const waiting = items.filter((item) => Boolean(item.waitingParty) && !['merchant', 'workspace', 'internal', 'team'].includes(item.waitingParty!.toLowerCase()));
  const actionable = items.filter((item) => !waiting.includes(item));
  const today = actionable.filter((item) => item.dueAt && Date.parse(item.dueAt) <= referenceTimeMs + 86_400_000);
  return { today, upcoming: actionable.filter((item) => !today.includes(item)), waiting };
}

function dueLabel(item: WorkQueueItem, referenceTimeMs: number): string {
  if (!item.dueAt || Number.isNaN(Date.parse(item.dueAt))) return item.waitingParty ? `${pretty(item.waitingParty).toLowerCase()} · waiting` : 'No deadline';
  const difference = Date.parse(item.dueAt) - referenceTimeMs;
  const hours = Math.max(1, Math.ceil(Math.abs(difference) / 3_600_000));
  if (difference < 0) return `breached ${hours}h`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.ceil(hours / 24)} days`;
}

function itemHref(item: WorkQueueItem): string | null {
  return item.objectHref;
}

function addReplacement(queues: Map<string, string[]>, source: string, replacement: string): void {
  const queue = queues.get(source) ?? [];
  queue.push(replacement);
  queues.set(source, queue);
}

function sourceRowIndex(node: ReactElement<{ style?: CSSProperties }>, text: string): number {
  if (node.props.style?.display !== 'flex' || node.props.style?.gap !== '13px' || node.props.style?.padding !== '10px 14px') return -1;
  return SOURCE_ROWS.findIndex(([reference]) => text.startsWith(reference));
}

function isSelectionBox(node: ReactElement<{ style?: CSSProperties }>): boolean {
  return node.type === 'span'
    && node.props.style?.width === '14px'
    && node.props.style?.height === '14px'
    && node.props.style?.borderRadius === '4px';
}

function bindWorkTree(
  node: ReactNode,
  replaceText: (value: string) => string,
  items: readonly WorkQueueItem[],
  selectedIds: ReadonlySet<string>,
  toggle: (id: string) => void,
  navigate: (item: WorkQueueItem) => void,
  runAction: (item: WorkQueueItem, action: 'hold' | 'review') => void,
  globalActions: ReadonlyMap<string, () => void>,
  inheritedItem: WorkQueueItem | null = null,
  ancestorHasAction = false,
  compactDesk = false,
  referenceTimeMs = Date.now(),
): ReactNode {
  if (typeof node === 'string') return replaceText(node);
  if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return node;
  const sourceText = compactText(node);
  const index = sourceRowIndex(node, sourceText);
  if (node.props.style?.background === '#1c1f23' && sourceText.startsWith('4 selected')) return null;
  if (index >= 0 && !inheritedItem) {
    const groups = workGroups(items, referenceTimeMs);
    const group = index === 0 ? groups.today : index === 4 ? groups.upcoming : index === 8 ? groups.waiting : null;
    if (!group) return null;
    return group.map((row) => {
      const source = SOURCE_ROWS[index];
      const replacements = [row.objectLabel, itemReference(row), itemPerson(row), row.title, itemValue(row), dueLabel(row, referenceTimeMs)];
      const rowText = (value: string) => {
        const position = source.findIndex((token) => token === value);
        return position < 0 ? value : replacements[position];
      };
      return bindWorkTree(node, rowText, items, selectedIds, toggle, navigate, runAction, globalActions, row, false, compactDesk, referenceTimeMs);
    });
  }
  const item = inheritedItem;
  const props: Record<string, unknown> = {};

  if (index >= 0 && item) {
    const selected = selectedIds.has(item.key);
    props.key = item.key;
    props.style = { ...node.props.style, alignItems: 'flex-start' };
    props['data-work-item-id'] = item.id;
    props['data-selected'] = selected || undefined;
  }
  if (item && isSelectionBox(node)) {
    props.role = 'checkbox';
    props.tabIndex = 0;
    props['aria-checked'] = selectedIds.has(item.key);
    props['aria-label'] = `Select ${item.objectLabel}`;
    props.style = { width: '14px', height: '14px', flex: 'none', borderRadius: '4px', ...(selectedIds.has(item.key)
      ? { background: '#1c1f23', display: 'flex', alignItems: 'center', justifyContent: 'center' }
      : { boxShadow: 'inset 0 0 0 1.3px rgba(28,27,25,.2)' }) };
    props.onClick = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      event.preventDefault();
      event.stopPropagation();
      toggle(item.key);
    };
  } else if (item && node.type === 'a') {
    props.href = itemHref(item) ?? '/work';
    props.onClick = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      navigate(item);
    };
  } else if (!ancestorHasAction && item && ['Hold', 'Refund', 'Review account', 'Nudge', 'Chase'].includes(sourceText)) {
    if (sourceText === 'Hold') return null;
    props.role = 'button';
    props.tabIndex = 0;
    props.onClick = () => runAction(item, sourceText === 'Hold' ? 'hold' : 'review');
  } else if (!ancestorHasAction && globalActions.has(sourceText)) {
    const action = globalActions.get(sourceText)!;
    props.role = node.type === 'a' ? undefined : 'button';
    props.tabIndex = node.type === 'a' ? undefined : 0;
    props.onClick = (event: { preventDefault?: () => void }) => {
      event.preventDefault?.();
      action();
    };
  }

  if (props.onClick && node.type !== 'a') {
    props.onKeyDown = (event: { key: string; preventDefault: () => void; stopPropagation: () => void }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      (props.onClick as (input: typeof event) => void)(event);
      event.preventDefault();
      event.stopPropagation();
    };
  }

  if (typeof node.type === 'string' && sourceText.includes('DECIDE TODAY') && sourceText.includes('WAITING ON SOMEONE ELSE')) {
    props['data-surface-id'] = 'work-queue';
    props['data-reference-id'] = 'Work-Clean';
    props['data-route-state'] = 'loaded';
  }
  let children = Children.map(node.props.children, (child) => bindWorkTree(
    child,
    replaceText,
    items,
    selectedIds,
    toggle,
    navigate,
    runAction,
    globalActions,
    item,
    ancestorHasAction || Boolean(props.onClick),
    compactDesk,
    referenceTimeMs,
  ));
  if (item && isSelectionBox(node)) {
    children = selectedIds.has(item.key) ? [<svg key="selected" width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.2 4.1 7.3 8 3.2" /></svg>] : [];
  }
  if (item && props.onClick && ['Hold', 'Refund', 'Review account', 'Nudge', 'Chase'].includes(sourceText)) {
    children = [sourceText === 'Hold' ? 'Snooze 1 day' : 'Review'];
  }
  if (item && node.props.style?.width === '10px' && node.props.style?.height === '10px') {
    props.style = { ...node.props.style, background: '#e4e3e0' };
    props.title = 'Evidence coverage unavailable';
  }
  if (item && node.props.style?.height === '100%' && typeof node.props.style?.width === 'string' && node.props.style.width.endsWith('%')) {
    const valueBar = node.props.style.background === '#1c1f23';
    const amount = item.sourceMetadata.amount_minor;
    const comparable = items.filter((other) => other.sourceMetadata.currency === item.sourceMetadata.currency)
      .map((other) => other.sourceMetadata.amount_minor).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const maximum = Math.max(0, ...comparable);
    const start = Date.parse(item.createdAt);
    const end = item.dueAt ? Date.parse(item.dueAt) : NaN;
    const fraction = valueBar
      ? typeof amount === 'number' && Number.isFinite(amount) && maximum > 0 ? amount / maximum : null
      : Number.isFinite(start) && Number.isFinite(end) && end > start ? (referenceTimeMs - start) / (end - start) : null;
    props.style = { ...node.props.style, width: `${fraction == null ? 0 : Math.max(0, Math.min(1, fraction)) * 100}%` };
    props.title = fraction == null ? 'Unavailable' : valueBar ? 'Relative to shown amounts in this currency' : 'Elapsed time to recorded deadline';
  }
  if (node.type === 'svg' && (node.props as { width?: string }).width === '118') {
    props.role = 'img';
    props['aria-label'] = 'Historical queue depth unavailable';
    children = Children.map(children, (child) => !isValidElement<Record<string, unknown>>(child) ? child : cloneElement(child, {
      ...(child.props.d ? {d: ''} : {}),
      ...(child.props.points ? {points: ''} : {}),
      ...(child.type === 'circle' ? {r: 0} : {}),
    }));
  }
  if (index >= 0 && item) {
    props.style = { ...node.props.style, display: 'grid', alignItems: 'start', gridTemplateColumns: '14px minmax(140px,1.1fr) minmax(160px,1.5fr) 56px 130px 104px 70px', gap: '6px 13px' };
    let field = 0;
    children = Children.map(children, (child) => {
      if (!isValidElement<{ style?: CSSProperties; children?: ReactNode }>(child)) return child;
      const position = field++;
      if (position === 2 || position === 7) return null;
      const column = position < 2 ? position + 1 : position === 8 ? 7 : position;
      return cloneElement(child, { style: { ...child.props.style, width: 'auto', minWidth: 0, whiteSpace: 'normal', overflow: 'visible', gridColumn: column, gridRow: 1 } });
    });
    children = [...Children.toArray(children), <div key="task-context" style={{ gridColumn: '2 / -1', font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>
      {pretty(item.status)} · {pretty(item.priority)} · Owner: {item.ownerName ?? (item.ownerUserId ? 'Assigned member' : 'Unassigned')} · {itemPerson(item)}
      <div>{item.blockingReason ?? item.description ?? 'Review the linked record for evidence and next steps.'}{item.recoveryCaseId ? ' Recovery follow-up is separate from the case decision.' : ''}</div>
    </div>];
  }
  return cloneElement(node as ReactElement, props, children);
}

export function ExactWorkQueueOperations({ items, total, page, pageSize, asOf, canManage, sourceNotice, viewCounts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const compactDesk = useSyncExternalStore(subscribeCompactDesk, compactDeskSnapshot, () => false);
  const referenceTimeMs = Number.isFinite(Date.parse(asOf)) ? Date.parse(asOf) : Date.now();
  const scope = searchParams.toString();
  const [selection, setSelection] = useState<{ scope: string; ids: Set<string> }>({ scope, ids: new Set() });
  const selectedIds = useMemo(() => new Set(selection.scope === scope ? [...selection.ids].filter((id) => items.some((item) => item.key === id)) : []), [selection, scope, items]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: WorkAction; items: WorkQueueItem[]; keys: string[]; until: string; done: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const toggle = useCallback((id: string) => setSelection((current) => {
    const ids = new Set(current.scope === scope ? current.ids : []);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    return { scope, ids };
  }), [scope]);
  const review = (action: WorkAction, targets: WorkQueueItem[]) => {
    if (!canManage || !targets.length || targets.some((item) => !item.validActions.includes(action))) return;
    setError(null);
    setPending({ action, items: [...targets], keys: targets.map(() => crypto.randomUUID()), until: new Date(Date.now() + 86_400_000).toISOString(), done: [] });
  };
  async function confirmAction() {
    if (!pending || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const done = [...pending.done];
    try {
      for (const [index, item] of pending.items.entries()) {
        if (done.includes(item.key)) continue;
        const response = await fetch(`/api/work-tasks/${item.id}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': pending.keys[index] },
          body: JSON.stringify({ action: pending.action, expectedVersion: item.stateVersion, ...(pending.action === 'snooze' ? { until: pending.until } : {}) }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? 'Task result unavailable. Retry this review with the same action identity, or close and refresh to inspect its state.');
        done.push(item.key);
        setPending({ ...pending, done: [...done] });
      }
      setNotice(`${done.length} task updates recorded. Case decisions and recovery outcomes are unchanged.`);
      setPending(null);
      setSelection({ scope, ids: new Set() });
      router.refresh();
    } catch (reason) {
      setError(`${done.length} of ${pending.items.length} updates confirmed. ${reason instanceof Error ? reason.message : 'Result unavailable; retry this review or refresh the queue.'}`);
    } finally { inFlight.current = false; setBusy(false); }
  }
  const navigate = useCallback((item: WorkQueueItem) => {
    const href = itemHref(item);
    if (href) router.push(href);
  }, [router]);
  const runAction = useCallback((item: WorkQueueItem) => navigate(item), [navigate]);

  const bound = useMemo(() => {
    const queues = new Map<string, string[]>();
    const visible = items;
    const groups = workGroups(visible, referenceTimeMs);
    const selected = items.filter((item) => selectedIds.has(item.key));
    const selectedValue = valueSummary(selected);
    addReplacement(queues, '23 items · £10,006.00 at risk', `${formatNumber(total)} matching queue items · ${visible.length} displayed on this page`);
    addReplacement(queues, 'peak 41 · now 23', `history unavailable · now ${formatNumber(total)}`);
    addReplacement(queues, '4 items', `${groups.today.length} shown`);
    addReplacement(queues, '7 items', `${groups.upcoming.length} shown`);
    addReplacement(queues, '12 items', `${groups.waiting.length} shown`);
    if (searchParams.get('view') === 'completed') {
      addReplacement(queues, 'DECIDE TODAY', 'CLOSED · RECORDED DEADLINES');
      addReplacement(queues, 'THIS WEEK', 'CLOSED · OTHER DEADLINES');
      addReplacement(queues, 'WAITING ON SOMEONE ELSE', 'CLOSED · EXTERNAL CONTEXT');
    } else if (searchParams.get('view') === 'snoozed') addReplacement(queues, 'DECIDE TODAY', 'SNOOZED · RECORDED DEADLINES');
    addReplacement(queues, 'a window closes within 24 hours', 'due within 24 hours or already overdue');
    addReplacement(queues, 'evidence complete, no rule matched', 'review source evidence');
    addReplacement(queues, 'nothing you can do today', 'waiting on a recorded external party');
    if (groups.upcoming.some((item) => !item.dueAt || !Number.isFinite(Date.parse(item.dueAt)) || Date.parse(item.dueAt) > referenceTimeMs + 7 * 86_400_000)) addReplacement(queues, 'THIS WEEK', 'UPCOMING OR UNSCHEDULED');
    addReplacement(queues, '£4,786.50', `Shown cases: ${valueSummary(groups.today)}`);
    addReplacement(queues, '£2,904.00', `Shown cases: ${valueSummary(groups.upcoming)}`);
    addReplacement(queues, '£2,315.50', `Shown cases: ${valueSummary(groups.waiting)}`);
    addReplacement(queues, 'Reason: carrier evidence complete', 'Selection applies to this page only');
    addReplacement(queues, '10 seconds to undo', 'Changes are recorded');
    SOURCE_ROWS.forEach(([sourceRef, sourceOrder, sourcePerson, sourceReason, sourceValue, sourceDue], index) => {
      const item = visible[index];
      if (!item) return;
      addReplacement(queues, sourceRef, item.objectLabel);
      addReplacement(queues, sourceOrder, itemReference(item));
      addReplacement(queues, sourcePerson, itemPerson(item));
      addReplacement(queues, sourceReason, item.title);
      addReplacement(queues, sourceValue, itemValue(item));
      addReplacement(queues, sourceDue, dueLabel(item, referenceTimeMs));
    });
    addReplacement(queues, '10 of 23 shown · the other 13 are all under £40 and will be auto-refunded by rule 01', `${formatNumber(visible.length)} of ${formatNumber(total)} shown · every item retains its source and deadline`);
    addReplacement(queues, '4 selected', `${formatNumber(selected.length)} selected`);
    addReplacement(queues, '£4,786.50 at risk · all four windows close today', `${selectedValue} at risk · review before acting`);
    addReplacement(queues, 'Assigned: me', searchParams.get('assignee') === 'mine' ? 'Assigned: me' : 'Assigned: all');
    addReplacement(queues, 'Refund all four', selected.length > 1 ? 'Review first selected' : 'Review selected');
    const replaceText = (value: string) => consumeSuppliedText(value, queues);
    const route = (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('selected');
      Object.entries(updates).forEach(([key, value]) => next.set(key, value));
      router.push(`/work?${next}`);
    };
    const actions = new Map<string, () => void>([
      ['Assigned: me', () => route({ assignee: searchParams.get('assignee') === 'mine' ? '' : 'mine', page: '1' })],
      ['Cause: all', () => setError('Cause filtering is unavailable for this queue. The current filters have not changed.')],
      ['Value: any', () => setError('Value filtering is unavailable for this queue. Missing amounts are not treated as zero.')],
      ['Sort by value', () => setError('Value sorting is unavailable for this queue. The current server ordering has not changed.')],
      ['Show the rest', () => { if (page * pageSize < total) route({ page: String(page + 1) }); }],
      
      ['Refund all four', () => { if (selected[0]) navigate(selected[0]); }],
      ['Review selected', () => { if (selected[0]) navigate(selected[0]); }],
      [`Review all ${selected.length}`, () => { if (selected[0]) navigate(selected[0]); }],
    ]);
    return bindWorkTree(SuppliedVisualBody(), replaceText, visible, selectedIds, toggle, navigate, runAction, actions, null, false, compactDesk, referenceTimeMs);
  }, [compactDesk, items, navigate, page, pageSize, referenceTimeMs, router, runAction, searchParams, selectedIds, toggle, total]);

  const selected = items.filter((item) => selectedIds.has(item.key));
  const actionLabels: Record<WorkAction, string> = { assign_to_me: 'Assign to me', release: 'Release assignment', start: 'Start task', snooze: 'Snooze 1 day', complete: 'Complete task', reopen: 'Reopen task' };
  const selectionButton: CSSProperties = { border: '1px solid rgba(255,255,255,.22)', borderRadius: 8, background: '#1c1f23', color: '#ffffff', padding: '7px 10px', font: "400 12px/1.4 'Inter',sans-serif", cursor: 'pointer' };
  const pageLink = (nextPage: number) => { const query = new URLSearchParams(scope); query.set('page', String(nextPage)); query.delete('selected'); return `/work?${query}`; };
  return (
    <>
      <p style={{ margin: 0, padding: '8px 22px', fontSize: 11, color: '#64686d' }}>Workspace open tasks: {Math.max(0, viewCounts.open - viewCounts['integration-exceptions'])} · Open queue including exceptions: {viewCounts.open} · Assigned to me: {viewCounts.mine} · Integration exceptions: {viewCounts['integration-exceptions']} · This page: {items.filter((item) => item.kind === 'task').length} tasks, {items.filter((item) => item.kind === 'exception').length} exceptions. Open counts exclude completed and cancelled tasks; snoozed work has its own view. Group amounts count distinct shown cases and are not additive across groups.</p>
      {notice ? <p role="status">{notice}</p> : null}
      {[ 'view', 'search', 'priority', 'sort', 'savedView'].some((key) => searchParams.has(key)) ? <SavedWorkViews /> : null}
      {sourceNotice ? <p style={{ margin: 0, padding: '8px 22px', background: '#fff3e9', color: '#8a4b2e', fontSize: 11 }}>{sourceNotice}</p> : null}
      {error ? <p role="alert" style={{ margin: 0, padding: '8px 22px', background: '#fdf0e6', color: '#b0431a', fontSize: 11 }}>{error}</p> : null}
      {bound}
      {!items.length ? <p role="status">{total ? 'No items on this page. Return to page 1 to see the matching queue.' : 'No items match this queue view.'}</p> : null}
      <nav aria-label="Work pages" style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: 10, fontSize: 12 }}>
        {page > 1 ? <a href={pageLink(page - 1)}>Previous</a> : null}
        <span>Page {page} · {items.length} of {total} matching items displayed</span>
        {page * pageSize < total ? <a href={pageLink(page + 1)}>Show next {Math.min(pageSize, total - page * pageSize)} items</a> : null}
      </nav>
      {selected.length ? <div aria-label="Selected work actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#1c1f23', color: '#ffffff', fontSize: 12 }}>
        <span>{selected.length} selected on this page</span>
        <button style={selectionButton} onClick={() => setSelection({ scope, ids: new Set() })}>Clear selection</button>
        {selected[0]?.objectHref ? <button style={selectionButton} onClick={() => navigate(selected[0])}>Review first selected</button> : null}
        {canManage ? (Object.keys(actionLabels) as WorkAction[]).filter((action) => selected.every((item) => item.validActions.includes(action))).map((action) => <button style={selectionButton} key={action} onClick={() => review(action, selected)}>{actionLabels[action]}</button>) : null}
      </div> : null}
      <Modal overlayId="work-task-review" open={pending != null} onClose={() => { setPending(null); router.refresh(); }} pending={busy} title={pending ? actionLabels[pending.action] : 'Review task update'} actions={[{ label: pending?.done.length ? 'Retry remaining updates' : 'Confirm task update', onClick: () => void confirmAction() }]}>
        <p>This updates only the listed Work tasks and records an audit event for each. It does not change a case decision, submit a provider claim or record a recovery outcome.</p>
        {pending && ['start', 'snooze'].includes(pending.action) && pending.items.some((item) => !item.ownerUserId) ? <p>Currently unassigned tasks will also be assigned to you by this action.</p> : null}
        {pending?.action === 'snooze' ? <p>Snoozed until {pending.until}. Deadlines remain unchanged.</p> : null}
        <ul>{pending?.items.map((item) => <li key={item.key}>{item.objectLabel} · {item.title} · {item.status} · version {item.stateVersion}{pending.done.includes(item.key) ? ' · Update confirmed' : ''}</li>)}</ul>
        {error ? <p role="alert">{error}</p> : null}
      </Modal>
    </>
  );
}
