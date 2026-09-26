import { loadClaimPatterns, claimPatternFingerprint } from '@/lib/reporting/claimPatternRead';
import { PATTERN_DIMENSIONS, patternCaseRows, type PatternDimension } from '@/lib/reporting/claimPatterns';
import { buildClaimPatternExportRows } from '@/lib/reporting/export';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
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
  const timezoneParam = request.nextUrl.searchParams.get("timezone") || "Europe/London";
  const timezone = timezoneParam.length < 80 ? timezoneParam : "Europe/London";
  const asOfParam = request.nextUrl.searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : new Date();
  if (Number.isNaN(asOf.getTime())) {
    return NextResponse.json({ error: "Use a valid asOf instant." }, { status: 400 });
  }
  const currencyParam = request.nextUrl.searchParams.get("currency");
  const currency = currencyParam ? normaliseCurrencyOrNull(currencyParam) : null;
  if (currencyParam && !currency) {
    return NextResponse.json({ error: "Use a valid ISO currency code." }, { status: 400 });
  }
  const requestedView = request.nextUrl.searchParams.get("view");
  if (requestedView === 'patterns') {
    if (!(await merchantHasEntitlement(svc, permission.ctx.merchantId, 'REPORTS_ADVANCED'))) return NextResponse.json({error:'Advanced reports access required.'},{status:403});
    const dimension = request.nextUrl.searchParams.get('dimension') as PatternDimension;
    if (!PATTERN_DIMENSIONS.includes(dimension)) return NextResponse.json({error:'Unsupported grouping.'},{status:400});
    const report = await loadClaimPatterns(svc, permission.ctx.merchantId, range, timezone, asOf);
    if (claimPatternFingerprint(report) !== request.nextUrl.searchParams.get('fingerprint')) return NextResponse.json({error:'The report changed. Reload and review it before exporting.'},{status:409});
    if (report.state === 'unavailable' || report.state === 'capped') return NextResponse.json({error:'This cohort cannot be exported. Narrow or retry the report.'},{status:409});
    const key = request.nextUrl.searchParams.get('group');
    const rows = buildClaimPatternExportRows(report, dimension, patternCaseRows(report, dimension, key));
    await logAction({ctx:permission.ctx,action:'export_audit',resourceType:'report',metadata:{view:'patterns',range,dimension,from:report.from,to:report.to,completeness:report.state,rowCount:rows.length-1}});
    return new NextResponse(csv(rows), {headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="unauth-claim-patterns.csv"','Cache-Control':'private, no-store'}});
  }
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
    const cutoff = reportCutoff(range, asOf);
    const supportingRows: SupportingRecord[] = [];
    let totalCount = 0;
    for (let offset = 0; offset === 0 || offset < totalCount; offset += SUPPORTING_RECORD_PAGE_SIZE) {
      const page = await svc.rpc("get_financial_report_records_v2", {
        p_merchant_id: permission.ctx.merchantId,
        p_from: cutoff,
        p_to: asOf.toISOString(),
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
      "report_version", "range", "timezone", "from_inclusive", "to_exclusive", "as_of", "population", "row_cap", "metric", "category", "currency_scope",
      "case_reference", "case_status", "claim_type", "submitted_at", "updated_at", "currency", "amount_minor",
    ], ...supportingRows.map((row) => [
      "merchant-clarity-p02-financial-v3", range, timezone, cutoff ?? "all recorded history", asOf.toISOString(), asOf.toISOString(), "merchant_support_payout_cases_by_submitted_at", SUPPORTING_RECORD_LIMIT, recordMetric, category ?? "all", currency ?? "separated",
      hashId(row.support_payout_case_id), row.case_status, row.claim_type, row.submitted_at, row.updated_at,
      row.currency, row.amount_minor,
    ])];
    await logAction({
      ctx: permission.ctx,
      action: "export_audit",
      resourceType: "report",
      metadata: { view, range, timezone, from: cutoff, to: asOf.toISOString(), asOf: asOf.toISOString(), currency, metric: recordMetric, category, rowCount: supportingRows.length, rowLimit: SUPPORTING_RECORD_LIMIT },
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
    { asOf },
  );
  const scopedReport = currency
    ? {
        ...report,
        bridges: report.bridges.filter((row) => row.currency === currency),
        causes: report.causes.filter((row) => row.currency === currency),
      }
    : report;
  const reportRows = buildReportExportRows(scopedReport, view, {
    metric,
    category,
  });
  const scopeColumns = [
    "scope_from_inclusive", "scope_to_exclusive", "scope_timezone",
    "scope_population", "scope_row_cap", "as_of",
  ];
  const scopeValues = [
    report.financialScope?.from ?? "all recorded history",
    report.financialScope?.to ?? report.generatedAt,
    report.timezone,
    report.financialScope?.population ?? "merchant_support_payout_cases",
    report.financialScope?.rowCap ?? SUPPORTING_RECORD_LIMIT,
    report.generatedAt,
  ];
  const rows = reportRows.map((row, index) => [...row, ...(index === 0 ? scopeColumns : scopeValues)]);
  await logAction({
    ctx: permission.ctx,
    action: "export_audit",
    resourceType: "report",
    metadata: { view, range, timezone, from: report.financialScope?.from ?? null, to: report.financialScope?.to ?? report.generatedAt, asOf: report.generatedAt, currency, metric, category, rowCount: rows.length - 1 },
  });
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unauth-financial-${view}-${range}.csv"`,
      "X-Export-Row-Count": String(Math.max(0, rows.length - 1)),
    },
  });
}
