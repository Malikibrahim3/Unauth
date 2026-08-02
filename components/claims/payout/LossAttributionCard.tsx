'use client';

import {
  LOSS_ATTRIBUTION_DISPLAY,
  type LossAttributionResult,
} from '@/lib/payouts/types';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function LossAttributionCard({ attribution }: { attribution: LossAttributionResult }) {
  const isUnknown =
    attribution.label === 'unknown' || attribution.confidence === 'needs_more_evidence';

  return (
    <Card unstyled as="section" variant="panel" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>
          Loss attribution (advisory)
        </p>
        <StatusBadge family="confidence" value={attribution.confidence} />
      </div>

      <p className="ua-text-section-title" style={{ color: 'var(--ua-text-primary)' }}>
        {LOSS_ATTRIBUTION_DISPLAY[attribution.label]}
      </p>

      {isUnknown && (
        <p className="ua-text-caption-role mt-1">
          The loss point can&apos;t be pinpointed from the available evidence.
        </p>
      )}

      {attribution.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attribution.reasons.map((r) => (
            <li key={r.code} className="ua-text-caption-role flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
