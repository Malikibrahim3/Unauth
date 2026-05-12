'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown, Trash2, Keyboard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FLAG_QUEUE_PRIORITISATION } from '@/lib/flags';

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
}

interface Props {
  initialItems: InboxTransaction[];
}

function formatInboxDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function InboxClient({ initialItems }: Props) {
  // Phase E-6: sort by confidence × exposure when flag is on
  const sortedInitial = FLAG_QUEUE_PRIORITISATION
    ? [...initialItems].sort((a, b) => {
        const scoreA = (a.identity_score ?? 0) * (a.order_value ?? 1);
        const scoreB = (b.identity_score ?? 0) * (b.order_value ?? 1);
        return scoreB - scoreA;
      })
    : initialItems;

  const [items, setItems] = useState<InboxTransaction[]>(sortedInitial);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDismissing, setBulkDismissing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    } finally {
      setBulkDismissing(false);
    }
  }

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
          <span className="text-xs font-semibold tracking-wide uppercase">Keyboard shortcuts</span>
        </div>
        <ul className="space-y-1">
          {[
            ['1', 'Mark as Under review'],
            ['2', 'Mark as Contacted'],
            ['3', 'Mark as Refund blocked'],
            ['4', 'Mark as False alarm'],
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
      <div
        className="rounded-lg"
        style={{ border: '1.5px dashed var(--border)' }}
      >
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
              Upload a CSV to get started →
            </Link>
          }
          footer={shortcutsLegend}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkDismissSelected}
              disabled={bulkDismissing}
              className="text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', border: '1px solid var(--risk-critical-bd)' }}
            >
              {bulkDismissing ? 'Dismissing…' : 'Dismiss selected'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} disabled={bulkDismissing} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
            <th className="text-left px-4 py-2.5 text-overline" style={{ width: 44, color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={items.length > 0 && selectedIds.size === items.length}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setSelectedIds(new Set());
                    return;
                  }
                  setSelectedIds(new Set(items.map((item) => item.id)));
                }}
                aria-label="Select all inbox items"
              />
            </th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Order ID</th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Risk</th>
            <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Score</th>
            <th className="text-right px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Value</th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Match signals</th>
            <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Date</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((tx, rowIdx) => {
            const isTopRow = rowIdx === 0 && FLAG_QUEUE_PRIORITISATION && items.length > 1;
            const priorityScore = Math.round((tx.identity_score ?? 0) * (tx.order_value ?? 1));
            return (
              <tr
                key={tx.id}
                className="border-b transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                  opacity: pending[tx.id] ? 0.5 : 1,
                  background: isTopRow ? 'var(--accent-50, var(--bg-surface-alt))' : undefined,
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
                    {tx.order_id}
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
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-medium"
                  style={{
                    background: 'var(--risk-high-bg)',
                    color: 'var(--risk-high)',
                    borderColor: 'var(--risk-high-bd)',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor' }} />
                  {tx.identity_confidence_grade ?? tx.match_status ?? 'review'}
                </span>
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
                {formatInboxDate(tx.processed_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2" ref={openDropdown === tx.id ? dropdownRef : undefined}>
                  <Link
                    href={`/audit/${tx.processing_job_id}/transaction/${tx.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    Review →
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === tx.id ? null : tx.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors"
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
                          Mark as Contacted
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'resolved')}
                        >
                          Mark as Refund blocked
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                          style={{ color: 'var(--text)' }}
                          onClick={() => setStatusAndDismiss(tx, 'cleared')}
                        >
                          Mark as False alarm
                        </button>
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-subtle)] transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => { setOpenDropdown(null); dismissItem(tx.id); }}
                          >
                          Clear from inbox
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
    </div>
  );
}
