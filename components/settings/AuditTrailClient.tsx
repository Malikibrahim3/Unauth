'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { claimEventSummary } from '@/lib/claims/events';
import { auditActionLabel, auditResourceSummary } from '@/lib/audit/actionLabels';
import { Drawer, Input, Pagination, Select } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import styles from '@/components/settings/OperationsSettings.module.css';

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

type ActorInfo = { email: string; role: string };
type AuditTrailClientProps = { actorsByUserId: Record<string, ActorInfo> };
const PAGE_SIZE = 12;

const RESOURCE_FILTERS = [
  { value: '', label: 'Object type · all' },
  { value: 'claim', label: 'Cases' },
  { value: 'processing_job', label: 'Import jobs' },
  { value: 'customer', label: 'Customers' },
  { value: 'report', label: 'Reports' },
];

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
  const parts = Object.entries(row.metadata ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${detailValue(value)}`);
  return parts.length ? parts.join(' · ') : 'Action recorded';
}

function detailLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(detailValue).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${detailLabel(key)}: ${detailValue(item)}`)
      .join(' · ');
  }
  return String(value);
}

export default function AuditTrailClient({ actorsByUserId }: AuditTrailClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resourceType, setResourceType] = useState('');
  const [drawerEvent, setDrawerEvent] = useState<AuditRow | null>(null);
  const search = searchParams.get('search') ?? '';
  const requestedActor = searchParams.get('actor') ?? '';
  const requestedAction = searchParams.get('action') ?? '';
  const requestedRange = searchParams.get('range') ?? '30';
  const range = ['1', '7', '30', 'all'].includes(requestedRange) ? requestedRange : '30';

  const auditUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '200' });
    if (resourceType) params.set('resourceType', resourceType);
    if (range !== 'all') params.set('startDate', new Date(Date.now() - Number(range) * 86_400_000).toISOString());
    return `/api/audit-trail?${params.toString()}`;
  }, [range, resourceType]);

  const { data, loading, error } = useFetchJson<{ rows?: AuditRow[]; total?: number }>(auditUrl, {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? 'Failed to load audit trail');
      return body;
    },
  });
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  function actorLabel(row: AuditRow) {
    if (!row.actor_user_id) return 'Automation';
    const known = actorsByUserId[row.actor_user_id];
    return known ? known.email : hashId(row.actor_user_id);
  }

  function actorRole(row: AuditRow) {
    if (!row.actor_user_id) return 'System';
    return actorsByUserId[row.actor_user_id]?.role ?? row.actor_role ?? 'User';
  }

  const actorOptions = useMemo(
    () => Array.from(new Set(rows.map(actorLabel))).sort((a, b) => a.localeCompare(b)),
    // The workspace member map stays fixed for the page lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const actionOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.action))).sort((a, b) => a.localeCompare(b)), [rows]);
  const actor = requestedActor && actorOptions.includes(requestedActor) ? requestedActor : '';
  const action = requestedAction && actionOptions.includes(requestedAction) ? requestedAction : '';
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (actor && actorLabel(row) !== actor) return false;
      if (action && row.action !== action) return false;
      if (!needle) return true;
      return [auditActionLabel(row.action, row.resource_type), auditResourceSummary(row.resource_type, row.resource_id), actorLabel(row), rowSummary(row)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    // The actor label helper is derived only from the stable page member map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, actor, action, search]);
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = drawerEvent ?? pagedRows[0] ?? null;
  const people = rows.filter((row) => Boolean(row.actor_user_id)).length;
  const automation = rows.length - people;
  const loadedTotal = rows.length;
  const returnedTotal = data?.total ?? loadedTotal;

  function updateQuery(updates: Partial<Record<'actor' | 'action' | 'range' | 'search' | 'page', string | null>>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || (key === 'range' && value === '30') || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

  function setFilter(key: 'actor' | 'action' | 'range' | 'search', value: string) {
    updateQuery({ [key]: value, page: null });
  }

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    return `${pathname}${next.size ? `?${next.toString()}` : ''}`;
  }

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: 'csv', limit: '200' });
    if (resourceType) params.set('resourceType', resourceType);
    if (range !== 'all') params.set('startDate', new Date(Date.now() - Number(range) * 86_400_000).toISOString());
    return `/api/audit-trail?${params.toString()}`;
  }, [range, resourceType]);

  return (
    <div className={styles.auditStack} data-operations-surface="audit-trail">
      <section className={styles.card} id="audit-event-history">
        <div className={styles.cardHeading}><div><h2>Event history</h2><p>Append-only. An entry is never edited or removed, including by an owner.</p></div><div className={styles.cardHeadingActions}><a href={exportHref} className="ua-button ua-button--secondary ua-button--sm">Export as CSV</a></div></div>
        <div className={styles.auditToolbar}>
          <label className={styles.auditSearch}><Search size={14} aria-hidden="true" /><Input value={search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Search action, object, actor…" aria-label="Search audit events" /></label>
          <Select aria-label="Filter by actor" value={actor} onChange={(event) => setFilter('actor', event.target.value)}><option value="">Actor · all</option>{actorOptions.map((value) => <option key={value} value={value}>{value}</option>)}</Select>
          <Select aria-label="Filter by action" value={action} onChange={(event) => setFilter('action', event.target.value)}><option value="">Action · all</option>{actionOptions.map((value) => <option key={value} value={value}>{auditActionLabel(value, null)}</option>)}</Select>
          <Select aria-label="Filter by object type" value={resourceType} onChange={(event) => { setResourceType(event.target.value); updateQuery({ page: null }); }}>{RESOURCE_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</Select>
          <Select aria-label="Filter by date" value={range} onChange={(event) => setFilter('range', event.target.value)}><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All loaded</option></Select>
          <span>{loading ? 'Loading events…' : error ? 'Events unavailable' : `${formatNumber(filteredRows.length)} loaded · Europe/London`}</span>
        </div>
        {error ? <p role="alert" className={styles.empty} style={{ color: 'var(--uo-route-critical)' }}>{error}</p> : <div className={styles.auditTable} role="table" aria-label="Audit trail events" tabIndex={0}>
          <div role="row" className={styles.auditHeader}><span role="columnheader">When</span><span role="columnheader">Actor</span><span role="columnheader">Role</span><span role="columnheader">Action</span><span role="columnheader">Object</span><span role="columnheader">Summary</span></div>
          {pagedRows.map((row) => <button type="button" role="row" className={styles.auditRow} key={`${row.resource_type ?? 'system'}-${row.id}`} onClick={() => setDrawerEvent(row)}>
            <span role="cell">{formatDateTime(row.created_at)}</span><span role="cell" title={actorLabel(row)}>{actorLabel(row)}</span><span role="cell"><em>{actorRole(row)}</em></span><span role="cell" title={auditActionLabel(row.action, row.resource_type)}>{auditActionLabel(row.action, row.resource_type)}</span><span role="cell" className={styles.auditObject}>{auditResourceSummary(row.resource_type, row.resource_id)}</span><span role="cell" title={rowSummary(row)}>{rowSummary(row)}</span>
          </button>)}
          {!loading && !pagedRows.length ? <p className={styles.empty}>{rows.length ? 'No events match these filters.' : 'No audit events recorded yet.'}</p> : null}
        </div>}
        <p className={styles.tableFootnote}>Showing {formatNumber(pagedRows.length)} of {formatNumber(filteredRows.length)} loaded events. Opening an entry shows its retained metadata, request context, and before-and-after values when recorded.</p>
        {!loading && !error ? <div className={styles.auditPagination}><span>Sorted newest first</span><Pagination page={page} pageSize={PAGE_SIZE} total={filteredRows.length} href={pageHref} /></div> : null}
      </section>

      <div className={styles.auditKpis} aria-label="Audit trail summary">
        <Metric label={`Events, last ${range === 'all' ? 'loaded history' : `${range} days`}`} value={loading ? '…' : formatNumber(returnedTotal)} detail="Every actor and object" />
        <Metric label="By a person" value={loading ? '…' : formatNumber(people)} detail={loadedTotal ? `${((people / loadedTotal) * 100).toFixed(1)}% of loaded events` : 'No loaded events'} />
        <Metric label="By automation" value={loading ? '…' : formatNumber(automation)} detail={loadedTotal ? `${((automation / loadedTotal) * 100).toFixed(1)}% · none decided` : 'No loaded events'} />
        <Metric label="Retention approval" value="Pending" detail="No pilot period published" />
      </div>

      <div className={styles.auditBottomGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>Selected event</h2><p>{selected ? `${auditResourceSummary(selected.resource_type, selected.resource_id)} · ${auditActionLabel(selected.action, selected.resource_type)}` : 'No event selected'}</p></div></div>
          {selected ? <EventFacts row={selected} actor={actorLabel(selected)} role={actorRole(selected)} /> : <p className={styles.empty}>Select an event to inspect its immutable record.</p>}
        </section>
        <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>What the trail guarantees</h2></div></div>
          <div className={styles.auditGuarantees}>
            <Guarantee title="Every decision names a person" copy="Automation can tag, route and request. It can never appear as the actor on a merchant decision." />
            <Guarantee title="Configuration changes keep both values" copy="A platform default records what it was and what it became." />
            <Guarantee title="Exports are events too" copy="Who exported which scope, and how many records left the workspace." />
            <Guarantee title="History is append-only inside the workspace" copy="Owners cannot prune individual events. The separately confirmed workspace-deletion job is the only whole-workspace removal path." critical />
          </div>
        </section>
      </div>

      <Drawer open={drawerEvent != null} onClose={() => setDrawerEvent(null)} title="Selected event" overlayId="audit-event-detail" width={520} signalRail>
        {drawerEvent ? <div className={styles.auditDrawer}><div><code>EVT-{hashId(drawerEvent.id).slice(1)}</code><h3>{auditActionLabel(drawerEvent.action, drawerEvent.resource_type)}</h3><p>{rowSummary(drawerEvent)}</p></div><EventFacts row={drawerEvent} actor={actorLabel(drawerEvent)} role={actorRole(drawerEvent)} />{drawerEvent.resource_href ? <Link href={drawerEvent.resource_href} className="ua-button ua-button--secondary ua-button--sm">Open related record</Link> : null}</div> : null}
      </Drawer>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <section><span>{label}</span><strong>{value}</strong><small>{detail}</small></section>;
}

function EventFacts({ row, actor, role }: { row: AuditRow; actor: string; role: string }) {
  return <div className={styles.auditSelected}><dl><dt>Event ID</dt><dd><code>EVT-{hashId(row.id).slice(1)}</code></dd><dt>When</dt><dd>{formatDateTime(row.created_at)}</dd><dt>Actor</dt><dd>{actor} · {role}</dd><dt>Permission used</dt><dd>{typeof row.metadata?.permission === 'string' ? row.metadata.permission : '— Not retained'}</dd><dt>Object</dt><dd>{auditResourceSummary(row.resource_type, row.resource_id)}</dd><dt>Summary</dt><dd>{rowSummary(row)}</dd>{Object.entries(row.metadata ?? {}).slice(0, 5).map(([key, value]) => <div key={key} className={styles.auditFactPair}><dt>{detailLabel(key)}</dt><dd>{detailValue(value)}</dd></div>)}</dl><p>This event remains exactly as recorded. Any later reversal or correction appends a new event.</p></div>;
}

function Guarantee({ title, copy, critical = false }: { title: string; copy: string; critical?: boolean }) {
  return <div data-tone={critical ? 'critical' : 'positive'}><i aria-hidden="true" /><span><strong>{title}</strong><p>{copy}</p></span></div>;
}
