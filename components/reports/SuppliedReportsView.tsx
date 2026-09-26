import Link from '@/components/navigation/AppNavLink';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import {
  financialMetricCaseCount,
  financialMetricValue,
  financialReportRecordsHref,
  REPORT_DEFINITIONS,
  type DashboardPeriodComparison,
  type IntelligenceReport,
  type MoneyBridge,
  type ReportRange,
} from '@/lib/reporting/intelligence';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import { formatDateTime, formatMinorCurrencyNullable, formatMonthInTimeZone, formatNumber } from '@/lib/utils/format';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';
const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function reportsHref(input: {
  range: ReportRange;
  timezone: string;
  currency: string | null;
  compare: 'none' | 'previous';
  report: string | null;
}, patch: Record<string, string | null> = {}) {
  const params = new URLSearchParams({ range: input.range, timezone: input.timezone });
  if (input.currency) params.set('currency', input.currency);
  if (input.compare === 'previous' && input.range !== 'all') params.set('compare', 'previous');
  if (input.report) params.set('report', input.report);
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) params.delete(key);
    else params.set(key, value);
  }
  return `/financials/reports?${params.toString()}`;
}

function primaryBridge(report: IntelligenceReport, selectedCurrency: string | null) {
  if (selectedCurrency) return report.bridges.find((bridge) => bridge.currency === selectedCurrency) ?? null;
  return report.bridges.length === 1 ? report.bridges[0] : null;
}

function money(bridge: MoneyBridge | null, metric: Parameters<typeof financialMetricValue>[1]) {
  if (!bridge) return '—';
  return formatMinorCurrencyNullable(financialMetricValue(bridge, metric), bridge.currency);
}

function percent(numerator: number | null, denominator: number | null) {
  if (numerator == null || denominator == null || denominator <= 0) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function delta(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function deltaText(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
}

function Sparkline({ values, tone = '#a7abad' }: { values: number[]; tone?: string }) {
  if (values.length < 2 || Math.max(...values) === Math.min(...values)) {
    return <svg width="50" height="16" viewBox="0 0 50 16" aria-hidden="true"><path d="M0 8h50" fill="none" stroke={tone} strokeWidth="1.4" strokeLinecap="round"/></svg>;
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const points = values.map((value, index) => `${((index / (values.length - 1)) * 50).toFixed(1)},${(16 - ((value - minimum) / (maximum - minimum)) * 16).toFixed(1)}`).join(' ');
  const [lastX, lastY] = points.split(' ').at(-1)!.split(',');
  return <svg width="50" height="16" viewBox="0 0 50 16" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true"><polyline points={points} fill="none" stroke={tone} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/><circle cx={lastX} cy={lastY} r="2.1" fill={tone}/></svg>;
}

function MetricCard({ label, value, change, note, tone, values }: { label: string; value: string; change: number | null; note: string; tone: string; values: number[] }) {
  const improving = label === 'Absorbed by merchant' ? (change ?? 0) <= 0 : (change ?? 0) >= 0;
  return <div style={{ background: '#fff', padding: '11px 15px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10.5px/1.3 ${sans}` }}>{label}</span><span style={{ color: change == null ? '#64686d' : improving ? '#1a6b43' : '#b0431a', font: `400 11px/1 ${mono}` }}>{deltaText(change)}</span></div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}><span style={{ flex: 1, color: tone, letterSpacing: '-.012em', font: `400 20px/1 ${mono}` }}>{value}</span><span style={{ flex: 'none', paddingBottom: 2 }}><Sparkline values={values} tone={tone === '#1a6b43' ? '#7fb598' : tone === '#b0431a' ? '#e0a97a' : '#a7abad'}/></span></div>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{note}</span>
  </div>;
}

function ScopeControl({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#1c1f23', font: `400 12px/1 ${sans}` }}>{children}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg></span>;
}

function MonthBars({ report, currency }: { report: IntelligenceReport; currency: string | null }) {
  const rows = new Map<string, number>();
  for (const point of report.trend) {
    if (currency && point.currency !== currency) continue;
    const label = formatMonthInTimeZone(new Date(point.date), report.timezone);
    rows.set(label, (rows.get(label) ?? 0) + point.realisedLossMinor);
  }
  const values = [...rows.entries()].slice(-6);
  const maximum = Math.max(1, ...values.map(([, value]) => value));
  return <section style={{ borderRadius: 10, background: '#fff', boxShadow: shadow, padding: '7px 13px 10px' }}>
    {values.length ? values.map(([label, value], index) => <div key={`${label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}><span style={{ width: 24, color: '#64686d', font: `400 10px/1 ${mono}` }}>{label}</span><span style={{ height: 8, flex: 1, borderRadius: 2, background: '#eae8e5', overflow: 'hidden' }}><i style={{ display: 'block', width: `${Math.max(2, (value / maximum) * 100)}%`, height: '100%', background: index === values.length - 1 ? '#b0431a' : '#d6d1ca' }}/></span><span style={{ width: 70, textAlign: 'right', color: index === values.length - 1 ? '#1c1f23' : '#64686d', font: `400 10.5px/1 ${mono}` }}>{formatMinorCurrencyNullable(value, currency)}</span></div>) : <p style={{ margin: 0, padding: '9px 0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Monthly absorbed values are unavailable for this scope.</p>}
  </section>;
}

export function SuppliedReportsView({ report, selectedCurrency, compare, selectedReportId, previous }: { report: IntelligenceReport; selectedCurrency: string | null; compare: 'none' | 'previous'; selectedReportId: string | null; previous: DashboardPeriodComparison | null }) {
  const bridge = primaryBridge(report, selectedCurrency);
  const currency = bridge?.currency ?? selectedCurrency;
  const previousBridge = previous?.bridges.find((item) => item.currency === currency) ?? null;
  const confirmed = bridge ? financialMetricValue(bridge, 'confirmed_loss') : null;
  const eligible = bridge ? financialMetricValue(bridge, 'recoverable') : null;
  const recovered = bridge ? financialMetricValue(bridge, 'recovered') : null;
  const absorbed = bridge ? financialMetricValue(bridge, 'final_net_loss') : null;
  const previousConfirmed = previousBridge ? financialMetricValue(previousBridge, 'confirmed_loss') : null;
  const previousEligible = previousBridge ? financialMetricValue(previousBridge, 'recoverable') : null;
  const previousRecovered = previousBridge ? financialMetricValue(previousBridge, 'recovered') : null;
  const previousAbsorbed = previousBridge ? financialMetricValue(previousBridge, 'final_net_loss') : null;
  const recoveryRate = percent(recovered, eligible);
  const previousRateNumber = previousRecovered != null && previousEligible ? (previousRecovered / previousEligible) * 100 : null;
  const currentRateNumber = recovered != null && eligible ? (recovered / eligible) * 100 : null;
  const equationReconciled = confirmed != null && recovered != null && absorbed != null && Math.max(0, confirmed - recovered) === absorbed;
  const trend = report.trend.filter((point) => !currency || point.currency === currency);
  const query = { range: report.range, timezone: report.timezone, currency: selectedCurrency, compare, report: selectedReportId };
  const recordsHref = currency ? financialReportRecordsHref({ range: report.range, currency, metric: 'confirmed_loss', timezone: report.timezone, from: report.financialScope?.from ?? undefined, to: report.financialScope?.to }) : '/financials/reports/records';
  const exportParams = new URLSearchParams({ range: report.range, timezone: report.timezone, view: 'records' });
  exportParams.set('asOf', report.generatedAt);
  if (currency) exportParams.set('currency', currency);
  const tabs = [
    ['Attribution', null], ['By issue', 'issue'], ['By carrier', 'carrier'], ['By SKU', 'sku'], ['By warehouse', 'warehouse'], ['Trend', 'financial'],
  ] as const;
  const causeRows = report.causes.filter((row) => !currency || row.currency === currency).slice(0, 6);

  return <>
    <SetBreadcrumbLabel label="Loss attribution" detail={`${report.financialScope?.from ?? 'all history'} inclusive → ${report.financialScope?.to ?? report.generatedAt} exclusive · ${report.timezone} · ${currency ?? 'currencies separated'}`} />
    <div style={{ height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: line }}>
      {tabs.map(([label, reportId]) => { const active = selectedReportId === reportId; return <Link key={label} href={reportsHref(query, { report: reportId })} style={{ padding: '6px 11px', borderRadius: 8, background: active ? '#1c1f23' : 'transparent', color: active ? '#fff' : '#40454a', textDecoration: 'none', font: `${active ? 500 : 400} 12.5px/1 ${sans}` }}>{label}</Link>; })}
      <span style={{ width: 1, height: 20, margin: '0 4px', background: '#eae8e5' }}/>
      <ScopeControl>{TIME_RANGE_LABELS[report.range]}</ScopeControl><ScopeControl>{compare === 'previous' ? 'vs previous period' : 'No comparison'}</ScopeControl><ScopeControl>{currency ? `${currency} only` : 'Currencies separated'}</ScopeControl>
      <span style={{ flex: 1 }}/><a href={`/api/reports/claims?${exportParams.toString()}`} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', textDecoration: 'none', font: `400 12.5px/1 ${sans}` }}>Export CSV</a><button type="button" disabled title="Saved delivery is unavailable" style={{ padding: '6px 11px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', opacity: .72, font: `500 12.5px/1 ${sans}` }}>Send to finance</button>
    </div>
    <div data-screen-label="Reports" data-visual-world="supplied-package" data-surface-id="financial-reports" data-archetype="P9" style={{ flex: 1, minHeight: 0, padding: '13px 22px 16px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, overflow: 'hidden', borderRadius: 11, background: '#eae8e5', boxShadow: shadow }}>
          <MetricCard label="Confirmed loss" value={money(bridge, 'confirmed_loss')} change={delta(confirmed, previousConfirmed)} note={bridge ? `${formatNumber(financialMetricCaseCount(bridge, 'confirmed_loss'))} cases` : 'select one currency'} tone="#1c1f23" values={trend.map((point) => point.realisedLossMinor)}/>
          <MetricCard label="Received and matched" value={money(bridge, 'recovered')} change={delta(recovered, previousRecovered)} note={bridge ? `${formatNumber(financialMetricCaseCount(bridge, 'recovered'))} cases with matched credit` : 'value unavailable'} tone="#1a6b43" values={trend.map((point) => point.recoveredMinor)}/>
          <MetricCard label="Final net loss" value={equationReconciled ? money(bridge, 'final_net_loss') : '—'} change={delta(absorbed, previousAbsorbed)} note={!equationReconciled ? 'arithmetic unavailable or unreconciled' : `${percent(absorbed, confirmed)} of confirmed loss`} tone="#b0431a" values={trend.map((point) => point.realisedLossMinor)}/>
          <MetricCard label="Recovery rate" value={recoveryRate} change={currentRateNumber == null || previousRateNumber == null ? null : currentRateNumber - previousRateNumber} note={previousRateNumber == null ? 'previous period unavailable' : `was ${previousRateNumber.toFixed(1)}% previously`} tone="#40454a" values={trend.map((point) => point.exposureMinor ? (point.recoveredMinor / point.exposureMinor) * 100 : 0)}/>
        </div>

        <section style={{ flex: 'none', borderRadius: 10, background: '#fff', boxShadow: shadow, padding: '12px 16px 11px' }}>
          <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHERE THIS PERIOD’S LOSS ENDED UP</strong><span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{equationReconciled ? `${money(bridge, 'confirmed_loss')} − ${money(bridge, 'recovered')} = ${money(bridge, 'final_net_loss')}` : 'confirmed loss − received and matched = final net loss · unreconciled'}</span><span style={{ flex: 1 }}/><span style={{ padding: '4px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', font: `400 11px/1.2 ${sans}` }}>Chart</span><span style={{ padding: '4px 9px', color: '#64686d', font: `400 11px/1.2 ${sans}` }}>Table</span></header>
          <div style={{ height: 174, position: 'relative', display: 'flex' }}><div style={{ width: 56, flex: 'none', position: 'relative' }}>{['100%','67%','33%','0'].map((value, index) => <span key={value} style={{ position: 'absolute', right: 9, top: index * 56 - 4, color: '#64686d', font: `400 10px/1.2 ${mono}` }}>{value}</span>)}</div><div style={{ flex: 1, minWidth: 0, position: 'relative' }}>{[0,58,116,174].map((top) => <i key={top} style={{ position: 'absolute', left: 0, right: 0, top, height: 1, background: top === 174 ? '#ddd8d1' : '#f4f2ef' }}/>) }<div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {[{ label: money(bridge,'confirmed_loss'), height: confirmed == null ? 0 : 159, top: 15, color: '#1c1f23' }, { label: equationReconciled ? money(bridge,'recovered') : '—', height: confirmed && recovered != null ? Math.max(3, (recovered / confirmed) * 159) : 0, top: confirmed && recovered != null ? 174 - Math.max(3, (recovered / confirmed) * 159) : 174, color: '#1a6b43' }, { label: formatMinorCurrencyNullable(currency ? 0 : null,currency), height: 3, top: 171, color: '#a7abad' }, { label: money(bridge,'written_off'), height: 3, top: 171, color: '#64686d' }, { label: equationReconciled ? money(bridge,'final_net_loss') : '—', height: confirmed && absorbed != null && equationReconciled ? Math.max(3, (absorbed / confirmed) * 159) : 0, top: confirmed && absorbed != null && equationReconciled ? 174 - Math.max(3, (absorbed / confirmed) * 159) : 174, color: '#b0431a' }].map((bar, index) => <div key={index} style={{ flex: 1, position: 'relative', padding: '0 18px' }}><div style={{ position: 'absolute', left: 18, right: 18, top: bar.top, height: bar.height, borderRadius: 3, background: bar.color }}/><span style={{ position: 'absolute', left: 2, right: 2, top: Math.max(-3, bar.top - 18), textAlign: 'center', color: bar.color, font: `400 11.5px/1 ${mono}` }}>{bar.label}</span></div>)}
          </div></div></div>
          <div style={{ display: 'flex', marginTop: 10, paddingLeft: 56 }}>{[['Confirmed loss', bridge ? `${formatNumber(financialMetricCaseCount(bridge,'confirmed_loss'))} cases` : 'unavailable'],['Received + matched',bridge ? `${formatNumber(financialMetricCaseCount(bridge,'recovered'))} cases` : 'unavailable'],['Adjustments','verified zero in canonical formula'],['Written off','classification retained'],['Final net loss',!equationReconciled ? 'unreconciled' : `${percent(absorbed,confirmed)} of confirmed`]].map(([label,note]) => <div key={label} style={{ flex: 1, minWidth: 0, padding: '0 12px', textAlign: 'center' }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: `500 11.5px/1.3 ${sans}` }}>{label}</div><div style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{note}</div></div>)}</div>
          <footer style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, paddingTop: 9, borderTop: line }}><span style={{ flex: 1, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>{!equationReconciled ? 'The final net figure is withheld because the displayed stages do not reconcile.' : `${money(bridge,'confirmed_loss')} confirmed loss minus ${money(bridge,'recovered')} received and matched equals ${money(bridge,'final_net_loss')} final net loss. Written off remains a separate merchant classification.`}</span><Link href={recordsHref} style={{ whiteSpace: 'nowrap', color: '#9b470d', textDecoration: 'none', font: `500 11px/1.5 ${sans}` }}>{formatNumber(report.recordCount)} records</Link></footer>
        </section>

        <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, background: '#fff', boxShadow: shadow, padding: '11px 16px 9px' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>BY CAUSE</strong><span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>ordered by what the merchant absorbed</span><span style={{ flex: 1 }}/><span style={{ width: 40, textAlign: 'right', color: '#64686d', font: `400 9.5px/1 ${sans}` }}>CASES</span><span style={{ width: 90, textAlign: 'right', color: '#64686d', font: `400 9.5px/1 ${sans}` }}>GROSS</span><span style={{ width: 90, textAlign: 'right', color: '#64686d', font: `400 9.5px/1 ${sans}` }}>RECEIVED + MATCHED</span><span style={{ width: 104, textAlign: 'right', color: '#64686d', font: `400 9.5px/1 ${sans}` }}>RECOVERY RATE</span><span style={{ width: 90, textAlign: 'right', color: '#64686d', font: `400 9.5px/1 ${sans}` }}>FINAL NET</span></header>
          <div style={{ minHeight: 0, overflowY: 'auto' }}>{causeRows.length ? causeRows.map((row) => <Link key={`${row.key}-${row.currency}`} href={row.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #f4f2ef', color: '#1c1f23', textDecoration: 'none' }}><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: `400 12.5px/1.4 ${sans}` }}>{row.label}</span><span style={{ width: 40, textAlign: 'right', color: '#64686d', font: `400 11px/1 ${mono}` }}>{formatNumber(row.count)}</span><span style={{ width: 90, textAlign: 'right', color: '#1c1f23', font: `400 11.5px/1 ${mono}` }}>—</span><span style={{ width: 90, textAlign: 'right', color: '#1a6b43', font: `400 11.5px/1 ${mono}` }}>—</span><span style={{ width: 104, textAlign: 'right', color: '#64686d', font: `400 11px/1 ${mono}` }}>—</span><span style={{ width: 90, textAlign: 'right', color: '#b0431a', font: `400 11.5px/1 ${mono}` }}>{formatMinorCurrencyNullable(row.amountMinor,row.currency)}</span></Link>) : <div data-state-id="reports-verified-zero" style={{ padding: '22px 0', borderTop: line, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>No source-backed cause rows are available in this scope. This is a verified empty result only when the report read completed.</div>}</div>
          <span style={{ flex: 1 }}/><footer style={{ display: 'flex', gap: 10, paddingTop: 9, borderTop: line, color: '#64686d', font: `400 11px/1.5 ${sans}` }}><span style={{ flex: 1 }}>Cause rows expose confirmed final net value. Gross and received-and-matched values are withheld where the ledger does not carry that attribution.</span>{report.reconciliation.issues[0] ? <Link href="/financials/reconciliation" style={{ color: '#9b470d', textDecoration: 'none' }}>Review reconciliation</Link> : null}</footer>
        </section>
      </div>

      <aside style={{ width: 300, flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 11, borderRadius: 13, padding: '12px 13px', background: '#f4f3f1' }}>
        <strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>EXCLUDED FROM EVERY FIGURE</strong>
        <section style={{ borderRadius: 10, background: '#fff', boxShadow: shadow, padding: '8px 13px' }}>{[
          ['Held or unreconciled rows', formatNumber(report.reconciliation.confidence.excludedRecordCount)],
          ['Mixed-currency rows', formatNumber(report.reconciliation.confidence.currencyExcludedRecordCount)],
          ['Value they represent', '—'],
          ['Reconciliation issues', formatNumber(report.reconciliation.confidence.issueCount)],
        ].map(([label,value], index) => <div key={label} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: index ? '1px solid #f4f2ef' : undefined }}><span style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.4 ${sans}` }}>{label}</span><span style={{ color: value === '—' ? '#64686d' : '#7a5310', font: `400 11px/1.4 ${mono}` }}>{value}</span></div>)}<p style={{ margin: '8px 0 0', paddingTop: 8, borderTop: line, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Every export repeats the exclusion scope so the file can reconcile on its own. <Link href="/financials/reconciliation" style={{ color: '#9b470d', textDecoration: 'none' }}>Clear the holds</Link></p></section>
        <strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>SIX MONTHS ABSORBED</strong><MonthBars report={report} currency={currency}/>
        <strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>SAVED REPORTS</strong>
        <section style={{ borderRadius: 10, background: '#fff', boxShadow: shadow, padding: '3px 13px 9px' }}>{REPORT_DEFINITIONS.slice(0,4).map((definition) => <Link key={definition.id} href={`/financials/reports/${definition.id}?${new URLSearchParams({ range: report.range, timezone: report.timezone, ...(currency ? { currency } : {}) }).toString()}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f4f2ef', color: '#1c1f23', textDecoration: 'none' }}><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', font: `500 11.5px/1.4 ${sans}` }}>{definition.name}</b><small style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 10px/1.4 ${mono}` }}>on demand</small></span><span style={{ color: '#1a6b43', font: `400 10px/1 ${mono}` }}>open</span></Link>)}</section>
        <span style={{ flex: 1 }}/><p style={{ margin: 0, paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Reports read the ledger, never live sources. Generated {formatDateTime(report.generatedAt)}. Any figure traces to <Link href="/financials/reports/records" style={{ color: '#9b470d', textDecoration: 'none' }}>a ledger entry</Link>.</p>
      </aside>
    </div>
  </>;
}
