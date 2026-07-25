"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CONNECTOR_GRID_CLASS } from "@/components/integrations/connectorGrid";
import type { ConnectorCatalogueItem } from "@/lib/connectors/catalogue";
import type { EffectiveConnectionBadge } from "@/lib/connections/effectiveStatus";
import type { ConnectionReadModel } from "@/lib/connections/readModel";
import { useLiveConnectionStatus } from "@/components/integrations/useLiveConnectionStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { humanise } from "@/lib/ui/labels";
import type { IntegrationCategory } from "@/lib/integrations/types";

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
  const noteColor = live.noteTone === "warning" ? "var(--ua-warning)" : "var(--ua-critical)";
  return (
    <Link
      href={`/integrations/${item.id}`}
      className={`ua-table-row ${CONNECTOR_GRID_CLASS} items-center border-b border-[var(--ua-border-subtle)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ua-border-focus)]`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProviderLogo provider={item.id} name={item.name} />
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ua-text-primary)]">{item.name}</p>
          <p className="mt-0.5 truncate text-xs capitalize text-[var(--ua-text-tertiary)]">
            {item.account ?? categoryLabel(item.category)}
          </p>
        </div>
      </div>
      <div>
        <StatusBadge family="workflowStatus" value={live.status} />
      </div>
      <div className="min-w-0 md:col-span-2 xl:col-span-1">
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ua-text-secondary)]">
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
      <p className="text-left font-semibold tabular-nums text-[var(--ua-text-primary)] xl:text-right">
        <span className="mr-1 text-[length:var(--ua-text-micro-size)] font-medium text-[var(--ua-text-tertiary)] xl:hidden">
          Imported
        </span>
        {formatNumber(item.importedRecords)}
      </p>
      <p className="text-xs font-medium text-[var(--ua-text-secondary)]">
        <span className="mr-1 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)] xl:hidden">
          Last activity
        </span>
        {item.lastDataReceivedAt
          ? formatDateTime(item.lastDataReceivedAt)
          : item.badge === "sync_pending"
            ? "Initial import pending"
            : item.freshness.confidence === "unavailable"
              ? "Not measurable"
              : "No activity yet"}
      </p>
      <span className="hidden text-right text-[var(--ua-text-tertiary)] xl:block">
        <span className="sr-only">View connection</span>
      </span>
    </Link>
  );
}
