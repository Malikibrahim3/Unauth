'use client';

import { REQUESTED_ACTION_LABELS, type SupportPayoutCase } from '@/lib/payouts/types';
import { Card } from '@/components/ui';
import { PAYOUT_DISCLAIMER } from '@/components/claims/payout/payoutCopy';
import { PayoutExposureCard } from '@/components/claims/payout/PayoutExposureCard';
import { EvidenceChecklistCard } from '@/components/claims/payout/EvidenceChecklistCard';
import { DeliveryEvidenceCard } from '@/components/claims/payout/DeliveryEvidenceCard';
import type { RecoveryCase } from '@/lib/recoveries/types';

/**
 * Compatibility compensation context for a case. The reconciliation summary
 * above is the source of the three independent answers; this block keeps the
 * existing value breakdown available while consumers migrate.
 * Advisory throughout — the merchant owns the decision.
 */
export function PayoutCaseLeadBlock({
  payoutCase,
  recoveryCase: _recoveryCase,
  delivery,
  loading,
  stale,
  showEvidence = true,
  canManage = false,
  onFindingSaved,
}: {
  payoutCase: SupportPayoutCase | null | undefined;
  recoveryCase?: RecoveryCase | null;
  delivery?: import('@/lib/claims/decision/types').ClaimDecisionContext['delivery'];
  loading?: boolean;
  stale?: boolean;
  showEvidence?: boolean;
  canManage?: boolean;
  onFindingSaved?: () => void;
}) {
  if (!payoutCase) {
    if (!loading) return null;
    return (
      <Card unstyled as="section" variant="panel" className="p-4">
        <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>
          Loading compensation context…
        </p>
      </Card>
    );
  }

  const requestedActionLabel = REQUESTED_ACTION_LABELS[payoutCase.requestedAction.primary];

  return (
    <div className="space-y-4">
      {stale && (
        <p className="text-caption" style={{ color: 'var(--ua-warning)' }}>
          Case context changed - compensation context may be outdated.
        </p>
      )}
      <PayoutExposureCard exposure={payoutCase.exposure} requestedActionLabel={requestedActionLabel} />
      {showEvidence ? <EvidenceChecklistCard evidence={payoutCase.evidence} delivery={delivery ?? null} /> : null}
      {payoutCase.claimType === 'item_not_received' || payoutCase.claimType === 'missing_item' ? (
        <DeliveryEvidenceCard
          delivery={delivery ?? null}
          caseId={payoutCase.caseId}
          canManage={canManage}
          onFindingSaved={onFindingSaved}
        />
      ) : null}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--ua-text-tertiary)' }}>
        {PAYOUT_DISCLAIMER}
      </p>
    </div>
  );
}
