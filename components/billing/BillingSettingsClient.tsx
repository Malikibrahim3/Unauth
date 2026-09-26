'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import {
  annualDiscountPercent,
  annualFreeMonths,
  annualMonthlyEquivalentMinor,
  annualSavingGbp,
  BILLABLE_EVENTS,
  LEGACY_PLAN_IDS,
  PLANS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
  type BillingInterval,
  type PlanId,
} from '@/lib/billing/plans';
import { formatDateAbsolute, formatMoney, formatNumber } from '@/lib/utils/format';
import { Modal } from '@/components/ui/Modal';

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
  creditBurnForecast?: {
    projectedExhaustionAt: string | null;
    observationWindowDays: number | null;
    dailyRate: number | null;
    creditsObserved: number | null;
    modelBasis: string;
    state: 'available' | 'unavailable';
    sourceState?: 'available' | 'unavailable';
  };
  cycleResetAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  downgradeToPlanId: PlanId | null;
  downgradeToPlanName: string | null;
  gracePeriodDaysRemaining: number | null;
  canTopUp: boolean;
  subscriptionIntentAvailability: 'available' | 'schema_pending';
  subscriptionIntent: {
    planId: PlanId;
    planName: string;
    billingInterval: BillingInterval;
    status: 'pending' | 'checkout_created' | 'confirmed' | 'cancelled' | 'superseded';
    updatedAt: string;
  } | null;
};

type Notice = { message: string; type: 'success' | 'error' };
type PendingAction = { action: string; planId?: PlanId; title: string; description: string; confirmLabel: string; danger?: boolean };

const quietButton = (primary = false, disabled = false, danger = false): CSSProperties => ({
  border: 0,
  borderRadius: 9,
  padding: '6px 11px',
  background: primary ? '#1c1f23' : '#fff',
  boxShadow: primary ? 'none' : danger ? 'inset 0 0 0 1px rgba(176,67,26,.35)' : 'inset 0 0 0 1px rgba(28,27,25,.11)',
  color: primary ? '#fff' : danger ? '#b0431a' : '#40454a',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? .45 : 1,
  font: "500 12.5px/1 'Inter',sans-serif",
});

function money(value: number | 'custom') {
  if (value === 'custom') return 'Talk to us';
  return value === 0 ? '£0' : `£${formatNumber(value)}`;
}

function planLimit(value: number | 'unlimited' | 'agreed') {
  return typeof value === 'number' ? formatNumber(value) : 'Agreed';
}

function requestedTerms(planId: PlanId, billingInterval: BillingInterval) {
  const plan = PLANS[planId];
  if (plan.priceGbp === 'custom') return `${plan.name} · custom ${billingInterval} terms`;
  if (billingInterval === 'annual' && typeof plan.annualPriceGbp === 'number') {
    const equivalentMinor = annualMonthlyEquivalentMinor(plan);
    const monthlyEquivalent = equivalentMinor == null ? 'Custom' : formatMoney(equivalentMinor, plan.currency);
    const annualTotal = formatMoney(plan.annualPriceGbp * 100, plan.currency).replace(/\.00$/, '');
    const saving = annualSavingGbp(plan);
    const discount = annualDiscountPercent(plan);
    const freeMonths = annualFreeMonths(plan);
    const annualDetails = [
      saving == null ? null : `save ${formatMoney(saving * 100, plan.currency).replace(/\.00$/, '')}`,
      discount == null || freeMonths == null ? null : `${discount}% discount, equivalent to ${freeMonths} months free`,
    ].filter((detail): detail is string => detail != null).join(' · ');
    return `${plan.name} · ${annualTotal} upfront annually (${monthlyEquivalent}/month effective)${annualDetails ? ` · ${annualDetails}` : ''}`;
  }
  const monthlyTotal = formatMoney(plan.priceGbp * 100, plan.currency).replace(/\.00$/, '');
  return `${plan.name} · ${monthlyTotal}/month`;
}

function dateLabel(value: string | null) {
  return value ? formatDateAbsolute(value) : 'Unavailable';
}

function isBillingState(value: unknown): value is BillingState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BillingState>;
  return typeof candidate.planId === 'string' && Object.hasOwn(PLANS, candidate.planId) && typeof candidate.planName === 'string' && typeof candidate.status === 'string' && typeof candidate.totalRemaining === 'number';
}

function Metric({ label, value, detail, progress, warning }: { label: string; value: ReactNode; detail: string; progress: number | null; warning?: string | null }) {
  return <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ color: '#64686d', font: "400 10.5px/1.3 'Inter',sans-serif" }}>{label}</div>
    <div style={{ marginTop: 7, color: '#1c1f23', font: "400 17px/1 'IBM Plex Mono',monospace" }}>{value}</div>
    <div role="img" aria-label={progress == null ? `${label} progress unavailable` : `${Math.round(progress)}% used`} style={{ height: 5, marginTop: 8, borderRadius: 3, overflow: 'hidden', background: '#e4e3e0' }}><span style={{ display: 'block', width: progress == null ? 0 : `${Math.min(100, Math.max(0, progress))}%`, height: '100%', background: '#1c1f23' }}/></div>
    <div style={{ minHeight: 30, marginTop: 6, color: '#64686d', font: "400 9.5px/1.4 'Inter',sans-serif" }}>{detail}</div>
    {warning ? <div style={{ marginTop: 6, color: '#b0431a', font: "400 9.5px/1.35 'Inter',sans-serif" }}>• {warning}</div> : null}
  </div>;
}

function ReviewModal({ pending, busy, onClose, onConfirm }: { pending: PendingAction | null; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!pending) return null;
  return <Modal
    open
    onClose={onClose}
    title={pending.title}
    description="Review the scope and timing before continuing."
    overlayId="billing-plan-change-modal"
    pending={busy}
    pendingMessage="Waiting for the billing provider. No account state is inferred until it confirms the result."
    footer={<><button type="button" disabled={busy} onClick={onClose} style={quietButton(false, busy)}>Go back</button><button type="button" disabled={busy} onClick={onConfirm} style={quietButton(!pending.danger, busy, pending.danger)}>{busy ? 'Working…' : pending.confirmLabel}</button></>}
  >
    <p style={{ margin: 0, color: '#64686d', font: "400 12.5px/1.55 'Inter',sans-serif" }}>{pending.description}</p>
    <div style={{ marginTop: 16, borderRadius: 10, padding: 13, background: '#f4f3f1' }}><div style={{ color: '#64686d', font: "400 9.5px/1.3 'IBM Plex Mono',monospace" }}>AUDIT CONSEQUENCE</div><p style={{ margin: '6px 0 0', color: '#40454a', font: "400 11.5px/1.45 'Inter',sans-serif" }}>The requested billing action and provider result are retained against this workspace.</p></div>
  </Modal>;
}

export default function BillingSettingsClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BillingState | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [unavailableStatus, setUnavailableStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const requestedReturn = searchParams.get('return');
  const returnPath = useMemo(() => requestedReturn ? safeRedirectPath(requestedReturn) : null, [requestedReturn]);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing');
      if (!response.ok) throw new Error('Billing details could not be loaded.');
      const body = await response.json() as unknown;
      if (!isBillingState(body)) {
        const serviceStatus = body && typeof body === 'object' && 'status' in body ? String((body as { status?: unknown }).status ?? '') : '';
        setState(null);
        setUnavailableStatus(serviceStatus || null);
        setUnavailableReason(serviceStatus === 'not_configured' ? 'Billing is not configured for this environment, so no plan, balance, or payment state is shown.' : 'The billing service did not return a complete, verified account state.');
        return;
      }
      setUnavailableStatus(null);
      setUnavailableReason(null);
      setState(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Billing details could not be loaded.';
      setState(null);
      setUnavailableStatus(null);
      setUnavailableReason(message);
      setNotice({ type: 'error', message });
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
      const response = await fetch('/api/billing/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': globalThis.crypto?.randomUUID?.() ?? `${action}-${planId ?? 'none'}-${Date.now()}` },
        body: JSON.stringify({ action, planId, returnTo: returnPath ?? undefined }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; message?: string; url?: string };
      if (!response.ok) throw new Error(body.error ?? 'Billing action failed.');
      if (body.url) { window.location.href = body.url; return; }
      setNotice({ type: 'success', message: body.message ?? 'Billing settings updated.' });
      await loadBilling();
      setPending(null);
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Billing action failed.' });
    } finally {
      setActionLoading(null);
    }
  }, [loadBilling, returnPath]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') setNotice({ type: 'success', message: 'Returned from checkout. The URL does not confirm payment; the verified account below shows any recorded provider confirmation.' });
    if (searchParams.get('topup') === 'success') setNotice({ type: 'success', message: 'Returned from top-up checkout. No credit increase is inferred from the URL; the verified balance below remains authoritative.' });
    if (searchParams.get('action') === 'topup') setPending({ action: 'topup', title: 'Buy context credits?', description: `Add ${TOP_UP_CREDITS} credits for £${TOP_UP_PRICE_GBP}. The billing provider will confirm payment before the balance changes.`, confirmLabel: 'Continue to payment' });
  }, [searchParams]);

  function closePending() {
    if (actionLoading) return;
    setPending(null);
    window.requestAnimationFrame(() => lastTrigger.current?.focus());
  }

  function requestPlan(next: PlanId, trigger: HTMLButtonElement) {
    if (!state) return;
    lastTrigger.current = trigger;
    const plans = LEGACY_PLAN_IDS.map((id) => PLANS[id]);
    const nextPlan = PLANS[next];
    const upgrade = plans.findIndex((item) => item.planId === next) > plans.findIndex((item) => item.planId === state.planId);
    const currentPlan = PLANS[state.planId];
    const terms = (item: typeof nextPlan) => `${item.name}: ${money(item.priceGbp)}${item.priceGbp === 'custom' ? ' agreed pricing' : ' a month, GBP excluding VAT'}, ${item.creditsMonthly === 'custom' ? 'Agreed' : formatNumber(item.creditsMonthly)} context credits, ${planLimit(item.limits.seats)} seats, ${planLimit(item.limits.connectedStores)} stores`;
    const termsPreview = `Current — ${terms(currentPlan)}. Requested — ${terms(nextPlan)}. Requested exclusions: ${nextPlan.publicExclusions.join('; ')}. Requested inclusions: ${nextPlan.publicFeatures.join('; ')}. `;
    setPending({
      action: state.planId === 'free' ? 'checkout' : upgrade ? 'upgrade' : 'downgrade',
      planId: next,
      title: `${upgrade ? 'Change' : 'Schedule change'} to ${nextPlan.name}?`,
      description: upgrade
        ? `${termsPreview}The upgrade takes effect only after the server records the applicable provider confirmation. Opening this review changes nothing.`
        : `${termsPreview}A downgrade is scheduled for renewal${state.currentPeriodEnd ? ` on ${dateLabel(state.currentPeriodEnd)}` : '; the renewal date is unavailable'}. The server must confirm the schedule, and the renewal process must apply it before limits change. Retention terms require pilot approval.`,
      confirmLabel: upgrade ? 'Continue to billing' : 'Schedule plan change',
      danger: !upgrade,
    });
  }

  const truth = { access: 'Workspace members permitted to manage billing', currentState: 'Active plan and credit balance come from the verified billing account', saveBehavior: 'Requests remain pending until the payment provider confirms them', impact: 'Future access, allowances, top-ups, or renewal timing; prior decisions and financial events are not rewritten' };
  const toolbar = <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
    {state ? <><span style={{ borderRadius: 5, padding: '3px 7px', background: '#eef6f1', color: '#1a6b43', font: "500 9px/1 'Inter',sans-serif" }}>{PLANS[state.planId].name.toUpperCase()} · {state.status.toUpperCase()}</span><span style={{ color: '#64686d', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{money(PLANS[state.planId].priceGbp)}{PLANS[state.planId].priceGbp === 'custom' ? '' : ' a month'} · renewal {dateLabel(state.currentPeriodEnd)}</span></> : <span style={{ color: '#64686d', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{loading ? 'Loading verified billing account…' : 'Billing account unavailable'}</span>}
    <span style={{ flex: 1 }}/>
    {returnPath ? <a href={returnPath} style={{ ...quietButton(), textDecoration: 'none' }}>Return</a> : null}
    <button type="button" disabled={!state} onClick={() => void runAction('portal')} style={quietButton(false, !state)}>Billing history</button>
    <button type="button" disabled={!state} onClick={() => document.getElementById('billing-catalogue')?.scrollIntoView({ block: 'nearest' })} style={quietButton(true, !state)}>Change plan</button>
  </div>;

  if (loading) return <SettingsPageShell title="Billing" surfaceId="billing" toolbar={toolbar} truth={truth}><div role="status" aria-label="Loading billing" style={{ height: 430, borderRadius: 10, background: '#f4f2ef', animation: 'om-shimmer 1.7s ease-in-out infinite' }}/></SettingsPageShell>;
  if (!state) return <SettingsPageShell title="Billing" surfaceId="billing" toolbar={toolbar} truth={truth}><div data-state-id={unavailableStatus === 'not_configured' ? 'billing-unavailable' : undefined} role="alert" style={{ padding: 24, borderRadius: 10, background: '#fdf0e6', color: '#b0431a' }}><strong>Billing unavailable</strong><p>{unavailableReason ?? 'No plan or payment values are shown because the billing service did not return a verified account state.'}</p><button type="button" onClick={() => void loadBilling()} style={quietButton()}>Try again</button></div></SettingsPageShell>;

  const plans = LEGACY_PLAN_IDS
    .filter((id) => id !== 'free' || state.planId === 'free')
    .map((id) => PLANS[id]);
  const plan = PLANS[state.planId];
  const usagePercent = state.monthlyAllowance && state.monthlyAllowance > 0 ? Math.min(100, (state.usedThisCycle / state.monthlyAllowance) * 100) : null;
  const creditsForecast = state.creditBurnForecast?.state === 'available' && state.creditBurnForecast.sourceState !== 'unavailable' && state.creditBurnForecast.projectedExhaustionAt
    ? `At ${formatNumber(state.creditBurnForecast.dailyRate ?? 0)} a day, projected to run out ${dateLabel(state.creditBurnForecast.projectedExhaustionAt)}`
    : 'Projected exhaustion unavailable; no rate is inferred.';

  return <SettingsPageShell title="Billing" surfaceId="billing" toolbar={toolbar} truth={truth}>
    {notice ? <output role={notice.type === 'error' ? 'alert' : 'status'} style={{ flex: 'none', borderRadius: 9, padding: '9px 12px', background: notice.type === 'error' ? '#fdf0e6' : '#eef6f1', color: notice.type === 'error' ? '#b0431a' : '#1a6b43', font: "400 11px/1.4 'Inter',sans-serif" }}>{notice.message}</output> : null}
    {state.subscriptionIntent && state.subscriptionIntent.status !== 'superseded' ? <div role="status" aria-label="Requested plan intent" style={{ borderRadius: 9, padding: '9px 12px', background: '#fff3e9', color: '#7a5310', font: "400 11px/1.4 'Inter',sans-serif" }}>Requested plan · {requestedTerms(state.subscriptionIntent.planId, state.subscriptionIntent.billingInterval)}. {state.subscriptionIntent.status === 'confirmed' ? 'Provider confirmation is recorded; the active plan above remains account authority.' : 'The request has not changed the provider-confirmed active plan.'}</div> : null}
    <section style={{ flex: 'none', borderRadius: 10, padding: '12px 16px 14px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}><h2 style={{ margin: 0, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>THIS BILLING PERIOD</h2><span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}>{dateLabel(state.cycleResetAt)} reset</span></div>
      <div style={{ display: 'flex', gap: 22, marginTop: 14 }}>
        <Metric label="Context credits used" value={<>{formatNumber(state.usedThisCycle)} <small style={{ color: '#64686d', fontSize: 9 }}>of {state.monthlyAllowance == null ? 'unavailable' : formatNumber(state.monthlyAllowance)}</small></>} detail="monthly allowance resets with the cycle; top-up balance follows the verified account" progress={usagePercent} warning={creditsForecast}/>
        <Metric label="Seats" value={<>— <small style={{ color: '#64686d', fontSize: 9 }}>of {planLimit(plan.limits.seats)}</small></>} detail="current occupied-seat count is unavailable from billing" progress={null}/>
        <Metric label="Connected stores" value={<>— <small style={{ color: '#64686d', fontSize: 9 }}>of {planLimit(plan.limits.connectedStores)}</small></>} detail="connection count is owned by Sources, not billing" progress={null}/>
        <Metric label="API calls" value={<>— <small style={{ color: '#64686d', fontSize: 9 }}>of {planLimit(plan.limits.apiCallsPerMonth)}</small></>} detail="current API-call count is unavailable" progress={null}/>
      </div>
    </section>

    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(300px,.85fr)', gap: 12 }}>
      <section id="billing-catalogue" style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, padding: '12px 16px 14px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        <h2 style={{ margin: 0, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>THE CATALOGUE</h2>
        <div style={{ marginTop: 8 }}>
          {plans.map((candidate) => {
            const current = candidate.planId === state.planId;
            return <section key={candidate.planId} role="region" aria-label={`${candidate.name} plan`} style={{ minHeight: 76, display: 'grid', gridTemplateColumns: '108px 80px minmax(0,1fr) 76px', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #eae8e5', borderLeft: current ? '2px solid #e77d35' : '2px solid transparent', background: current ? '#ffffff' : '#fff' }}>
              <h3 style={{ margin: 0, paddingLeft: current ? 9 : 0, color: '#1c1f23', font: "500 12.5px/1.35 'Inter',sans-serif" }}>{candidate.name}</h3>
              <span style={{ color: '#1c1f23', font: "400 11px/1.3 'IBM Plex Mono',monospace" }}>{money(candidate.priceGbp)}</span>
              <span style={{ color: '#64686d', font: "400 10.5px/1.35 'Inter',sans-serif" }}>{candidate.creditsMonthly === 'custom' ? 'Agreed credits' : `${formatNumber(candidate.creditsMonthly)} credits`} · {planLimit(candidate.limits.seats)} seats · {planLimit(candidate.limits.connectedStores)} store{candidate.limits.connectedStores === 1 ? '' : 's'} · {candidate.entitlements.lookup_api ? 'scoped API access' : 'API not included'} · {candidate.entitlements.evidence_export_raw ? 'enabled exports' : 'enabled case packs only'}</span>
              {current ? <span style={{ justifySelf: 'end', borderRadius: 5, padding: '3px 6px', background: '#eef6f1', color: '#1a6b43', font: "500 8.5px/1 'Inter',sans-serif" }}>CURRENT</span> : <button type="button" aria-label={`Choose ${candidate.name}`} onClick={(event) => candidate.planId === 'scale' ? void runAction('contact_scale', 'scale') : requestPlan(candidate.planId, event.currentTarget)} style={{ justifySelf: 'end', border: 0, padding: 4, background: 'transparent', color: '#9f4f08', cursor: 'pointer', font: "400 11px/1.2 'Inter',sans-serif" }}>{candidate.planId === 'scale' ? 'Contact' : 'Switch'}</button>}
            </section>;
          })}
        </div>
        <span style={{ flex: 1 }}/>
        <p style={{ margin: '12px 0 0', paddingTop: 12, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>Prices are monthly, in GBP, excluding VAT. There is one catalogue: nothing here is negotiated per workspace except Enterprise.</p>
      </section>

      <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: 10, padding: '12px 16px 14px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        <h2 style={{ margin: 0, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHAT HAPPENS WHEN YOU CHANGE PLAN</h2>
        {[['1', 'Unauth records the request', 'Nothing changes yet. The plan you have is the plan you keep.'], ['2', 'The billing provider takes the payment', 'Or fails. Either way Unauth is told by the provider, not by this page.'], ['3', 'The effective date governs limits', 'Upgrades require confirmation. Scheduled downgrades take effect through the renewal process.']].map(([step, heading, copy]) => <div key={step} style={{ display: 'flex', gap: 10, padding: '11px 0', borderBottom: '1px solid #eae8e5' }}><span style={{ width: 18, height: 18, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#f4f2ef', color: '#64686d', font: "500 9px/1 'IBM Plex Mono',monospace" }}>{step}</span><div><strong style={{ display: 'block', color: '#1c1f23', font: "500 11.5px/1.35 'Inter',sans-serif" }}>{heading}</strong><span style={{ display: 'block', marginTop: 3, color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>{copy}</span></div></div>)}
        <span style={{ flex: 1 }}/>
        <div style={{ borderRadius: 10, padding: 13, background: '#f4f2ef', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>The billing provider here is Unauth&apos;s own subscription provider. It is not a connected evidence source, and nothing in the loss ledger comes from it.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}><span style={{ flex: 1, color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}>{state.downgradeToPlanName ? `scheduled: ${state.downgradeToPlanName} · ${dateLabel(state.currentPeriodEnd)}` : state.cancelAtPeriodEnd ? `cancels ${dateLabel(state.currentPeriodEnd)}` : 'no plan change scheduled'}</span><button type="button" onClick={() => void runAction('portal')} style={quietButton(false, actionLoading === 'portal')}>Update card</button></div>
      </section>
    </div>
    <section aria-label="Credit costs" style={{ flex: 'none', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>
      <strong>Existing credit-plan operation costs</strong>
      {Object.values(BILLABLE_EVENTS).map(event => <p key={event.id} style={{ margin: '4px 0' }}>{event.label}: {event.credits} credits. {event.chargingRule}</p>)}
      <p>Newly generated reports are separate operations. These costs apply to existing credit-based plan records. Current Core and Scale offers use incident capacity; annual prices exclude VAT.</p>
    </section>
    <ReviewModal pending={pending} busy={Boolean(actionLoading)} onClose={closePending} onConfirm={() => pending && void runAction(pending.action, pending.planId)}/>
  </SettingsPageShell>;
}
