'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import styles from './AutomationControls.module.css';

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
    .replaceAll('_', ' ')
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
    <div className={styles.flowRunDetail} data-operations-surface="flow-run-detail">
      <section className={styles.flowRunSummaryCard} aria-label="Run summary">
        <div className={styles.flowRunSummaryIdentity}>
          <div className={styles.flowRunSummaryBadges}>
            <span className={styles.flowRunMono}>RUN-{hashId(data.run.id).slice(1)}</span>
            <span className={styles.flowRunDetailBadge} data-tone={runTone}>{runLabel}</span>
            <span className={styles.flowRunDetailBadge} data-tone="muted">
              {data.flow ? `v${data.flow.version} ${data.flow.status || 'version'}` : 'Flow unavailable'}
            </span>
          </div>
          <h2>{data.flow?.name ?? 'Originating flow unavailable'}</h2>
          <p>
            Triggered by {humanize(data.event?.event_type ?? data.flow?.trigger_event_type, 'an unavailable event')}
            {caseId ? <> · <Link href={`/cases/${caseId}`}>{caseId}</Link></> : null}
            {' · '}{formatDateTime(data.run.started_at)}
          </p>
        </div>
        <div className={styles.flowRunSummaryFacts}>
          <RunFact label="Duration" value={elapsed(data.run.started_at, data.run.completed_at)} detail={runFailed && failedStep ? `stopped at step ${failedStep.step_index + 1}` : data.run.completed_at ? 'recorded duration' : 'still running'} />
          <RunFact label="Steps run" value={String(data.steps.length)} detail={expectedCount > data.steps.length ? `${expectedCount - data.steps.length} not attempted` : expectedCount ? `${completedSteps.length} completed` : 'no action output'} />
          <RunFact label="Records changed" value={String(recordsChanged)} detail={recordsChanged ? 'recorded outputs' : 'none recorded'} />
          <RunFact label="Decisions made" value="0" detail="by design" />
        </div>
      </section>

      {runFailed ? (
        <div className={styles.flowRunFailure} role="alert">
          <TriangleAlert size={15} aria-hidden="true" />
          <p>
            <strong>{failedStep ? `Step ${failedStep.step_index + 1} failed.` : 'This run failed.'}</strong>{' '}
            {failedStep?.error ?? data.run.error ?? 'No retained failure detail is available.'}{' '}
            No merchant decision was recorded. Any later configured steps were not attempted.
          </p>
        </div>
      ) : null}

      <div className={styles.flowRunDetailGrid}>
        <section className={styles.flowRunDetailCard} aria-labelledby="execution-trace-title">
          <div className={styles.flowRunDetailHeading}>
            <h2 id="execution-trace-title">Execution trace</h2>
            <p>In order, with the input each step received and the result it produced.</p>
          </div>
          <div className={styles.flowRunTraceList}>
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
                <article className={styles.flowRunTraceStep} key={step?.id ?? `configured-${index}`}>
                  <div className={styles.flowRunTraceRail}>
                    <span data-tone={tone}>{index + 1}</span>
                    {index < traceLength - 1 ? <i aria-hidden="true" /> : null}
                  </div>
                  <div className={styles.flowRunTraceBody}>
                    <div className={styles.flowRunTraceHead}>
                      <strong>{name}</strong>
                      <span className={styles.flowRunDetailBadge} data-tone={tone}>{status}</span>
                      <time>{timestamp}</time>
                    </div>
                    <dl className={styles.flowRunTraceFacts}>
                      <dt>Input</dt>
                      <dd><code>{step ? json(configuredOutputs[index] ?? { event: data.event?.event_type ?? 'Unavailable' }) : '— Not attempted'}</code></dd>
                      <dt>Result</dt>
                      <dd>{step ? <code>{step.error ? '— No result recorded' : json(step.result)}</code> : '— Not attempted'}</dd>
                    </dl>
                    {step?.error ? <p className={styles.flowRunStepNote} data-tone="critical">{step.error}</p> : null}
                    {!step && index === traceLength - 1 ? <p className={styles.flowRunStepNote}>A flow cannot make a merchant decision. Any decision boundary stays with an authorised person.</p> : null}
                  </div>
                </article>
              );
            }) : <p className={styles.flowRunUnavailable}>No bounded action steps were recorded. A non-matching trigger can complete without changing a record.</p>}
          </div>
        </section>

        <aside className={styles.flowRunDetailRail}>
          <section className={styles.flowRunDetailCard}>
            <div className={styles.flowRunDetailHeading}>
              <h2>Trigger event</h2>
              <p>The event exactly as the flow received it, with sensitive fields redacted.</p>
            </div>
            <pre className={styles.flowRunTrigger}>{safeTrigger}</pre>
            <p className={styles.flowRunDetailFootnote}>Sensitive fields and direct identifiers are redacted before this view is rendered.</p>
          </section>

          <section className={styles.flowRunDetailCard}>
            <div className={styles.flowRunDetailHeading}>
              <h2>Audit events</h2>
              <p>Append-only. A retry would add a new run; it would not rewrite this one.</p>
            </div>
            <ol className={styles.flowRunAuditList}>
              {data.event ? <AuditRow label={`Trigger received: ${humanize(data.event.event_type)}`} meta={formatDateTime(data.event.occurred_at)} /> : null}
              {data.steps.map((step) => <AuditRow key={step.id} label={`${humanize(step.output_type)} · ${step.error ? 'failed' : humanize(step.status)}`} meta={formatDateTime(step.completed_at ?? step.created_at)} />)}
              {data.run.completed_at ? <AuditRow label={runFailed ? 'Run marked failed' : `Run marked ${humanize(data.run.status).toLowerCase()}`} meta={formatDateTime(data.run.completed_at)} /> : null}
              {!data.event && !data.steps.length && !data.run.completed_at ? <li className={styles.flowRunUnavailable}>No execution events were retained for this run.</li> : null}
            </ol>
          </section>

          <section className={styles.flowRunDetailCard}>
            <div className={styles.flowRunDetailHeading}><h2>Retry safely</h2></div>
            <div className={styles.flowRunRetryBody}>
              <p>A retry must create a new immutable execution. This environment does not expose a retry mutation, so this historic run cannot be replayed from the inspector.</p>
              {flowHref ? <Link href={flowHref}>Open flow</Link> : <span>Originating flow unavailable</span>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RunFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function AuditRow({ label, meta }: { label: string; meta: string }) {
  return <li><span>{label}</span><time>{meta}</time></li>;
}
