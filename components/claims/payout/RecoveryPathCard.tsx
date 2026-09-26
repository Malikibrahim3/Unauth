'use client';

import {
  LIKELY_OWNER_LABELS,
  type RecoveryPath,
} from '@/lib/payouts/types';
import {
  humanizeEvidenceKey,
} from '@/components/claims/payout/payoutCopy';
import { EvidenceChecklist, StatusBadge } from '@/components/ui';

export function RecoveryPathCard({ recovery }: { recovery: RecoveryPath }) {
  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: '#eae8e5', background: '#fff' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
          Recovery route
        </p>
        <StatusBadge family="recoverability" value={recovery.recoverability} size="sm" />
      </div>

      <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: '#1c1f23' }}>
        Owner: <span className="font-semibold">{LIKELY_OWNER_LABELS[recovery.likelyOwner]}</span>
      </p>

      {recovery.requiredEvidence.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-1" style={{ color: '#64686d' }}>
            Still needed
          </p>
          <EvidenceChecklist items={recovery.requiredEvidence.map((key) => ({ label: humanizeEvidenceKey(key) }))} />
        </div>
      )}

      <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-3">
        <span className="font-semibold" style={{ color: '#1c1f23' }}>Support next step: </span>
        {recovery.suggestedNextAction}
      </p>
    </section>
  );
}
