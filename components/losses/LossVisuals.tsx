import Link from 'next/link';
import {
  ChartFrame,
  ChartLegend,
  ChartState,
  type ChartDataTableModel,
} from '@/components/charts/authenticated/ChartFrame';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

export type LossTrendCause = {
  key: string;
  label: string;
  valueMinor: number;
  href: string;
};

export type LossTrendPoint = {
  key: string;
  label: string;
  totalMinor: number;
  causes: LossTrendCause[];
};

const SEGMENT_CLASSES = [
  'bg-[var(--ua-chart-primary)]',
  'bg-[var(--ua-chart-primary-soft)]',
  'bg-[var(--ua-chart-neutral-900)]',
  'bg-[var(--ua-chart-neutral-700)]',
  'bg-[var(--ua-chart-neutral-500)]',
  'bg-[var(--ua-chart-neutral-300)]',
] as const;

const LEGEND_TONES = ['primary', 'secondary', 'neutral', 'neutral', 'neutral', 'neutral'] as const;

function compactCauseSet(data: LossTrendPoint[]): { causes: LossTrendCause[]; points: LossTrendPoint[] } {
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
  const otherHref = '/losses?attribution=__other';
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
  recordsHref = '/losses',
  mixedCurrencyCount = 0,
}: {
  data: LossTrendPoint[];
  currency: string | null;
  recordsHref?: string;
  mixedCurrencyCount?: number;
}) {
  const compacted = compactCauseSet(data);
  const maximum = Math.max(0, ...compacted.points.map((point) => point.totalMinor));
  const scaleMaximum = maximum > 0 ? maximum : 1;
  const hasHistory = compacted.points.length >= 3;
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
      : !hasHistory
        ? <ChartState
            kind="insufficient-history"
            title="Not enough dated loss history"
            description="At least three immutable loss dates are needed for a trend. The ledger remains available below."
          />
        : null;

  return (
    <ChartFrame
      id="loss-trend"
      kind="loss-trend"
      question="When and why are confirmed losses accumulating?"
      summary="Confirmed loss amount grouped by immutable financial effective date"
      scope={currency ? `${currency} · dates use the ledger effective timestamp` : 'Currency unavailable'}
      legend={compacted.causes.length ? (
        <ChartLegend items={compacted.causes.map((cause, index) => ({
          label: cause.label,
          tone: LEGEND_TONES[index] ?? 'neutral',
        }))} />
      ) : undefined}
      freshness="Source: append-only financial entries · no mutable updated_at dates"
      records={{ href: recordsHref, label: 'View loss records' }}
      table={compacted.points.length ? trendTable(currency, compacted.causes, compacted.points) : undefined}
    >
      {state ?? (
        <div
          className="grid min-h-[300px] items-end gap-2 px-2 pb-2 pt-4"
          style={{ gridTemplateColumns: `repeat(${compacted.points.length}, minmax(0, 1fr))` }}
          aria-label="Confirmed loss trend"
        >
          {compacted.points.map((point) => (
            <div key={point.key} className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex h-[238px] w-full max-w-[64px] items-end justify-center">
                <div
                  className="flex w-full flex-col-reverse overflow-hidden rounded-t-[var(--ua-radius-xs)]"
                  style={{ height: `${Math.max(0, (point.totalMinor / scaleMaximum) * 100)}%` }}
                >
                  {point.causes.map((cause, index) => {
                    const height = point.totalMinor > 0 ? (cause.valueMinor / point.totalMinor) * 100 : 0;
                    if (height <= 0) return null;
                    const content = (
                      <span
                        className={`block min-h-[10px] w-full ${SEGMENT_CLASSES[index] ?? SEGMENT_CLASSES.at(-1)}`}
                        style={{ height: `${height}%` }}
                      />
                    );
                    return (
                      <Link
                        key={cause.key}
                        href={cause.href}
                        aria-label={`${point.label}: ${cause.label}, ${formatMinorCurrencyNullable(cause.valueMinor, currency)}`}
                        title={`${cause.label}: ${formatMinorCurrencyNullable(cause.valueMinor, currency)}`}
                        className="block min-h-[10px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ua-border-focus)]"
                        style={{ height: `${height}%` }}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <span className="max-w-full truncate text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]" title={point.label}>
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}

export type LossWaterfallStep = {
  key: string;
  label: string;
  valueMinor: number | null;
  direction: 'total' | 'subtract';
};

function waterfallTable(currency: string | null, steps: LossWaterfallStep[]): ChartDataTableModel {
  return {
    caption: `Loss formula${currency ? ` (${currency})` : ''}`,
    columns: [
      { key: 'stage', header: 'Stage' },
      { key: 'value', header: 'Value', numeric: true },
    ],
    rows: steps.map((step) => ({
      key: step.key,
      header: step.label,
      values: [
        step.valueMinor == null
          ? 'Unavailable'
          : `${step.direction === 'subtract' ? '−' : ''}${formatMinorCurrencyNullable(step.valueMinor, currency)}`,
      ],
    })),
  };
}

/**
 * Detail-page financial visual. A formula is rendered only when its source
 * stages are known and the route has already reconciled them; otherwise the
 * chart is explicitly unavailable instead of implying a derived amount.
 */
export function LossWaterfall({
  currency,
  steps,
  reconciled,
}: {
  currency: string | null;
  steps: LossWaterfallStep[];
  reconciled: boolean;
}) {
  const maximum = Math.max(0, ...steps.map((step) => step.valueMinor ?? 0));
  const scaleMaximum = maximum > 0 ? maximum : 1;
  const canRender = reconciled && steps.length > 0 && steps.every((step) => step.valueMinor != null);

  return (
    <ChartFrame
      id="loss-waterfall"
      kind="loss-waterfall"
      question="What remains unrecovered from this loss?"
      summary="The displayed stages are the reconciled financial formula for this record"
      scope={currency ? `${currency} · append-only ledger stages` : 'Currency unavailable'}
      freshness="Source: case financial entries and summary projection"
      table={steps.length ? waterfallTable(currency, steps) : undefined}
    >
      {canRender ? (
        <div className="grid gap-3 py-2" aria-label="Loss financial formula">
          {steps.map((step) => {
            const value = step.valueMinor ?? 0;
            return (
              <div key={step.key} className="grid grid-cols-[minmax(120px,0.9fr)_minmax(100px,1fr)_auto] items-center gap-3">
                <span className="ua-text-dense min-w-0 text-[var(--ua-text-secondary)]">{step.label}</span>
                <div className="h-3 overflow-hidden rounded-[var(--ua-radius-xs)] bg-[var(--ua-chart-track)]" aria-hidden="true">
                  <span
                    className={`block h-full rounded-[var(--ua-radius-xs)] ${step.direction === 'subtract' ? 'bg-[var(--ua-chart-neutral-700)]' : 'bg-[var(--ua-chart-primary)]'}`}
                    style={{ width: `${Math.max(value > 0 ? 3 : 0, (value / scaleMaximum) * 100)}%` }}
                  />
                </div>
                <strong className="ua-text-dense whitespace-nowrap text-right tabular-nums">
                  {step.direction === 'subtract' ? '−' : ''}{formatMinorCurrencyNullable(value, currency)}
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <ChartState
          kind="unavailable"
          title="Loss formula unavailable"
          description="The required financial stages do not reconcile for this record. No amount has been inferred."
        />
      )}
    </ChartFrame>
  );
}
