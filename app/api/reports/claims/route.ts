import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAction } from "@/lib/permissions/audit";
import {
  isFinancialReportMetric,
  loadIntelligenceReport,
  parseReportRange,
  reportCutoff,
} from "@/lib/reporting/intelligence";
import {
  buildReportExportRows,
  type ReportExportView,
} from "@/lib/reporting/export";
import { normaliseCurrencyOrNull } from "@/lib/canonical/money";
import { hashId } from "@/lib/ui/displayRef";

const SUPPORTING_RECORD_LIMIT = 10_000;
const SUPPORTING_RECORD_PAGE_SIZE = 200;

type SupportingRecord = {
  support_payout_case_id: string;
  case_status: string;
  claim_type: string;
  submitted_at: string;
  updated_at: string;
  currency: string;
  amount_minor: number;
  total_count: number;
};

function cell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}
export async function GET(request: NextRequest) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const svc = createServiceClient();
  const permission = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_AUDIT,
  );
  if (permission.denied) return permission.denied;
  const exportPermission = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.EXPORT_AUDIT,
  );
  if (exportPermission.denied) return exportPermission.denied;
  const range = parseReportRange(
    request.nextUrl.searchParams.get("range") ?? undefined,
  );
  const timezoneParam = request.nextUrl.searchParams.get("timezone") || "UTC";
  const timezone = timezoneParam.length < 80 ? timezoneParam : "UTC";
  const currencyParam = request.nextUrl.searchParams.get("currency");
  const currency = currencyParam ? normaliseCurrencyOrNull(currencyParam) : null;
  if (currencyParam && !currency) {
    return NextResponse.json({ error: "Use a valid ISO currency code." }, { status: 400 });
  }
  const requestedView = request.nextUrl.searchParams.get("view");
  const view: ReportExportView = requestedView === "outcomes"
    ? "outcomes"
    : requestedView === "records"
      ? "records"
      : "metrics";
  const metricParam = request.nextUrl.searchParams.get("metric");
  if (metricParam && !isFinancialReportMetric(metricParam)) {
    return NextResponse.json({ error: "Use a supported financial metric." }, { status: 400 });
  }
  const metric = metricParam && isFinancialReportMetric(metricParam) ? metricParam : null;
  const category = (request.nextUrl.searchParams.get("category") ?? "").slice(0, 100) || null;
  if (view === "records") {
    const recordMetric = metric ?? "exposed";
    const cutoff = reportCutoff(range);
    const supportingRows: SupportingRecord[] = [];
    let totalCount = 0;
    for (let offset = 0; offset === 0 || offset < totalCount; offset += SUPPORTING_RECORD_PAGE_SIZE) {
      const page = await svc.rpc("get_financial_report_records", {
        p_merchant_id: permission.ctx.merchantId,
        p_cutoff: cutoff,
        p_currency: currency ?? undefined,
        p_metric: recordMetric,
        p_category: category ?? undefined,
        p_limit: SUPPORTING_RECORD_PAGE_SIZE,
        p_offset: offset,
      });
      if (page.error) {
        return NextResponse.json({ error: "Supporting records are unavailable for this scope." }, { status: 503 });
      }
      const rows = (page.data ?? []) as SupportingRecord[];
      totalCount = rows[0]?.total_count ?? 0;
      if (totalCount > SUPPORTING_RECORD_LIMIT) {
        return NextResponse.json({
          error: `This export contains ${totalCount} rows. Narrow the date, currency, metric, or category scope below ${SUPPORTING_RECORD_LIMIT + 1} rows.`,
        }, { status: 413 });
      }
      supportingRows.push(...rows);
      if (rows.length < SUPPORTING_RECORD_PAGE_SIZE) break;
    }
    const rows: unknown[][] = [[
      "report_version", "range", "timezone", "metric", "category", "currency_scope",
      "case_reference", "case_status", "claim_type", "submitted_at", "updated_at", "currency", "amount_minor",
    ], ...supportingRows.map((row) => [
      "mvp-plus-financial-v2", range, timezone, recordMetric, category ?? "all", currency ?? "separated",
      hashId(row.support_payout_case_id), row.case_status, row.claim_type, row.submitted_at, row.updated_at,
      row.currency, row.amount_minor,
    ])];
    await logAction({
      ctx: permission.ctx,
      action: "export_audit",
      resourceType: "report",
      metadata: { view, range, timezone, currency, metric: recordMetric, category, rowCount: supportingRows.length, rowLimit: SUPPORTING_RECORD_LIMIT },
    });
    const encoder = new TextEncoder();
    const body = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(csv(rows))); controller.close(); } });
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="unauth-financial-records-${range}.csv"`,
        "X-Export-Row-Limit": String(SUPPORTING_RECORD_LIMIT),
        "X-Export-Row-Count": String(supportingRows.length),
      },
    });
  }
  const report = await loadIntelligenceReport(
    svc,
    permission.ctx.merchantId,
    range,
    timezone,
  );
  const scopedReport = currency
    ? {
        ...report,
        bridges: report.bridges.filter((row) => row.currency === currency),
        causes: report.causes.filter((row) => row.currency === currency),
      }
    : report;
  const rows = buildReportExportRows(scopedReport, view, {
    metric,
    category,
  });
  await logAction({
    ctx: permission.ctx,
    action: "export_audit",
    resourceType: "report",
    metadata: { view, range, timezone, currency, metric, category, rowCount: rows.length - 1 },
  });
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unauth-financial-${view}-${range}.csv"`,
      "X-Export-Row-Count": String(Math.max(0, rows.length - 1)),
    },
  });
}
