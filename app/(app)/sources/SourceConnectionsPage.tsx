import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
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
import type { CatalogueRowItem, IntegrationsView } from "@/lib/integrations/catalogueView";
import { DeferredLiveConnectionVerification } from "@/components/integrations/DeferredLiveConnectionVerification";
import { ShipBobIntegrationBanner } from "@/components/integrations/ShipBobIntegrationBanner";
import { ButtonLink } from "@/components/ui";
import { PageFrame } from "@/components/ui/PageFrame";
import { SourcesOperations } from "@/components/sources/SourcesOperations";
import {
  evaluateSourceReadiness,
  type RequiredEvidenceLayerId,
} from "@/lib/sources/evidenceReadiness";

export const dynamic = "force-dynamic";

type SourceSearchParams = {
  view?: string;
  status?: string;
  category?: string;
  layer?: string;
  q?: string;
};

function resolveView(value: string | undefined, defaultView: Exclude<IntegrationsView, "imports">): Exclude<IntegrationsView, "imports"> {
  if (value === "browse") return "browse";
  if (value === "connected") return "connected";
  return defaultView;
}

export default async function IntegrationsPage({
  searchParams,
  defaultView = "connected",
}: {
  searchParams?: Promise<SourceSearchParams>;
  defaultView?: Exclude<IntegrationsView, "imports">;
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
      liveVerification: item.liveVerification,
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

  const resolvedSearch = await searchParams;
  const view = resolveView(resolvedSearch?.view, defaultView);
  const readiness = evaluateSourceReadiness(catalogue);
  const firstMissingLayer = readiness.firstMissingLayer?.id ?? null;
  const setupHref = firstMissingLayer
    ? `/sources/browse?layer=${encodeURIComponent(firstMissingLayer)}`
    : "/sources/browse";
  const setupLabel = readiness.ready ? "Add another source" : "Complete source setup";
  const initialStatus = ["all", "connected", "not_connected", "attention", "planned"].includes(resolvedSearch?.status ?? "")
    ? resolvedSearch?.status as "all" | "connected" | "not_connected" | "attention" | "planned"
    : "all";
  const categoryToLayer: Record<string, RequiredEvidenceLayerId | undefined> = {
    commerce: "commerce",
    helpdesk: "support",
    warehouse_3pl: "fulfilment",
    returns: "fulfilment",
    carrier: "delivery",
    tracking: "delivery",
    payments_disputes: "payments",
  };
  const initialLayer = resolvedSearch?.layer && ["commerce", "support", "fulfilment", "delivery", "payments", "supplemental"].includes(resolvedSearch.layer)
    ? resolvedSearch.layer as RequiredEvidenceLayerId | "supplemental"
    : categoryToLayer[resolvedSearch?.category ?? ""] ?? "all";

  return (
    <>
      <ShipBobIntegrationBanner />
      <DeferredLiveConnectionVerification />
      <PageFrame
        surfaceId={view === "browse" ? "source-catalogue" : "connected-sources"}
        archetype={view === "browse" ? "P5-catalogue" : "P5-registry"}
        title="Sources"
        breadcrumbs={[
          { label: "Unauth", href: "/overview" },
          { label: view === "browse" ? "Source catalogue" : "Connected sources" },
        ]}
        subtitle="Connect the systems Unauth uses to assemble complete order, support, fulfilment, delivery and payment evidence."
        actions={
          <>
            {view === "browse" ? <ButtonLink href="/sources/connected?view=connected" variant="secondary" size="sm">View connections</ButtonLink> : null}
            <ButtonLink href={setupHref} size="sm" leadingIcon={readiness.ready ? <Plus size={14} /> : <ArrowRight size={14} />}>
              {setupLabel}
            </ButtonLink>
          </>
        }
      >
        <SourcesOperations
          items={catalogue}
          view={view}
          initialQuery={resolvedSearch?.q ?? ""}
          initialStatus={initialStatus}
          initialLayer={initialLayer}
        />
      </PageFrame>
    </>
  );
}
