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
        <p className="ua-text-label" style={{ color: 'var(--ua-text-secondary)' }}>
          Evidence on file
        </p>
        <StatusBadge family="evidenceStrength" value={evidence.strength} />
      </div>

      {evidence.items.length === 0 ? (
        <p className="ua-text-body" style={{ color: 'var(--ua-text-secondary)' }}>
          No supporting evidence on file yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.items.map((item) => {
            const isPresent = item.state === 'present';
            const isMissing = item.state === 'missing';
            const isUnavailable = item.state === 'unavailable';
            const mark = isPresent ? '✓' : isMissing ? '○' : isUnavailable ? '–' : '–';
            const markColor = isPresent ? 'var(--ua-success)' : 'var(--ua-text-tertiary)';
            return (
              <li key={item.key} className="ua-text-dense flex items-start gap-2">
                <span aria-hidden style={{ color: markColor, lineHeight: '1.4' }}>
                  {mark}
                </span>
                <span style={{ color: isPresent ? 'var(--ua-text-primary)' : 'var(--ua-text-secondary)' }}>
                  {item.label}
                  {item.state === 'not_tracked' && (
                    <span className="ua-text-metadata" style={{ color: 'var(--ua-text-tertiary)' }}>
                      {' '}
                      · not tracked
                    </span>
                  )}
                  {item.state === 'unavailable' && (
                    <span className="ua-text-metadata" style={{ color: 'var(--ua-text-tertiary)' }}>
                      {' '}
                      · unavailable from provider
                    </span>
                  )}
                  {item.state === 'missing' && item.reason !== 'Not on file' && (
                    <span className="ua-text-metadata" style={{ color: 'var(--ua-text-tertiary)' }}>
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
          className="ua-text-caption-role mt-3 flex items-start gap-2 px-3 py-2.5"
          style={{
            borderColor: 'color-mix(in srgb, var(--ua-warning) 25%, var(--ua-border-default))',
            background: 'color-mix(in srgb, var(--ua-warning) 6%, var(--ua-surface-primary))',
          }}
        >
          <span aria-hidden style={{ color: 'var(--ua-warning)', lineHeight: '1.5' }}>!</span>
          <span style={{ color: 'var(--ua-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
              {delivery?.trackingGap === 'no_tracking_number'
                ? 'Delivery evidence: no tracking number on the source order.'
                : 'Delivery evidence: not connected.'}
            </span>{' '}
            {gapMessage}{' '}
            <Link
              href="/integrations"
              className="font-medium underline underline-offset-2"
              style={{ color: 'var(--ua-warning)' }}
            >
              Connect a tracking source
            </Link>
          </span>
        </Card>
      ) : null}

      {hasMissing && !showDeliveryGap && (
        <p className="ua-text-caption-role mt-3">
          Missing items weaken the case — request evidence from the customer or carrier before paying out.
        </p>
      )}
    </Card>
  );
}
