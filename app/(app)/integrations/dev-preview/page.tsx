import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { resolveEffectiveConnectionStatus } from "@/lib/connections/effectiveStatus";
import type { ConnectorFreshness } from "@/lib/connections/freshness";
import type { ConnectorCatalogueItem } from "@/lib/connectors/catalogue";
import { ConnectorRow, type CatalogueRowItem } from "@/components/integrations/ConnectorRow";
import { ConnectionHealthHeader, ConnectionHealthGrid } from "@/components/integrations/ConnectionHealthPanel";

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

  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
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
    stage: "beta",
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
    <div className="mx-auto w-full max-w-5xl space-y-10 p-4 md:p-6">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        <strong>Dev-only preview.</strong> Renders the real ConnectorRow / ConnectionHealthHeader /
        ConnectionHealthGrid components against in-memory on-demand-provider states that no available
        credential can currently reproduce live. 404s in production.
      </div>

      <section>
        <h2 className="text-base font-semibold">connection_verified — list row</h2>
        <div className="ua-section-panel mt-3 overflow-x-auto rounded-[var(--radius-lg)]">
          <ConnectorRow item={connectionVerifiedItem} />
        </div>
        <h2 className="mt-6 text-base font-semibold">connection_verified — detail presentation</h2>
        <div className="mt-3 space-y-6">
          <ConnectionHealthHeader item={connectionVerifiedItem} />
          <ConnectionHealthGrid item={connectionVerifiedItem} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">verification_unavailable — list row</h2>
        <div className="ua-section-panel mt-3 overflow-x-auto rounded-[var(--radius-lg)]">
          <ConnectorRow item={verificationUnavailableItem} />
        </div>
        <h2 className="mt-6 text-base font-semibold">verification_unavailable — detail presentation</h2>
        <div className="mt-3 space-y-6">
          <ConnectionHealthHeader item={verificationUnavailableItem} />
          <ConnectionHealthGrid item={verificationUnavailableItem} />
        </div>
      </section>
    </div>
  );
}
