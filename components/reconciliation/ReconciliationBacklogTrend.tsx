'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartFrame,
  ChartLegend,
  ChartState,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { ChartCursor } from '@/components/charts/authenticated/core/ChartCursor';
import { ChartTooltip } from '@/components/charts/authenticated/core/ChartTooltip';
import { useChartTheme } from '@/components/charts/authenticated/core/useChartTheme';
import { useChartWidth } from '@/components/charts/authenticated/core/useChartWidth';
import { BAR_CATEGORY_GAP, BAR_END_RADIUS, TREND_LINE_WIDTH } from '@/components/charts/authenticated/core/geometry';
import type { ReconciliationBacklogPoint } from '@/lib/financial/commandCentre';
import { formatNumber } from '@/lib/utils/format';

function BacklogPlot({
  points,
  showTrajectory,
}: {
  points: ReconciliationBacklogPoint[];
  showTrajectory: boolean;
}) {
  const theme = useChartTheme();
  const { containerRef, width } = useChartWidth();
  return (
    <div ref={containerRef} style={{ width: '100%', height: 124, overflow: 'hidden' }}>
      <ComposedChart width={width} height={124} data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} barCategoryGap={BAR_CATEGORY_GAP} accessibilityLayer>
        <CartesianGrid stroke={theme['--uo-route-chart-grid']} strokeOpacity={0.78} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={20} tick={{ fontSize: 11, fill: theme['--uo-route-text-tertiary'], fontFamily: 'var(--uo-route-font-sans)' }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={42} tick={{ fontSize: 11, fill: theme['--uo-route-text-tertiary'], fontFamily: 'var(--uo-route-font-sans)' }} />
        <Tooltip
          cursor={<ChartCursor />}
          isAnimationActive={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as ReconciliationBacklogPoint;
            return <ChartTooltip value={`${formatNumber(point.backlog)} unresolved`} caption={String(label)} series={[
              { label: 'Opened', value: formatNumber(point.opened), colour: theme['--uo-route-chart-primary'] },
              { label: 'Settled', value: formatNumber(point.settled), colour: theme['--uo-route-chart-neutral-500'] },
            ]} />;
          }}
        />
        <Bar isAnimationActive={false} dataKey="opened" name="Opened" fill={theme['--uo-route-chart-primary']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={18} />
        <Bar isAnimationActive={false} dataKey="settled" name="Settled" fill={theme['--uo-route-chart-neutral-500']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={18} />
        {showTrajectory ? <Line isAnimationActive={false} type="stepAfter" dataKey="backlog" name="Unresolved backlog" stroke={theme['--uo-route-chart-neutral-700']} strokeWidth={TREND_LINE_WIDTH} dot={false} activeDot={{ r: 4, fill: theme['--uo-route-chart-neutral-700'], stroke: theme['--uo-route-surface-primary'], strokeWidth: 2 }} /> : null}
      </ComposedChart>
    </div>
  );
}

export function ReconciliationBacklogTrend({
  points,
  completeHistory,
}: {
  points: ReconciliationBacklogPoint[];
  completeHistory: boolean;
}) {
  const hasTrendHistory = points.length >= 3;
  const table: ChartDataTableModel = {
    caption: 'Reconciliation exceptions opened, settled and unresolved by week',
    columns: [
      { key: 'week', header: 'Week' },
      { key: 'opened', header: 'Opened', numeric: true },
      { key: 'settled', header: 'Settled', numeric: true },
      { key: 'backlog', header: 'Unresolved', numeric: true },
    ],
    rows: points.map((point) => ({
      key: point.key,
      header: point.label,
      values: [formatNumber(point.opened), formatNumber(point.settled), formatNumber(point.backlog)],
    })),
  };
  return (
    <ChartFrame
      id="reconciliation-backlog"
      kind="throughput-backlog"
      question="Is unresolved reconciliation work growing?"
      summary={hasTrendHistory
        ? 'Opened and settled exceptions with the end-of-week unresolved balance.'
        : `${points.length} exact weekly ${points.length === 1 ? 'interval' : 'intervals'}; backlog direction is withheld until a third interval is recorded.`}
      scope="Weekly · current workspace"
      legend={<ChartLegend items={[
        { label: 'Opened', tone: 'analytical-actual' },
        { label: 'Settled', tone: 'analytical-secondary' },
        ...(hasTrendHistory ? [{ label: 'Unresolved backlog', tone: 'analytical-comparison' as const, pattern: 'dashed' as const }] : []),
      ]} />}
      freshness={completeHistory ? 'Source: complete exception lifecycle history' : 'History exceeds the safe query window; chart withheld'}
      records={{ href: '/financials/reconciliation', label: 'Open exception workbench' }}
      table={completeHistory && points.length ? table : undefined}
      compact
    >
      {!completeHistory ? (
        <ChartState kind="unavailable" title="Backlog history is too large to prove here" description="The exception workbench remains authoritative. Narrowing an incomplete history would misstate the backlog." />
      ) : points.length ? (
        <div data-history={hasTrendHistory ? 'trend-ready' : 'observed-only'}>
          {!hasTrendHistory ? <p className="ua-observed-history-note" role="status">Showing recorded weeks only. No backlog trajectory or missing week has been inferred.</p> : null}
          <BacklogPlot points={points} showTrajectory={hasTrendHistory} />
        </div>
      ) : (
        <ChartState kind="empty" title="No dated exception history" description="The exception workbench remains authoritative; no immutable lifecycle interval exists to plot." />
      )}
    </ChartFrame>
  );
}
