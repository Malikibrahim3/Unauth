"use client";

import { MatchStatusBadge } from "@/components/relationships/MatchStatusBadge";
import type { RelatedRecord } from "@/lib/relationships/relatedRecords";

const ENTITY_LABELS: Record<string, string> = {
  order: "Order",
  customer: "Customer",
  ticket: "Ticket",
  message: "Message",
  refund: "Refund",
  replacement: "Replacement",
  fulfilment: "Fulfilment",
  shipment: "Shipment",
  tracking_event: "Tracking event",
  return: "Return",
  dispute: "Dispute",
  evidence: "Evidence",
  loss: "Loss",
  recovery: "Recovery",
};

function freshnessLabel(freshness: string | null): string {
  switch (freshness) {
    case "fresh":
      return "Fresh";
    case "ageing":
      return "Ageing";
    case "stale":
      return "Stale";
    default:
      return "Unknown";
  }
}

/**
 * Navigable related-records panel for a case. Every row shows the linked
 * record's type, match status, source system, and freshness — a relationship
 * graph, not a count.
 */
export function RelatedRecordsPanel({ records }: { records: RelatedRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4 text-[length:var(--ua-text-dense-size)] text-[var(--ua-text-secondary)]">
        No related records yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]">
      <ul className="divide-y divide-[var(--ua-border-subtle)]">
        {records.map((r) => {
          const label = ENTITY_LABELS[r.entityType] ?? r.entityType;
          const inner = (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="ua-text-working-title truncate text-[var(--ua-text-primary)]">
                  {label}
                </p>
                <p className="mt-0.5 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
                  {r.sourceSystem ?? "source not identified"} ·{" "}
                  {freshnessLabel(r.freshness)}
                  {r.matchMethod ? ` · ${r.matchMethod}` : ""}
                </p>
              </div>
              <span className="ml-auto shrink-0">
                <MatchStatusBadge status={r.matchStatus} />
              </span>
            </div>
          );
          const key = `${r.entityType}:${r.entityId}:${r.candidateId ?? "edge"}`;
          return (
            <li key={key}>
              {r.sourceUrl ? (
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:bg-[var(--ua-surface-hover)]"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
