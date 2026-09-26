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
      <div className="rounded-lg border border-[#e4e3e0] bg-[#fff] p-4 text-[length:12px] text-[#64686d]">
        No related records yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e4e3e0] bg-[#fff]">
      <ul className="divide-y divide-[#eae8e5]">
        {records.map((r) => {
          const label = ENTITY_LABELS[r.entityType] ?? r.entityType;
          const inner = (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-[13px] leading-5 text-[#1c1f23] truncate text-[#1c1f23]">
                  {label}
                </p>
                <p className="mt-0.5 text-[length:10.5px] text-[#6f6a63]">
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
                  className="block hover:bg-[#f3f0ed]"
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
