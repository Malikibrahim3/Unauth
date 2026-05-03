'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ArrowLeft, ChevronDown, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface AuditRow {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  request_ip: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  upload_csv:             'Upload CSV',
  export_audit:           'Export Audit',
  lookup_customer:        'Lookup Customer',
  quick_score:            'Quick Score',
  view_customer:          'View Customer',
  update_customer_status: 'Update Status',
  add_customer_note:      'Add Note',
  delete_customer_note:   'Delete Note',
  add_to_watchlist:       'Add to Watchlist',
  remove_from_watchlist:  'Remove from Watchlist',
  generate_evidence:      'Generate Evidence',
  submit_fraud_feedback:  'Submit Feedback',
  dismiss_transaction:    'Dismiss Transaction',
  hide_job:               'Hide Job',
  bulk_delete:            'Bulk Delete',
  invite_team_member:     'Invite Member',
  update_team_member_role:'Update Role',
  remove_team_member:     'Remove Member',
  grant_permission:       'Grant Permission',
  revoke_permission:      'Revoke Permission',
  update_settings:        'Update Settings',
  view_audit_trail:       'View Audit Trail',
};

const ACTION_COLORS: Record<string, string> = {
  upload_csv:             '#8b5cf6',
  export_audit:           '#6366f1',
  lookup_customer:        '#0ea5e9',
  quick_score:            '#0ea5e9',
  view_customer:          '#64748b',
  update_customer_status: '#f59e0b',
  add_customer_note:      '#10b981',
  delete_customer_note:   '#ef4444',
  add_to_watchlist:       '#f59e0b',
  remove_from_watchlist:  '#ef4444',
  generate_evidence:      '#8b5cf6',
  submit_fraud_feedback:  '#f59e0b',
  dismiss_transaction:    '#64748b',
  hide_job:               '#64748b',
  bulk_delete:            '#ef4444',
  invite_team_member:     '#10b981',
  update_team_member_role:'#f59e0b',
  remove_team_member:     '#ef4444',
  grant_permission:       '#10b981',
  revoke_permission:      '#ef4444',
  update_settings:        '#f59e0b',
  view_audit_trail:       '#64748b',
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? '#64748b';
  const label = ACTION_LABELS[action] ?? action;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    owner:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
    admin:   { bg: 'rgba(139,92,246,0.08)',  color: '#8b5cf6' },
    analyst: { bg: 'rgba(99,102,241,0.08)',  color: '#6366f1' },
    viewer:  { bg: 'var(--bg-subtle)',        color: 'var(--text-muted)' },
  };
  const s = colors[role] ?? colors.viewer;
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold" style={s}>
      {role}
    </span>
  );
}

function MetadataExpander({ data }: { data: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return <span className="text-xs opacity-40">—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        metadata
      </button>
      {open && (
        <pre className="mt-1 text-[10px] rounded p-2 max-w-xs overflow-auto" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AuditTrailPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const fetchTrail = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (filterAction)       params.set('action', filterAction);
      if (filterResourceType) params.set('resourceType', filterResourceType);
      if (filterStart)        params.set('startDate', new Date(filterStart).toISOString());
      if (filterEnd)          params.set('endDate', new Date(filterEnd + 'T23:59:59').toISOString());
      const res = await fetch(`/api/audit-trail?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(p);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterResourceType, filterStart, filterEnd]);

  useEffect(() => { fetchTrail(1); }, [fetchTrail]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchTrail(1);
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-inset)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Audit Trail</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Immutable record of every sensitive action taken in your account. Visible to owners and admins only.
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Action</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={{ ...inputStyle, paddingRight: '24px' }}>
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Resource type</label>
          <select value={filterResourceType} onChange={(e) => setFilterResourceType(e.target.value)} style={{ ...inputStyle, paddingRight: '24px' }}>
            <option value="">All types</option>
            {['customer','transaction','job','watchlist','evidence','member','settings','audit_log','lookup'].map((t) =>
              <option key={t} value={t}>{t}</option>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>From</label>
          <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>To</label>
          <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} style={inputStyle} />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-[7px] rounded text-xs font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          <RefreshCw className="h-3 w-3" /> Apply
        </button>
        {(filterAction || filterResourceType || filterStart || filterEnd) && (
          <button
            type="button"
            onClick={() => { setFilterAction(''); setFilterResourceType(''); setFilterStart(''); setFilterEnd(''); }}
            className="text-xs px-3 py-[7px] rounded"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${total.toLocaleString()} event${total !== 1 ? 's' : ''}`}
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTrail(page - 1)}
              disabled={page <= 1 || loading}
              className="px-2 py-1 rounded text-xs disabled:opacity-40"
              style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              ← Prev
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {page} / {pages}
            </span>
            <button
              onClick={() => fetchTrail(page + 1)}
              disabled={page >= pages || loading}
              className="px-2 py-1 rounded text-xs disabled:opacity-40"
              style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--risk-critical)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      {!loading && rows.length === 0 && !error ? (
        <div
          className="rounded-lg border px-6 py-12 text-center text-sm"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          No audit events found matching your filters.
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'IP', 'Detail'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-[var(--bg-subtle)/50]" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(row.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>
                      <span title={row.actor_user_id}>{row.actor_user_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={row.actor_role} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={row.action} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {row.resource_type && (
                        <span>
                          <span className="font-semibold" style={{ color: 'var(--text)' }}>{row.resource_type}</span>
                          {row.resource_id && <span className="font-mono ml-1 opacity-60" title={row.resource_id}>{row.resource_id.slice(0, 8)}…</span>}
                        </span>
                      )}
                      {!row.resource_type && <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {row.request_ip ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <MetadataExpander data={row.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
