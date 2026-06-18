'use client';

import { isFinalClaimStatus } from '@/lib/claims/sla';
import { ClaimDecisionRecommendationCard, type ClaimDecisionPayload } from '@/components/claims/ClaimDecisionRecommendationCard';
import { ClaimLifecycleStatusBar, RailSection } from '@/components/claims/claimReviewPrimitives';
import { ClaimReviewEvidenceRail } from '@/components/claims/ClaimReviewEvidenceRail';
import { ClaimReviewNextStepCard } from '@/components/claims/ClaimReviewNextStepCard';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewActionRail({ wb }: { wb: ClaimReviewWorkbench }) {
  const {
    selectedClaim,
    claimId,
    claimIsClosed,
    busy,
    primaryAction,
    state,
    dispatch,
    onStatusChange,
    onReopen,
    decisionLoading,
    decisionError,
    decisionData,
    decisionStale,
    refreshRecommendation,
  } = wb;

  return (
    <aside
      className="space-y-2 min-w-0 w-full order-2 min-[1100px]:col-start-2 min-[1100px]:row-start-1 min-[1100px]:row-span-2 min-[1100px]:sticky min-[1100px]:top-[4.25rem] min-[1100px]:max-h-[calc(100vh-4.5rem)] min-[1100px]:overflow-y-auto min-[1100px]:self-start pb-6"
      aria-label="Evidence and outcomes"
    >
      <p className="text-caption leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        Support conversation stays in your helpdesk. Unauth shows the identity evidence and outcome record for this claim.
      </p>

      <ClaimReviewNextStepCard wb={wb} />

      <ClaimDecisionRecommendationCard
        claimId={claimId || null}
        loading={decisionLoading}
        error={decisionError}
        data={decisionData as ClaimDecisionPayload | null}
        stale={decisionStale}
        onRefresh={refreshRecommendation}
        open={state.railOpen.recommendation ?? true}
        onToggle={(id) => dispatch({ type: 'toggleRail', id })}
      />

      <ClaimReviewEvidenceRail wb={wb} />

      {selectedClaim && (
        <RailSection
          id="status"
          title="Review status"
          open={state.railOpen.status}
          onToggle={(id) => dispatch({ type: 'toggleRail', id })}
          highlighted={primaryAction.railSection === 'status'}
        >
          <ClaimLifecycleStatusBar
            claimId={claimId}
            busy={busy}
            claimIsClosed={claimIsClosed}
            statusToSet={state.statusToSet}
            setStatusToSet={(status) => wb.patch({ statusToSet: status })}
            statusNote={state.statusNote}
            setStatusNote={(statusNote) => wb.patch({ statusNote })}
            onStatusChange={onStatusChange}
            reopenNote={state.reopenNote}
            setReopenNote={(reopenNote) => wb.patch({ reopenNote })}
            onReopen={onReopen}
            canReopen={!!selectedClaim && isFinalClaimStatus(selectedClaim.status)}
            submitIsPrimary={primaryAction.key === 'status' || primaryAction.key === 'reopen'}
          />
        </RailSection>
      )}
    </aside>
  );
}
