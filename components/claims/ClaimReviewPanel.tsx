'use client';

import { useClaimReviewWorkbench } from '@/components/claims/claimReviewState';
import { ClaimReviewActionRail } from '@/components/claims/ClaimReviewActionRail';
import { ClaimReviewContextColumn } from '@/components/claims/ClaimReviewContextColumn';
import { ClaimReviewFormSection } from '@/components/claims/ClaimReviewFormSection';
import { ClaimReviewHeader } from '@/components/claims/ClaimReviewHeader';
import { ClaimReviewToast } from '@/components/claims/ClaimReviewToast';
import { CLAIM_REVIEW_PANEL_ROOT_STYLE } from '@/components/claims/claimReviewStyles';

export default function ClaimReviewPanel({
  profileId,
  initialClaimId,
}: {
  profileId: string;
  initialClaimId?: string | null;
}) {
  const wb = useClaimReviewWorkbench(profileId, initialClaimId);

  return (
    <div className="flex flex-col" style={CLAIM_REVIEW_PANEL_ROOT_STYLE}>
      <ClaimReviewToast wb={wb} />
      <ClaimReviewHeader wb={wb} />
      <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_400px] gap-6 p-4 md:p-6 items-start">
        <ClaimReviewContextColumn wb={wb} />
        <ClaimReviewActionRail wb={wb} />
        <ClaimReviewFormSection wb={wb} />
      </div>
    </div>
  );
}
