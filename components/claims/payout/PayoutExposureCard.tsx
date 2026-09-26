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
      style={{ borderColor: '#eae8e5', background: '#fff' }}
    >
      <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-3" style={{ color: '#64686d' }}>
        Customer concession context
      </p>

      {hasAmount ? (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-0.5" style={{ color: '#64686d' }}>
                Estimated value at issue
              </p>
              <p className="font-sans tabular-nums font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em', color: '#1c1f23' }}>
                {formatPayoutMoney(exposure.total)}
              </p>
            </div>
            {exposure.reviewThreshold != null && (
              <span
                className="text-[11px] font-medium leading-4 text-[#64686d] inline-block rounded-full px-2.5 py-1"
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
                  className="text-[10.5px] leading-4 text-[#6f6a63] inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: '#f4f3f1', color: '#64686d' }}
                >
                  <span style={{ color: '#1c1f23' }}>{COMPONENT_LABELS[c.kind] ?? c.kind}</span>
                  <span className="font-sans tabular-nums">
                    {formatPayoutMoney({ amount: c.amount, currency: exposure.total.currency })}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: '#64686d' }}>
          Amount unavailable — add the refund or replacement value to estimate the customer concession.
        </p>
      )}

      <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-3">
        Customer requested: <span style={{ color: '#1c1f23' }}>{requestedActionLabel}</span>
      </p>
    </section>
  );
}
