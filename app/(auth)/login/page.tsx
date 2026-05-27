'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ORDER_VOLUME_OPTIONS, FRAUD_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Check your email to confirm your account, then sign in.';
  return message;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--landing-bg, #F8F5EE)' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');
  const [isSignUp, setIsSignUp] = useState(() => searchParams.get('signup') === '1');
  const nextPath = !requestedNextPath || requestedNextPath === '/dashboard' ? '/upload' : requestedNextPath;
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8" style={{ background: 'var(--landing-bg, #F8F5EE)' }}>
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-6 flex justify-center">
          <UnauthLogo variant="auto" size={28} />
        </Link>

        <section className="rounded-md border p-8" style={{ background: '#FFFFFF', borderColor: 'var(--landing-border, #D8D0BD)', boxShadow: '0 2px 4px rgba(26,24,20,0.04), 0 12px 28px rgba(26,24,20,0.08)' }}>
          <h1 className="t-heading mb-1" style={{ color: 'var(--ink-primary)' }}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </h1>
          <p className="t-caption mb-5" style={{ color: 'var(--ink-tertiary)' }}>
            {isSignUp ? 'Set up your fraud-ops workspace' : 'Access your merchant fraud-ops console'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Email address</label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={isSignUp ? 'you@yourstore.com' : 'you@company.com'}
              />
              {isSignUp && (
                <p className="mt-1 t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                  Use your work email to verify your store — personal email addresses are not accepted.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Password</label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
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
                <label htmlFor="signup-store-name" className="sr-only">Store name</label>
                <Input
                  id="signup-store-name"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  placeholder="Store name"
                />
                <label htmlFor="signup-platform" className="t-label block" style={{ color: 'var(--ink-tertiary)' }}>Platform</label>
                <select
                  id="signup-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm outline-none focus:border-[var(--copper-bright)]"
                  style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', color: platform ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Select platform...</option>
                  <option value="shopify">Shopify</option>
                  <option value="woocommerce">WooCommerce</option>
                  <option value="magento">Magento</option>
                  <option value="bigcommerce">BigCommerce</option>
                  <option value="custom">Custom</option>
                  <option value="other">Other</option>
                </select>
                <label htmlFor="signup-volume" className="t-label block" style={{ color: 'var(--ink-tertiary)' }}>Annual order volume</label>
                <select
                  id="signup-volume"
                  value={annualVolume}
                  onChange={(e) => setAnnualVolume(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm outline-none focus:border-[var(--copper-bright)]"
                  style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', color: annualVolume ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Annual order volume...</option>
                  {ORDER_VOLUME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <label htmlFor="signup-concern" className="t-label block" style={{ color: 'var(--ink-tertiary)' }}>Primary concern</label>
                <select
                  id="signup-concern"
                  value={primaryConcern}
                  onChange={(e) => setPrimaryConcern(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm outline-none focus:border-[var(--copper-bright)]"
                  style={{ background: 'var(--surface-input)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', color: primaryConcern ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}
                >
                  <option value="">Primary concern...</option>
                  {FRAUD_CONCERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
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

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitDisabled}
              loading={loading}
              className="w-full"
            >
              {loading ? 'Processing…' : isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center t-caption" style={{ color: 'var(--ink-tertiary)' }}>
            {isSignUp ? 'Already have an account?' : "New here?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp((value) => !value); setError(''); }}
              className="font-semibold underline underline-offset-2"
              style={{ color: 'var(--copper-bright)' }}
            >
              {isSignUp ? 'Sign in' : 'Create account'}
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
