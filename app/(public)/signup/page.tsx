'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, UserRoundPlus } from 'lucide-react';
import { AuthError, AuthShell } from '@/app/(auth)/AuthShell';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseRequestedPlanId, PLANS } from '@/lib/billing/plans';
import { formatNumber } from '@/lib/utils/format';

type Field = 'email' | 'password' | 'confirm';
type SignupErrors = Partial<Record<Field, string>>;

function validate(email: string, password: string, confirm: string): SignupErrors {
  const errors: SignupErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!confirm) errors.confirm = 'Confirm your password.';
  else if (password !== confirm) errors.confirm = 'Passwords do not match.';
  return errors;
}

function mapSignupError(message: string): SignupErrors {
  const lower = message.toLowerCase();
  if (lower.includes('already registered')) return { email: 'We could not create the account. Check your details or use sign in.' };
  if (lower.includes('password') || lower.includes('weak')) return { password: 'Choose a stronger password with at least 8 characters.' };
  return { email: 'We could not create the account. Check your details and try again.' };
}

function SignupForm() {
  const searchParams = useSearchParams();
  // This is presentation-only until the authenticated server persists an
  // intent below. No query value ever updates subscription state directly.
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const intentKeyRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  function focusFirst(next: SignupErrors) {
    const first = (['email', 'password', 'confirm'] as const).find((field) => next[field]);
    ({ email: emailRef, password: passwordRef, confirm: confirmRef }[first ?? 'email']).current?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(email, password, confirm);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirst(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    intentKeyRef.current ??= globalThis.crypto?.randomUUID?.()
      ?? `signup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const callbackParams = new URLSearchParams();
    if (requestedNext) callbackParams.set('next', nextPath);
    const signUpResult = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback${callbackParams.size ? `?${callbackParams.toString()}` : ''}`,
        data: {
          setup_complete: false,
          ...(plan
            ? {
                requested_plan: plan,
                subscription_intent_key: intentKeyRef.current,
              }
            : {}),
        },
      },
    });

    if (signUpResult.error) {
      const mapped = mapSignupError(signUpResult.error.message);
      setLoading(false);
      setErrors(mapped);
      setPassword('');
      setConfirm('');
      focusFirst(mapped);
      return;
    }

    let user = signUpResult.data.user ?? null;
    if (!signUpResult.data.session) {
      const signIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!signIn.error) user = signIn.data.user;
    }

    if (user) {
      const setup = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapOnly: true }),
      });
      if (!setup.ok) {
        setLoading(false);
        setPassword('');
        setConfirm('');
        setErrors({ email: 'The workspace could not be prepared. Sign in or try again in a moment.' });
        emailRef.current?.focus();
        return;
      }
      if (plan) {
        const intent = await fetch('/api/billing/subscription-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': intentKeyRef.current ?? `signup-${user.id}-${plan}`,
          },
          body: JSON.stringify({ planId: plan, source: 'signup' }),
        });
        if (!intent.ok) {
          setLoading(false);
          setPassword('');
          setConfirm('');
          setErrors({ email: 'The workspace was created, but the plan request could not be saved. Sign in and choose the plan again in Billing.' });
          emailRef.current?.focus();
          return;
        }
      }
    }

    const onboardingParams = new URLSearchParams();
    if (requestedNext) onboardingParams.set('next', nextPath);
    router.push(`/onboarding${onboardingParams.size ? `?${onboardingParams.toString()}` : ''}`);
    router.refresh();
  }

  const loginParams = new URLSearchParams();
  if (plan) loginParams.set('plan', plan);
  if (requestedNext) loginParams.set('next', nextPath);
  const loginHref = `/login${loginParams.size ? `?${loginParams.toString()}` : ''}`;
  const selectedPlan = plan ? PLANS[plan] : null;
  const planLabel = selectedPlan?.name ?? null;

  return (
    <section className="ua-auth-card" data-surface-id="create-account" data-archetype="P2">
      <header>
        <span className="ua-auth-card__mark"><UserRoundPlus size={18} aria-hidden="true" /></span>
        <div><h1>Create your account</h1><p>{planLabel ? `Start with the ${planLabel} plan selected.` : 'Create the account that will own your workspace.'}</p></div>
      </header>
      {selectedPlan ? (
        <section className="ua-auth-intent" aria-label="Requested plan intent">
          <strong>{selectedPlan.name} requested</strong>
          <p>{selectedPlan.creditsMonthly === 'custom' ? 'The credit allowance is agreed before activation.' : `${formatNumber(selectedPlan.creditsMonthly)} credits are included each month.`} This request is saved after account creation; billing changes only after provider confirmation.</p>
        </section>
      ) : null}
      <form noValidate onSubmit={submit}>
        <FormField label="Work email" error={errors.email}>
          <Input ref={emailRef} name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); }} />
        </FormField>
        <FormField label="Password" hint="Use 8 or more characters." error={errors.password} success={password.length >= 8 ? 'Password length is valid.' : undefined}>
          <Input ref={passwordRef} name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirm}>
          <Input ref={confirmRef} name="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => { setConfirm(event.target.value); setErrors((current) => ({ ...current, confirm: undefined })); }} />
        </FormField>
        <AuthError>{errors.email ?? errors.password ?? errors.confirm}</AuthError>
        <Button type="submit" size="lg" loading={loading}>Create account</Button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--ua-text-secondary)]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ua-success)]" aria-hidden="true" /><span>By creating an account, you agree to the <Link className="text-[var(--ua-text-link)] underline underline-offset-2" href="/legal/pilot-terms">Pilot terms</Link> and acknowledge the <Link className="text-[var(--ua-text-link)] underline underline-offset-2" href="/legal/privacy">Privacy policy</Link>.</span></p>
      <div className="ua-auth-enumeration-note"><i /><p>We never disclose whether an email already belongs to an account. Existing workspace members can use sign in or request a recovery link.</p></div>
      <footer><span>Already have an account? <Link href={loginHref}>Sign in</Link></span><Link href={plan ? `/pricing?plan=${encodeURIComponent(plan)}` : '/pricing'}>Compare plans</Link></footer>
    </section>
  );
}

export default function SignupPage() {
  return <AuthShell><Suspense fallback={<div className="ua-auth-card" aria-busy="true">Preparing account setup…</div>}><SignupForm /></Suspense></AuthShell>;
}
