import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { Boxes, Cable, Database, FileUp } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import { formatNumber } from "@/lib/utils/format";
import { getConnectionState } from "@/lib/connections/getConnectionState";
import { verifyMerchantLiveConnections } from "@/lib/connections/liveVerification";
import {
  isLiveCredentialCheckSupported,
  resolveEffectiveConnectionStatus,
} from "@/lib/connections/effectiveStatus";
import {
  ConnectorRow,
  type CatalogueRowItem,
} from "@/components/integrations/ConnectorRow";

export const dynamic = "force-dynamic";

// Raw merchant_integrations status values treated as "actively connected" for
// the pre-merge "was a live probe even expected" guard below.
const RAW_ACTIVE_STATUSES = new Set(["connected", "active", "import_complete", "importing"]);
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
  const [catalogueRows, connectionState, liveHealth] = await Promise.all([
    loadConnectorCatalogue(service, ctx.merchantId),
    getConnectionState(service, ctx.merchantId),
    verifyMerchantLiveConnections(service, ctx.merchantId),
  ]);
  const catalogue: CatalogueRowItem[] = catalogueRows.map((item) => {
    const isOrderSource = item.id === connectionState.orderSourcePlatform;
    const isHelpdesk = item.id === connectionState.helpdeskProvider;
    const providerHasLiveCheck = isLiveCredentialCheckSupported(item.id);
    const isActiveSelection = item.id === "shopify" ? isOrderSource : item.id === "gorgias" ? isHelpdesk : true;
    const isActiveProbedProvider = providerHasLiveCheck && isActiveSelection;
    const health = item.id === "shopify" && isOrderSource
      ? liveHealth.shopify
      : item.id === "gorgias" && isHelpdesk
        ? liveHealth.gorgias
        : item.id === "shipbob" || item.id === "ups" || item.id === "fedex"
          ? liveHealth[item.id]
          : null;

    // A probe was expected (this is the merchant's active platform for this
    // category) but no checkable row was found at all — a cross-table data
    // inconsistency, not a normal freshness signal, so it stays a hard flag.
    if (isActiveProbedProvider && !health && RAW_ACTIVE_STATUSES.has(item.status)) {
      return {
        ...item,
        status: "attention_required",
        badge: "not_syncing",
        lastError: "Live verification is unavailable. We will retry automatically.",
        noteTone: "warning",
      };
    }

    const effective = resolveEffectiveConnectionStatus(health, item.syncState, item.freshness);
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
        "Auditable imports and liability documents without a live provider connection.",
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
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-7 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] md:p-6">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Configuration</p>
          <h1 className="mt-1 text-2xl font-semibold">Integrations</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
            Connect your store, helpdesk, and carriers. We&apos;ll tell you when
            data stops flowing.
          </p>
        </div>
        <Link
          href="/integrations/imports"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Import records
        </Link>
      </header>
      <dl className="ua-focal-panel grid overflow-hidden rounded-[var(--radius-lg)] sm:grid-cols-3">
        <div className="ua-metric-card flex items-center gap-3 border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r">
          <span className="ua-identity-tile flex h-9 w-9 items-center justify-center"><Cable size={17} aria-hidden="true" /></span>
          <div>
          <dt className="text-xs text-[var(--text-secondary)]">Connected providers</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{connected.length}</dd>
          </div>
        </div>
        <div className="ua-metric-card flex items-center gap-3 border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r" style={{ '--metric-accent': 'var(--info)' } as CSSProperties}>
          <span className="ua-identity-tile flex h-9 w-9 items-center justify-center"><Database size={17} aria-hidden="true" /></span>
          <div>
          <dt className="text-xs text-[var(--text-secondary)]">Imported records</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(imported)}</dd>
          </div>
        </div>
        <div className="ua-metric-card flex items-center gap-3 p-4" style={{ '--metric-accent': 'var(--success)' } as CSSProperties}>
          <span className="ua-identity-tile flex h-9 w-9 items-center justify-center"><Boxes size={17} aria-hidden="true" /></span>
          <div>
          <dt className="text-xs text-[var(--text-secondary)]">Covered categories</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{categories}</dd>
          </div>
        </div>
      </dl>
      {groups.map((group) =>
        group.items.length ? (
          <section
            key={group.title}
            aria-labelledby={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-selected)] text-[var(--brand-deep)]">
                {group.title === "Manual evidence" ? <FileUp size={15} aria-hidden="true" /> : <Cable size={15} aria-hidden="true" />}
              </span>
              <div>
              <h2
                id={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
                className="text-base font-semibold"
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
            <div className="ua-section-panel mt-3 overflow-x-auto rounded-[var(--radius-lg)]">
              <div className="ua-panel-header grid min-w-[820px] grid-cols-[minmax(220px,1.35fr)_150px_minmax(240px,1.4fr)_100px_160px_24px] gap-4 px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)]">
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
  );
}
