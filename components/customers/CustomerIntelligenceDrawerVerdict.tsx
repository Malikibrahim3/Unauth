'use client';

import { buildPlainVerdict } from '@/components/customers/customerIntelligenceDrawerUtils';
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
  const plainVerdict = buildPlainVerdict(
    linkedCount,
    profile.risk_score,
    profile.risk_level,
    variantCount,
    profile.profile_confidence,
  );

  return (
    <>
      <div className="cid-verdict-card">
        <p className="cid-verdict-heading">What this means</p>
        <p className="cid-verdict-lead">{plainVerdict}</p>
        <p className="cid-verdict-note">
          {hasCleanRecord
            ? 'No claims or chargebacks in your data for this customer. Identity details are below.'
            : 'Refund and chargeback claims on record are listed below, with their source. Compile the signal data into an evidence package if you need documentation.'}
        </p>
      </div>
      {hasCleanRecord ? (
        <p className="cid-clean-banner mb-3 px-3 py-2 text-body-sm">Clean record - no claims or chargebacks in your data.</p>
      ) : null}
    </>
  );
}
