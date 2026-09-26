import Link from '@/components/navigation/AppNavLink';
import { notFound } from 'next/navigation';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import {
  financialMetricValue,
  REPORT_DEFINITIONS,
  type IntelligenceReport,
  type MoneyBridge,
} from '@/lib/reporting/intelligence';
import {
  isNamedReportId,
  NAMED_REPORT_CONTRACTS,
  type NamedReportId,
  type NamedReportMeasure,
} from '@/lib/reporting/namedReportContracts';
import { formatDateTime, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { ReportRunRecorder } from '@/components/reports/ReportRunRecorder';
import type { PersistedReportRun, ReportRunScope } from '@/lib/reporting/reportRuns';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

type Tile = { key: string; label: string; value: string; previous: string; tone?: string };

function bridgeFor(report: IntelligenceReport, selectedCurrency: string | null): MoneyBridge | null {
  if (selectedCurrency) return report.bridges.find((bridge) => bridge.currency === selectedCurrency) ?? null;
  return report.bridges.toSorted((left, right) => right.caseIds.length - left.caseIds.length || right.exposedMinor - left.exposedMinor)[0] ?? null;
}

function minor(bridge: MoneyBridge | null, metric: Parameters<typeof financialMetricValue>[1]) {
  if (!bridge) return '—';
  return formatMinorCurrencyNullable(financialMetricValue(bridge, metric), bridge.currency);
}

function financialTiles(report: IntelligenceReport, selectedCurrency: string | null, previous: IntelligenceReport | null): Tile[] {
  const bridge = bridgeFor(report, selectedCurrency);
  const prior = previous ? bridgeFor(previous, bridge?.currency ?? selectedCurrency) : null;
  return [
    ['requested', 'Requested by customers', '#1c1f23'],
    ['exposed', 'Exposure recognised', '#1c1f23'],
    ['approved', 'Approved for recovery', '#7a5310'],
    ['paid', 'Actually paid', '#1a6b43'],
    ['recovered', 'Matched to a settlement', '#1a6b43'],
    ['outstanding', 'Reconciled and closed', '#1a6b43'],
    ['written_off', 'Written off', '#40454a'],
    ['final_net_loss', 'Final net loss', '#b0431a'],
  ].map(([key, label, tone]) => ({
    key,
    label,
    tone,
    value: minor(bridge, key as Parameters<typeof financialMetricValue>[1]),
    previous: prior ? minor(prior, key as Parameters<typeof financialMetricValue>[1]) : '—',
  }));
}

function rankedTiles(rows: IntelligenceReport['causes'] | IntelligenceReport['recoveries'], measure: NamedReportMeasure): Tile[] {
  return rows.slice(0, 8).map((row) => ({
    key: `${row.key}-${row.currency}`,
    label: row.label,
    value: measure === 'amount' ? formatMinorCurrencyNullable(row.amountMinor, row.currency) : formatNumber(row.count),
    previous: 'prior run unavailable',
    tone: '#1c1f23',
  }));
}

function tilesFor(reportId: NamedReportId, report: IntelligenceReport, selectedCurrency: string | null, measure: NamedReportMeasure, previous: IntelligenceReport | null): Tile[] {
  if (reportId === 'financial' || reportId === 'prevention') return financialTiles(report, selectedCurrency, previous);
  if (reportId === 'loss-causes') return rankedTiles(report.causes, measure);
  if (reportId === 'recovery') return rankedTiles(report.recoveries, measure);
  if (reportId === 'coverage') return report.coverage.slice(0, 8).map((row) => ({
    key: row.objectType,
    label: row.objectType.replaceAll('_', ' '),
    value: `${formatNumber(row.freshRecords)} / ${formatNumber(row.records)}`,
    previous: row.records === 0 ? 'projection missing' : `${formatNumber(row.staleRecords)} stale`,
    tone: row.freshRecords === row.records ? '#1a6b43' : '#7a5310',
  }));
  const rows = report.operations.filter((row) => reportId !== 'evidence' || /(evidence|awaiting|investigation)/i.test(row.key));
  return rows.slice(0, 8).map((row) => {
    const exposure = selectedCurrency ? row.exposureByCurrency.find((entry) => entry.currency === selectedCurrency)?.knownMinor ?? null : null;
    return {
      key: row.key,
      label: row.label,
      value: measure === 'amount' ? formatMinorCurrencyNullable(exposure, selectedCurrency) : formatNumber(row.activeCount),
      previous: `${formatNumber(row.overdueCount)} overdue`,
      tone: row.overdueCount ? '#b0431a' : '#1c1f23',
    };
  });
}

function DefinitionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ width: 118, flex: 'none', color: '#1c1f23', font: `500 11.5px/1.5 ${sans}` }}>{label}</span><span style={{ flex: 1, minWidth: 0, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{children}</span></div>;
}

function RunRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{label}</span><span style={{ flex: 'none', color: tone ?? '#1c1f23', font: `400 11.5px/1.5 ${mono}` }}>{value}</span></div>;
}

export function NamedReportDetail({
  reportId,
  report,
  availableCurrencies: _availableCurrencies,
  selectedCurrency,
  measure,
  page,
  previousRun,
  runScope,
}: {
  reportId: string;
  report: IntelligenceReport;
  availableCurrencies: string[];
  selectedCurrency: string | null;
  measure: NamedReportMeasure;
  page: number;
  previousRun: PersistedReportRun | null;
  runScope: ReportRunScope;
}) {
  const definition = REPORT_DEFINITIONS.find((item) => item.id === reportId);
  if (!definition || !isNamedReportId(reportId)) notFound();
  const namedReportId: NamedReportId = reportId;
  const title = namedReportId === 'financial' ? 'Monthly loss pack' : definition.name;
  const recordsParams = new URLSearchParams({ reportId: namedReportId, range: report.range, timezone: report.timezone });
  if (selectedCurrency) recordsParams.set('currency', selectedCurrency);
  if (page > 1) recordsParams.set('page', String(page));
  const recordsHref = `/financials/reports/records?${recordsParams.toString()}`;
  const exportParams = new URLSearchParams({ range: report.range, timezone: report.timezone, view: 'records' });
  if (selectedCurrency) exportParams.set('currency', selectedCurrency);
  const tiles = tilesFor(namedReportId, report, selectedCurrency, measure, previousRun?.snapshot ?? null);
  while (tiles.length < 8) tiles.push({ key: `unavailable-${tiles.length}`, label: 'No additional observed measure', value: '—', previous: 'unavailable', tone: '#64686d' });
  const generated = formatDateTime(report.generatedAt);
  const currencyLabel = selectedCurrency ?? (report.bridges.length === 1 ? report.bridges[0].currency : 'currencies separated');
  const incomplete = report.reconciliation.confidence.excludedRecordCount;
  const unavailableSources = report.coverage.filter((row) => row.records === 0 || row.freshRecords < row.records);

  return <>
    <SetBreadcrumbLabel label={title} detail={`run ${generated} · definition ${report.financialScope?.definitionVersion ?? 'current'} · ${currencyLabel}`} />
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}><span style={{ padding: '2px 7px', borderRadius: 5, background: '#eef6f1', color: '#1a6b43', font: `500 10px/1.5 ${sans}` }}>RUN COMPLETE</span><strong style={{ color: '#1c1f23', font: `500 14.5px/1.2 ${sans}` }}>{title}</strong><span style={{ color: '#64686d', font: `400 12px/1.4 ${sans}` }}>{report.range} · {report.timezone} · {formatNumber(report.recordCount)} records</span><span style={{ flex: 1 }}/><ReportRunRecorder reportId={namedReportId} scope={runScope} compact/><Link href={recordsHref} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', textDecoration: 'none', font: `400 12.5px/1 ${sans}` }}>Supporting records</Link><a href={`/api/reports/claims?${exportParams.toString()}`} style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', textDecoration: 'none', font: `500 12.5px/1 ${sans}` }}>Export</a></div>
    <div data-screen-label="Named report" data-visual-world="supplied-package" data-surface-id="named-report-record-view" data-archetype="P9/P7" style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ flex: 'none', borderRadius: 10, padding: '14px 16px 13px', background: '#fff', boxShadow: shadow }}><header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 13 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>THE EIGHT NUMBERS THIS PACK REPORTS</strong><span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>each one is a different question · none is a restatement of another</span></header><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, overflow: 'hidden', borderRadius: 10, background: '#eae8e5' }}>{tiles.slice(0,8).map((tile) => <div key={tile.key} style={{ padding: '13px 14px', background: '#fff' }}><span style={{ display: 'block', minHeight: 28, color: '#64686d', font: `400 10px/1.4 ${sans}` }}>{tile.label}</span><strong style={{ display: 'block', marginTop: 6, color: tile.tone ?? '#1c1f23', font: `400 17px/1 ${mono}` }}>{tile.value}</strong><span style={{ display: 'block', marginTop: 6, color: '#64686d', font: `400 10px/1.4 ${mono}` }}>{previousRun ? `Prior ${tile.previous}` : tile.previous}</span></div>)}</div><p style={{ margin: '13px 0 0', paddingTop: 11, borderTop: '1px solid #eae8e5', color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>{report.reconciliation.issues[0] ?? NAMED_REPORT_CONTRACTS[namedReportId].question}</p></section>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
          <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, padding: '12px 15px 10px', background: '#fff', boxShadow: shadow }}><header style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>DEFINITION</strong><span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{report.financialScope?.definitionVersion ?? 'current'}</span></header><DefinitionRow label="Scope">{definition.definition}</DefinitionRow><DefinitionRow label="Currency">{selectedCurrency ? `${selectedCurrency} only. Other currencies are held, never converted.` : 'Currencies are separated and never summed together.'}</DefinitionRow><DefinitionRow label="Numerator">{definition.numerator}</DefinitionRow><DefinitionRow label="Denominator">{definition.denominator}</DefinitionRow><DefinitionRow label="Time basis">{definition.timeBasis}</DefinitionRow><DefinitionRow label="Excluded">{incomplete ? `${formatNumber(incomplete)} rows are held from confident figures` : 'No rows were excluded by the current reconciliation read'}</DefinitionRow><span style={{ flex: 1 }}/></section>
          <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, padding: '12px 15px 10px', background: '#fff', boxShadow: shadow }}><header style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>THIS RUN</strong><span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>ON-DEMAND</span></header><RunRow label="Started" value={generated}/><RunRow label="Completed" value={generated}/><RunRow label="Records read" value={formatNumber(report.recordCount)}/><RunRow label="Source projections" value={formatNumber(report.coverage.length)}/><RunRow label="Source not current" value={unavailableSources.length ? formatNumber(unavailableSources.length) : 'none'} tone={unavailableSources.length ? '#b0431a' : '#1a6b43'}/><RunRow label="Reconciliation issues open" value={formatNumber(report.reconciliation.confidence.issueCount)} tone={report.reconciliation.ok ? '#1a6b43' : '#7a5310'}/><span style={{ flex: 1 }}/><p style={{ margin: '8px 0 0', paddingTop: 9, borderTop: '1px solid #e4e3e0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>A run is a snapshot. Re-running now may produce a different figure, and both runs stay on record.</p></section>
        </div>
      </div>
      <aside style={{ width: 300, flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: 11, borderRadius: 13, padding: '12px 13px', background: '#f4f3f1' }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>DELIVERY</strong><section data-state-id="named-report-delivery-unavailable" style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: shadow, opacity: .75 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><strong style={{ flex: 1, color: '#1c1f23', font: `500 12.5px/1.3 ${sans}` }}>Schedule and recipients</strong><span style={{ padding: '2px 7px', borderRadius: 5, background: '#f4f3f1', color: '#64686d', font: `500 10px/1.5 ${sans}` }}>UNAVAILABLE</span></div><span style={{ color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Saved schedules, named owners and email delivery are not built. This pack is run on demand and exported by hand, and the control remains visible so nobody plans around a feature that does not exist.</span></section><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>RUN HISTORY</strong><section style={{ padding: '3px 13px 9px', borderRadius: 10, background: '#fff', boxShadow: shadow }}><div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', font: `500 11.5px/1.4 ${sans}` }}>Current on-demand run</b><small style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 10px/1.4 ${mono}` }}>{generated}</small></span><span style={{ color: tiles[7]?.tone ?? '#1c1f23', font: `400 12px/1.4 ${mono}` }}>{tiles[7]?.value ?? formatNumber(report.recordCount)}</span></div>{previousRun ? <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', font: `500 11.5px/1.4 ${sans}` }}>Prior immutable run</b><small style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 10px/1.4 ${mono}` }}>{formatDateTime(previousRun.generatedAt)}</small></span><span style={{ color: '#64686d', font: `400 12px/1.4 ${mono}` }}>{formatNumber(previousRun.recordCount)} rows</span></div> : <div style={{ padding: '9px 0', borderTop: '1px solid #f4f2ef', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>No earlier immutable run exists for this exact scope.</div>}</section><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHO CAN RUN THIS</strong><section style={{ padding: '12px 13px', borderRadius: 10, background: '#fff', boxShadow: shadow, color: '#64686d', font: `400 11.5px/1.5 ${sans}` }}>Owner, admin and finance viewers. Running it is logged; exporting it is logged with the row count.</section><span style={{ flex: 1 }}/><p style={{ margin: 0, paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: `400 11px/1.5 ${sans}` }}>Every figure traces to a row. <Link href={recordsHref} style={{ color: '#9b470d', textDecoration: 'none' }}>Open the {formatNumber(report.recordCount)} records</Link></p></aside>
    </div>
  </>;
}
