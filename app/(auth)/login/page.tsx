'use client';

import { Suspense, useMemo, useReducer, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { AuthError } from '../AuthShell';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseRequestedPlanId } from '@/lib/billing/plans';

type State = {
  email: string;
  password: string;
  showPassword: boolean;
  errors: Partial<Record<'email' | 'password', string>>;
  loading: boolean;
  magicLoading: boolean;
  status: string;
};
function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, patch] = useReducer((current: State, next: Partial<State>) => ({ ...current, ...next }), {
    email: '',
    password: '',
    showPassword: false,
    errors: {},
    loading: false,
    magicLoading: false,
    status: '',
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: State['errors'] = {};
    if (!/^\S+@\S+\.\S+$/.test(state.email.trim())) errors.email = 'Enter a valid email address.';
    if (!state.password) errors.password = 'Enter your password.';
    if (Object.keys(errors).length) {
      patch({ errors });
      requestAnimationFrame(() => (errors.email ? emailRef.current : passwordRef.current)?.focus());
      return;
    }
    patch({ loading: true, errors: {}, status: '' });
    const result = await supabase.auth.signInWithPassword({ email: state.email.trim(), password: state.password });
    if (result.error) {
      const message = result.error.message.toLowerCase();
      patch({ loading: false, password: '', errors: { password: message.includes('rate') || message.includes('locked') ? 'Sign in is temporarily limited. Wait a moment and try again.' : 'Incorrect email or password.' } });
      requestAnimationFrame(() => passwordRef.current?.focus());
      return;
    }
    if (plan) {
      const intent = await fetch('/api/billing/subscription-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `login-${result.data.user.id}-${plan}-v1`,
        },
        body: JSON.stringify({ planId: plan, source: 'signup' }),
      });
      if (!intent.ok) {
        patch({ loading: false, status: 'You are signed in, but the plan request was not saved. Choose it again in Billing.' });
        return;
      }
    }
    router.push(nextPath);
    router.refresh();
  }

  async function sendMagicLink() {
    const email = state.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      patch({ errors: { email: 'Enter a valid email address.' }, status: '' });
      requestAnimationFrame(() => emailRef.current?.focus());
      return;
    }

    patch({ magicLoading: true, errors: {}, status: '' });
    const callbackParams = new URLSearchParams();
    if (requestedNext) callbackParams.set('next', nextPath);
    if (plan) callbackParams.set('plan', plan);
    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/callback${callbackParams.size ? `?${callbackParams.toString()}` : ''}`,
      },
    });
    patch({
      magicLoading: false,
      status: result.error
        ? 'The sign-in link could not be sent. Wait a moment and try again.'
        : 'If an account matches, a sign-in link is on its way.',
    });
  }

  const resetParams = new URLSearchParams();
  const signupParams = new URLSearchParams();
  if (requestedNext) {
    resetParams.set('next', nextPath);
    signupParams.set('next', nextPath);
  }
  if (plan) signupParams.set('plan', plan);

  return (
    <section className="ua-auth-card" data-surface-id="sign-in" data-archetype="P2">
      <header><div><h1>Sign in to Unauth</h1><p>Use the email your workspace was invited with.</p></div></header>
      {searchParams.get('password') === 'updated' ? <p role="status" className="mb-5 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-success-bg)] px-3 py-2 text-xs text-[var(--uo-route-success)]">Password updated. Sign in with your new password.</p> : null}
      <form noValidate onSubmit={submit}>
        <FormField label="Work email" error={state.errors.email}><Input ref={emailRef} id="login-email" name="email" type="email" autoComplete="email" value={state.email} onChange={(event) => patch({ email: event.target.value, errors: { ...state.errors, email: undefined }, status: '' })} aria-invalid={Boolean(state.errors.email)} /></FormField>
        <div className="ua-auth-password-field">
          <FormField label="Password" error={state.errors.password}>
            <div className="ua-password-control"><Input ref={passwordRef} id="login-password" name="password" type={state.showPassword ? 'text' : 'password'} autoComplete="current-password" value={state.password} onChange={(event) => patch({ password: event.target.value, errors: { ...state.errors, password: undefined }, status: '' })} aria-invalid={Boolean(state.errors.password)} /><button type="button" aria-label={state.showPassword ? 'Hide password' : 'Show password'} onClick={() => patch({ showPassword: !state.showPassword })}>{state.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          </FormField>
          <Link className="ua-auth-forgot" href={`/reset${resetParams.size ? `?${resetParams.toString()}` : ''}`}>Forgot password</Link>
        </div>
        <AuthError>{state.errors.email ?? state.errors.password}</AuthError>
        <Button type="submit" size="lg" loading={state.loading}>Continue</Button>
      </form>
      <div className="ua-auth-divider"><i /><span>or</span><i /></div>
      <div className="ua-auth-alternatives">
        <button type="button" onClick={() => patch({ status: 'Shopify sign-in is unavailable in this deployment.' })}><span>S</span>Continue with Shopify</button>
        <button type="button" disabled={state.magicLoading} aria-busy={state.magicLoading || undefined} onClick={() => void sendMagicLink()}><span>@</span>{state.magicLoading ? 'Sending sign-in link…' : 'Send a sign-in link instead'}</button>
      </div>
      {state.status ? <p className="ua-auth-status" role="status">{state.status}</p> : null}
      <div className="ua-auth-enumeration-note"><i /><p>A wrong password is never stored, and we never say whether an email exists. If an account matches, the reset link arrives within a minute.</p></div>
      <footer><span>Need an account? <Link href={`/signup${signupParams.size ? `?${signupParams.toString()}` : ''}`}>Create one</Link></span><Link href="/landing">Product overview</Link></footer>
    </section>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="ua-auth-card" aria-busy="true">Loading secure sign in…</div>}><LoginForm /></Suspense>;
}
