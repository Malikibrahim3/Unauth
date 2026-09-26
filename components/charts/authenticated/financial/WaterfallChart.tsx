import { ChartFrame, ChartState, type ChartDataTableModel } from '../ChartFrame';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

export type FinancialWaterfallStep = {
  key: string;
  label: string;
  valueMinor: number | null;
  direction: 'total' | 'subtract';
  /** §14.4 — when a step maps to one of the five canonical outcomes, colour it by that outcome. Falls back to the generic direction colouring when omitted. */
  outcome?: 'prevented' | 'recovered' | 'realised' | 'open' | 'identified';
  href?: string;
};

const OUTCOME_VAR: Record<NonNullable<FinancialWaterfallStep['outcome']>, string> = {
  prevented: '#247388',
  recovered: '#1a6b43',
  realised: '#b0431a',
  open: '#7a5310',
  identified: '#40454a',
};

export function FinancialWaterfallChart({
  id,
  question,
  summary,
  currency,
  steps,
  reconciled,
  unavailableReason,
}: {
  id: string;
  question: string;
  summary: string;
  currency: string | null;
  steps: FinancialWaterfallStep[];
  reconciled: boolean;
  unavailableReason: string;
}) {
  const maximum = Math.max(0, ...steps.map((step) => step.valueMinor ?? 0));
  const scaleMaximum = maximum > 0 ? maximum : 1;
  const canRender = reconciled && steps.length > 0 && steps.every((step) => step.valueMinor != null);
  const table: ChartDataTableModel = {
    caption: `${question}${currency ? ` (${currency})` : ''}`,
    columns: [{ key: 'stage', header: 'Stage' }, { key: 'value', header: 'Value', numeric: true }],
    rows: steps.map((step) => ({
      key: step.key,
      header: step.label,
      headerHref: step.href,
      values: [step.valueMinor == null ? 'Unavailable' : `${step.direction === 'subtract' ? '−' : ''}${formatMinorCurrencyNullable(step.valueMinor, currency)}`],
    })),
  };

  return (
    <ChartFrame
      id={id}
      kind="financial-waterfall"
      question={question}
      summary={summary}
      scope={currency ? `${currency} · reconciled` : 'Currency unavailable'}
      freshness="Source: append-only financial entries and summary projection"
      table={steps.length ? table : undefined}
    >
      {canRender ? (
        <div aria-label={question}>
          {steps.map((step) => {
            const value = step.valueMinor ?? 0;
            const isVerifiedZero = step.valueMinor === 0;
            const body = (
              <>
                <span>{step.label}</span>
                <i aria-hidden="true" data-verified-zero={isVerifiedZero || undefined}>
                  <b
                    data-direction={step.direction}
                    style={{
                      width: `${Math.max(value > 0 ? 3 : 0, (value / scaleMaximum) * 100)}%`,
                      background: step.outcome ? OUTCOME_VAR[step.outcome] : undefined,
                    }}
                  />
                </i>
                <strong>
                  {step.direction === 'subtract' ? '−' : ''}{formatMinorCurrencyNullable(value, currency)}
                  {isVerifiedZero ? <span className="sr-only">, verified zero</span> : null}
                </strong>
              </>
            );
            return step.href ? <a key={step.key} href={step.href} className="border-t border-[#e4e3e0]">{body}</a> : <div key={step.key} className="border-t border-[#e4e3e0]">{body}</div>;
          })}
        </div>
      ) : (
        <ChartState kind="unavailable" title="Financial formula unavailable" description={unavailableReason} />
      )}
    </ChartFrame>
  );
}
