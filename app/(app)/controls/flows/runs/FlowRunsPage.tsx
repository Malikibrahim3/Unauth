import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import {
  ButtonLink,
  EmptyState,
  PageFrame,
  Pagination,
} from '@/components/ui';
import { hashId } from '@/lib/ui/displayRef';
import styles from '@/components/rules/AutomationControls.module.css';

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

  const hasFilters = Boolean(workflow || state || needle || range !== '30d');
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
    <PageFrame
      title="Flow runs"
      subtitle="Historical execution records for previously published flows, with the state each run reached and why it stopped. Pilot live execution is unavailable."
      breadcrumbs={[{ label: 'Controls', href: '/controls/rules' }, { label: 'Flows', href: '/controls/flows' }, { label: 'Runs' }]}
      showCurrentBreadcrumb
      actions={<><a className="ua-button ua-button--secondary ua-button--sm" download="flow-runs.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Export runs</a><ButtonLink href="/controls/flows" size="sm">Open flows</ButtonLink></>}
      surfaceId="flow-runs-registry"
      archetype="P5"
    >
      <div className={styles.flowRunKpis} aria-label="Flow runs in the last 7 days" data-operations-surface="flow-runs">
        {[
          ['Runs, last 7 days', summaryRuns.length, '', 'default'],
          ['Complete', summary.complete, percent(summary.complete, summaryRuns.length), 'green'],
          ['Failed', summary.failed, percent(summary.failed, summaryRuns.length), 'red'],
          ['Held for a person', summary.held, percent(summary.held, summaryRuns.length), 'amber'],
          ['Skipped or cancelled', summary.skipped, percent(summary.skipped, summaryRuns.length), 'grey'],
        ].map(([label, value, detail, tone]) => <section key={String(label)} data-tone={tone}><span>{label}</span><strong>{formatNumber(Number(value))}</strong><small>{detail || '\u00a0'}</small></section>)}
      </div>
      <section className={styles.flowRunsCard} aria-labelledby="flow-runs-heading">
        <div className={styles.flowRunsHeading}><h2 id="flow-runs-heading">Executions</h2><p>Newest first. A held run is waiting for a person, not broken.</p></div>
        <form method="get" className={styles.flowRunsToolbar}>
          <label className={styles.searchWrap}><span className="sr-only">Search flow runs</span><input name="search" className={styles.searchInput} defaultValue={sp.search} placeholder="Search run ID, flow or object" /></label>
          <label><span className="sr-only">Filter by flow</span><select name="workflow" className={styles.filterSelect} defaultValue={workflow}><option value="">Flow · all</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>
          <label><span className="sr-only">Filter by state</span><select name="state" className={styles.filterSelect} defaultValue={state}><option value="">State · all</option><option value="completed">Complete</option><option value="failed">Failed</option><option value="held">Held</option><option value="skipped">Skipped</option><option value="cancelled">Cancelled</option></select></label>
          <label><span className="sr-only">Filter by date range</span><select name="range" className={styles.filterSelect} defaultValue={range}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All history</option></select></label>
          <button className="ua-button ua-button--secondary ua-button--sm" type="submit">Apply</button>
          <span>{formatNumber(total)} runs · Europe/London</span>
        </form>
        {searchCapped ? <p className={styles.message} role="status">Search covers the newest {formatNumber(SEARCH_SCOPE_LIMIT)} runs in this scope. The loaded match count is partial, not a complete total.</p> : null}
        {runs.length ? (
          <div className={styles.flowRunTableScroll}>
            <div role="table" aria-label="Flow run records" className={styles.flowRunTable}>
              <div role="rowgroup">
                <div role="row" className={`${styles.flowRunGrid} ${styles.flowRunHeader}`}>
                  {['Run', 'Flow', 'Trigger', 'State', 'Outcome or reason', 'Started', 'Completed', 'Duration'].map((label) => (
                    <span role="columnheader" key={label}>{label}</span>
                  ))}
                </div>
              </div>
              <div role="rowgroup">
                {runs.map((run) => {
                  const stateDisplay = runState(run);
                  return (
                    <Link role="row" href={`/controls/flows/runs/${run.id}`} className={`${styles.flowRunGrid} ${styles.flowRunRow}`} key={run.id}>
                      <span role="cell" className={styles.flowRunId}>RUN-{hashId(run.id)}</span>
                      <span role="cell" title={names.get(run.workflow_definition_id) ?? 'Flow unavailable'}>{names.get(run.workflow_definition_id) ?? 'Flow unavailable'}</span>
                      <span role="cell" title={triggerNames.get(run.domain_event_id) ?? 'Trigger unavailable'}>{triggerNames.get(run.domain_event_id) ?? 'Trigger unavailable'}</span>
                      <span role="cell"><i className={styles.flowRunState} data-tone={stateDisplay.tone}>{stateDisplay.label}</i></span>
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
        ) : <div data-state-id="flow-runs-empty"><EmptyState title={hasFilters ? 'No runs match this scope' : 'No historical flow runs'} description={hasFilters ? 'Clear a filter or expand the time range to inspect other historical executions.' : 'Draft sample tests do not create run-history records. Publication and live execution are unavailable in the pilot.'} action={hasFilters ? <ButtonLink href="/controls/flows/runs" variant="secondary">Clear filters</ButtonLink> : <ButtonLink href="/controls/flows" variant="secondary">Open flow drafts</ButtonLink>} /></div>}
        <div className={styles.flowRunsPagination}><span>Showing {total ? formatNumber((resolvedPage - 1) * PAGE_SIZE + 1) : '0'} – {formatNumber(Math.min(resolvedPage * PAGE_SIZE, total))} of {formatNumber(total)}</span><Pagination page={resolvedPage} pageSize={PAGE_SIZE} total={total} previousHref={resolvedPage > 1 ? pageHref(resolvedPage - 1) : undefined} nextHref={resolvedPage * PAGE_SIZE < total ? pageHref(resolvedPage + 1) : undefined} /></div>
      </section>
      <section className={styles.flowRunGlossary}>
        <div><h2>What a state means</h2><p>States describe the automation, never a merchant decision.</p></div>
        <div>{[
          ['Complete', 'Every step ran and produced its recorded result.'],
          ['Failed', 'A step could not run. Nothing after it was attempted.'],
          ['Held', 'The flow reached a human-decision boundary and stopped there by design.'],
          ['Skipped', 'Conditions no longer matched when the flow re-checked them.'],
          ['Cancelled', 'A person stopped the run before it finished.'],
        ].map(([label, copy]) => <div key={label}><strong>{label}</strong><p>{copy}</p></div>)}</div>
      </section>
    </PageFrame>
  );
}
