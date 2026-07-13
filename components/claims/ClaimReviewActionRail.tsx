'use client';

import { ClaimReviewManageCard } from '@/components/claims/ClaimReviewManageCard';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewActionRail({ wb, canManage = false }: { wb: ClaimReviewWorkbench; canManage?: boolean }) {
  return (
    <aside
      className="space-y-2 min-w-0 w-full order-2 min-[1100px]:col-start-2 min-[1100px]:row-start-1 min-[1100px]:row-span-2 min-[1100px]:sticky min-[1100px]:top-[4.25rem] min-[1100px]:max-h-[calc(100vh-4.5rem)] min-[1100px]:overflow-y-auto min-[1100px]:self-start pb-6"
      aria-label="Record decision"
    >
      <ClaimReviewManageCard wb={wb} canManage={canManage} />
    </aside>
  );
}
