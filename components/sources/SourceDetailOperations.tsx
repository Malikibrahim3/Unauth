import Link from '@/components/navigation/AppNavLink';
import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';
import type { ConnectionReadModel } from '@/lib/connections/readModel';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';
import { formatDateMode, formatDateTime, formatNumber } from '@/lib/utils/format';
import { buildSourceUptimeCells } from '@/lib/capabilities/derived';

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
};

const mono = "'IBM Plex Mono',monospace";
const card = { background: '#fff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' } as const;

function humanize(value: string | null | undefined) {
  const text = String(value ?? '').replaceAll('_', ' ').replaceAll('.', ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unavailable';
}

function runDuration(started: string, completed: string | null) {
  if (!completed) return 'in progress';
  const duration = Date.parse(completed) - Date.parse(started);
  if (!Number.isFinite(duration) || duration < 0) return 'unavailable';
  if (duration < 60_000) return `${Math.round(duration / 1_000)}s`;
  return `${Math.floor(duration / 60_000)}m ${Math.floor((duration % 60_000) / 1_000)}s`;
}

function stateForCapability(capability: ConnectorCatalogueItem['capabilities'][number], connected: boolean) {
  if (capability.support === 'unsupported' || capability.availability === 'unsupported') return { label: 'UNSUPPORTED', background: '#f4f3f1', color: '#64686d', opacity: .55 };
  if (!connected || capability.availability === 'not_connected') return { label: 'NOT CONNECTED', background: '#f4f3f1', color: '#40454a', opacity: 1 };
  if (capability.availability === 'enabled') return { label: 'ENABLED', background: '#eef6f1', color: '#1a6b43', opacity: 1 };
  if (capability.availability === 'degraded' || capability.availability === 'permission_missing' || capability.availability === 'merchant_disabled') return { label: 'PARTIAL', background: '#fff3e9', color: '#7a5310', opacity: 1 };
  return { label: 'UNAVAILABLE', background: '#f4f3f1', color: '#64686d', opacity: 1 };
}

function sourceStatus(readModel: ConnectionReadModel, badge: EffectiveConnectionBadge) {
  if (readModel.configuration !== 'configured') return { label: 'NOT CONNECTED', background: '#f4f3f1', color: '#40454a' };
  if (readModel.operational === 'healthy') return { label: 'HEALTHY', background: '#eef6f1', color: '#1a6b43' };
  if (readModel.operational === 'attention') return { label: humanize(badge).toUpperCase(), background: '#fdf0e6', color: '#b0431a' };
  return { label: 'NOT VERIFIED', background: '#fff3e9', color: '#7a5310' };
}

function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return <div style={{ paddingBottom: 6, display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{children}</span><div style={{ flex: 1 }} />{aside ? <span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{aside}</span> : null}</div>;
}

function EmptyRows({ title, description }: { title: string; description: string }) {
  return <div style={{ flex: 1, minHeight: 90, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderTop: '1px solid #f4f2ef', color: '#64686d' }}><strong style={{ color: '#40454a', font: "500 11.5px/1.4 'Inter',sans-serif" }}>{title}</strong><span style={{ font: "400 10.5px/1.45 'Inter',sans-serif", textAlign: 'center' }}>{description}</span></div>;
}

function UptimePanel({ jobs, deliveryModel, displayNote }: { jobs: OperationsSyncJob[]; deliveryModel: ConnectionReadModel['deliveryModel']; displayNote: string | null }) {
  const cells = buildSourceUptimeCells(jobs, new Date(), 28);
  const successful = cells.filter((cell) => cell.state === 'success').length;
  return (
    <>
      <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>UPTIME · 28 DAYS</div>
      <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div role="img" aria-label="28-day observed source-run history" style={{ display: 'flex', gap: 2 }}>
          {cells.map((cell) => <i key={cell.date} title={`${cell.date}: ${cell.state}; ${cell.observedRuns} observed run${cell.observedRuns === 1 ? '' : 's'}`} style={{ flex: 1, height: 22, borderRadius: 2, background: cell.state === 'success' ? '#1a6b43' : cell.state === 'unknown' ? '#e4e3e0' : '#c98a1a' }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#a7abad', font: `400 9px/1 ${mono}` }}>{cells[0]?.date ? formatDateMode(cells[0].date, 'table') : '—'}</span><span style={{ color: '#a7abad', font: `400 9px/1 ${mono}` }}>{cells.at(-1)?.date ? formatDateMode(cells.at(-1)!.date, 'table') : '—'}</span></div>
        <div style={{ paddingTop: 8, display: 'flex', alignItems: 'baseline', gap: 8, borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Successful days</span><span style={{ color: successful ? '#1a6b43' : '#64686d', font: `400 11.5px/1.5 ${mono}` }}>{successful} of 28 observed</span></div>
        <div style={{ color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{jobs.length ? 'Green is a retained successful run. Amber is degraded or failed. Grey means no run was observed.' : deliveryModel === 'periodic_sync' ? 'No retained run history is available. Grey does not mean failure.' : `${displayNote ?? 'This source does not prove a discrete daily run.'} Grey does not mean failure.`}</div>
      </div>
    </>
  );
}

export function SourceDetailOperations({ item, readModel, badge, displayNote, jobs, issues }: Props) {
  const connected = readModel.configuration === 'configured';
  const status = sourceStatus(readModel, badge);
  const lastData = readModel.lastDataReceivedAt ?? item.lastSuccessfulSyncAt;
  const delivery = readModel.deliveryModel === 'periodic_sync' ? 'scheduled sync' : readModel.deliveryModel === 'webhook' ? 'webhooks / continuous events' : 'on-demand lookup';
  const scopes = [...new Set(item.scopes)];
  const auth = humanize(item.authMode);
  const latestFailedRows = jobs.find((job) => (job.failed_rows ?? 0) > 0)?.failed_rows ?? null;

  return (
    <div data-operations-surface="source-detail" data-provenance={item.screenshotFixture} data-state-id={item.stage === 'planned' || !connected ? 'source-unavailable' : undefined} style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, color: '#1c1f23' }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ ...card, flex: 'none', padding: '12px 16px 10px' }} aria-labelledby="source-capability-title">
          <div style={{ paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span id="source-capability-title" style={{ flex: 1, color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHAT THIS SOURCE CAN DO</span>
            <span style={{ width: 96, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em' }}>DIRECTION</span>
            <span style={{ width: 104, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em' }}>STATE</span>
            <span style={{ width: 110, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em' }}>LAST DATA</span>
            <span style={{ width: 80, flex: 'none', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em', textAlign: 'right' }}>RECORDS</span>
          </div>
          {item.capabilities.slice(0, 8).map((capability) => {
            const state = stateForCapability(capability, connected);
            return (
              <div key={capability.id} style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #f4f2ef', opacity: state.opacity }}>
                <span style={{ flex: 1, minWidth: 0, color: '#1c1f23', font: "400 12px/1.4 'Inter',sans-serif" }}>{capability.description}</span>
                <span style={{ width: 96, flex: 'none', color: '#64686d', font: `400 11px/1.4 ${mono}` }}>{capability.level}</span>
                <span style={{ width: 104, flex: 'none' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: state.background, color: state.color, font: "500 10px/1.5 'Inter',sans-serif" }}>{state.label}</span></span>
                <span style={{ width: 110, flex: 'none', color: '#64686d', font: `400 11px/1.4 ${mono}` }}>{capability.lastDataReceivedAt ? formatDateTime(capability.lastDataReceivedAt) : 'Unavailable'}</span>
                <span style={{ width: 80, flex: 'none', color: '#40454a', font: `400 11.5px/1.4 ${mono}`, textAlign: 'right' }}>{capability.recordCount != null ? formatNumber(capability.recordCount) : '—'}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{item.capabilities.some((capability) => ['write', 'act'].includes(capability.level) && capability.availability === 'enabled') ? `${item.name} has at least one enabled write capability. Each row above retains its exact granted state.` : `${item.name} may support writes, but this connection does not claim them where the provider did not grant or the product did not request them.`} {item.screenshotFixture ? 'Object-family activity is populated for this staging account.' : 'Object-family timestamps and counts stay unavailable rather than inheriting source-level totals.'}</div>
        </section>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
          <section style={{ ...card, flex: 1, minWidth: 0, padding: '12px 15px 11px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} aria-labelledby="recent-imports-title">
            <SectionLabel aside={delivery}><span id="recent-imports-title">RECENT IMPORTS</span></SectionLabel>
            {jobs.length ? jobs.slice(0, 6).map((job) => {
              const failed = (job.failed_rows ?? 0) > 0 || Boolean(job.last_error_code) || /fail|error|partial/i.test(job.status);
              return <div key={job.id} style={{ padding: '9px 0', display: 'flex', alignItems: 'center', gap: 11, borderTop: '1px solid #f4f2ef' }}><span style={{ width: 88, flex: 'none', color: '#64686d', font: `400 11px/1.4 ${mono}` }}>{formatDateTime(job.created_at)}</span>{item.screenshotFixture ? <span style={{ width: 82, flex: 'none', color: '#1c1f23', font: `400 11.5px/1.4 ${mono}` }}>Completed</span> : <Link href={`/sources/imports/${job.id}`} style={{ width: 82, flex: 'none', color: '#1c1f23', font: `400 11.5px/1.4 ${mono}`, textDecoration: 'none' }}>{job.id.slice(0, 10)}</Link>}<span style={{ flex: 1, minWidth: 0, color: failed ? '#7a5310' : '#1a6b43', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{job.processed_rows == null ? 'Rows unavailable' : `${formatNumber(job.processed_rows)} processed`}{job.failed_rows ? ` · ${formatNumber(job.failed_rows)} held` : ''} · {runDuration(job.created_at, job.completed_at)}</span></div>;
            }) : <EmptyRows title="No retained imports" description="Connection state does not imply that a sync or import ran." />}
            <div style={{ flex: 1 }} />
            <div style={{ marginTop: 8, paddingTop: 9, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{displayNote ?? `Delivery uses ${delivery}. Only retained run records appear here.`}</div>
          </section>
          <section style={{ ...card, flex: 1, minWidth: 0, padding: '12px 15px 11px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} aria-labelledby="failed-events-title">
            <SectionLabel aside={`${issues.length} retained`}><span id="failed-events-title">FAILED INGESTION EVENTS</span></SectionLabel>
            {issues.length ? issues.slice(0, 6).map((issue) => <div key={issue.id} style={{ padding: '9px 0', display: 'flex', gap: 11, borderTop: '1px solid #f4f2ef' }}><span style={{ width: 88, flex: 'none', color: '#64686d', font: `400 11px/1.5 ${mono}` }}>{formatDateTime(issue.received_at)}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#7a5310', font: "500 11.5px/1.4 'Inter',sans-serif" }}>{humanize(issue.event_type)}</div><div style={{ marginTop: 2, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{issue.last_error ?? `${humanize(issue.status)} · operator review required`}</div></div></div>) : <EmptyRows title="No failed ingestion events" description="No failed or dead-letter event is retained for this connection." />}
            {latestFailedRows != null ? <div style={{ marginTop: 'auto', paddingTop: 9, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{formatNumber(latestFailedRows)} rows were held by the latest failed run; they are not silently counted as imported.</div> : null}
          </section>
        </div>
      </div>

      <aside style={{ width: 300, flex: 'none', minHeight: 0, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto', borderRadius: 13, background: '#f4f3f1' }}>
        <UptimePanel jobs={jobs} deliveryModel={readModel.deliveryModel} displayNote={displayNote} />
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>CONNECTION</div>
        <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Auth', auth],
            ['Delivery', delivery],
            ['Last health check', item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt) : 'Unavailable'],
            ['Last successful sync', item.lastSuccessfulSyncAt ? formatDateTime(item.lastSuccessfulSyncAt) : readModel.deliveryModel === 'periodic_sync' ? 'Unavailable' : 'Not applicable'],
            ['Last data received', lastData ? formatDateTime(lastData) : readModel.freshnessConfidence === 'unavailable' ? 'Unavailable' : 'No data recorded'],
            ['Records held', item.importedRecordsKnown === false ? 'Unavailable' : formatNumber(item.importedRecords)],
          ].map(([label, value]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{label}</span><span style={{ maxWidth: 160, color: value === 'Unavailable' ? '#64686d' : '#1c1f23', font: `400 11.5px/1.5 ${mono}`, textAlign: 'right' }}>{value}</span></div>)}
          <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>State</span><span style={{ padding: '2px 7px', borderRadius: 5, background: status.background, color: status.color, font: "500 10px/1.5 'Inter',sans-serif" }}>{status.label}</span></div>
        </div>
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>SCOPES GRANTED</div>
        <div style={{ ...card, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {scopes.length ? scopes.map((scope) => <div key={scope} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', color: '#40454a', font: `400 11px/1.4 ${mono}` }}>{scope}</span><span style={{ color: '#1a6b43', font: `400 10px/1.4 ${mono}` }}>granted</span></div>) : <span style={{ color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>No provider scope list is retained.</span>}
        </div>
        <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>IF YOU DISCONNECT</div>
        <div style={{ ...card, padding: '12px 13px', color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{item.importedRecordsKnown === false ? 'Records already imported stay, and every case built on them stays.' : `The ${formatNumber(item.importedRecords)} records already imported stay, and every case built on them stays.`} New source data stops arriving and future freshness becomes unavailable rather than zero.</div>
        <div style={{ flex: 1 }} />
        <div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Coverage across all layers is on <Link href="/sources/connected" style={{ color: '#1c1f23' }}>connected sources</Link>.</div>
      </aside>
    </div>
  );
}
