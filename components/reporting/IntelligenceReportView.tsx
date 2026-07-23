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
import { formatDateTime, formatMinorCurrencyNullable } from "@/lib/utils/format";
import { DashboardCharts } from "@/components/reporting/DashboardCharts";

function money(minor: number, currency: string) {
  return formatMinorCurrencyNullable(minor, currency);
}

function currencyLabel(currency: string) {
  return normaliseCurrencyOrNull(currency) ?? "Currency unavailable";
}
const STEPS = [
  { key: "requestedMinor", state: "requested", label: "Requested", definition: "Reliable requested remedy value" },
  { key: "exposedMinor", state: "exposed", label: "Payout exposure", definition: "Current maximum exposure from explicit components" },
  { key: "approvedMinor", state: "approved", label: "Approved", definition: "Merchant-authorized value; not proof of payment" },
  { key: "paidMinor", state: "paid", label: "Paid", definition: "Source-backed value actually provided" },
  { key: "estimatedLossMinor", state: "estimated_loss", label: "Estimated loss", definition: "Provisional value with visible assumptions" },
  { key: "realisedLossMinor", state: "confirmed_loss", label: "Confirmed loss", definition: "Ledger-confirmed merchant loss" },
  { key: "recoverableMinor", state: "recoverable", label: "Recoverable", definition: "Confirmed loss eligible to pursue" },
  { key: "recoveredMinor", state: "recovered", label: "Recovered", definition: "Received and reconciled" },
  { key: "preventedMinor", state: "prevented", label: "Prevented", definition: "Unpaid through the observation window" },
  { key: "writtenOffMinor", state: "written_off", label: "Written off", definition: "Closed without recovery; remains net loss" },
  { key: "outstandingMinor", state: "outstanding", label: "Outstanding recovery", definition: "Per-case recoverable less recovered and write-off" },
  { key: "finalNetLossMinor", state: "final_net_loss", label: "Final net loss", definition: "Per-case confirmed loss less recovered" },
] satisfies Array<{ key: keyof MoneyBridge; state: FinancialReportMetric; label: string; definition: string }>;
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
    <section className="border-t border-[var(--border-muted)] pt-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Records</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.key}:${r.currency}`}
                  className="border-b border-[var(--border-muted)]"
                >
                  <th scope="row" className="py-3 text-left font-medium">
                    <Link className="text-[var(--text-primary)] hover:text-[var(--accent)]" href={r.href}>{r.label}</Link>
                  </th>
                  <td className="py-3 text-right tabular-nums">{r.count}</td>
                  <td className="py-3 text-right tabular-nums">
                    {money(r.amountMinor, r.currency)}{" "}
                    <span className="text-xs text-[var(--text-secondary)]">
                      {currencyLabel(r.currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{empty}</p>
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
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {report.range === "all" ? "All time" : `Last ${report.range}`}
            </p>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Generated {formatDateTime(report.generatedAt)}
          </p>
        </div>
        {!report.reconciliation.ok ? (
          <div role="alert" className="mt-3 border border-[var(--danger)] p-3">
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
                    })}
                    className="text-sm font-medium text-[var(--accent)]"
                  >
                    {financialMetricCaseIds(b, "exposed").length} underlying exposed {financialMetricCaseIds(b, "exposed").length === 1 ? "case" : "cases"}
                  </Link>
                </div>
                <dl className="mt-2 grid overflow-hidden border-y border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
                  {STEPS.map(({ key, state, label, definition }, index) => {
                    const known = financialMetricIsKnown(b, state);
                    return (
                    <div
                      key={key}
                      className={`min-h-24 py-4 sm:px-4 ${index > 0 ? "border-t border-[var(--border-muted)] sm:border-l sm:border-t-0" : ""}`}
                    >
                      <dt className="text-xs font-medium text-[var(--text-secondary)]">
                        <Link
                          className="hover:text-[var(--accent)]"
                          href={financialReportRecordsHref({
                            range: report.range,
                            currency: b.currency,
                            metric: state,
                          })}
                        >
                          {label}
                        </Link>
                      </dt>
                      <dd
                        className="mt-2 text-xl font-semibold tabular-nums"
                        style={known && b[key] === 0 ? { color: "var(--text-tertiary)" } : undefined}
                      >
                        {known ? money(b[key] as number, b.currency) : "Unavailable"}
                      </dd>
                      <dd className="mt-1 text-xs text-[var(--text-secondary)]">
                        {definition}
                      </dd>
                    </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            No canonical financial entries were found for payout cases in this
            period. Missing ledger data is not reported as zero.
          </p>
        )}
      </section>
      <DashboardCharts report={report} />
      <section className="border-t border-[var(--border-muted)] pt-5">
        <h2 className="text-lg font-semibold">Needs attention</h2>
        <div className="ua-section-panel mt-3 max-w-2xl divide-y divide-[var(--border-muted)] overflow-hidden rounded-lg">
          {report.operations.slice(0, compact ? 4 : 8).map((row) => (
            <Link
              key={row.key}
              href={row.href}
              className="ua-table-row flex items-center justify-between gap-4 p-3.5 hover:bg-[var(--surface-hover)]"
            >
              <span className="text-sm">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{row.count} {row.count === 1 ? 'case' : 'cases'}</span>
            </Link>
          ))}
        </div>
        {!report.operations.length ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No payout-case records were found in the selected period.
          </p>
        ) : null}
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
        <section className="border-t border-[var(--border-muted)] pt-5">
          <h2 className="text-lg font-semibold">Report definitions</h2>
          <div className="mt-3 divide-y divide-[var(--border-muted)] border-y border-[var(--border-muted)]">
            {REPORT_DEFINITIONS.map((d) => (
              <details key={d.id} className="py-3">
                <summary className="cursor-pointer font-medium">
                  {d.name}
                </summary>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--text-secondary)]">Definition</dt>
                    <dd>{d.definition}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-secondary)]">Numerator</dt>
                    <dd>{d.numerator}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-secondary)]">
                      Denominator
                    </dt>
                    <dd>{d.denominator}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-secondary)]">Time basis</dt>
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
