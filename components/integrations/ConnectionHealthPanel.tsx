import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CatalogueRowItem } from "@/lib/integrations/catalogueView";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { FreshnessIndicator } from "@/components/sources/FreshnessIndicator";

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
    <section style={{ padding: '15px 16px', borderBottom: '1px solid #eae8e5' }} aria-labelledby="source-health-title" data-source-health>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600 }} id="source-health-title">Connection health</h2>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessIndicator state={freshnessState} label={freshnessState === "unknown" ? "Freshness unavailable" : undefined} />
          <StatusBadge family="workflowStatus" value={item.badge} size="sm" />
        </div>
      </div>
      {reason ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 10, borderRadius: 9, background: item.noteTone === 'danger' ? '#fdf0e6' : '#fff3e9', color: item.noteTone === 'danger' ? '#b0431a' : '#7a5310', fontSize: 11.5 }} data-tone={item.noteTone === "danger" ? "danger" : "warning"} role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <p className="text-[12px] leading-[1.45] text-[#40454a]">{reason}</p>
          {repairHref ? <Link href={repairHref} style={{ marginLeft: 'auto', whiteSpace: 'nowrap', color: 'inherit', fontWeight: 600 }}>Review setup</Link> : null}
        </div>
      ) : null}
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 0, margin: '12px 0 0' }}>
        {values.map(([label, value]) => (
          <div style={{ display: 'grid', gap: 3, padding: '9px 0', borderTop: '1px solid #f4f2ef' }} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
