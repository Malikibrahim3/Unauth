import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { resolveEffectiveConnectionStatus } from "@/lib/connections/effectiveStatus";
import type { ConnectorFreshness } from "@/lib/connections/freshness";
import type { ConnectorCatalogueItem } from "@/lib/connectors/catalogue";
import { ConnectorRow, type CatalogueRowItem } from "@/components/integrations/ConnectorRow";
import { ConnectionHealthHeader, ConnectionHealthGrid } from "@/components/integrations/ConnectionHealthPanel";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

export const dynamic = "force-dynamic";

/**
 * DEV-ONLY status preview — renders the real list row and provider-detail
 * presentation components (ConnectorRow, ConnectionHealthHeader,
 * ConnectionHealthGrid) driven by the real resolveEffectiveConnectionStatus,
 * for the two on-demand-provider states that can't be produced by any
 * currently-available real credential (UPS/FedEx "connection_verified" and
 * "verification_unavailable" — reaching them for real requires either a
 * live carrier OAuth sandbox or a genuine network-level inconclusive
 * result, neither available/safe to fabricate here).
 *
 * Safety:
 *  - 404s outright in production (server-side env check, no client-supplied
 *    query param or header can influence this — nothing here reads request
 *    input at all).
 *  - Behind the same authentication + VIEW_SETTINGS permission check as the
 *    real integrations pages.
 *  - Never touches merchant_integrations/store_connections/helpdesk_connections
 *    or any other table — every field below is an in-memory literal.
 *
 * Remove this route once the two states have been visually verified, or
 * keep it (documented, guarded as above) as a standing dev tool — see the
 * project's integration-health hardening report for the decision made.
 */
export default async function IntegrationHealthDevPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied || !ctx) redirect("/dashboard");

  const onDemandFreshness: ConnectorFreshness = {
    confidence: "unavailable",
    deliveryModel: "on_demand",
    lastDataReceivedAt: null,
    lastSyncAttemptAt: null,
    reason: "on_demand_provider",
  };

  const baseItem: ConnectorCatalogueItem = {
    id: "ups",
    name: "UPS",
    description: "Direct UPS tracking, scan history, and delivery proof when available.",
    category: "carrier",
    authMode: "api_key",
    // Matches UPS's real derived stage: connects and does something real
    // (on-demand tracking evidence), but has no ongoing sync lifecycle and
    // its health check only refreshes a token — see upsProvider.lifecycle.
    stage: "partial",
    lifecycle: [],
    runtimeVerificationPending: true,
    pendingRuntimeCapabilities: ["connect", "account_verification", "reconnect", "disconnect", "freshness_health"],
    status: "connected",
    syncState: "import_queued",
    freshness: onDemandFreshness,
    connectionId: "preview-connection",
    connectionCount: 1,
    account: "Preview UPS account",
    lastSyncAttemptAt: null,
    lastSuccessfulSyncAt: null,
    lastDataReceivedAt: null,
    lastVerifiedAt: "2026-07-17T00:00:00.000Z",
    lastError: null,
    importedRecords: 0,
    scopes: ["tracking_read"],
    capabilities: [],
    connectEnabled: true,
  };

  // Real function, real precedence — not a hardcoded badge string.
  const verified = resolveEffectiveConnectionStatus({ status: "verified" }, baseItem.syncState, onDemandFreshness);
  const inconclusive = resolveEffectiveConnectionStatus({ status: "inconclusive", reason: "network_or_timeout" }, baseItem.syncState, onDemandFreshness);

  const connectionVerifiedItem: CatalogueRowItem = {
    ...baseItem,
    status: verified.bucket,
    badge: verified.badge,
    lastError: verified.note,
    noteTone: verified.noteTone,
  };
  const verificationUnavailableItem: CatalogueRowItem = {
    ...baseItem,
    status: inconclusive.bucket,
    badge: inconclusive.badge,
    lastError: inconclusive.note,
    noteTone: inconclusive.noteTone,
  };

  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Development tool"
        title="Integration health states"
        subtitle="Real integration components rendered against guarded, in-memory provider states. This route is unavailable in production."
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Status preview" }]}
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.workbenchStack}>
          <AuthenticatedPanel bodyClassName="px-4 py-3 text-[11px] leading-5 text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Dev-only preview.</strong>{" "}
            These states use the real status resolver and presentation components without writing to any connection table.
          </AuthenticatedPanel>

          <AuthenticatedPanel
            title="Connection verified"
            description="On-demand provider with a conclusive credential check."
            bodyClassName="grid gap-3 p-3"
          >
            <div className="overflow-x-auto rounded-[var(--ua-radius-input)] border border-[var(--border-muted)]">
              <ConnectorRow item={connectionVerifiedItem} />
            </div>
            <ConnectionHealthHeader item={connectionVerifiedItem} />
            <ConnectionHealthGrid item={connectionVerifiedItem} />
          </AuthenticatedPanel>

          <AuthenticatedPanel
            title="Verification unavailable"
            description="On-demand provider with an inconclusive network-level check."
            bodyClassName="grid gap-3 p-3"
          >
            <div className="overflow-x-auto rounded-[var(--ua-radius-input)] border border-[var(--border-muted)]">
              <ConnectorRow item={verificationUnavailableItem} />
            </div>
            <ConnectionHealthHeader item={verificationUnavailableItem} />
            <ConnectionHealthGrid item={verificationUnavailableItem} />
          </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
