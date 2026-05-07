'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Play, CheckCircle } from 'lucide-react';

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

  async function saveAndContinue() {
    if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) return;
    setLoading(true);
    setError('');

    // Note: `platform` is captured in the form for analytics but not yet
    // a column on the merchants table — we omit it from the upsert to avoid
    // a "column does not exist" failure that previously left users without
    // a merchant row (and a 403 on /api/audit).
    const { error: upsertError } = await supabase
      .from('merchants')
      .upsert(
        {
          user_id: userId,
          name: storeName.trim(),
          monthly_order_volume: annualVolume,
          primary_fraud_concern: primaryConcern,
          setup_complete: true,
        },
        { onConflict: 'user_id' }
      );

    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.push('/upload?welcome=1');
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-canvas)', color: 'var(--text)' }}
    >
      {/* Left sidebar */}
      <aside
        className="hidden md:flex flex-col gap-2 px-6 py-10 w-56 shrink-0"
        style={{ borderRight: '1px solid var(--border-subtle)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Start here
        </p>
        {STEPS.map(({ num, label }) => {
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div
              key={num}
              className="flex items-center gap-2.5 text-sm"
              style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)' }}
            >
              {isDone ? (
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
              ) : (
                <span
                  className="h-4 w-4 rounded-full border shrink-0 flex items-center justify-center text-xs"
                  style={{
                    borderColor: isActive ? 'var(--text)' : 'var(--border)',
                    background: isActive ? 'var(--text)' : 'transparent',
                    color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {num}
                </span>
              )}
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
            </div>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div
          className="w-full max-w-lg rounded-xl p-8 space-y-6"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <>
              <div>
                <h1
                  className="font-semibold"
                  style={{ fontSize: '24px', lineHeight: '1.3', color: 'var(--text)' }}
                >
                  Welcome to Unauth
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Answer four quick questions, then run your first audit.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  'Upload a CSV of your past orders and refunds.',
                  'We identify which customers appear to be operating multiple accounts.',
                  'Use the results to defend chargebacks and document refund abuse patterns.',
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span
                      className="mt-0.5 h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              {/* Callout */}
              <div
                className="rounded-lg p-4 text-sm leading-relaxed"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <p>
                  When a customer disputes a refund refusal, your payment processor gives you{' '}
                  <strong style={{ color: 'var(--text)' }}>7 days to respond.</strong> Unauth
                  generates an evidence document showing the customer&apos;s order and identity
                  pattern &mdash; giving you a stronger case than delivery confirmation alone.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold"
                  style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
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
                <h1 className="font-semibold" style={{ fontSize: '24px', color: 'var(--text)' }}>
                  Your store
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Helps us configure Unauth for your platform.
                </p>
              </div>

              <div className="space-y-4">
                {/* Store name */}
                <Field
                  label="Store name"
                  tooltip="Used on your evidence packages and audit reports."
                  required
                >
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Acme Commerce Ltd"
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </Field>

                {/* Platform */}
                <Field
                  label="Platform"
                  tooltip="Helps us suggest the right CSV export settings."
                  required
                >
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Select platform…</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="magento">Magento</option>
                    <option value="bigcommerce">BigCommerce</option>
                    <option value="custom">Custom</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--text-subtle)' }}>
                    We work with any platform. This just helps us show you the right export instructions.
                  </p>
                </Field>

                {/* Annual order volume */}
                <Field
                  label="Annual order volume"
                  tooltip="Helps us calibrate expectations for your first audit."
                  required
                >
                  <select
                    value={annualVolume}
                    onChange={(e) => setAnnualVolume(e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Select range…</option>
                    <option value="under_10k">Under 10,000</option>
                    <option value="10k_50k">10,000–50,000</option>
                    <option value="50k_250k">50,000–250,000</option>
                    <option value="over_250k">Over 250,000</option>
                  </select>
                </Field>

                {/* Primary concern */}
                <Field
                  label="Primary concern"
                  tooltip="Tailors which signals we surface first."
                  required
                >
                  <select
                    value={primaryConcern}
                    onChange={(e) => setPrimaryConcern(e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
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
                <p className="text-sm" style={{ color: 'var(--risk-critical)' }}>{error}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm underline underline-offset-2"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={saveAndContinue}
                  disabled={loading || !storeName.trim() || !platform || !annualVolume || !primaryConcern}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                <h1 className="font-semibold" style={{ fontSize: '24px', color: 'var(--text)' }}>
                  Run your first audit
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Your account is set up. Choose how to get started.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Card 1 — Upload */}
                <div
                  className="rounded-lg p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <Upload className="h-6 w-6" style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Upload your CSV</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Export your last 90 days of orders. Most platforms can do this in under 5 minutes.
                    </p>
                  </div>
                  <Link
                    href="/upload"
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Upload now
                  </Link>
                </div>

                {/* Card 2 — Demo */}
                <div
                  className="rounded-lg p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <Play className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>See a sample audit</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Explore a pre-loaded audit on synthetic data — no upload needed.
                    </p>
                  </div>
                  <Link
                    href="/demo"
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    View sample
                  </Link>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                Most merchants start with their last 90 days of orders. Each upload makes the next
                more valuable as the engine builds a history of this customer base.
              </p>
            </>
          )}
        </div>
      </main>
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
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          {label} {required && <span style={{ color: 'var(--risk-critical)' }}>*</span>}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs underline underline-offset-2"
          style={{ color: 'var(--text-subtle)' }}
        >
          Why we ask
        </button>
      </div>
      {open && (
        <div
          className="mb-2 px-3 py-2 rounded text-xs leading-relaxed"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
        >
          {tooltip}
        </div>
      )}
      {children}
    </div>
  );
}
