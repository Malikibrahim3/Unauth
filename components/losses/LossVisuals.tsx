import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ChartFrame,
  ChartLegend,
  ChartState,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';
import {
  FinancialWaterfallChart,
  type FinancialWaterfallStep,
} from '@/components/charts/authenticated/financial/WaterfallChart';

export type LossTrendCause = {
  key: string;
  label: string;
  valueMinor: number;
  href: string;
};

export type LossTrendPoint = {
  key: string;
  label: string;
  axisLabel: string;
  totalMinor: number;
  causes: LossTrendCause[];
};

// §14.7 — the cause ramp: monochrome, off the parent (realised-loss) outcome, rank by lightness.
const SEGMENT_CLASSES = [
  'bg-[var(--uo-route-cause-1)]',
  'bg-[var(--uo-route-cause-2)]',
  'bg-[var(--uo-route-cause-3)]',
  'bg-[var(--uo-route-cause-4)]',
  'bg-[var(--uo-route-cause-5)]',
  'bg-[var(--uo-route-cause-other)]',
] as const;

// §14.7/§18.3 — a cause breakdown ramps off the parent (realised-loss) outcome, monochrome by rank.
const LEGEND_TONES = ['cause-1', 'cause-2', 'cause-3', 'cause-4', 'cause-5', 'cause-other'] as const;

function compactCauseSet(data: LossTrendPoint[], otherHref: string): { causes: LossTrendCause[]; points: LossTrendPoint[] } {
  const totals = new Map<string, LossTrendCause>();
  for (const point of data) {
    for (const cause of point.causes) {
      const current = totals.get(cause.key);
      totals.set(cause.key, {
        ...cause,
        valueMinor: (current?.valueMinor ?? 0) + cause.valueMinor,
      });
    }
  }

  const ranked = [...totals.values()].sort((left, right) => right.valueMinor - left.valueMinor);
  const visible = ranked.slice(0, 5);
  const visibleKeys = new Set(visible.map((cause) => cause.key));
  const hasOther = ranked.length > visible.length;
  const causes = hasOther
    ? [...visible, { key: '__other', label: 'Other', valueMinor: ranked.slice(5).reduce((sum, cause) => sum + cause.valueMinor, 0), href: otherHref }]
    : visible;

  const points = data.map((point) => {
    const pointByKey = new Map(point.causes.map((cause) => [cause.key, cause]));
    const top = visible.map((cause) => pointByKey.get(cause.key) ?? { ...cause, valueMinor: 0 });
    if (!hasOther) return { ...point, causes: top };
    const otherMinor = point.causes
      .filter((cause) => !visibleKeys.has(cause.key))
      .reduce((sum, cause) => sum + cause.valueMinor, 0);
    return {
      ...point,
      causes: [...top, {
        key: '__other',
        label: 'Other',
        valueMinor: otherMinor,
        href: otherHref,
      }],
    };
  });

  return { causes, points };
}

function trendTable(currency: string | null, causes: LossTrendCause[], points: LossTrendPoint[]): ChartDataTableModel {
  return {
    caption: `Confirmed loss by immutable effective date${currency ? ` (${currency})` : ''}`,
    columns: [
      { key: 'period', header: 'Period' },
      { key: 'total', header: 'Total loss', numeric: true },
      ...causes.map((cause) => ({ key: cause.key, header: cause.label, numeric: true })),
    ],
    rows: points.map((point) => ({
      key: point.key,
      header: point.label,
      values: [
        formatMinorCurrencyNullable(point.totalMinor, currency),
        ...causes.map((cause) => formatMinorCurrencyNullable(
          point.causes.find((item) => item.key === cause.key)?.valueMinor ?? 0,
          currency,
        )),
      ],
    })),
  };
}

/**
 * Losses hero visual. The server supplies immutable `effective_at` buckets;
 * this component only renders the supplied values and never interpolates a
 * missing period. Segment links apply the same cause filter as the ledger.
 */
export function LossTrendChart({
  data,
  currency,
  recordsHref = '/financials/losses',
  mixedCurrencyCount = 0,
  selectedCauseKey = null,
  otherRecordsHref = '/financials/losses?search=__other',
}: {
  data: LossTrendPoint[];
  currency: string | null;
  recordsHref?: string;
  mixedCurrencyCount?: number;
  selectedCauseKey?: string | null;
  otherRecordsHref?: string;
}) {
  const compacted = compactCauseSet(data, otherRecordsHref);
  const maximum = Math.max(0, ...compacted.points.map((point) => point.totalMinor));
  const scaleMaximum = maximum > 0 ? maximum : 1;
  const hasTrendHistory = compacted.points.length >= 3;
  const state = mixedCurrencyCount > 0
    ? <ChartState
        kind="mixed-currency"
        title="Loss history is split by currency"
        description={`${mixedCurrencyCount} incompatible record${mixedCurrencyCount === 1 ? '' : 's'} excluded. Select one currency before comparing loss history.`}
      />
    : !data.length
      ? <ChartState
          kind="empty"
          title="No dated confirmed losses"
          description="The immutable financial ledger has no confirmed loss entries with an effective date in this scope."
        />
      : null;

  return (
    <ChartFrame
      id="loss-trend"
      kind="loss-trend"
      question="When and why are confirmed losses accumulating?"
      summary={hasTrendHistory
        ? 'Confirmed loss amount grouped by immutable financial effective date'
        : `${compacted.points.length} exact dated ${compacted.points.length === 1 ? 'observation' : 'observations'}; direction is withheld until a third date is recorded`}
      scope={currency ? `${currency} · dates use the ledger effective timestamp` : 'Currency unavailable'}
      legend={compacted.causes.length ? (
        <ChartLegend items={compacted.causes.map((cause, index) => ({
          label: cause.label,
          tone: LEGEND_TONES[index] ?? 'cause-other',
        }))} />
      ) : undefined}
      freshness="Source: append-only financial entries · no mutable updated_at dates"
      records={{ href: recordsHref, label: 'View loss records' }}
      table={compacted.points.length ? trendTable(currency, compacted.causes, compacted.points) : undefined}
    >
      {state ?? (
        <div className="ua-loss-history" data-history={hasTrendHistory ? 'trend-ready' : 'observed-only'}>
          {!hasTrendHistory ? (
            <p className="ua-observed-history-note" role="status">
              Showing recorded dates only. No direction, rate, or missing interval has been inferred.
            </p>
          ) : null}
          <div className="ua-loss-history__plot">
            <div className="ua-loss-history__scale" aria-hidden="true">
              <span>{formatMinorCurrencyNullable(maximum, currency)}</span>
              <span>{formatMinorCurrencyNullable(0, currency)}</span>
            </div>
            <div
              className="ua-loss-history__columns"
              style={{ '--uo-route-loss-points': compacted.points.length } as CSSProperties}
              aria-label={hasTrendHistory ? 'Confirmed loss trend' : 'Confirmed loss on recorded dates'}
            >
              {compacted.points.map((point) => (
                <div key={point.key} className="ua-loss-history__column">
                  {!hasTrendHistory ? <strong>{formatMinorCurrencyNullable(point.totalMinor, currency)}</strong> : null}
                  <div className="ua-loss-history__bar-wrap">
                    <div
                      className="ua-loss-history__bar"
                      style={{ height: `${Math.max(0, (point.totalMinor / scaleMaximum) * 100)}%` }}
                    >
                      {point.causes.map((cause, index) => {
                        const height = point.totalMinor > 0 ? (cause.valueMinor / point.totalMinor) * 100 : 0;
                        if (height <= 0) return null;
                        return (
                          <Link
                            key={cause.key}
                            href={cause.href}
                            data-loss-segment={cause.key}
                            data-selected={selectedCauseKey === cause.key ? 'true' : undefined}
                            aria-label={`${point.label}: ${cause.label}, ${formatMinorCurrencyNullable(cause.valueMinor, currency)}`}
                            title={`${cause.label}: ${formatMinorCurrencyNullable(cause.valueMinor, currency)}`}
                            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--uo-route-border-focus)]"
                            style={{ height: `${height}%` }}
                          >
                            <span className={`block h-full w-full ${SEGMENT_CLASSES[index] ?? SEGMENT_CLASSES.at(-1)}`} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <span title={point.label}>{point.axisLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChartFrame>
  );
}

export type LossWaterfallStep = FinancialWaterfallStep;

/**
 * Detail-page financial visual. A formula is rendered only when its source
 * stages are known and the route has already reconciled them; otherwise the
 * chart is explicitly unavailable instead of implying a derived amount.
 */
export function LossWaterfall({
  currency,
  steps,
  reconciled,
  unavailableReason,
}: {
  currency: string | null;
  steps: LossWaterfallStep[];
  reconciled: boolean;
  unavailableReason?: string;
}) {
  return (
    <FinancialWaterfallChart
      id="loss-waterfall"
      question="What remains unrecovered from this loss?"
      summary="The displayed stages are the reconciled financial formula for this record"
      currency={currency}
      steps={steps}
      reconciled={reconciled}
      unavailableReason={unavailableReason ?? 'The required financial stages do not reconcile for this record. No amount has been inferred.'}
    />
  );
}
