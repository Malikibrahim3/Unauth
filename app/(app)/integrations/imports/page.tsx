import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import {
  CanonicalCsvImportClient,
  type ImportHistoryItem,
} from "@/components/imports/CanonicalCsvImportClient";
import { IntegrationsTabs } from "@/components/integrations/IntegrationsTabs";
import { PageFrame } from "@/components/ui/PageFrame";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import records" };

export default async function ImportsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied || !ctx) redirect("/integrations");
  const [{ data, error }, catalogue] = await Promise.all([
    service
    .from(TABLES.PROCESSING_JOBS)
    .select(
      "id,label,status,total_rows,processed_rows,failed_rows,created_at,completed_at",
    )
    .eq("merchant_id", ctx.merchantId)
    .eq("job_kind", "csv_import")
    .order("created_at", { ascending: false })
    .limit(20),
    loadConnectorCatalogue(service, ctx.merchantId),
  ]);
  if (error) throw new Error(`import_history_failed: ${error.message}`);
  return (
    <PageFrame
      title="Import records"
      subtitle="Validate and map orders, refunds or customers before any write. Valid rows import independently; invalid rows remain visible and every persisted record carries CSV provenance."
      breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Import records" }]}
      tabs={
        <IntegrationsTabs
          active="imports"
          connectedCount={catalogue.filter((item) => item.connectionCount > 0 || item.connectionId !== null || item.status !== "not_connected").length}
          catalogueCount={catalogue.filter((item) => item.category !== "documents").length}
        />
      }
    >
      <CanonicalCsvImportClient history={(data ?? []) as ImportHistoryItem[]} />
    </PageFrame>
  );
}
