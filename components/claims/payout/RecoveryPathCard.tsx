'use client';

import {
  LIKELY_OWNER_LABELS,
  RECOVERABILITY_LABELS,
  type RecoveryPath,
} from '@/lib/payouts/types';
import {
  TONE_STYLE,
  humanizeEvidenceKey,
  recoverabilityTone,
} from '@/components/claims/payout/payoutCopy';

export function RecoveryPathCard({ recovery }: { recovery: RecoveryPath }) {
  const tone = TONE_STYLE[recoverabilityTone(recovery.recoverability)];

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Recovery route
        </p>
        <span
          className="inline-block text-xs font-semibold rounded-full px-2.5 py-1"
          style={{ background: tone.bg, color: tone.color }}
        >
          {RECOVERABILITY_LABELS[recovery.recoverability]}
        </span>
      </div>

      <p className="text-sm" style={{ color: 'var(--text)' }}>
        Owner: <span className="font-semibold">{LIKELY_OWNER_LABELS[recovery.likelyOwner]}</span>
      </p>

      {recovery.requiredEvidence.length > 0 && (
        <div className="mt-2">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Still needed
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recovery.requiredEvidence.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
              >
                {humanizeEvidenceKey(key)}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>Support next step: </span>
        {recovery.suggestedNextAction}
      </p>
    </section>
  );
}
