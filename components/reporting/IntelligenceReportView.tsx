import Link from "next/link";
import type {
  IntelligenceReport,
  MoneyBridge,
  RankedRow,
} from "@/lib/reporting/intelligence";
import { REPORT_DEFINITIONS } from "@/lib/reporting/intelligence";
import { normaliseCurrencyOrNull } from "@/lib/canonical/money";
import { formatMinorCurrencyNullable } from "@/lib/utils/format";

function money(minor: number, currency: string) {
  return formatMinorCurrencyNullable(minor, currency);
}

function currencyLabel(currency: string) {
  return normaliseCurrencyOrNull(currency) ?? "Currency unavailable";
}
const STEPS: Array<[keyof MoneyBridge, string, string]> = [
  ["requestedMinor", "Requested exposure", "Amount requested by customers"],
  ["paidMinor", "Customer compensation", "Paid or issued compensation"],
  [
    "preventedMinor",
    "Prevented payout",
    "Recorded merchant decision prevented payout",
  ],
  ["realisedLossMinor", "Realised loss", "Ledger-confirmed merchant loss"],
  ["recoverableMinor", "Recoverable", "Supported for a recovery route"],
  ["recoveredMinor", "Recovered", "Received and reconciled"],
  [
    "outstandingMinor",
    "Outstanding",
    "Recoverable less recovered and written off",
  ],
  ["writtenOffMinor", "Written off", "Recovery closed without receipt"],
];
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
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.key}:${r.currency}`}
                  className="border-b border-[var(--border-muted)]"
                >
                  <th
                    scope="row"
                    className="py-3 text-left font-medium capitalize"
                  >
                    {r.label}
                  </th>
                  <td className="py-3 text-right tabular-nums">{r.count}</td>
                  <td className="py-3 text-right tabular-nums">
                    {money(r.amountMinor, r.currency)}{" "}
                    <span className="text-xs text-[var(--text-secondary)]">
                      {currencyLabel(r.currency)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      className="font-medium text-[var(--accent)]"
                      href={r.href}
                    >
                      Inspect →
                    </Link>
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
              Financial value bridge
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Canonical case financial summaries ·{" "}
              {report.range === "all" ? "all time" : `last ${report.range}`} ·{" "}
              {report.timezone}
            </p>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Generated {new Date(report.generatedAt).toLocaleString()}
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{b.currency}</h3>
                  <Link
                    href={`/claims?range=${report.range}&currency=${b.currency}`}
                    className="text-sm font-medium text-[var(--accent)]"
                  >
                    {b.caseIds.length} underlying cases →
                  </Link>
                </div>
                <dl className="mt-2 grid border-y border-[var(--border-muted)] sm:grid-cols-2 lg:grid-cols-4">
                  {STEPS.map(([key, label, definition]) => (
                    <div
                      key={key}
                      className="min-h-24 border-b border-[var(--border-muted)] p-3 sm:border-r"
                    >
                      <dt className="text-sm text-[var(--text-secondary)]">
                        {label}
                      </dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums">
                        {money(b[key] as number, b.currency)}
                      </dd>
                      <dd className="mt-1 text-xs text-[var(--text-secondary)]">
                        {definition}
                      </dd>
                    </div>
                  ))}
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
      <section className="border-t border-[var(--border-muted)] pt-5">
        <h2 className="text-lg font-semibold">Needs attention</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.operations.slice(0, compact ? 4 : 8).map((row) => (
            <Link
              key={row.key}
              href={row.href}
              className="border border-[var(--border)] p-3"
            >
              <span className="block text-sm capitalize">{row.label}</span>
              <strong className="mt-1 block text-2xl tabular-nums">
                {row.count}
              </strong>
              <span className="text-xs text-[var(--accent)]">
                Open matching records →
              </span>
            </Link>
          ))}
        </div>
        {!report.operations.length ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No payout-case records were found in the selected period.
          </p>
        ) : null}
      </section>
      <RankedTable
        title="Loss causes"
        description="Realised loss grouped by normalised request reason. Categories describe recorded causes, not causal inference."
        rows={report.causes.slice(0, compact ? 5 : 20)}
        empty="No realised-loss cause records were found in this period."
      />
      <RankedTable
        title="Recovery performance"
        description="Reconciled recovered value grouped by recovery state."
        rows={report.recoveries.slice(0, compact ? 5 : 20)}
        empty="No recovery records were updated in this period."
      />
      <section className="border-t border-[var(--border-muted)] pt-5">
        <h2 className="text-lg font-semibold">Source coverage</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Object counts and freshness from imported records; fresh means updated
          within 48 hours.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                <th className="py-2">Object</th>
                <th className="py-2 text-right">Inspected</th>
                <th className="py-2 text-right">Fresh</th>
                <th className="py-2 text-right">Stale</th>
                <th className="py-2 text-right">Latest source update</th>
              </tr>
            </thead>
            <tbody>
              {report.coverage.map((r) => (
                <tr
                  key={r.objectType}
                  className="border-b border-[var(--border-muted)]"
                >
                  <th scope="row" className="py-3 text-left">
                    <Link
                      className="font-medium text-[var(--accent)]"
                      href={r.href}
                    >
                      {r.objectType}
                    </Link>
                  </th>
                  <td className="py-3 text-right tabular-nums">{r.records}</td>
                  <td className="py-3 text-right tabular-nums">
                    {r.freshRecords}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {r.staleRecords}
                  </td>
                  <td className="py-3 text-right">
                    {r.latestAt
                      ? new Date(r.latestAt).toLocaleString()
                      : "No records"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
