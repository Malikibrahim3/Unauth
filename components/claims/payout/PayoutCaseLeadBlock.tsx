'use client';

import {
  PAYOUT_CASE_STATUS_LABELS,
  PAYOUT_DECISION_STATE_LABELS,
  REQUESTED_ACTION_LABELS,
  RECOVERY_STATE_LABELS,
  type CaseClarificationRequest,
  type SupportPayoutCase,
} from '@/lib/payouts/types';
import { Badge, PanelCard } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PAYOUT_DISCLAIMER } from '@/components/claims/payout/payoutCopy';
import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { formatCurrency } from '@/lib/utils/format';
import { PayoutExposureCard } from '@/components/claims/payout/PayoutExposureCard';
import { EvidenceChecklistCard } from '@/components/claims/payout/EvidenceChecklistCard';
import { DeliveryEvidenceCard } from '@/components/claims/payout/DeliveryEvidenceCard';
import { LossAttributionCard } from '@/components/claims/payout/LossAttributionCard';
import { RecoveryPathCard } from '@/components/claims/payout/RecoveryPathCard';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';

/**
 * Money-first payout decision lead block for a support payout case. Reads the
 * SupportPayoutCase from the transitional claim decision response.
 * Advisory throughout — the merchant owns the decision.
 */
export function PayoutCaseLeadBlock({
  payoutCase,
  recoveryCase,
  delivery,
  loading,
  stale,
  showEvidence = true,
}: {
  payoutCase: SupportPayoutCase | null | undefined;
  recoveryCase?: RecoveryCase | null;
  delivery?: import('@/lib/claims/decision/types').ClaimDecisionContext['delivery'];
  loading?: boolean;
  stale?: boolean;
  showEvidence?: boolean;
}) {
  if (!payoutCase) {
    if (!loading) return null;
    return (
      <PanelCard as="section" variant="app" className="p-4">
        <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
          Loading payout exposure…
        </p>
      </PanelCard>
    );
  }

  const requestedActionLabel = REQUESTED_ACTION_LABELS[payoutCase.requestedAction.primary];

  return (
    <div className="space-y-4">
      {stale && (
        <p className="text-caption" style={{ color: 'var(--warning)' }}>
          Case context changed - payout exposure may be outdated.
        </p>
      )}
      <PayoutExposureCard exposure={payoutCase.exposure} requestedActionLabel={requestedActionLabel} />
      {showEvidence ? <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery ?? null} /> : null}
      {payoutCase.claimType === 'item_not_received' || payoutCase.claimType === 'missing_item' ? (
        <DeliveryEvidenceCard delivery={delivery ?? null} />
      ) : null}
      <LossAttributionCard attribution={payoutCase.attribution} />
      <RecoveryPathCard recovery={payoutCase.recovery} />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {PAYOUT_DISCLAIMER}
      </p>
    </div>
  );
}

function ClarificationRequestList({ requests }: { requests: CaseClarificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        No clarification requests recorded yet.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {requests.slice(0, 4).map((request) => (
        <PanelCard key={request.id} variant="app" className="p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {request.target_name ?? request.target_type.toUpperCase()}
            </p>
            <StatusBadge family="workflowStatus" value={request.status} size="sm" />
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {request.request_summary}
          </p>
          {request.requested_evidence.length > 0 && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Needs {request.requested_evidence.map(humanizeEvidenceKey).join(', ')}
            </p>
          )}
        </PanelCard>
      ))}
    </div>
  );
}
