import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  CanonicalCsvImportClient,
  type ImportHistoryItem,
} from "@/components/imports/CanonicalCsvImportClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import records" };

export default async function ImportsPage() {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied || !ctx) redirect("/integrations");
  const { data, error } = await service
    .from(TABLES.PROCESSING_JOBS)
    .select(
      "id,label,status,total_rows,processed_rows,failed_rows,created_at,completed_at",
    )
    .eq("merchant_id", ctx.merchantId)
    .eq("job_kind", "csv_import")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`import_history_failed: ${error.message}`);
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Link
        href="/integrations"
        className="text-sm font-semibold text-[var(--accent)]"
      >
        ← Integrations
      </Link>
      <header>
        <p className="text-sm text-[var(--text-secondary)]">
          Manual source ingestion
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Import records</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          Validate and map orders, refunds or customers before any write. Valid
          rows import independently; invalid rows remain visible and every
          persisted record carries CSV provenance.
        </p>
      </header>
      <CanonicalCsvImportClient history={(data ?? []) as ImportHistoryItem[]} />
    </div>
  );
}
