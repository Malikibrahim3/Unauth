'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import type { Database } from '@/lib/supabase/types';

type RunRow = Database['public']['Tables']['processing_jobs']['Row'];

interface AuditHistoryTableClientProps {
  rows: RunRow[];
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m)-1]} ${y}`;
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `To ${fmt(end!)}`;
}

const UPLOAD_TYPE_LABELS: Record<string, string> = {
  standard: 'Regular',
  historical: 'Historical',
  investigation: 'Investigation',
};

export default function AuditHistoryTableClient({ rows: initialRows }: AuditHistoryTableClientProps) {
  const [rows, setRows] = useState<RunRow[]>(initialRows);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkHiding, setBulkHiding] = useState(false);

  const allSelected = useMemo(() => rows.length > 0 && selectedIds.size === rows.length, [rows.length, selectedIds]);

  async function hideSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hide ${selectedIds.size} audit${selectedIds.size === 1 ? '' : 's'} from view?`)) return;
    setBulkHiding(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/settings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'audits', ids, confirm: true }),
      });
      if (res.ok) {
        const idSet = new Set(ids);
        setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setBulkHiding(false);
    }
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={hideSelected}
              disabled={bulkHiding}
              className="text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', border: '1px solid var(--risk-critical-bd)' }}
            >
              {bulkHiding ? 'Binning…' : 'Bin selected'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} disabled={bulkHiding} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <th className="px-4 py-2.5 text-left" style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (!e.target.checked) setSelectedIds(new Set());
                    else setSelectedIds(new Set(rows.map((r) => r.id)));
                  }}
                  aria-label="Select all audits"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-overline">Label</th>
              <th className="text-left px-4 py-2.5 text-overline">Type</th>
              <th className="text-left px-4 py-2.5 text-overline">Period</th>
              <th className="text-left px-4 py-2.5 text-overline">Status</th>
              <th className="text-right px-4 py-2.5 text-overline">Rows</th>
              <th className="text-right px-4 py-2.5 text-overline">Matched</th>
              <th className="text-left px-4 py-2.5 text-overline">Uploaded</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((run) => {
              const flagRate = run.total_rows > 0 ? (run.flagged_count ?? 0) / run.total_rows : 0;
              const anyRun = run as any;
              const displayLabel = anyRun.label || run.filename;
              const period = formatDateRange(anyRun.date_range_start, anyRun.date_range_end);
              const typeLabel = UPLOAD_TYPE_LABELS[anyRun.upload_type ?? 'standard'] ?? 'Regular';
              const checked = selectedIds.has(run.id);

              return (
                <tr key={run.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(run.id);
                        else next.delete(run.id);
                        setSelectedIds(next);
                      }}
                      aria-label={`Select ${displayLabel}`}
                    />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-sm font-medium truncate block" style={{ color: 'var(--text)' }}>{displayLabel}</span>
                    {anyRun.label && (
                      <span className="text-xs font-mono truncate block" style={{ color: 'var(--text-subtle)' }}>{run.filename}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border" style={{
                      background: anyRun.upload_type === 'investigation' ? 'var(--info-bg)' : 'var(--bg-subtle)',
                      borderColor: anyRun.upload_type === 'investigation' ? 'var(--info-bd)' : 'var(--border)',
                      color: anyRun.upload_type === 'investigation' ? 'var(--info)' : 'var(--text-muted)',
                    }}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{period}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border" style={{
                      background: run.status === 'completed' ? 'var(--success-bg)' : run.status === 'processing' ? 'var(--info-bg)' : run.status === 'pending' ? 'var(--bg-subtle)' : 'var(--risk-critical-bg)',
                      borderColor: run.status === 'completed' ? 'var(--success-bd)' : run.status === 'processing' ? 'var(--info-bd)' : run.status === 'pending' ? 'var(--border)' : 'var(--risk-critical-bd)',
                      color: run.status === 'completed' ? 'var(--success)' : run.status === 'processing' ? 'var(--info)' : run.status === 'pending' ? 'var(--text-muted)' : 'var(--risk-critical)',
                    }}>
                      {run.status === 'completed' ? 'Completed' : run.status === 'processing' ? 'Processing' : run.status === 'pending' ? 'Pending' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text)' }}>{run.total_rows.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text)' }}>
                    {(run.flagged_count ?? 0).toLocaleString()}
                    {run.total_rows > 0 && <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>({(flagRate * 100).toFixed(1)}%)</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(run.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {(run.status === 'complete' || run.status === 'completed') && (
                      <Link href={`/audit/${run.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text)' }}>
                        View &rarr;
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
