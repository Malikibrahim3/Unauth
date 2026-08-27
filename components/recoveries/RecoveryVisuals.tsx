'use client';

import Link from 'next/link';
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
import {
  BAR_CATEGORY_GAP,
  BAR_END_RADIUS,
  TREND_LINE_WIDTH,
  Y_LABEL_GUTTER,
  Y_LABEL_TICK_MARGIN,
} from '@/components/charts/authenticated/core/geometry';
import {
  StageDotPlot,
  type StageDotPlotRow,
} from '@/components/charts/authenticated/operational/StageDotPlot';
import type { RecoveryCommandModel } from '@/lib/financial/commandCentre';
import { formatMinorCurrencyNullable, formatPercent } from '@/lib/utils/format';

function money(value: number, currency: string) {
  return formatMinorCurrencyNullable(Math.round(value), currency);
}

function recoveryHref(input: {
  currency: string;
  stage?: string;
  period?: string;
}) {
  const params = new URLSearchParams({ currency: input.currency });
  if (input.stage && input.stage !== 'all') params.set('stage', input.stage);
  if (input.period) params.set('period', input.period);
  return `/financials/recovery?${params.toString()}`;
}

function RecoveryIntervalPlot({
  model,
  showTrajectory,
}: {
  model: RecoveryCommandModel;
  showTrajectory: boolean;
}) {
  const theme = useChartTheme();
  const { containerRef, width } = useChartWidth();
  return (
    <div ref={containerRef} style={{ width: '100%', height: 300, overflow: 'hidden' }}>
      <ComposedChart
        width={width}
        height={300}
        data={model.intervals}
        margin={{ top: 8, right: 18, bottom: 2, left: 0 }}
        barCategoryGap={BAR_CATEGORY_GAP}
        accessibilityLayer
      >
        <CartesianGrid stroke={theme['--uo-route-chart-grid']} strokeOpacity={0.78} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} tick={{ fontSize: 12, fill: theme['--uo-route-text-tertiary'], fontFamily: 'var(--uo-route-font-sans)' }} />
        <YAxis axisLine={false} tickLine={false} width={Y_LABEL_GUTTER} tickMargin={Y_LABEL_TICK_MARGIN} tickCount={4} tick={{ fontSize: 12, fill: theme['--uo-route-text-tertiary'], fontFamily: 'var(--uo-route-font-sans)' }} tickFormatter={(value) => money(value, model.currency)} />
        <Tooltip
          cursor={<ChartCursor />}
          isAnimationActive={false}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as RecoveryCommandModel['intervals'][number];
            return (
              <ChartTooltip
                value={money(point.receivedMinor, model.currency)}
                caption={String(label)}
                series={[
                  { label: 'New recoverable', value: money(point.newRecoverableMinor, model.currency), colour: theme['--uo-route-chart-neutral-500'] },
                  { label: 'End-of-week outstanding', value: money(point.outstandingMinor, model.currency), colour: theme['--uo-route-chart-neutral-700'] },
                  ...(point.writtenOffMinor ? [{ label: 'Written off', value: money(point.writtenOffMinor, model.currency), colour: theme['--uo-route-warning'] }] : []),
                  { label: 'Supporting recoveries', value: String(point.supportingCount), colour: theme['--uo-route-data-petrol'] },
                ]}
              />
            );
          }}
        />
        <Bar isAnimationActive={false} dataKey="newRecoverableMinor" name="New recoverable" fill={theme['--uo-route-chart-neutral-500']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={24} />
        <Bar isAnimationActive={false} dataKey="receivedMinor" name="Received cash / credit" fill={theme['--uo-route-data-petrol']} radius={[BAR_END_RADIUS, BAR_END_RADIUS, 0, 0]} barSize={24} />
        {showTrajectory ? <Line isAnimationActive={false} type="stepAfter" dataKey="outstandingMinor" name="Outstanding" stroke={theme['--uo-route-chart-neutral-700']} strokeWidth={TREND_LINE_WIDTH} dot={false} activeDot={{ r: 4, fill: theme['--uo-route-chart-neutral-700'], stroke: theme['--uo-route-surface-primary'], strokeWidth: 2 }} connectNulls={false} /> : null}
      </ComposedChart>
    </div>
  );
}

function intervalTable(model: RecoveryCommandModel): ChartDataTableModel {
  return {
    caption: `Weekly recovery movement (${model.currency})`,
    columns: [
      { key: 'period', header: 'Period' },
      { key: 'new', header: 'New recoverable', numeric: true },
      { key: 'received', header: 'Received', numeric: true },
      { key: 'writtenOff', header: 'Written off', numeric: true },
      { key: 'outstanding', header: 'Outstanding', numeric: true },
      { key: 'records', header: 'Records', numeric: true },
    ],
    rows: model.intervals.map((point) => ({
      key: point.key,
      header: <Link href={recoveryHref({ currency: model.currency, period: point.key })}>{point.label}</Link>,
      values: [
        money(point.newRecoverableMinor, model.currency),
        money(point.receivedMinor, model.currency),
        money(point.writtenOffMinor, model.currency),
        money(point.outstandingMinor, model.currency),
        point.supportingCount,
      ],
    })),
  };
}

export function RecoveryCommandCentre({ model }: { model: RecoveryCommandModel }) {
  const stageRows: StageDotPlotRow[] = model.stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    value: stage.valueMinor,
    displayValue: money(stage.valueMinor, model.currency),
    detail: `${stage.supportingCount} ${stage.supportingCount === 1 ? 'record' : 'records'}`,
    tone: stage.key === 'recovered' ? 'secondary' : stage.key === 'outstanding' ? 'neutral' : 'primary',
    href: recoveryHref({ currency: model.currency, stage: stage.boardStage }),
  }));
  const stageTable: ChartDataTableModel = {
    caption: `Current recovery stage balances (${model.currency})`,
    columns: [
      { key: 'stage', header: 'Stage' },
      { key: 'value', header: 'Value', numeric: true },
      { key: 'records', header: 'Records', numeric: true },
    ],
    rows: model.stages.map((stage) => ({
      key: stage.key,
      header: <Link href={recoveryHref({ currency: model.currency, stage: stage.boardStage })}>{stage.label}</Link>,
      values: [money(stage.valueMinor, model.currency), stage.supportingCount],
    })),
  };
  const hasIntervalHistory = model.intervals.length >= 3;
  const hasObservedIntervals = model.intervals.length > 0;
  const conversionLabel = model.conversionRate == null
    ? 'Unavailable'
    : formatPercent(model.conversionRate, 0);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-5">
        <ChartFrame
          id="recovery-stage-balance"
          kind="stage-dot"
          question="Where does recoverable value stall?"
          summary="Independent current balances on one money scale; this is not a funnel."
          scope={`${model.currency} · current recovery records`}
          freshness="Source: recovery amounts and recorded external outcomes"
          records={{ href: recoveryHref({ currency: model.currency }), label: 'Open recovery board' }}
          table={stageTable}
        >
          {model.stages.some((stage) => stage.supportingCount > 0) ? (
            <StageDotPlot rows={stageRows} />
          ) : (
            <ChartState kind="empty" title="No recovery stages in this currency" description="The recovery board has no source-backed amount for this currency." />
          )}
        </ChartFrame>
      </div>
      <div className="min-w-0 xl:col-span-7">
        <ChartFrame
          id="recovery-interval-movement"
          kind="interval-recovery"
          question="Is new recoverable value becoming received cash?"
          summary={hasIntervalHistory
            ? 'Weekly additions and received cash share one money axis; conversion is kept as a separate KPI.'
            : `${model.intervals.length} exact weekly ${model.intervals.length === 1 ? 'interval' : 'intervals'}; direction is withheld until a third interval is recorded.`}
          scope={`${model.currency} · financial-entry effective dates`}
          control={<div className="ua-chart-kpi"><strong>{conversionLabel}</strong><span>received ÷ eligible</span></div>}
          legend={<ChartLegend items={[
            { label: 'New recoverable', tone: 'analytical-actual' },
            { label: 'Received cash / credit', tone: 'outcome-recovered' },
            ...(hasIntervalHistory ? [{ label: 'Outstanding balance', tone: 'analytical-comparison' as const, pattern: 'dashed' as const }] : []),
          ]} />}
          freshness="Source: append-only recoverable, recovered and written-off entries"
          records={{ href: recoveryHref({ currency: model.currency }), label: 'View recovery records' }}
          table={model.intervals.length ? intervalTable(model) : undefined}
        >
          {hasObservedIntervals ? (
            <div data-history={hasIntervalHistory ? 'trend-ready' : 'observed-only'}>
              {!hasIntervalHistory ? (
                <p className="ua-observed-history-note" role="status">
                  Showing recorded weeks only. No trajectory or missing week has been inferred.
                </p>
              ) : null}
              <RecoveryIntervalPlot model={model} showTrajectory={hasIntervalHistory} />
            </div>
          ) : (
            <ChartState
              kind="empty"
              title="No dated recovery movement"
              description="Current stage balances remain available beside this view; no immutable financial-entry interval exists to plot."
            />
          )}
        </ChartFrame>
      </div>
    </div>
  );
}

export type RecoveryProgressStep = {
  key: string;
  label: string;
  valueMinor: number;
  detail: string;
};

/** Recovery detail amount stages. Status chronology remains in AuditTimeline. */
export function RecoveryProgress({ currency, steps }: { currency: string; steps: RecoveryProgressStep[] }) {
  const rows: StageDotPlotRow[] = steps.map((step, index) => ({
    key: step.key,
    label: step.label,
    value: step.valueMinor,
    displayValue: money(step.valueMinor, currency),
    detail: step.detail,
    tone: step.key === 'recovered' ? 'secondary' : index === steps.length - 1 ? 'primary' : 'neutral',
  }));
  return (
    <ChartFrame
      id="recovery-progress"
      kind="stage-dot"
      question="How far has this recovery progressed?"
      summary="Recorded financial stages share one scale. Approval remains separate from value received."
      scope={`${currency} · current record`}
      table={{
        caption: `Recovery amount stages (${currency})`,
        columns: [{ key: 'stage', header: 'Stage' }, { key: 'value', header: 'Value', numeric: true }, { key: 'meaning', header: 'Meaning' }],
        rows: steps.map((step) => ({ key: step.key, header: step.label, values: [money(step.valueMinor, currency), step.detail] })),
      }}
    >
      <StageDotPlot rows={rows} />
    </ChartFrame>
  );
}
