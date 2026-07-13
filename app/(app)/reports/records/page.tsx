import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { parseReportRange, reportCutoff } from "@/lib/reporting/intelligence";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
export const dynamic = "force-dynamic";
export default async function ReportRecords({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_AUDIT,
  );
  if (denied) redirect(await resolveDefaultAppPath(svc, user.id));
  if (!(await merchantHasEntitlement(svc, ctx.merchantId, "REPORTS_ADVANCED")))
    redirect("/settings/billing?required=REPORTS_ADVANCED");
  const sp = await searchParams;
  const kind = sp.kind === "recovery" ? "recovery" : "case";
  const dimension = sp.dimension === "reason" ? "reason" : "status";
  const value = (sp.value || "").slice(0, 100);
  const range = parseReportRange(sp.range);
  const cutoff = reportCutoff(range);
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * 50;
  let query =
    kind === "recovery"
      ? svc
          .from(TABLES.RECOVERY_CASES)
          .select(
            "id,status,recovery_type,currency,amount_recovered,updated_at",
            { count: "exact" },
          )
          .eq("merchant_id", ctx.merchantId)
      : svc
          .from(TABLES.MERCHANT_CLAIMS)
          .select(
            "id,status,claim_type,reason_normalized,currency,amount_at_risk,submitted_at,updated_at",
            { count: "exact" },
          )
          .eq("merchant_id", ctx.merchantId);
  if (value)
    query =
      kind === "recovery" || dimension === "status"
        ? query.eq("status", value)
        : query.or(`reason_normalized.eq.${value},claim_type.eq.${value}`);
  if (cutoff)
    query = query.gte(
      kind === "recovery" ? "updated_at" : "submitted_at",
      cutoff,
    );
  if (sp.currency) query = query.eq("currency", sp.currency.toUpperCase());
  const result = await query
    .order("updated_at", { ascending: false })
    .range(from, from + 49);
  const rows = (result.data ?? []) as Array<Record<string, any>>;
  const total = result.count ?? 0;
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <Link
        className="text-sm font-medium text-[var(--accent)]"
        href={`/reports?range=${range}`}
      >
        ← Return to reports
      </Link>
      <header>
        <h1 className="text-2xl font-semibold capitalize">
          {value.replaceAll("_", " ") || kind} records
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {formatNumber(total)} exact matching records ·{" "}
          {range === "all" ? "all time" : range}{" "}
          {sp.currency ? `· ${sp.currency.toUpperCase()}` : ""}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Record</th>
              <th className="text-left">Type</th>
              <th className="text-left">State</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border-muted)]">
                <td className="py-3">
                  <Link
                    className="font-mono text-[var(--accent)]"
                    href={
                      kind === "recovery"
                        ? `/recoveries/${r.id}`
                        : `/claims/${r.id}`
                    }
                  >
                    {r.id}
                  </Link>
                </td>
                <td>
                  {String(
                    r.recovery_type ||
                      r.reason_normalized ||
                      r.claim_type ||
                      "—",
                  ).replaceAll("_", " ")}
                </td>
                <td>{String(r.status || "—").replaceAll("_", " ")}</td>
                <td className="text-right tabular-nums">
                  {r.currency &&
                  Number(r.amount_recovered ?? r.amount_at_risk) != null
                    ? `${Number(r.amount_recovered ?? r.amount_at_risk).toFixed(2)} ${r.currency}`
                    : "—"}
                </td>
                <td className="text-right">
                  {formatDateTime(r.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p>No records match this report slice.</p> : null}
      <nav className="flex justify-between">
        {page > 1 ? (
          <Link
            href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {from + rows.length < total ? (
          <Link
            href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}
          >
            Next →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
