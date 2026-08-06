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
import { label } from "@/lib/ui/labels";
import { TIME_RANGE_LABELS, entityLabel, financialStageLabel as copyFinancialStageLabel } from "@/lib/ui/merchantCopy";
import { shortRef, hashId } from "@/lib/ui/displayRef";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import {
  formatCurrencyNullable,
  formatDateTime,
  formatMinorCurrencyNullable,
  formatNumber,
} from "@/lib/utils/format";
import ExportMenu from "@/components/reports/ExportMenu";
import {
  DataTableServer,
  OperationalState,
  PageFrame,
  RegistrySurface,
} from "@/components/ui";
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
          : dimension === "reason" && typeof row.reason_normalized === "string"
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

  const financialLabelMap: Record<string, string> = {
    requested: copyFinancialStageLabel("requested"),
    exposed: copyFinancialStageLabel("maximum_exposure"),
    approved: copyFinancialStageLabel("merchant_decision"),
    paid: copyFinancialStageLabel("observed_payout"),
    estimated_loss: copyFinancialStageLabel("estimated_loss"),
    confirmed_loss: copyFinancialStageLabel("confirmed_loss"),
    recoverable: copyFinancialStageLabel("eligible_recovery"),
    recovered: copyFinancialStageLabel("recovered_cash"),
    prevented: copyFinancialStageLabel("prevented"),
    written_off: copyFinancialStageLabel("written_off"),
    outstanding: copyFinancialStageLabel("outstanding_recovery"),
    final_net_loss: copyFinancialStageLabel("final_net_loss"),
  };
  const titleValue = dimension === "financial"
    ? financialLabelMap[metric] ?? copyFinancialStageLabel(metric)
    : dimension === "category"
      ? label("lossCategory", value)
      : kind === "recovery"
        ? entityLabel("recovery")
        : label("caseStatus", value);
  const recordTitle = `${titleValue.replaceAll("_", " ")} records`;
  const reportHref = `/financials/reports?${new URLSearchParams({
    range,
    timezone,
  }).toString()}`;
  const currentParams = new URLSearchParams();
  for (const [key, parameterValue] of Object.entries(sp)) {
    if (parameterValue) currentParams.set(key, parameterValue);
  }
  const recordsHref = (targetPage: number) => {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(targetPage));
  return `/financials/reports/records?${params.toString()}`;
  };
  const recordHref = (row: ReportRecordRow) =>
      kind === "recovery" ? `/financials/recovery/${row.id}` : `/cases/${row.id}`;
  const scopedExport = dimension === "financial" || dimension === "category" ? (
    <ExportMenu
      range={range}
      timezone={timezone}
      currency={sp.currency?.toUpperCase() ?? null}
      metric={dimension === "financial" ? metric : null}
      category={dimension === "category" ? value : null}
    />
  ) : null;

  return (
    <PageFrame
      title={recordTitle}
      subtitle={
        <>
          {TIME_RANGE_LABELS[range]} · {sp.currency ? sp.currency.toUpperCase() : "all currencies"} · {timezone}
        </>
      }
      actions={scopedExport}
      breadcrumbs={[
        { label: "Reports", href: reportHref },
        { label: recordTitle },
      ]}
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--ua-text-metadata-size)]">
          <Link className="ua-text-metadata text-[var(--ua-action-primary)]" href={reportHref}>
            Back to report
          </Link>
          <span className="text-[var(--ua-text-secondary)]">
            {dimension === "financial" ? "Financial metric" : dimension === "category" ? "Loss category" : "Workflow state"}: {titleValue}
          </span>
        </div>
      }
    >
      <RegistrySurface
        aria-label="Matching report records"
        resultCount={loadFailed ? "Records unavailable" : `${formatNumber(total)} matching records`}
        pagination={
          !loadFailed ? (
            <nav aria-label="Matching records pages" className="flex min-h-10 items-center justify-between gap-3">
              {page > 1 ? (
                <Link
                  className="ua-text-label rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--ua-surface-hover)]"
                  href={recordsHref(page - 1)}
                >
                  Previous
                </Link>
              ) : <span />}
              {from + rows.length < total ? (
                <Link
                  className="ua-text-label rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 py-1.5 hover:bg-[var(--ua-surface-hover)]"
                  href={recordsHref(page + 1)}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : undefined
        }
      >
        {loadFailed ? (
          <OperationalState
            kind="error"
            title="These report records could not be loaded"
            description="The summary value has not been changed. Retry this same report scope."
            action={
              <Link className="ua-text-label text-[var(--ua-action-primary)]" href={recordsHref(page)}>
                Retry records
              </Link>
            }
          />
        ) : (
          <DataTableServer<ReportRecordRow>
            flush
            density="metadata"
            aria-label="Matching report records"
            rows={rows}
            getRowKey={(row) => row.id}
            emptyState={
              <OperationalState
                kind="filtered-empty"
                title="No records match this report slice"
                description="Choose another report range or return to the report to inspect a different metric."
                action={<Link className="ua-text-label text-[var(--ua-action-primary)]" href={reportHref}>Back to report</Link>}
              />
            }
            columns={[
              {
                key: "record",
                header: "Record",
                render: (row) => (
                  <Link
                    className="ua-text-working-title font-mono text-[var(--ua-text-primary)] hover:text-[var(--ua-action-primary)]"
                    href={recordHref(row)}
                  >
                    {kind === "recovery" ? `Recovery ${hashId(row.id)}` : shortRef(null, row.id)}
                  </Link>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (row) => (
                  <span className="text-[var(--ua-text-secondary)]">
                    {kind === "recovery"
                      ? label("attribution", row.recordType)
                      : dimension === "reason"
                        ? row.recordType
                        : label("claimType", row.recordType)}
                  </span>
                ),
              },
              {
                key: "state",
                header: "State",
                render: (row) => label(kind === "recovery" ? "recoveryStatus" : "caseStatus", row.status),
              },
              {
                key: "amount",
                header: "Amount",
                kind: "currency",
                render: (row) => row.amountMinor != null
                  ? formatMinorCurrencyNullable(row.amountMinor, row.currency)
                  : row.amountMajor != null
                    ? formatCurrencyNullable(row.amountMajor, row.currency)
                    : "Unavailable",
              },
              {
                key: "updated",
                header: "Updated",
                kind: "date",
                render: (row) => row.updatedAt ? formatDateTime(row.updatedAt) : "Unavailable",
              },
            ]}
          />
        )}
      </RegistrySurface>
    </PageFrame>
  );
}
