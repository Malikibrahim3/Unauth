import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { AnalyticsCompleteness, AnalyticsIssue } from '@/lib/analytics/contracts';
import { formatNumber } from '@/lib/utils/format';
import type { AuthChartTableRow, ChartMarkPattern, ChartTone } from './types';
import { OperationalState } from '@/components/ui/OperationalState';

export type ChartDataColumn = { key: string; header: string; numeric?: boolean };
export type ChartDataTableModel = { caption?: string; columns: ChartDataColumn[]; rows: Array<{ key: string; header: ReactNode; headerHref?: string; values: ReactNode[] }> };
export type ChartProvenance = {
  measure: string;
  dateRange: { start: string; end: string; label?: string };
  timezone: string;
  currency?: string | string[] | null;
  generatedAt: string;
  sourceDataWatermark: string | null;
  completeness: AnalyticsCompleteness;
  recordCount: number;
  /** Plain-language rule, e.g. “Missing observations render as gaps.” */
  missingData: string;
  issues?: AnalyticsIssue[];
};

type ChartFrameBaseProps = { id: string; kind: string; question: string; summary?: ReactNode; scope?: ReactNode; control?: ReactNode; legend?: ReactNode; children: ReactNode; freshness?: ReactNode; caption?: ReactNode; tabs?: ReactNode; pins?: ReactNode; compact?: boolean; presentation?: 'open' | 'contained' };
type LegacyChartFrameProps = ChartFrameBaseProps & { provenance?: undefined; records?: { href: string; label?: string }; table?: ChartDataTableModel };
type ProvenanceChartFrameProps = ChartFrameBaseProps & { provenance: ChartProvenance; records: { href: string; label?: string }; table: ChartDataTableModel };
export type ChartFrameProps = LegacyChartFrameProps | ProvenanceChartFrameProps;

export function simpleChartTable(rows: AuthChartTableRow[], caption?: string): ChartDataTableModel { return { caption, columns: [{ key: 'item', header: 'Item' }, { key: 'value', header: 'Value', numeric: true }, { key: 'context', header: 'Context' }], rows: rows.map((row) => ({ key: `${row.label}-${row.detail ?? ''}`, header: row.href ? <a href={row.href}>{row.label}</a> : row.label, values: [row.value, row.detail ?? '—'] })) }; }

export function ChartDataTable({ model, defaultOpen = false, open, onOpenChange, summaryRef, summaryLabel = 'View chart data' }: { model: ChartDataTableModel; defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void; summaryRef?: RefObject<HTMLElement | null>; summaryLabel?: string }) { if (!model.rows.length) return null; return <details suppressHydrationWarning className="relative" open={open ?? (defaultOpen ? true : undefined)} onToggle={onOpenChange ? (event) => onOpenChange(event.currentTarget.open) : undefined}><summary ref={summaryRef}>{summaryLabel}</summary><div className="w-full border-collapse text-[11.5px]"><table className="w-full border-collapse text-[11.5px]"><caption className="sr-only">{model.caption ?? 'Chart data'}</caption><thead><tr>{model.columns.map((column) => <th key={column.key} scope="col" className={`bg-[#f4f3f1] px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#64686d] ${column.numeric ? 'bg-[#f4f3f1] px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#64686d]' : ''}`}>{column.header}</th>)}</tr></thead><tbody>{model.rows.map((row) => <tr key={row.key} className="border-t border-[#e4e3e0]"><th scope="row" className="px-3 py-2.5 align-middle">{row.headerHref ? <a href={row.headerHref}>{row.header}</a> : row.header}</th>{row.values.map((value, index) => <td key={model.columns[index + 1]?.key ?? index} className={`px-3 py-2.5 align-middle ${model.columns[index + 1]?.numeric ? 'px-3 py-2.5 align-middle' : ''}`}>{value}</td>)}</tr>)}</tbody></table></div></details>; }

function ChartProvenanceDisclosure({ provenance }: { provenance: ChartProvenance }) {
  const currencies = Array.isArray(provenance.currency) ? provenance.currency.join(', ') : provenance.currency;
  return <details className="relative"><summary>Data quality and provenance</summary><dl><div><dt>Measure</dt><dd>{provenance.measure}</dd></div><div><dt>Scope</dt><dd>{provenance.dateRange.label ?? `${provenance.dateRange.start} to ${provenance.dateRange.end}`} · {provenance.timezone}</dd></div><div><dt>Currency</dt><dd>{currencies || 'Not applicable'}</dd></div><div><dt>Completeness</dt><dd>{provenance.completeness}</dd></div><div><dt>Supporting records</dt><dd>{formatNumber(provenance.recordCount)}</dd></div><div><dt>Source watermark</dt><dd>{provenance.sourceDataWatermark ? <time dateTime={provenance.sourceDataWatermark}>{provenance.sourceDataWatermark}</time> : 'Unavailable'}</dd></div><div><dt>Generated</dt><dd><time dateTime={provenance.generatedAt}>{provenance.generatedAt}</time></dd></div><div><dt>Missing data</dt><dd>{provenance.missingData}</dd></div></dl>{provenance.issues?.length ? <ul aria-label="Data quality issues">{provenance.issues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.code}</strong>: {issue.explanation}{issue.excludedRecordCount ? ` (${formatNumber(issue.excludedRecordCount)} records excluded)` : ''}</li>)}</ul> : null}</details>;
}

export function ChartFrame({ id, kind, question, summary, scope, control, legend, children, freshness, records, table, caption, tabs, pins, provenance, compact = false, presentation = 'open' }: ChartFrameProps) { const titleId = `${id}-title`; return <figure className={cn('relative', `relative${presentation}`)} aria-labelledby={titleId} data-chart-id={id} data-auth-chart={kind} data-completeness={provenance?.completeness}><header className="flex items-center gap-3"><div><h2 id={titleId}>{question}</h2>{summary ? <p>{summary}</p> : null}{scope ? <small>{scope}</small> : null}</div>{control}</header>{tabs ? <div className="flex items-center gap-3">{tabs}</div> : null}{legend ? <div className="flex items-center gap-3">{legend}</div> : null}{pins ? <div className="relative">{pins}</div> : null}<div className={`relative ${compact ? 'relative' : ''}`}>{children}</div>{caption ? <figcaption className="text-[11px] leading-[1.45] text-[#64686d]">{caption}</figcaption> : null}{freshness || records ? <footer className="flex items-center gap-3"><span>{freshness}</span>{records ? <a href={records.href}>{records.label ?? 'View records'} <span aria-hidden="true">→</span></a> : null}</footer> : null}{provenance ? <ChartProvenanceDisclosure provenance={provenance} /> : null}{table ? <ChartDataTable model={{ ...table, caption: table.caption ?? question }} /> : null}</figure>; }

export type ChartStateKind = 'empty' | 'filtered-empty' | 'insufficient-history' | 'partial' | 'stale' | 'disconnected' | 'error' | 'mixed-currency' | 'unavailable' | 'refreshing';
/** Thin `OperationalState placement='plot'` wrapper (§17.5/§18.6) — replaces the plot rather than overlaying it. */
export function ChartState({ kind = 'empty', title, description, action, minHeight }: { kind?: ChartStateKind; title: string; description?: string; action?: ReactNode; minHeight?: number }) {
  return <OperationalState kind={kind} placement="plot" title={title} description={description} action={action} minHeight={minHeight} className="inline-flex items-center rounded-md bg-[#f4f3f1] px-2 py-1 text-[10px] font-semibold text-[#40454a]" />;
}
export function ChartLegend({ items }: { items: Array<{ label: string; tone: ChartTone; pattern?: ChartMarkPattern }> }) { return <ul className="flex items-center gap-3" aria-label="Chart legend">{items.map((item) => <li key={item.label}><i data-tone={item.tone} data-pattern={item.pattern} aria-hidden="true" />{item.label}</li>)}</ul>; }
export function ChartPanel({ id, title, description, annotation, legend, tabs, pins, caption, children, table, kind, compact = false }: { id: string; title: string; description?: string; annotation?: ReactNode; legend?: ReactNode; tabs?: ReactNode; pins?: ReactNode; caption?: ReactNode; children: ReactNode; table: AuthChartTableRow[]; kind: string; compact?: boolean }) { return <ChartFrame id={id} kind={kind} question={title} summary={description} control={annotation} legend={legend} tabs={tabs} pins={pins} caption={caption} table={table.length ? simpleChartTable(table) : undefined} compact={compact}>{children}</ChartFrame>; }
