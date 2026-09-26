'use client';

import { useClaimReviewWorkbench } from '@/components/claims/claimReviewState';
import type { CaseFinancialSummary } from '@/components/claims/payout/CaseFinancialHistoryCard';
import type { ClaimRecord } from '@/components/claims/claimReviewTypes';
import {
  CaseDetailOperations,
  type CaseDetailAction,
  type CaseDetailTab,
} from '@/components/claims/CaseDetailOperations';
import type { CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';

export default function ClaimReviewPanel({
  profileId,
  sourceCustomerId,
  initialClaimId,
  initialClaim,
  initialDecisionData,
  canManage = false,
  financialSummaries = [],
  caseBackHref = '/cases',
  initialTab,
  investigationId,
  initialAction,
  caseEvidenceFile,
}: {
  profileId: string;
  sourceCustomerId: string | null;
  initialClaimId?: string | null;
  initialClaim?: ClaimRecord | null;
  initialDecisionData?: Record<string, unknown> | null;
  canManage?: boolean;
  financialSummaries?: CaseFinancialSummary[];
  caseBackHref?: string;
  initialTab?: CaseDetailTab | null;
  investigationId?: string | null;
  initialAction?: CaseDetailAction;
  caseEvidenceFile?: CaseEvidenceFile | null;
}) {
  const wb = useClaimReviewWorkbench(
    profileId,
    sourceCustomerId,
    initialClaimId,
    initialClaim,
    initialDecisionData,
  );

  return (
    <CaseDetailOperations
      wb={wb}
      financialSummaries={financialSummaries}
      canManage={canManage}
      caseBackHref={caseBackHref}
      initialTab={initialTab}
      investigationId={investigationId}
      initialAction={initialAction}
      caseEvidenceFile={caseEvidenceFile}
    />
  );
}
