import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CatalogueRowItem } from "@/lib/integrations/catalogueView";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { FreshnessIndicator } from "@/components/sources/FreshnessIndicator";
import styles from "@/components/sources/SourcesSurface.module.css";

function statusReason(item: CatalogueRowItem) {
  if (item.lastError) return item.lastError;
  if (item.badge === "stale") return "The latest source data is outside the expected freshness window.";
  if (item.badge === "not_syncing") return "No active source sync is currently recorded.";
  if (item.badge === "sync_pending") return "The first source sync has not completed yet.";
  return null;
}

export function ConnectionHealthGrid({ item, repairHref }: { item: CatalogueRowItem; repairHref?: string }) {
  const reason = statusReason(item);
  const freshnessState = item.freshness.confidence !== "measured" || !item.lastDataReceivedAt
    ? "unknown"
    : item.badge === "stale"
      ? "stale"
      : "current";
  const values = [
    ["Account", item.account ?? (item.connectionCount ? `${item.connectionCount} connected account${item.connectionCount === 1 ? "" : "s"}` : "Not connected")],
    ["Records indexed", item.importedRecordsKnown === false ? "Unavailable" : formatNumber(item.importedRecords)],
    ["Granted scopes", item.scopes.length ? `${item.scopes.length} recorded` : "None recorded"],
    ["Last health check", item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt) : "Not yet checked"],
    ["Last sync attempt", item.lastSyncAttemptAt ? formatDateTime(item.lastSyncAttemptAt) : item.freshness.deliveryModel === "periodic_sync" ? "Never" : "Not applicable"],
    ["Last successful sync", item.lastSuccessfulSyncAt ? formatDateTime(item.lastSuccessfulSyncAt) : item.freshness.deliveryModel === "periodic_sync" ? "No successful sync" : "Not applicable"],
    ["Last data received", item.freshness.confidence === "measured" ? item.lastDataReceivedAt ? formatDateTime(item.lastDataReceivedAt) : "Never" : "Not measurable"],
  ];

  return (
    <section className={styles.railSection} aria-labelledby="source-health-title" data-source-health>
      <div className={styles.detailTopline}>
        <h2 className={styles.detailTitle} id="source-health-title">Connection health</h2>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessIndicator state={freshnessState} label={freshnessState === "unknown" ? "Freshness unavailable" : undefined} />
          <StatusBadge family="workflowStatus" value={item.badge} size="sm" />
        </div>
      </div>
      {reason ? (
        <div className={styles.notice} data-tone={item.noteTone === "danger" ? "danger" : "warning"} role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <p className="ua-text-dense">{reason}</p>
          {repairHref ? <Link href={repairHref} className={styles.actionLink}>Review setup</Link> : null}
        </div>
      ) : null}
      <dl className={styles.factGrid}>
        {values.map(([label, value]) => (
          <div className={styles.fact} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
