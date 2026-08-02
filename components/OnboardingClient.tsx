'use client';

import { useEffect, useReducer, cloneElement, type CSSProperties, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ShoppingBag, Headphones, Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { ORDER_VOLUME_OPTIONS, LOSS_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';
import {
  createInitialOnboardingState,
  onboardingReducer,
  type OnboardingProfileField,
  type OnboardingState,
} from '@/components/Onboarding/onboardingReducer';

interface OnboardingClientProps {
  userId: string;
  initialStoreName?: string;
  initialPlatform?: string;
  initialAnnualVolume?: string;
  initialPrimaryConcern?: string;
  initialUsesWms3pl?: string;
  initialUsesReturnsPlatform?: string;
  initialProfileComplete?: boolean;
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
    body: 'Connect Shopify so Unauth can ingest order, customer, fulfilment, and refund evidence.',
  },
  {
    id: 'helpdesk',
    label: 'Connect helpdesk',
    icon: Headphones,
    body: 'Connect one supported helpdesk so agents can open the read-only claim context widget from their support workflow.',
  },
  {
    id: 'done',
    label: 'Setup verified',
    icon: Check,
    body: 'Your selected commerce and support connections have been verified. Integration health remains visible in Settings.',
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
  initialProfileComplete = false,
  shopifyConnected = false,
  shopifyShopDomain = '',
  helpdeskConnected = false,
  helpdeskProvider = null,
}: OnboardingClientProps) {
  void userId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(
    onboardingReducer,
    {
      initialStoreName,
      initialPlatform,
      initialAnnualVolume,
      initialPrimaryConcern,
      initialUsesWms3pl,
      initialUsesReturnsPlatform,
      profileComplete: initialProfileComplete,
      shopifyConnected,
      helpdeskConnected,
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
    fieldErrors,
    shopDomain,
  } = state;

  const oauthError = searchParams.get('shopify_error');
  const connectionError = oauthError
    ? 'Shopify could not be connected. Check the store domain and try again.'
    : '';

  useEffect(() => {
    dispatch({ type: 'patch', patch: { shopDomain: shopifyShopDomain } });
  }, [shopifyShopDomain]);

  useEffect(() => {
    function handleShopifyOAuth(event: MessageEvent) {
      if (
        event.origin === window.location.origin
        && event.data
        && typeof event.data === 'object'
        && event.data.type === 'shopify_oauth_complete'
      ) {
        router.refresh();
      }
    }

    window.addEventListener('message', handleShopifyOAuth);
    return () => window.removeEventListener('message', handleShopifyOAuth);
  }, [router]);

  const maxReachableStep =
    activeStep === 3
      ? 3
      : !state.profileSaved
        ? 0
        : !shopifyConnected
          ? 1
          : 2;

  const completedStepCount =
    activeStep === 3
      ? STEPS.length
      : Number(state.profileSaved) + Number(shopifyConnected) + Number(helpdeskConnected);

  function setProfileField(field: OnboardingProfileField, value: string) {
    dispatch({
      type: 'patch',
      patch: {
        [field]: value,
        error: '',
        fieldErrors: { ...fieldErrors, [field]: undefined },
      },
    });
  }

  async function saveProfileAndContinue() {
    const nextFieldErrors: OnboardingState['fieldErrors'] = {};
    if (!storeName.trim()) nextFieldErrors.storeName = 'Enter your store name.';
    if (!platform) nextFieldErrors.platform = 'Choose your platform.';
    if (!annualVolume) nextFieldErrors.annualVolume = 'Choose a monthly order volume.';
    if (!primaryConcern) nextFieldErrors.primaryConcern = 'Choose a primary concern.';
    if (Object.keys(nextFieldErrors).length > 0) {
      dispatch({
        type: 'patch',
        patch: {
          fieldErrors: nextFieldErrors,
          error: 'Review the highlighted fields before continuing.',
        },
      });
      return;
    }
    dispatch({ type: 'patch', patch: { loading: true, error: '', fieldErrors: {} } });
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
        profileComplete: true,
        setupComplete: false,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    dispatch({ type: 'patch', patch: { loading: false } });
    if (!response.ok) {
      dispatch({ type: 'patch', patch: { error: payload.error ?? 'Could not save your store details.' } });
      return;
    }
    dispatch({ type: 'patch', patch: { activeStep: 1, profileSaved: true } });
    router.refresh();
  }

  async function completeSetup() {
    dispatch({ type: 'patch', patch: { loading: true, error: '' } });
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupComplete: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.setupComplete !== true) {
      dispatch({
        type: 'patch',
        patch: {
          loading: false,
          error: payload.error ?? 'Could not verify the selected connections.',
        },
      });
      return;
    }
    dispatch({ type: 'patch', patch: { activeStep: 3, loading: false } });
    router.refresh();
  }

  const current = STEPS[activeStep];
  const CurrentIcon = current.icon;

  return (
    <main className="min-h-screen" style={{ background: 'var(--ua-canvas)' }}>
      <header className="flex h-12 items-center justify-between border-b border-[var(--ua-border-subtle)] bg-[var(--ua-shell)] px-4 sm:px-5">
        <UnauthLogo kind="lockup" tone="auto" height={20} alt="Unauth" />
        <span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Workspace setup</span>
      </header>
      <div className="mx-auto max-w-[980px] px-4 pb-10 pt-7 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-8 tracking-tight text-[var(--ua-text-primary)]">
          Get set up
        </h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-5 text-[var(--ua-text-secondary)]">
          Save your store profile, connect your evidence source, and verify a supported helpdesk.
        </p>
        <span
          className="sr-only"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-valuenow={completedStepCount}
          aria-valuetext={`${completedStepCount} of ${STEPS.length} steps complete`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[216px_minmax(0,1fr)]">
        {/* Sidebar checklist */}
        <aside className="lg:pt-1">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Checklist</p>
              <p className="mt-1 text-xs leading-4" style={{ color: 'var(--ua-text-tertiary)' }}>
                Verify the connections used by your team
              </p>
            </div>
          </div>

          <div className="space-y-1">
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
                  className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--ua-radius-control)] border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: active ? 'var(--ua-accent-50)' : 'transparent',
                    borderColor: active ? 'var(--ua-accent-200)' : 'transparent',
                  }}
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--ua-radius-control)]" style={{ background: done ? 'var(--ua-confidence-high-bg)' : active ? 'var(--ua-accent-100)' : 'var(--ua-surface-muted)', color: done ? 'var(--ua-neutral)' : active ? 'var(--ua-accent-700)' : 'var(--ua-text-tertiary)' }}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[length:var(--ua-text-metadata-size)] font-medium" style={{ color: active ? 'var(--ua-text-primary)' : 'var(--ua-text-secondary)' }}>{step.label}</span>
                  </span>
                  <span className="font-sans text-xs tabular-nums" style={{ color: 'var(--ua-text-tertiary)' }}>{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>

        </aside>

        {/* Step content */}
        <section className="min-h-[480px] rounded-[var(--ua-radius-surface)] border p-5 sm:p-7" style={{ background: 'var(--ua-surface-primary)', borderColor: 'var(--ua-border-default)' }}>
          <div className="mb-6 flex items-start gap-3 border-b border-[var(--ua-border-subtle)] pb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-control)]" style={{ background: 'var(--ua-surface-selected)', color: 'var(--ua-action-primary)' }}>
              <CurrentIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[length:var(--ua-text-dense-size)] font-semibold text-[var(--ua-text-primary)]">{current.label}</h2>
              <p className="mt-1 max-w-2xl text-[length:var(--ua-text-dense-size)] leading-[var(--ua-text-dense-leading)]" style={{ color: 'var(--ua-text-secondary)' }}>{current.body}</p>
            </div>
          </div>

          {activeStep === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Store name" error={fieldErrors.storeName}>
                <input
                  id="onboarding-store-name"
                  aria-label="Store name"
                  value={storeName}
                  onChange={(e) => setProfileField('storeName', e.target.value)}
                  placeholder="Acme Commerce Ltd"
                />
              </Field>
              <Field label="Platform" error={fieldErrors.platform}>
                <select aria-label="Platform" value={platform} onChange={(e) => setProfileField('platform', e.target.value)}>
                  <option value="">Select platform…</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce" disabled>WooCommerce (coming soon)</option>
                  <option value="bigcommerce" disabled>BigCommerce (coming soon)</option>
                  <option value="magento">Magento</option>
                  <option value="custom">Custom</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Monthly order volume" error={fieldErrors.annualVolume}>
                <select aria-label="Monthly order volume" value={annualVolume} onChange={(e) => setProfileField('annualVolume', e.target.value)}>
                  <option value="">Select range…</option>
                  {ORDER_VOLUME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Primary post-purchase loss concern" error={fieldErrors.primaryConcern}>
                <select aria-label="Primary concern" value={primaryConcern} onChange={(e) => setProfileField('primaryConcern', e.target.value)}>
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
              <OnboardingError>{error}</OnboardingError>
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
              <OnboardingError>{connectionError}</OnboardingError>
              {shopifyConnected ? (
                <div className="rounded-[var(--ua-radius-surface)] border px-4 py-3" style={{ background: 'var(--ua-confidence-high-bg)', borderColor: 'var(--ua-neutral)' }}>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ua-neutral)' }} />
                    <p className="text-body-sm font-semibold" style={{ color: 'var(--ua-neutral)' }}>
                      Shopify connected — {shopifyShopDomain}
                    </p>
                  </div>
                  <p className="text-xs leading-4 mt-1" style={{ color: 'var(--ua-text-secondary)' }}>
                    Orders, customers, and refund history are syncing automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-[var(--ua-radius-surface)] border p-4 space-y-3" style={{ background: 'var(--ua-surface-muted)', borderColor: 'var(--ua-border-default)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--ua-text-secondary)' }}>
                    Enter your Shopify store domain to connect. You can also connect from{' '}
                    <Link href="/settings/integrations" className="underline underline-offset-2" style={{ color: 'var(--ua-action-primary)' }}>
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
                      className="h-9 w-full rounded-[var(--ua-radius-control)] border px-3 text-sm outline-none"
                      style={{ background: 'var(--ua-surface-primary)', borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
                    />
                    <a
                      href={`/api/shopify/install?shop=${encodeURIComponent(shopDomain.trim())}&returnTo=${encodeURIComponent('/onboarding')}`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--ua-radius-control)] border px-3 text-xs font-semibold"
                      style={{ borderColor: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)', background: 'var(--ua-action-primary)', whiteSpace: 'nowrap' }}
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
                <div className="rounded-[var(--ua-radius-surface)] border px-4 py-3" style={{ background: 'var(--ua-confidence-high-bg)', borderColor: 'var(--ua-neutral)' }}>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" style={{ color: 'var(--ua-neutral)' }} />
                    <p className="text-body-sm font-semibold" style={{ color: 'var(--ua-neutral)' }}>
                      {helpdeskProvider === 'zendesk'
                        ? 'Zendesk connected'
                        : helpdeskProvider === 'freshdesk'
                          ? 'Freshdesk connected'
                          : 'Gorgias connected'}
                    </p>
                  </div>
                  <p className="text-xs leading-4 mt-1" style={{ color: 'var(--ua-text-secondary)' }}>
                    The helpdesk connection is available for the read-only claim context workflow.
                  </p>
                </div>
              ) : (
                <div className="rounded-[var(--ua-radius-surface)] border p-4 space-y-3" style={{ background: 'var(--ua-surface-muted)', borderColor: 'var(--ua-border-default)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--ua-text-secondary)' }}>
                    Connect Gorgias from its integration settings, or choose another supported helpdesk from Integrations.
                  </p>
                  <p className="text-xs leading-4" style={{ color: 'var(--ua-text-tertiary)' }}>
                    You can also add Zendesk or Freshdesk later from the same page.
                  </p>
                  <Link
                    href="/settings/integrations/gorgias?returnTo=%2Fonboarding"
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--ua-radius-control)] px-3 text-xs font-semibold"
                    style={{ background: 'var(--ua-action-primary)', borderColor: 'var(--ua-action-primary)', border: '1px solid', color: 'var(--ua-text-inverse)' }}
                  >
                    <Headphones className="h-4 w-4" />
                    Set up Gorgias integration
                  </Link>
                  <Link
                    href="/integrations"
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--ua-radius-control)] border px-3 text-xs font-semibold"
                    style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
                  >
                    Skip for now and choose another integration
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
              {helpdeskConnected && (
                <div className="flex justify-end">
                  <Button type="button" onClick={completeSetup} loading={loading}>
                    {loading ? 'Verifying…' : 'Verify and complete'} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
              <OnboardingError>{error}</OnboardingError>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-[var(--ua-radius-surface)] border px-4 py-3" style={{ background: 'var(--ua-confidence-high-bg)', borderColor: 'var(--ua-neutral)' }}>
                <p className="text-[length:var(--ua-text-section-title-size)] font-semibold leading-5" style={{ color: 'var(--ua-neutral)' }}>Setup complete</p>
                <p className="text-body-sm mt-1" style={{ color: 'var(--ua-text-secondary)' }}>
                  Shopify and your selected helpdesk are connected. Review connection health and configure any provider-specific widget placement from Settings.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ButtonLink href="/dashboard" size="md">
                  Go to claim overview
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <Link href="/settings/integrations" className="text-xs leading-4 hover:underline" style={{ color: 'var(--ua-text-tertiary)' }}>
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

type FieldControlProps = {
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

function Field({ label, error, children }: { label: string; error?: string; children: ReactElement<FieldControlProps> }) {
  const errorId = `onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-error`;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[length:var(--ua-text-dense-size)] font-medium leading-[var(--ua-text-dense-leading)]" style={{ color: 'var(--ua-text-tertiary)' }}>{label}</span>
      {cloneElement(children, {
        'aria-label': label,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
        className: 'h-9 w-full rounded-[var(--ua-radius-control)] border px-3 text-sm outline-none',
        style: {
          background: 'var(--ua-surface-primary)',
          borderColor: 'var(--ua-border-default)',
          color: 'var(--ua-text-primary)',
        },
      })}
      <span id={errorId} aria-hidden={error ? undefined : true} className="mt-1 block min-h-4 text-xs leading-4" style={{ color: 'var(--ua-risk-critical)' }}>
        {error ?? '\u00a0'}
      </span>
    </label>
  );
}

function OnboardingError({ children }: { children: string }) {
  return (
    <p className="min-h-4 text-xs leading-4 text-[var(--ua-risk-critical)] md:col-span-2" role={children ? 'alert' : undefined} aria-live="polite" aria-atomic="true" aria-hidden={children ? undefined : true}>
      {children || '\u00a0'}
    </p>
  );
}
