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
import {
  loadConnectorCatalogue,
  type ConnectorCatalogueItem,
} from "@/lib/connectors/catalogue";
import { LiveConnectionStatus } from "@/components/integrations/LiveConnectionStatus";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { getConnectionState } from "@/lib/connections/getConnectionState";
import { verifyMerchantLiveConnections } from "@/lib/connections/liveVerification";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { humanise } from "@/lib/ui/labels";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["connected", "import_complete", "importing"]);
const ATTENTION = new Set(["error", "attention_required", "revoked"]);

function categoryLabel(category: string) {
  return category === "warehouse_3pl"
    ? "Warehouse / 3PL"
    : humanise(category);
}

function ConnectorRow({ item }: { item: ConnectorCatalogueItem }) {
  const connected = ACTIVE.has(item.status);
  return (
    <Link
      href={`/integrations/${item.id}`}
      className="ua-table-row grid min-w-[820px] grid-cols-[minmax(220px,1.35fr)_150px_minmax(240px,1.4fr)_100px_160px_24px] items-center gap-4 border-b border-[var(--border-muted)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProviderLogo provider={item.id} name={item.name} />
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-[var(--text-tertiary)]">
            {item.account ?? categoryLabel(item.category)}
          </p>
        </div>
      </div>
      <div>
        <LiveConnectionStatus provider={item.id} initialStatus={item.status} />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>
        {item.lastError ? (
          <p
            role="status"
            className="mt-1 line-clamp-1 text-xs text-[var(--danger)]"
          >
            {item.lastError}
          </p>
        ) : null}
      </div>
      <p className="text-right font-semibold tabular-nums text-[var(--text-primary)]">
        {formatNumber(item.importedRecords)}
      </p>
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {item.lastSuccessfulSyncAt
          ? formatDateTime(item.lastSuccessfulSyncAt)
          : connected
            ? "Initial import pending"
            : "No successful sync"}
      </p>
      <span className="text-right text-[var(--text-tertiary)]">
        <span className="sr-only">View connection</span>
      </span>
    </Link>
  );
}

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
  const catalogue = catalogueRows.map((item) => {
    const isOrderSource = item.id === connectionState.orderSourcePlatform;
    const isHelpdesk = item.id === connectionState.helpdeskProvider;
    const health = item.id === "shopify" && isOrderSource
      ? liveHealth.shopify
      : item.id === "gorgias" && isHelpdesk
        ? liveHealth.gorgias
        : item.id === "shipbob" || item.id === "ups" || item.id === "fedex"
          ? liveHealth[item.id]
          : null;
    if (!health) {
      const liveCheckExpected = (item.id === "shopify" && isOrderSource)
        || (item.id === "gorgias" && isHelpdesk)
        || ((item.id === "shipbob" || item.id === "ups" || item.id === "fedex") && ACTIVE.has(item.status));
      return liveCheckExpected
        ? { ...item, status: "attention_required", lastError: "Live verification is unavailable. We will retry automatically." }
        : isOrderSource || isHelpdesk
          ? { ...item, status: "connected" }
          : item;
    }

    const status = health.status === "verified"
      ? "connected"
      : health.status === "failed"
        ? "error"
        : "attention_required";
    const liveError = health.status === "verified"
      ? null
      : health.status === "failed"
        ? `Live verification failed${health.reason ? `: ${health.reason}` : ". Reconnect this integration."}`
        : "Live verification could not be completed. We will retry automatically.";
    return { ...item, status, lastError: liveError };
  });
  const connected = catalogue.filter((item) => ACTIVE.has(item.status));
  const attention = catalogue.filter((item) => ATTENTION.has(item.status));
  const manual = catalogue.filter(
    (item) =>
      item.category === "documents" &&
      !ACTIVE.has(item.status) &&
      !ATTENTION.has(item.status),
  );
  const planned = catalogue.filter(
    (item) =>
      item.stage === "planned" &&
      !ACTIVE.has(item.status) &&
      !ATTENTION.has(item.status),
  );
  const available = catalogue.filter(
    (item) =>
      !ACTIVE.has(item.status) &&
      !ATTENTION.has(item.status) &&
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
    items: ConnectorCatalogueItem[];
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
                <span>Last successful sync</span>
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
