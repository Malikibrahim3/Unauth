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
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";
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
  const recordTitle = `${value.replaceAll("_", " ") || kind} records`;
  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Report drill-down"
        title={recordTitle}
        subtitle={
          <>
          {formatNumber(total)} exact matching records ·{" "}
          {range === "all" ? "all time" : range}{" "}
          {sp.currency ? `· ${sp.currency.toUpperCase()}` : ""}
          </>
        }
        breadcrumbs={[
          { label: "Reports", href: `/reports?range=${range}` },
          { label: recordTitle },
        ]}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel
          title="Matching records"
          description="Canonical records behind this report slice."
          capabilityId="reports.records.table"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)]">
              <th className="px-4 py-2.5 text-left font-medium">Record</th>
              <th className="px-3 py-2.5 text-left font-medium">Type</th>
              <th className="px-3 py-2.5 text-left font-medium">State</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border-muted)] last:border-b-0 hover:bg-[var(--surface-hover)]">
                <td className="px-4 py-3">
                  <Link
                    className="font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
                    href={
                      kind === "recovery"
                        ? `/recoveries/${r.id}`
                        : `/claims/${r.id}`
                    }
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">
                  {String(
                    r.recovery_type ||
                      r.reason_normalized ||
                      r.claim_type ||
                      "—",
                  ).replaceAll("_", " ")}
                </td>
                <td className="px-3 py-3 capitalize">{String(r.status || "—").replaceAll("_", " ")}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.currency &&
                  Number(r.amount_recovered ?? r.amount_at_risk) != null
                    ? `${Number(r.amount_recovered ?? r.amount_at_risk).toFixed(2)} ${r.currency}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                  {formatDateTime(r.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
          {!rows.length ? (
            <p className="px-4 py-10 text-center text-xs text-[var(--text-secondary)]">No records match this report slice.</p>
          ) : null}
          <nav className="flex min-h-12 items-center justify-between border-t border-[var(--border-muted)] px-4 text-[11px] font-semibold">
        {page > 1 ? (
          <Link
            className="rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 hover:bg-[var(--surface-hover)]"
            href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {from + rows.length < total ? (
          <Link
            className="rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 hover:bg-[var(--surface-hover)]"
            href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}
          >
            Next
          </Link>
        ) : null}
          </nav>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
