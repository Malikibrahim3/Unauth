import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAction } from "@/lib/permissions/audit";
import {
  loadIntelligenceReport,
  parseReportRange,
} from "@/lib/reporting/intelligence";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
  const timezone = request.nextUrl.searchParams.get("timezone") || "UTC";
  const view = request.nextUrl.searchParams.get("view") || "metrics";
  const report = await loadIntelligenceReport(
    svc as any,
    permission.ctx.merchantId,
    range,
    timezone,
  );
  let rows: unknown[][];
  if (view === "outcomes")
    rows = [
      ["category", "currency", "record_count", "amount_minor", "amount"],
      ...report.causes.map((r) => [
        r.label,
        r.currency,
        r.count,
        r.amountMinor,
        (r.amountMinor / 100).toFixed(2),
      ]),
    ];
  else
    rows = [
      ["metric", "currency", "value_minor", "value", "case_count"],
      ...report.bridges.flatMap((b) => [
        [
          "requested_exposure",
          b.currency,
          b.requestedMinor,
          (b.requestedMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "customer_compensation",
          b.currency,
          b.paidMinor,
          (b.paidMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "prevented_payout",
          b.currency,
          b.preventedMinor,
          (b.preventedMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "realised_loss",
          b.currency,
          b.realisedLossMinor,
          (b.realisedLossMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "recoverable",
          b.currency,
          b.recoverableMinor,
          (b.recoverableMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "recovered",
          b.currency,
          b.recoveredMinor,
          (b.recoveredMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "outstanding",
          b.currency,
          b.outstandingMinor,
          (b.outstandingMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
        [
          "written_off",
          b.currency,
          b.writtenOffMinor,
          (b.writtenOffMinor / 100).toFixed(2),
          b.caseIds.length,
        ],
      ]),
    ];
  await logAction({
    ctx: permission.ctx,
    action: "export_audit",
    resourceType: "report",
    metadata: { view, range, timezone, rowCount: rows.length - 1 },
  });
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payout-${view}-${range}.csv"`,
    },
  });
}
