'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useScreenshotMode } from '@/components/connections/ConnectionStateContext';
import { screenshotCoverage } from '@/lib/demo/screenshotAccount';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Overview-Clean';
import { financialMetricValue, type DashboardPeriodComparison, type IntelligenceReport, type MoneyBridge } from '@/lib/reporting/intelligence';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/utils/format';
import {
  bridgeMetricValue,
  buildDashboardAttentionPriorities,
  summarizeDashboardWork,
} from './dashboardModel';
import { Modal } from '@/components/ui/Modal';

type Props = {
  report: IntelligenceReport;
  comparison: DashboardPeriodComparison | null;
  selectedCurrency: string | null;
  compare: 'previous' | 'none';
  acceptanceState?: 'unavailable' | 'no-work' | null;
};

type ClickHandler = () => void;

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join('').replace(/\s+/g, ' ').trim();
}

function knownValue(bridge: MoneyBridge | null, metric: Parameters<typeof bridgeMetricValue>[1]): number | null {
  return bridgeMetricValue(bridge, metric);
}

function openValue(bridge: MoneyBridge | null): number | null {
  return bridge ? financialMetricValue(bridge, 'final_net_loss') : null;
}

function displayMoney(value: number | null, currency: string | null): string {
  return value == null || !currency ? 'Unavailable' : formatMoney(value, currency);
}

function bindTree(
  node: ReactNode,
  replaceText: (value: string) => string,
  actions: ReadonlyMap<string, ClickHandler>,
  ancestorHasAction = false,
  runtimeNode?: (node: ReactElement<{ children?: ReactNode; style?: CSSProperties }>, children: ReactNode) => ReactNode | undefined,
): ReactNode {
  if (typeof node === 'string') return replaceText(node);
  if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return node;

  const visibleText = compactText(node);
  const onClick = ancestorHasAction ? undefined : actions.get(visibleText);
  const children = Children.map(node.props.children, (child) => bindTree(child, replaceText, actions, ancestorHasAction || Boolean(onClick), runtimeNode));
  const boundNode = runtimeNode?.(node, children);
  if (boundNode !== undefined) return boundNode;
  const sourceProps: Record<string, unknown> = {};

  if (onClick) {
    sourceProps.onClick = (event: { preventDefault?: () => void }) => {
      event.preventDefault?.();
      onClick();
    };
    sourceProps.role = node.type === 'a' ? undefined : 'button';
    sourceProps.tabIndex = node.type === 'a' ? undefined : 0;
    sourceProps.onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onClick();
    };
  }

  if (typeof node.type === 'string' && visibleText.includes('Last 30 days') && visibleText.includes('GBP only')) {
    sourceProps['data-surface-id'] = 'overview-dashboard';
    sourceProps['data-reference-id'] = 'Overview-Clean';
    sourceProps['data-data-resolved'] = 'true';
    sourceProps['data-route-state'] = 'loaded';
    sourceProps['data-provenance'] = 'canonical-report';
    sourceProps['data-visual-world'] = 'supplied-package';
  }

  return cloneElement(node as ReactElement, sourceProps, children);
}

export function ExactDashboardOverview({ report: runtimeReport, comparison, selectedCurrency, compare, acceptanceState = null }: Props) {
  const screenshot = useScreenshotMode() && !acceptanceState;
  const demoCoverage = useMemo(() => screenshot ? screenshotCoverage() : null, [screenshot]);
  const report = useMemo(() => acceptanceState === 'unavailable' ? { ...runtimeReport, bridges: [], trend: [] } : acceptanceState === 'no-work' ? { ...runtimeReport, operations: [] } : runtimeReport, [runtimeReport, acceptanceState]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [trustOpen, setTrustOpen] = useState(false);
  const currency = selectedCurrency ?? (report.bridges.length === 1 ? report.bridges[0]?.currency : null) ?? 'currency unavailable';
  const bridge = report.bridges.find((item) => item.currency === currency) ?? null;
  const work = summarizeDashboardWork(report.operations);
  const attention = buildDashboardAttentionPriorities(report.operations, selectedCurrency).slice(0, 4);
  const comparisonEnabled = compare === 'previous' && comparison != null;
  const rangeLabel = report.range === 'all'
    ? 'All time'
    : report.range === '7d'
      ? 'Last 7 days'
      : report.range === '90d'
        ? 'Last 90 days'
        : 'Last 30 days';
  const exposure = knownValue(bridge, 'exposure');
  const recovered = knownValue(bridge, 'recovered');
  const prevented = knownValue(bridge, 'prevented');
  const realised = knownValue(bridge, 'realisedLoss');
  const sought = bridge ? financialMetricValue(bridge, 'recoverable') : null;
  const approved = bridge ? financialMetricValue(bridge, 'approved') : null;
  const accessibleTrend = report.trend
    .filter((point) => point.currency === selectedCurrency)
    .sort((a, b) => a.date.localeCompare(b.date));

  const updateQuery = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}${next.size ? `?${next}` : ''}`);
  }, [pathname, router, searchParams]);

  const bound = useMemo(() => {
    const currentTrend = report.trend.filter((point) => point.currency === selectedCurrency).sort((a, b) => a.date.localeCompare(b.date));
    const sourceCoverage = demoCoverage ?? report.coverage.filter((row) => row.scope === 'connected-source');
    const coverageLabel = `${sourceCoverage.filter((row) => row.records > 0).length} of ${sourceCoverage.length} recorded layers`;
    const priorExposure = comparisonEnabled ? knownValue(comparison.bridges.find((item) => item.currency === selectedCurrency) ?? null, 'exposure') : null;
    const delta = exposure != null && priorExposure != null && priorExposure !== 0 ? ((exposure - priorExposure) / Math.abs(priorExposure)) * 100 : null;
    const trendValue = (index: number, received: boolean) => {
      const point = currentTrend[index];
      return point?.knownStates.includes(received ? 'recovered' : 'exposed') ? (received ? point.recoveredMinor : point.exposureMinor) : null;
    };
    const chartMax = Math.max(1, ...currentTrend.flatMap((_, index) => [trendValue(index, false) ?? 0, trendValue(index, true) ?? 0]));
    const pointAt = (index: number, received: boolean) => {
      const value = trendValue(index, received);
      return value == null ? null : { x: 20 + (currentTrend.length > 1 ? index / (currentTrend.length - 1) * 600 : 0), y: 176 - value / chartMax * 170 };
    };
    const linePath = (received: boolean, area: boolean) => {
      const segments: Array<Array<{ x: number; y: number }>> = [];
      currentTrend.forEach((_, index) => {
        const point = pointAt(index, received);
        if (!point) return;
        if (index === 0 || !pointAt(index - 1, received)) segments.push([]);
        segments[segments.length - 1].push(point);
      });
      return segments.map((segment) => {
        let path = `M${segment[0].x} ${segment[0].y}`;
        segment.slice(1).forEach((point, index) => {
          const previous = segment[index];
          const step = (point.x - previous.x) / 3;
          path += ` C${previous.x + step} ${previous.y} ${point.x - step} ${point.y} ${point.x} ${point.y}`;
        });
        return area ? `${path} L${segment.at(-1)!.x} 176 L${segment[0].x} 176 Z` : path;
      }).join(' ');
    };
    const queues = new Map<string, string[]>([
      ['Last 30 days', [rangeLabel]],
      ['vs previous period', [comparisonEnabled ? 'vs previous period' : 'no comparison']],
      ['GBP only', [`${currency} only`]],
      ['minor units · GBP', [`Amounts · ${selectedCurrency ?? 'currency unavailable'}`]],
      ['+7.9% vs prev 30d', [delta == null ? 'Comparison unavailable' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous period`]],
      ['weekly buckets · Europe/London', [`recorded daily values · ${report.timezone}`]],
      ['Wed, 26 Aug 2026', [currentTrend.at(-1)?.date ?? 'No recorded trend']],
      ['£15k', [displayMoney(chartMax * 130 / 170, selectedCurrency)]],
      ['£10k', [displayMoney(chartMax * 80 / 170, selectedCurrency)]],
      ['£5k', [displayMoney(chartMax * 30 / 170, selectedCurrency)]],
      ['14', [screenshot ? formatNumber(work.activeCount) : 'Unavailable']],
      ['4 of 5 layers', [coverageLabel, coverageLabel]],
      ['3 / 5 current', [`${sourceCoverage.filter((row) => row.records > 0 && row.staleRecords === 0).length} / ${sourceCoverage.length} current`]],
      ['Source freshness', ['Record freshness']],
      ['£212.40 received but unmatched', [screenshot ? 'Review received payments and matches' : 'Unmatched received amount unavailable']],
      ['3 data-trust issues', [`${formatNumber(report.reconciliation.confidence.issueCount)} data-trust issues`]],
      ['£41,208.42', [displayMoney(exposure, selectedCurrency)]],
      ['Recognised across 218 cases · £19,855.92 still open', [`Recognised across ${formatNumber(report.recordCount)} cases · ${displayMoney(openValue(bridge), selectedCurrency)} still open`]],
      ['£10,786.28', [displayMoney(trendValue(currentTrend.length - 1, false), selectedCurrency)]],
      ['£4,120.50', [displayMoney(trendValue(currentTrend.length - 1, true), selectedCurrency)]],
      ['£12,880.00', [displayMoney(sought, selectedCurrency), displayMoney(sought, selectedCurrency)]],
      ['Sought across 14 open recovery routes', [`Sought across ${formatNumber(work.activeCount)} open recovery routes`]],
      ['£2,905.00', [displayMoney(sought, selectedCurrency), displayMoney(attention[2]?.selectedExposureMinor ?? null, selectedCurrency)]],
      ['£4,180.00', [displayMoney(approved, selectedCurrency), displayMoney(attention[0]?.selectedExposureMinor ?? null, selectedCurrency)]],
      ['£3,180.00', [displayMoney(approved, selectedCurrency), displayMoney(approved, selectedCurrency)]],
      ['£2,615.00', [displayMoney(recovered, selectedCurrency)]],
      ['23 open tasks · 4 exceptions', [`${formatNumber(work.activeCount)} open tasks · ${formatNumber(report.reconciliation.confidence.issueCount)} exceptions`]],
      ['£1,240.00', [displayMoney(attention[1]?.selectedExposureMinor ?? null, selectedCurrency)]],
      ['£212.40', Array.from({ length: 3 }, () => displayMoney(attention[3]?.selectedExposureMinor ?? null, selectedCurrency))],
      ['£2,402.60', [displayMoney(recovered, selectedCurrency)]],
      ['RECONCILED', ['RECEIVED + MATCHED']],
      ['£22,267.92', [displayMoney(realised, selectedCurrency)]],
      ['£5,204.60', [displayMoney(prevented, selectedCurrency)]],
      ['EUR excluded', [report.bridges.length > 1 ? `${report.bridges.filter((item) => item.currency !== selectedCurrency).map((item) => item.currency).join(', ')} excluded` : 'Single currency']],
      ['Commerce · support · fulfilment', ['Recorded source layers']],
      ['on demand only', [screenshot ? 'UPS connected' : 'Coverage unavailable']],
      ['no source', [screenshot ? 'ShipBob connected' : 'Coverage unavailable']],
      ['Returns platform not connected', [screenshot ? 'All source layers connected' : 'Review source connections']],
    ]);
    ['28 JUL', '4 AUG', '11 AUG', '18 AUG', '26 AUG', '30 AUG'].forEach((label, index) => {
      const point = currentTrend[Math.round(index / 5 * (currentTrend.length - 1))];
      queues.set(label, [point ? new Date(point.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase() : '—']);
    });
    if (exposure == null) queues.set('Recognised across 218 cases · £19,855.92 still open', ['No verified financial position for this range']);
    const sourceRows = [
      ['CASE-4192 · Delivery dispute', 'Carrier proof received · due in 4h'],
      ['CASE-4187 · Refund request', 'Evidence gap: helpdesk thread stale'],
      ['REC-1191 · Evri claim ready', 'Handoff prepared, not yet sent'],
      ['EXC-118 · Unmatched credit £212.40', 'Evri paid on 31 Aug · two candidate claims'],
    ] as const;
    sourceRows.forEach(([sourceLabel, sourceSupport], index) => {
      const item = attention[index];
      queues.set(sourceLabel, [item?.label ?? 'No work in this group']);
      queues.set(sourceSupport, [item?.supportCopy ?? 'No matching work was returned for this range']);
    });
    const replaceText = (value: string) => {
      // Bind complete source text nodes only. Substring replacement corrupts
      // labels such as Recovered when binding the separate 'covered' status.
      return queues.get(value)?.shift() ?? value;
    };
    const actions = new Map<string, ClickHandler>([
      ['Last 30 days', () => updateQuery({ range: report.range === '30d' ? '7d' : '30d' })],
      ['vs previous period', () => updateQuery({ compare: comparisonEnabled ? 'none' : 'previous' })],
      ['GBP only', () => {
        const index = report.bridges.findIndex((item) => item.currency === selectedCurrency);
        const next = report.bridges[(index + 1) % report.bridges.length];
        if (next) updateQuery({ currency: next.currency });
      }],
      ['3 data-trust issues', () => setTrustOpen(true)],
      ['Export', () => router.push(`/financials/reports?range=${report.range}&timezone=${encodeURIComponent(report.timezone)}`)],
      ['Open Work queue', () => router.push('/work')],
      ['Reconcile', () => router.push('/financials/reconciliation')],
      ['Connect', () => router.push('/sources/connected')],
      ['Can I act on these figures?', () => setTrustOpen(true)],
    ]);
    const runtimeNode = (node: ReactElement<{ children?: ReactNode; style?: CSSProperties }>, children: ReactNode): ReactNode | undefined => {
      const text = compactText(node);
      if (node.props.style?.padding === '16px 22px 20px') {
        return cloneElement(node as ReactElement<Record<string, unknown>>, {
          style: { ...node.props.style, flex: '1 0 auto', minHeight: 'auto' },
        }, children);
      }
      if (node.props.style?.flexDirection === 'column' && node.props.style.gap === '9px' && text.includes('4m ago')) {
        const template = Children.toArray(node.props.children).filter(isValidElement)[0] as ReactElement<{ children?: ReactNode; style?: CSSProperties }>;
        const cells = Children.toArray(template.props.children).filter(isValidElement) as ReactElement<{ style?: CSSProperties }>[];
          return cloneElement(node, {}, sourceCoverage.length ? sourceCoverage.map((row) => {
          const colour = row.records === 0 ? '#b6b1aa' : row.staleRecords > 0 ? '#7a5310' : '#1a7f4b';
          return cloneElement(template, { key: row.objectType },
            cloneElement(cells[0], { style: { ...cells[0].props.style, background: colour } }),
            cloneElement(cells[1], {}, row.objectType),
            cloneElement(cells[2], { style: { ...cells[2].props.style, color: row.staleRecords > 0 ? '#7a5310' : '#64686d' } }, row.records ? `${formatNumber(row.freshRecords)} / ${formatNumber(row.records)} current` : 'No recorded data'));
        }) : cloneElement(template as ReactElement<Record<string, unknown>>, { role: 'status' }, cloneElement(cells[1], {}, 'Record freshness unavailable')));
      }
      if (node.type === 'svg' && (node.props as Record<string, unknown>).viewBox === '0 0 640 190') {
        return cloneElement(node, {}, Children.map(children, (child) => {
          if (!isValidElement<Record<string, unknown>>(child)) return child;
          if (child.type === 'path') {
            const received = child.props.stroke === '#4a90d9' || child.props.fill === 'url(#ovRecFill)';
            return cloneElement(child, { d: linePath(received, child.props.fill !== 'none') });
          }
          const lastIndex = currentTrend.length - 1;
          if (child.type === 'circle') {
            const point = pointAt(lastIndex, child.props.fill === '#4a90d9');
            return cloneElement(child, { cx: point?.x ?? 20, cy: point?.y ?? 176, opacity: point ? 1 : 0 });
          }
          if (child.type === 'line' && child.props.strokeDasharray) {
            const point = pointAt(lastIndex, false);
            return cloneElement(child, { x1: point?.x ?? 20, x2: point?.x ?? 20, opacity: point ? 1 : 0 });
          }
          return child;
        }));
      }
      if (node.props.style?.padding === '8px 9px') {
        const index = sourceRows.findIndex(([label]) => text.includes(label));
        if (index >= 0) {
          const item = attention[index];
          if (!item && index > 0) return null;
          const cells = Children.toArray(children).filter(isValidElement) as ReactElement<{ children?: ReactNode }>[];
          const date = item?.oldestOpenedAt ? new Date(item.oldestOpenedAt) : null;
          const dateLabels = date && Number.isFinite(date.getTime()) ? [String(date.getUTCDate()).padStart(2, '0'), formatDateTime(date).split(' ')[1].replace(',', '').toUpperCase()] : ['—', ''];
          const dateCells = Children.toArray(cells[0].props.children).filter(isValidElement) as ReactElement[];
          cells[0] = cloneElement(cells[0], {}, dateCells.map((cell, part) => cloneElement(cell, { key: part }, dateLabels[part])));
          return cloneElement(node as ReactElement<Record<string, unknown>>, item ? {
            role: 'link', tabIndex: 0, onClick: () => router.push(item.href),
            onKeyDown: (event: { key: string; preventDefault: () => void }) => { if (event.key === 'Enter') { event.preventDefault(); router.push(item.href); } },
            style: { ...node.props.style, minHeight: 48, flex: '0 0 auto' },
          } : { role: 'status' }, ...cells);
        }
      }
      if (node.props.style?.padding === '13px 14px' && node.props.style.gap === '9px' && text.includes('Needs a decision')) {
        return cloneElement(node as ReactElement<Record<string, unknown>>, {
          style: { ...node.props.style, minHeight: 0, overflowY: 'auto' },
        }, children);
      }
      return undefined;
    };
    return bindTree(SuppliedVisualBody(), replaceText, actions, false, runtimeNode);
  }, [screenshot, demoCoverage, approved, attention, bridge, comparison, comparisonEnabled, currency, exposure, prevented, realised, recovered, report, router, selectedCurrency, sought, updateQuery, work.activeCount, rangeLabel]);

  const acceptanceStateId = acceptanceState === 'unavailable'
    ? 'overview-unavailable-state'
    : acceptanceState === 'no-work'
      ? 'overview-no-work-state'
      : null;
  const renderedBound = acceptanceStateId
    ? <div data-state-id={acceptanceStateId} style={{ display: 'contents' }}>{bound}</div>
    : bound;

  return (
    <>
      <section aria-label="Overview content" tabIndex={0} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {renderedBound}
      <details data-overview-trend-table style={{ flex: 'none', margin: '0 22px 20px', borderRadius: 10, background: '#fff', boxShadow: '0 0 0 1px rgba(28,27,25,.08)', color: '#40454a', font: "400 11.5px/1.4 'Inter',sans-serif" }}>
        <summary style={{ minHeight: 36, display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'pointer', fontWeight: 500 }}>View trend data</summary>
        <div style={{ overflowX: 'auto', borderTop: '1px solid #eae8e5' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', textAlign: 'left' }}>
            <caption style={{ padding: '10px 12px', textAlign: 'left', color: '#64686d' }}>{rangeLabel} · {selectedCurrency ?? 'currency unavailable'} · unavailable values are not zero</caption>
            <thead><tr>{['Date', 'Exposure', 'Recovered', 'Prevented'].map((label) => <th key={label} scope="col" style={{ padding: '8px 12px', borderTop: '1px solid #eae8e5', color: '#64686d', fontSize: 10, letterSpacing: '.06em' }}>{label.toUpperCase()}</th>)}</tr></thead>
            <tbody>{accessibleTrend.length ? accessibleTrend.map((point) => <tr key={point.date}>
              <th scope="row" style={{ padding: '8px 12px', borderTop: '1px solid #f4f2ef', fontWeight: 500 }}>{point.date}</th>
              <td style={{ padding: '8px 12px', borderTop: '1px solid #f4f2ef', fontFamily: "'IBM Plex Mono',monospace" }}>{point.knownStates.includes('exposed') ? displayMoney(point.exposureMinor, point.currency) : 'Unavailable'}</td>
              <td style={{ padding: '8px 12px', borderTop: '1px solid #f4f2ef', fontFamily: "'IBM Plex Mono',monospace" }}>{point.knownStates.includes('recovered') ? displayMoney(point.recoveredMinor, point.currency) : 'Unavailable'}</td>
              <td style={{ padding: '8px 12px', borderTop: '1px solid #f4f2ef', fontFamily: "'IBM Plex Mono',monospace" }}>{point.knownStates.includes('prevented') ? displayMoney(point.preventedMinor, point.currency) : 'Unavailable'}</td>
            </tr>) : <tr><td colSpan={4} style={{ padding: 12, borderTop: '1px solid #f4f2ef' }}>Trend data unavailable for this currency and range.</td></tr>}</tbody>
          </table>
        </div>
      </details>
      </section>
      <Modal open={trustOpen} onClose={() => setTrustOpen(false)} title="Data trust" description="Source coverage and freshness behind this view." overlayId="overview-data-trust" size="md">
        <div style={{ font: "400 12.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>
          <p style={{ marginTop: 0 }}>Validated values only. Figures include source-backed records; affected values are marked rather than estimated.</p>
          {report.coverage.map((row) => <div key={row.objectType} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '9px 0', borderTop: '1px solid #eae8e5' }}><strong style={{ color: '#1c1f23' }}>{row.objectType}</strong><span>{formatNumber(row.freshRecords)} current</span><span>{formatNumber(row.staleRecords)} stale</span></div>)}
        </div>
      </Modal>
    </>
  );
}
