import Link from "next/link";
import type {
  FinancialReportMetric,
  IntelligenceReport,
  MoneyBridge,
  RankedRow,
} from "@/lib/reporting/intelligence";
import {
  financialMetricCaseIds,
  financialMetricIsKnown,
  financialReportRecordsHref,
  REPORT_DEFINITIONS,
} from "@/lib/reporting/intelligence";
import { normaliseCurrencyOrNull } from "@/lib/canonical/money";
import { formatMinorCurrencyNullable, formatNumber } from "@/lib/utils/format";
import { financialStageDefinition, financialStageLabel } from "@/lib/ui/labels";
import { TIME_RANGE_LABELS } from "@/lib/ui/merchantCopy";
import { DashboardCharts } from "@/components/reporting/DashboardCharts";
import { RankedContributionChart } from "@/components/charts/authenticated/RankedContributionChart";

function money(minor: number, currency: string) {
  return formatMinorCurrencyNullable(minor, currency);
}

function currencyLabel(currency: string) {
  return normaliseCurrencyOrNull(currency) ?? "Currency unavailable";
}
const STEPS = [
  { key: "requestedMinor", state: "requested", label: financialStageLabel("requested"), definition: financialStageDefinition("requested") },
  { key: "exposedMinor", state: "exposed", label: financialStageLabel("maximum_exposure"), definition: financialStageDefinition("maximum_exposure") },
  { key: "approvedMinor", state: "approved", label: financialStageLabel("merchant_decision"), definition: financialStageDefinition("merchant_decision") },
  { key: "paidMinor", state: "paid", label: financialStageLabel("observed_payout"), definition: financialStageDefinition("observed_payout") },
  { key: "estimatedLossMinor", state: "estimated_loss", label: financialStageLabel("estimated_loss"), definition: financialStageDefinition("estimated_loss") },
  { key: "realisedLossMinor", state: "confirmed_loss", label: financialStageLabel("confirmed_loss"), definition: financialStageDefinition("confirmed_loss") },
  { key: "recoverableMinor", state: "recoverable", label: financialStageLabel("eligible_recovery"), definition: financialStageDefinition("eligible_recovery") },
  { key: "recoveredMinor", state: "recovered", label: financialStageLabel("recovered_cash"), definition: financialStageDefinition("recovered_cash") },
  { key: "preventedMinor", state: "prevented", label: financialStageLabel("prevented"), definition: financialStageDefinition("prevented") },
  { key: "writtenOffMinor", state: "written_off", label: financialStageLabel("written_off"), definition: financialStageDefinition("written_off") },
  { key: "outstandingMinor", state: "outstanding", label: financialStageLabel("outstanding_recovery"), definition: financialStageDefinition("outstanding_recovery") },
  { key: "finalNetLossMinor", state: "final_net_loss", label: financialStageLabel("final_net_loss"), definition: financialStageDefinition("final_net_loss") },
] satisfies Array<{ key: keyof MoneyBridge; state: FinancialReportMetric; label: string; definition: string }>;

/*
 * §5.3: seven or more metrics means "reduce to four headline metrics and move the
 * remainder into a supporting breakdown". Twelve equal-weight stage cells filled
 * three rows and pushed the primary chart below the fold, so the four totals a
 * merchant actually decides on lead, and the full ledger stays one disclosure
 * away — no value is removed, and every drill-down link is preserved.
 */
const HEADLINE_KEYS = new Set<keyof MoneyBridge>([
  'exposedMinor',
  'realisedLossMinor',
  'recoveredMinor',
  'finalNetLossMinor',
]);
const HEADLINE_STEPS = STEPS.filter((step) => HEADLINE_KEYS.has(step.key));
const SUPPORTING_STEPS = STEPS.filter((step) => !HEADLINE_KEYS.has(step.key));

function StageCell({
  step,
  bridge,
  report,
  index,
  dense,
}: {
  step: (typeof STEPS)[number];
  bridge: MoneyBridge;
  report: IntelligenceReport;
  index: number;
  dense?: boolean;
}) {
  const known = financialMetricIsKnown(bridge, step.state);
  return (
    <div
      className={`${dense ? 'py-3' : 'min-h-24 py-4'} sm:px-4 ${index > 0 ? "border-t border-[var(--ua-border-subtle)] sm:border-l sm:border-t-0" : ""}`}
    >
      <dt className="text-xs font-medium text-[var(--ua-text-secondary)]">
        <Link
          className="hover:text-[var(--ua-action-primary)]"
          href={financialReportRecordsHref({
            range: report.range,
            currency: bridge.currency,
            metric: step.state,
            timezone: report.timezone,
          })}
        >
          {step.label}
        </Link>
      </dt>
      <dd
        className={`mt-2 font-semibold tabular-nums ${dense ? 'text-base' : 'text-xl'}`}
        style={known && bridge[step.key] === 0 ? { color: "var(--ua-text-tertiary)" } : undefined}
      >
        {known ? money(bridge[step.key] as number, bridge.currency) : "Unavailable"}
      </dd>
      {dense ? null : (
        <dd className="mt-1 text-xs text-[var(--ua-text-secondary)]">{step.definition}</dd>
      )}
    </div>
  );
}
function RankedTable({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: RankedRow[];
  empty: string;
}) {
  return (
    <section className="border-t border-[var(--ua-border-subtle)] pt-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">{description}</p>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--ua-border-default)] text-left text-[var(--ua-text-secondary)]">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Records</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.key}:${r.currency}`}
                  className="border-b border-[var(--ua-border-subtle)]"
                >
                  <th scope="row" className="py-3 text-left font-medium">
                    <Link className="text-[var(--ua-text-primary)] hover:text-[var(--ua-action-primary)]" href={r.href}>{r.label}</Link>
                  </th>
                  <td className="py-3 text-right tabular-nums">{r.count}</td>
                  <td className="py-3 text-right tabular-nums">
                    {money(r.amountMinor, r.currency)}{" "}
                    <span className="text-xs text-[var(--ua-text-secondary)]">
                      {currencyLabel(r.currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--ua-text-secondary)]">{empty}</p>
      )}
    </section>
  );
}

export function IntelligenceReportView({
  report,
  compact = false,
}: {
  report: IntelligenceReport;
  compact?: boolean;
}) {
  return (
    <div className="space-y-7">
      <section aria-labelledby="bridge-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="bridge-title" className="text-lg font-semibold">
              Value this period
            </h2>
            <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">
              {TIME_RANGE_LABELS[report.range]}
            </p>
          </div>
        </div>
        {!report.reconciliation.ok ? (
          <div role="alert" className="mt-3 border border-[var(--ua-critical)] p-3">
            <p className="font-semibold">
              Ledger reconciliation needs attention
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {report.reconciliation.issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {report.bridges.length ? (
          <div className="mt-4 space-y-5">
            {report.bridges.map((b) => (
              <div key={b.currency}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{b.currency}</h3>
                  <Link
                    href={financialReportRecordsHref({
                      range: report.range,
                      currency: b.currency,
                      metric: "exposed",
                      timezone: report.timezone,
                    })}
                    className="text-sm font-medium text-[var(--ua-action-primary)]"
                  >
                    {financialMetricCaseIds(b, "exposed").length} cases with recorded exposure
                  </Link>
                </div>
                <dl className="mt-2 grid overflow-hidden border-y border-[var(--ua-border-default)] sm:grid-cols-2 lg:grid-cols-4">
                  {HEADLINE_STEPS.map((step, index) => (
                    <StageCell key={step.key} step={step} bridge={b} report={report} index={index} />
                  ))}
                </dl>
                <details className="mt-3 border-b border-[var(--ua-border-subtle)] pb-2">
                  <summary className="cursor-pointer py-2 text-[length:var(--ua-text-dense-size)] font-medium text-[var(--ua-text-secondary)]">
                    All {STEPS.length} financial stages for {b.currency}
                  </summary>
                  <dl className="mt-1 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
                    {SUPPORTING_STEPS.map((step, index) => (
                      <StageCell key={step.key} step={step} bridge={b} report={report} index={index} dense />
                    ))}
                  </dl>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--ua-text-secondary)]">
            No financial history is available for cases in this period. Unavailable is not zero.
          </p>
        )}
      </section>
      <DashboardCharts report={report} />
      {/*
        Open work by next step. This was a flat list of label + count rows, which
        made the reader compare numbers in their head; ranked bars make the shape
        of the backlog readable at a glance and still expose the exact counts and
        the per-status links through ChartPanel's accessible table.
      */}
      <section className="border-t border-[var(--ua-border-subtle)] pt-5">
        <RankedContributionChart
          id="operations-attention"
          title="Needs attention"
          description="Open cases by the next step they are waiting on."
          items={report.operations.slice(0, compact ? 4 : 8).map((row, index) => ({
            label: row.label,
            value: row.count,
            displayValue: `${formatNumber(row.count)} ${row.count === 1 ? 'case' : 'cases'}`,
            href: row.href,
            tone: index === 0 ? 'attention' : 'neutral',
          }))}
          annotation={
            report.operations.length
              ? {
                  value: formatNumber(report.operations.reduce((sum, row) => sum + row.count, 0)),
                  label: ' open',
                }
              : undefined
          }
        />
      </section>
      {!compact ? <RankedTable
        title="Loss causes"
        description="Realised loss grouped by canonical issue category. Categories describe recorded causes, not causal inference."
        rows={report.causes.slice(0, compact ? 5 : 20)}
        empty="No realised-loss cause records were found in this period."
      /> : null}
      {!compact ? <RankedTable
        title="Recovery performance"
        description="Reconciled recovered value grouped by recovery state."
        rows={report.recoveries.slice(0, compact ? 5 : 20)}
        empty="No recovery records were updated in this period."
      /> : null}
      {!compact ? (
        <section className="border-t border-[var(--ua-border-subtle)] pt-5">
          <h2 className="text-lg font-semibold">Report definitions</h2>
          <div className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
            {REPORT_DEFINITIONS.map((d) => (
              <details key={d.id} className="py-3">
                <summary className="cursor-pointer font-medium">
                  {d.name}
                </summary>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--ua-text-secondary)]">Definition</dt>
                    <dd>{d.definition}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ua-text-secondary)]">Numerator</dt>
                    <dd>{d.numerator}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ua-text-secondary)]">
                      Denominator
                    </dt>
                    <dd>{d.denominator}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ua-text-secondary)]">Time basis</dt>
                    <dd>{d.timeBasis}</dd>
                  </div>
                </dl>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
