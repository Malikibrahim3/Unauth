'use client';

import Link from 'next/link';
import {
  EVIDENCE_STRENGTH_LABELS,
  type EvidenceChecklistResult,
} from '@/lib/payouts/types';
import { TONE_STYLE, strengthTone } from '@/components/claims/payout/payoutCopy';
import { useConnectionState } from '@/components/connections/ConnectionStateContext';

// Claim types for which delivery / tracking evidence is a meaningful gap.
const TRACKING_RELEVANT_CLAIM_TYPES = new Set([
  'item_not_received',
  'missing_item',
  'delivery_issue',
]);

export function EvidenceChecklistCard({ evidence }: { evidence: EvidenceChecklistResult }) {
  const { trackingConnected } = useConnectionState();
  const tone = TONE_STYLE[strengthTone(evidence.strength)];
  const hasMissing = evidence.items.some((i) => i.state === 'missing');

  // Show a named delivery-evidence gap when claim type is INR-relevant and no
  // tracking source is connected. This is distinct from a missing checklist item —
  // it tells the agent WHY the gap exists and what to do about it.
  const showDeliveryGap =
    !trackingConnected &&
    evidence.claimType != null &&
    TRACKING_RELEVANT_CLAIM_TYPES.has(evidence.claimType);

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Evidence on file
        </p>
        <span
          className="inline-block text-xs font-semibold rounded-full px-2.5 py-1"
          style={{ background: tone.bg, color: tone.color }}
        >
          {EVIDENCE_STRENGTH_LABELS[evidence.strength]}
        </span>
      </div>

      {evidence.items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No supporting evidence on file yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.items.map((item) => {
            const isPresent = item.state === 'present';
            const isMissing = item.state === 'missing';
            const mark = isPresent ? '✓' : isMissing ? '○' : '–';
            const markColor = isPresent ? 'var(--success)' : 'var(--text-tertiary)';
            return (
              <li key={item.key} className="flex items-start gap-2 text-sm">
                <span aria-hidden style={{ color: markColor, lineHeight: '1.4' }}>
                  {mark}
                </span>
                <span style={{ color: isPresent ? 'var(--text)' : 'var(--text-secondary)' }}>
                  {item.label}
                  {item.state === 'not_tracked' && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {' '}
                      · not tracked
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delivery evidence gap — shown when tracking is not connected on INR-type cases */}
      {showDeliveryGap ? (
        <div
          className="mt-3 flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 25%, var(--border))',
            background: 'color-mix(in srgb, var(--warning) 6%, var(--surface))',
          }}
        >
          <span aria-hidden style={{ color: 'var(--warning)', lineHeight: '1.5' }}>!</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Delivery evidence: not connected.</span>{' '}
            Tracking data is unavailable for this case.{' '}
            <Link
              href="/settings/integrations"
              className="font-medium underline underline-offset-2"
              style={{ color: 'var(--warning)' }}
            >
              Connect a tracking source →
            </Link>
          </span>
        </div>
      ) : null}

      {hasMissing && !showDeliveryGap && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Missing items weaken the case — request evidence from the customer or carrier before paying out.
        </p>
      )}
    </section>
  );
}
