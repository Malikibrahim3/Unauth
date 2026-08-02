"use client";

import { Clock3, TriangleAlert } from "lucide-react";

import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  OUTCOME_LABELS,
} from "@/components/claims/claimReviewLabels";
import { getSlaVisual } from "@/components/claims/claimReviewLogic";
import { formatClaimAge, formatFiledDate } from "@/lib/claims/sla";
import { formatDateAbsolute } from "@/lib/utils/format";
import { shortRef } from "@/lib/ui/displayRef";
import {
  formatClaimMoney,
  slaToneStyle,
} from "@/components/claims/claimReviewStyles";
import { StatusPill } from "@/components/claims/claimReviewPrimitives";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
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
    return (
      <p className="ua-text-body" style={{ color: "var(--ua-text-secondary)" }}>
        No cases recorded for this customer yet.
      </p>
    );
  }

  const columns: DataTableColumn<ClaimRecord>[] = [
    {
      key: "order",
      header: "Order ref",
      render: (claim) => (
        <span className="ua-text-working-title font-mono underline underline-offset-2">
          {shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (claim) => <StatusPill status={claim.status} />,
    },
    {
      key: "type",
      header: "Type",
      render: (claim) =>
        CLAIM_TYPE_LABELS[claim.claim_type as ClaimType] ?? claim.claim_type,
    },
    {
      key: "decision",
      header: "Decision / Outcome",
      render: (claim) =>
        claim.latest_outcome
          ? `${DECISION_LABELS[claim.latest_outcome.decision as Decision] ?? claim.latest_outcome.decision} / ${OUTCOME_LABELS[claim.latest_outcome.outcome as Outcome] ?? claim.latest_outcome.outcome}`
          : "—",
    },
    {
      key: "filed",
      header: "Filed",
      render: (claim) => (
        <span className="ua-text-dense text-[var(--ua-text-secondary)]">
          <span>{formatFiledDate(claim)}</span>
          <span className="block">{formatClaimAge(claim)}</span>
        </span>
      ),
    },
    {
      key: "age",
      header: "Age",
      render: (claim) => {
        const sla = getSlaVisual(claim);
        const tone = slaToneStyle(sla.tone);
        return (
          <span
            className="ua-text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: tone.bg, color: tone.text }}
          >
            {sla.icon === "clock" ? <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {sla.icon === "warning" ? <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {sla.label}
          </span>
        );
      },
    },
    {
      key: "risk",
      header: "At risk",
      kind: "currency",
      render: (claim) =>
        claim.amount_at_risk != null
          ? formatClaimMoney(claim.amount_at_risk, claim.currency)
          : "—",
    },
    {
      key: "updated",
      header: "Updated",
      kind: "date",
      render: (claim) => (
        <span className="ua-text-dense font-sans tabular-nums text-[var(--ua-text-secondary)]">
          {claim.updated_at
            ? formatDateAbsolute(new Date(claim.updated_at))
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      aria-label="Customer case history"
      columns={columns}
      rows={history}
      emptyState={<p className="ua-text-body p-4 text-[var(--ua-text-secondary)]">No other cases are recorded for this customer.</p>}
      getRowKey={(claim) => claim.id}
      density="metadata"
      onRowClick={(claim) => onSelectClaim(claim.id)}
      primaryActionLabel={(claim) =>
        `Open case ${shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id)}`
      }
    />
  );
}
