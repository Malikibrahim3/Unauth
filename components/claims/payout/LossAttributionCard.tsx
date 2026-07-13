'use client';

import {
  LOSS_ATTRIBUTION_DISPLAY,
  type LossAttributionResult,
} from '@/lib/payouts/types';
import { PanelCard } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function LossAttributionCard({ attribution }: { attribution: LossAttributionResult }) {
  const isUnknown =
    attribution.label === 'unknown' || attribution.confidence === 'needs_more_evidence';

  return (
    <PanelCard as="section" variant="app" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Loss attribution (advisory)
        </p>
        <StatusBadge family="confidence" value={attribution.confidence} />
      </div>

      <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>
        {LOSS_ATTRIBUTION_DISPLAY[attribution.label]}
      </p>

      {isUnknown && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          The loss point can&apos;t be pinpointed from the available evidence.
        </p>
      )}

      {attribution.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attribution.reasons.map((r) => (
            <li key={r.code} className="text-xs flex gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span aria-hidden>·</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
