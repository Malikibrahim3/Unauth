import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { ImportJobDetail, type ImportJobRecord } from "@/components/imports/ImportJobDetail";

export const dynamic = "force-dynamic";

export default async function ImportJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) redirect("/sources/connected");
  const { jobId } = await params;
  const { data, error } = await service
    .from(TABLES.PROCESSING_JOBS)
    .select("id,job_kind,source,status,label,storage_path,file_hash,column_map,total_rows,processed_rows,failed_rows,error_log,created_at,started_at,completed_at,updated_at,attempts,max_attempts,next_attempt_at,last_error_code,cursor")
    .eq("merchant_id", ctx.merchantId)
    .eq("id", jobId)
    .eq("job_kind", "csv_import")
    .maybeSingle();
  if (error) throw new Error(`import_job_failed: ${error.message}`);
  if (!data) notFound();
  return <ImportJobDetail job={data as ImportJobRecord} />;
}
