"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CONNECTOR_GRID_CLASS } from "@/components/integrations/connectorGrid";
import type { ConnectorCatalogueItem } from "@/lib/connectors/catalogue";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import { useLiveConnectionStatus } from "@/components/integrations/useLiveConnectionStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { humanise } from "@/lib/ui/labels";

export type CatalogueRowItem = ConnectorCatalogueItem & {
  badge: EffectiveConnectionBadge;
  noteTone?: "warning" | "danger" | null;
};

export function categoryLabel(category: string) {
  return category === "warehouse_3pl"
    ? "Warehouse / 3PL"
    : humanise(category);
}

export function ConnectorRow({ item }: { item: CatalogueRowItem }) {
  // Both the badge and its supporting note come from the same live state so
  // a poll can never leave them disagreeing (e.g. an "Error" badge next to a
  // stale "data hasn't synced since ..." note left over from server render).
  // Memoized on primitive fields — a new object identity on every render
  // would otherwise recreate the poll interval on every render too.
  const initialLiveState = useMemo(
    () => ({ status: item.badge, note: item.lastError, noteTone: item.noteTone ?? null }),
    [item.badge, item.lastError, item.noteTone],
  );
  const live = useLiveConnectionStatus(item.id, initialLiveState);
  const noteColor = live.noteTone === "warning" ? "var(--ua-warning)" : "var(--danger)";
  return (
    <Link
      href={`/integrations/${item.id}`}
      className={`ua-table-row ${CONNECTOR_GRID_CLASS} items-center border-b border-[var(--border-muted)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]`}
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
        <StatusBadge family="workflowStatus" value={live.status} />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>
        {live.note ? (
          <p
            role="status"
            className="mt-1 line-clamp-1 text-xs"
            style={{ color: noteColor }}
          >
            {live.note}
          </p>
        ) : null}
      </div>
      <p className="text-right font-semibold tabular-nums text-[var(--text-primary)]">
        {formatNumber(item.importedRecords)}
      </p>
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {item.lastDataReceivedAt
          ? formatDateTime(item.lastDataReceivedAt)
          : item.badge === "sync_pending"
            ? "Initial import pending"
            : item.freshness.confidence === "unavailable"
              ? "Not measurable"
              : "No activity yet"}
      </p>
      <span className="text-right text-[var(--text-tertiary)]">
        <span className="sr-only">View connection</span>
      </span>
    </Link>
  );
}
