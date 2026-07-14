"use client";

import { PanelCard } from "@/components/ui";
import { claimEventLabel, claimEventSummary } from "@/lib/claims/events";
import SupportCaseContextList from "@/components/support/SupportCaseContextList";
import {
  DECISION_LABELS,
  OUTCOME_LABELS,
} from "@/components/claims/claimReviewLabels";
import { formatDateTime } from "@/lib/utils/format";
import { actorLabel } from "@/components/claims/claimReviewLogic";
import { ClaimReviewHistoryTable } from "@/components/claims/ClaimReviewHistoryTable";
import { PayoutCaseLeadBlock } from "@/components/claims/payout/PayoutCaseLeadBlock";
import { RecoveryCaseCard } from "@/components/claims/payout/RecoveryCaseCard";
import { IntegrationEvidenceSourcePanel } from "@/components/claims/payout/IntegrationEvidenceSourcePanel";
import { GateRecommendationPanel } from "@/components/claims/payout/GateRecommendationPanel";
import { EvidenceChecklistCard } from "@/components/claims/payout/EvidenceChecklistCard";
import type { ClaimReviewWorkbench } from "@/components/claims/claimReviewWorkbench";
import type { ClaimDecisionContext } from "@/lib/claims/decision/types";
import type { Decision, Outcome } from "@/components/claims/claimReviewTypes";
import type { EvidencePack } from "@/lib/integrations/types";
import type { SupportPayoutCase } from "@/lib/payouts/types";
import type { RecoveryCase } from "@/lib/recoveries/types";

export function ClaimReviewContextColumn({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    selectedClaim,
    latestOutcome,
    previousOutcome,
    selectedClaimEvents,
    history,
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
  const gateRecommendation =
    (decisionData?.context as ClaimDecisionContext | undefined)?.claim
      .gateRecommendation ?? null;
  const delivery = (
    decisionData?.context as
      | { delivery?: ClaimDecisionContext["delivery"] }
      | undefined
  )?.delivery ?? null;

  return (
    <div className="space-y-4 min-w-0 order-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
      {payoutCase ? (
        <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery} />
      ) : null}
      <GateRecommendationPanel recommendation={gateRecommendation} />
      <PayoutCaseLeadBlock
        payoutCase={payoutCase}
        recoveryCase={recoveryCase}
        delivery={delivery}
        loading={decisionLoading}
        stale={decisionStale}
        showEvidence={false}
      />
      <IntegrationEvidenceSourcePanel evidencePack={evidencePack} />
      {selectedClaim ? (
        <RecoveryCaseCard
          recoveryCase={recoveryCase}
          payoutCase={payoutCase}
          loading={decisionLoading}
          onRefresh={refreshRecommendation}
        />
      ) : null}
      {history.length > 1 ? (
        <PanelCard as="aside" variant="appInset" className="border-[var(--warning-bd)] p-3">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {history.length} previous payout cases for this customer
          </p>
          <a href={`${wb.customerProfileHref}#cases`} className="mt-1 inline-block text-xs font-semibold text-[var(--accent)]">
            View case history
          </a>
        </PanelCard>
      ) : null}

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
                  ? "var(--accent-fg-on-500)"
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
                  ? "var(--accent-fg-on-500)"
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
                Loading case history…
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
