import Link from "next/link";
import type {
  DashboardPeriodComparison,
  FinancialReportMetric,
  IntelligenceReport,
  MoneyBridge,
} from "@/lib/reporting/intelligence";
import {
  financialMetricCaseIds,
  financialMetricIsKnown,
  financialReportRecordsHref,
  REPORT_DEFINITIONS,
} from "@/lib/reporting/intelligence";
import { formatMinorCurrencyNullable, formatNumber } from "@/lib/utils/format";
import { financialStageDefinition, financialStageLabel } from "@/lib/ui/labels";
import { TIME_RANGE_LABELS } from "@/lib/ui/merchantCopy";
import { DashboardCharts } from "@/components/reporting/DashboardCharts";
import { RankedContributionChart } from "@/components/charts/authenticated/RankedContributionChart";
import { FinancialEquation } from "@/components/ui/FinancialEquation";
import { activeWorkflowOperations } from "@/components/dashboard/dashboardModel";

function money(minor: number, currency: string) {
  return formatMinorCurrencyNullable(minor, currency);
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
export function IntelligenceReportView({
  report,
  comparison = null,
  compact = false,
}: {
  report: IntelligenceReport;
  comparison?: DashboardPeriodComparison | null;
  compact?: boolean;
}) {
  const openOperations = activeWorkflowOperations(report.operations);
  const openOperationCount = openOperations.reduce((sum, row) => sum + row.count, 0);
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
          <div role="alert" className="mt-3 rounded-[var(--ua-radius-control)] border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-[var(--ua-warning)]">
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
                <div className="mt-3">
                  <FinancialEquation
                    className="ua-financial-equation--summary"
                    label={`${b.currency} financial decision ledger`}
                    items={HEADLINE_STEPS.map((step) => {
                      const known = financialMetricIsKnown(b, step.state);
                      return {
                        key: step.key,
                        label: step.label,
                        value: known ? money(b[step.key] as number, b.currency) : 'Unavailable',
                        detail: step.definition,
                        state: known ? 'known' as const : 'unavailable' as const,
                        href: financialReportRecordsHref({
                          range: report.range,
                          currency: b.currency,
                          metric: step.state,
                          timezone: report.timezone,
                        }),
                      };
                    })}
                    conclusion={`${financialMetricCaseIds(b, "exposed").length} cases carry recorded exposure in this scope.`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--ua-text-secondary)]">
            No financial history is available for cases in this period. Unavailable is not zero.
          </p>
        )}
      </section>
      <DashboardCharts report={report} comparison={comparison} />
      {report.bridges.length ? (
        <section className="border-t border-[var(--ua-border-subtle)] pt-5" aria-labelledby="financial-stages-title">
          <h2 id="financial-stages-title" className="text-base font-semibold">Financial stage detail</h2>
          <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">
            The full ledger remains available without competing with the decision view above.
          </p>
          <div className="mt-2">
            {report.bridges.map((bridge) => (
              <details key={bridge.currency} className="border-b border-[var(--ua-border-subtle)] py-2">
                <summary className="cursor-pointer py-2 text-[length:var(--ua-text-dense-size)] font-medium text-[var(--ua-text-secondary)]">
                  All {STEPS.length} financial stages for {bridge.currency}
                </summary>
                <dl className="mt-1 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
                  {SUPPORTING_STEPS.map((step, index) => (
                    <StageCell key={step.key} step={step} bridge={bridge} report={report} index={index} dense />
                  ))}
                </dl>
              </details>
            ))}
          </div>
        </section>
      ) : null}
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
          items={openOperations.slice(0, compact ? 4 : 8).map((row, index) => ({
            label: row.label,
            value: row.count,
            displayValue: `${formatNumber(row.count)} ${row.count === 1 ? 'case' : 'cases'}`,
            href: row.href,
            tone: index === 0 ? 'attention' : 'neutral',
          }))}
          annotation={
            openOperations.length
              ? {
                  value: formatNumber(openOperationCount),
                  label: ' open',
                }
              : undefined
          }
        />
      </section>
      {!compact && report.recoveries.length ? (
        <section className="border-t border-[var(--ua-border-subtle)] pt-5">
          {report.bridges.map((bridge) => {
            const recoveries = report.recoveries.filter(
              (row) => row.currency === bridge.currency && row.amountMinor > 0,
            );
            return recoveries.length ? (
              <RankedContributionChart
                key={bridge.currency}
                id={`recovery-performance-${bridge.currency}`}
                title="Where is recovered value coming from?"
                description={`Reconciled recovered value by recovery state · ${bridge.currency}`}
                items={recoveries.slice(0, 12).map((row) => ({
                  label: row.label,
                  value: row.amountMinor,
                  displayValue: money(row.amountMinor, row.currency),
                  detail: `${formatNumber(row.count)} ${row.count === 1 ? "record" : "records"}`,
                  href: row.href,
                  tone: "positive",
                }))}
              />
            ) : null;
          })}
        </section>
      ) : null}
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
