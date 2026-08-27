"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { useLiveConnectionStatus } from "@/components/integrations/useLiveConnectionStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { categoryLabel, type CatalogueRowItem } from "@/lib/integrations/catalogueView";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import styles from "@/components/sources/SourcesSurface.module.css";

export { categoryLabel } from "@/lib/integrations/catalogueView";
export type { CatalogueRowItem } from "@/lib/integrations/catalogueView";

function accountLabel(item: CatalogueRowItem) {
  const account = item.account ?? categoryLabel(item.category);
  return item.connectionCount > 1 ? `${account} · ${item.connectionCount} accounts` : account;
}

function activityLabel(item: CatalogueRowItem) {
  if (item.lastDataReceivedAt) return formatDateTime(item.lastDataReceivedAt);
  if (item.badge === "sync_pending") return "Initial import pending";
  if (item.freshness.confidence === "unavailable") return "Not measurable";
  return "No activity yet";
}

export function ConnectorRow({ item }: { item: CatalogueRowItem }) {
  const initialLiveState = useMemo(
    () => ({ status: item.badge, note: item.lastError, noteTone: item.noteTone ?? null }),
    [item.badge, item.lastError, item.noteTone],
  );
  const live = useLiveConnectionStatus(item.id, initialLiveState);

  return (
    <li className={styles.connectionRow} data-state-id={`source-connection-${live.status}`} data-trust-state={live.status}>
      <div className={styles.providerCell}>
        <ProviderLogo provider={item.id} name={item.name} />
        <div className={styles.providerIdentity}>
          <Link href={`/sources/${item.id}`} className={styles.providerLink}>{item.name}</Link>
          <span className={styles.providerMeta}>{accountLabel(item)}</span>
        </div>
      </div>
      <div>
        <span className={styles.mobileLabel}>Status</span>
        <StatusBadge family="workflowStatus" value={live.status} />
      </div>
      <div>
        <span className={styles.mobileLabel}>Data covered</span>
        <span className={styles.coverageText}>{item.description}</span>
        {live.note ? (
          <span
            role="status"
            className={styles.providerMeta}
            style={{ color: live.noteTone === "warning" ? "var(--uo-route-warning)" : "var(--uo-route-critical)" }}
          >
            {live.note}
          </span>
        ) : null}
      </div>
      <div className="text-left tabular-nums md:text-right">
        <span className={styles.mobileLabel}>Records</span>
        <span className="ua-text-dense font-medium text-[var(--uo-route-text-primary)]">{item.importedRecordsKnown === false ? "Unavailable" : formatNumber(item.importedRecords)}</span>
      </div>
      <div className={styles.cellCopy}>
        <span className={styles.mobileLabel}>Last data</span>
        {activityLabel(item)}
      </div>
      <div className="text-right">
        <Link href={`/sources/${item.id}`} className={styles.actionLink}>Manage</Link>
      </div>
    </li>
  );
}
