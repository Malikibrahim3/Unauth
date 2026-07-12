'use client';

import type { DrawerProfile } from '@/components/customers/customerIntelligenceDrawerUtils';

export function CustomerIntelligenceDrawerVerdict({
  profile,
  linkedCount,
  variantCount,
  hasCleanRecord,
}: {
  profile: DrawerProfile;
  linkedCount: number;
  variantCount: number;
  hasCleanRecord: boolean;
}) {
  void linkedCount;
  void variantCount;
  const caseCount = profile.total_refund_claims + profile.total_chargebacks;
  const plainVerdict =
    caseCount > 0
      ? `${caseCount} prior payout ${caseCount === 1 ? 'case' : 'cases'} are linked to this customer context.`
      : 'No prior payout cases are linked to this customer context.';

  return (
    <>
      <div className="cid-verdict-card">
        <p className="cid-verdict-heading">What this means</p>
        <p className="cid-verdict-lead">{plainVerdict}</p>
        <p className="cid-verdict-note">
          {hasCleanRecord
            ? 'No payout cases or chargebacks in your data for this customer. Customer context details are below.'
            : 'Refund and chargeback case history is listed below, with its source. Use it as supporting context for the payout case.'}
        </p>
      </div>
      {hasCleanRecord ? (
        <p className="cid-clean-banner mb-3 px-3 py-2 text-body-sm">No payout cases or chargebacks in your data.</p>
      ) : null}
    </>
  );
}
