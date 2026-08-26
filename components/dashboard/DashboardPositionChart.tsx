'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type { ChartDataTableModel } from '@/components/charts/authenticated/ChartFrame';
import { ChartDataTable } from '@/components/charts/authenticated/ChartFrame';
import type { DashboardChartBucket } from './dashboardModel';
import styles from './dashboardPilot.module.css';

type DashboardPositionChartProps = {
  data: DashboardChartBucket[];
  secondary: Array<number | null> | null;
  comparison: boolean;
  metricLabel: string;
  secondaryLabel?: string;
  scope: string;
  basisLabel: string;
  idleDetail: string;
  formatValue: (value: number | null) => string;
  /** Axis ticks use compact notation (£500, £1.5k) — full precision belongs
   * to the hover readout, not the gutter. Defaults to `formatValue` for
   * backward compatibility. */
  formatAxisValue?: (value: number | null) => string;
  table?: ChartDataTableModel;
};

type Readout = {
  key: string;
  label: string;
  current: number | null;
  secondary: number | null;
  previous: number | null;
};

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function lineSegments(data: DashboardChartBucket[], ceiling: number): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  data.forEach((bucket, index) => {
    if (bucket.previousMinor == null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    const x = ((index + 0.5) / data.length) * 1000;
    const y = 100 - Math.min(100, (bucket.previousMinor / ceiling) * 100);
    current.push(`${x},${y}`);
  });
  if (current.length > 1) segments.push(current.join(' '));
  return segments;
}

export function DashboardPositionChart({
  data,
  secondary,
  comparison,
  metricLabel,
  secondaryLabel = 'Recovered',
  scope,
  basisLabel,
  idleDetail,
  formatValue,
  formatAxisValue = formatValue,
  table,
}: DashboardPositionChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);
  const [keyboardAnnouncement, setKeyboardAnnouncement] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const focusTableAfterOpen = useRef(false);
  const tableSummaryRef = useRef<HTMLElement | null>(null);
  const bucketRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const instructionsId = `dashboard-timeline-instructions-${metricLabel.toLowerCase().replaceAll(' ', '-')}`;
  const values = data.flatMap((bucket, index) => [
    bucket.currentMinor,
    bucket.previousMinor,
    secondary?.[index] ?? null,
  ]).filter((value): value is number => value != null);
  const ceiling = niceCeiling(Math.max(0, ...values));
  const peakIndex = data.reduce((best, bucket, index) => {
    const value = bucket.currentMinor;
    if (value == null || value <= 0) return best;
    const bestValue = best === -1 ? -1 : data[best]?.currentMinor ?? -1;
    return value > bestValue ? index : best;
  }, -1);
  const peak = peakIndex >= 0 ? data[peakIndex] : null;
  const segments = useMemo(() => lineSegments(data, ceiling), [ceiling, data]);
  const selectedKey = pinnedKey ?? activeKey;
  const readout: Readout | null = selectedKey == null
    ? null
    : (() => {
        const index = data.findIndex((bucket) => bucket.key === selectedKey);
        if (index < 0) return null;
        return {
          key: data[index].key,
          label: data[index].label,
          current: data[index].currentMinor,
          secondary: secondary?.[index] ?? null,
          previous: data[index].previousMinor,
        };
      })();

  useEffect(() => {
    setActiveKey(null);
    setPinnedKey(null);
    setRovingIndex(0);
    setKeyboardAnnouncement('');
  }, [data]);

  useEffect(() => {
    if (!tableOpen || !focusTableAfterOpen.current) return;
    focusTableAfterOpen.current = false;
    tableSummaryRef.current?.focus();
  }, [tableOpen]);

  function bucketDescription(index: number): string {
    const bucket = data[index];
    const secondaryValue = secondary?.[index] ?? null;
    return [
      bucket.label,
      `${metricLabel} ${formatValue(bucket.currentMinor)}`,
      secondaryValue != null ? `${secondaryLabel} ${formatValue(secondaryValue)}` : null,
      comparison && bucket.previousMinor != null
        ? `Previous period ${formatValue(bucket.previousMinor)}`
        : null,
    ].filter(Boolean).join(', ');
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft') nextIndex = Math.max(0, index - 1);
    if (event.key === 'ArrowRight') nextIndex = Math.min(data.length - 1, index + 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = data.length - 1;
    if (event.key === 'Escape') {
      event.preventDefault();
      setPinnedKey(null);
      setKeyboardAnnouncement('Pinned period cleared. Showing the selected-period summary.');
      return;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    setRovingIndex(nextIndex);
    bucketRefs.current[nextIndex]?.focus();
  }

  function togglePin(index: number) {
    const key = data[index].key;
    const willPin = pinnedKey !== key;
    setPinnedKey(willPin ? key : null);
    setKeyboardAnnouncement(
      `${willPin ? 'Pinned' : 'Unpinned'} ${bucketDescription(index)}`,
    );
  }

  function openTable() {
    focusTableAfterOpen.current = true;
    setTableOpen(true);
  }

  return (
    <div className={styles.positionTimeline}>
      <div className={styles.timelineReadout}>
        <div>
          <strong>{readout ? readout.label : `${scope} · ${basisLabel}`}</strong>
          <span>
            {readout
              ? `${metricLabel} ${formatValue(readout.current)}`
              : peak?.currentMinor != null && peak.currentMinor > 0
                ? `Peak ${formatValue(peak.currentMinor)} · ${peak.label}`
                : 'No known interval peak in this period'}
          </span>
        </div>
        <div className={styles.timelineReadoutSeries}>
          {readout ? (
            <>
              {readout.secondary != null ? (
                <span data-tone="observed">{secondaryLabel} {formatValue(readout.secondary)}</span>
              ) : null}
              {comparison && readout.previous != null ? (
                <span data-tone="comparison">Previous {formatValue(readout.previous)}</span>
              ) : null}
            </>
          ) : (
            <span data-tone="comparison">{idleDetail}</span>
          )}
        </div>
        {table ? (
          <button type="button" className={styles.timelineDataAction} onClick={openTable}>
            View data
          </button>
        ) : null}
      </div>

      <p id={instructionsId} className="sr-only">
        Use Left and Right Arrow to inspect periods, Home and End to jump, Enter
        or Space to pin a period, and Escape to clear it.
      </p>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {keyboardAnnouncement}
      </span>

      <div
        className={styles.timelinePlot}
        style={{ '--uo-route-dashboard-bucket-count': data.length } as CSSProperties}
        role="group"
        data-testid="financial-plot"
        aria-label={`${metricLabel} timeline — ${scope}`}
        aria-describedby={instructionsId}
        onMouseLeave={() => setActiveKey(null)}
      >
        <div className={styles.timelineAxis} aria-hidden="true">
          <span>{formatAxisValue(ceiling)}</span>
          <span>{formatAxisValue(ceiling / 2)}</span>
          <span>{formatAxisValue(0)}</span>
        </div>
        <div className={styles.timelineGrid} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        {comparison && segments.length > 0 ? (
          <svg
            className={styles.comparisonLine}
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {segments.map((points) => (
              <polyline key={points} points={points} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        ) : null}

        <div className={styles.timelineBuckets}>
          {data.map((bucket, index) => {
            const currentPercent = bucket.currentMinor == null
              ? 0
              : Math.max(1.5, (bucket.currentMinor / ceiling) * 100);
            const secondaryValue = secondary?.[index] ?? null;
            const secondaryPercent = secondaryValue == null
              ? 0
              : Math.max(1.5, (secondaryValue / ceiling) * 100);
            const showLabel = index === 0
              || index === data.length - 1
              || index % Math.max(1, Math.ceil(data.length / 5)) === 0;
            const isSelected = selectedKey === bucket.key;
            const style = {
              '--uo-route-dashboard-timeline-current-scale': currentPercent / 100,
              '--uo-route-dashboard-timeline-secondary-scale': secondaryPercent / 100,
            } as CSSProperties;

            return (
              <button
                key={bucket.key}
                ref={(node) => { bucketRefs.current[index] = node; }}
                type="button"
                className={styles.timelineBucket}
                style={style}
                tabIndex={index === rovingIndex ? 0 : -1}
                aria-label={bucketDescription(index)}
                aria-pressed={pinnedKey === bucket.key}
                data-selected={isSelected ? 'true' : undefined}
                onMouseEnter={() => setActiveKey(bucket.key)}
                onFocus={() => {
                  setRovingIndex(index);
                  setActiveKey(bucket.key);
                }}
                onBlur={() => setActiveKey(null)}
                onKeyDown={(event) => moveFocus(event, index)}
                onClick={() => togglePin(index)}
              >
                {index === peakIndex && bucket.currentMinor != null && bucket.currentMinor > 0 ? (
                  <span
                    className={styles.peakLabel}
                    data-edge={index === 0 ? 'start' : index === data.length - 1 ? 'end' : undefined}
                  >
                    {bucket.label} · {formatValue(bucket.currentMinor)}
                  </span>
                ) : null}
                <span className={styles.timelineBarSet} aria-hidden="true">
                  <i className={styles.timelinePrimaryBar} data-series="active" />
                  {secondaryValue != null ? <i className={styles.timelineSecondaryBar} data-series="observed" /> : null}
                </span>
                <span
                  className={styles.timelineBucketLabel}
                  data-visible={showLabel || isSelected ? 'true' : undefined}
                  data-near-end={index === data.length - 2 ? 'true' : undefined}
                  data-selected={isSelected ? 'true' : undefined}
                  aria-hidden="true"
                >
                  {bucket.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.timelineLegend} aria-label="Chart legend">
        <span><i data-tone="primary" />{metricLabel}</span>
        {secondary ? <span><i data-tone="observed" />{secondaryLabel}</span> : null}
        {comparison ? <span><i data-tone="comparison" />Previous period</span> : null}
      </div>

      {table ? (
        <ChartDataTable
          model={table}
          open={tableOpen}
          onOpenChange={setTableOpen}
          summaryRef={tableSummaryRef}
        />
      ) : null}
    </div>
  );
}
