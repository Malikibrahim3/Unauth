'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block t-label text-[var(--ink-tertiary)]">{label}</span>
      {children}
    </label>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface-base)]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      if (!storeName.trim() || !platform || !annualVolume || !primaryConcern) {
        setError('Please fill in all company details.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { store_name: storeName.trim(), platform, monthly_order_volume: annualVolume, primary_fraud_concern: primaryConcern } },
      });

      if (signUpError) {
        setError(signUpError.message);
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
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] lg:grid lg:grid-cols-2">
      <section className="hidden border-r border-[var(--surface-border)] lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div>
          <Link href="/" className="inline-flex items-center">
            <UnauthLogo variant="dark" size={128} />
          </Link>
          <div className="mt-10 max-w-md">
            <p className="t-label text-[var(--ink-tertiary)]">PILOT ACCESS</p>
            <h1 className="mt-3 t-display">Unauth.</h1>
            <p className="mt-4 t-subhead text-[var(--ink-secondary)]">Instrument-grade fraud review for merchant teams.</p>
          </div>
        </div>
        <div className="t-caption text-[var(--ink-tertiary)]">Secure sign-in for merchant accounts.</div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <UnauthLogo variant="dark" size={28} />
            </Link>
          </div>

          <div className="espresso-panel p-6 lg:p-8">
            <div className="mb-6">
              <p className="t-label text-[var(--ink-tertiary)]">{isSignUp ? 'REQUEST ACCESS' : 'SIGN IN'}</p>
              <h2 className="mt-2 t-heading">{isSignUp ? 'Create your merchant account' : 'Sign in to your account'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email address">
                <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </Field>
              <Field label="Password">
                <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </Field>

              {isSignUp && (
                <>
                  <Field label="Company name">
                    <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="ASOS Demo Merchant" required />
                  </Field>
                  <Field label="Platform">
                    <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Shopify, Magento, custom..." required />
                  </Field>
                  <Field label="Annual volume">
                    <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" value={annualVolume} onChange={(e) => setAnnualVolume(e.target.value)} placeholder="100000" required />
                  </Field>
                  <Field label="Primary concern">
                    <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" value={primaryConcern} onChange={(e) => setPrimaryConcern(e.target.value)} placeholder="Refund fraud" required />
                  </Field>
                </>
              )}

              {error && <p className="t-body text-[var(--sev-probable)]">{error}</p>}

              <button type="submit" disabled={loading || !email || !password || (isSignUp && (!storeName || !platform || !annualVolume || !primaryConcern))} className="w-full rounded-sm bg-[var(--copper-bright)] px-4 py-3 t-label text-[var(--ink-inverse)] disabled:opacity-50">
                {loading ? 'Working...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-[var(--ink-tertiary)]">
              <Link href="/reset" className="t-caption hover:text-[var(--ink-primary)]">Forgot password?</Link>
              <button type="button" onClick={() => setIsSignUp((v) => !v)} className="t-caption hover:text-[var(--ink-primary)]">
                {isSignUp ? 'Back to sign in' : 'Need an account?'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
