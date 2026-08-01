import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusWithReason } from "@/components/ui/StatusWithReason";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import type { CatalogueRowItem } from "@/components/integrations/ConnectorRow";

function humanizeLabel(value: string | null | undefined): string {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

function statusReason(item: CatalogueRowItem): string | null {
  if (item.lastError) return item.lastError;
  if (item.badge === "stale") return "The latest source data is outside the expected freshness window.";
  if (item.badge === "not_syncing") return "No active source sync is currently recorded.";
  if (item.badge === "sync_pending") return "The first source sync has not completed yet.";
  return null;
}

/**
 * The provider-detail page's header badge — extracted so it can be reused
 * verbatim by both the real detail page
 * (app/(app)/integrations/[provider]/page.tsx) and the dev-only status
 * preview route, guaranteeing the preview renders the exact same
 * presentation, not a re-implementation.
 */
export function ConnectionHealthHeader({ item }: { item: CatalogueRowItem }) {
  const reason = statusReason(item);
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <ProviderLogo provider={item.id} name={item.name} size="md" />
        <div>
          <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">
            {humanizeLabel(item.category)} · {humanizeLabel(item.stage)}
          </p>
          <h1 className="mt-1 text-lg font-semibold">{item.name}</h1>
          <p className="mt-1 max-w-2xl text-[length:var(--ua-text-metadata-size)] leading-5 text-[var(--ua-text-secondary)]">
            {item.description}
          </p>
        </div>
      </div>
      {reason ? (
        <StatusWithReason
          family="workflowStatus"
          value={item.badge}
          reason={reason}
          className="max-w-md"
        />
      ) : (
        <StatusBadge family="workflowStatus" value={item.badge} />
      )}
    </header>
  );
}

/** The provider-detail page's "Action required" note + "Connection health"
 * timestamp grid — same reuse rationale as ConnectionHealthHeader above. */
export function ConnectionHealthGrid({ item }: { item: CatalogueRowItem }) {
  const attentionTone = item.noteTone === "warning" || item.badge === "stale" || item.badge === "not_syncing" || item.badge === "sync_pending";
  const healthItems = [
    ["Account", item.account ?? (item.connectionCount ? `${item.connectionCount} connected account${item.connectionCount === 1 ? "" : "s"}` : "Not connected")],
    ["Records imported", formatNumber(item.importedRecords)],
    ["Granted scopes", item.scopes.length ? `${item.scopes.length} recorded` : "None recorded"],
    ["Last health check", item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt) : "Not yet checked"],
    ["Last sync attempt", item.lastSyncAttemptAt ? formatDateTime(item.lastSyncAttemptAt) : item.freshness.deliveryModel === "periodic_sync" ? "Never" : "Not applicable"],
    ["Last successful sync", item.lastSuccessfulSyncAt ? formatDateTime(item.lastSuccessfulSyncAt) : item.freshness.deliveryModel === "periodic_sync" ? "No successful sync" : "Not applicable"],
    ["Last data received", item.freshness.confidence === "measured" ? item.lastDataReceivedAt ? formatDateTime(item.lastDataReceivedAt) : "Never" : "Not measurable"],
  ];
  return (
    <>
      {item.lastError ? (
        <Card unstyled as="section" variant="panel" className={`${attentionTone ? "border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)]" : "border-[var(--ua-critical-border)] bg-[var(--ua-critical-bg)]"} p-4`}>
          <h2 className={`text-sm font-semibold ${attentionTone ? "text-[var(--ua-warning)]" : "text-[var(--ua-critical)]"}`}>
            {attentionTone ? "Connection needs attention" : "Connection error"}
          </h2>
          <p role="alert" className="mt-1 text-sm text-[var(--ua-text-secondary)]">
            {item.lastError}
          </p>
        </Card>
      ) : null}
      <section className="overflow-hidden rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]" aria-labelledby="connection-health-title">
        <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
          <h2 id="connection-health-title" className="text-xs font-semibold">Connection health</h2>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
          {healthItems.map(([label, value], index) => (
            <div key={label} className={`min-w-0 p-3.5 ${index ? "border-t border-[var(--ua-border-subtle)] sm:border-l sm:border-t-0" : ""}`}>
              <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{label}</dt>
              <dd className="mt-1 truncate text-[length:var(--ua-text-metadata-size)] font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
