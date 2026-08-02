'use client';

import { ClaimReviewManageCard } from '@/components/claims/ClaimReviewManageCard';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';

export function ClaimReviewActionRail({ wb, canManage = false }: { wb: ClaimReviewWorkbench; canManage?: boolean }) {
  const contextStatus = wb.decisionLoading && !wb.decisionData
    ? 'loading'
    : wb.decisionError || !wb.decisionData
      ? 'unavailable'
      : 'ready';

  return (
    <aside
      /* xl:pt matches the main column's sticky section nav so the rail's
       * first card header shares a baseline with the main column's first
       * heading (C10) instead of starting ~52px above it. */
      className="min-w-0 xl:sticky xl:top-[calc(var(--ua-utility-header-height)+1rem)] xl:max-h-[calc(100vh-var(--ua-utility-header-height)-2rem)] xl:overflow-y-auto xl:self-start xl:border-l xl:border-[var(--ua-border-default)] xl:pl-5 xl:pt-[var(--ua-space-12)]"
      aria-label="Merchant decision"
    >
      <ClaimReviewManageCard wb={wb} canManage={canManage} contextStatus={contextStatus} />
    </aside>
  );
}
