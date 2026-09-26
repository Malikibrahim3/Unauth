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
        <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
          Loss attribution (advisory)
        </p>
        <StatusBadge family="confidence" value={attribution.confidence} />
      </div>

      <p className="font-semibold text-[14px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
        {LOSS_ATTRIBUTION_DISPLAY[attribution.label]}
      </p>

      {isUnknown && (
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1">
          The loss point can&apos;t be pinpointed from the available evidence.
        </p>
      )}

      {attribution.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attribution.reasons.map((r) => (
            <li key={r.code} className="text-[11.5px] leading-[1.45] text-[#64686d] flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
