'use client';

import { useClaimReviewWorkbench } from '@/components/claims/claimReviewState';
import { ClaimReviewActionRail } from '@/components/claims/ClaimReviewActionRail';
import { ClaimReviewContextColumn } from '@/components/claims/ClaimReviewContextColumn';
import { ClaimReviewFormSection } from '@/components/claims/ClaimReviewFormSection';
import { ClaimReviewHeader } from '@/components/claims/ClaimReviewHeader';
import { ClaimReviewToast } from '@/components/claims/ClaimReviewToast';
import { CaseComments } from '@/components/collaboration/CaseComments';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';
import type { ClaimRecord } from '@/components/claims/claimReviewTypes';

export default function ClaimReviewPanel({
  profileId,
  sourceCustomerId,
  initialClaimId,
  initialClaim,
  canManage = false,
  financialSummaries = [],
  caseBasePath = '/cases',
}: {
  profileId: string;
  sourceCustomerId: string | null;
  initialClaimId?: string | null;
  initialClaim?: ClaimRecord | null;
  canManage?: boolean;
  financialSummaries?: CaseFinancialSummary[];
  caseBasePath?: '/cases';
}) {
  const wb = useClaimReviewWorkbench(profileId, sourceCustomerId, initialClaimId, initialClaim);

  return (
    <>
      <ClaimReviewToast wb={wb} />
      <ClaimReviewHeader wb={wb} caseBasePath={caseBasePath}>
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <div className="min-w-0 space-y-5">
            <ClaimReviewContextColumn
              wb={wb}
              financialSummaries={financialSummaries}
              canManage={canManage}
            />
            <ClaimReviewFormSection wb={wb} />
            {initialClaimId ? <CaseComments caseId={initialClaimId} canComment={canManage} /> : null}
          </div>
          <ClaimReviewActionRail wb={wb} canManage={canManage} />
        </div>
      </ClaimReviewHeader>
    </>
  );
}
