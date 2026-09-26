'use client';

import { Suspense, useMemo, useReducer, useRef, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, PublicNotice } from '@/components/public/PublicUI';
import { PasswordField } from '@/components/public/PasswordField';
import styles from '@/components/public/public.module.css';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseBillingInterval, parseRequestedPlanId } from '@/lib/billing/plans';

type State = {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  status: string;
};

function LoginPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const billingInterval = parseBillingInterval(searchParams.get('billingInterval'));
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, patch] = useReducer((current: State, next: Partial<State>) => ({ ...current, ...next }), {
    email: '',
    password: '',
    error: '',
    loading: false,
    status: '',
  });

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (state.loading) return;
    if (!/^\S+@\S+\.\S+$/.test(state.email.trim())) {
      patch({ error: 'Enter a valid email address.' });
      emailRef.current?.focus();
      return;
    }
    if (!state.password) {
      patch({ error: 'Enter your password.' });
      passwordRef.current?.focus();
      return;
    }
    patch({ loading: true, error: '', status: '' });
    try {
      const result = await supabase.auth.signInWithPassword({ email: state.email.trim(), password: state.password });
      if (result.error) {
        const limited = /rate|locked/i.test(result.error.message);
        patch({ loading: false, password: '', error: limited ? 'Sign in is temporarily limited. Wait a moment and try again.' : 'Incorrect email or password.' });
        requestAnimationFrame(() => passwordRef.current?.focus());
        return;
      }
      if (plan) {
        const intent = await fetch('/api/billing/subscription-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `login-${result.data.user.id}-${plan}-${billingInterval}-v1` },
          body: JSON.stringify({ planId: plan, billingInterval, source: 'signup' }),
        });
        if (!intent.ok) {
          patch({ loading: false, status: 'You are signed in, but the plan request was not saved. Return to Pricing and submit the request again.' });
          return;
        }
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      patch({ error: 'Sign in could not be confirmed. Check your connection and try again.' });
    } finally {
      patch({ loading: false });
    }
  }

  const message = state.error || state.status;
  const resetParams = new URLSearchParams();
  const signupParams = new URLSearchParams();
  if (requestedNext) { resetParams.set('next', nextPath); signupParams.set('next', nextPath); }
  if (plan) { signupParams.set('plan', plan); resetParams.set('plan', plan); }
  if (plan) { signupParams.set('billingInterval', billingInterval); resetParams.set('billingInterval', billingInterval); }
  const resetHref = `/reset${resetParams.size ? `?${resetParams}` : ''}`;
  const signupHref = `/signup${signupParams.size ? `?${signupParams}` : ''}`;
  return <AuthShell surfaceId="sign-in" title="Sign in" description="Continue to your workspace and its evidence-backed decisions." stateId={state.loading?'login-submitting':message?'login-error':undefined}>
    {message && <PublicNotice error={!!state.error} id="login-error">{message}</PublicNotice>}
    {searchParams.get('password')==='updated'&&!message&&<PublicNotice>Password updated. Sign in with your new password.</PublicNotice>}
    <form className={styles.form} aria-label="Sign in" noValidate onSubmit={submit}>
      <div className={styles.field}><label htmlFor="login-email">Email</label><input className={styles.input} id="login-email" name="email" ref={emailRef} type="email" autoComplete="email" value={state.email} aria-invalid={!!state.error} aria-describedby={state.error?'login-error':undefined} onChange={e=>patch({email:e.target.value,error:'',status:''})}/></div>
      <PasswordField label="Password" id="login-password" name="password" inputRef={passwordRef} autoComplete="current-password" value={state.password} aria-describedby={state.error?'login-error':undefined} onChange={e=>patch({password:e.target.value,error:'',status:''})}/>
      <a href={resetHref}>Forgot your password?</a>
      <button className={styles.button} type="submit" disabled={state.loading} aria-busy={state.loading}>{state.loading?'Signing in…':'Sign in'}</button>
    </form><p className={styles.fine}>New to Unauth? <a href={signupHref}>Create a workspace</a></p>
  </AuthShell>;
}

export default function LoginPage() {
  return <Suspense fallback={<AuthShell title="Loading account access" description="Preparing the form…"><p role="status">Loading…</p></AuthShell>}><LoginPageInner /></Suspense>;
}
