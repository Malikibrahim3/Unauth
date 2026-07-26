"use client";

import { useState } from "react";
import { Card, Tabs } from "@/components/ui";
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
import {
  CaseFinancialHistoryCard,
  type CaseFinancialSummary,
} from "@/components/claims/payout/CaseFinancialHistoryCard";
import { CaseInvestigationsCard } from "@/components/claims/investigations/CaseInvestigationsCard";
import { ResponsibilityAssessmentCard } from "@/components/claims/payout/ResponsibilityAssessmentCard";
import { ReconciliationSummaryCard } from "@/components/claims/payout/ReconciliationSummaryCard";

export function ClaimReviewContextColumn({
  wb,
  financialSummaries,
  canManage = false,
}: {
  wb: ClaimReviewWorkbench;
  financialSummaries: CaseFinancialSummary[];
  canManage?: boolean;
}) {
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
  const [activeSection, setActiveSection] = useState('overview');

  function jumpToSection(value: string) {
    setActiveSection(value);
    window.requestAnimationFrame(() => {
      document.getElementById(`case-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="order-1 min-w-0 space-y-3 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
      <Tabs
        aria-label="Case workspace sections"
        value={activeSection}
        onValueChange={jumpToSection}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'evidence', label: 'Evidence & recovery' },
          { value: 'history', label: 'Timeline & history' },
        ]}
        className="sticky top-[4.25rem] z-10 w-fit max-w-full overflow-x-auto rounded-lg border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] p-1"
      />
      <div id="case-overview" className="scroll-mt-20 space-y-3">
      {selectedClaim ? (
        <ReconciliationSummaryCard caseId={selectedClaim.id} currency={selectedClaim.currency} canManage={canManage} />
      ) : null}
      {payoutCase ? (
        <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery} />
      ) : null}
      <GateRecommendationPanel recommendation={gateRecommendation} />
      {selectedClaim ? (
        <CaseInvestigationsCard
          caseId={selectedClaim.id}
          canManage={canManage}
          onRecommendationRefresh={refreshRecommendation}
        />
      ) : null}
      {selectedClaim ? (
        <ResponsibilityAssessmentCard
          caseId={selectedClaim.id}
          canManage={canManage}
        />
      ) : null}
      <PayoutCaseLeadBlock
        payoutCase={payoutCase}
        recoveryCase={recoveryCase}
        delivery={delivery}
        loading={decisionLoading}
        stale={decisionStale}
        showEvidence={false}
        canManage={canManage}
        onFindingSaved={refreshRecommendation}
      />
      </div>
      <div id="case-evidence" className="scroll-mt-20 space-y-3">
      <CaseFinancialHistoryCard summaries={financialSummaries} />
      <IntegrationEvidenceSourcePanel evidencePack={evidencePack} />
      {selectedClaim ? (
        <RecoveryCaseCard
          caseId={selectedClaim.id}
          recoveryCase={recoveryCase}
          payoutCase={payoutCase}
          loading={decisionLoading}
          canManage={canManage}
          onRefresh={refreshRecommendation}
        />
      ) : null}
      </div>
      <div id="case-history" className="scroll-mt-20 space-y-3">
      {history.length > 1 ? (
        <Card unstyled as="aside" variant="muted" className="border-[var(--ua-warning-border)] p-3">
          <p className="text-sm font-semibold" style={{ color: "var(--ua-text-primary)" }}>
            {history.length} previous payout cases for this customer
          </p>
          <a href={`${wb.customerProfileHref}#cases`} className="mt-1 inline-block text-xs font-semibold text-[var(--ua-action-primary)]">
            View case history
          </a>
        </Card>
      ) : null}

      {selectedClaim && latestOutcome && (
        <Card unstyled as="section" variant="panel" className="p-4">
          <p
            className="text-caption font-semibold mb-3"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Recorded merchant outcome
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                Merchant-recorded outcome
              </p>
              <p className="font-semibold" style={{ color: "var(--ua-text-primary)" }}>
                {DECISION_LABELS[latestOutcome.decision as Decision] ??
                  latestOutcome.decision}
              </p>
              {latestOutcome.actor_user_id && (
                <p
                  className="text-xs"
                  style={{ color: "var(--ua-text-secondary)" }}
                >
                  {actorLabel(latestOutcome.actor_user_id)}
                </p>
              )}
            </div>
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                Outcome
              </p>
              <p className="font-semibold" style={{ color: "var(--ua-text-primary)" }}>
                {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ??
                  latestOutcome.outcome}
              </p>
              {latestOutcome.updated_at && (
                <p
                  className="text-xs"
                  style={{ color: "var(--ua-text-secondary)" }}
                >
                  {formatDateTime(latestOutcome.updated_at)}
                </p>
              )}
            </div>
            {previousOutcome && (
              <div>
                <p
                  className="text-xs mb-0.5"
                  style={{ color: "var(--ua-text-secondary)" }}
                >
                  Previous outcome
                </p>
                <p className="font-semibold" style={{ color: "var(--ua-text-primary)" }}>
                  {DECISION_LABELS[previousOutcome.decision as Decision] ??
                    previousOutcome.decision}{" "}
                  /{" "}
                  {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ??
                    previousOutcome.outcome}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      <SupportCaseContextList cases={supportCases} />

      <Card unstyled as="section" variant="panel" className="p-4">
        <Card unstyled variant="muted" className="mb-3 inline-flex p-0.5">
          <button
            type="button"
            onClick={() => patch({ auditTab: "timeline" })}
            className="px-2.5 py-1 text-xs rounded"
            style={{
              background:
                state.auditTab === "timeline" ? "var(--ua-action-primary)" : "transparent",
              color:
                state.auditTab === "timeline"
                  ? "var(--ua-action-primary-fg)"
                  : "var(--ua-text-secondary)",
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
                state.auditTab === "history" ? "var(--ua-action-primary)" : "transparent",
              color:
                state.auditTab === "history"
                  ? "var(--ua-action-primary-fg)"
                  : "var(--ua-text-secondary)",
            }}
          >
            Claim history
          </button>
        </Card>
        {state.auditTab === "timeline" && (
          <>
            {!selectedClaim ? (
              <p className="text-sm" style={{ color: "var(--ua-text-secondary)" }}>
                Loading case history…
              </p>
            ) : selectedClaimEvents.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ua-text-secondary)" }}>
                No claim events recorded yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {selectedClaimEvents.map((event) => (
                  <Card unstyled
                    key={event.id}
                    as="li"
                    variant="muted"
                    className="p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--ua-text-primary)" }}
                        >
                          {claimEventLabel(event.event_type)}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--ua-text-secondary)" }}
                        >
                          {claimEventSummary(event)}
                        </p>
                      </div>
                      <div
                        className="text-right text-xs"
                        style={{ color: "var(--ua-text-secondary)" }}
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
                  </Card>
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
      </Card>
      </div>
    </div>
  );
}
