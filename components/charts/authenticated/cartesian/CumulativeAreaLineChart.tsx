'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
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
  FORECAST_DASH,
  REFERENCE_DASH,
  REFERENCE_LINE_WIDTH,
  SELECTED_RING_WIDTH,
  TREND_HOVER_DOT_R,
  Y_LABEL_GUTTER,
  Y_LABEL_TICK_MARGIN,
} from '../core/geometry';
import { useChartMotion } from '../core/useChartMotion';
import { useChartTheme } from '../core/useChartTheme';

/** A modelled point, not observed — §18.4's dotted forecast series. */
type ForecastPoint = { label: string; value: number | null };

type CumulativeAreaLineChartProps = {
  data: CumulativeFinancialPoint[];
  valueFormatter: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  comparison?: boolean;
  height?: number;
  /** §18.4 — modelled continuation of the actual series; rendered dotted, never solid. */
  forecastData?: ForecastPoint[];
  /** §18.4 — a maximum, threshold or target; rendered as a labelled dashed rule. */
  referenceLine?: { value: number; label: string };
  /** The datum matching this label's actual point gets the selection ring. */
  selectedLabel?: string | null;
};

/** Cumulative financial state: flat area, recovered line, optional prior-period line. */
export function CumulativeAreaLineChart({
  data,
  valueFormatter,
  tooltipFormatter = valueFormatter,
  comparison = false,
  height = 340,
  forecastData,
  referenceLine,
  selectedLabel = null,
}: CumulativeAreaLineChartProps) {
  const theme = useChartTheme();
  const motion = useChartMotion(data.length * (comparison ? 3 : 2));

  const actualDot = selectedLabel == null
    ? false
    : (dotProps: { cx?: number; cy?: number; payload?: CumulativeFinancialPoint }) => {
        const { cx, cy, payload } = dotProps;
        if (cx == null || cy == null || payload?.label !== selectedLabel) {
          return <g key={`${cx}-${cy}`} />;
        }
        return (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={TREND_HOVER_DOT_R}
            fill={theme['--uo-route-analytical-actual']}
            stroke={theme['--uo-route-analytical-selected']}
            strokeWidth={SELECTED_RING_WIDTH}
          />
        );
      };

  return (
    <div style={{ width: '100%', height, minWidth: 0, overflow: 'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 2, left: 6 }}
          accessibilityLayer
        >
        <CartesianGrid stroke={theme['--uo-route-chart-grid']} strokeOpacity={0.78} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          minTickGap={28}
          tickMargin={8}
          tick={{
            fontSize: 13,
            fill: theme['--uo-route-text-tertiary'],
            fontFamily: 'var(--uo-route-font-sans)',
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
            fill: theme['--uo-route-text-tertiary'],
            fontFamily: 'var(--uo-route-font-sans)',
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
                    colour: theme['--uo-route-outcome-recovered'],
                  }
                : null,
              row.exposureIncrementMinor != null
                ? {
                    label: 'Exposure added',
                    value: tooltipFormatter(row.exposureIncrementMinor),
                    colour: theme['--uo-route-analytical-actual'],
                  }
                : null,
              row.recoveredIncrementMinor != null
                ? {
                    label: 'Recovery added',
                    value: tooltipFormatter(row.recoveredIncrementMinor),
                    colour: theme['--uo-route-outcome-recovered'],
                  }
                : null,
              comparison && row.previousCumulativeExposureMinor != null
                ? {
                    label: 'Previous exposure to date',
                    value: tooltipFormatter(row.previousCumulativeExposureMinor),
                    colour: theme['--uo-route-analytical-comparison'],
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
          stroke={theme['--uo-route-analytical-actual']}
          strokeWidth={2}
          fill={theme['--uo-route-analytical-actual']}
          fillOpacity={0.1}
          connectNulls={false}
          dot={actualDot}
          activeDot={{
            r: TREND_HOVER_DOT_R,
            fill: theme['--uo-route-analytical-actual'],
            stroke: theme['--uo-route-surface-primary'],
            strokeWidth: 2,
          }}
          {...motion}
        />
        {referenceLine ? (
          <ReferenceLine
            y={referenceLine.value}
            stroke={theme['--uo-route-analytical-reference']}
            strokeWidth={REFERENCE_LINE_WIDTH}
            strokeDasharray={REFERENCE_DASH.join(' ')}
            label={{
              value: referenceLine.label,
              position: 'right',
              fill: theme['--uo-route-text-tertiary'],
              fontSize: 11,
            }}
          />
        ) : null}
        {forecastData ? (
          <Line
            type="stepAfter"
            data={forecastData}
            dataKey="value"
            name="Forecast"
            stroke={theme['--uo-route-analytical-forecast']}
            strokeWidth={COMPARISON_LINE_WIDTH}
            strokeDasharray={FORECAST_DASH.join(' ')}
            connectNulls={false}
            dot={false}
            isAnimationActive={false}
          />
        ) : null}
        <Line
          type="stepAfter"
          dataKey="cumulativeRecoveredMinor"
          name="Recovered to date"
          stroke={theme['--uo-route-outcome-recovered']}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls={false}
          dot={false}
          activeDot={{
            r: TREND_HOVER_DOT_R,
            fill: theme['--uo-route-outcome-recovered'],
            stroke: theme['--uo-route-surface-primary'],
            strokeWidth: 2,
          }}
          {...motion}
        />
        {comparison ? (
          <Line
            type="stepAfter"
            dataKey="previousCumulativeExposureMinor"
            name="Previous exposure to date"
            stroke={theme['--uo-route-analytical-comparison']}
            strokeWidth={COMPARISON_LINE_WIDTH}
            strokeDasharray={COMPARISON_DASH.join(' ')}
            connectNulls={false}
            dot={false}
            activeDot={{
              r: TREND_HOVER_DOT_R,
              fill: theme['--uo-route-analytical-comparison'],
              stroke: theme['--uo-route-surface-primary'],
              strokeWidth: 2,
            }}
            {...motion}
          />
        ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
