'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CumulativeFinancialPoint } from '@/components/reporting/reportChartModel';
import { ChartCursor } from '../core/ChartCursor';
import { ChartTooltip } from '../core/ChartTooltip';
import {
  COMPARISON_DASH,
  COMPARISON_LINE_WIDTH,
  TREND_HOVER_DOT_R,
  Y_LABEL_GUTTER,
  Y_LABEL_TICK_MARGIN,
} from '../core/geometry';
import { useChartMotion } from '../core/useChartMotion';
import { useChartTheme } from '../core/useChartTheme';
import { useChartWidth } from '../core/useChartWidth';

type CumulativeAreaLineChartProps = {
  data: CumulativeFinancialPoint[];
  valueFormatter: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  comparison?: boolean;
  height?: number;
};

/** Cumulative financial state: flat area, recovered line, optional prior-period line. */
export function CumulativeAreaLineChart({
  data,
  valueFormatter,
  tooltipFormatter = valueFormatter,
  comparison = false,
  height = 340,
}: CumulativeAreaLineChartProps) {
  const theme = useChartTheme();
  const motion = useChartMotion(data.length * (comparison ? 3 : 2));
  const { containerRef, width } = useChartWidth();

  return (
    <div ref={containerRef} style={{ width: '100%', height, overflow: 'hidden' }}>
      <ComposedChart
        width={width}
        height={height}
        data={data}
        margin={{ top: 12, right: 12, bottom: 2, left: 6 }}
        accessibilityLayer
      >
        <CartesianGrid stroke={theme['--ua-chart-grid']} strokeOpacity={0.78} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          minTickGap={28}
          tickMargin={8}
          tick={{
            fontSize: 13,
            fill: theme['--ua-text-tertiary'],
            fontFamily: 'var(--ua-font-sans)',
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={Y_LABEL_GUTTER}
          tickMargin={Y_LABEL_TICK_MARGIN}
          tickCount={4}
          domain={[0, 'auto']}
          tick={{
            fontSize: 13,
            fill: theme['--ua-text-tertiary'],
            fontFamily: 'var(--ua-font-sans)',
          }}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          cursor={<ChartCursor />}
          isAnimationActive={motion.isAnimationActive}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as CumulativeFinancialPoint;
            const series = [
              row.cumulativeRecoveredMinor != null
                ? {
                    label: 'Recovered to date',
                    value: tooltipFormatter(row.cumulativeRecoveredMinor),
                    colour: theme['--ua-success'],
                  }
                : null,
              row.exposureIncrementMinor != null
                ? {
                    label: 'Exposure added',
                    value: tooltipFormatter(row.exposureIncrementMinor),
                    colour: theme['--ua-chart-primary-soft'],
                  }
                : null,
              row.recoveredIncrementMinor != null
                ? {
                    label: 'Recovery added',
                    value: tooltipFormatter(row.recoveredIncrementMinor),
                    colour: theme['--ua-success'],
                  }
                : null,
              comparison && row.previousCumulativeExposureMinor != null
                ? {
                    label: 'Previous exposure to date',
                    value: tooltipFormatter(row.previousCumulativeExposureMinor),
                    colour: theme['--ua-chart-neutral-500'],
                  }
                : null,
            ].filter((item): item is { label: string; value: string; colour: string } => item != null);
            return (
              <ChartTooltip
                value={row.cumulativeExposureMinor == null
                  ? 'Unavailable'
                  : tooltipFormatter(row.cumulativeExposureMinor)}
                caption={`${String(label)} · Exposure to date`}
                series={series}
              />
            );
          }}
        />
        <Area
          type="stepAfter"
          dataKey="cumulativeExposureMinor"
          name="Cumulative exposure"
          stroke={theme['--ua-chart-primary']}
          strokeWidth={2}
          fill={theme['--ua-chart-primary']}
          fillOpacity={0.12}
          connectNulls={false}
          dot={false}
          activeDot={{
            r: TREND_HOVER_DOT_R,
            fill: theme['--ua-chart-primary'],
            stroke: theme['--ua-surface-primary'],
            strokeWidth: 2,
          }}
          {...motion}
        />
        <Line
          type="stepAfter"
          dataKey="cumulativeRecoveredMinor"
          name="Recovered to date"
          stroke={theme['--ua-success']}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls={false}
          dot={false}
          activeDot={{
            r: TREND_HOVER_DOT_R,
            fill: theme['--ua-success'],
            stroke: theme['--ua-surface-primary'],
            strokeWidth: 2,
          }}
          {...motion}
        />
        {comparison ? (
          <Line
            type="stepAfter"
            dataKey="previousCumulativeExposureMinor"
            name="Previous exposure to date"
            stroke={theme['--ua-chart-neutral-500']}
            strokeWidth={COMPARISON_LINE_WIDTH}
            strokeDasharray={COMPARISON_DASH.join(' ')}
            connectNulls={false}
            dot={false}
            activeDot={{
              r: TREND_HOVER_DOT_R,
              fill: theme['--ua-chart-neutral-500'],
              stroke: theme['--ua-surface-primary'],
              strokeWidth: 2,
            }}
            {...motion}
          />
        ) : null}
      </ComposedChart>
    </div>
  );
}
