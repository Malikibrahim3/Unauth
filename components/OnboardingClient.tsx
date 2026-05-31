'use client';

import { useState } from 'react';
import { cloneElement, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Upload, Users, FileText, Plug, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ORDER_VOLUME_OPTIONS, FRAUD_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';

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
    id: 'upload',
    label: 'Upload your first audit',
    icon: Upload,
    body: 'When you upload an order CSV, Unauth maps your order, refund, payment, and identity columns into a privacy-safe audit run.',
  },
  {
    id: 'review',
    label: 'Review matched customers',
    icon: Users,
    body: 'Work the queue by confidence grade, order value, and network footprint rather than scanning every transaction manually.',
  },
  {
    id: 'evidence',
    label: 'Generate an evidence package',
    icon: FileText,
    body: 'Identity evidence exports assemble cross-merchant match data, transaction history, and confidence signals into a report your team can use for dispute review.',
  },
  {
    id: 'integration',
    label: 'Set up chargeback integration',
    icon: Plug,
    optional: true,
    body: 'Later, connect chargeback and payment data to enrich signals with dispute outcomes and PSP-level identifiers.',
  },
  {
    id: 'team',
    label: 'Invite a team member',
    icon: UserPlus,
    optional: true,
    body: 'Invite analysts once your first audit is running so they can look up customers and export evidence for your helpdesk.',
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
  const [activeStep, setActiveStep] = useState(0);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [platform, setPlatform] = useState(initialPlatform);
  const [annualVolume, setAnnualVolume] = useState(initialAnnualVolume);
  const [primaryConcern, setPrimaryConcern] = useState(initialPrimaryConcern);
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [error, setError] = useState('');
  const [shopDomain, setShopDomain] = useState(shopifyShopDomain);
  const router = useRouter();

  async function saveAndContinue() {
    // Store profile fields are optional — never block reaching first value.
    setLoading(true);
    setError('');
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
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? 'Could not save your store details.');
      return;
    }
    router.push('/upload?welcome=1');
    router.refresh();
  }

  async function skipOnboarding() {
    setSkipLoading(true);
    setError('');
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: storeName.trim() || undefined,
        platform: platform || undefined,
        monthlyOrderVolume: annualVolume || undefined,
        primaryFraudConcern: primaryConcern || undefined,
        setupComplete: false,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSkipLoading(false);
    if (!response.ok) {
      setError(payload.error ?? 'Could not skip setup right now. Please try again.');
      return;
    }
    router.push('/upload?welcome=1');
    router.refresh();
  }

  const current = STEPS[activeStep];
  const CurrentIcon = current.icon;
  const canStart = true;

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: 'var(--surface-base)' }}>
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg border p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
          <div className="mb-6 flex items-start justify-between gap-3">
            <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>First-run checklist</h1>
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={skipLoading || loading}
              className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ color: 'var(--ink-secondary)', borderColor: 'var(--surface-border)', background: 'var(--surface-input)' }}
            >
              {skipLoading ? 'Skipping…' : 'Skip'}
            </button>
          </div>
          <div className="mb-6">
            <p className="t-body mt-2" style={{ color: 'var(--ink-secondary)' }}>
              Complete the first audit path, then add integrations and team access when you are ready.
            </p>
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
                  onClick={() => setActiveStep(index)}
                  className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors"
                  style={{
                    background: active ? 'var(--copper-glow)' : 'var(--surface-input)',
                    borderColor: active ? 'var(--copper-bright)' : 'var(--surface-border)',
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-sm" style={{ background: done ? 'var(--sev-clear-fill)' : 'var(--surface-muted)', color: done ? 'var(--sev-clear)' : 'var(--ink-tertiary)' }}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block t-body" style={{ color: active ? 'var(--ink-primary)' : 'var(--ink-secondary)' }}>{step.label}</span>
                    {'optional' in step && step.optional && <span className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>Optional</span>}
                  </span>
                  <span className="t-mono" style={{ color: 'var(--ink-tertiary)' }}>{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-lg border p-6" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--surface-input)', color: 'var(--copper-bright)' }}>
              <CurrentIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>STEP {activeStep + 1}</p>
              <h2 className="t-heading mt-1" style={{ color: 'var(--ink-primary)' }}>{current.label}</h2>
              <p className="t-body mt-2 max-w-2xl" style={{ color: 'var(--ink-secondary)' }}>{current.body}</p>
            </div>
          </div>

          {activeStep === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Store name">
                <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Acme Commerce Ltd" />
              </Field>
              <Field label="Platform">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="">Select platform...</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="magento">Magento</option>
                  <option value="bigcommerce">BigCommerce</option>
                  <option value="custom">Custom</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Annual order volume">
                <select value={annualVolume} onChange={(e) => setAnnualVolume(e.target.value)}>
                  <option value="">Select range...</option>
                  {ORDER_VOLUME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Primary concern">
                <select value={primaryConcern} onChange={(e) => setPrimaryConcern(e.target.value)}>
                  <option value="">Select concern...</option>
                  {FRAUD_CONCERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2 rounded-md border px-4 py-3" style={{ background: 'var(--privacy-fill)', borderColor: 'var(--privacy-border)' }}>
                <p className="t-body" style={{ color: 'var(--privacy-ink)' }}>
                  When you upload an order CSV, raw records stay scoped to your store. Cross-store comparison uses hashed identifiers only — other merchants never see your customer list.
                </p>
              </div>
              {error && <p className="md:col-span-2 t-caption" style={{ color: 'var(--sev-definite)' }}>{error}</p>}
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  size="lg"
                  onClick={saveAndContinue}
                  disabled={!canStart}
                  loading={loading}
                >
                  {loading ? 'Saving…' : 'Upload first audit'}
                </Button>
              </div>
            </div>
          ) : activeStep === 4 ? (
            <div className="rounded-md border px-4 py-3" style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--sev-clear)' }}>
              <p className="t-subhead" style={{ color: 'var(--sev-clear)' }}>Setup complete</p>
              <Link href="/dashboard" className="t-body mt-2 inline-block underline underline-offset-2" style={{ color: 'var(--ink-primary)' }}>
                Go to dashboard
              </Link>
            </div>
          ) : (
            <div className="rounded-md border px-4 py-3" style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)' }}>
              {activeStep === 3 ? (
                <div className="space-y-3">
                  <p className="t-body" style={{ color: 'var(--ink-secondary)' }}>
                    {shopifyConnected
                      ? `Shopify is connected (${shopifyShopDomain}). You can reconnect any time from settings.`
                      : 'Connect Shopify now to sync orders/customers and keep identity signals up to date via webhooks.'}
                  </p>
                  {!shopifyConnected && (
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        value={shopDomain}
                        onChange={(e) => setShopDomain(e.target.value)}
                        placeholder="your-store.myshopify.com"
                        className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                        style={{
                          background: 'var(--surface-input)',
                          borderColor: 'var(--surface-border)',
                          color: 'var(--ink-primary)',
                        }}
                      />
                      <a
                        href={`/api/shopify/install?shop=${encodeURIComponent(shopDomain.trim())}`}
                        className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: 'var(--surface-border)', color: 'var(--ink-primary)' }}
                      >
                        Connect Shopify
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="t-body" style={{ color: 'var(--ink-secondary)' }}>
                  This step becomes available after your first audit creates the initial case queue and evidence candidates.
                </p>
              )}
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
      <span className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>{label}</span>
      {cloneElement(children, {
        className: 'w-full rounded-md border px-3 py-2 text-sm outline-none',
        style: {
          background: 'var(--surface-input)',
          borderColor: 'var(--surface-border)',
          color: 'var(--ink-primary)',
        },
      })}
    </label>
  );
}
