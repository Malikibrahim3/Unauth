'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDateTime } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import type { CSSProperties } from 'react';
const styles: Record<string, CSSProperties> = {
  flowRunDetail:{display:'grid',gap:14},flowRunSummaryCard:{overflow:'hidden',border:'1px solid #e4e3e0',borderRadius:12,background:'#fff'},flowRunSummaryIdentity:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,padding:'14px 16px'},flowRunSummaryBadges:{display:'flex',alignItems:'center',gap:7},flowRunMono:{fontFamily:"'IBM Plex Mono',monospace"},flowRunDetailBadge:{display:'inline-flex',padding:'3px 6px',borderRadius:5,background:'#f2f0ed',fontSize:9.5},flowRunSummaryFacts:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:1,background:'#eae8e5'},flowRunFailure:{padding:'11px 16px',background:'#fdf0e6',color:'#b0431a',fontSize:11.5},
  flowRunDetailGrid:{display:'grid',gridTemplateColumns:'minmax(0,1fr) 320px',gap:14,alignItems:'start'},flowRunDetailCard:{overflow:'hidden',border:'1px solid #e4e3e0',borderRadius:12,background:'#fff'},flowRunDetailHeading:{padding:'12px 14px',borderBottom:'1px solid #eae8e5'},flowRunTraceList:{display:'grid'},flowRunTraceStep:{display:'grid',gridTemplateColumns:'34px minmax(0,1fr)',gap:8,padding:'12px 14px',borderBottom:'1px solid #f4f2ef'},flowRunTraceRail:{display:'grid',justifyItems:'center',alignContent:'start'},flowRunTraceBody:{minWidth:0},flowRunTraceHead:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10},flowRunTraceFacts:{display:'grid',gridTemplateColumns:'100px minmax(0,1fr)',gap:'6px 10px',margin:'9px 0 0',fontSize:10.5},flowRunStepNote:{margin:'9px 0 0',padding:9,borderRadius:8,background:'#ffffff',color:'#64686d',fontSize:10.5},flowRunUnavailable:{margin:0,padding:18,color:'#6f6a63',fontSize:11.5},flowRunDetailRail:{display:'grid',gap:12},flowRunDetailFootnote:{margin:0,padding:'10px 14px',borderTop:'1px solid #eae8e5',background:'#ffffff',color:'#6f6a63',fontSize:10.5},flowRunAuditList:{display:'grid',gap:8,margin:0,padding:'12px 14px 12px 30px',fontSize:10.5},flowRunRetryBody:{display:'grid',gap:9,padding:14},flowRunTrigger:{maxHeight:180,overflow:'auto',margin:0,padding:10,borderRadius:8,background:'#f4f3f1',fontSize:10},
};

type JsonRecord = Record<string, unknown>;

export type FlowRunTraceData = {
  run: {
    id: string;
    status: string;
    error: string | null;
    started_at: string;
    completed_at: string | null;
    domain_event_id: string;
    workflow_definition_id: string;
  };
  flow: {
    id: string;
    name: string;
    version: number;
    status: string;
    trigger_event_type: string;
    outputs: unknown;
  } | null;
  event: { event_type: string; occurred_at: string; payload: unknown } | null;
  steps: Array<{
    id: string;
    step_index: number;
    output_type: string;
    status: string;
    result: unknown;
    error: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asOutputs(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function json(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return 'Recorded data could not be displayed.';
  }
}

function elapsed(start: string, end: string | null) {
  if (!end) return 'In progress';
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function humanize(value: string | undefined, fallback = 'Configured action') {
  if (!value) return fallback;
  return value
    .replace(/[._]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueFrom(payload: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function toneFor(status: string, error: string | null) {
  const normalized = status.toLowerCase();
  if (error || normalized === 'failed' || normalized === 'error') return 'critical';
  if (normalized === 'completed' || normalized === 'complete' || normalized === 'success') return 'positive';
  if (normalized === 'running' || normalized === 'matched') return 'accent';
  return 'muted';
}

export function FlowRunTrace({ data }: { data: FlowRunTraceData }) {
  const [payloadOpen, setPayloadOpen] = useState(false);
  const configuredOutputs = asOutputs(data.flow?.outputs);
  const expectedCount = Math.max(configuredOutputs.length, data.steps.length);
  const runFailed = Boolean(data.run.error) || data.run.status.toLowerCase() === 'failed';
  const failedStep = data.steps.find((step) => Boolean(step.error) || step.status.toLowerCase() === 'failed');
  const completedSteps = data.steps.filter((step) => {
    const status = step.status.toLowerCase();
    return !step.error && (status === 'complete' || status === 'completed' || status === 'success');
  });
  const recordsChanged = data.steps.filter((step) => Object.keys(asRecord(step.result)).length > 0 && !step.error).length;
  const triggerPayload = asRecord(data.event?.payload);
  const caseId = valueFrom(triggerPayload, ['case_id', 'support_payout_case_id', 'aggregate_id']);
  const traceLength = Math.max(expectedCount, data.steps.length);
  const safeTrigger = json(data.event?.payload ?? { state: 'Unavailable', reason: 'The retained trigger payload is not available.' });
  const flowHref = data.flow ? `/controls/flows/${data.flow.id}?version=${data.flow.version}` : null;
  const runTone = toneFor(data.run.status, data.run.error);
  const runLabel = runFailed && failedStep
    ? `Failed at step ${failedStep.step_index + 1}`
    : humanize(data.run.status, 'Unavailable');

  return (
    <div style={styles.flowRunDetail} data-operations-surface="flow-run-detail">
      <section style={styles.flowRunSummaryCard} aria-label="Run summary">
        <div style={styles.flowRunSummaryIdentity}>
          <div style={styles.flowRunSummaryBadges}>
            <span style={styles.flowRunMono}>RUN-{hashId(data.run.id).slice(1)}</span>
            <span style={styles.flowRunDetailBadge} data-tone={runTone}>{runLabel}</span>
            <span style={styles.flowRunDetailBadge} data-tone="muted">
              {data.flow ? `v${data.flow.version} ${data.flow.status || 'version'}` : 'Flow unavailable'}
            </span>
          </div>
          <h2>{data.flow?.name ?? 'Originating flow unavailable'}</h2>
          <p>
            Triggered by {humanize(data.event?.event_type ?? data.flow?.trigger_event_type, 'an unavailable event')}
            {caseId ? <> · <Link style={{ color: '#9f4f08', textDecoration: 'underline', textUnderlineOffset: '0.2em' }} href={`/cases/${caseId}`}>{caseId}</Link></> : null}
            {' · '}{formatDateTime(data.run.started_at)}
          </p>
        </div>
        <div style={styles.flowRunSummaryFacts}>
          <RunFact label="Duration" value={elapsed(data.run.started_at, data.run.completed_at)} detail={runFailed && failedStep ? `stopped at step ${failedStep.step_index + 1}` : data.run.completed_at ? 'recorded duration' : 'still running'} />
          <RunFact label="Steps run" value={String(data.steps.length)} detail={expectedCount > data.steps.length ? `${expectedCount - data.steps.length} not attempted` : expectedCount ? `${completedSteps.length} completed` : 'no action output'} />
          <RunFact label="Records changed" value={String(recordsChanged)} detail={recordsChanged ? 'recorded outputs' : 'none recorded'} />
          <RunFact label="Decisions made" value="0" detail="by design" />
        </div>
      </section>

      {runFailed ? (
        <div style={styles.flowRunFailure} role="alert">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 1.8 13.2 12H1.8Z"/><path d="M7.5 5v3.2"/><circle cx="7.5" cy="10.5" r=".55" fill="currentColor" stroke="none"/></svg>
          <p>
            <strong>{failedStep ? `Step ${failedStep.step_index + 1} failed.` : 'This run failed.'}</strong>{' '}
            {failedStep?.error ?? data.run.error ?? 'No retained failure detail is available.'}{' '}
            No merchant decision was recorded. Any later configured steps were not attempted.
          </p>
        </div>
      ) : null}

      <div style={styles.flowRunDetailGrid}>
        <section style={styles.flowRunDetailCard} aria-labelledby="execution-trace-title">
          <div style={styles.flowRunDetailHeading}>
            <h2 id="execution-trace-title">Execution trace</h2>
            <p>In order, with the input each step received and the result it produced.</p>
          </div>
          <div style={styles.flowRunTraceList}>
            {traceLength ? Array.from({ length: traceLength }, (_, index) => {
              const step = data.steps.find((candidate) => candidate.step_index === index) ?? data.steps[index] ?? null;
              const configured = configuredOutputs[index] ?? {};
              const status = step
                ? step.error
                  ? 'Failed'
                  : humanize(step.status, 'Recorded')
                : 'Not attempted';
              const tone = step ? toneFor(step.status, step.error) : 'muted';
              const name = humanize(step?.output_type ?? (typeof configured.type === 'string' ? configured.type : undefined));
              const timestamp = step ? formatDateTime(step.completed_at ?? step.created_at) : '—';
              return (
                <article style={styles.flowRunTraceStep} key={step?.id ?? `configured-${index}`}>
                  <div style={styles.flowRunTraceRail}>
                    <span data-tone={tone}>{index + 1}</span>
                    {index < traceLength - 1 ? <i aria-hidden="true" /> : null}
                  </div>
                  <div style={styles.flowRunTraceBody}>
                    <div style={styles.flowRunTraceHead}>
                      <strong>{name}</strong>
                      <span style={styles.flowRunDetailBadge} data-tone={tone}>{status}</span>
                      <time>{timestamp}</time>
                    </div>
                    <dl style={styles.flowRunTraceFacts}>
                      <dt>Input</dt>
                      <dd><code>{step ? json(configuredOutputs[index] ?? { event: data.event?.event_type ?? 'Unavailable' }) : '— Not attempted'}</code></dd>
                      <dt>Result</dt>
                      <dd>{step ? <code>{step.error ? '— No result recorded' : json(step.result)}</code> : '— Not attempted'}</dd>
                    </dl>
                    {step?.error ? <p style={styles.flowRunStepNote} data-tone="critical">{step.error}</p> : null}
                    {!step && index === traceLength - 1 ? <p style={styles.flowRunStepNote}>A flow cannot make a merchant decision. Any decision boundary stays with an authorised person.</p> : null}
                  </div>
                </article>
              );
            }) : <p style={styles.flowRunUnavailable}>No bounded action steps were recorded. A non-matching trigger can complete without changing a record.</p>}
          </div>
        </section>

        <aside style={styles.flowRunDetailRail}>
          <section style={styles.flowRunDetailCard}>
            <div style={styles.flowRunDetailHeading}>
              <h2>Trigger event</h2>
              <p>The event exactly as the flow received it, with sensitive fields redacted.</p>
            </div>
            <p style={styles.flowRunDetailFootnote}>Sensitive fields and direct identifiers are redacted before this view is rendered.</p>
            <button type="button" style={{ margin: '0 14px 14px', padding: '7px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }} onClick={() => setPayloadOpen(true)}>Inspect trigger payload</button>
          </section>

          <section style={styles.flowRunDetailCard}>
            <div style={styles.flowRunDetailHeading}>
              <h2>Audit events</h2>
              <p>Append-only. A retry would add a new run; it would not rewrite this one.</p>
            </div>
            <ol style={styles.flowRunAuditList}>
              {data.event ? <AuditRow label={`Trigger received: ${humanize(data.event.event_type)}`} meta={formatDateTime(data.event.occurred_at)} /> : null}
              {data.steps.map((step) => <AuditRow key={step.id} label={`${humanize(step.output_type)} · ${step.error ? 'failed' : humanize(step.status)}`} meta={formatDateTime(step.completed_at ?? step.created_at)} />)}
              {data.run.completed_at ? <AuditRow label={runFailed ? 'Run marked failed' : `Run marked ${humanize(data.run.status).toLowerCase()}`} meta={formatDateTime(data.run.completed_at)} /> : null}
              {!data.event && !data.steps.length && !data.run.completed_at ? <li style={styles.flowRunUnavailable}>No execution events were retained for this run.</li> : null}
            </ol>
          </section>

          <section style={styles.flowRunDetailCard}>
            <div style={styles.flowRunDetailHeading}><h2>Retry safely</h2></div>
            <div style={styles.flowRunRetryBody}>
              <p>A retry must create a new immutable execution. This environment does not expose a retry mutation, so this historic run cannot be replayed from the inspector.</p>
              {flowHref ? <Link href={flowHref}>Open flow</Link> : <span>Originating flow unavailable</span>}
            </div>
          </section>
        </aside>
      </div>
      {payloadOpen ? <div role="dialog" aria-modal="true" data-overlay-id="flow-run-payload-inspector" style={{ position: 'fixed', zIndex: 80, inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}><div style={{ width: 720, maxWidth: '100%', maxHeight: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>Trigger payload</div><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>Read-only provenance from the immutable event that started this run. Sensitive fields are redacted before rendering.</div></div><button type="button" aria-label="Close dialog" onClick={() => setPayloadOpen(false)} style={{ border: 0, padding: 2, background: 'transparent', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg></button></div><div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px' }}><dl style={styles.flowRunTraceFacts}><dt>Event type</dt><dd>{humanize(data.event?.event_type, 'Unavailable')}</dd><dt>Occurred</dt><dd>{data.event ? formatDateTime(data.event.occurred_at) : '— Unavailable'}</dd><dt>Run</dt><dd><code>RUN-{hashId(data.run.id).slice(1)}</code></dd><dt>Payload</dt><dd><pre style={styles.flowRunTrigger}>{safeTrigger}</pre></dd></dl><p style={styles.flowRunDetailFootnote}>This inspector cannot replay the run, change a record, record a merchant decision, contact a provider, or move money.</p></div></div></div> : null}
    </div>
  );
}

function RunFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function AuditRow({ label, meta }: { label: string; meta: string }) {
  return <li><span>{label}</span><time>{meta}</time></li>;
}
