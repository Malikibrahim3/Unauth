'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import RemoveButton from '@/components/watchlist/RemoveButton';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';

interface WatchlistEntry {
  id: string;
  customer_profile_id: string | null;
  display_name: string | null;
  display_email: string | null;
  last_seen_risk: string | null;
  added_at: string;
  /** Last N risk scores in chronological order for trend calculation. */
  risk_trend_scores?: number[];
}

interface WatchlistTableClientProps {
  rows: WatchlistEntry[];
}

const watchlistAddedAtFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function WatchlistTableClient({ rows: initialRows }: WatchlistTableClientProps) {
  const [rows, setRows] = useState<WatchlistEntry[]>(initialRows);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);

  function handleRemoved(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function bulkRemoveSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} watchlist entr${selectedIds.size === 1 ? 'y' : 'ies'}?`)) return;
    setBulkRemoving(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/settings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'watchlist_entries', ids, confirm: true }),
      });
      if (res.ok) {
        const idSet = new Set(ids);
        setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setBulkRemoving(false);
    }
  }

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md px-3 py-2 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
type="button"               onClick={bulkRemoveSelected}
              disabled={bulkRemoving}
              className="text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', border: '1px solid var(--risk-critical-bd)' }}
            >
              {bulkRemoving ? 'Removing…' : 'Remove selected'}
            </button>
            <button
type="button"               onClick={() => setSelectedIds(new Set())}
              disabled={bulkRemoving}
              className="text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-md overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-muted)' }}>
              <th className="text-left px-4 py-2.5" style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (!checked) {
                      setSelectedIds(new Set());
                      return;
                    }
                    setSelectedIds(new Set(rows.map((r) => r.id)));
                  }}
                  aria-label="Select all"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-secondary)' }}>Customer</th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-secondary)' }}>Last seen risk</th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-secondary)' }}>Monitoring since</th>
              <th className="px-4 py-2.5 text-overline text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-muted)', cursor: entry.customer_profile_id ? 'pointer' : 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                onClick={() => {
                  if (entry.customer_profile_id) {
                    setSelectedProfileId(entry.customer_profile_id);
                  }
                }}
              >
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(entry.id);
                        else next.delete(entry.id);
                        return next;
                      });
                    }}
                    aria-label="Select row"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {entry.display_name ?? '-'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.display_email ?? '-'}</div>
                </td>
                <td className="px-4 py-3">
                  {entry.last_seen_risk ? (
                    <ConfidenceBadge grade={riskLevelToNewGrade(entry.last_seen_risk)} size="sm" />
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {watchlistAddedAtFormatter.format(new Date(entry.added_at))}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-3">
                    {entry.customer_profile_id ? (
                      <Link
                        href={`/customers/${entry.customer_profile_id}`}
                        className="text-xs font-semibold hover:underline whitespace-nowrap"
                        style={{ color: 'var(--accent)' }}
                      >
                        Open dossier →
                      </Link>
                    ) : null}
                    <RemoveButton id={entry.id} onRemoved={handleRemoved} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomerIntelligenceDrawer
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  );
}
