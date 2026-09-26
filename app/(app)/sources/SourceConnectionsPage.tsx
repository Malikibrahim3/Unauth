import { redirect } from "next/navigation";
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
import { SourcesOperations } from "@/components/sources/SourcesOperations";
import type { RequiredEvidenceLayerId } from "@/lib/sources/evidenceReadiness";
import {
  acceptanceScenarioFromHeaders,
  throwForAcceptanceScenario,
} from "@/lib/testing/acceptanceStateInjector";

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

  await throwForAcceptanceScenario(defaultView === "browse" ? "source-catalogue-error" : "connected-sources-error");
  const acceptanceScenario = await acceptanceScenarioFromHeaders();

  const catalogueRows = await loadConnectorCatalogue(service, ctx.merchantId);
  const catalogue: CatalogueRowItem[] = (acceptanceScenario === "connected-sources-empty" ? [] : catalogueRows).map((item) => {
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
      <section data-screen-label={view === 'browse' ? 'Provider catalogue' : 'Connected sources'} data-visual-world="supplied-package" data-surface-id={view === "browse" ? "source-catalogue" : "connected-sources"} data-archetype={view === "browse" ? "P5-catalogue" : "P5-registry"} style={{ width: '100%', maxWidth: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
        <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>{view === 'browse' ? 'Provider catalogue' : 'Connected sources'}</h1>
        <SourcesOperations
          items={catalogue}
          view={view}
          initialQuery={resolvedSearch?.q ?? ""}
          initialStatus={initialStatus}
          initialLayer={initialLayer}
        />
      </section>
    </>
  );
}
