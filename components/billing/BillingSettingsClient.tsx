"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/components/ui";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import {
  PLANS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
  type PlanId,
} from "@/lib/billing/plans";

type BillingState = {
  planId: PlanId;
  planName: string;
  priceGbp: number | "custom";
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

type Toast = { message: string; type: "success" | "error" };

export default function BillingSettingsClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 5000);
    },
    [],
  );

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error("Failed to load billing");
      setState(await res.json());
    } catch {
      showToast("Could not load billing details.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const runAction = useCallback(
    async (action: string, planId?: PlanId): Promise<void> => {
      setActionLoading(action);
      try {
        const res = await fetch("/api/billing/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(
            typeof data.error === "string" ? data.error : "Action failed.",
            "error",
          );
          return;
        }
        if (typeof data.url === "string") {
          window.location.href = data.url;
          return;
        }
        if (typeof data.message === "string") showToast(data.message);
        await loadBilling();
      } finally {
        setActionLoading(null);
        setShowCancelConfirm(false);
      }
    },
    [loadBilling, showToast],
  );

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const topup = searchParams.get("topup");
    const action = searchParams.get("action");
    if (checkout === "success") showToast("Subscription updated successfully.");
    if (topup === "success")
      showToast(
        `${TOP_UP_CREDITS} network credits added. Full access restored.`,
      );
    if (action === "topup") void runAction("topup");
  }, [runAction, searchParams, showToast]);

  if (loading) {
    return <BillingSettingsSkeleton />;
  }

  if (!state) {
    return (
      <SettingsPageShell
        title="Billing"
        subtitle="Manage your plan, network credits, and payment method."
      >
        <div
          className="rounded-[var(--ua-radius-control)] border p-4 text-[length:var(--ua-text-caption-size)]"
          style={{
            borderColor: "var(--ua-border-default)",
            color: "var(--ua-text-secondary)",
          }}
        >
          <p className="font-medium text-[var(--ua-text-primary)] mb-1">
            Billing unavailable
          </p>
          <p>
            Billing details could not be loaded. Refresh to try again or contact
            support if the issue persists.
          </p>
        </div>
      </SettingsPageShell>
    );
  }

  const priceLabel =
    state.priceGbp === "custom"
      ? "Custom"
      : state.priceGbp === 0
        ? "Free"
        : `$${state.priceGbp}/mo`;

  return (
    <SettingsPageShell
      title="Billing"
      subtitle="Manage your plan, network credits, and payment method."
    >
    <div className="space-y-3">
      {toast && (
        <Panel
          variant="panel"
          className="px-4 py-3 text-[length:var(--ua-text-caption-size)]"
          style={{
            borderColor:
              toast.type === "error" ? "var(--ua-risk-high)" : "var(--ua-action-primary)",
            background: "var(--ua-surface-primary)",
          }}
          role="status"
        >
          {toast.message}
        </Panel>
      )}

      {state.status === "grace_period" && (
        <Panel
          variant="panel"
          className="px-4 py-3 text-[length:var(--ua-text-caption-size)]"
          style={{
            borderColor: "var(--ua-risk-high)",
            background: "var(--ua-surface-primary)",
          }}
          role="alert"
        >
          Your payment failed. Update billing to restore full access. Basic
          claim context remains available.{" "}
          {state.gracePeriodDaysRemaining != null && (
            <span>
              Access restores in {state.gracePeriodDaysRemaining} days if
              unpaid.
            </span>
          )}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void runAction("portal")}
            disabled={actionLoading === "portal"}
          >
            Update billing
          </button>
        </Panel>
      )}

      {state.status === "past_due" && (
        <Panel
          variant="panel"
          className="px-4 py-3 text-[length:var(--ua-text-caption-size)]"
          style={{
            borderColor: "var(--ua-risk-high)",
            background: "var(--ua-surface-primary)",
          }}
          role="alert"
        >
          Your subscription lapsed. You&apos;re now on Free.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void runAction("checkout", "pro")}
          >
            Resubscribe
          </button>{" "}
          to restore Pro/Growth features.
        </Panel>
      )}

      <Panel as="section" variant="panel" className="p-4">
        <h2 className="text-sm font-semibold text-[var(--ua-text-primary)]">
          Current plan
        </h2>
        <p className="mt-2 text-xl font-semibold">{state.planName}</p>
        <p className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">{priceLabel}</p>
        {state.currentPeriodEnd && (
          <p className="mt-2 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">
            Next billing date: {formatDateTime(state.currentPeriodEnd)}
          </p>
        )}
        {state.downgradeToPlanId && (
          <p className="mt-2 text-[length:var(--ua-text-caption-size)]" style={{ color: "var(--ua-action-primary)" }}>
            Your plan will change to {state.downgradeToPlanName} on{" "}
            {formatDateTime(state.currentPeriodEnd)}. You keep your current credits
            and features until then.
          </p>
        )}
        {state.cancelAtPeriodEnd && !state.downgradeToPlanId && (
          <p className="mt-2 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">
            Cancels on {formatDateTime(state.currentPeriodEnd)} — you&apos;ll move
            to Free after that.
          </p>
        )}
      </Panel>

      <Panel as="section" variant="panel" className="p-4">
        <h2 className="text-sm font-semibold text-[var(--ua-text-primary)]">
          Network credits this cycle
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[length:var(--ua-text-caption-size)]">
          <div>
            <p className="text-[var(--ua-text-tertiary)]">Monthly remaining</p>
            <p className="text-lg font-semibold">
              {state.monthlyCreditsRemaining}
            </p>
          </div>
          <div>
            <p className="text-[var(--ua-text-tertiary)]">Top-up balance</p>
            <p className="text-lg font-semibold">
              {state.topupCreditsRemaining}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">
          {state.totalRemaining} total remaining
          {state.monthlyAllowance != null &&
            ` · ${state.usedThisCycle} used of ${state.monthlyAllowance} monthly`}
        </p>
        <p className="mt-1 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">
          Cycle resets: {formatDateTime(state.cycleResetAt)}
        </p>
        {state.canTopUp && (
          <button
            type="button"
            className="mt-3 h-8 rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-metadata-size)] font-semibold"
            style={{
              background: "var(--ua-action-primary)",
              color: "var(--ua-canvas)",
            }}
            disabled={actionLoading === "topup"}
            onClick={() => void runAction("topup")}
          >
            Top up — ${TOP_UP_PRICE_GBP} for {TOP_UP_CREDITS} credits
          </button>
        )}
      </Panel>

      <Panel as="section" variant="panel" className="space-y-2.5 p-4">
        <h2 className="text-sm font-semibold text-[var(--ua-text-primary)]">
          Change plan
        </h2>
        {state.planId === "free" && (
          <PlanButton
            label={`Upgrade to Pro — $${PLANS.pro.priceGbp}/mo`}
            loading={actionLoading === "checkout-pro"}
            onClick={() => void runAction("checkout", "pro")}
          />
        )}
        {state.planId === "pro" && (
          <>
            <PlanButton
              label={`Upgrade to Growth — $${PLANS.growth.priceGbp}/mo`}
              loading={actionLoading === "upgrade-growth"}
              onClick={() => void runAction("upgrade", "growth")}
            />
            <PlanButton
              label="Schedule downgrade to Free"
              variant="secondary"
              loading={actionLoading === "downgrade-free"}
              onClick={() => void runAction("downgrade", "free")}
            />
          </>
        )}
        {state.planId === "growth" && (
          <>
            <PlanButton
              label="Schedule downgrade to Pro"
              variant="secondary"
              loading={actionLoading === "downgrade-pro"}
              onClick={() => void runAction("downgrade", "pro")}
            />
            <PlanButton
              label="Schedule downgrade to Free"
              variant="secondary"
              loading={actionLoading === "downgrade-free"}
              onClick={() => void runAction("downgrade", "free")}
            />
          </>
        )}
        {state.planId === "scale" && (
          <p className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]">
            Scale is managed by your account team. Contact hello@unauth.co for
            changes.
          </p>
        )}
        {state.planId !== "free" && state.planId !== "scale" && (
          <PlanButton
            label="Contact us about Scale"
            variant="secondary"
            loading={actionLoading === "contact_scale"}
            onClick={() => void runAction("contact_scale")}
          />
        )}
      </Panel>

      <Panel as="section" variant="panel" className="space-y-2.5 p-4">
        <h2 className="text-sm font-semibold text-[var(--ua-text-primary)]">
          Payment method
        </h2>
        <button
          type="button"
          className="text-[length:var(--ua-text-caption-size)] underline text-[var(--ua-action-primary)]"
          disabled={actionLoading === "portal"}
          onClick={() => void runAction("portal")}
        >
          Manage payment method in Stripe
        </button>
        {state.planId !== "free" && !state.cancelAtPeriodEnd && (
          <>
            {!showCancelConfirm ? (
              <button
                type="button"
                className="block text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)] underline"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel plan
              </button>
            ) : (
              <Panel variant="inset" className="p-3 text-[length:var(--ua-text-caption-size)]">
                <p>
                  You&apos;ll keep access until{" "}
                  {formatDateTime(state.currentPeriodEnd)}, then move to Free.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="h-7 rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-metadata-size)]"
                    style={{ background: "var(--ua-risk-high)", color: "var(--ua-text-inverse)" }}
                    disabled={actionLoading === "cancel"}
                    onClick={() => void runAction("cancel")}
                  >
                    Confirm cancellation
                  </button>
                  <button
                    type="button"
                    className="text-[length:var(--ua-text-metadata-size)] underline"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep plan
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
        {state.cancelAtPeriodEnd && (
          <button
            type="button"
            className="text-[length:var(--ua-text-caption-size)] underline"
            disabled={actionLoading === "resume"}
            onClick={() => void runAction("resume")}
          >
            Resume subscription
          </button>
        )}
      </Panel>
    </div>
    </SettingsPageShell>
  );
}

function PlanButton({
  label,
  onClick,
  loading,
  variant = "primary",
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className="block min-h-8 w-full rounded-[var(--ua-radius-control)] px-3 py-1.5 text-left text-[length:var(--ua-text-metadata-size)] font-semibold"
      style={{
        background: variant === "primary" ? "var(--ua-action-primary)" : "var(--ua-surface-primary)",
        color:
          variant === "primary" ? "var(--ua-canvas)" : "var(--ua-text-primary)",
        border: variant === "secondary" ? "1px solid var(--ua-border-default)" : undefined,
      }}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? "Working…" : label}
    </button>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ""}`}
      style={{ background: "var(--ua-border-default)", ...style }}
      aria-hidden="true"
    />
  );
}

function BillingSettingsSkeleton() {
  return (
    <SettingsPageShell
      title="Billing"
      subtitle="Manage your plan, network credits, and payment method."
    >
    <div role="status" className="space-y-3" aria-busy="true" aria-label="Loading billing">

      {/* Current plan */}
      <Panel as="section" variant="panel" className="space-y-3 p-4">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-3 w-48" />
      </Panel>

      {/* Credits */}
      <Panel as="section" variant="panel" className="space-y-3 p-4">
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
      </Panel>

      {/* Change plan */}
      <Panel as="section" variant="panel" className="space-y-3 p-4">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-9 w-full" />
      </Panel>

      {/* Payment */}
      <Panel as="section" variant="panel" className="space-y-3 p-4">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-4 w-48" />
      </Panel>
    </div>
    </SettingsPageShell>
  );
}
