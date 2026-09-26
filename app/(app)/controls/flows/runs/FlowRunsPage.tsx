import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import {
  acceptanceScenarioFromHeaders,
  throwForAcceptanceScenario,
} from '@/lib/testing/acceptanceStateInjector';

type WorkflowRunRow = {
  id: string;
  workflow_definition_id: string;
  status: string;
  error: string | null;
  domain_event_id: string;
  started_at: string;
  completed_at: string | null;
};

type WorkflowDefinitionRow = { id: string; name: string };
type DomainEventRow = { id: string; event_type: string };

type RunSearchParams = {
  workflow?: string;
  state?: string;
  range?: string;
  search?: string;
  page?: string;
};

const PAGE_SIZE = 25;
const SEARCH_SCOPE_LIMIT = 500;
const RUN_COLUMNS = 'id,workflow_definition_id,domain_event_id,status,error,started_at,completed_at';

function duration(started: string, completed: string | null) {
  if (!completed) return 'Running';
  const milliseconds = Math.max(0, new Date(completed).getTime() - new Date(started).getTime());
  if (milliseconds < 1000) return `${milliseconds} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
  return `${Math.floor(milliseconds / 60_000)}m ${Math.floor((milliseconds % 60_000) / 1000)}s`;
}

function outcomeReason(run: WorkflowRunRow) {
  if (run.error) return run.error.length > 140 ? `${run.error.slice(0, 140)}…` : run.error;
  if (!run.completed_at) return 'Execution is still in progress.';
  return 'Execution completed with its recorded workflow outcome.';
}

function runState(run: WorkflowRunRow) {
  if (run.error || run.status === 'failed') return { label: 'Failed', tone: 'red' } as const;
  if (['held', 'pending_decision', 'awaiting_decision'].includes(run.status)) return { label: 'Held', tone: 'amber' } as const;
  if (run.status === 'skipped' || run.status === 'not_matched') return { label: 'Skipped', tone: 'grey' } as const;
  if (run.status === 'cancelled') return { label: 'Cancelled', tone: 'grey' } as const;
  if (run.completed_at) return { label: 'Complete', tone: 'green' } as const;
  return { label: 'Running', tone: 'blue' } as const;
}

function percent(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '— No runs';
}

export default async function Runs({ searchParams }: { searchParams: Promise<RunSearchParams> }) {
  await throwForAcceptanceScenario('flow-runs-error');
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/overview');

  const sp = await searchParams;
  const range = ['24h', '7d', '30d', 'all'].includes(sp.range ?? '') ? sp.range! : '30d';
  const state = ['completed', 'failed', 'held', 'skipped', 'cancelled', 'matched', 'not_matched'].includes(sp.state ?? '') ? sp.state! : '';
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const needle = sp.search?.trim().toLowerCase() ?? '';
  const definitionsResult = await svc
    .from(TABLES.WORKFLOW_DEFINITIONS)
    .select('id,name')
    .eq('merchant_id', ctx.merchantId)
    .order('name');
  if (definitionsResult.error) throw new Error(`Unable to load flow names: ${definitionsResult.error.message}`);
  const definitions = (definitionsResult.data ?? []) as WorkflowDefinitionRow[];
  const names = new Map(definitions.map((definition) => [definition.id, definition.name]));
  const workflow = sp.workflow && names.has(sp.workflow) ? sp.workflow : '';
  const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : null;

  let runs: WorkflowRunRow[] = [];
  let total = 0;
  let searchCapped = false;
  let resolvedPage = requestedPage;

  if (needle) {
    let query = svc
      .from(TABLES.WORKFLOW_RUNS)
      .select(RUN_COLUMNS)
      .eq('merchant_id', ctx.merchantId)
      .order('started_at', { ascending: false })
      .limit(SEARCH_SCOPE_LIMIT);
    if (workflow) query = query.eq('workflow_definition_id', workflow);
    if (state) query = query.eq('status', state);
    if (days) query = query.gte('started_at', new Date(Date.now() - days * 86_400_000).toISOString());
    const result = await query;
    if (result.error) throw new Error(`Unable to load flow runs: ${result.error.message}`);
    const scoped = (result.data ?? []) as WorkflowRunRow[];
    searchCapped = scoped.length === SEARCH_SCOPE_LIMIT;
    const matches = scoped.filter((run) =>
      `run ${hashId(run.id)} ${names.get(run.workflow_definition_id) ?? ''} ${run.error ?? ''}`.toLowerCase().includes(needle),
    );
    total = matches.length;
    resolvedPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    runs = matches.slice((resolvedPage - 1) * PAGE_SIZE, resolvedPage * PAGE_SIZE);
  } else {
    const from = (requestedPage - 1) * PAGE_SIZE;
    let query = svc
      .from(TABLES.WORKFLOW_RUNS)
      .select(RUN_COLUMNS, { count: 'exact' })
      .eq('merchant_id', ctx.merchantId)
      .order('started_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (workflow) query = query.eq('workflow_definition_id', workflow);
    if (state) query = query.eq('status', state);
    if (days) query = query.gte('started_at', new Date(Date.now() - days * 86_400_000).toISOString());
    const result = await query;
    if (result.error) throw new Error(`Unable to load flow runs: ${result.error.message}`);
    total = result.count ?? 0;
    resolvedPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    runs = (result.data ?? []) as WorkflowRunRow[];
  }

  if (acceptanceScenario === 'flow-runs-empty') {
    runs = [];
    total = 0;
    resolvedPage = 1;
  }

  const hasFilters = acceptanceScenario === 'flow-runs-empty'
    ? false
    : Boolean(workflow || state || needle || range !== '30d');
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [summaryResult, eventsResult] = await Promise.all([
    svc
      .from(TABLES.WORKFLOW_RUNS)
      .select('status,error,completed_at')
      .eq('merchant_id', ctx.merchantId)
      .gte('started_at', sevenDaysAgo)
      .limit(5000),
    runs.length
      ? svc
          .from(TABLES.DOMAIN_EVENTS)
          .select('id,event_type')
          .eq('merchant_id', ctx.merchantId)
          .in('id', runs.map((run) => run.domain_event_id))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (summaryResult.error) throw new Error(`Unable to load flow run summary: ${summaryResult.error.message}`);
  if (eventsResult.error) throw new Error(`Unable to load flow run triggers: ${eventsResult.error.message}`);
  const summaryRuns = (summaryResult.data ?? []) as Array<Pick<WorkflowRunRow, 'status' | 'error' | 'completed_at'>>;
  const summary = summaryRuns.reduce((counts, run) => {
    const state = runState({ ...run, id: '', workflow_definition_id: '', domain_event_id: '', started_at: '' });
    if (state.label === 'Complete') counts.complete += 1;
    else if (state.label === 'Failed') counts.failed += 1;
    else if (state.label === 'Held') counts.held += 1;
    else if (state.label === 'Skipped' || state.label === 'Cancelled') counts.skipped += 1;
    return counts;
  }, { complete: 0, failed: 0, held: 0, skipped: 0 });
  const triggerNames = new Map<string, string>(
    ((eventsResult.data ?? []) as DomainEventRow[]).map((event) => [event.id, event.event_type.replaceAll('_', ' ')]),
  );

  const csv = [
    ['Run', 'Flow', 'Trigger', 'State', 'Outcome or reason', 'Started', 'Completed', 'Duration'],
    ...runs.map((run) => [
      `RUN-${hashId(run.id)}`,
      names.get(run.workflow_definition_id) ?? 'Flow unavailable',
      triggerNames.get(run.domain_event_id) ?? 'Trigger unavailable',
      runState(run).label,
      outcomeReason(run),
      formatDateTime(run.started_at),
      run.completed_at ? formatDateTime(run.completed_at) : '— Still open',
      run.completed_at ? duration(run.started_at, run.completed_at) : '—',
    ]),
  ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (workflow) params.set('workflow', workflow);
    if (state) params.set('state', state);
    if (range !== '30d') params.set('range', range);
    if (needle) params.set('search', sp.search?.trim() ?? '');
    if (page > 1) params.set('page', String(page));
    return `/controls/flows/runs${params.size ? `?${params.toString()}` : ''}`;
  }

  return (
    <section data-screen-label="Flow runs" data-visual-world="supplied-package" data-surface-id="flow-runs-registry" data-archetype="P5" style={{ width: '100%', maxWidth: '100%', height: '100%', minWidth: 0, minHeight: 0, contain: 'inline-size', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}><h1 style={{ margin: 0, color: '#1c1f23', fontSize: 13, lineHeight: 1, fontWeight: 500 }}>Flow runs</h1><span style={{ color: '#6f6a63', fontSize: 12 }}>Flows › Runs</span><span style={{ flex: 1 }} /><a style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }} download="flow-runs.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Export runs</a><Link href="/controls/flows" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Open flows</Link></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', borderBottom: '1px solid #eae8e5' }} aria-label="Flow runs in the last 7 days" data-operations-surface="flow-runs">
        {[
          ['Runs, last 7 days', summaryRuns.length, '', 'default'],
          ['Complete', summary.complete, percent(summary.complete, summaryRuns.length), 'green'],
          ['Failed', summary.failed, percent(summary.failed, summaryRuns.length), 'red'],
          ['Held for a person', summary.held, percent(summary.held, summaryRuns.length), 'amber'],
          ['Skipped or cancelled', summary.skipped, percent(summary.skipped, summaryRuns.length), 'grey'],
        ].map(([label, value, detail, tone]) => <section key={String(label)} data-tone={tone} style={{ display: 'grid', gap: 4, padding: '12px 16px', borderRight: '1px solid #eae8e5' }}><span style={{ color: '#6f6a63', fontSize: 10.5 }}>{label}</span><strong style={{ color: tone === 'red' ? '#b0431a' : tone === 'amber' ? '#7a5310' : '#1c1f23', font: "400 17px/1.2 'IBM Plex Mono',monospace" }}>{formatNumber(Number(value))}</strong><small style={{ color: '#6f6a63', fontSize: 9.5 }}>{detail || '\u00a0'}</small></section>)}
      </div>
      <section aria-labelledby="flow-runs-heading" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '16px 22px 20px', overflow: 'hidden', borderRadius: 11, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eae8e5' }}><h2 id="flow-runs-heading" style={{ margin: 0, fontSize: 14 }}>Executions</h2><p style={{ margin: '3px 0 0', color: '#6f6a63', fontSize: 11 }}>Newest first. A held run is waiting for a person, not broken.</p></div>
        <form method="get" style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0, contain: 'inline-size', display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eae8e5', background: '#ffffff', overflowX: 'auto' }}>
          <label style={{ minWidth: 240, flex: 1 }}><input aria-label="Search flow runs" name="search" style={inputStyle} defaultValue={sp.search} placeholder="Search run ID, flow or object" /></label>
          <label><select aria-label="Filter by flow" name="workflow" style={selectStyle} defaultValue={workflow}><option value="">Flow · all</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>
          <label><select aria-label="Filter by state" name="state" style={selectStyle} defaultValue={state}><option value="">State · all</option><option value="completed">Complete</option><option value="failed">Failed</option><option value="held">Held</option><option value="skipped">Skipped</option><option value="cancelled">Cancelled</option></select></label>
          <label><select aria-label="Filter by date range" name="range" style={selectStyle} defaultValue={range}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All history</option></select></label>
          <button style={{ height: 34, padding: '0 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }} type="submit">Apply</button>
          <span style={{ whiteSpace: 'nowrap' }}>{formatNumber(total)} runs · Europe/London</span>
        </form>
        {searchCapped ? <p style={{ margin: 0, padding: '9px 14px', background: '#fff3e9', color: '#7a5310', fontSize: 11 }} role="status">Search covers the newest {formatNumber(SEARCH_SCOPE_LIMIT)} runs in this scope. The loaded match count is partial, not a complete total.</p> : null}
        {runs.length ? (
          <div style={{ width: '100%', maxWidth: '100%', flex: 1, minWidth: 0, minHeight: 0, contain: 'inline-size', overflow: 'auto' }}>
            <div role="table" aria-label="Flow run records" style={{ minWidth: 1060 }}>
              <div role="rowgroup">
                <div role="row" style={{ ...runGridStyle, minHeight: 34, color: '#6f6a63', fontSize: 10 }}>
                  {['Run', 'Flow', 'Trigger', 'State', 'Outcome or reason', 'Started', 'Completed', 'Duration'].map((label) => (
                    <span role="columnheader" key={label}>{label}</span>
                  ))}
                </div>
              </div>
              <div role="rowgroup">
                {runs.map((run) => {
                  const stateDisplay = runState(run);
                  return (
                    <Link role="row" href={`/controls/flows/runs/${run.id}`} style={{ ...runGridStyle, minHeight: 44, color: '#40454a', fontSize: 11, textDecoration: 'none' }} key={run.id}>
                      <span role="cell" style={{ color: '#9f4f08', fontFamily: "'IBM Plex Mono',monospace" }}>RUN-{hashId(run.id)}</span>
                      <span role="cell" title={names.get(run.workflow_definition_id) ?? 'Flow unavailable'}>{names.get(run.workflow_definition_id) ?? 'Flow unavailable'}</span>
                      <span role="cell" title={triggerNames.get(run.domain_event_id) ?? 'Trigger unavailable'}>{triggerNames.get(run.domain_event_id) ?? 'Trigger unavailable'}</span>
                      <span role="cell"><i data-tone={stateDisplay.tone} style={{ padding: '3px 6px', borderRadius: 5, background: stateDisplay.tone === 'red' ? '#fdf0e6' : stateDisplay.tone === 'amber' ? '#fff3e9' : stateDisplay.tone === 'green' ? '#eaf5ef' : '#f2f0ed', color: stateDisplay.tone === 'red' ? '#b0431a' : stateDisplay.tone === 'amber' ? '#7a5310' : stateDisplay.tone === 'green' ? '#1a6b43' : '#40454a', fontSize: 9.5 }}>{stateDisplay.label}</i></span>
                      <span role="cell" title={outcomeReason(run)}>{outcomeReason(run)}</span>
                      <span role="cell">{formatDateTime(run.started_at)}</span>
                      <span role="cell">{run.completed_at ? formatDateTime(run.completed_at) : '— Still open'}</span>
                      <span role="cell">{run.completed_at ? duration(run.started_at, run.completed_at) : '—'}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : <div data-state-id="flow-runs-empty" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}><strong style={{ font: "500 13px/1.35 'Inter',sans-serif" }}>{hasFilters ? 'No runs match this scope' : 'No historical flow runs'}</strong><span style={{ maxWidth: 460, color: '#64686d', textAlign: 'center', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{hasFilters ? 'Clear a filter or expand the time range to inspect other historical executions.' : 'Draft sample tests do not create run-history records. Publication and live execution are unavailable in the pilot.'}</span><Link href={hasFilters ? '/controls/flows/runs' : '/controls/flows'} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>{hasFilters ? 'Clear filters' : 'Open flow drafts'}</Link></div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderTop: '1px solid #eae8e5', color: '#6f6a63', fontSize: 10.5 }}><span>Showing {total ? formatNumber((resolvedPage - 1) * PAGE_SIZE + 1) : '0'} – {formatNumber(Math.min(resolvedPage * PAGE_SIZE, total))} of {formatNumber(total)}</span><div style={{ display: 'flex', gap: 7 }}>{resolvedPage > 1 ? <Link href={pageHref(resolvedPage - 1)} style={paginationStyle}>Previous</Link> : <span aria-disabled="true" style={{ ...paginationStyle, color: '#a7abad' }}>Previous</span>}<span style={{ padding: '5px 4px', font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>{resolvedPage} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>{resolvedPage * PAGE_SIZE < total ? <Link href={pageHref(resolvedPage + 1)} style={paginationStyle}>Next</Link> : <span aria-disabled="true" style={{ ...paginationStyle, color: '#a7abad' }}>Next</span>}</div></div>
      </section>
    </section>
  );
}

const inputStyle = { width: '100%', height: 34, padding: '0 10px', border: '1px solid #ddd8d1', borderRadius: 9, background: '#fff', color: '#1c1f23', fontSize: 12 } as const;
const selectStyle = { height: 34, padding: '0 26px 0 9px', border: '1px solid #ddd8d1', borderRadius: 9, background: '#fff', color: '#40454a', fontSize: 11.5 } as const;
const runGridStyle = { display: 'grid', gridTemplateColumns: '100px 130px 125px 90px minmax(220px,1fr) 130px 130px 74px', gap: 12, alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #f4f2ef' } as const;
const paginationStyle = { padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", textDecoration: 'none' } as const;
