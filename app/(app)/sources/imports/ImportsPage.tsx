import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  CanonicalCsvImportClient,
  type ImportHistoryItem,
} from "@/components/imports/CanonicalCsvImportClient";
import { PageFrame } from "@/components/ui/PageFrame";
import { HandoffKpiGrid } from "@/components/ui/HandoffKpiGrid";
import { formatNumber } from "@/lib/utils/format";
import Link from "@/components/navigation/AppNavLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import records" };

export default async function ImportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ step?: string }>;
}) {
  const resolvedSearch = await (searchParams ?? Promise.resolve<{ step?: string }>({}));
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied || !ctx) redirect("/sources/connected");
  const { data, error } = await service
    .from(TABLES.PROCESSING_JOBS)
    .select(
      "id,label,status,total_rows,processed_rows,failed_rows,created_at,completed_at,cursor,error_log",
    )
    .eq("merchant_id", ctx.merchantId)
    .eq("job_kind", "csv_import")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`import_history_failed: ${error.message}`);
  const history = (data ?? []) as ImportHistoryItem[];
  const processedCountsKnown = history.every((job) => job.processed_rows != null);
  const rejectedCountsKnown = history.every((job) => job.failed_rows != null);
  const rowsProcessed = processedCountsKnown ? history.reduce((sum, job) => sum + (job.processed_rows ?? 0), 0) : null;
  const rowsRejected = rejectedCountsKnown ? history.reduce((sum, job) => sum + (job.failed_rows ?? 0), 0) : null;
  const awaitingReview = history.filter((job) => !['committed', 'completed', 'failed'].includes(job.status ?? '')).length;
  return (
    <PageFrame
      surfaceId="csv-imports"
      archetype="P8-import-workbench"
      title="Imports"
      breadcrumbs={[{ label: "Sources", href: "/sources/connected" }, { label: "Imports" }]}
      showCurrentBreadcrumb
      actions={
        <>
          <Link href="/sources/imports" className="ua-button ua-button--secondary ua-button--sm">Import history</Link>
          <Link href="/sources/imports?step=upload" className="ua-button ua-button--primary ua-button--sm">Upload file</Link>
        </>
      }
      metrics={
        <HandoffKpiGrid
          label="Import summary"
          items={[
            { label: 'Jobs, 30 days', value: formatNumber(history.length), detail: `${history.filter((job) => ['committed', 'completed'].includes(job.status)).length} committed · ${history.filter((job) => !['committed', 'completed'].includes(job.status)).length} held back` },
            { label: 'Rows processed', value: rowsProcessed == null ? '—' : formatNumber(rowsProcessed), detail: rowsProcessed == null ? 'count unavailable for one or more jobs' : `across ${history.length} ${history.length === 1 ? 'file' : 'files'}` },
            { label: 'Rows rejected', value: rowsRejected == null ? '—' : formatNumber(rowsRejected), detail: rowsRejected == null ? 'rejected-row count unavailable' : 'never written to the ledger', tone: rowsRejected == null ? undefined : rowsRejected > 0 ? 'red' : 'green' },
            { label: 'Awaiting review', value: formatNumber(awaitingReview), detail: awaitingReview ? 'not committed or terminal' : 'no jobs awaiting review', tone: awaitingReview > 0 ? 'amber' : 'green' },
          ]}
        />
      }
    >
      <div id="import-workbench"><CanonicalCsvImportClient history={history} initialStep={resolvedSearch.step} /></div>
    </PageFrame>
  );
}
