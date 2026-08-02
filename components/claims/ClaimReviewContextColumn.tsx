"use client";

import { EvidenceThread, RecordedOutcome } from "@/components/ui";
import { claimEventLabel, claimEventSummary } from "@/lib/claims/events";
import SupportCaseContextList from "@/components/support/SupportCaseContextList";
import {
  DECISION_LABELS,
  OUTCOME_LABELS,
} from "@/components/claims/claimReviewLabels";
import { formatDateTime } from "@/lib/utils/format";
import { actorLabel } from "@/components/claims/claimReviewLogic";
import { ClaimReviewHistoryTable } from "@/components/claims/ClaimReviewHistoryTable";
import { RecoveryCaseCard } from "@/components/claims/payout/RecoveryCaseCard";
import { IntegrationEvidenceSourcePanel } from "@/components/claims/payout/IntegrationEvidenceSourcePanel";
import { EvidenceChecklistCard } from "@/components/claims/payout/EvidenceChecklistCard";
import type { ClaimReviewWorkbench } from "@/components/claims/claimReviewWorkbench";
import type { ClaimDecisionContext } from "@/lib/claims/decision/types";
import type { Decision, Outcome } from "@/components/claims/claimReviewTypes";
import type { EvidencePack } from "@/lib/integrations/types";
import type { SupportPayoutCase } from "@/lib/payouts/types";
import { PAYOUT_CASE_NEXT_ACTION_LABELS } from "@/lib/payouts/types";
import type { RecoveryCase } from "@/lib/recoveries/types";
import {
  CaseFinancialHistoryCard,
  type CaseFinancialSummary,
} from "@/components/claims/payout/CaseFinancialHistoryCard";
import { CaseInvestigationsCard } from "@/components/claims/investigations/CaseInvestigationsCard";
import { ResponsibilityAssessmentCard } from "@/components/claims/payout/ResponsibilityAssessmentCard";
import { ReconciliationSummaryCard } from "@/components/claims/payout/ReconciliationSummaryCard";

const SECTION_LINKS = [
  { id: "evidence", label: "Evidence & recommendations" },
  { id: "responsibility", label: "Responsibility" },
  { id: "recovery", label: "Recovery" },
  { id: "activity", label: "Activity" },
] as const;

function eventSourceLabel(event: { metadata?: unknown }): string {
  const metadata = event.metadata && typeof event.metadata === "object"
    ? event.metadata as Record<string, unknown>
    : {};
  const source = metadata.source_system ?? metadata.source ?? metadata.provider;
  return typeof source === "string" && source.trim()
    ? source.replaceAll("_", " ")
    : "Case activity";
}

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
    setClaimId,
    decisionData,
    decisionLoading,
    decisionError,
    decisionStale,
    refreshRecommendation,
  } = wb;
  const payoutCase =
    (decisionData?.payoutCase as SupportPayoutCase | undefined) ?? null;
  const requiredContextReady =
    Boolean(decisionData) && !decisionLoading && !decisionError;
  const recoveryCase =
    (decisionData?.recoveryCase as RecoveryCase | null | undefined) ?? null;
  const evidencePack =
    (decisionData?.evidencePack as EvidencePack | null | undefined) ?? null;
  const delivery = (
    decisionData?.context as
      | { delivery?: ClaimDecisionContext["delivery"] }
      | undefined
  )?.delivery ?? null;
  const timelineEvents = [...selectedClaimEvents].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
    return leftTime - rightTime;
  });
  const previousCases = history.filter((item) => item.id !== selectedClaim?.id);

  return (
    <div className="min-w-0 space-y-6">
      <nav
        aria-label="Case sections"
        className="sticky top-[var(--ua-utility-header-height)] z-10 flex max-w-full gap-7 overflow-x-auto border-b border-[var(--ua-border-subtle)] bg-[var(--ua-canvas)]"
      >
        {SECTION_LINKS.map((section) => (
          <a
            key={section.id}
            href={`#case-${section.id}`}
            className="ua-text-label shrink-0 border-b border-transparent px-0.5 py-2.5 hover:border-[var(--ua-border-strong)] hover:text-[var(--ua-text-primary)] focus-visible:shadow-[var(--ua-shadow-focus)]"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="case-evidence" className="scroll-mt-20 space-y-4" aria-labelledby="case-evidence-title">
        <span id="case-customer-action" className="block scroll-mt-20" aria-hidden="true" />
        <div>
          <h2 id="case-evidence-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Evidence & recommendations</h2>
          <p className="mt-1.5 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">Source facts, merchant findings, and system inferences remain distinct while the three recommendation axes stay advisory.</p>
        </div>
        {decisionLoading && decisionData ? (
          <p role="status" className="ua-text-caption-role">
            Updating evidence context; the last loaded result remains visible.
          </p>
        ) : null}
        {decisionStale && !decisionLoading ? (
          <p role="status" className="ua-text-caption-role text-[var(--ua-warning)]">
            Case facts changed after this recommendation was evaluated. Review the evidence before acting.
          </p>
        ) : null}
        {selectedClaim ? (
          <ReconciliationSummaryCard
            caseId={selectedClaim.id}
            currency={selectedClaim.currency}
            canManage={canManage}
            requiredContextReady={requiredContextReady}
            evidenceStrength={payoutCase?.evidence.strength}
            nextAction={payoutCase
              ? PAYOUT_CASE_NEXT_ACTION_LABELS[payoutCase.nextAction]
              : undefined}
            nextActionReason={payoutCase?.nextActionReason}
            onRefresh={refreshRecommendation}
          />
        ) : null}
      </section>

      <section id="case-responsibility" className="scroll-mt-20 space-y-4" aria-labelledby="case-responsibility-title">
        <div>
          <h2 id="case-responsibility-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Responsibility</h2>
          <p className="ua-text-caption-role mt-1">Why the recommendation is supported, what remains uncertain, and who owns the next investigation.</p>
        </div>
        {payoutCase ? <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery} /> : null}
        {selectedClaim ? (
          <CaseInvestigationsCard
            caseId={selectedClaim.id}
            canManage={canManage}
            onRecommendationRefresh={refreshRecommendation}
          />
        ) : null}
        {selectedClaim ? (
          <ResponsibilityAssessmentCard caseId={selectedClaim.id} canManage={canManage} />
        ) : null}
      </section>

      <section id="case-recovery" className="scroll-mt-20 space-y-4" aria-labelledby="case-recovery-title">
        <div>
          <h2 id="case-recovery-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Recovery</h2>
          <p className="ua-text-caption-role mt-1">Financial stages and supported recovery work remain separate from the customer decision.</p>
        </div>
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
      </section>

      <section id="case-activity" className="scroll-mt-20 space-y-4" aria-labelledby="case-activity-title">
        <span id="case-timeline" className="block scroll-mt-20" aria-hidden="true" />
        <div>
          <h2 id="case-activity-title" className="ua-text-section-title text-[var(--ua-text-primary)]">Activity</h2>
          <p className="ua-text-caption-role mt-1">Current case activity is ordered from the earliest recorded event to the latest.</p>
        </div>

        {previousCases.length > 0 ? (
          <p className="ua-text-caption-role">
            Previous cases for this customer: {previousCases.length}.{" "}
            <a href={`${wb.customerProfileHref}#cases`} className="ua-text-working-title text-[var(--ua-action-primary)] underline underline-offset-2">View case history</a>
          </p>
        ) : null}

        {selectedClaim && latestOutcome ? (
          <RecordedOutcome
            meta={latestOutcome.updated_at ? formatDateTime(latestOutcome.updated_at) : undefined}
          >
            <strong>{DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}</strong>
            {' · '}
            {OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}
            {latestOutcome.actor_user_id ? ` · ${actorLabel(latestOutcome.actor_user_id)}` : ''}
            {previousOutcome ? (
              <span className="ml-2 text-[var(--ua-text-tertiary)]">
                Previously {DECISION_LABELS[previousOutcome.decision as Decision] ?? previousOutcome.decision} / {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ?? previousOutcome.outcome}
              </span>
            ) : null}
          </RecordedOutcome>
        ) : null}

        <SupportCaseContextList
          cases={supportCases}
          title="Helpdesk source activity"
          bare
          emptyMessage="No linked helpdesk source activity is available for this case."
        />

        {timelineEvents.length === 0 ? (
          <p className="ua-text-body text-[var(--ua-text-secondary)]">No case activity recorded yet.</p>
        ) : (
          <EvidenceThread
            label="Case evidence and decision history"
            items={timelineEvents.map((event) => ({
              key: event.id,
              authority: 'source' as const,
              label: claimEventLabel(event.event_type),
              value: claimEventSummary(event),
              meta: (
                <>
                  <span>{eventSourceLabel(event)}</span>
                  <span>{event.created_at ? formatDateTime(event.created_at) : 'Time unavailable'}</span>
                  {event.actor_user_id ? <span>{actorLabel(event.actor_user_id)}</span> : null}
                </>
              ),
              state: 'recorded' as const,
            }))}
          />
        )}

        {previousCases.length > 0 ? (
          <div className="border-t border-[var(--ua-border-subtle)] pt-3">
            <p className="ua-text-label mb-2">Previous cases</p>
            <ClaimReviewHistoryTable history={previousCases} onSelectClaim={setClaimId} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
