import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import type { AnalysisItem, DailyRunActivity } from '@/lib/visualisation/secondaryAnalytics';
import { ChartFrame, ChartState, simpleChartTable } from './ChartFrame';
import { proportionalLength } from '@/lib/visualisation/proportionalLength';

export function AnalysisGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>{children}</div>;
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
      {rows.length ? <div style={{ display: 'grid', gap: 9 }} role="group" aria-label={question}>{rows.map((item) => <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,.75fr) minmax(100px,1fr) 44px', gap: 9, alignItems: 'center' }} key={item.key}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#40454a', fontSize: 11 }}>{item.href ? <Link href={item.href}>{item.label}</Link> : item.label}</span>
        <span style={{ height: 7, overflow: 'hidden', borderRadius: 4, background: '#ece9e4' }} aria-hidden="true"><span data-tone={tone} style={{ display: 'block', height: '100%', width: `${proportionalLength(item.value, max)}%`, borderRadius: 4, background: tone === 'negative' ? '#b0431a' : '#1c1f23' }} /></span>
        <strong style={{ textAlign: 'right', font: "500 10.5px/1 'IBM Plex Mono',monospace" }}>{formatNumber(item.value)}</strong>
      </div>)}</div> : <ChartState kind={emptyKind} title={emptyTitle} description={emptyDescription} />}
    </ChartFrame>
  );
}

export function DailyRunBars({ activity, successRate, scope }: { activity: DailyRunActivity[]; successRate: number | null; scope: string }) {
  const max = Math.max(1, ...activity.map((item) => item.total));
  const rows = activity.map((item) => ({ label: item.label, value: `${item.successful} of ${item.total}`, detail: item.total ? `${Math.round(item.successful / item.total * 100)}% successful` : 'Verified zero' }));
  return (
    <ChartFrame id="flow-run-volume" kind="interval-stacked-bars" question="Are flows completing reliably?" summary={successRate == null ? 'Success rate is unavailable until the first run completes.' : `${successRate}% of ${activity.reduce((sum, item) => sum + item.total, 0)} runs completed without an execution error.`} scope={scope} records={{ href: '#flow-run-records', label: 'View run records' }} table={activity.length ? simpleChartTable(rows) : undefined} compact={!activity.length}>
      {activity.length ? <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activity.length},minmax(12px,1fr))`, gap: 7, alignItems: 'end', minHeight: 130 }} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}>{activity.map((item) => {
        const height = Math.max(3, item.total / max * 100);
        const successHeight = item.total ? item.successful / item.total * 100 : 0;
        return <span style={{ height: 130, display: 'grid', gridTemplateRows: '1fr auto', gap: 6, alignItems: 'end', color: '#6f6a63', fontSize: 9, textAlign: 'center' }} key={item.key} title={`${item.label}: ${item.successful} successful of ${item.total} runs`}><span style={{ width: '100%', minHeight: 3, alignSelf: 'end', display: 'flex', alignItems: 'end', height: `${height}%`, borderRadius: '4px 4px 2px 2px', background: '#e4e3e0' }}><span style={{ width: '100%', height: `${successHeight}%`, borderRadius: '4px 4px 2px 2px', background: '#1a6b43' }} /></span><span>{item.label}</span></span>;
      })}</div> : <ChartState kind="insufficient-history" title="No run history in this scope" description="Publish a flow and allow it to receive a trigger event. Draft simulations stay separate from live run history." />}
    </ChartFrame>
  );
}

export function OutcomeBand({ total, segments }: { total: number; segments: Array<{ label: string; value: number; tone: 'positive' | 'negative' | 'neutral' }> }) {
  const colour = (tone: 'positive' | 'negative' | 'neutral') => tone === 'positive' ? '#1a6b43' : tone === 'negative' ? '#b0431a' : '#6f6a63';
  return <div><div style={{ display: 'flex', height: 18, gap: 2, overflow: 'hidden', borderRadius: 5, background: '#ece9e4' }} role="img" aria-label={segments.map((item) => `${item.label}: ${item.value}`).join(', ')}>{segments.map((item) => item.value > 0 ? <span key={item.label} data-tone={item.tone} style={{ width: `${total ? item.value / total * 100 : 0}%`, background: colour(item.tone) }} /> : null)}</div><ul style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '9px 0 0', padding: 0, listStyle: 'none', color: '#64686d', fontSize: 10 }}>{segments.map((item) => <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i data-tone={item.tone} style={{ width: 7, height: 7, borderRadius: 2, background: colour(item.tone) }} />{item.label} · {formatNumber(item.value)}</li>)}</ul></div>;
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
    {runs.length ? <div style={{ display: 'grid', gridTemplateColumns: `repeat(${runs.length},minmax(20px,1fr))`, gap: 5 }} role="group" aria-label="Recent provider runs">{runs.map((run, index) => {
      const description = `${run.label}: ${processedLabel(run.processed)}, ${failedLabel(run.failed)}, ${run.duration}`;
      const content = <><span>{index + 1}</span><span className="sr-only">{description}</span></>;
      const blockStyle = { minHeight: 38, display: 'grid', placeItems: 'center', borderRadius: 6, background: run.state === 'success' ? '#eaf5ef' : run.state === 'failed' ? '#fdf0e6' : run.state === 'running' ? '#eef3f8' : '#f2f0ed', color: run.state === 'success' ? '#1a6b43' : run.state === 'failed' ? '#b0431a' : '#40454a', font: "500 10px/1 'IBM Plex Mono',monospace", textDecoration: 'none' } as const;
      return run.href ? <Link key={run.id} href={run.href} style={blockStyle} data-state={run.state} title={description}>{content}</Link> : <span key={run.id} style={blockStyle} data-state={run.state} title={description}>{content}</span>;
    })}</div> : <ChartState kind="insufficient-history" title="No provider runs recorded" description="This provider has no retained sync or import run telemetry. No success rate or throughput is inferred from connection state." />}
  </ChartFrame>;
}
