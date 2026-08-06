import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  GitCompareArrows,
  ShieldCheck,
} from 'lucide-react';
import { PageFrame, Surface } from '@/components/ui';
import type {
  IntelligenceReport,
  MoneyBridge,
  ReportRange,
} from '@/lib/reporting/intelligence';
import {
  buildDashboardAttentionPriorities,
  buildDashboardChartBuckets,
  bridgeMetricValue,
  type DashboardAttentionPriority,
} from '@/components/dashboard/dashboardModel';
import {
  formatDateAbsolute,
  formatMinorCurrencyNullable,
  formatNumber,
} from '@/lib/utils/format';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';

type CanonicalOverviewProps = {
  report: IntelligenceReport;
  selectedCurrency: string | null;
  compare: 'previous' | 'none';
};

type MetricKey = 'exposure' | 'modelled' | 'realised' | 'recovered';

const ATTENTION_FALLBACKS = [
  { label: 'Ready for decision', href: '/cases?state=ready_for_decision' },
  { label: 'Evidence needed', href: '/cases?state=evidence_needed' },
  { label: 'Manual review', href: '/cases?state=manual_review' },
  { label: 'Waiting on source', href: '/work?view=integration-exceptions' },
  { label: 'Recovery follow-through', href: '/financials/recovery' },
] as const;

function hasState(bridge: MoneyBridge | null, state: string): boolean {
  return Boolean(bridge?.knownStates.includes(state));
}

function moneyFor(
  bridge: MoneyBridge | null,
  state: string,
  value: number | null | undefined,
  currency: string | null,
): string {
  if (!bridge || !currency || !hasState(bridge, state)) return '—';
  return formatMinorCurrencyNullable(value ?? null, currency);
}

function displayMetric(
  bridge: MoneyBridge | null,
  key: MetricKey,
  currency: string | null,
): string {
  if (!bridge || !currency) return '—';
  if (key === 'exposure') return moneyFor(bridge, 'exposed', bridgeMetricValue(bridge, 'exposure'), currency);
  if (key === 'modelled') return moneyFor(bridge, 'prevented', bridge.preventedMinor, currency);
  if (key === 'realised') return moneyFor(bridge, 'confirmed_loss', bridge.realisedLossMinor, currency);
  return moneyFor(bridge, 'recovered', bridge.recoveredMinor, currency);
}

function MetricCell({
  label,
  value,
  qualifier,
  tone = 'default',
}: {
  label: string;
  value: string;
  qualifier: string;
  tone?: 'default' | 'confirmed' | 'modelled';
}) {
  return (
    <div className="min-w-0 border-b border-[var(--ua-border-hairline)] px-4 py-4 last:border-b-0 sm:px-5 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-label text-[var(--ua-text-tertiary)]">{label}</p>
      <p className={`mt-2 text-money ${tone === 'confirmed' ? 'text-[var(--ua-ledger-confirmed)]' : 'text-[var(--ua-text-primary)]'}`}>{value}</p>
      <p className={`mt-1 text-caption ${tone === 'modelled' ? 'text-[var(--ua-text-secondary)]' : 'text-[var(--ua-text-tertiary)]'}`}>{qualifier}</p>
    </div>
  );
}

function ScopeControls({
  range,
  compare,
  currency,
  currencies,
}: {
  range: ReportRange;
  compare: 'previous' | 'none';
  currency: string | null;
  currencies: string[];
}) {
  return (
    <form action="/overview" method="get" className="flex flex-wrap items-center gap-2" aria-label="Overview scope">
      <label className="flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface)] px-3 text-body text-[var(--ua-text-primary)]">
        <span className="text-caption text-[var(--ua-text-tertiary)]">Period</span>
        <select name="range" defaultValue={range} className="bg-transparent font-medium outline-none">
          {(['7d', '30d', '90d', 'all'] as ReportRange[]).map((value) => <option key={value} value={value}>{TIME_RANGE_LABELS[value]}</option>)}
        </select>
      </label>
      <label className="flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface)] px-3 text-body text-[var(--ua-text-primary)]">
        <span className="text-caption text-[var(--ua-text-tertiary)]">Compare</span>
        <select name="compare" defaultValue={compare} className="bg-transparent font-medium outline-none">
          <option value="none">Off</option>
          <option value="previous">Previous period</option>
        </select>
      </label>
      {currencies.length ? (
        <label className="flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface)] px-3 text-body text-[var(--ua-text-primary)]">
          <span className="text-caption text-[var(--ua-text-tertiary)]">Currency</span>
          <select name="currency" defaultValue={currency ?? ''} className="bg-transparent font-medium outline-none">
            {currencies.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      ) : null}
      <button type="submit" className="sr-only">Apply scope</button>
    </form>
  );
}

function ProvenanceStrip({ report, currency }: { report: IntelligenceReport; currency: string | null }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-y border-[var(--ua-border-hairline)] bg-[var(--ua-surface-muted)] px-4 py-2 text-caption text-[var(--ua-text-secondary)] sm:px-5">
      <span className="font-medium text-[var(--ua-text-primary)]">As of {formatDateAbsolute(report.generatedAt)}</span>
      <span>Scope {TIME_RANGE_LABELS[report.range]}</span>
      <span>Currency {currency ?? 'Unavailable'}</span>
      <span>Timezone {report.timezone}</span>
      <span className="inline-flex items-center gap-1 text-[var(--ua-text-tertiary)]"><ShieldCheck size={13} aria-hidden="true" /> Validated values are ledger-confirmed only</span>
    </div>
  );
}

function ActualsChart({ report, currency }: { report: IntelligenceReport; currency: string | null }) {
  const empty = !currency;
  const base = empty ? [] : buildDashboardChartBuckets({ current: report.trend, range: report.range, currency, metric: 'exposure', asOf: report.generatedAt });
  const realised = empty ? [] : buildDashboardChartBuckets({ current: report.trend, range: report.range, currency, metric: 'realisedLoss', asOf: report.generatedAt });
  const recovered = empty ? [] : buildDashboardChartBuckets({ current: report.trend, range: report.range, currency, metric: 'recovered', asOf: report.generatedAt });
  const rows = base.map((row, index) => ({ label: row.label, exposure: row.currentMinor, realised: realised[index]?.currentMinor ?? null, recovered: recovered[index]?.currentMinor ?? null }));
  const max = Math.max(1, ...rows.flatMap((row) => [row.exposure ?? 0, row.realised ?? 0, row.recovered ?? 0]));
  const chartDescription = rows.length
    ? `${rows.length} intervals, ${currency}. Missing values remain unavailable.`
    : 'No confirmed financial intervals are available for this scope.';

  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ua-border-subtle)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--ua-ledger-confirmed)]" aria-hidden="true" />
            <h2 className="text-h3 text-[var(--ua-text-primary)]">Reconciled actual</h2>
          </div>
          <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Exposure, realised loss, and recovered amounts from confirmed ledger entries.</p>
        </div>
        <span className="rounded-full bg-[var(--ua-ledger-confirmed-bg)] px-2.5 py-1 text-caption font-medium text-[var(--ua-ledger-confirmed)]">Ledger confirmed</span>
      </div>
      <div className="p-5">
        {empty || !rows.length ? (
          <div className="flex min-h-52 items-center justify-center text-center text-body text-[var(--ua-text-secondary)]">{chartDescription}</div>
        ) : (
          <figure aria-labelledby="actual-chart-title">
            <figcaption id="actual-chart-title" className="sr-only">{chartDescription}</figcaption>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3">
                  <span className="truncate text-metadata text-[var(--ua-text-tertiary)]">{row.label}</span>
                  <div className="space-y-1.5">
                    <ChartBar label="Exposure" value={row.exposure} max={max} currency={currency} tone="primary" />
                    <ChartBar label="Realised loss" value={row.realised} max={max} currency={currency} tone="critical" />
                    <ChartBar label="Recovered" value={row.recovered} max={max} currency={currency} tone="confirmed" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--ua-border-hairline)] pt-3 text-caption text-[var(--ua-text-secondary)]">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--ua-action-700)]" aria-hidden="true" />Exposure</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--ua-critical)]" aria-hidden="true" />Realised loss</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--ua-ledger-confirmed)]" aria-hidden="true" />Recovered</span>
            </div>
            <details className="mt-4 border-t border-[var(--ua-border-hairline)] pt-3">
              <summary className="cursor-pointer text-label font-medium text-[var(--ua-text-secondary)]">View data table</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-table text-[var(--ua-text-secondary)]">
                  <caption className="sr-only">Reconciled actual by period</caption>
                  <thead><tr className="border-b border-[var(--ua-border-subtle)] text-left text-label text-[var(--ua-text-tertiary)]"><th className="py-2 pr-3">Period</th><th className="py-2 pr-3 text-right">Exposure</th><th className="py-2 pr-3 text-right">Realised loss</th><th className="py-2 text-right">Recovered</th></tr></thead>
                  <tbody>{rows.map((row) => <tr key={`${row.label}-table`} className="border-b border-[var(--ua-border-hairline)]"><th scope="row" className="py-2 pr-3 text-left font-normal">{row.label}</th><td className="py-2 pr-3 text-right tabular-nums">{formatMinorCurrencyNullable(row.exposure, currency)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatMinorCurrencyNullable(row.realised, currency)}</td><td className="py-2 text-right tabular-nums">{formatMinorCurrencyNullable(row.recovered, currency)}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </figure>
        )}
      </div>
    </Surface>
  );
}

function ChartBar({
  label,
  value,
  max,
  currency,
  tone,
}: {
  label: string;
  value: number | null;
  max: number;
  currency: string;
  tone: 'primary' | 'critical' | 'confirmed';
}) {
  const colour = tone === 'critical' ? 'var(--ua-critical)' : tone === 'confirmed' ? 'var(--ua-ledger-confirmed)' : 'var(--ua-action-700)';
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-[70px] shrink-0 text-[10px] text-[var(--ua-text-tertiary)]">{label}</span>
      <div className="h-2 min-w-0 flex-1 rounded-full bg-[var(--ua-surface-muted)]" aria-hidden="true"><div className="h-2 rounded-full" style={{ width: value == null ? '0%' : `${Math.max(3, Math.round((value / max) * 100))}%`, background: colour }} /></div>
      <span className="w-[86px] shrink-0 text-right text-metadata tabular-nums text-[var(--ua-text-secondary)]">{formatMinorCurrencyNullable(value, currency)}</span>
    </div>
  );
}

function CounterfactualCard({ bridge, currency }: { bridge: MoneyBridge | null; currency: string | null }) {
  const value = displayMetric(bridge, 'modelled', currency);
  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--ua-border-subtle)] px-5 py-4">
        <GitCompareArrows size={16} className="mt-0.5 text-[var(--ua-action-700)]" aria-hidden="true" />
        <div>
          <h2 className="text-h3 text-[var(--ua-text-primary)]">Counterfactual modelled range</h2>
          <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Avoided exposure is modelled, not a confirmed cash outcome.</p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-money text-[var(--ua-text-primary)]">{value}</p>
        <p className="mt-2 text-body text-[var(--ua-text-secondary)]">Modelled avoided exposure</p>
        <div className="mt-5 border-t border-[var(--ua-border-hairline)] pt-4 text-caption text-[var(--ua-text-secondary)]">
          <p>Method: prevented state in the current report scope.</p>
          <p className="mt-1">It cannot be compared directly with realised loss or recovered cash.</p>
        </div>
      </div>
    </Surface>
  );
}

function EstimatedException({ bridge, currency }: { bridge: MoneyBridge | null; currency: string | null }) {
  const value = moneyFor(bridge, 'estimated_loss', bridge?.estimatedLossMinor, currency);
  return (
    <Surface structure="inset" className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <CircleAlert size={16} className="mt-0.5 shrink-0 text-[var(--ua-warning)]" aria-hidden="true" />
        <div>
          <p className="text-body font-medium text-[var(--ua-text-primary)]">Estimated actual exception</p>
          <p className="mt-0.5 text-caption text-[var(--ua-text-secondary)]">Estimated loss is kept separate until the ledger has confirmed the underlying outcome.</p>
        </div>
      </div>
      <span className="text-table font-medium tabular-nums text-[var(--ua-warning)]">{value}</span>
    </Surface>
  );
}

function TrustBand({ report, currency }: { report: IntelligenceReport; currency: string | null }) {
  const sourceRows = report.coverage.filter((row) => row.scope === 'connected-source');
  const records = sourceRows.reduce((sum, row) => sum + row.records, 0);
  const fresh = sourceRows.reduce((sum, row) => sum + row.freshRecords, 0);
  const stale = Math.max(0, records - fresh);
  const reconciliationLabel = report.reconciliation.confidence.state === 'complete' ? 'Reconciled' : report.reconciliation.confidence.state === 'qualified' ? 'Qualified' : 'Unavailable';
  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="border-b border-[var(--ua-border-subtle)] px-5 py-4"><h2 className="text-h3 text-[var(--ua-text-primary)]">Trust boundary</h2><p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Coverage, freshness, reconciliation, and permission to act are separate signals.</p></div>
      <div className="grid divide-y divide-[var(--ua-border-hairline)] md:grid-cols-4 md:divide-x md:divide-y-0">
        <TrustCell icon={ShieldCheck} label="Coverage" value={records ? `${formatNumber(records)} source records` : 'Unavailable'} detail={records ? `${formatNumber(sourceRows.length)} connected source classes` : 'Connect a source to establish scope.'} />
        <TrustCell icon={Clock3} label="Freshness" value={stale ? `${formatNumber(stale)} stale` : 'Current'} detail={records ? `${formatNumber(fresh)} of ${formatNumber(records)} current` : 'No source freshness to verify.'} tone={stale ? 'attention' : 'neutral'} />
        <TrustCell icon={GitCompareArrows} label="Reconciliation" value={reconciliationLabel} detail={report.reconciliation.confidence.issueCount ? `${formatNumber(report.reconciliation.confidence.issueCount)} issue${report.reconciliation.confidence.issueCount === 1 ? '' : 's'} affect confidence.` : 'No reported reconciliation issues.'} tone={reconciliationLabel === 'Reconciled' ? 'confirmed' : 'attention'} />
        <TrustCell icon={CheckCircle2} label="Decision permission" value={currency ? 'Review with qualifiers' : 'Unavailable'} detail="Recommendations remain advisory; the merchant decision is separate." tone={currency ? 'info' : 'attention'} />
      </div>
    </Surface>
  );
}

function TrustCell({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'confirmed' | 'attention' | 'info';
}) {
  const valueClass = tone === 'confirmed' ? 'text-[var(--ua-ledger-confirmed)]' : tone === 'attention' ? 'text-[var(--ua-warning)]' : tone === 'info' ? 'text-[var(--ua-action-700)]' : 'text-[var(--ua-text-primary)]';
  return <div className="p-4 sm:p-5"><div className="flex items-center gap-2 text-label text-[var(--ua-text-tertiary)]"><Icon size={14} aria-hidden="true" />{label}</div><p className={`mt-2 text-body font-medium ${valueClass}`}>{value}</p><p className="mt-1 text-caption text-[var(--ua-text-secondary)]">{detail}</p></div>;
}

function AttentionRows({ report, currency }: { report: IntelligenceReport; currency: string | null }) {
  const ranked = buildDashboardAttentionPriorities(report.operations, currency).slice(0, ATTENTION_FALLBACKS.length);
  const rows: Array<DashboardAttentionPriority | { key: string; label: string; href: string; activeCount: number; overdueCount: number; supportCopy: string; selectedExposureMinor: number | null; readyCount: number }> = ATTENTION_FALLBACKS.map((fallback, index) => ranked[index] ?? {
    key: `empty-${index}`,
    label: fallback.label,
    href: fallback.href,
    activeCount: 0,
    overdueCount: 0,
    supportCopy: 'No open work in this selected scope',
    selectedExposureMinor: null,
    readyCount: 0,
  });
  return (
    <Surface structure="working" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ua-border-subtle)] px-5 py-4"><div><h2 className="text-h3 text-[var(--ua-text-primary)]">Needs attention</h2><p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Five lanes ranked by urgency, decision readiness, and qualified exposure.</p></div><Link href="/work" className="inline-flex items-center gap-1 text-label font-medium text-[var(--ua-action-700)] hover:underline">Open Work <ArrowRight size={13} aria-hidden="true" /></Link></div>
      <div className="divide-y divide-[var(--ua-border-hairline)]">
        {rows.map((row, index) => <Link key={row.key} href={row.href} className="grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--ua-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-[-2px]"><span className="text-metadata tabular-nums text-[var(--ua-text-tertiary)]">0{index + 1}</span><span className="min-w-0"><span className="block text-body font-medium text-[var(--ua-text-primary)]">{row.label}</span><span className="mt-0.5 block truncate text-caption text-[var(--ua-text-secondary)]">{row.supportCopy}</span></span><span className="hidden text-right text-caption text-[var(--ua-text-secondary)] sm:block">{row.overdueCount ? `${formatNumber(row.overdueCount)} overdue` : 'No overdue items'}</span><span className="text-right text-table font-medium tabular-nums text-[var(--ua-text-primary)]">{formatNumber(row.activeCount)} <ArrowRight size={13} className="ml-1 inline" aria-hidden="true" /></span></Link>)}
      </div>
    </Surface>
  );
}

export function CanonicalOverviewSurface({ report, selectedCurrency, compare }: CanonicalOverviewProps) {
  const bridge = report.bridges.find((item) => item.currency === selectedCurrency) ?? null;
  const currencies = report.bridges.map((item) => item.currency).sort();
  const financialQualifier = report.reconciliation.confidence.state === 'complete' ? 'Ledger-confirmed' : 'Qualified · review scope';
  const exportHref = `/financials/reports?range=${report.range}&timezone=${encodeURIComponent(report.timezone)}${selectedCurrency ? `&currency=${encodeURIComponent(selectedCurrency)}` : ''}`;

  return (
    <PageFrame
      title="Overview"
      eyebrow="Operations"
      subtitle={report.operations.some((row) => row.readyCount > 0) ? `${formatNumber(report.operations.reduce((sum, row) => sum + row.readyCount, 0))} cases are ready for decision; displayed financial values are qualified.` : 'One operating view for source facts, financial outcomes, and the work that needs a decision.'}
      meta={<span>Generated {formatDateAbsolute(report.generatedAt)} · {report.recordCount ? `${formatNumber(report.recordCount)} records in scope` : 'Record scope unavailable'}</span>}
      actions={<Link href={exportHref} className="inline-flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-body font-medium text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]"><Download size={14} aria-hidden="true" /> Export</Link>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><ScopeControls range={report.range} compare={compare} currency={selectedCurrency} currencies={currencies} /><span className="text-caption text-[var(--ua-text-tertiary)]">{compare === 'previous' ? 'Comparison enabled' : 'Comparison off'}</span></div>
        <ProvenanceStrip report={report} currency={selectedCurrency} />
        <Surface structure="working" className="overflow-hidden"><div className="grid md:grid-cols-4"><MetricCell label="Exposure" value={displayMetric(bridge, 'exposure', selectedCurrency)} qualifier={financialQualifier} /><MetricCell label="Modelled avoided exposure" value={displayMetric(bridge, 'modelled', selectedCurrency)} qualifier="Modelled · not ledger-confirmed" tone="modelled" /><MetricCell label="Realised loss" value={displayMetric(bridge, 'realised', selectedCurrency)} qualifier="Ledger-confirmed outcome" tone="confirmed" /><MetricCell label="Recovered" value={displayMetric(bridge, 'recovered', selectedCurrency)} qualifier="Ledger-confirmed cash outcome" tone="confirmed" /></div></Surface>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]"><ActualsChart report={report} currency={selectedCurrency} /><CounterfactualCard bridge={bridge} currency={selectedCurrency} /></div>
        <EstimatedException bridge={bridge} currency={selectedCurrency} />
        <TrustBand report={report} currency={selectedCurrency} />
        <AttentionRows report={report} currency={selectedCurrency} />
        <Surface structure="inset" className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5"><div className="flex items-center gap-2 text-body font-medium text-[var(--ua-text-primary)]"><ShieldCheck size={15} className="text-[var(--ua-action-700)]" aria-hidden="true" />Ready to work from qualified evidence?</div><div className="flex flex-wrap items-center gap-3"><Link href="/work" className="text-label font-medium text-[var(--ua-action-700)] hover:underline">Open Work <ArrowRight size={13} className="ml-1 inline" aria-hidden="true" /></Link><Link href="/financials/reconciliation" className="text-label text-[var(--ua-text-secondary)] hover:text-[var(--ua-text-primary)]">Review reconciliation</Link></div></Surface>
      </div>
    </PageFrame>
  );
}
