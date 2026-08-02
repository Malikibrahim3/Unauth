'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type BillingBannerState = {
  status: string;
  gracePeriodDaysRemaining: number | null;
};

export default function BillingStatusBanner() {
  const [state, setState] = useState<BillingBannerState | null>(null);

  useEffect(() => {
    void fetch('/api/billing')
      .then((r) => {
        // An optional resource still reports its own failure rather than
        // vanishing into an empty banner (RUN-14).
        if (!r.ok) throw new Error(`Billing status unavailable (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.status === 'grace_period' || data.status === 'past_due') {
          setState({
            status: data.status,
            gracePeriodDaysRemaining: data.gracePeriodDaysRemaining,
          });
        }
      })
      .catch((reason) => {
        console.warn('[billing.banner] status unavailable', reason);
      });
  }, []);

  if (!state) return null;

  if (state.status === 'grace_period') {
    return (
      <div
        className="ua-text-body flex-shrink-0 border-b px-4 py-2"
        style={{ borderColor: 'var(--ua-risk-high)', background: 'color-mix(in srgb, var(--ua-risk-high) 8%, var(--ua-canvas))' }}
        role="alert"
      >
        Your payment failed. Update billing to restore full access. Store Checks are still available.{' '}
        {state.gracePeriodDaysRemaining != null && (
          <span>Access downgrades in {state.gracePeriodDaysRemaining} days. </span>
        )}
        <Link href="/settings/billing" className="underline font-medium">
          Update billing
        </Link>
      </div>
    );
  }

  return (
    <div
      className="ua-text-body flex-shrink-0 border-b px-4 py-2"
      style={{ borderColor: 'var(--ua-risk-high)', background: 'color-mix(in srgb, var(--ua-risk-high) 8%, var(--ua-canvas))' }}
      role="alert"
    >
      Your subscription lapsed. You&apos;re now on Free.{' '}
      <Link href="/settings/billing" className="underline font-medium">
        Resubscribe
      </Link>{' '}
      to restore Pro/Growth features.
    </div>
  );
}
