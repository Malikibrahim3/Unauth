'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Onboarding fields for sign-up
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');

  const supabase = createClient();
  const router = useRouter();

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
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Try to sign in immediately (auto-confirm may be on)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Email confirmation required — store data for later
        localStorage.setItem('pendingMerchant', JSON.stringify({
          storeName, platform, annualVolume, primaryConcern
        }));
        setError('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setLoading(false);
        return;
      }

      // Create merchant record
      const { error: merchantError } = await supabase.from('merchants').insert({
        user_id: signInData.user!.id,
        name: storeName.trim(),
        monthly_order_volume: annualVolume,
        primary_fraud_concern: primaryConcern,
        setup_complete: true,
      });

      setLoading(false);
      if (merchantError) {
        setError(merchantError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Check for pending merchant data (from interrupted sign-up)
      const pending = localStorage.getItem('pendingMerchant');
      if (pending) {
        const { storeName, annualVolume, primaryConcern } = JSON.parse(pending);
        await supabase.from('merchants').insert({
          user_id: signInData.user!.id,
          name: storeName.trim(),
          monthly_order_volume: annualVolume,
          primary_fraud_concern: primaryConcern,
          setup_complete: true,
        });
        localStorage.removeItem('pendingMerchant');
      }

      setLoading(false);
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-lg p-8 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md text-heading-sm font-bold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>U</span>
              <span className="text-heading-lg" style={{ color: 'var(--text)' }}>Unauth</span>
            </div>
            <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Identity match review for ecommerce merchants</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
              />
            </div>

            {isSignUp && (
              <>
                <div>
                  <label htmlFor="storeName" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Store name
                  </label>
                  <input
                    id="storeName"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required={isSignUp}
                    placeholder="Acme Commerce Ltd"
                    className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
                  />
                </div>
                <div>
                  <label htmlFor="platform" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Platform
                  </label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    required={isSignUp}
                    className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
                  >
                    <option value="">Select platform…</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="magento">Magento</option>
                    <option value="bigcommerce">BigCommerce</option>
                    <option value="custom">Custom</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="annualVolume" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Annual order volume
                  </label>
                  <select
                    id="annualVolume"
                    value={annualVolume}
                    onChange={(e) => setAnnualVolume(e.target.value)}
                    required={isSignUp}
                    className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
                  >
                    <option value="">Select range…</option>
                    <option value="under_10k">Under 10,000</option>
                    <option value="10k_50k">10,000–50,000</option>
                    <option value="50k_250k">50,000–250,000</option>
                    <option value="over_250k">Over 250,000</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="primaryConcern" className="block text-body-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Primary concern
                  </label>
                  <select
                    id="primaryConcern"
                    value={primaryConcern}
                    onChange={(e) => setPrimaryConcern(e.target.value)}
                    required={isSignUp}
                    className="w-full px-3 py-2 rounded-md text-body-md focus:outline-none"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.background = 'var(--bg-surface)'; e.target.style.outline = '2px solid var(--focus-ring)'; e.target.style.outlineOffset = '2px'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-inset)'; e.target.style.outline = 'none'; }}
                  >
                    <option value="">Select your main concern…</option>
                    <option value="refund_abuse">Refund abuse</option>
                    <option value="inr_claims">INR claims</option>
                    <option value="chargebacks">Chargebacks</option>
                    <option value="all">All of the above</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm" style={{ color: error.includes('created') || error.includes('Check your email') ? 'var(--success)' : 'var(--risk-critical)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || (isSignUp && (!storeName.trim() || !platform || !annualVolume || !primaryConcern))}
              className="w-full py-2.5 px-4 rounded-md text-body-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {loading ? 'Loading…' : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <p className="mt-4 text-body-sm text-center" style={{ color: 'var(--text-muted)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: 'var(--text)' }}
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
