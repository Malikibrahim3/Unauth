import Link from "next/link";
import { redirect } from "next/navigation";
import { Cable, FileUp } from "lucide-react";
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
import { formatNumber } from "@/lib/utils/format";
import {
  resolveEffectiveConnectionStatus,
} from "@/lib/connections/effectiveStatus";
import { resolveConnectionReadModel } from "@/lib/connections/readModel";
import {
  ConnectorRow,
  type CatalogueRowItem,
} from "@/components/integrations/ConnectorRow";
import { CONNECTOR_GRID_CLASS } from "@/components/integrations/connectorGrid";
import { DeferredLiveConnectionVerification } from "@/components/integrations/DeferredLiveConnectionVerification";
import { ShipBobIntegrationBanner } from "@/components/integrations/ShipBobIntegrationBanner";
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";

export const dynamic = "force-dynamic";

// A provider is operational only when the badge can be backed by a fresh
// signal. The coarse bucket intentionally stays useful for API consumers,
// while this page groups on the merchant-facing two-axis state.
const OPERATIONAL_BADGES = new Set(["healthy", "connection_verified"]);
const ATTENTION_BADGES = new Set([
  "error",
  "not_syncing",
  "stale",
  "sync_pending",
  "no_data",
  "verification_unavailable",
]);

export default async function IntegrationsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const catalogueRows = await loadConnectorCatalogue(service, ctx.merchantId);
  const catalogue: CatalogueRowItem[] = catalogueRows.map((item) => {
    // Stored sync and freshness state renders immediately; the deferred live
    // verification endpoint refreshes those canonical rows after first paint.
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
  const connected = catalogue.filter((item) => item.readModel?.operational === "healthy");
  const attention = catalogue.filter((item) => item.readModel?.operational === "attention");
  const manual = catalogue.filter(
    (item) =>
      item.category === "documents" &&
      !OPERATIONAL_BADGES.has(item.badge) &&
      !ATTENTION_BADGES.has(item.badge),
  );
  const planned = catalogue.filter(
    (item) =>
      item.stage === "planned" &&
      !OPERATIONAL_BADGES.has(item.badge) &&
      !ATTENTION_BADGES.has(item.badge),
  );
  const available = catalogue.filter(
    (item) =>
      !OPERATIONAL_BADGES.has(item.badge) &&
      !ATTENTION_BADGES.has(item.badge) &&
      item.category !== "documents" &&
      item.stage !== "planned" &&
      item.connectEnabled,
  );
  const imported = catalogue.reduce(
    (sum, item) => sum + item.importedRecords,
    0,
  );
  const categories = new Set(connected.map((item) => item.category)).size;
  const groups: Array<{
    title: string;
    description: string;
    items: CatalogueRowItem[];
  }> = [
    {
      title: "Needs attention",
      description:
        "Credentials, webhooks or imports require an operator action.",
      items: attention,
    },
    {
      title: "Operational",
      description:
        "Live accounts with a fresh source signal and imported-record evidence.",
      items: connected,
    },
    {
      title: "Available",
      description: "Verified or beta connectors that can be configured now.",
      items: available,
    },
    {
      title: "Manual evidence",
      description:
        "Upload records and liability documents manually — no live connection needed.",
      items: manual,
    },
    {
      title: "Planned",
      description:
        "Visible capability commitments with connection controls intentionally unavailable.",
      items: planned,
    },
  ];
  return (
    <>
      <ShipBobIntegrationBanner />
      <DeferredLiveConnectionVerification />
      <WorkbenchPage
      title="Integrations"
      subtitle="Connect your store, helpdesk, and carriers. We’ll tell you when data stops flowing."
      actions={
        <Link
          href="/integrations/imports"
          className="inline-flex h-7 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 text-[length:var(--ua-text-micro-size)] font-semibold text-[var(--ua-text-primary)]"
          data-capability-id="integrations.import"
        >
          Import records
        </Link>
      }
      kpiItems={[
        { label: "Operational providers", value: formatNumber(connected.length), hint: "Fresh source signals" },
        { label: "Imported records", value: formatNumber(imported), hint: "Across connected sources" },
        { label: "Covered categories", value: formatNumber(categories), hint: "Operational evidence types" },
      ]}
      primaryVisual={
        <KeyInsightCallout
          tone={attention.length > 0 ? 'warning' : connected.length > 0 ? 'success' : 'neutral'}
          icon={<Cable size={16} />}
        >
          <strong>{formatNumber(connected.length)}</strong> providers operational
          {attention.length > 0 ? <> · <strong>{formatNumber(attention.length)}</strong> need attention</> : null}
          {' '}· <strong>{formatNumber(imported)}</strong> records imported.
        </KeyInsightCallout>
      }
      rail={
        <SummaryRail
          sections={[
            {
              title: 'Source health',
              rows: [
                { label: 'Needs attention', value: formatNumber(attention.length), tone: 'danger', bar: catalogue.length ? attention.length / catalogue.length : 0 },
                { label: 'Operational', value: formatNumber(connected.length), tone: 'success', bar: catalogue.length ? connected.length / catalogue.length : 0 },
                { label: 'Available', value: formatNumber(available.length), tone: 'neutral', bar: catalogue.length ? available.length / catalogue.length : 0 },
                { label: 'Manual evidence', value: formatNumber(manual.length), tone: 'neutral', bar: catalogue.length ? manual.length / catalogue.length : 0 },
                { label: 'Planned', value: formatNumber(planned.length), tone: 'neutral', bar: catalogue.length ? planned.length / catalogue.length : 0 },
              ],
              footnote: 'Shows the last known connection state; live checks run when you open this page.',
            },
          ]}
        />
      }
      main={
        <div className="divide-y divide-[var(--ua-border-subtle)]">
        {groups.map((group) =>
        group.items.length ? (
          <section
            key={group.title}
            aria-labelledby={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
            className="p-4"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--ua-surface-selected)] text-[var(--ua-text-primary)]">
                {group.title === "Manual evidence" ? <FileUp size={15} aria-hidden="true" /> : <Cable size={15} aria-hidden="true" />}
              </span>
              <div>
              <h2
                id={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
                className="text-[length:var(--ua-text-small-size)] font-semibold"
              >
                {group.title}{" "}
                <span className="text-xs tabular-nums text-[var(--ua-text-tertiary)]">
                  {group.items.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
                {group.description}
              </p>
              <p className="mt-1 text-[length:var(--ua-text-micro-size)] font-medium text-[var(--ua-text-primary)] xl:hidden">
                Open a provider for full coverage and freshness details
              </p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)]">
              <div className="hidden xl:block">
                <div className={`ua-panel-header ${CONNECTOR_GRID_CLASS} px-4 py-2.5 text-[length:var(--ua-text-micro-size)] font-semibold text-[var(--ua-text-tertiary)]`}>
                  <span>Provider</span>
                  <span>Status</span>
                  <span>Coverage</span>
                  <span className="text-right">Imported</span>
                  <span>Last activity</span>
                  <span aria-hidden="true" />
                </div>
              </div>
              {group.items.map((item) => <ConnectorRow key={item.id} item={item} />)}
            </div>
          </section>
        ) : null,
      )}
        </div>
      }
      />
    </>
  );
}
