import Link from "next/link";
import { redirect } from "next/navigation";
import { Cable, FileUp } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import { formatNumber } from "@/lib/utils/format";
import {
  resolveEffectiveConnectionStatus,
} from "@/lib/connections/effectiveStatus";
import {
  ConnectorRow,
  type CatalogueRowItem,
} from "@/components/integrations/ConnectorRow";
import { CONNECTOR_GRID_CLASS } from "@/components/integrations/connectorGrid";
import { DeferredLiveConnectionVerification } from "@/components/integrations/DeferredLiveConnectionVerification";
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";

export const dynamic = "force-dynamic";

// Post-merge bucket sets — grouping only, the finer badge drives the copy.
const ACTIVE_BUCKETS = new Set(["connected"]);
const ATTENTION_BUCKETS = new Set(["error", "attention_required"]);

export default async function IntegrationsPage() {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied || !ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const catalogueRows = await loadConnectorCatalogue(service, ctx.merchantId);
  const catalogue: CatalogueRowItem[] = catalogueRows.map((item) => {
    // Stored sync and freshness state renders immediately; the deferred live
    // verification endpoint refreshes those canonical rows after first paint.
    const effective = resolveEffectiveConnectionStatus(null, item.syncState, item.freshness);
    return { ...item, status: effective.bucket, badge: effective.badge, lastError: effective.note, noteTone: effective.noteTone };
  });
  const connected = catalogue.filter((item) => ACTIVE_BUCKETS.has(item.status));
  const attention = catalogue.filter((item) => ATTENTION_BUCKETS.has(item.status));
  const manual = catalogue.filter(
    (item) =>
      item.category === "documents" &&
      !ACTIVE_BUCKETS.has(item.status) &&
      !ATTENTION_BUCKETS.has(item.status),
  );
  const planned = catalogue.filter(
    (item) =>
      item.stage === "planned" &&
      !ACTIVE_BUCKETS.has(item.status) &&
      !ATTENTION_BUCKETS.has(item.status),
  );
  const available = catalogue.filter(
    (item) =>
      !ACTIVE_BUCKETS.has(item.status) &&
      !ATTENTION_BUCKETS.has(item.status) &&
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
      title: "Connected",
      description:
        "Live accounts with source freshness and imported-record evidence.",
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
      <DeferredLiveConnectionVerification />
      <WorkbenchPage
      title="Integrations"
      subtitle="Connect your store, helpdesk, and carriers. We’ll tell you when data stops flowing."
      actions={
        <Link
          href="/integrations/imports"
          className="inline-flex h-7 items-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
          data-capability-id="integrations.import"
        >
          Import records
        </Link>
      }
      kpiItems={[
        { label: "Connected providers", value: formatNumber(connected.length), hint: "Live provider accounts" },
        { label: "Imported records", value: formatNumber(imported), hint: "Across connected sources" },
        { label: "Covered categories", value: formatNumber(categories), hint: "Operational evidence types" },
      ]}
      primaryVisual={
        <KeyInsightCallout
          eyebrow="Source health"
          tone={attention.length > 0 ? 'warning' : connected.length > 0 ? 'success' : 'neutral'}
          icon={<Cable size={16} />}
        >
          <strong>{formatNumber(connected.length)}</strong> providers connected
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
                { label: 'Connected', value: formatNumber(connected.length), tone: 'success', bar: catalogue.length ? connected.length / catalogue.length : 0 },
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
        <div className="divide-y divide-[var(--border-muted)]">
        {groups.map((group) =>
        group.items.length ? (
          <section
            key={group.title}
            aria-labelledby={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
            className="p-4"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-selected)] text-[var(--brand-deep)]">
                {group.title === "Manual evidence" ? <FileUp size={15} aria-hidden="true" /> : <Cable size={15} aria-hidden="true" />}
              </span>
              <div>
              <h2
                id={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
                className="text-[13px] font-semibold"
              >
                {group.title}{" "}
                <span className="text-xs tabular-nums text-[var(--text-tertiary)]">
                  {group.items.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {group.description}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[var(--brand-deep)] md:hidden">
                Swipe for coverage and freshness
              </p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto rounded-[var(--ua-radius-card)] border border-[var(--border)]">
              <div className={`ua-panel-header ${CONNECTOR_GRID_CLASS} px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)]`}>
                <span>Provider</span>
                <span>Status</span>
                <span>Coverage</span>
                <span className="text-right">Imported</span>
                <span>Last activity</span>
                <span aria-hidden="true" />
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
