"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ConnectorCatalogueItem } from "@/lib/connectors/catalogue";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import type { ConnectionReadModel } from "@/lib/connections/readModel";
import { useLiveConnectionStatus } from "@/components/integrations/useLiveConnectionStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { humanise } from "@/lib/ui/labels";
import type { IntegrationCategory } from "@/lib/integrations/types";
import styles from "./IntegrationsWorkspace.module.css";

export type CatalogueRowItem = ConnectorCatalogueItem & {
  badge: EffectiveConnectionBadge;
  noteTone?: "warning" | "danger" | null;
  readModel?: ConnectionReadModel;
};

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  commerce: "Commerce",
  helpdesk: "Helpdesk",
  tracking: "Tracking",
  carrier: "Carrier",
  warehouse_3pl: "Warehouse / 3PL",
  returns: "Returns",
  payments_disputes: "Payments / disputes",
  documents: "Documents",
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category as IntegrationCategory] ?? humanise(category);
}

function accountLabel(item: CatalogueRowItem) {
  const account = item.account ?? categoryLabel(item.category);
  if (item.connectionCount > 1) return `${account} · ${item.connectionCount} accounts`;
  return account;
}

function activityLabel(item: CatalogueRowItem) {
  if (item.lastDataReceivedAt) return formatDateTime(item.lastDataReceivedAt);
  if (item.badge === "sync_pending") return "Initial import pending";
  if (item.freshness.confidence === "unavailable") return "On-demand check";
  return "No activity yet";
}

export function ConnectorRow({ item }: { item: CatalogueRowItem }) {
  const initialLiveState = useMemo(
    () => ({ status: item.badge, note: item.lastError, noteTone: item.noteTone ?? null }),
    [item.badge, item.lastError, item.noteTone],
  );
  const live = useLiveConnectionStatus(item.id, initialLiveState);
  const noteColor = live.noteTone === "warning" ? "var(--ua-warning)" : "var(--ua-critical)";
  return (
    <li className={styles.connectionRow}>
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
      <div className={styles.coverage}>
        <span className={styles.mobileLabel}>Data covered</span>
        <span className={styles.coverageText}>{item.description}</span>
        {live.note ? <span role="status" className={styles.note} style={{ color: noteColor }}>{live.note}</span> : null}
      </div>
      <div className="ua-text-working-title text-left tabular-nums text-[var(--ua-text-primary)] md:text-right">
        <span className={styles.mobileLabel}>Records</span>
        {formatNumber(item.importedRecords)}
      </div>
      <div className={styles.cellText}>
        <span className={styles.mobileLabel}>Last data</span>
        {activityLabel(item)}
      </div>
      <div className={styles.actionCell}>
        <Link href={`/sources/${item.id}`} className={styles.actionLink}>Manage</Link>
      </div>
    </li>
  );
}
