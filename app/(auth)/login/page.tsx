'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Check your email to confirm your account, then sign in.';
  return message;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--surface-base)' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const isSubmitDisabled =
    loading ||
    !email ||
    !password ||
    (isSignUp && (!storeName.trim() || !platform || !annualVolume || !primaryConcern));
  const isSuccess = error.includes('created') || error.includes('Check your email');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) {
        setError('Please fill in all store details.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            store_name: storeName.trim(),
            platform,
            monthly_order_volume: annualVolume,
            primary_fraud_concern: primaryConcern,
          },
        },
      });

      if (signUpError) {
        setError(formatAuthError(signUpError.message));
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Account created. Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setLoading(false);
        return;
      }

      const bootstrapRes = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          platform,
          monthlyOrderVolume: annualVolume,
          primaryFraudConcern: primaryConcern,
          setupComplete: false,
        }),
      });
      const bootstrapBody = await bootstrapRes.json().catch(() => ({}));
      setLoading(false);
      if (!bootstrapRes.ok) {
        setError(bootstrapBody.error ?? 'Could not prepare your account.');
        return;
      }
      router.push('/onboarding');
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(formatAuthError(signInError.message));
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8" style={{ background: 'var(--surface-base)' }}>
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-6 flex justify-center">
          <UnauthLogo variant="auto" size={28} />
        </Link>

        <section className="rounded-lg border p-8" style={{ background: 'var(--surface-raised)', borderColor: 'var(--surface-border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: 'var(--ink-primary)' }}
              />
            </div>

            <div>
              <label className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: 'var(--ink-primary)' }}
              />
            </div>

            {!isSignUp && (
              <div className="text-right">
                <Link href="/reset" className="t-caption hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
                  Forgot password?
                </Link>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--surface-border)' }}>
                <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>Store details</p>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  placeholder="Store name"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: 'var(--ink-primary)' }}
                />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: platform ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Select platform...</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="magento">Magento</option>
                  <option value="bigcommerce">BigCommerce</option>
                  <option value="custom">Custom</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={annualVolume}
                  onChange={(e) => setAnnualVolume(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: annualVolume ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Annual order volume...</option>
                  <option value="under_10k">Under 10,000</option>
                  <option value="10k_50k">10,000-50,000</option>
                  <option value="50k_250k">50,000-250,000</option>
                  <option value="over_250k">Over 250,000</option>
                </select>
                <select
                  value={primaryConcern}
                  onChange={(e) => setPrimaryConcern(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--surface-input)', borderColor: 'var(--surface-border)', color: primaryConcern ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Primary concern...</option>
                  <option value="refund_abuse">Refund abuse</option>
                  <option value="inr_claims">INR claims</option>
                  <option value="chargebacks">Chargebacks</option>
                  <option value="all">All of the above</option>
                </select>
              </div>
            )}

            {error && (
              <p
                className="t-caption rounded-sm border px-3 py-2"
                style={{
                  background: isSuccess ? 'var(--sev-clear-fill)' : 'var(--sev-definite-fill)',
                  borderColor: isSuccess ? 'var(--sev-clear)' : 'var(--sev-definite)',
                  color: isSuccess ? 'var(--sev-clear)' : 'var(--sev-definite)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="h-10 w-full rounded-md text-xs font-semibold uppercase tracking-[0.04em] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--copper-bright)', color: 'var(--ink-inverse)' }}
            >
              {loading ? 'Processing...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center t-caption" style={{ color: 'var(--ink-tertiary)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp((value) => !value); setError(''); }}
              className="font-semibold underline underline-offset-2"
              style={{ color: 'var(--copper-bright)' }}
            >
              {isSignUp ? 'Sign in' : 'Request access'}
            </button>
          </p>
          <p className="mt-4 text-center t-caption" style={{ color: 'var(--ink-tertiary)' }}>
            By signing in, you agree to use Unauth for authorised investigations only.
          </p>
        </section>
      </div>
    </main>
  );
}
