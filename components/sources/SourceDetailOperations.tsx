import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';
import Link from 'next/link';
import type { ConnectionReadModel } from '@/lib/connections/readModel';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';
import { ProviderLogo } from '@/components/identity/ProviderLogo';
import { SourceConnectionActionsOperations } from './SourceConnectionActionsOperations';
import { formatDateMode, formatDateTime, formatNumber } from '@/lib/utils/format';

export type OperationsSyncJob = {
  id: string;
  status: string;
  job_kind: string;
  processed_rows: number | null;
  failed_rows: number | null;
  created_at: string;
  completed_at: string | null;
  last_error_code: string | null;
};

export type OperationsIngestionIssue = {
  id: string;
  event_type: string | null;
  status: string;
  last_error: string | null;
  received_at: string;
};

type Props = {
  item: ConnectorCatalogueItem;
  readModel: ConnectionReadModel;
  badge: EffectiveConnectionBadge;
  displayNote: string | null;
  jobs: OperationsSyncJob[];
  issues: OperationsIngestionIssue[];
  canManage: boolean;
  setupHref: string;
};

function humanize(value: string | null | undefined) {
  const text = String(value ?? '').replaceAll('_', ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unavailable';
}

function runDuration(started: string, completed: string | null) {
  if (!completed) return 'In progress';
  const duration = Date.parse(completed) - Date.parse(started);
  if (!Number.isFinite(duration) || duration < 0) return '—';
  if (duration < 60_000) return `${Math.round(duration / 1_000)}s`;
  return `${Math.floor(duration / 60_000)}m ${Math.floor((duration % 60_000) / 1_000)}s`;
}

function runState(status: string, error: string | null) {
  if (/complete|success/i.test(status) && !error) return 'complete';
  if (/fail|partial|error|dead/i.test(status) || error) return 'stalled';
  return 'running';
}

function days(jobs: OperationsSyncJob[]) {
  const now = new Date();
  const result: Array<{ key: string; day: number; state: 'synced' | 'stalled' | 'none'; title: string }> = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    const sameDay = jobs.filter((job) => job.created_at.startsWith(key));
    const stalled = sameDay.some((job) => runState(job.status, job.last_error_code) === 'stalled');
    const synced = sameDay.some((job) => runState(job.status, job.last_error_code) === 'complete');
    result.push({ key, day: date.getUTCDate(), state: stalled ? 'stalled' : synced ? 'synced' : 'none', title: `${formatDateMode(key, 'recent')} · ${stalled ? 'sync stalled' : synced ? 'sync recorded' : 'no sync recorded'}` });
  }
  return result;
}

export function SourceDetailOperations({ item, readModel, badge, displayNote, jobs, issues, canManage, setupHref }: Props) {
  const connected = readModel.configuration === 'configured';
  const planned = item.stage === 'planned';
  const heat = days(jobs);
  const latestFailedRows = jobs.find((job) => (job.failed_rows ?? 0) > 0)?.failed_rows ?? null;
  const lastSuccess = item.lastSuccessfulSyncAt ?? readModel.lastDataReceivedAt;
  const delivery = readModel.deliveryModel === 'periodic_sync' ? 'Scheduled sync' : readModel.deliveryModel === 'webhook' ? 'Continuous event delivery' : 'On-demand lookup';
  const writeEnabled = item.capabilities.some((capability) => capability.level !== 'read' && capability.availability === 'enabled');
  const sourceFreshness = readModel.freshnessConfidence === 'measured'
    ? readModel.operational === 'healthy' ? 'Current' : 'Attention'
    : 'Unavailable';
  const usability = planned ? 'Not available' : !connected ? 'Not configured' : readModel.operational === 'healthy' ? 'Usable now' : readModel.operational === 'unknown' ? 'Unavailable' : 'Needs attention';
  const nextAction = planned ? 'No connection action' : connected ? readModel.operational === 'healthy' ? 'Review configuration' : 'Repair connection' : 'Connect source';

  return (
    <div className="uo-page-stack" data-operations-surface="source-detail">
      <section className="uo-card uo-source-summary" aria-labelledby="source-current-position">
        <div className="uo-source-identity"><ProviderLogo provider={item.id} name={item.name} size="md" /><div><header><strong>{item.name}</strong><i data-state={readModel.operational}>{humanize(badge)}</i><span>{humanize(item.category)}</span></header><p>{item.account ? `Account ${item.account}` : 'Account identifier unavailable'} · {connected ? 'connected' : 'not connected'} · {writeEnabled ? 'write capability enabled' : 'read-only'}</p></div></div>
        <div className="uo-source-position">
          <h2 id="source-current-position">Current source position</h2>
          <dl>
            <div><dt>Capability</dt><dd>{item.capabilities.filter((capability) => capability.support !== 'unsupported').length} supported families</dd></div>
            <div><dt>Workspace</dt><dd>{connected ? 'Configured' : 'Not configured'}</dd></div>
            <div><dt>Usability</dt><dd>{usability}</dd></div>
            <div><dt>Returned data</dt><dd>{item.importedRecordsKnown === false ? 'Unavailable' : `${formatNumber(item.importedRecords)} records`}</dd></div>
            <div><dt>Freshness</dt><dd>{sourceFreshness}</dd></div>
            <div><dt>Next action</dt><dd>{planned ? nextAction : <Link href={setupHref}>{nextAction}</Link>}</dd></div>
          </dl>
        </div>
        <div className="uo-source-summary-stats"><div><span>Coverage</span><strong>—</strong><small>Expected-source denominator unavailable</small></div><div><span>Records held</span><strong>{item.importedRecordsKnown === false ? '—' : formatNumber(item.importedRecords)}</strong><small>canonical records</small></div><div><span>Last success</span><strong>{lastSuccess ? formatDateMode(lastSuccess, 'recent') : '—'}</strong><small>{lastSuccess ? formatDateTime(lastSuccess) : 'No successful delivery recorded'}</small></div><div><span>Excluded</span><strong>{latestFailedRows == null ? '—' : formatNumber(latestFailedRows)}</strong><small>from the latest failed run</small></div></div>
      </section>

      <div className="uo-source-lead">
        <section className="uo-card uo-source-heat"><header className="uo-card-header"><h2>Has this source been current, day by day?</h2><p>Each cell is one day in the reporting range. Amber is a stalled sync; grey is no sync recorded.</p></header><div className="uo-heat-strip">{heat.map((day) => <div key={day.key}><i data-state={day.state} title={day.title} /><span>{day.day}</span></div>)}</div><footer><span><i data-state="synced" />Synced</span><span><i data-state="stalled" />Stalled</span><span><i data-state="none" />No sync</span><p>{readModel.deliveryModel === 'periodic_sync' ? (displayNote ?? 'Run history is retained for this source.') : `${delivery} does not guarantee a discrete daily sync run.`}</p></footer></section>

        <section className="uo-card uo-source-permissions"><header className="uo-card-header"><h2>What this source is allowed to do</h2><p>Scopes granted at connection. Unauth does not claim permissions the provider did not grant.</p></header><div>{item.capabilities.slice(0, 5).map((capability) => <div key={capability.id}><span><strong>{capability.description}</strong><small>{capability.scopes.length ? capability.scopes.join(', ') : capability.availabilityReason}</small></span><b data-state={capability.availability}>{capability.availability === 'enabled' ? 'Granted' : humanize(capability.availability)}</b></div>)}</div>{item.runtimeVerificationPending ? <details className="uo-source-proof"><summary>Runtime verification pending · {item.pendingRuntimeCapabilities.length} lifecycle checks</summary><dl>{item.lifecycle.map((dim) => <div key={dim.id}><dt>{humanize(dim.id)}</dt><dd><strong>{humanize(dim.evidence)}</strong><span>{dim.detail}</span>{dim.runtimeEvidence ? <small>{dim.runtimeEvidence.result === 'passed' ? 'Passed' : 'Failed'} · {formatDateTime(dim.runtimeEvidence.verifiedAt)} · {dim.runtimeEvidence.environment}</small> : <small>No controlled runtime record retained</small>}</dd></div>)}</dl></details> : null}</section>
      </div>

      <section className="uo-card uo-source-table">
        <header className="uo-card-header"><h2>Freshness by object family</h2><p>A stale object stays visible and counted. It is never treated as absent.</p></header>
        <div className="uo-source-freshness-grid uo-table-head"><span>Object family</span><span>Records</span><span>Latest record</span><span>Freshness</span><span>Effect on cases</span></div>
        <div>{item.capabilities.slice(0, 8).map((capability) => { const supported = capability.support === 'supported' && capability.availability !== 'unsupported'; return <div className="uo-source-freshness-grid uo-table-row" key={capability.id}><span>{capability.description}</span><span data-align="right">—</span><span>— Object-family time unavailable</span><span><i className="uo-source-state" data-state={supported ? readModel.operational : 'unavailable'}>{supported ? sourceFreshness : 'Unavailable'}</i></span><span>{supported ? capability.availabilityReason : 'This object family cannot contribute evidence from this source'}</span></div>; })}</div>
        <footer>Object-family record counts and timestamps stay unavailable until the connector records them separately; source-level freshness is not copied into those cells.</footer>
      </section>

      <div className="uo-source-history-pair">
        <section className="uo-card uo-source-history"><header className="uo-card-header"><h2>Sync and import history</h2><p>Last six runs. Every retained run stays visible.</p></header><div className="uo-source-history-grid uo-table-head"><span>Run</span><span>Started</span><span>Rows</span><span>Duration</span><span>Outcome</span></div><div>{jobs.length ? jobs.slice(0, 6).map((job) => <div className="uo-source-history-grid uo-table-row" key={job.id}><span>{humanize(job.job_kind)}</span><span>{formatDateTime(job.created_at)}</span><span data-align="right">{formatNumber(job.processed_rows)}</span><span data-align="right">{runDuration(job.created_at, job.completed_at)}</span><span><i className="uo-source-state" data-state={runState(job.status, job.last_error_code)}>{humanize(job.status)}</i></span></div>) : <div className="uo-empty"><strong>No retained runs</strong><span>No sync history is inferred from connection state.</span></div>}</div></section>

        <section className="uo-card uo-source-errors"><header className="uo-card-header"><h2>Ingestion errors</h2><p>{latestFailedRows == null ? 'Failed-row count is unavailable. Recorded failures remain visible.' : `${formatNumber(latestFailedRows)} rows could not be ingested in the latest failed run. They are excluded, not silently dropped.`}</p></header><div className="uo-source-error-grid uo-table-head"><span>Error</span><span>Rows</span><span>First seen</span><span>Action</span></div><div>{issues.length ? issues.slice(0, 6).map((issue) => <div className="uo-source-error-grid uo-table-row" key={issue.id}><span>{humanize(issue.event_type)}</span><span data-align="right">—</span><span>{formatDateTime(issue.received_at)}</span><span>{issue.last_error ?? 'Operator review required'}</span></div>) : <div className="uo-empty"><strong>No ingestion errors</strong><span>No failed or dead-letter events are recorded.</span></div>}</div><footer>Repairing the connection may replay failed pages; retained canonical rows are not treated as new source records.</footer></section>
      </div>

      <div className="uo-source-bottom">
        <section className="uo-card"><header className="uo-card-header"><h2>Field mapping</h2><p>Retained with every ingested record.</p></header><div className="uo-source-unavailable"><strong>— Unavailable</strong><span>This connector does not publish a field-level mapping manifest to the application.</span></div></section>
        <section className="uo-card"><header className="uo-card-header"><h2>Configuration</h2><p>Applies to the next successful run.</p></header><dl className="uo-source-facts"><div><dt>Schedule</dt><dd>{delivery}</dd></div><div><dt>Historical scope</dt><dd>— Unavailable</dd></div><div><dt>Timezone</dt><dd>— Provider controlled</dd></div><div><dt>Writeback</dt><dd>{writeEnabled ? 'Enabled for granted capabilities' : 'Disabled — read-only'}</dd></div></dl></section>
        <section className="uo-card"><header className="uo-card-header"><h2>Repair or disconnect</h2><p>Disconnecting keeps every canonical record already ingested.</p></header><div className="uo-source-repair"><p>Repairing re-authorises the account and retries supported source work. Disconnecting stops future ingestion; {item.importedRecordsKnown === false ? 'records already held' : `${formatNumber(item.importedRecords)} records already held`} stay, and future freshness becomes unavailable rather than stale.</p><SourceConnectionActionsOperations providerId={item.id} providerName={item.name} setupHref={setupHref} canManage={canManage} connected={connected} planned={planned} placement="card" /></div></section>
      </div>
    </div>
  );
}
