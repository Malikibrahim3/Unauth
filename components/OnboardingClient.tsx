'use client';

import { useEffect, useReducer, cloneElement, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ShoppingBag, Headphones, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import foundation from '@/app/(public)/landing/_components/foundation/foundation.module.css';
import { ORDER_VOLUME_OPTIONS, FRAUD_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';
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
  shopifyConnected?: boolean;
  shopifyShopDomain?: string;
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
  shopifyConnected = false,
  shopifyShopDomain = '',
}: OnboardingClientProps) {
  void userId;
  const [state, dispatch] = useReducer(
    onboardingReducer,
    {
      initialStoreName,
      initialPlatform,
      initialAnnualVolume,
      initialPrimaryConcern,
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
    loading,
    skipLoading,
    error,
    shopDomain,
  } = state;
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: 'patch', patch: { shopDomain: shopifyShopDomain } });
  }, [shopifyShopDomain]);

  async function saveProfileAndContinue() {
    dispatch({ type: 'patch', patch: { loading: true, error: '' } });
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: storeName.trim(),
        platform,
        monthlyOrderVolume: annualVolume,
        primaryFraudConcern: primaryConcern,
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

  async function skipOnboarding() {
    dispatch({ type: 'patch', patch: { skipLoading: true, error: '' } });
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: storeName.trim() || undefined,
        platform: platform || undefined,
        monthlyOrderVolume: annualVolume || undefined,
        primaryFraudConcern: primaryConcern || undefined,
        setupComplete: true,
      }),
    });
    await response.json().catch(() => ({}));
    dispatch({ type: 'patch', patch: { skipLoading: false } });
    router.push('/dashboard');
    router.refresh();
  }

  const current = STEPS[activeStep];
  const CurrentIcon = current.icon;

  return (
    <main className="min-h-screen p-4 md:p-10" style={{ background: 'var(--surface-base)' }}>
      <div className="mx-auto mb-8 max-w-6xl">
        <p className={foundation.landingSectionEyebrow}>Welcome to Unauth</p>
        <h1 className={foundation.landingSectionTitle} style={{ marginTop: '0.75rem' }}>
          Get set up
        </h1>
        <p className={foundation.landingSectionLead} style={{ marginTop: '0.75rem', maxWidth: '52ch' }}>
          A few quick steps to bring claim intelligence into every support ticket.
        </p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Sidebar checklist */}
        <aside
          className="rounded-md border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className={foundation.landingSectionEyebrow}>Checklist</p>
              <p className="t-caption mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Add claim intelligence to your Gorgias tickets
              </p>
            </div>
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={skipLoading || loading}
              className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}
            >
              {skipLoading ? 'Skipping…' : 'Skip'}
            </button>
          </div>

          <div className="space-y-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const active = index === activeStep;
              const done = index < activeStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => dispatch({ type: 'patch', patch: { activeStep: index } })}
                  className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-3 text-left transition-colors"
                  style={{
                    background: active ? 'var(--copper-glow)' : 'var(--surface-sunken)',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm" style={{ background: done ? 'var(--sev-clear-fill)' : 'var(--surface-sunken)', color: done ? 'var(--neutral)' : 'var(--text-tertiary)' }}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{step.label}</span>
                  </span>
                  <span className="t-mono" style={{ color: 'var(--text-tertiary)' }}>{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>

        </aside>

        {/* Step content */}
        <section className="rounded-md border p-7" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <CurrentIcon className="h-5 w-5" />
            </span>
            <div>
              <p className={foundation.landingSectionEyebrow}>Step {activeStep + 1} of {STEPS.length}</p>
              <h2 className={foundation.landingSubsectionTitle} style={{ marginTop: '0.4rem' }}>{current.label}</h2>
              <p className="text-body-sm mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>{current.body}</p>
            </div>
          </div>

          {activeStep === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
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
                  <option value="woocommerce">WooCommerce</option>
                  <option value="bigcommerce">BigCommerce</option>
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
              <Field label="Primary concern">
                <select aria-label="Primary concern" value={primaryConcern} onChange={(e) => dispatch({ type: 'patch', patch: { primaryConcern: e.target.value } })}>
                  <option value="">Select concern…</option>
                  {FRAUD_CONCERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              {error && <p className="md:col-span-2 t-caption" style={{ color: 'var(--risk-critical-fg)' }}>{error}</p>}
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  size="lg"
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
                      className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                      style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <a
                      href={`/api/shopify/install?shop=${encodeURIComponent(shopDomain.trim())}`}
                      className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold gap-1.5"
                      style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--copper-glow)', whiteSpace: 'nowrap' }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Connect Shopify
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'patch', patch: { activeStep: 2 } })}
                  className="t-caption hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {shopifyConnected ? 'Continue to Gorgias →' : "I'll connect later — skip to Gorgias"}
                </button>
                {shopifyConnected && (
                  <Button type="button" onClick={() => dispatch({ type: 'patch', patch: { activeStep: 2 } })}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-md border p-4 space-y-3" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                  Connect Gorgias from the integrations page. Once connected, Unauth will automatically add a claim context card to every Gorgias ticket — showing order history, prior claims, and trust indicators for the customer.
                </p>
                <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  You can also add Zendesk or Freshdesk later from the same page.
                </p>
                <Link
                  href="/settings/integrations/gorgias"
                  className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
                  style={{ background: 'var(--copper-glow)', borderColor: 'var(--accent)', border: '1px solid', color: 'var(--accent)' }}
                >
                  <Headphones className="h-4 w-4" />
                  Set up Gorgias integration
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'patch', patch: { activeStep: 3 } })}
                  className="t-caption hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {"I'll connect later — go to dashboard"}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'patch', patch: { activeStep: 3 } })}
                  className="t-caption font-semibold hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Already connected? Continue →
                </button>
              </div>
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
                  className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
                >
                  Go to claim overview
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/settings/integrations" className="t-caption hover:underline" style={{ color: 'var(--text-tertiary)' }}>
                  Manage integrations →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<any> }) {
  return (
    <label className="block">
      <span className="t-label mb-2 block" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      {cloneElement(children, {
        'aria-label': label,
        className: 'w-full rounded-md border px-3 py-2 text-sm outline-none',
        style: {
          background: 'var(--surface-sunken)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        },
      })}
    </label>
  );
}
