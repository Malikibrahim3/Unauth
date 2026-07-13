"use client";

import { signalLabel } from "@/lib/copy/signalLabels";
import { PanelCard, StatusBadge } from "@/components/ui";
import { claimEventLabel, claimEventSummary } from "@/lib/claims/events";
import { formatClaimAge, formatFiledDate } from "@/lib/claims/sla";
import SupportCaseContextList from "@/components/support/SupportCaseContextList";
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  OUTCOME_LABELS,
} from "@/components/claims/claimReviewLabels";
import { formatClaimMoney } from "@/components/claims/claimReviewStyles";
import { formatDateTime } from "@/lib/utils/format";
import { actorLabel } from "@/components/claims/claimReviewLogic";
import {
  CaseIntelTile,
  StatusPill,
  SlaBadge,
} from "@/components/claims/claimReviewPrimitives";
import { ClaimReviewHistoryTable } from "@/components/claims/ClaimReviewHistoryTable";
import { PayoutCaseLeadBlock } from "@/components/claims/payout/PayoutCaseLeadBlock";
import { RecoveryCaseCard } from "@/components/claims/payout/RecoveryCaseCard";
import { IntegrationEvidenceSourcePanel } from "@/components/claims/payout/IntegrationEvidenceSourcePanel";
import { GateRecommendationPanel } from "@/components/claims/payout/GateRecommendationPanel";
import type { ClaimReviewWorkbench } from "@/components/claims/claimReviewWorkbench";
import type { ClaimDecisionContext } from "@/lib/claims/decision/types";
import type {
  ClaimType,
  Decision,
  Outcome,
} from "@/components/claims/claimReviewTypes";
import type { EvidencePack } from "@/lib/integrations/types";
import type { SupportPayoutCase } from "@/lib/payouts/types";
import type { RecoveryCase } from "@/lib/recoveries/types";

export function ClaimReviewContextColumn({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    selectedClaim,
    latestOutcome,
    previousOutcome,
    evidenceRecorded,
    selectedClaimEvents,
    history,
    data,
    order,
    behaviorSignals,
    identityPoints,
    withinStoreSignals,
    supportCases,
    state,
    patch,
    setClaimId,
    decisionData,
    decisionLoading,
    decisionStale,
    refreshRecommendation,
  } = wb;

  const payoutCase =
    (decisionData?.payoutCase as SupportPayoutCase | undefined) ?? null;
  const recoveryCase =
    (decisionData?.recoveryCase as RecoveryCase | null | undefined) ?? null;
  const evidencePack =
    (decisionData?.evidencePack as EvidencePack | null | undefined) ?? null;
  const formattedDecision = decisionData?.formatted as
    { ruleName?: string | null } | undefined;
  const gateRecommendation =
    (decisionData?.context as ClaimDecisionContext | undefined)?.claim
      .gateRecommendation ?? null;

  return (
    <div className="space-y-4 min-w-0 order-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
      <PayoutCaseLeadBlock
        payoutCase={payoutCase}
        recoveryCase={recoveryCase}
        delivery={
          (
            decisionData?.context as
              | {
                  delivery?: import("@/lib/claims/decision/types").ClaimDecisionContext["delivery"];
                }
              | undefined
          )?.delivery ?? null
        }
        loading={decisionLoading}
        stale={decisionStale}
      />
      <GateRecommendationPanel recommendation={gateRecommendation} />
      <IntegrationEvidenceSourcePanel evidencePack={evidencePack} />
      {selectedClaim ? (
        <RecoveryCaseCard
          recoveryCase={recoveryCase}
          payoutCase={payoutCase}
          loading={decisionLoading}
          onRefresh={refreshRecommendation}
        />
      ) : null}
      <PanelCard as="section" variant="app" className="p-4">
        <p
          className="text-caption font-semibold mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Claim evidence context
        </p>
        {selectedClaim ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              <CaseIntelTile label="Claim">
                <p className="font-semibold">
                  {CLAIM_TYPE_LABELS[selectedClaim.claim_type as ClaimType] ??
                    selectedClaim.claim_type}
                </p>
                <p
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedClaim.customer_claim_reason ||
                    "No customer reason recorded"}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Source">
                <p className="font-mono text-xs">
                  {selectedClaim.shopify_order_id ??
                    selectedClaim.order_ref ??
                    "-"}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Ticket{" "}
                  {selectedClaim.source_ticket_ref
                    ? `#${selectedClaim.source_ticket_ref}`
                    : "not linked"}
                </p>
                <p className="font-semibold mt-1">
                  {selectedClaim.amount_at_risk != null
                    ? formatClaimMoney(
                        selectedClaim.amount_at_risk,
                        selectedClaim.currency,
                      )
                    : "-"}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Status">
                <div className="flex flex-wrap gap-1">
                  <StatusPill status={selectedClaim.status} />
                  <SlaBadge claim={selectedClaim} />
                </div>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatClaimAge(selectedClaim)} ·{" "}
                  {formatFiledDate(selectedClaim)}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Evidence">
                <p
                  className="font-semibold"
                  style={{
                    color: evidenceRecorded ? "var(--success)" : "var(--text)",
                  }}
                >
                  {evidenceRecorded ? "On record" : "Missing"}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {evidenceRecorded
                    ? "Source-backed evidence available"
                    : "Waiting on connected source data"}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Review state">
                <p className="font-semibold">
                  {selectedClaim.first_viewed_at
                    ? "Needs review"
                    : "New evidence"}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedClaim.first_viewed_at
                    ? `Reviewed ${new Date(selectedClaim.first_viewed_at).toLocaleDateString("en-US", { timeZone: "UTC" })}`
                    : "Not yet reviewed"}
                </p>
              </CaseIntelTile>
              <CaseIntelTile label="Outcome">
                {latestOutcome ? (
                  <>
                    <p className="font-semibold text-xs leading-tight">
                      {DECISION_LABELS[latestOutcome.decision as Decision] ??
                        latestOutcome.decision}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ??
                        latestOutcome.outcome}
                    </p>
                  </>
                ) : (
                  <p style={{ color: "var(--text-secondary)" }}>Not recorded</p>
                )}
              </CaseIntelTile>
            </div>
            {selectedClaim.normalized_reason && (
              <p
                className="text-xs rounded-md px-3 py-2"
                style={{
                  background: "var(--bg-inset)",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  className="font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Internal notes:{" "}
                </span>
                {selectedClaim.normalized_reason}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No claim selected. Expand Edit claim details at the bottom of this
            column to create one.
          </p>
        )}
      </PanelCard>

      <PanelCard variant="app" className="p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-caption font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Customer payout context
            </p>
            <p
              className="mt-1 text-xs max-w-2xl"
              style={{ color: "var(--text-secondary)" }}
            >
              Prior merchant-owned records can help the agent understand payout
              history. Unauth shows context; the merchant owns the action.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p
              className="text-xs mb-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Triggered rules
            </p>
            <p
              className="font-semibold text-lg"
              style={{ color: "var(--text)" }}
            >
              {formattedDecision?.ruleName ? 1 : 0}
            </p>
          </div>
          <div>
            <p
              className="text-xs mb-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Related records
            </p>
            <p
              className="font-semibold text-base"
              style={{ color: "var(--text)" }}
            >
              {data?.linkedAccounts?.length ?? "-"}
            </p>
          </div>
          <div>
            <p
              className="text-xs mb-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Refund/fulfilment
            </p>
            <p
              className="font-semibold text-base"
              style={{ color: "var(--text)" }}
            >
              {String(order?.refundStatus ?? "-")}
            </p>
          </div>
          <div>
            <p
              className="text-xs mb-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Previous claims
            </p>
            <p
              className="font-semibold text-base"
              style={{ color: "var(--text)" }}
            >
              {history.length}
            </p>
          </div>
        </div>
        {behaviorSignals.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {behaviorSignals.slice(0, 5).map((f) => (
              <StatusBadge key={f} variant="flagged">
                {signalLabel(f).short}
              </StatusBadge>
            ))}
          </div>
        )}
        {identityPoints.length > 0 && (
          <div className="mt-3">
            <p
              className="text-xs font-semibold mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Matching data points
            </p>
            <div className="flex flex-wrap gap-1.5">
              {identityPoints.map((point) => (
                <StatusBadge key={point} variant="held" dot={false}>
                  {point}
                </StatusBadge>
              ))}
            </div>
          </div>
        )}
      </PanelCard>

      <PanelCard as="section" variant="app" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-caption font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Store-owned claim history
          </p>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text)" }}
          >
            Store-scoped
          </span>
        </div>
        {withinStoreSignals.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No additional store-scoped identity variants found yet.
          </p>
        ) : (
          <div className="space-y-2">
            {withinStoreSignals.map((row) => (
              <PanelCard
                key={row.key}
                variant="appInset"
                className="grid grid-cols-1 gap-2 p-2.5 text-xs md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <span className="font-semibold capitalize">{row.signal}</span>
                <span>{row.detail}</span>
                <span>{row.reason}</span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {row.date
                      ? new Date(row.date).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                        })
                      : "-"}
                  </span>
                  <StatusBadge variant="held" dot={false}>
                    {row.grade}
                  </StatusBadge>
                </span>
              </PanelCard>
            ))}
          </div>
        )}
      </PanelCard>

      {selectedClaim && latestOutcome && (
        <PanelCard as="section" variant="app" className="p-4">
          <p
            className="text-caption font-semibold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Recorded merchant outcome
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Merchant-recorded outcome
              </p>
              <p className="font-semibold" style={{ color: "var(--text)" }}>
                {DECISION_LABELS[latestOutcome.decision as Decision] ??
                  latestOutcome.decision}
              </p>
              {latestOutcome.actor_user_id && (
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {actorLabel(latestOutcome.actor_user_id)}
                </p>
              )}
            </div>
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Outcome
              </p>
              <p className="font-semibold" style={{ color: "var(--text)" }}>
                {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ??
                  latestOutcome.outcome}
              </p>
              {latestOutcome.updated_at && (
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatDateTime(latestOutcome.updated_at)}
                </p>
              )}
            </div>
            {previousOutcome && (
              <div>
                <p
                  className="text-xs mb-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Previous outcome
                </p>
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {DECISION_LABELS[previousOutcome.decision as Decision] ??
                    previousOutcome.decision}{" "}
                  /{" "}
                  {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ??
                    previousOutcome.outcome}
                </p>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      <SupportCaseContextList cases={supportCases} />

      <PanelCard as="section" variant="app" className="p-4">
        <PanelCard variant="appInset" className="mb-3 inline-flex p-0.5">
          <button
            type="button"
            onClick={() => patch({ auditTab: "timeline" })}
            className="px-2.5 py-1 text-xs rounded"
            style={{
              background:
                state.auditTab === "timeline" ? "var(--accent)" : "transparent",
              color:
                state.auditTab === "timeline"
                  ? "white"
                  : "var(--text-secondary)",
            }}
          >
            Event timeline
          </button>
          <button
            type="button"
            onClick={() => patch({ auditTab: "history" })}
            className="px-2.5 py-1 text-xs rounded"
            style={{
              background:
                state.auditTab === "history" ? "var(--accent)" : "transparent",
              color:
                state.auditTab === "history"
                  ? "white"
                  : "var(--text-secondary)",
            }}
          >
            Claim history
          </button>
        </PanelCard>
        {state.auditTab === "timeline" && (
          <>
            {!selectedClaim ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Select a claim to view its audit history.
              </p>
            ) : selectedClaimEvents.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No claim events recorded yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {selectedClaimEvents.map((event) => (
                  <PanelCard
                    key={event.id}
                    as="li"
                    variant="appInset"
                    className="p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {claimEventLabel(event.event_type)}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {claimEventSummary(event)}
                        </p>
                      </div>
                      <div
                        className="text-right text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <p>
                          {event.created_at
                            ? formatDateTime(event.created_at)
                            : "-"}
                        </p>
                        {event.actor_user_id && (
                          <p>{actorLabel(event.actor_user_id)}</p>
                        )}
                      </div>
                    </div>
                  </PanelCard>
                ))}
              </ol>
            )}
          </>
        )}
        {state.auditTab === "history" && (
          <ClaimReviewHistoryTable
            history={history}
            onSelectClaim={setClaimId}
          />
        )}
      </PanelCard>
    </div>
  );
}
