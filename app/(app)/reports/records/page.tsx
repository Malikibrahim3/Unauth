import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  isFinancialReportMetric,
  normalizeReportTimezone,
  parseReportRange,
  reportCutoff,
} from "@/lib/reporting/intelligence";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import {
  formatCurrencyNullable,
  formatDateTime,
  formatMinorCurrencyNullable,
  formatNumber,
} from "@/lib/utils/format";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";
export const dynamic = "force-dynamic";

type ReportRecordRow = {
  id: string;
  status: string | null;
  recordType: string | null;
  currency: string | null;
  amountMinor: number | null;
  amountMajor: number | null;
  updatedAt: string | null;
};

export default async function ReportRecords({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getRequestUser();
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
  const dimension =
    kind === "case" && sp.dimension === "financial"
      ? "financial"
      : kind === "case" && sp.dimension === "category"
        ? "category"
        : sp.dimension === "reason"
          ? "reason"
          : "status";
  const value = (sp.value || "").slice(0, 100);
  const requestedMetric = sp.metric ?? "";
  const metric = isFinancialReportMetric(requestedMetric)
    ? requestedMetric
    : dimension === "category"
      ? "confirmed_loss"
      : "exposed";
  const range = parseReportRange(sp.range);
  const timezone = normalizeReportTimezone(sp.timezone);
  const cutoff = reportCutoff(range);
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * 50;
  let rows: ReportRecordRow[] = [];
  let total = 0;
  let loadFailed = false;

  if (dimension === "financial" || dimension === "category") {
    const result = await svc.rpc("get_financial_report_records", {
      p_merchant_id: ctx.merchantId,
      p_cutoff: cutoff,
      p_currency: sp.currency?.toUpperCase() ?? null,
      p_metric: metric,
      p_category: dimension === "category" && value ? value : null,
      p_limit: 50,
      p_offset: from,
    });
    loadFailed = Boolean(result.error);
    const financialRows = (result.data ?? []) as Array<{
      support_payout_case_id: string;
      case_status: string | null;
      claim_type: string | null;
      currency: string | null;
      amount_minor: number | null;
      updated_at: string | null;
      total_count: number | null;
    }>;
    total = Number(financialRows[0]?.total_count ?? 0);
    rows = financialRows.map((row) => ({
      id: row.support_payout_case_id,
      status: row.case_status,
      recordType: row.claim_type,
      currency: row.currency,
      amountMinor: row.amount_minor,
      amountMajor: null,
      updatedAt: row.updated_at,
    }));
  } else {
    let query =
      kind === "recovery"
        ? svc
            .from(TABLES.RECOVERY_CASES)
            .select(
              "id,status,recovery_type,currency,amount_recovered_minor,updated_at",
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
    loadFailed = Boolean(result.error);
    total = result.count ?? 0;
    rows = ((result.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      status: typeof row.status === "string" ? row.status : null,
      recordType:
        typeof row.recovery_type === "string"
          ? row.recovery_type
          : typeof row.reason_normalized === "string"
            ? row.reason_normalized
            : typeof row.claim_type === "string"
              ? row.claim_type
              : null,
      currency: typeof row.currency === "string" ? row.currency : null,
      amountMinor:
        typeof row.amount_recovered_minor === "number"
          ? row.amount_recovered_minor
          : null,
      amountMajor:
        typeof row.amount_at_risk === "number" ? row.amount_at_risk : null,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    }));
  }

  const titleValue = dimension === "financial" ? metric : value || kind;
  const recordTitle = `${titleValue.replaceAll("_", " ")} records`;
  return (
    <div>
      <AuthenticatedPageHeader
        title={recordTitle}
        subtitle={
          <>
          {formatNumber(total)} exact matching records ·{" "}
          {range === "all" ? "all time" : range}{" "}
          {sp.currency ? `· ${sp.currency.toUpperCase()}` : ""} · {timezone}
          </>
        }
        breadcrumbs={[
          { label: "Reports", href: `/reports?range=${range}&timezone=${encodeURIComponent(timezone)}` },
          { label: recordTitle },
        ]}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel
          title="Matching records"
          description="Canonical records behind this report slice."
          capabilityId="reports.records.table"
        >
          {loadFailed ? (
            <div role="alert" className="border-b border-[var(--ua-critical)] px-4 py-3 text-sm">
              These report records could not be loaded. Retry the page; the summary value has not been changed.
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-[length:var(--ua-text-micro-size)]">
          <thead>
            <tr className="border-b border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] text-[var(--ua-text-tertiary)]">
              <th className="px-4 py-2.5 text-left font-medium">Record</th>
              <th className="px-3 py-2.5 text-left font-medium">Type</th>
              <th className="px-3 py-2.5 text-left font-medium">State</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--ua-border-subtle)] last:border-b-0 hover:bg-[var(--ua-surface-hover)]">
                <td className="px-4 py-3">
                  <Link
                    className="font-mono font-semibold text-[var(--ua-text-primary)] hover:text-[var(--ua-action-primary)]"
                    href={
                      kind === "recovery"
                        ? `/recoveries/${r.id}`
                        : `/claims/${r.id}`
                    }
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-3 py-3 text-[var(--ua-text-secondary)]">
                  {(r.recordType ?? "—").replaceAll("_", " ")}
                </td>
                <td className="px-3 py-3 capitalize">{(r.status ?? "—").replaceAll("_", " ")}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.amountMinor != null
                    ? formatMinorCurrencyNullable(r.amountMinor, r.currency)
                    : r.amountMajor != null
                      ? formatCurrencyNullable(r.amountMajor, r.currency)
                      : "Unavailable"}
                </td>
                <td className="px-4 py-3 text-right text-[var(--ua-text-secondary)]">
                  {r.updatedAt ? formatDateTime(r.updatedAt) : "Unavailable"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
          {!loadFailed && !rows.length ? (
            <p className="px-4 py-10 text-center text-xs text-[var(--ua-text-secondary)]">No records match this report slice.</p>
          ) : null}
          <nav className="flex min-h-12 items-center justify-between border-t border-[var(--ua-border-subtle)] px-4 text-[length:var(--ua-text-micro-size)] font-semibold">
        {page > 1 ? (
          <Link
            className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--ua-surface-hover)]"
            href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        {from + rows.length < total ? (
          <Link
            className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--ua-surface-hover)]"
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
