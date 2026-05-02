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

  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setError('Account created! You can now sign in.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
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
            <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Refund fraud audit for ecommerce merchants</p>
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

            {error && (
              <p className="text-sm" style={{ color: error.includes('created') ? 'var(--success)' : 'var(--risk-critical)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
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
