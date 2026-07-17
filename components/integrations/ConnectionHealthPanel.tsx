import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import type { CatalogueRowItem } from "@/components/integrations/ConnectorRow";

function humanizeLabel(value: string | null | undefined): string {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

/**
 * The provider-detail page's header badge — extracted so it can be reused
 * verbatim by both the real detail page
 * (app/(app)/integrations/[provider]/page.tsx) and the dev-only status
 * preview route, guaranteeing the preview renders the exact same
 * presentation, not a re-implementation.
 */
export function ConnectionHealthHeader({ item }: { item: CatalogueRowItem }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] md:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <ProviderLogo provider={item.id} name={item.name} size="lg" />
        <div>
          <p className="text-sm capitalize text-[var(--text-secondary)]">
            {humanizeLabel(item.category)} · {humanizeLabel(item.stage)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{item.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            {item.description}
          </p>
        </div>
      </div>
      <StatusBadge family="workflowStatus" value={item.badge} />
    </header>
  );
}

/** The provider-detail page's "Action required" note + "Connection health"
 * timestamp grid — same reuse rationale as ConnectionHealthHeader above. */
export function ConnectionHealthGrid({ item }: { item: CatalogueRowItem }) {
  return (
    <>
      {item.lastError ? (
        <Card unstyled as="section" variant="flat" className="border-[var(--danger)] p-4">
          <h2 className="text-sm font-semibold text-[var(--danger)]">Action required</h2>
          <p role="alert" className="mt-1 text-sm text-[var(--text-secondary)]">
            {item.lastError}
          </p>
        </Card>
      ) : null}
      <section aria-labelledby="connection-health-title">
        <h2 id="connection-health-title" className="text-base font-semibold">
          Connection health
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Account</dt>
            <dd className="mt-1 truncate text-sm font-medium">
              {item.account ??
                (item.connectionCount
                  ? `${item.connectionCount} connected account${item.connectionCount === 1 ? "" : "s"}`
                  : "Not connected")}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Imported objects</dt>
            <dd className="mt-1 font-mono text-sm font-semibold">
              {formatNumber(item.importedRecords)}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Granted scopes</dt>
            <dd className="mt-1 text-sm font-medium">
              {item.scopes.length ? `${item.scopes.length} recorded` : "None recorded"}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Last health check</dt>
            <dd className="mt-1 text-sm font-medium">
              {item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt) : "Not yet checked"}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Last sync attempt</dt>
            <dd className="mt-1 text-sm font-medium">
              {item.lastSyncAttemptAt
                ? formatDateTime(item.lastSyncAttemptAt)
                : item.freshness.deliveryModel === "periodic_sync"
                  ? "Never"
                  : "Not applicable"}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Last successful sync</dt>
            <dd className="mt-1 text-sm font-medium">
              {item.lastSuccessfulSyncAt
                ? formatDateTime(item.lastSuccessfulSyncAt)
                : item.freshness.deliveryModel === "periodic_sync"
                  ? "No successful sync"
                  : "Not applicable"}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Last data received</dt>
            <dd className="mt-1 text-sm font-medium">
              {item.freshness.confidence === "measured"
                ? item.lastDataReceivedAt
                  ? formatDateTime(item.lastDataReceivedAt)
                  : "Never"
                : "Not measurable for this connector"}
            </dd>
          </Card>
        </dl>
      </section>
    </>
  );
}
