'use client';

import Link from 'next/link';
import {
  EVIDENCE_STRENGTH_LABELS,
  type EvidenceChecklistResult,
} from '@/lib/payouts/types';
import { PanelCard, StatusBadge } from '@/components/ui';
import { strengthTone } from '@/components/claims/payout/payoutCopy';
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
    ? 'No tracking number on Shopify order.'
    : delivery?.trackingGap === 'tracking_not_found'
      ? 'Tracking not found in AfterShip.'
      : 'Tracking data is unavailable for this case.';

  return (
    <PanelCard as="section" variant="app" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Evidence on file
        </p>
        <StatusBadge variant={strengthVariant(strengthTone(evidence.strength))}>
          {EVIDENCE_STRENGTH_LABELS[evidence.strength]}
        </StatusBadge>
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
            const isUnavailable = item.state === 'unavailable';
            const mark = isPresent ? '✓' : isMissing ? '○' : isUnavailable ? '–' : '–';
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
                  {item.state === 'unavailable' && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {' '}
                      · unavailable from provider
                    </span>
                  )}
                  {item.state === 'missing' && item.reason !== 'Not on file' && (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
        <PanelCard
          variant="appInset"
          className="mt-3 flex items-start gap-2 px-3 py-2.5 text-xs"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 25%, var(--border))',
            background: 'color-mix(in srgb, var(--warning) 6%, var(--surface))',
          }}
        >
          <span aria-hidden style={{ color: 'var(--warning)', lineHeight: '1.5' }}>!</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>
              {delivery?.trackingGap === 'no_tracking_number'
                ? 'Delivery evidence: no tracking number on Shopify order.'
                : 'Delivery evidence: not connected.'}
            </span>{' '}
            {gapMessage}{' '}
            <Link
              href="/settings/integrations"
              className="font-medium underline underline-offset-2"
              style={{ color: 'var(--warning)' }}
            >
              Connect a tracking source →
            </Link>
          </span>
        </PanelCard>
      ) : null}

      {hasMissing && !showDeliveryGap && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Missing items weaken the case — request evidence from the customer or carrier before paying out.
        </p>
      )}
    </PanelCard>
  );
}

function strengthVariant(tone: ReturnType<typeof strengthTone>) {
  if (tone === 'success') return 'cleared';
  if (tone === 'warning') return 'flagged';
  return 'held';
}
