'use client';

import type { PayoutExposure } from '@/lib/payouts/types';
import { TONE_STYLE, formatPayoutMoney } from '@/components/claims/payout/payoutCopy';

const COMPONENT_LABELS: Record<string, string> = {
  refund: 'Refund',
  reship_replacement: 'Reship / replacement',
  discount: 'Discount',
  store_credit: 'Store credit',
  support_cost: 'Support cost',
};

export function PayoutExposureCard({
  exposure,
  requestedActionLabel,
}: {
  exposure: PayoutExposure;
  requestedActionLabel: string;
}) {
  const hasAmount = exposure.total.amount > 0 && exposure.components.length > 0;
  const thresholdTone = exposure.aboveReviewThreshold ? TONE_STYLE.warning : TONE_STYLE.neutral;

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--ua-border-subtle)', background: 'var(--ua-surface-primary)' }}
    >
      <p className="ua-text-label mb-3" style={{ color: 'var(--ua-text-secondary)' }}>
        Customer concession context
      </p>

      {hasAmount ? (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="ua-text-label mb-0.5" style={{ color: 'var(--ua-text-secondary)' }}>
                Estimated value at issue
              </p>
              <p className="font-sans tabular-nums font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em', color: 'var(--ua-text-primary)' }}>
                {formatPayoutMoney(exposure.total)}
              </p>
            </div>
            {exposure.reviewThreshold != null && (
              <span
                className="ua-text-label inline-block rounded-full px-2.5 py-1"
                style={{ background: thresholdTone.bg, color: thresholdTone.color }}
              >
                {exposure.aboveReviewThreshold ? 'Requires review' : 'Within standard handling'}
              </span>
            )}
          </div>

          {exposure.components.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exposure.components.map((c) => (
                <span
                  key={c.kind}
                  className="ua-text-metadata inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' }}
                >
                  <span style={{ color: 'var(--ua-text-primary)' }}>{COMPONENT_LABELS[c.kind] ?? c.kind}</span>
                  <span className="font-sans tabular-nums">
                    {formatPayoutMoney({ amount: c.amount, currency: exposure.total.currency })}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="ua-text-body" style={{ color: 'var(--ua-text-secondary)' }}>
          Amount unavailable — add the refund or replacement value to estimate the customer concession.
        </p>
      )}

      <p className="ua-text-caption-role mt-3">
        Customer requested: <span style={{ color: 'var(--ua-text-primary)' }}>{requestedActionLabel}</span>
      </p>
    </section>
  );
}
