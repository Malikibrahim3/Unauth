import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import {
  PERMISSIONS,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
// RUN-18: the validating entry point, so no consumer can skip the
// impossible-state check.
import { connectionReadModel } from "@/lib/connections/readModel";
import {
  type CatalogueRowItem,
} from "@/components/integrations/ConnectorRow";
import { IntegrationsTabs, type IntegrationsView } from "@/components/integrations/IntegrationsTabs";
import { IntegrationsWorkspace } from "@/components/integrations/IntegrationsWorkspace";
import { DeferredLiveConnectionVerification } from "@/components/integrations/DeferredLiveConnectionVerification";
import { ShipBobIntegrationBanner } from "@/components/integrations/ShipBobIntegrationBanner";
import { ButtonLink } from "@/components/ui";
import { PageFrame } from "@/components/ui/PageFrame";

export const dynamic = "force-dynamic";

function resolveView(value: string | undefined, hasConnections: boolean): Exclude<IntegrationsView, "imports"> {
  if (value === "browse") return "browse";
  if (value === "connected") return "connected";
  return hasConnections ? "connected" : "browse";
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));

  const catalogueRows = await loadConnectorCatalogue(service, ctx.merchantId);
  const catalogue: CatalogueRowItem[] = catalogueRows.map((item) => {
    /*
     * RUN-18: the row's status, badge and note come from the canonical model,
     * not from a parallel resolve. Two sources of truth on one row is exactly
     * how the summary, the row and the sidebar came to disagree.
     */
    const readModel = connectionReadModel({
      providerId: item.id,
      syncState: item.syncState,
      freshness: item.freshness,
      lastVerifiedAt: item.lastVerifiedAt,
      importedRecords: item.importedRecords,
    });
    return {
      ...item,
      status: readModel.bucket,
      badge: readModel.badge,
      lastError: readModel.note,
      noteTone: readModel.noteTone,
      readModel,
    };
  });

  const connectedCount = catalogue.filter((item) => item.connectionCount > 0 || item.connectionId !== null || item.status !== "not_connected").length;
  const plannedCount = catalogue.filter((item) => item.stage === "planned").length;
  const browseCount = catalogue.filter((item) => item.category !== "documents" && item.stage !== "planned").length + plannedCount;
  const view = resolveView((await searchParams)?.view, connectedCount > 0);

  return (
    <>
      <ShipBobIntegrationBanner />
      <DeferredLiveConnectionVerification />
      <PageFrame
        title="Sources"
        subtitle="Manage the systems that feed evidence into Unauth, or add a new source to your stack."
        actions={
          view === "browse" ? (
            <ButtonLink href="/sources/connected?view=connected" variant="secondary" size="sm">View connections</ButtonLink>
          ) : (
            <ButtonLink href="/sources/browse" size="sm" leadingIcon={<Plus size={14} />}>Add source</ButtonLink>
          )
        }
        tabs={<IntegrationsTabs active={view} connectedCount={connectedCount} catalogueCount={browseCount} />}
      >
        <IntegrationsWorkspace items={catalogue} initialView={view} />
        <Link href="/sources/imports" className="sr-only">Open imports workspace</Link>
      </PageFrame>
    </>
  );
}
