'use client';

import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { formatNumber } from '@/lib/utils/format';
import type { AuthChartTone } from '../types';
import { ChartTooltip } from '../core/ChartTooltip';
import { useChartMotion } from '../core/useChartMotion';
import { useChartTheme } from '../core/useChartTheme';
import { useChartWidth } from '../core/useChartWidth';
import chartStyles from '../AuthenticatedCharts.module.css';
import styles from './CompositionDonutChart.module.css';

export type CompositionDonutSegment = {
  key: string;
  label: string;
  value: number;
  tone: AuthChartTone;
};

const TONE_TOKEN: Record<AuthChartTone, string> = {
  primary: '--ua-chart-primary',
  secondary: '--ua-chart-primary-soft',
  neutral: '--ua-chart-neutral-700',
  positive: '--ua-success',
  attention: '--ua-warning',
  negative: '--ua-critical',
};

export function CompositionDonutChart({
  segments,
  totalLabel = 'cases',
}: {
  segments: CompositionDonutSegment[];
  totalLabel?: string;
}) {
  const data = segments.filter((segment) => Number.isFinite(segment.value) && segment.value > 0).slice(0, 5);
  const total = data.reduce((sum, segment) => sum + segment.value, 0);
  const theme = useChartTheme();
  const motion = useChartMotion(data.length);
  const { containerRef, width } = useChartWidth(240);

  if (total <= 0) return null;
  if (data.length === 1) {
    return (
      <div
        className={styles.single}
        role="group"
        aria-label={`${data[0].label}: ${formatNumber(data[0].value)}`}
      >
        <span>{data[0].label}</span>
        <strong>{formatNumber(data[0].value)}</strong>
        <small>All {totalLabel} are in this state.</small>
      </div>
    );
  }

  return (
    <div
      className={styles.layout}
      role="img"
      aria-label={data.map((segment) => `${segment.label}: ${formatNumber(segment.value)}`).join(', ')}
    >
      <div ref={containerRef} className={styles.plot}>
        <PieChart width={width} height={164}>
          <Tooltip
            isAnimationActive={motion.isAnimationActive}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as CompositionDonutSegment;
              return (
                <ChartTooltip
                  value={formatNumber(row.value)}
                  caption={`${row.label} · ${Math.round((row.value / total) * 100)}%`}
                />
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke={theme['--ua-surface-primary']}
            strokeWidth={2}
            {...motion}
          >
            {data.map((segment) => (
              <Cell key={segment.key} fill={theme[TONE_TOKEN[segment.tone] as keyof typeof theme]} />
            ))}
          </Pie>
        </PieChart>
        <div className={styles.centre}>
          <strong>{formatNumber(total)}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
      <ul className={styles.legend} aria-label="Workflow composition">
        {data.map((segment) => (
          <li key={segment.key}>
            <i className={chartStyles[segment.tone]} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong>{formatNumber(segment.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
