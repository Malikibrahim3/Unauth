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
      style={{ borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-primary)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-caption font-semibold" style={{ color: 'var(--ua-text-secondary)' }}>
          Recovery route
        </p>
        <StatusBadge family="recoverability" value={recovery.recoverability} size="sm" />
      </div>

      <p className="text-sm" style={{ color: 'var(--ua-text-primary)' }}>
        Owner: <span className="font-semibold">{LIKELY_OWNER_LABELS[recovery.likelyOwner]}</span>
      </p>

      {recovery.requiredEvidence.length > 0 && (
        <div className="mt-2">
          <p className="text-xs mb-1" style={{ color: 'var(--ua-text-secondary)' }}>
            Still needed
          </p>
          <EvidenceChecklist items={recovery.requiredEvidence.map((key) => ({ label: humanizeEvidenceKey(key) }))} />
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
        <span className="font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Support next step: </span>
        {recovery.suggestedNextAction}
      </p>
    </section>
  );
}
