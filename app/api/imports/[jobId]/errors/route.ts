import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { createScopedClient } from "@/lib/supabase/scoped";
import { TABLES } from "@/lib/supabase/tables";
import { buildErrorReportCsv } from "@/lib/imports/csv/errorReport";
import type { RowError } from "@/lib/imports/csv/processor";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;
  const { jobId } = await params;
  const scoped = createScopedClient(ctx.merchantId, service);
  const { data, error } = await scoped.from(TABLES.PROCESSING_JOBS).select("id,error_log").eq("id", jobId).eq("job_kind", "csv_import").maybeSingle();
  if (error) return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const raw = Array.isArray(data.error_log) ? data.error_log : [];
  const errors = raw.flatMap((item): RowError[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const value = item as Record<string, unknown>;
    return typeof value.row === "number" && typeof value.field === "string" && typeof value.code === "string" && typeof value.message === "string"
      ? [{ row: value.row, field: value.field, code: value.code, message: value.message }]
      : [];
  });
  return new NextResponse(buildErrorReportCsv(errors), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="import-${jobId}-errors.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
