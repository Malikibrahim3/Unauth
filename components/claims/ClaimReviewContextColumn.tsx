"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
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
import type { RecoveryCase } from "@/lib/recoveries/types";
import {
  CaseFinancialHistoryCard,
  type CaseFinancialSummary,
} from "@/components/claims/payout/CaseFinancialHistoryCard";
import { CaseInvestigationsCard } from "@/components/claims/investigations/CaseInvestigationsCard";
import { ResponsibilityAssessmentCard } from "@/components/claims/payout/ResponsibilityAssessmentCard";
import { ReconciliationSummaryCard } from "@/components/claims/payout/ReconciliationSummaryCard";

const SECTION_LINKS = [
  { id: "customer-action", label: "Customer action" },
  { id: "responsibility", label: "Responsibility" },
  { id: "recovery", label: "Recovery" },
  { id: "timeline", label: "Timeline" },
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
    refreshRecommendation,
  } = wb;
  const payoutCase =
    (decisionData?.payoutCase as SupportPayoutCase | undefined) ?? null;
  const recoveryCase =
    (decisionData?.recoveryCase as RecoveryCase | null | undefined) ?? null;
  const evidencePack =
    (decisionData?.evidencePack as EvidencePack | null | undefined) ?? null;
  const delivery = (
    decisionData?.context as
      | { delivery?: ClaimDecisionContext["delivery"] }
      | undefined
  )?.delivery ?? null;
  const [activeSection, setActiveSection] = useState<string>("customer-action");

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace(/^#case-/, "");
      if (SECTION_LINKS.some((section) => section.id === hash)) {
        setActiveSection(hash);
      }
      if (hash === "evidence") setActiveSection("recovery");
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const timelineEvents = [...selectedClaimEvents].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
    return leftTime - rightTime;
  });
  const previousCases = history.filter((item) => item.id !== selectedClaim?.id);

  function selectSection(section: string) {
    setActiveSection(section);
  }

  return (
    <div className="order-2 min-w-0 space-y-4 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
      <nav
        aria-label="Case sections"
        className="sticky top-[4.25rem] z-10 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] p-1"
      >
        {SECTION_LINKS.map((section) => (
          <a
            key={section.id}
            href={`#case-${section.id}`}
            onClick={() => selectSection(section.id)}
            aria-current={activeSection === section.id ? "page" : undefined}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: activeSection === section.id ? "var(--ua-action-primary)" : "transparent",
              color: activeSection === section.id ? "var(--ua-action-primary-fg)" : "var(--ua-text-secondary)",
            }}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="case-customer-action" className="scroll-mt-20 space-y-3" aria-labelledby="case-customer-action-title">
        <div>
          <h2 id="case-customer-action-title" className="text-base font-semibold text-[var(--ua-text-primary)]">Customer action</h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">What to do for the customer, based on the matched item and source evidence.</p>
        </div>
        {selectedClaim ? (
          <ReconciliationSummaryCard
            caseId={selectedClaim.id}
            currency={selectedClaim.currency}
            canManage={canManage}
            onRefresh={refreshRecommendation}
          />
        ) : null}
      </section>

      <section id="case-responsibility" className="scroll-mt-20 space-y-3" aria-labelledby="case-responsibility-title">
        <div>
          <h2 id="case-responsibility-title" className="text-base font-semibold text-[var(--ua-text-primary)]">Responsibility</h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">Why the recommendation is supported, what remains uncertain, and who owns the next investigation.</p>
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

      <section id="case-recovery" className="scroll-mt-20 space-y-3" aria-labelledby="case-recovery-title">
        <span id="case-evidence" className="block scroll-mt-20" aria-hidden="true" />
        <div>
          <h2 id="case-recovery-title" className="text-base font-semibold text-[var(--ua-text-primary)]">Recovery</h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">Financial stages and supported recovery work remain separate from the customer decision.</p>
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

      <section id="case-timeline" className="scroll-mt-20 space-y-3" aria-labelledby="case-timeline-title">
        <div>
          <h2 id="case-timeline-title" className="text-base font-semibold text-[var(--ua-text-primary)]">Timeline</h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">Current case activity is ordered from the earliest recorded event to the latest.</p>
        </div>

        {previousCases.length > 0 ? (
          <p className="text-xs text-[var(--ua-text-secondary)]">
            Previous cases for this customer: {previousCases.length}.{" "}
            <a href={`${wb.customerProfileHref}#cases`} className="font-semibold text-[var(--ua-action-primary)] underline underline-offset-2">View case history</a>
          </p>
        ) : null}

        {selectedClaim && latestOutcome ? (
          <Card unstyled as="section" variant="panel" className="p-4">
            <p className="text-caption font-semibold text-[var(--ua-text-secondary)]">Recorded merchant outcome</p>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-[var(--ua-text-secondary)]">Decision</p>
                <p className="mt-0.5 font-semibold text-[var(--ua-text-primary)]">{DECISION_LABELS[latestOutcome.decision as Decision] ?? latestOutcome.decision}</p>
                {latestOutcome.actor_user_id ? <p className="text-xs text-[var(--ua-text-secondary)]">{actorLabel(latestOutcome.actor_user_id)}</p> : null}
              </div>
              <div>
                <p className="text-xs text-[var(--ua-text-secondary)]">Outcome</p>
                <p className="mt-0.5 font-semibold text-[var(--ua-text-primary)]">{OUTCOME_LABELS[latestOutcome.outcome as Outcome] ?? latestOutcome.outcome}</p>
                {latestOutcome.updated_at ? <p className="text-xs text-[var(--ua-text-secondary)]">{formatDateTime(latestOutcome.updated_at)}</p> : null}
              </div>
              {previousOutcome ? (
                <div>
                  <p className="text-xs text-[var(--ua-text-secondary)]">Previous outcome</p>
                  <p className="mt-0.5 font-semibold text-[var(--ua-text-primary)]">
                    {DECISION_LABELS[previousOutcome.decision as Decision] ?? previousOutcome.decision} / {OUTCOME_LABELS[previousOutcome.outcome as Outcome] ?? previousOutcome.outcome}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <SupportCaseContextList
          cases={supportCases}
          title="Helpdesk source activity"
          bare
          emptyMessage="No linked helpdesk source activity is available for this case."
        />

        {timelineEvents.length === 0 ? (
          <p className="text-sm text-[var(--ua-text-secondary)]">No case activity recorded yet.</p>
        ) : (
          <ol className="divide-y border-y border-[var(--ua-border-subtle)]">
            {timelineEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ua-text-primary)]">{claimEventLabel(event.event_type)}</p>
                  <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">{claimEventSummary(event)}</p>
                  <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Source: {eventSourceLabel(event)}</p>
                </div>
                <div className="text-right text-xs text-[var(--ua-text-secondary)]">
                  <p>{event.created_at ? formatDateTime(event.created_at) : "—"}</p>
                  {event.actor_user_id ? <p>{actorLabel(event.actor_user_id)}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}

        {previousCases.length > 0 ? (
          <div className="border-t border-[var(--ua-border-subtle)] pt-3">
            <p className="mb-2 text-xs font-semibold text-[var(--ua-text-secondary)]">Previous cases</p>
            <ClaimReviewHistoryTable history={previousCases} onSelectClaim={setClaimId} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
