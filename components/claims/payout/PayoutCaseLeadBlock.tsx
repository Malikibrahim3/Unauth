'use client';

import { REQUESTED_ACTION_LABELS, type SupportPayoutCase } from '@/lib/payouts/types';
import { Card } from '@/components/ui';
import { PAYOUT_DISCLAIMER } from '@/components/claims/payout/payoutCopy';
import { PayoutExposureCard } from '@/components/claims/payout/PayoutExposureCard';
import { EvidenceChecklistCard } from '@/components/claims/payout/EvidenceChecklistCard';
import { DeliveryEvidenceCard } from '@/components/claims/payout/DeliveryEvidenceCard';
import { LossAttributionCard } from '@/components/claims/payout/LossAttributionCard';
import { RecoveryPathCard } from '@/components/claims/payout/RecoveryPathCard';
import type { RecoveryCase } from '@/lib/recoveries/types';

/**
 * Money-first payout decision lead block for a support payout case. Reads the
 * SupportPayoutCase from the transitional claim decision response.
 * Advisory throughout — the merchant owns the decision.
 */
export function PayoutCaseLeadBlock({
  payoutCase,
  recoveryCase: _recoveryCase,
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
      <Card unstyled as="section" variant="flat" className="p-4">
        <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
          Loading payout exposure…
        </p>
      </Card>
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
