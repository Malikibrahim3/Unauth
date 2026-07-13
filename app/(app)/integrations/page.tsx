import Link from "next/link";
import { redirect } from "next/navigation";
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
import { PanelCard } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["connected", "import_complete", "importing"]);
const ATTENTION = new Set(["error", "attention_required", "revoked"]);

function ConnectorCard({ item }: { item: ConnectorCatalogueItem }) {
  return (
    <Link
      href={`/integrations/${item.id}`}
      className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <PanelCard
        variant="app"
        className="h-full p-4 transition-colors hover:border-[var(--accent)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {item.name}
            </h3>
            <p className="mt-1 text-xs capitalize text-[var(--text-tertiary)]">
              {item.category.replaceAll("_", " ")}
            </p>
          </div>
          <StatusBadge family="workflowStatus" value={item.status === "import_complete" ? "connected" : item.status} />
        </div>
        <p className="mt-3 min-h-10 text-xs leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-muted)] pt-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
              Imported
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums">
              {formatNumber(item.importedRecords)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
              Freshness
            </dt>
            <dd className="mt-1 text-xs font-medium">
              {item.lastSuccessfulSyncAt
                ? formatDateTime(item.lastSuccessfulSyncAt)
                : ACTIVE.has(item.status)
                  ? "Initial import pending"
                  : "No successful sync"}
            </dd>
          </div>
        </dl>
        {item.lastError ? (
          <p
            role="status"
            className="mt-3 line-clamp-2 text-xs text-[var(--danger)]"
          >
            {item.lastError}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-[var(--accent)]">
          View connection →
        </p>
      </PanelCard>
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
  const catalogue = await loadConnectorCatalogue(service, ctx.merchantId);
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
    <main className="mx-auto max-w-7xl space-y-7 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
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
      <dl className="grid gap-3 sm:grid-cols-3">
        <PanelCard variant="appInset" className="p-4">
          <dt className="text-xs text-[var(--text-secondary)]">
            Connected providers
          </dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">
            {connected.length}
          </dd>
        </PanelCard>
        <PanelCard variant="appInset" className="p-4">
          <dt className="text-xs text-[var(--text-secondary)]">
            Imported records
          </dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">
            {formatNumber(imported)}
          </dd>
        </PanelCard>
        <PanelCard variant="appInset" className="p-4">
          <dt className="text-xs text-[var(--text-secondary)]">
            Covered categories
          </dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">
            {categories}
          </dd>
        </PanelCard>
      </dl>
      {groups.map((group) =>
        group.items.length ? (
          <section
            key={group.title}
            aria-labelledby={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
          >
            <div>
              <h2
                id={`connector-${group.title.toLowerCase().replaceAll(" ", "-")}`}
                className="text-base font-semibold"
              >
                {group.title}{" "}
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  {group.items.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {group.description}
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <ConnectorCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </main>
  );
}
