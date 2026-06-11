'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Download, Filter } from 'lucide-react';
import { claimEventSummary } from '@/lib/claims/events';
import {
  auditActionLabel,
  auditResourceSummary,
} from '@/lib/audit/actionLabels';
import { SectionCard } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_role?: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_href?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ActorInfo = {
  email: string;
  role: string;
};

type AuditTrailClientProps = {
  actorsByUserId: Record<string, ActorInfo>;
};

const RESOURCE_FILTERS = [
  { value: '', label: 'All resources' },
  { value: 'claim', label: 'Claims' },
  { value: 'processing_job', label: 'Audit runs' },
  { value: 'customer', label: 'Customers' },
  { value: 'report', label: 'Reports' },
];

const auditTrailTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(value: string) {
  return auditTrailTimestampFormatter.format(new Date(value));
}

function rowSummary(row: AuditRow): string {
  if (row.resource_type === 'claim') {
    return claimEventSummary({
      event_type: row.action,
      previous_status: typeof row.metadata?.previous_status === 'string' ? row.metadata.previous_status : null,
      new_status: typeof row.metadata?.new_status === 'string' ? row.metadata.new_status : null,
      previous_decision: typeof row.metadata?.previous_decision === 'string' ? row.metadata.previous_decision : null,
      new_decision: typeof row.metadata?.new_decision === 'string' ? row.metadata.new_decision : null,
      previous_outcome: typeof row.metadata?.previous_outcome === 'string' ? row.metadata.previous_outcome : null,
      new_outcome: typeof row.metadata?.new_outcome === 'string' ? row.metadata.new_outcome : null,
      note: typeof row.metadata?.note === 'string' ? row.metadata.note : null,
    });
  }

  const meta = row.metadata ?? {};
  const parts = Object.entries(meta)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`);
  return parts.length > 0 ? parts.join(' · ') : 'Action recorded';
}

function metadataEntries(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  return Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '');
}

export default function AuditTrailClient({ actorsByUserId }: AuditTrailClientProps) {
  const [resourceType, setResourceType] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auditUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '60' });
    if (resourceType) params.set('resourceType', resourceType);
    return `/api/audit-trail?${params.toString()}`;
  }, [resourceType]);

  const { data, loading, error } = useFetchJson<{ rows?: AuditRow[] }>(auditUrl, {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? 'Failed to load audit trail');
      return body;
    },
  });
  const rows = data?.rows ?? [];

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: 'csv', limit: '200' });
    if (resourceType) params.set('resourceType', resourceType);
    return `/api/audit-trail?${params.toString()}`;
  }, [resourceType]);

  function actorLabel(row: AuditRow) {
    if (!row.actor_user_id) return 'System';
    const actor = actorsByUserId[row.actor_user_id];
    if (actor) return `${actor.email} (${actor.role})`;
    const role = row.actor_role ?? 'user';
    return `${row.actor_user_id.slice(0, 8)} (${role})`;
  }

  return (
    <SectionCard
      title="Activity log"
      description="Filterable record of claim lifecycle events and sensitive account actions."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', outlineColor: 'var(--accent)' }}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        <label className="sr-only" htmlFor="audit-resource-filter">Filter by resource</label>
        <select
          id="audit-resource-filter"
          value={resourceType}
          onChange={(event) => setResourceType(event.target.value)}
          className="rounded-md px-3 py-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          style={{
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outlineColor: 'var(--accent)',
          }}
        >
          {RESOURCE_FILTERS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading audit events…</p>
      ) : error ? (
        <p className="text-sm" style={{ color: 'var(--risk-critical-fg)' }}>{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No audit events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border bg-[var(--surface)]" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-1)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                <th className="w-8 px-4 py-3 text-left text-xs font-medium" aria-label="Expand details" />
                <th className="px-4 py-3 text-left text-xs font-medium">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Object</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowKey = `${row.resource_type ?? 'system'}-${row.id}`;
                const isExpanded = expandedId === rowKey;
                const details = metadataEntries(row.metadata);
                const claimHref = row.resource_type === 'claim' && row.resource_id
                  ? row.resource_href ?? '/claims'
                  : null;

                return (
                  <Fragment key={rowKey}>
                    <tr className="border-t" style={{ borderColor: 'var(--border-muted)' }}>
                      <td className="px-2 py-3">
                        {details.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                            style={{ outlineColor: 'var(--accent)' }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Hide metadata' : 'Show metadata'}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                        {formatTimestamp(row.created_at)}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {auditActionLabel(row.action, row.resource_type)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {claimHref ? (
                          <Link
                            href={claimHref}
                            className="font-medium hover:underline"
                            style={{ color: 'var(--accent)' }}
                            title={`Open claim ${row.resource_id?.slice(0, 8) ?? ''}`}
                          >
                            {auditResourceSummary(row.resource_type, row.resource_id)}
                          </Link>
                        ) : (
                          auditResourceSummary(row.resource_type, row.resource_id)
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {actorLabel(row)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--text-secondary)' }} title={rowSummary(row)}>
                        {rowSummary(row)}
                      </td>
                    </tr>
                    {isExpanded && details.length > 0 ? (
                      <tr className="border-t" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
                        <td colSpan={6} className="px-4 py-3">
                          <dl className="grid gap-2 sm:grid-cols-2">
                            {details.map(([key, value]) => (
                              <div key={key}>
                                <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                                  {key.replace(/_/g, ' ')}
                                </dt>
                                <dd className="mt-0.5 font-mono text-xs break-all" style={{ color: 'var(--text-secondary)' }}>
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
