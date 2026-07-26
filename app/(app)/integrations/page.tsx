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
import { resolveEffectiveConnectionStatus } from "@/lib/connections/effectiveStatus";
import { resolveConnectionReadModel } from "@/lib/connections/readModel";
import {
  type CatalogueRowItem,
} from "@/components/integrations/ConnectorRow";
import { IntegrationsTabs, type IntegrationsView } from "@/components/integrations/IntegrationsTabs";
import { IntegrationsWorkspace } from "@/components/integrations/IntegrationsWorkspace";
import { DeferredLiveConnectionVerification } from "@/components/integrations/DeferredLiveConnectionVerification";
import { ShipBobIntegrationBanner } from "@/components/integrations/ShipBobIntegrationBanner";
import { ButtonLink } from "@/components/ui";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

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
    const effective = resolveEffectiveConnectionStatus(null, item.syncState, item.freshness);
    return {
      ...item,
      status: effective.bucket,
      badge: effective.badge,
      lastError: effective.note,
      noteTone: effective.noteTone,
      readModel: resolveConnectionReadModel({
        providerId: item.id,
        syncState: item.syncState,
        freshness: item.freshness,
        lastVerifiedAt: item.lastVerifiedAt,
        importedRecords: item.importedRecords,
      }),
    };
  });

  const connectedCount = catalogue.filter((item) => item.connectionCount > 0 || item.connectionId !== null || item.status !== "not_connected").length;
  const view = resolveView((await searchParams)?.view, connectedCount > 0);

  return (
    <>
      <ShipBobIntegrationBanner />
      <DeferredLiveConnectionVerification />
      <AuthenticatedPageHeader
        title="Integrations"
        subtitle="Manage the tools that feed evidence into Unauth, or add a new source to your stack."
        actions={
          view === "browse" ? (
            <ButtonLink href="/integrations?view=connected" variant="secondary" size="sm">View connections</ButtonLink>
          ) : (
            <ButtonLink href="/integrations?view=browse" size="sm" leadingIcon={<Plus size={14} />}>Add integration</ButtonLink>
          )
        }
        tabs={<IntegrationsTabs active={view} connectedCount={connectedCount} catalogueCount={catalogue.filter((item) => item.category !== "documents").length} />}
      />
      <div className={pageStyles.pageBody}>
        <IntegrationsWorkspace items={catalogue} initialView={view} />
        <Link href="/integrations/imports" className="sr-only">Open imports and API workspace</Link>
      </div>
    </>
  );
}
