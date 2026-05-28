'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, Eye, Keyboard, Trash2, UserCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { KbdHint } from '@/components/ui/KbdHint';
import { FLAG_QUEUE_PRIORITISATION } from '@/lib/flags';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import type { ClaimQueueCounts } from '@/lib/claims/queueCounts';

interface InboxTransaction {
  id: string;
  order_id: string;
  /** New identity score (0–100). Replaces legacy match_score. */
  identity_score?: number | null;
  /** New confidence grade (A–F). Replaces legacy risk_level display. */
  identity_confidence_grade?: string | null;
  match_status?: string | null;
  processed_at: string;
  processing_job_id: string;
  customer_profile_id?: string | null;
  order_value?: number | null;
  reason?: string;
  claim_id?: string | null;
  first_viewed_at?: string | null;
  assigned_to?: string | null;
  snoozed_until?: string | null;
  status?: string | null;
}

interface Props {
  initialItems: InboxTransaction[];
  claimQueueCounts?: ClaimQueueCounts | null;
}

type SortKey = 'priority' | 'score' | 'value' | 'date';
export type QueueFilter = 'active' | 'new' | 'viewed' | 'overdue' | 'decision_ready' | 'unassigned';
type CompletionNotice = { message: string; tone: 'success' | 'neutral' } | null;

const REVIEW_SLA_HOURS = 72;

function sortInboxItems(items: InboxTransaction[], sortBy: SortKey): InboxTransaction[] {
  const copy = [...items];
  switch (sortBy) {
    case 'score':
      return copy.sort((a, b) => (b.identity_score ?? 0) - (a.identity_score ?? 0));
    case 'value':
      return copy.sort((a, b) => (b.order_value ?? 0) - (a.order_value ?? 0));
    case 'date':
      return copy.sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime());
    case 'priority':
    default:
      return copy.sort((a, b) => {
        const scoreA = (a.identity_score ?? 0) * (a.order_value ?? 1);
        const scoreB = (b.identity_score ?? 0) * (b.order_value ?? 1);
        return scoreB - scoreA;
      });
  }
}

function hoursSince(iso: string): number {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60));
}

export function queueMeta(tx: InboxTransaction) {
  const viewed = !!tx.first_viewed_at;
  const ageHours = hoursSince(tx.processed_at);
  const overdue = ageHours >= REVIEW_SLA_HOURS;
  const decisionReady = tx.match_status === 'definite' || (tx.identity_score ?? 0) >= 85;
  const dueHours = Math.ceil(REVIEW_SLA_HOURS - ageHours);
  const dueLabel = overdue ? 'Overdue' : dueHours <= 24 ? `Due in ${Math.max(1, dueHours)}h` : `Due in ${Math.ceil(dueHours / 24)}d`;
  const stage = !viewed ? 'New / unread' : decisionReady ? 'Decision ready' : 'Viewed';
  const nextAction = !viewed
    ? 'Open identity evidence'
    : decisionReady
      ? 'Record merchant decision'
      : 'Review behaviour pattern';

  return { viewed, overdue, decisionReady, dueLabel, stage, nextAction };
}

export function matchesInboxQueueFilter(tx: InboxTransaction, queueFilter: QueueFilter): boolean {
  const meta = queueMeta(tx);
  switch (queueFilter) {
    case 'new': return !meta.viewed;
    case 'viewed': return meta.viewed;
    case 'overdue': return meta.overdue;
    case 'decision_ready': return meta.decisionReady;
    case 'unassigned': return !tx.assigned_to;
    case 'active':
    default: return true;
  }
}

export function countInboxQueues(items: InboxTransaction[]): Record<QueueFilter, number> {
  return items.reduce<Record<QueueFilter, number>>((acc, tx) => {
    const meta = queueMeta(tx);
    acc.active += 1;
    if (!meta.viewed) acc.new += 1;
    if (meta.viewed) acc.viewed += 1;
    if (meta.overdue) acc.overdue += 1;
    if (meta.decisionReady) acc.decision_ready += 1;
    if (!tx.assigned_to) acc.unassigned += 1;
    return acc;
  }, { active: 0, new: 0, viewed: 0, overdue: 0, decision_ready: 0, unassigned: 0 });
}

export default function InboxClient({ initialItems, claimQueueCounts = null }: Props) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>(FLAG_QUEUE_PRIORITISATION ? 'priority' : 'date');
  const [items, setItems] = useState<InboxTransaction[]>(() => sortInboxItems(initialItems, sortBy));
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDismissing, setBulkDismissing] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('active');
  const [completionNotice, setCompletionNotice] = useState<CompletionNotice>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems((current) => sortInboxItems(current, sortBy));
  }, [sortBy]);

  const markViewed = useCallback(async (tx: InboxTransaction) => {
    if (!tx.claim_id || tx.first_viewed_at) return;
    const viewedAt = new Date().toISOString();
    setItems((prev) => prev.map((item) => item.id === tx.id ? { ...item, first_viewed_at: viewedAt } : item));
    const res = await fetch(`/api/claims/${tx.claim_id}/view`, { method: 'POST' }).catch(() => null);
    if (res?.ok) router.refresh();
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Number-key shortcuts: 1–5 map to status actions on the first selected item
  // (or the first item in the list when nothing is selected).
  // Keys are ignored when any input / textarea / select / contenteditable is focused.
  const statusShortcuts: Array<'under_review' | 'contacted' | 'resolved' | 'cleared' | '__dismiss__'> = [
    'under_review',
    'contacted',
    'resolved',
    'cleared',
    '__dismiss__',
  ];

  const handleKeyboardShortcut = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const editable = (e.target as HTMLElement).isContentEditable;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || editable) return;

      const digit = parseInt(e.key, 10);
      if (digit < 1 || digit > 5) return;

      // Target: first selected item, fall back to first list item
      const targetId =
        selectedIds.size > 0 ? Array.from(selectedIds)[0] : items[0]?.id;
      if (!targetId) return;

      const tx = items.find((t) => t.id === targetId);
      if (!tx) return;

      const action = statusShortcuts[digit - 1];
      if (action === '__dismiss__') {
        dismissItem(tx.id);
      } else {
        setStatusAndDismiss(tx, action);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, selectedIds],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleKeyboardShortcut]);

  async function dismissItem(txId: string) {
    // Optimistic remove
    setItems((prev) => prev.filter((t) => t.id !== txId));
    setCompletionNotice({ message: 'Removed from the active inbox. The audit row remains available in history.', tone: 'neutral' });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(txId);
      return next;
    });
    try {
      await fetch(`/api/transactions/${txId}/dismiss`, { method: 'PATCH' });
    } catch {
      // Revert on error — refetch would be complex, just leave removed
    }
  }

  async function setStatusAndDismiss(tx: InboxTransaction, status: 'under_review' | 'contacted' | 'resolved' | 'cleared') {
    setOpenDropdown(null);
    await markViewed(tx);
    if (!tx.customer_profile_id) {
      // No profile — just dismiss
      await dismissItem(tx.id);
      return;
    }

    setPending((p) => ({ ...p, [tx.id]: true }));
    // Optimistic remove from inbox
    setItems((prev) => prev.filter((t) => t.id !== tx.id));

    try {
      // Set investigation status on customer profile
      await fetch(`/api/customers/${tx.customer_profile_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Dismiss transaction
      await fetch(`/api/transactions/${tx.id}/dismiss`, { method: 'PATCH' });
      const messages: Record<typeof status, string> = {
        under_review: 'Moved to in review and removed from the active inbox.',
        contacted: 'Marked awaiting response and removed from the active inbox.',
        resolved: 'Merchant outcome recorded as resolved. The item left the active inbox.',
        cleared: 'Marked no further action and removed from the active inbox.',
      };
      setCompletionNotice({ message: `${messages[status]} ${Math.max(0, items.length - 1)} active ${items.length - 1 === 1 ? 'item' : 'items'} remain on this page.`, tone: 'success' });
    } catch {
      // Already removed optimistically — no revert needed for status change
    } finally {
      setPending((p) => { const n = { ...p }; delete n[tx.id]; return n; });
    }
  }

  async function bulkDismissSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Dismiss ${selectedIds.size} case${selectedIds.size === 1 ? '' : 's'} from the inbox?`)) return;
    const ids = Array.from(selectedIds);
    setBulkDismissing(true);
    setItems((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    try {
      await fetch('/api/inbox/bulk-dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setCompletionNotice({ message: `${ids.length} selected items left the active inbox.`, tone: 'success' });
    } finally {
      setBulkDismissing(false);
    }
  }

  const queueCounts = countInboxQueues(items);

  const filteredItems = items.filter((tx) => matchesInboxQueueFilter(tx, queueFilter));

  if (items.length === 0) {
    const inboxIcon = (
      <svg className="h-8 w-8" style={{ color: 'var(--icon-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.151 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
      </svg>
    );

    const shortcutsLegend = (
      <div
        className="rounded-md px-4 py-3 max-w-xs mx-auto text-left"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--text-muted)' }}>
          <Keyboard className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Keyboard shortcuts</span>
        </div>
        <ul className="space-y-1">
          {[
            ['1', 'Mark as Under review'],
            ['2', 'Mark awaiting response'],
            ['3', 'Record resolved'],
            ['4', 'Mark no further action'],
            ['5', 'Clear from inbox'],
          ].map(([key, label]) => (
            <li key={key} className="flex items-center gap-2">
              <kbd
                className="inline-flex items-center justify-center rounded text-xs font-mono px-1.5 py-0.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  minWidth: '1.5rem',
                }}
              >
                {key}
              </kbd>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    );

    return (
      <div className="rounded-[4px]" style={{ border: '1.5px dashed var(--border)' }}>
        <EmptyState
          icon={inboxIcon}
          title="You're all caught up"
          description="No identity-flagged transactions need review right now."
          action={
            <Link
              href="/upload"
              className="text-sm font-medium underline underline-offset-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Upload a CSV to get started ›
            </Link>
          }
          footer={shortcutsLegend}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {completionNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: completionNotice.tone === 'success' ? '#86efac' : 'var(--border-subtle)',
            background: completionNotice.tone === 'success' ? '#dcfce7' : 'var(--bg-inset)',
            color: completionNotice.tone === 'success' ? '#166534' : 'var(--text)',
          }}
        >
          <span>{completionNotice.message}</span>
          <button type="button" onClick={() => setCompletionNotice(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-md border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              Active operational inbox
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Unresolved identity reviews only. Opening a linked claim marks it read in Claims — it leaves New / unread but stays Active until resolved.
            </p>
            {claimQueueCounts && (
              <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                Claims workload: {claimQueueCounts.active.toLocaleString()} active · {claimQueueCounts.unread.toLocaleString()} new/unread · {claimQueueCounts.overdue.toLocaleString()} overdue
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-caption" style={{ color: 'var(--text-muted)' }}>
            Sort by
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text)' }}
            >
              <option value="priority">Priority (score x value)</option>
              <option value="score">Identity score</option>
              <option value="value">Order value</option>
              <option value="date">Most recent</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Inbox filters">
          {[
            { key: 'active' as QueueFilter, label: 'Active', icon: Clock3 },
            { key: 'new' as QueueFilter, label: 'New / unread', icon: Eye },
            { key: 'viewed' as QueueFilter, label: 'Viewed', icon: CheckCircle2 },
            { key: 'overdue' as QueueFilter, label: 'Overdue', icon: AlertTriangle },
            { key: 'decision_ready' as QueueFilter, label: 'Decision ready', icon: CheckCircle2 },
            { key: 'unassigned' as QueueFilter, label: 'Unassigned', icon: UserCircle2 },
          ].map((filter) => {
            const active = queueFilter === filter.key;
            const Icon = filter.icon;
            return (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setQueueFilter(filter.key)}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                  background: active ? 'var(--accent)' : 'var(--bg-inset)',
                  color: active ? 'var(--text-inverse)' : 'var(--text-muted)',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
                <span className="font-mono">{queueCounts[filter.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-caption" style={{ color: 'var(--text-muted)' }}>
          {queueFilter === 'new'
            ? `Showing ${filteredItems.length} of ${queueCounts.new} new unread ${queueCounts.new === 1 ? 'item' : 'items'}`
            : queueFilter === 'unassigned'
              ? `Showing ${filteredItems.length} of ${queueCounts.unassigned} unassigned ${queueCounts.unassigned === 1 ? 'item' : 'items'}`
              : queueFilter === 'overdue'
                ? `Showing ${filteredItems.length} of ${queueCounts.overdue} overdue ${queueCounts.overdue === 1 ? 'item' : 'items'}`
                : `Showing ${filteredItems.length} of ${items.length} active ${items.length === 1 ? 'item' : 'items'}`}
        </p>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-between gap-3 border-t px-6" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)', boxShadow: 'var(--shadow-drawer)' }}>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="t-label" style={{ color: 'var(--ink-secondary)' }}>{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkDismissSelected}
              disabled={bulkDismissing}
              className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ background: 'var(--sev-definite)', color: 'var(--ink-primary)', border: '1px solid var(--sev-definite)' }}
            >
              {bulkDismissing ? 'Dismissing…' : 'Dismiss selected'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} disabled={bulkDismissing} className="text-xs font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="rounded-md border px-4 py-8 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
          No active items match this filter.
        </div>
      ) : (
      <div className="overflow-x-auto border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 4 }}>
      <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <th className="text-left px-4 py-2.5 text-overline" style={{ width: 44, color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setSelectedIds(new Set());
                    return;
                  }
                  setSelectedIds(new Set(filteredItems.map((item) => item.id)));
                }}
                aria-label="Select all inbox items"
              />
            </th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Order ID</th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Queue state</th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Owner</th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Confidence</th>
            <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Score</th>
            <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Value</th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Match signals</th>
            <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Due / next action</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((tx, rowIdx) => {
            const isTopRow = rowIdx === 0 && FLAG_QUEUE_PRIORITISATION && items.length > 1;
            const priorityScore = Math.round((tx.identity_score ?? 0) * (tx.order_value ?? 1));
            const isSelected = selectedIds.has(tx.id);
            const meta = queueMeta(tx);
            return (
              <tr
                key={tx.id}
                className="group border-b transition-colors hover:bg-[var(--surface-overlay)]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  opacity: pending[tx.id] ? 0.5 : 1,
                  background: isSelected ? 'var(--copper-glow)' : isTopRow ? 'var(--accent-50, var(--bg-surface-alt))' : undefined,
                  borderLeft: isSelected ? '3px solid var(--copper-bright)' : isTopRow ? '3px solid var(--copper-bright)' : undefined,
                }}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(tx.id);
                      else next.delete(tx.id);
                      setSelectedIds(next);
                    }}
                    aria-label={`Select order ${tx.order_id}`}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div>
                    <span className={!meta.viewed ? 'font-semibold' : undefined} style={{ color: !meta.viewed ? 'var(--text)' : undefined }}>
                      {tx.order_id}
                    </span>
                    {isTopRow && (
                      <div
                        className="mt-0.5 text-[10px] font-medium"
                        style={{ color: 'var(--accent-600, var(--accent))' }}
                        title={`Priority score: confidence (${Math.round(tx.identity_score ?? 0)}) × order value (${tx.order_value != null ? '£' + tx.order_value.toFixed(0) : '—'}) = ${priorityScore}`}
                      >
                        ★ Why this is first: highest confidence × value (priority score {priorityScore})
                      </div>
                    )}
                  </div>
                </td>
              <td className="px-4 py-3 text-xs">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    background: !meta.viewed ? 'var(--accent)' : meta.decisionReady ? 'var(--sev-clear-fill,#DCFCE7)' : 'var(--bg-subtle)',
                    color: !meta.viewed ? 'var(--text-inverse)' : meta.decisionReady ? 'var(--sev-clear,#166534)' : 'var(--text-muted)',
                  }}
                >
                  {meta.stage}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {tx.assigned_to ? 'Assigned' : 'Unassigned'}
              </td>
              <td className="px-4 py-3">
                <ConfidenceBadge
                  grade={riskLevelToNewGrade(tx.identity_confidence_grade ?? tx.match_status)}
                  size="sm"
                />
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>
                {tx.identity_score != null ? Math.round(tx.identity_score) : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--text)' }}>
                {tx.order_value != null ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(tx.order_value) : '—'}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {tx.reason ?? 'Needs manual review'}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="block font-semibold" style={{ color: meta.overdue ? 'var(--sev-high,#991B1B)' : 'var(--text)' }}>{meta.dueLabel}</span>
                <span className="block">{meta.nextAction}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2" ref={openDropdown === tx.id ? dropdownRef : undefined}>
                  <Link
                    href={
                      tx.claim_id && tx.customer_profile_id
                        ? `/customers/${tx.customer_profile_id}/claims?claimId=${tx.claim_id}`
                        : tx.customer_profile_id
                          ? `/customers/${tx.customer_profile_id}`
                          : `/audit/${tx.processing_job_id}/transaction/${tx.id}`
                    }
                    onClick={() => { void markViewed(tx); }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {tx.claim_id ? 'Review & record' : 'Review identity'}
                  </Link>
                  {tx.customer_profile_id && !tx.claim_id && (
                    <Link
                      href={`/customers/${tx.customer_profile_id}/claims`}
                      className="text-xs font-semibold hover:underline hidden lg:inline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Claim workflow
                    </Link>
                  )}
                  <Link
                    href={`/audit/${tx.processing_job_id}/transaction/${tx.id}`}
                    onClick={() => { void markViewed(tx); }}
                    className="text-xs font-semibold hover:underline hidden md:inline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Audit
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === tx.id ? null : tx.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all"
                      style={{
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      Set status <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === tx.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-20 rounded-md shadow-lg border overflow-hidden"
                        style={{
                          background: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          minWidth: '180px',
                        }}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'under_review')}
                        >
                          Mark as Under review
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'contacted')}
                        >
                          Mark awaiting response
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'resolved')}
                        >
                          Resolve and close case
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'cleared')}
                        >
                          Mark no further action
                        </button>
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => { setOpenDropdown(null); dismissItem(tx.id); }}
                          >
                          Remove from inbox only
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      )}
      <div className="flex justify-end">
        <KbdHint pairs={[['J/K', 'navigate'], ['↵', 'open'], ['S', 'watchlist']]} />
      </div>
    </div>
  );
}
