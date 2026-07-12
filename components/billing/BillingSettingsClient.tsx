'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PanelCard } from '@/components/ui';
import { PLANS, TOP_UP_CREDITS, TOP_UP_PRICE_GBP, type PlanId } from '@/lib/billing/plans';

type BillingState = {
  planId: PlanId;
  planName: string;
  priceGbp: number | 'custom';
  status: string;
  monthlyCreditsRemaining: number;
  topupCreditsRemaining: number;
  monthlyAllowance: number | null;
  totalRemaining: number;
  usedThisCycle: number;
  cycleResetAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  downgradeToPlanId: PlanId | null;
  downgradeToPlanName: string | null;
  gracePeriodDaysRemaining: number | null;
  canTopUp: boolean;
};

type Toast = { message: string; type: 'success' | 'error' };

export default function BillingSettingsClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing');
      if (!res.ok) throw new Error('Failed to load billing');
      setState(await res.json());
    } catch {
      showToast('Could not load billing details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const topup = searchParams.get('topup');
    const action = searchParams.get('action');
    if (checkout === 'success') showToast('Subscription updated successfully.');
    if (topup === 'success') showToast(`${TOP_UP_CREDITS} network credits added. Full access restored.`);
    if (action === 'topup') void runAction('topup');
  }, [searchParams, showToast]);

  async function runAction(
    action: string,
    planId?: PlanId,
  ): Promise<void> {
    setActionLoading(action);
    try {
      const res = await fetch('/api/billing/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(typeof data.error === 'string' ? data.error : 'Action failed.', 'error');
        return;
      }
      if (typeof data.url === 'string') {
        window.location.href = data.url;
        return;
      }
      if (typeof data.message === 'string') showToast(data.message);
      await loadBilling();
    } finally {
      setActionLoading(null);
      setShowCancelConfirm(false);
    }
  }

  if (loading) {
    return <BillingSettingsSkeleton />;
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        <section>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Billing</h1>
        </section>
        <div
          className="rounded-md border p-5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <p className="font-medium text-[var(--text-primary)] mb-1">Billing unavailable</p>
          <p>Billing details could not be loaded. Refresh to try again or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  const priceLabel =
    state.priceGbp === 'custom'
      ? 'Custom'
      : state.priceGbp === 0
        ? 'Free'
        : `$${state.priceGbp}/mo`;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {toast && (
        <PanelCard
          variant="app"
          className="px-4 py-3 text-sm"
          style={{
            borderColor: toast.type === 'error' ? 'var(--risk-high)' : 'var(--accent)',
            background: 'var(--surface)',
          }}
          role="status"
        >
          {toast.message}
        </PanelCard>
      )}

      {state.status === 'grace_period' && (
        <PanelCard
          variant="app"
          className="px-4 py-3 text-sm"
          style={{ borderColor: 'var(--risk-high)', background: 'var(--surface)' }}
          role="alert"
        >
          Your payment failed. Update billing to restore full access. Basic claim context remains available.{' '}
          {state.gracePeriodDaysRemaining != null && (
            <span>Access restores in {state.gracePeriodDaysRemaining} days if unpaid.</span>
          )}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void runAction('portal')}
            disabled={actionLoading === 'portal'}
          >
            Update billing
          </button>
        </PanelCard>
      )}

      {state.status === 'past_due' && (
        <PanelCard
          variant="app"
          className="px-4 py-3 text-sm"
          style={{ borderColor: 'var(--risk-high)', background: 'var(--surface)' }}
          role="alert"
        >
          Your subscription lapsed. You&apos;re now on Free.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void runAction('checkout', 'pro')}
          >
            Resubscribe
          </button>{' '}
          to restore Pro/Growth features.
        </PanelCard>
      )}

      <section>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Billing</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage your plan, credits, and payment method.
        </p>
      </section>

      <PanelCard as="section" variant="app" className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Current plan</h2>
        <p className="mt-2 text-2xl font-semibold">{state.planName}</p>
        <p className="text-sm text-[var(--text-secondary)]">{priceLabel}</p>
        {state.currentPeriodEnd && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Next billing date: {formatDate(state.currentPeriodEnd)}
          </p>
        )}
        {state.downgradeToPlanId && (
          <p className="mt-2 text-sm" style={{ color: 'var(--accent)' }}>
            Your plan will change to {state.downgradeToPlanName} on{' '}
            {formatDate(state.currentPeriodEnd)}. You keep your current credits and features until then.
          </p>
        )}
        {state.cancelAtPeriodEnd && !state.downgradeToPlanId && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Cancels on {formatDate(state.currentPeriodEnd)} — you&apos;ll move to Free after that.
          </p>
        )}
      </PanelCard>

      <PanelCard as="section" variant="app" className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Network credits this cycle</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-tertiary)]">Monthly remaining</p>
            <p className="text-xl font-semibold">{state.monthlyCreditsRemaining}</p>
          </div>
          <div>
            <p className="text-[var(--text-tertiary)]">Top-up balance</p>
            <p className="text-xl font-semibold">{state.topupCreditsRemaining}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {state.totalRemaining} total remaining
          {state.monthlyAllowance != null && ` · ${state.usedThisCycle} used of ${state.monthlyAllowance} monthly`}
        </p>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Cycle resets: {formatDate(state.cycleResetAt)}
        </p>
        {state.canTopUp && (
          <button
            type="button"
            className="mt-4 rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--surface-base)' }}
            disabled={actionLoading === 'topup'}
            onClick={() => void runAction('topup')}
          >
            Top up — ${TOP_UP_PRICE_GBP} for {TOP_UP_CREDITS} credits
          </button>
        )}
      </PanelCard>

      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Change plan</h2>
        {state.planId === 'free' && (
          <PlanButton
            label={`Upgrade to Pro — $${PLANS.pro.priceGbp}/mo`}
            loading={actionLoading === 'checkout-pro'}
            onClick={() => void runAction('checkout', 'pro')}
          />
        )}
        {state.planId === 'pro' && (
          <>
            <PlanButton
              label={`Upgrade to Growth — $${PLANS.growth.priceGbp}/mo`}
              loading={actionLoading === 'upgrade-growth'}
              onClick={() => void runAction('upgrade', 'growth')}
            />
            <PlanButton
              label="Schedule downgrade to Free"
              variant="secondary"
              loading={actionLoading === 'downgrade-free'}
              onClick={() => void runAction('downgrade', 'free')}
            />
          </>
        )}
        {state.planId === 'growth' && (
          <>
            <PlanButton
              label="Schedule downgrade to Pro"
              variant="secondary"
              loading={actionLoading === 'downgrade-pro'}
              onClick={() => void runAction('downgrade', 'pro')}
            />
            <PlanButton
              label="Schedule downgrade to Free"
              variant="secondary"
              loading={actionLoading === 'downgrade-free'}
              onClick={() => void runAction('downgrade', 'free')}
            />
          </>
        )}
        {state.planId === 'scale' && (
          <p className="text-sm text-[var(--text-secondary)]">
            Scale is managed by your account team. Contact hello@unauth.co for changes.
          </p>
        )}
        {state.planId !== 'free' && state.planId !== 'scale' && (
          <PlanButton
            label="Contact us about Scale"
            variant="secondary"
            loading={actionLoading === 'contact_scale'}
            onClick={() => void runAction('contact_scale')}
          />
        )}
      </PanelCard>

      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Payment method</h2>
        <button
          type="button"
          className="text-sm underline text-[var(--accent)]"
          disabled={actionLoading === 'portal'}
          onClick={() => void runAction('portal')}
        >
          Manage payment method in Stripe
        </button>
        {state.planId !== 'free' && !state.cancelAtPeriodEnd && (
          <>
            {!showCancelConfirm ? (
              <button
                type="button"
                className="block text-sm text-[var(--text-tertiary)] underline"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel plan
              </button>
            ) : (
              <PanelCard variant="appInset" className="p-3 text-sm">
                <p>
                  You&apos;ll keep access until {formatDate(state.currentPeriodEnd)}, then move to Free.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded px-3 py-1 text-sm"
                    style={{ background: 'var(--risk-high)', color: 'white' }}
                    disabled={actionLoading === 'cancel'}
                    onClick={() => void runAction('cancel')}
                  >
                    Confirm cancellation
                  </button>
                  <button type="button" className="text-sm underline" onClick={() => setShowCancelConfirm(false)}>
                    Keep plan
                  </button>
                </div>
              </PanelCard>
            )}
          </>
        )}
        {state.cancelAtPeriodEnd && (
          <button
            type="button"
            className="text-sm underline"
            disabled={actionLoading === 'resume'}
            onClick={() => void runAction('resume')}
          >
            Resume subscription
          </button>
        )}
      </PanelCard>
    </div>
  );
}

function PlanButton({
  label,
  onClick,
  loading,
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      className="block w-full rounded-md px-4 py-2 text-left text-sm font-medium"
      style={{
        background: variant === 'primary' ? 'var(--accent)' : 'var(--surface)',
        color: variant === 'primary' ? 'var(--surface-base)' : 'var(--text-primary)',
        border: variant === 'secondary' ? '1px solid var(--border)' : undefined,
      }}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? 'Working…' : label}
    </button>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ''}`}
      style={{ background: 'var(--border)', ...style }}
      aria-hidden="true"
    />
  );
}

function BillingSettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6" aria-busy="true" aria-label="Loading billing">
      <section className="space-y-1">
        <SkeletonBlock className="h-6 w-24" />
        <SkeletonBlock className="h-4 w-64" />
      </section>

      {/* Current plan */}
      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-3 w-48" />
      </PanelCard>

      {/* Credits */}
      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-7 w-16" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-16" />
          </div>
        </div>
        <SkeletonBlock className="h-3 w-56" />
      </PanelCard>

      {/* Change plan */}
      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-9 w-full" />
      </PanelCard>

      {/* Payment */}
      <PanelCard as="section" variant="app" className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-4 w-48" />
      </PanelCard>
    </div>
  );
}
