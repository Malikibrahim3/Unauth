import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import type { AnalysisItem, DailyRunActivity } from '@/lib/visualisation/secondaryAnalytics';
import { ChartFrame, ChartState, simpleChartTable } from './ChartFrame';
import styles from './SecondaryAnalytics.module.css';
import { proportionalLength } from '@/lib/visualisation/proportionalLength';

export function AnalysisGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function CountBars({
  id,
  question,
  summary,
  items,
  emptyTitle,
  emptyDescription,
  tone = 'primary',
  records,
  freshness,
  emptyKind = 'insufficient-history',
}: {
  id: string;
  question: string;
  summary: string;
  items: AnalysisItem[];
  emptyTitle: string;
  emptyDescription: string;
  tone?: 'primary' | 'negative';
  records?: { href: string; label?: string };
  freshness?: string;
  emptyKind?: 'insufficient-history' | 'unavailable' | 'empty';
}) {
  const rows = items.slice(0, 6);
  const max = Math.max(0, ...rows.map((item) => item.value));
  return (
    <ChartFrame id={id} kind="count-bars" question={question} summary={summary} records={records} freshness={freshness} compact table={rows.length ? simpleChartTable(rows.map((item) => ({ label: item.label, value: formatNumber(item.value), detail: item.detail, href: item.href }))) : undefined}>
      {rows.length ? <div className={styles.bars} role="group" aria-label={question}>{rows.map((item) => <div className={styles.barRow} key={item.key}>
        <span className={styles.barLabel}>{item.href ? <Link href={item.href}>{item.label}</Link> : item.label}</span>
        <span className={styles.track} aria-hidden="true"><span className={styles.fill} data-tone={tone} style={{ width: `${proportionalLength(item.value, max)}%` }} /></span>
        <strong className={styles.value}>{formatNumber(item.value)}</strong>
      </div>)}</div> : <ChartState kind={emptyKind} title={emptyTitle} description={emptyDescription} />}
    </ChartFrame>
  );
}

export function DailyRunBars({ activity, successRate, scope }: { activity: DailyRunActivity[]; successRate: number | null; scope: string }) {
  const max = Math.max(1, ...activity.map((item) => item.total));
  const rows = activity.map((item) => ({ label: item.label, value: `${item.successful} of ${item.total}`, detail: item.total ? `${Math.round(item.successful / item.total * 100)}% successful` : 'Verified zero' }));
  return (
    <ChartFrame id="flow-run-volume" kind="interval-stacked-bars" question="Are flows completing reliably?" summary={successRate == null ? 'Success rate is unavailable until the first run completes.' : `${successRate}% of ${activity.reduce((sum, item) => sum + item.total, 0)} runs completed without an execution error.`} scope={scope} records={{ href: '#flow-run-records', label: 'View run records' }} table={activity.length ? simpleChartTable(rows) : undefined} compact={!activity.length}>
      {activity.length ? <div className={styles.daily} style={{ '--days': activity.length } as React.CSSProperties} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}>{activity.map((item) => {
        const height = Math.max(3, item.total / max * 100);
        const successHeight = item.total ? item.successful / item.total * 100 : 0;
        return <span className={styles.day} key={item.key} title={`${item.label}: ${item.successful} successful of ${item.total} runs`}><span className={styles.column} style={{ height: `${height}%` }}><span className={styles.successful} style={{ height: `${successHeight}%` }} /></span><span>{item.label}</span></span>;
      })}</div> : <ChartState kind="insufficient-history" title="No run history in this scope" description="Publish a flow and allow it to receive a trigger event. Draft simulations stay separate from live run history." />}
    </ChartFrame>
  );
}

export function OutcomeBand({ total, segments }: { total: number; segments: Array<{ label: string; value: number; tone: 'positive' | 'negative' | 'neutral' }> }) {
  return <div><div className={styles.outcomeBand} role="img" aria-label={segments.map((item) => `${item.label}: ${item.value}`).join(', ')}>{segments.map((item) => item.value > 0 ? <span key={item.label} className={styles.segment} data-tone={item.tone} style={{ width: `${total ? item.value / total * 100 : 0}%` }} /> : null)}</div><ul className={styles.legend}>{segments.map((item) => <li key={item.label}><i className={styles.segment} data-tone={item.tone} />{item.label} · {formatNumber(item.value)}</li>)}</ul></div>;
}

export type ProviderRunDatum = {
  id: string;
  label: string;
  state: 'success' | 'failed' | 'running' | 'other';
  processed: number | null;
  failed: number | null;
  duration: string;
  href?: string;
};

export function ProviderRunStrip({ runs, freshness }: { runs: ProviderRunDatum[]; freshness: string }) {
  const processedLabel = (value: number | null) => value == null ? 'Processed count unavailable' : `${formatNumber(value)} processed`;
  const failedLabel = (value: number | null) => value == null ? 'Failed count unavailable' : `${formatNumber(value)} failed`;
  const rows = runs.map((run) => ({ label: run.label, value: processedLabel(run.processed), detail: `${run.duration} · ${failedLabel(run.failed)}`, href: run.href }));
  return <ChartFrame id="provider-run-telemetry" kind="provider-run-strip" question="Are recent provider runs healthy?" summary="The latest retained runs show outcome, elapsed time and ingested row count. Connection health text remains authoritative." freshness={freshness} records={{ href: '#sync-history', label: 'Inspect run history' }} table={runs.length ? simpleChartTable(rows) : undefined} compact>
    {runs.length ? <div className={styles.runStrip} style={{ '--runs': runs.length } as React.CSSProperties} role="group" aria-label="Recent provider runs">{runs.map((run, index) => {
      const description = `${run.label}: ${processedLabel(run.processed)}, ${failedLabel(run.failed)}, ${run.duration}`;
      const content = <><span>{index + 1}</span><span className="sr-only">{description}</span></>;
      return run.href ? <Link key={run.id} href={run.href} className={styles.runBlock} data-state={run.state} title={description}>{content}</Link> : <span key={run.id} className={styles.runBlock} data-state={run.state} title={description}>{content}</span>;
    })}</div> : <ChartState kind="insufficient-history" title="No provider runs recorded" description="This provider has no retained sync or import run telemetry. No success rate or throughput is inferred from connection state." />}
  </ChartFrame>;
}
