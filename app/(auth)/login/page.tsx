'use client';

import { Suspense, useReducer } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (lower.includes('email not confirmed')) return 'Check your email to confirm your account, then sign in.';
  return message;
}

type LoginFormState = {
  email: string;
  password: string;
  storeName: string;
  error: string;
  loading: boolean;
  isSignUp: boolean;
};

type LoginFormAction =
  | { type: 'patch'; patch: Partial<LoginFormState> }
  | { type: 'toggleSignUp' };

function loginFormReducer(state: LoginFormState, action: LoginFormAction): LoginFormState {
  if (action.type === 'toggleSignUp') {
    return { ...state, isSignUp: !state.isSignUp, error: '' };
  }
  return { ...state, ...action.patch };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--landing-bg, #F8F5EE)' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');
  const [form, dispatch] = useReducer(loginFormReducer, {
    email: '',
    password: '',
    storeName: '',
    error: '',
    loading: false,
    isSignUp: searchParams.get('signup') === '1',
  });
  const { email, password, storeName, error, loading, isSignUp } = form;
  const nextPath = !requestedNextPath ? '/dashboard' : requestedNextPath;
  const isSubmitDisabled =
    loading ||
    !email ||
    !password ||
    (isSignUp && !storeName.trim());
  const isSuccess = error.includes('created') || error.includes('Check your email');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'patch', patch: { loading: true, error: '' } });

    if (isSignUp) {
      if (!storeName.trim()) {
        dispatch({ type: 'patch', patch: { error: 'Please enter your store name.', loading: false } });
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            store_name: storeName.trim(),
          },
        },
      });

      if (signUpError) {
        dispatch({ type: 'patch', patch: { error: formatAuthError(signUpError.message), loading: false } });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        dispatch({
          type: 'patch',
          patch: { error: 'Account created. Check your email to confirm, then sign in.', isSignUp: false, loading: false },
        });
        return;
      }

      const bootstrapRes = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          setupComplete: false,
        }),
      });
      const bootstrapBody = await bootstrapRes.json().catch(() => ({}));
      dispatch({ type: 'patch', patch: { loading: false } });
      if (!bootstrapRes.ok) {
        dispatch({ type: 'patch', patch: { error: bootstrapBody.error ?? 'Could not prepare your account.' } });
        return;
      }
      router.push('/onboarding');
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    dispatch({ type: 'patch', patch: { loading: false } });
    if (signInError) {
      dispatch({ type: 'patch', patch: { error: formatAuthError(signInError.message) } });
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
            {isSignUp ? 'Create your store workspace' : 'Sign in to your identity and claims workspace'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Email address</label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => dispatch({ type: 'patch', patch: { email: e.target.value } })}
                required
                placeholder={isSignUp ? 'you@yourstore.com' : 'you@company.com'}
              />
              {isSignUp && (
                <p className="mt-1 t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                  Use your work email to verify your store - personal email addresses are not accepted.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="t-label mb-2 block" style={{ color: 'var(--ink-tertiary)' }}>Password</label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => dispatch({ type: 'patch', patch: { password: e.target.value } })}
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
              <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--surface-border)' }}>
                <label htmlFor="signup-store-name" className="t-label block" style={{ color: 'var(--ink-tertiary)' }}>Store name</label>
                <Input
                  id="signup-store-name"
                  type="text"
                  value={storeName}
                  onChange={(e) => dispatch({ type: 'patch', patch: { storeName: e.target.value } })}
                  required
                  placeholder="Your store name"
                />
                <p className="t-caption" style={{ color: 'var(--ink-tertiary)' }}>
                  Platform and volume questions come next in onboarding - one quick step after signup.
                </p>
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
              onClick={() => dispatch({ type: 'toggleSignUp' })}
              className="font-semibold underline underline-offset-2"
              style={{ color: 'var(--copper-bright)' }}
            >
              {isSignUp ? 'Sign in' : 'Create account'}
            </button>
          </p>
          <p className="mt-4 text-center t-caption" style={{ color: 'var(--ink-tertiary)' }}>
            By {isSignUp ? 'creating an account' : 'signing in'}, you agree to use Unauth for authorised business use only.
          </p>
        </section>
      </div>
    </main>
  );
}
