"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, CreditCard, Gauge, ReceiptText } from "lucide-react";
import { Bone, Button, ButtonLink, JoinedSection, Modal, OperationalState, StatusBadge, Surface } from "@/components/ui";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { safeRedirectPath } from "@/lib/auth/safeRedirect";
import { PLANS, TOP_UP_CREDITS, TOP_UP_PRICE_GBP, type PlanId } from "@/lib/billing/plans";
import { formatDateAbsolute, formatNumber } from "@/lib/utils/format";

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
  subscriptionIntentAvailability: "available" | "schema_pending";
  subscriptionIntent: {
    planId: PlanId;
    planName: string;
    status: "pending" | "checkout_created" | "confirmed" | "cancelled" | "superseded";
    updatedAt: string;
  } | null;
};

type Notice = { message: string; type: "success" | "error" };
type PendingAction = { action: string; planId?: PlanId; title: string; description: string; confirmLabel: string; danger?: boolean };

const BILLING_TRUTH = {
  access: "Workspace members permitted to manage billing",
  currentState: "Active plan and credit balance come from the verified billing account",
  saveBehavior: "Requests remain pending until the payment provider confirms them",
  impact: "Future access, allowances, top-ups, or renewal timing; recorded product history remains available",
};

function money(value: number | "custom") {
  if (value === "custom") return "Custom agreement";
  if (value === 0) return "Free";
  return `£${formatNumber(value)}/month`;
}

function dateLabel(value: string | null) {
  if (!value) return "Unavailable";
  return formatDateAbsolute(value);
}

function isBillingState(value: unknown): value is BillingState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BillingState>;
  return typeof candidate.planId === "string"
    && typeof candidate.planName === "string"
    && typeof candidate.status === "string"
    && typeof candidate.totalRemaining === "number";
}

export default function BillingSettingsClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const requestedReturn = searchParams.get("return");
  const returnPath = useMemo(
    () => requestedReturn ? safeRedirectPath(requestedReturn) : null,
    [requestedReturn],
  );

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing");
      if (!response.ok) throw new Error("Billing details could not be loaded.");
      const body = await response.json() as unknown;
      if (!isBillingState(body)) {
        const serviceStatus = body && typeof body === "object" && "status" in body
          ? String((body as { status?: unknown }).status ?? "")
          : "";
        setState(null);
        setUnavailableReason(serviceStatus === "not_configured"
          ? "Billing is not configured for this environment, so no plan, balance, or payment state is shown."
          : "The billing service did not return a complete, verified account state.");
        return;
      }
      setUnavailableReason(null);
      setState(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Billing details could not be loaded.";
      setState(null);
      setUnavailableReason(message);
      setNotice({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const runAction = useCallback(async (action: string, planId?: PlanId) => {
    const key = planId ? `${action}-${planId}` : action;
    setActionLoading(key);
    setNotice(null);
    try {
      const response = await fetch("/api/billing/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": globalThis.crypto?.randomUUID?.() ?? `${action}-${planId ?? "none"}-${Date.now()}`,
        },
        body: JSON.stringify({ action, planId, returnTo: returnPath ?? undefined }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; message?: string; url?: string };
      if (!response.ok) throw new Error(body.error ?? "Billing action failed.");
      if (body.url) { window.location.href = body.url; return; }
      setNotice({ type: "success", message: body.message ?? "Billing settings updated." });
      await loadBilling();
      setPending(null);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Billing action failed." });
    } finally {
      setActionLoading(null);
    }
  }, [loadBilling, returnPath]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") setNotice({ type: "success", message: "Payment returned successfully. The requested plan remains pending until the provider confirmation is recorded." });
    if (searchParams.get("topup") === "success") setNotice({ type: "success", message: `${TOP_UP_CREDITS} network credits were added.` });
    if (searchParams.get("action") === "topup") {
      setPending({ action: "topup", title: "Buy network credits?", description: `Add ${TOP_UP_CREDITS} credits for £${TOP_UP_PRICE_GBP}. Stripe will confirm payment before the balance changes.`, confirmLabel: "Continue to payment" });
    }
  }, [searchParams]);

  const usagePercent = useMemo(() => {
    if (!state?.monthlyAllowance || state.monthlyAllowance <= 0) return null;
    return Math.min(100, Math.round((state.usedThisCycle / state.monthlyAllowance) * 100));
  }, [state]);

  if (loading) return <BillingSettingsSkeleton />;

  if (!state) {
    return (
      <SettingsPageShell title="Billing" subtitle="Manage plan, credit balance, and payment configuration." surfaceId="billing" layout="wide" truth={BILLING_TRUTH} secondaryActions={returnPath ? [<ButtonLink key="return" variant="secondary" href={returnPath}>Return</ButtonLink>] : undefined}>
        <OperationalState kind="unavailable" title="Billing unavailable" description={unavailableReason ?? "No plan or payment values are shown because the billing service did not return a verified account state."} action={<Button variant="secondary" onClick={() => void loadBilling()}>Try again</Button>} />
      </SettingsPageShell>
    );
  }

  const plans = (Object.values(PLANS) as typeof PLANS[PlanId][]);
  const blocked = state.status === "past_due" || state.status === "grace_period" || state.totalRemaining <= 0;
  const currentPlanId = state.planId;
  const currentPeriodEnd = state.currentPeriodEnd;

  function requestPlan(next: PlanId) {
    const nextPlan = PLANS[next];
    const upgrade = plans.findIndex((item) => item.planId === next) > plans.findIndex((item) => item.planId === currentPlanId);
    setPending({
      action: currentPlanId === "free" ? "checkout" : upgrade ? "upgrade" : "downgrade",
      planId: next,
      title: `${upgrade ? "Change" : "Schedule change"} to ${nextPlan.name}?`,
      description: upgrade
        ? `Stripe will confirm the ${money(nextPlan.priceGbp)} charge before the plan changes.`
        : `The current plan remains active until ${dateLabel(currentPeriodEnd)}. The workspace then moves to ${nextPlan.name}; historical records remain available under their existing audit and retention rules.`,
      confirmLabel: upgrade ? "Continue to billing" : "Schedule plan change",
      danger: !upgrade,
    });
  }

  return (
    <SettingsPageShell title="Billing" subtitle="Manage plan, credit balance, and payment configuration." surfaceId="billing" layout="wide" truth={BILLING_TRUTH} secondaryActions={returnPath ? [<ButtonLink key="return" variant="secondary" href={returnPath}>Return</ButtonLink>] : undefined}>
      <Surface structure="working" className="overflow-hidden">
        {notice ? (
          <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-start gap-2 border-b px-5 py-3 ${notice.type === "error" ? "border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)]" : "border-[var(--uo-route-success-border)] bg-[var(--uo-route-success-bg)]"}`}>
            {notice.type === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            <p className="ua-text-body">{notice.message}</p>
          </div>
        ) : null}

        {state.subscriptionIntentAvailability === "schema_pending" ? (
          <JoinedSection className="bg-[var(--uo-route-warning-bg)] p-4 sm:p-5">
            <h2 className="ua-text-working-title">Requested plan history unavailable</h2>
            <p className="ua-text-caption-role mt-1">
              The active plan and credit balance are current. Saved plan requests will appear after the MR0 database update is applied to this environment.
            </p>
          </JoinedSection>
        ) : null}

        {state.subscriptionIntent && state.subscriptionIntent.status !== "superseded" ? (
          <JoinedSection className="flex flex-wrap items-center justify-between gap-3 bg-[var(--uo-route-surface-secondary)] p-4 sm:p-5">
            <div>
              <h2 className="ua-text-working-title">Requested plan · {state.subscriptionIntent.planName}</h2>
              <p className="ua-text-caption-role mt-1">
                {state.subscriptionIntent.status === "confirmed"
                  ? "The provider-confirmed request is recorded. The active plan above remains the account authority."
                  : state.subscriptionIntent.status === "checkout_created"
                    ? "Checkout was created. The active plan will not change until the provider confirmation is recorded."
                    : "The request is saved. It has not changed the active subscription."}
              </p>
            </div>
            <StatusBadge family="workflowStatus" value={state.subscriptionIntent.status === "confirmed" ? "active" : "pending"} size="sm" />
          </JoinedSection>
        ) : null}

        {blocked ? (
          <JoinedSection className="flex flex-wrap items-center justify-between gap-4 bg-[var(--uo-route-warning-bg)] p-4 sm:p-5">
            <div className="min-w-0">
              <h2 className="ua-text-working-title">{state.status === "past_due" || state.status === "grace_period" ? "Payment action required" : "Network credits exhausted"}</h2>
              <p className="ua-text-caption-role mt-1">{state.status === "past_due" || state.status === "grace_period" ? "Update the payment method to restore the plan’s full access. Existing records remain readable." : "Buy credits to resume credit-backed lookups; recorded cases and audit history remain available."}</p>
            </div>
            <Button onClick={() => state.status === "past_due" || state.status === "grace_period" ? void runAction("portal") : setPending({ action: "topup", title: "Buy network credits?", description: `Add ${TOP_UP_CREDITS} credits for £${TOP_UP_PRICE_GBP}. Stripe confirms payment before the balance changes.`, confirmLabel: "Continue to payment" })}>{state.status === "past_due" || state.status === "grace_period" ? "Update payment" : "Buy credits"}</Button>
          </JoinedSection>
        ) : null}

        <JoinedSection className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="ua-text-section-title">{state.planName}</h2>
              <StatusBadge family="workflowStatus" value={state.status} size="sm" />
            </div>
            <p className="ua-text-kpi mt-2">{money(state.priceGbp)}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><dt className="ua-text-metadata">Current period ends</dt><dd className="ua-text-body mt-1">{dateLabel(state.currentPeriodEnd)}</dd></div>
              <div><dt className="ua-text-metadata">Payment method</dt><dd className="ua-text-body mt-1">Managed securely in Stripe</dd></div>
            </dl>
          </div>
          <div className="rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-surface-secondary)] p-4">
            <div className="flex items-start gap-3"><ReceiptText className="h-4 w-4 text-[var(--uo-route-icon-secondary)]" aria-hidden="true" /><div><h3 className="ua-text-working-title">Scheduled account state</h3><p className="ua-text-caption-role mt-1">{state.downgradeToPlanName ? `Changes to ${state.downgradeToPlanName} on ${dateLabel(state.currentPeriodEnd)}.` : state.cancelAtPeriodEnd ? `Moves to Free on ${dateLabel(state.currentPeriodEnd)}.` : "No downgrade or cancellation is scheduled."}</p></div></div>
          </div>
        </JoinedSection>

        <JoinedSection className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-[var(--uo-route-icon-secondary)]" aria-hidden="true" /><h2 className="ua-text-section-title">Usage credits</h2></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--uo-route-surface-muted)]" aria-label={usagePercent == null ? "Monthly credit use unavailable" : `${usagePercent}% of monthly credits used`} role="img"><span className="block h-full bg-[var(--uo-route-accent-600)]" style={{ width: `${usagePercent ?? 0}%` }} /></div>
            <p className="ua-text-caption-role mt-2">{state.monthlyAllowance == null ? "Monthly allowance unavailable" : `${formatNumber(state.usedThisCycle)} of ${formatNumber(state.monthlyAllowance)} monthly credits used`} · resets {dateLabel(state.cycleResetAt)}</p>
            <p className="mt-2 text-[length:var(--uo-route-text-metadata-size)] text-[var(--uo-route-text-tertiary)]">Projected exhaustion is unavailable because billing returns a cycle total, not governed daily usage history. No forecast is inferred.</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-right">
            <div><dt className="ua-text-metadata">Monthly left</dt><dd className="ua-text-kpi mt-1 tabular-nums">{formatNumber(state.monthlyCreditsRemaining)}</dd></div>
            <div><dt className="ua-text-metadata">Top-up left</dt><dd className="ua-text-kpi mt-1 tabular-nums">{formatNumber(state.topupCreditsRemaining)}</dd></div>
          </dl>
          {state.canTopUp ? <div className="lg:col-span-2"><Button variant="secondary" onClick={() => setPending({ action: "topup", title: "Buy network credits?", description: `Add ${TOP_UP_CREDITS} credits for £${TOP_UP_PRICE_GBP}. Stripe confirms payment before the balance changes.`, confirmLabel: "Continue to payment" })}>Buy {TOP_UP_CREDITS} credits · £{TOP_UP_PRICE_GBP}</Button></div> : null}
        </JoinedSection>

        <JoinedSection className="p-4 sm:p-5">
          <h2 className="ua-text-section-title">Plan options</h2>
          <p className="ua-text-caption-role mt-1">Choose a plan for future access. Stripe is the payment processor; Unauth remains the source of plan and usage meaning.</p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-border-subtle)] md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const current = plan.planId === state.planId;
              return (
                <section key={plan.planId} className="flex min-h-48 flex-col bg-[var(--uo-route-surface-primary)] p-4" aria-label={`${plan.name} plan`}>
                  <div className="flex items-center justify-between gap-2"><h3 className="ua-text-working-title">{plan.name}</h3>{current ? <StatusBadge family="workflowStatus" value="active" size="sm" /> : null}</div>
                  <p className="ua-text-section-title mt-3">{money(plan.priceGbp)}</p>
                  <p className="ua-text-caption-role mt-1">{plan.creditsMonthly === "custom" ? "Custom credit allowance" : `${formatNumber(plan.creditsMonthly)} credits each month`}</p>
                  <div className="mt-auto pt-5">{current ? <p className="ua-text-label text-center text-[var(--uo-route-text-secondary)]">Current plan</p> : plan.planId === "scale" ? <Button variant="secondary" className="w-full" onClick={() => void runAction("contact_scale", "scale")}>Contact account team</Button> : <Button variant={plans.findIndex((item) => item.planId === plan.planId) > plans.findIndex((item) => item.planId === state.planId) ? "primary" : "secondary"} className="w-full" onClick={() => requestPlan(plan.planId)}>Choose {plan.name}</Button>}</div>
                </section>
              );
            })}
          </div>
        </JoinedSection>

        <JoinedSection className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-4 w-4 text-[var(--uo-route-icon-secondary)]" aria-hidden="true" /><div><h2 className="ua-text-working-title">Payment configuration</h2><p className="ua-text-caption-role mt-1">Payment details are viewed and updated in Stripe’s secure billing portal.</p></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" loading={actionLoading === "portal"} onClick={() => void runAction("portal")}>Update payment method</Button>{state.cancelAtPeriodEnd ? <Button variant="secondary" loading={actionLoading === "resume"} onClick={() => void runAction("resume")}>Keep subscription</Button> : state.planId !== "free" && state.planId !== "scale" ? <Button variant="ghost" onClick={() => setPending({ action: "cancel", title: "Cancel subscription?", description: `Access continues until ${dateLabel(state.currentPeriodEnd)}, then the workspace moves to Free. Historical records and audit history remain available.`, confirmLabel: "Schedule cancellation", danger: true })}>Cancel subscription</Button> : null}</div>
        </JoinedSection>
      </Surface>

      <Modal open={pending != null} onClose={() => !actionLoading && setPending(null)} title={pending?.title ?? "Review billing change"} description="Review the scope and timing before continuing." size="sm" overlayId="billing-change-confirmation" closeOnBackdrop={!actionLoading} closeOnEscape={!actionLoading} showCloseButton={!actionLoading}>
        {pending ? <div className="grid gap-5"><p className="ua-text-body text-[var(--uo-route-text-secondary)]">{pending.description}</p><div className="rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-surface-secondary)] p-3"><p className="ua-text-metadata">Audit consequence</p><p className="ua-text-body mt-1">The requested billing action and provider result are retained against this workspace.</p></div><div className="flex justify-end gap-2"><Button variant="secondary" disabled={Boolean(actionLoading)} onClick={() => setPending(null)}>Go back</Button><Button variant={pending.danger ? "danger" : "primary"} loading={Boolean(actionLoading)} onClick={() => void runAction(pending.action, pending.planId)}>{pending.confirmLabel}</Button></div></div> : null}
      </Modal>
    </SettingsPageShell>
  );
}

function BillingSettingsSkeleton() {
  return (
    <SettingsPageShell title="Billing" subtitle="Manage plan, credit balance, and payment configuration." surfaceId="billing" layout="wide" truth={BILLING_TRUTH}>
      <Surface structure="working" role="status" aria-busy="true" aria-label="Loading billing">
        {["plan", "usage", "options", "payment"].map((section, index) => <JoinedSection key={section} className="space-y-3 p-5"><Bone className="h-4 w-32" />{index < 2 ? <><Bone className="h-8 w-44" /><Bone className="h-3 w-full max-w-xl" /></> : <Bone className="h-20 w-full" />}</JoinedSection>)}
      </Surface>
    </SettingsPageShell>
  );
}
