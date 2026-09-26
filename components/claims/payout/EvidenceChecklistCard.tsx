'use client';

import Link from 'next/link';
import type { EvidenceChecklistResult } from '@/lib/payouts/types';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useConnectionState } from '@/components/connections/ConnectionStateContext';

// Claim types for which delivery / tracking evidence is a meaningful gap.
const TRACKING_RELEVANT_CLAIM_TYPES = new Set([
  'item_not_received',
  'missing_item',
  'delivery_issue',
]);

export function EvidenceChecklistCard({
  evidence,
  delivery,
}: {
  evidence: EvidenceChecklistResult;
  delivery?: import('@/lib/claims/decision/types').ClaimDecisionContext['delivery'];
}) {
  const { trackingConnected } = useConnectionState();
  const hasMissing = evidence.items.some((i) => i.state === 'missing');

  // Show a named delivery-evidence gap when claim type is INR-relevant and no
  // tracking source is connected. This is distinct from a missing checklist item —
  // it tells the agent WHY the gap exists and what to do about it.
  const showDeliveryGap =
    !trackingConnected &&
    evidence.claimType != null &&
    TRACKING_RELEVANT_CLAIM_TYPES.has(evidence.claimType);

  const gapMessage = delivery?.trackingGap === 'no_tracking_number'
    ? 'No tracking number on the source order.'
    : delivery?.trackingGap === 'tracking_not_found'
      ? 'Tracking not found by the connected carrier.'
      : 'Tracking data is unavailable for this case.';

  return (
    <Card unstyled as="section" variant="panel" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
          Evidence on file
        </p>
        <StatusBadge family="evidenceStrength" value={evidence.strength} />
      </div>

      {evidence.items.length === 0 ? (
        <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: '#64686d' }}>
          No supporting evidence on file yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.items.map((item) => {
            const isPresent = item.state === 'present';
            const isMissing = item.state === 'missing';
            const isUnavailable = item.state === 'unavailable';
            const mark = isPresent ? '✓' : isMissing ? '○' : isUnavailable ? '–' : '–';
            const markColor = isPresent ? '#1a6b43' : '#6f6a63';
            return (
              <li key={item.key} className="text-[12px] leading-[1.45] text-[#40454a] flex items-start gap-2">
                <span aria-hidden style={{ color: markColor, lineHeight: '1.4' }}>
                  {mark}
                </span>
                <span style={{ color: isPresent ? '#1c1f23' : '#64686d' }}>
                  {item.label}
                  {item.state === 'not_tracked' && (
                    <span className="text-[10.5px] leading-4 text-[#6f6a63]" style={{ color: '#6f6a63' }}>
                      {' '}
                      · not tracked
                    </span>
                  )}
                  {item.state === 'unavailable' && (
                    <span className="text-[10.5px] leading-4 text-[#6f6a63]" style={{ color: '#6f6a63' }}>
                      {' '}
                      · unavailable from provider
                    </span>
                  )}
                  {item.state === 'missing' && item.reason !== 'Not on file' && (
                    <span className="text-[10.5px] leading-4 text-[#6f6a63]" style={{ color: '#6f6a63' }}>
                      {' '}
                      · {item.reason}
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
        <Card unstyled
          variant="muted"
          className="text-[11.5px] leading-[1.45] text-[#64686d] mt-3 flex items-start gap-2 px-3 py-2.5"
          style={{
            borderColor: 'color-mix(in srgb, #7a5310 25%, #e4e3e0)',
            background: 'color-mix(in srgb, #7a5310 6%, #fff)',
          }}
        >
          <span aria-hidden style={{ color: '#7a5310', lineHeight: '1.5' }}>!</span>
          <span style={{ color: '#64686d' }}>
            <span className="font-semibold" style={{ color: '#1c1f23' }}>
              {delivery?.trackingGap === 'no_tracking_number'
                ? 'Delivery evidence: no tracking number on the source order.'
                : 'Delivery evidence: not connected.'}
            </span>{' '}
            {gapMessage}{' '}
            <Link
              href="/sources/connected"
              className="font-medium underline underline-offset-2"
              style={{ color: '#7a5310' }}
            >
              Connect a tracking source
            </Link>
          </span>
        </Card>
      ) : null}

      {hasMissing && !showDeliveryGap && (
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-3">
          Missing items weaken the case — request evidence from the customer or carrier before paying out.
        </p>
      )}
    </Card>
  );
}
