'use client';

import { useClaimReviewWorkbench } from '@/components/claims/claimReviewState';
import { ClaimReviewActionRail } from '@/components/claims/ClaimReviewActionRail';
import { ClaimReviewContextColumn } from '@/components/claims/ClaimReviewContextColumn';
import { ClaimReviewFormSection } from '@/components/claims/ClaimReviewFormSection';
import { ClaimReviewHeader } from '@/components/claims/ClaimReviewHeader';
import { ClaimReviewToast } from '@/components/claims/ClaimReviewToast';
import { CLAIM_REVIEW_PANEL_ROOT_STYLE } from '@/components/claims/claimReviewStyles';
import { CaseComments } from '@/components/collaboration/CaseComments';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';

export default function ClaimReviewPanel({
  profileId,
  sourceCustomerId,
  initialClaimId,
  canManage = false,
  financialSummaries = [],
}: {
  profileId: string;
  sourceCustomerId: string | null;
  initialClaimId?: string | null;
  canManage?: boolean;
  financialSummaries?: CaseFinancialSummary[];
}) {
  const wb = useClaimReviewWorkbench(profileId, sourceCustomerId, initialClaimId);

  return (
    <div className="flex flex-col" style={CLAIM_REVIEW_PANEL_ROOT_STYLE}>
      <ClaimReviewToast wb={wb} />
      <ClaimReviewHeader wb={wb} />
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 items-start gap-3.5 px-3 pb-6 pt-3 md:px-5 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <ClaimReviewContextColumn
          wb={wb}
          financialSummaries={financialSummaries}
          canManage={canManage}
        />
        <ClaimReviewActionRail wb={wb} canManage={canManage} />
        <ClaimReviewFormSection wb={wb} />
        {initialClaimId ? <CaseComments caseId={initialClaimId} canComment={canManage} /> : null}
      </div>
    </div>
  );
}
