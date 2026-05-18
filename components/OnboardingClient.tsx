'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Play, CheckCircle, Check } from 'lucide-react';

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1, label: 'Welcome' },
  { num: 2, label: 'Your store' },
  { num: 3, label: 'First audit' },
] as const;

interface OnboardingClientProps {
  userId: string;
}

export default function OnboardingClient({ userId }: OnboardingClientProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 2 fields
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = createClient();

  // Lock body scroll while onboarding modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const progressPct = ((step - 1) / 2) * 100 + 33;

  async function saveAndContinue() {
    if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) return;
    setLoading(true);
    setError('');

    const { error: upsertError } = await supabase
      .from('merchants')
      .upsert(
        {
          user_id: userId,
          name: storeName.trim(),
          platform,
          monthly_order_volume: annualVolume,
          primary_fraud_concern: primaryConcern,
          setup_complete: true,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      setLoading(false);
      setError(upsertError.message);
      return;
    }

    // Persist setup_complete in auth user metadata so it survives
    // any application-table deletions (merchants row, etc.)
    await supabase.auth.updateUser({ data: { setup_complete: true } });

    setLoading(false);
    router.push('/upload?welcome=1');
    router.refresh();
  }

  return (
    /* ── Modal overlay ── */
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 50, background: 'rgba(10,14,23,0.55)' }}
      aria-modal="true"
      role="dialog"
      aria-label="Welcome to Unauth"
    >
      {/* ── Card ── */}
      <div
        className="w-full max-w-[520px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          maxHeight: 'calc(100vh - 48px)',
        }}
      >
        {/* ── Header: logo + step pills ── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" width="20" height="18" fill="none" aria-label="Unauth" role="img">
              <path d="M18 14 H32 V74 H68 V14 H82 V88 H18 Z" fill="var(--text-primary, var(--text))" />
              <polygon points="92,88 102,88 108,14 98,14" fill="#2563EB" />
              <rect x="42" y="96" width="16" height="3" fill="#2563EB" />
            </svg>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Unauth</span>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1">
            {STEPS.map(({ num, label }, i) => {
              const isActive = step === num;
              const isDone = step > num;
              return (
                <div key={num} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className="w-6 h-px mx-0.5" style={{ background: isDone ? 'var(--accent)' : 'var(--border-subtle)' }} />
                  )}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: isActive ? 'var(--accent)' : isDone ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-subtle, var(--bg-inset))',
                      color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      opacity: isDone ? 0.8 : 1,
                    }}
                  >
                    {isDone
                      ? <Check className="h-3 w-3" strokeWidth={3} />
                      : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{num}</span>
                    }
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="px-6 py-6 space-y-5 overflow-y-auto flex-1">

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                  Getting started
                </p>
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                  Welcome to Unauth
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Answer a few quick questions, then run your first audit in minutes.
                </p>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                {[
                  { n: '01', title: 'Upload orders', body: 'Export a CSV of your past orders and refunds from any platform.' },
                  { n: '02', title: 'Identify patterns', body: 'We surface customers operating multiple accounts or identities.' },
                  { n: '03', title: 'Defend chargebacks', body: 'Use evidence packages to respond to disputes with documented patterns.' },
                ].map(({ n, title, body }, i) => (
                  <div
                    key={n}
                    className="flex gap-4 px-5 py-4"
                    style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}
                  >
                    <span
                      className="text-xs font-bold tabular-nums shrink-0 mt-0.5"
                      style={{ color: 'var(--accent)', letterSpacing: '0.04em' }}
                    >
                      {n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{title}</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg px-4 py-3 text-sm leading-relaxed"
                style={{ background: 'var(--bg-subtle, var(--bg-inset))', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <strong style={{ color: 'var(--text)' }}>7-day response window.</strong> When a customer disputes a refund, your payment processor requires evidence within 7 days. Unauth generates that document automatically.
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Your store ── */}
          {step === 2 && (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                  Step 2 of 3
                </p>
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                  Your store
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Helps us configure Unauth for your platform.
                </p>
              </div>

              <div className="space-y-5">
                <Field label="Store name" tooltip="Used on your evidence packages and audit reports." required>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Acme Commerce Ltd"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </Field>

                <Field label="Platform" tooltip="Helps us suggest the right CSV export settings." required>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none appearance-none transition-colors"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: platform ? 'var(--text)' : 'var(--text-muted)',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378889C' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px',
                    }}
                  >
                    <option value="">Select platform…</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="magento">Magento</option>
                    <option value="bigcommerce">BigCommerce</option>
                    <option value="custom">Custom</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    We work with any platform. This just helps us show the right export instructions.
                  </p>
                </Field>

                <Field label="Annual order volume" tooltip="Helps us calibrate expectations for your first audit." required>
                  <select
                    value={annualVolume}
                    onChange={(e) => setAnnualVolume(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none appearance-none transition-colors"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: annualVolume ? 'var(--text)' : 'var(--text-muted)',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378889C' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px',
                    }}
                  >
                    <option value="">Select range…</option>
                    <option value="under_10k">Under 10,000</option>
                    <option value="10k_50k">10,000 – 50,000</option>
                    <option value="50k_250k">50,000 – 250,000</option>
                    <option value="over_250k">Over 250,000</option>
                  </select>
                </Field>

                <Field label="Primary concern" tooltip="Tailors which signals we surface first." required>
                  <select
                    value={primaryConcern}
                    onChange={(e) => setPrimaryConcern(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none appearance-none transition-colors"
                    style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border)',
                      color: primaryConcern ? 'var(--text)' : 'var(--text-muted)',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378889C' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px',
                    }}
                  >
                    <option value="">Select your main concern…</option>
                    <option value="refund_abuse">Refund abuse</option>
                    <option value="inr_claims">INR claims</option>
                    <option value="chargebacks">Chargebacks</option>
                    <option value="all">All of the above</option>
                  </select>
                </Field>
              </div>

              {error && (
                <p
                  className="text-xs px-3.5 py-2.5 rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--risk-critical) 10%, transparent)', color: 'var(--risk-critical)', border: '1px solid color-mix(in srgb, var(--risk-critical) 30%, transparent)' }}
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm underline underline-offset-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={saveAndContinue}
                  disabled={loading || !storeName.trim() || !platform || !annualVolume || !primaryConcern}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {loading ? 'Saving…' : 'Go to upload →'}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: First audit ── */}
          {step === 3 && (
            <>
              <div>
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-4"
                  style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)' }}
                >
                  <CheckCircle className="h-5 w-5" style={{ color: 'var(--success)' }} />
                </div>
                <h1 className="text-2xl font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                  You&apos;re all set
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Account configured. Choose how to run your first audit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Upload your CSV</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Export the last 90 days of orders. Most platforms take under 5 minutes.
                    </p>
                  </div>
                  <Link
                    href="/upload"
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Upload now
                  </Link>
                </div>

                <div
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-subtle, var(--bg-inset))', border: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
                  >
                    <Play className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>See a sample audit</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Explore a pre-loaded audit on synthetic data — no upload needed.
                    </p>
                  </div>
                  <Link
                    href="/demo"
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    View sample
                  </Link>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Start with your last 90 days of orders. Each upload enriches the engine&apos;s history of your customer base.
              </p>
            </>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div
          className="h-1 shrink-0 transition-all duration-500"
          style={{
            background: `linear-gradient(to right, var(--accent) ${progressPct}%, var(--border-subtle) 0%)`,
          }}
        />
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({
  label,
  tooltip,
  required,
  children,
}: {
  label: string;
  tooltip: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: 'var(--risk-critical)' }}>*</span>}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs underline underline-offset-2 transition-colors"
          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
        >
          Why we ask
        </button>
      </div>
      {open && (
        <div
          className="mb-2 px-3 py-2.5 rounded-lg text-xs leading-relaxed"
          style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
        >
          {tooltip}
        </div>
      )}
      {children}
    </div>
  );
}
