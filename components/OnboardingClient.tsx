'use client';

import { useEffect, useReducer, cloneElement, type ReactElement } from 'react';
import Link from 'next/link';
import { Check, ShoppingBag, Headphones, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ORDER_VOLUME_OPTIONS, LOSS_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';
import {
  createInitialOnboardingState,
  onboardingReducer,
} from '@/components/Onboarding/onboardingReducer';

interface OnboardingClientProps {
  userId: string;
  initialStoreName?: string;
  initialPlatform?: string;
  initialAnnualVolume?: string;
  initialPrimaryConcern?: string;
  initialUsesWms3pl?: string;
  initialUsesReturnsPlatform?: string;
  shopifyConnected?: boolean;
  shopifyShopDomain?: string;
  helpdeskConnected?: boolean;
  helpdeskProvider?: 'gorgias' | 'zendesk' | 'freshdesk' | null;
}

const STEPS = [
  {
    id: 'profile',
    label: 'Your store profile',
    icon: Store,
    body: 'Tell us a bit about your store. This helps Unauth surface the right claim patterns for your volume and category.',
  },
  {
    id: 'shopify',
    label: 'Connect Shopify',
    icon: ShoppingBag,
    body: 'Connect Shopify so Unauth can show order history, refund patterns, and customer signals inside every Gorgias ticket.',
  },
  {
    id: 'gorgias',
    label: 'Connect Gorgias',
    icon: Headphones,
    body: 'Connect Gorgias so your support agents see claim context — prior orders, claim rate, trust indicators — without leaving the ticket.',
  },
  {
    id: 'done',
    label: 'Widget is live',
    icon: Check,
    body: 'Your Gorgias claim context widget is ready. Agents will see Unauth intelligence inside every support ticket automatically.',
  },
] as const;

export default function OnboardingClient({
  userId,
  initialStoreName = '',
  initialPlatform = '',
  initialAnnualVolume = '',
  initialPrimaryConcern = '',
  initialUsesWms3pl = '',
  initialUsesReturnsPlatform = '',
  shopifyConnected = false,
  shopifyShopDomain = '',
  helpdeskConnected = false,
  helpdeskProvider = null,
}: OnboardingClientProps) {
  void userId;
  const [state, dispatch] = useReducer(
    onboardingReducer,
    {
      initialStoreName,
      initialPlatform,
      initialAnnualVolume,
      initialPrimaryConcern,
      initialUsesWms3pl,
      initialUsesReturnsPlatform,
      shopifyShopDomain,
    },
    (input) => createInitialOnboardingState(input),
  );
  const {
    activeStep,
    storeName,
    platform,
    annualVolume,
    primaryConcern,
    usesWms3pl,
    usesReturnsPlatform,
    loading,
    error,
    shopDomain,
  } = state;

  useEffect(() => {
    dispatch({ type: 'patch', patch: { shopDomain: shopifyShopDomain } });
  }, [shopifyShopDomain]);

  const maxReachableStep = !shopifyConnected ? 1 : !helpdeskConnected ? 2 : 3;

  async function saveProfileAndContinue() {
    if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) {
      dispatch({ type: 'patch', patch: { error: 'Complete the store name, platform, order volume, and primary concern before continuing.' } });
      return;
    }
    dispatch({ type: 'patch', patch: { loading: true, error: '' } });
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: storeName.trim(),
        platform,
        monthlyOrderVolume: annualVolume,
        primaryLossConcern: primaryConcern,
        usesWms3pl: usesWms3pl ? usesWms3pl === 'yes' : undefined,
        usesReturnsPlatform: usesReturnsPlatform ? usesReturnsPlatform === 'yes' : undefined,
        setupComplete: true,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    dispatch({ type: 'patch', patch: { loading: false } });
    if (!response.ok) {
      dispatch({ type: 'patch', patch: { error: payload.error ?? 'Could not save your store details.' } });
      return;
    }
    dispatch({ type: 'patch', patch: { activeStep: 1 } });
  }

  const current = STEPS[activeStep];
  const CurrentIcon = current.icon;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <header className="flex h-[52px] items-center justify-between border-b border-[var(--border-muted)] bg-[var(--surface)] px-4 sm:px-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
          <span className="grid h-7 w-7 place-items-center rounded-[var(--ua-radius-input)] bg-[var(--brand-deep)] text-[10px] font-bold text-white">U</span>
          Unauth
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Workspace setup</span>
      </header>
      <div className="mx-auto max-w-[1500px] px-3 pb-7 pt-4 sm:px-5">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Welcome to Unauth</p>
        <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
          Get set up
        </h1>
        <p className="mt-1 max-w-[62ch] text-[12px] leading-5 text-[var(--text-secondary)]">
          A few quick steps to bring payout control into every support ticket.
        </p>
        <div
          className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={activeStep + 1}
          aria-valuetext={`Step ${activeStep + 1} of ${STEPS.length}`}
        >
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150" style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[208px_minmax(0,1fr)]">
        {/* Sidebar checklist */}
        <aside
          className="rounded-[var(--ua-radius-card)] border p-3"
          style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}
        >
          <div className="mb-3 flex items-start justify-between gap-3 px-1">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Checklist</p>
              <p className="mt-1 text-[10px] leading-4" style={{ color: 'var(--text-tertiary)' }}>
                Add payout control to your Gorgias tickets
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const active = index === activeStep;
              const done = index < activeStep;
              const reachable = index <= maxReachableStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && dispatch({ type: 'patch', patch: { activeStep: index } })}
                  className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--ua-radius-input)] border px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: active ? 'var(--surface-selected)' : 'var(--surface-sunken)',
                    borderColor: active ? 'var(--accent-border)' : 'var(--border)',
                  }}
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--ua-radius-control)]" style={{ background: done ? 'var(--sev-clear-fill)' : 'var(--surface-sunken)', color: done ? 'var(--neutral)' : 'var(--text-tertiary)' }}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.label}</span>
                  </span>
                  <span className="t-mono" style={{ color: 'var(--text-tertiary)' }}>{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>

        </aside>

        {/* Step content */}
        <section className="rounded-[var(--ua-radius-card)] border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="mb-4 flex items-start gap-3 border-b border-[var(--border-muted)] pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-input)]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <CurrentIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Step {activeStep + 1} of {STEPS.length}</p>
              <h2 className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">{current.label}</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>{current.body}</p>
            </div>
          </div>

          {activeStep === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Store name">
                <input
                  aria-label="Store name"
                  value={storeName}
                  onChange={(e) => dispatch({ type: 'patch', patch: { storeName: e.target.value } })}
                  placeholder="Acme Commerce Ltd"
                />
              </Field>
              <Field label="Platform">
                <select aria-label="Platform" value={platform} onChange={(e) => dispatch({ type: 'patch', patch: { platform: e.target.value } })}>
                  <option value="">Select platform…</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce" disabled>WooCommerce (coming soon)</option>
                  <option value="bigcommerce" disabled>BigCommerce (coming soon)</option>
                  <option value="magento">Magento</option>
                  <option value="custom">Custom</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Monthly order volume">
                <select aria-label="Monthly order volume" value={annualVolume} onChange={(e) => dispatch({ type: 'patch', patch: { annualVolume: e.target.value } })}>
                  <option value="">Select range…</option>
                  {ORDER_VOLUME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Primary post-purchase loss concern">
                <select aria-label="Primary concern" value={primaryConcern} onChange={(e) => dispatch({ type: 'patch', patch: { primaryConcern: e.target.value } })}>
                  <option value="">Select concern…</option>
                  {LOSS_CONCERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Do you use a WMS or 3PL?">
                <select aria-label="Do you use a WMS or 3PL?" value={usesWms3pl} onChange={(e) => dispatch({ type: 'patch', patch: { usesWms3pl: e.target.value } })}>
                  <option value="">Select…</option>
                  <option value="yes">Yes, we use warehouse software or a 3PL</option>
                  <option value="no">No, we handle this ourselves</option>
                </select>
              </Field>
              <Field label="Do you use a dedicated returns platform?">
                <select aria-label="Do you use a dedicated returns platform?" value={usesReturnsPlatform} onChange={(e) => dispatch({ type: 'patch', patch: { usesReturnsPlatform: e.target.value } })}>
                  <option value="">Select…</option>
                  <option value="yes">Yes, we use a returns platform</option>
                  <option value="no">No, we handle returns ourselves</option>
                </select>
              </Field>
              {error && <p className="md:col-span-2 t-caption" style={{ color: 'var(--risk-critical-fg)' }}>{error}</p>}
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  onClick={saveProfileAndContinue}
                  loading={loading}
                >
                  {loading ? 'Saving…' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-4">
              {shopifyConnected ? (
                <div className="rounded-md border px-4 py-3" style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--neutral)' }}>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: 'var(--neutral)' }} />
                    <p className="text-body-sm font-semibold" style={{ color: 'var(--neutral)' }}>
                      Shopify connected — {shopifyShopDomain}
                    </p>
                  </div>
                  <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Orders, customers, and refund history are syncing automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border p-4 space-y-3" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    Enter your Shopify store domain to connect. You can also connect from{' '}
                    <Link href="/settings/integrations" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
                      Settings → Integrations
                    </Link>
                    {' '}at any time.
                  </p>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      value={shopDomain}
                      onChange={(e) => dispatch({ type: 'patch', patch: { shopDomain: e.target.value } })}
                      aria-label="Shopify store domain"
                      placeholder="your-store.myshopify.com"
                      className="h-8 w-full rounded-[var(--ua-radius-input)] border px-3 text-[12px] outline-none"
                      style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <a
                      href={`/api/shopify/install?shop=${encodeURIComponent(shopDomain.trim())}`}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--ua-radius-input)] border px-3 text-[11px] font-semibold"
                      style={{ borderColor: 'var(--accent)', color: 'var(--text-inverse)', background: 'var(--accent)', whiteSpace: 'nowrap' }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Connect Shopify
                    </a>
                  </div>
                </div>
              )}
              {shopifyConnected && (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => dispatch({ type: 'patch', patch: { activeStep: 2 } })}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              {helpdeskConnected ? (
                <div className="rounded-md border px-4 py-3" style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--neutral)' }}>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: 'var(--neutral)' }} />
                    <p className="text-body-sm font-semibold" style={{ color: 'var(--neutral)' }}>
                      {helpdeskProvider === 'zendesk'
                        ? 'Zendesk connected'
                        : helpdeskProvider === 'freshdesk'
                          ? 'Freshdesk connected'
                          : 'Gorgias connected'}
                    </p>
                  </div>
                  <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Agents will see claim context inside every support ticket automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border p-4 space-y-3" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                    Connect Gorgias from the integrations page. Once connected, Unauth will automatically add a claim context card to every Gorgias ticket — showing order history, prior claims, and trust indicators for the customer.
                  </p>
                  <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                    You can also add Zendesk or Freshdesk later from the same page.
                  </p>
                  <Link
                    href="/settings/integrations/gorgias"
                    className="inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-input)] px-3 text-[11px] font-semibold"
                    style={{ background: 'var(--accent)', borderColor: 'var(--accent)', border: '1px solid', color: 'var(--text-inverse)' }}
                  >
                    <Headphones className="h-4 w-4" />
                    Set up Gorgias integration
                  </Link>
                  <Link
                    href="/integrations"
                    className="inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-input)] border px-3 text-[11px] font-semibold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    Skip for now and choose another integration
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
              {helpdeskConnected && (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => dispatch({ type: 'patch', patch: { activeStep: 3 } })}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-md border px-4 py-3" style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--neutral)' }}>
                <p className="t-subhead" style={{ color: 'var(--neutral)' }}>Setup complete</p>
                <p className="text-body-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Your Gorgias agents will now see claim context automatically. You can review integration status and add more sources from Settings.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="btn-accent inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-input)] px-3 text-[11px] font-semibold"
                >
                  Go to claim overview
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/settings/integrations" className="t-caption hover:underline" style={{ color: 'var(--text-tertiary)' }}>
                  Manage integrations
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<any> }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      {cloneElement(children, {
        'aria-label': label,
        className: 'h-8 w-full rounded-[var(--ua-radius-input)] border px-3 text-[12px] outline-none',
        style: {
          background: 'var(--surface-sunken)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        },
      })}
    </label>
  );
}
