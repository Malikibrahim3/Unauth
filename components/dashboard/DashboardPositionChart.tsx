'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ChartDataTableModel } from '@/components/charts/authenticated/ChartFrame';
import { ChartDataTable } from '@/components/charts/authenticated/ChartFrame';
import type { DashboardChartBucket } from './dashboardModel';

type Props = {
  data: DashboardChartBucket[];
  secondary: Array<number | null> | null;
  comparison: boolean;
  metricLabel: string;
  secondaryLabel?: string;
  scope: string;
  basisLabel: string;
  idleDetail: string;
  formatValue: (value: number | null) => string;
  formatAxisValue?: (value: number | null) => string;
  table?: ChartDataTableModel;
};

function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

function lineSegments(data: DashboardChartBucket[], ceiling: number) {
  const segments: string[] = [];
  let current: string[] = [];
  data.forEach((bucket, index) => {
    if (bucket.previousMinor == null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${((index + 0.5) / data.length) * 1000},${100 - Math.min(100, bucket.previousMinor / ceiling * 100)}`);
  });
  if (current.length > 1) segments.push(current.join(' '));
  return segments;
}

const mono = "'IBM Plex Mono', ui-monospace, monospace";

export function DashboardPositionChart({ data, secondary, comparison, metricLabel, secondaryLabel = 'Recovered', scope, basisLabel, idleDetail, formatValue, formatAxisValue = formatValue, table }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const focusTableAfterOpen = useRef(false);
  const tableSummaryRef = useRef<HTMLElement | null>(null);
  const bucketRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const instructionsId = `dashboard-timeline-instructions-${metricLabel.toLowerCase().replaceAll(' ', '-')}`;
  const values = data.flatMap((bucket, index) => [bucket.currentMinor, bucket.previousMinor, secondary?.[index] ?? null]).filter((value): value is number => value != null);
  const ceiling = niceCeiling(Math.max(0, ...values));
  const peakIndex = data.reduce((best, bucket, index) => (bucket.currentMinor ?? 0) > (best < 0 ? -1 : data[best].currentMinor ?? -1) ? index : best, -1);
  const peak = peakIndex >= 0 ? data[peakIndex] : null;
  const segments = useMemo(() => lineSegments(data, ceiling), [data, ceiling]);
  const selectedKey = pinnedKey ?? activeKey;
  const selectedIndex = selectedKey == null ? -1 : data.findIndex((bucket) => bucket.key === selectedKey);
  const readout = selectedIndex < 0 ? null : { label: data[selectedIndex].label, current: data[selectedIndex].currentMinor, secondary: secondary?.[selectedIndex] ?? null, previous: data[selectedIndex].previousMinor };

  useEffect(() => { setActiveKey(null); setPinnedKey(null); setRovingIndex(0); }, [data]);
  useEffect(() => { if (tableOpen && focusTableAfterOpen.current) { focusTableAfterOpen.current = false; tableSummaryRef.current?.focus(); } }, [tableOpen]);

  function description(index: number) {
    const bucket = data[index];
    const secondaryValue = secondary?.[index] ?? null;
    return [bucket.label, `${metricLabel} ${formatValue(bucket.currentMinor)}`, secondaryValue != null ? `${secondaryLabel} ${formatValue(secondaryValue)}` : null, comparison && bucket.previousMinor != null ? `Previous period ${formatValue(bucket.previousMinor)}` : null].filter(Boolean).join(', ');
  }

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    if (event.key === 'ArrowRight') next = Math.min(data.length - 1, index + 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = data.length - 1;
    if (event.key === 'Escape') { event.preventDefault(); setPinnedKey(null); setAnnouncement('Pinned period cleared.'); return; }
    if (next == null) return;
    event.preventDefault(); setRovingIndex(next); bucketRefs.current[next]?.focus();
  }

  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <div style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#40454a' }}>{readout?.label ?? `${scope} · ${basisLabel}`}</strong><span style={{ fontFamily: mono, fontSize: 10.5, color: '#6f6a63' }}>{readout ? `${metricLabel} ${formatValue(readout.current)}` : peak?.currentMinor != null && peak.currentMinor > 0 ? `Peak ${formatValue(peak.currentMinor)} · ${peak.label}` : 'No known interval peak in this period'}</span></div>
        <div style={{ display: 'flex', gap: 10, fontFamily: mono, fontSize: 10, color: '#6f6a63' }}>{readout?.secondary != null ? <span>{secondaryLabel} {formatValue(readout.secondary)}</span> : null}{comparison && readout?.previous != null ? <span>Previous {formatValue(readout.previous)}</span> : !readout ? <span>{idleDetail}</span> : null}</div>
        {table ? <button type="button" onClick={() => { focusTableAfterOpen.current = true; setTableOpen(true); }} style={{ border: 0, background: 'transparent', color: '#9f4f08', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>View data</button> : null}
      </div>
      <p id={instructionsId} className="sr-only">Use Left and Right Arrow to inspect periods, Home and End to jump, Enter or Space to pin a period, and Escape to clear it.</p>
      <span className="sr-only" aria-live="polite">{announcement}</span>
      <div data-testid="financial-plot" role="group" aria-label={`${metricLabel} timeline — ${scope}`} aria-describedby={instructionsId} onMouseLeave={() => setActiveKey(null)} style={{ position: 'relative', minHeight: 150, flex: 1, marginLeft: 42 }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>{[ceiling, ceiling / 2, 0].map((value) => <div key={value} style={{ position: 'relative', borderTop: '1px solid #eae8e5' }}><span style={{ position: 'absolute', right: 'calc(100% + 8px)', top: -6, fontFamily: mono, fontSize: 9.5, color: '#6f6a63', whiteSpace: 'nowrap' }}>{formatAxisValue(value)}</span></div>)}</div>
        {comparison && segments.length ? <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>{segments.map((points) => <polyline key={points} points={points} fill="none" stroke="#a7abad" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}</svg> : null}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))`, alignItems: 'end', gap: data.length > 30 ? 2 : 5 }}>
          {data.map((bucket, index) => {
            const currentHeight = bucket.currentMinor == null ? 0 : Math.max(2, bucket.currentMinor / ceiling * 100);
            const secondaryValue = secondary?.[index] ?? null;
            const secondaryHeight = secondaryValue == null ? 0 : Math.max(2, secondaryValue / ceiling * 100);
            const selected = selectedKey === bucket.key;
            const showLabel = index === 0 || index === data.length - 1 || index % Math.max(1, Math.ceil(data.length / 5)) === 0;
            return <button key={bucket.key} ref={(node) => { bucketRefs.current[index] = node; }} type="button" tabIndex={index === rovingIndex ? 0 : -1} aria-label={description(index)} aria-pressed={pinnedKey === bucket.key} onMouseEnter={() => setActiveKey(bucket.key)} onFocus={() => { setRovingIndex(index); setActiveKey(bucket.key); }} onBlur={() => setActiveKey(null)} onKeyDown={(event) => move(event, index)} onClick={() => { const pin = pinnedKey !== bucket.key; setPinnedKey(pin ? bucket.key : null); setAnnouncement(`${pin ? 'Pinned' : 'Unpinned'} ${description(index)}`); }} style={{ position: 'relative', height: '100%', border: 0, borderRadius: 6, background: selected ? '#f4f3f1' : 'transparent', padding: '0 2px', cursor: 'crosshair' }}>
              <span aria-hidden="true" style={{ position: 'absolute', inset: '0 2px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}><i style={{ width: '38%', height: `${currentHeight}%`, minHeight: bucket.currentMinor == null ? 0 : 2, borderRadius: '4px 4px 1px 1px', background: '#ff7a30' }} />{secondaryValue != null ? <i style={{ width: '30%', height: `${secondaryHeight}%`, minHeight: 2, borderRadius: '4px 4px 1px 1px', background: '#4a90d9' }} /> : null}</span>
              {showLabel || selected ? <span aria-hidden="true" style={{ position: 'absolute', top: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)', fontFamily: mono, fontSize: 9, color: selected ? '#1c1f23' : '#6f6a63', whiteSpace: 'nowrap' }}>{bucket.label}</span> : null}
            </button>;
          })}
        </div>
      </div>
      <div aria-label="Chart legend" style={{ display: 'flex', gap: 16, marginTop: 23, fontSize: 10.5, color: '#64686d' }}><span><i style={{ display: 'inline-block', width: 14, height: 2, marginRight: 6, background: '#ff7a30', verticalAlign: 'middle' }} />{metricLabel}</span>{secondary ? <span><i style={{ display: 'inline-block', width: 14, height: 2, marginRight: 6, background: '#4a90d9', verticalAlign: 'middle' }} />{secondaryLabel}</span> : null}{comparison ? <span><i style={{ display: 'inline-block', width: 14, height: 1, marginRight: 6, borderTop: '1px dashed #6f6a63', verticalAlign: 'middle' }} />Previous period</span> : null}</div>
      {table ? <ChartDataTable model={table} open={tableOpen} onOpenChange={setTableOpen} summaryRef={tableSummaryRef} /> : null}
    </div>
  );
}
