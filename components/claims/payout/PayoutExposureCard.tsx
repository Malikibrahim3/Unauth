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
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <p className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        Payout exposure
      </p>

      {hasAmount ? (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                Estimated total loss
              </p>
              <p className="font-mono tabular-nums font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {formatPayoutMoney(exposure.total)}
              </p>
            </div>
            {exposure.reviewThreshold != null && (
              <span
                className="inline-block text-xs font-semibold rounded-full px-2.5 py-1"
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
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
                >
                  <span style={{ color: 'var(--text)' }}>{COMPONENT_LABELS[c.kind] ?? c.kind}</span>
                  <span className="font-mono tabular-nums">
                    {formatPayoutMoney({ amount: c.amount, currency: exposure.total.currency })}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Amount not available yet — add the refund or replacement value to estimate exposure.
        </p>
      )}

      <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Customer requested: <span style={{ color: 'var(--text)' }}>{requestedActionLabel}</span>
      </p>
    </section>
  );
}
