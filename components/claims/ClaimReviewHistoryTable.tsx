"use client";

import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  OUTCOME_LABELS,
} from "@/components/claims/claimReviewLabels";
import { getSlaVisual } from "@/components/claims/claimReviewLogic";
import { formatClaimAge, formatFiledDate } from "@/lib/claims/sla";
import {
  formatClaimMoney,
  slaToneStyle,
} from "@/components/claims/claimReviewStyles";
import { StatusPill } from "@/components/claims/claimReviewPrimitives";
import { DataTable, EmptyState } from "@/components/ui";
import type {
  ClaimRecord,
  ClaimType,
  Decision,
  Outcome,
} from "@/components/claims/claimReviewTypes";

export function ClaimReviewHistoryTable({
  history,
  onSelectClaim,
}: {
  history: ClaimRecord[];
  onSelectClaim: (id: string) => void;
}) {
  if (history.length === 0) {
    return <EmptyState variant="compact" title="No claims recorded for this customer yet" />;
  }

  return (
    <DataTable
      rows={history}
      getRowKey={(row) => row.id}
      onRowClick={(row) => onSelectClaim(row.id)}
      density="compact"
      columns={[
        { key: "order", header: "Order ref", render: (row) => <span className="font-mono text-xs">{row.shopify_order_id ?? row.order_ref ?? "—"}</span> },
        { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
        { key: "type", header: "Type", render: (row) => CLAIM_TYPE_LABELS[row.claim_type as ClaimType] ?? row.claim_type },
        { key: "decision", header: "Decision / outcome", render: (row) => row.latest_outcome ? `${DECISION_LABELS[row.latest_outcome.decision as Decision] ?? row.latest_outcome.decision} / ${OUTCOME_LABELS[row.latest_outcome.outcome as Outcome] ?? row.latest_outcome.outcome}` : "—" },
        { key: "filed", header: "Filed", render: (row) => <span className="text-xs text-[var(--text-secondary)]">{formatFiledDate(row)}<span className="block">{formatClaimAge(row)}</span></span> },
        { key: "sla", header: "SLA", render: (row) => { const sla = getSlaVisual(row); const tone = slaToneStyle(sla.tone); return <span className="text-xs font-medium" style={{ color: tone.text }}>{sla.label}</span>; } },
        { key: "risk", header: "At risk", render: (row) => <span className="tabular-nums">{row.amount_at_risk != null ? formatClaimMoney(row.amount_at_risk, row.currency) : "—"}</span> },
        { key: "updated", header: "Updated", render: (row) => <span className="text-xs text-[var(--text-secondary)]">{row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—"}</span> },
      ]}
    />
  );
}
