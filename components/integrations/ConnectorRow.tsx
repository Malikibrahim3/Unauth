"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { useLiveConnectionStatus } from "@/components/integrations/useLiveConnectionStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { categoryLabel, type CatalogueRowItem } from "@/lib/integrations/catalogueView";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

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
    <li style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,1.2fr) 120px minmax(220px,1.4fr) 90px 130px 64px', gap: 14, alignItems: 'center', minHeight: 62, padding: '9px 16px', borderBottom: '1px solid #f4f2ef' }} data-state-id={`source-connection-${live.status}`} data-trust-state={live.status}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <ProviderLogo provider={item.id} name={item.name} />
        <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
          <Link href={`/sources/${item.id}`} style={{ overflow: 'hidden', color: '#1c1f23', fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Link>
          <span style={{ color: '#6f6a63', fontSize: 10.5 }}>{accountLabel(item)}</span>
        </div>
      </div>
      <div>
        <span className="sr-only">Status</span>
        <StatusBadge family="workflowStatus" value={live.status} />
      </div>
      <div>
        <span className="sr-only">Data covered</span>
        <span style={{ display: 'block', color: '#40454a', fontSize: 11.5, lineHeight: '16px' }}>{item.description}</span>
        {live.note ? (
          <span
            role="status"
            style={{ display: 'block', marginTop: 3, color: live.noteTone === "warning" ? "#7a5310" : "#b0431a", fontSize: 10.5 }}
          >
            {live.note}
          </span>
        ) : null}
      </div>
      <div className="text-left tabular-nums md:text-right">
        <span className="sr-only">Records</span>
        <span className="text-[12px] leading-[1.45] text-[#40454a] font-medium text-[#1c1f23]">{item.importedRecordsKnown === false ? "Unavailable" : formatNumber(item.importedRecords)}</span>
      </div>
      <div style={{ color: '#6f6a63', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>
        <span className="sr-only">Last data</span>
        {activityLabel(item)}
      </div>
      <div className="text-right">
        <Link href={`/sources/${item.id}`} style={{ color: '#9f4f08', fontSize: 11.5, fontWeight: 500 }}>Manage</Link>
      </div>
    </li>
  );
}
