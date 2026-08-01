import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAction } from "@/lib/permissions/audit";
import {
  isFinancialReportMetric,
  loadIntelligenceReport,
  parseReportRange,
} from "@/lib/reporting/intelligence";
import {
  buildReportExportRows,
  type ReportExportView,
} from "@/lib/reporting/export";
import { normaliseCurrencyOrNull } from "@/lib/canonical/money";

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
  const view: ReportExportView =
    request.nextUrl.searchParams.get("view") === "outcomes"
      ? "outcomes"
      : "metrics";
  const metricParam = request.nextUrl.searchParams.get("metric");
  if (metricParam && !isFinancialReportMetric(metricParam)) {
    return NextResponse.json({ error: "Use a supported financial metric." }, { status: 400 });
  }
  const metric = metricParam && isFinancialReportMetric(metricParam) ? metricParam : null;
  const category = (request.nextUrl.searchParams.get("category") ?? "").slice(0, 100) || null;
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
      "Content-Disposition": `attachment; filename="payout-${view}-${range}.csv"`,
    },
  });
}
