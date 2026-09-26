'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, PublicLink, PublicNotice } from '@/components/public/PublicUI';
import { PasswordField } from '@/components/public/PasswordField';
import styles from '@/components/public/public.module.css';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { formatMoney } from '@/lib/utils/format';
import {
  annualDiscountPercent,
  annualFreeMonths,
  annualMonthlyEquivalentMinor,
  annualSavingGbp,
  parseBillingInterval,
  parseRequestedPlanId,
  PLANS,
} from '@/lib/billing/plans';

type Field = 'email' | 'password' | 'confirm';
type SignupErrors = Partial<Record<Field, string>>;

function validate(email: string, password: string, confirm: string): SignupErrors {
  const errors: SignupErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 12) errors.password = 'Use at least 12 characters.';
  if (!confirm) errors.confirm = 'Confirm your password.';
  else if (password !== confirm) errors.confirm = 'Passwords do not match.';
  return errors;
}

function mapSignupError(message: string): SignupErrors {
  const lower = message.toLowerCase();
  if (lower.includes('already registered')) return { email: 'We could not create the account. Check your details or use sign in.' };
  if (lower.includes('password') || lower.includes('weak')) return { password: 'Choose a stronger password with at least 12 characters.' };
  return { email: 'We could not create the account. Check your details and try again.' };
}

function planMoney(pounds: number) {
  const formatted = formatMoney(pounds * 100, 'GBP');
  return Number.isInteger(pounds) ? formatted.replace(/\.00$/, '') : formatted;
}

function SignupForm() {
  const searchParams = useSearchParams();

  // This is presentation-only until the authenticated server persists an
  // intent below. No query value ever updates subscription state directly.
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const billingInterval = parseBillingInterval(searchParams.get('billingInterval'));
  const requestedPlan = searchParams.get('plan');
  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
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

  async function submit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (loading) return;
    if (!plan) return;
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
    callbackParams.set('plan', plan);
    callbackParams.set('billingInterval', billingInterval);
    try {
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
                  requested_billing_interval: billingInterval,
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
        else if (signUpResult.data.user && /email.*confirm|confirm.*email/i.test(signIn.error.message)) {
          setConfirmationRequired(true);
          setPassword('');
          setConfirm('');
          return;
        }
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
              'Idempotency-Key': intentKeyRef.current ?? `signup-${user.id}-${plan}-${billingInterval}`,
            },
            body: JSON.stringify({ planId: plan, billingInterval, source: 'signup' }),
          });
          if (!intent.ok) {
            setLoading(false);
            setPassword('');
            setConfirm('');
            setErrors({ email: 'The workspace was created, but the plan request could not be saved. Return to Pricing and submit the request again.' });
            emailRef.current?.focus();
            return;
          }
        }
      }

      const onboardingParams = new URLSearchParams();
      if (requestedNext) onboardingParams.set('next', nextPath);
      router.push(`/onboarding${onboardingParams.size ? `?${onboardingParams.toString()}` : ''}`);
      router.refresh();
    } catch {
      setErrors({ email: 'Account setup could not be confirmed. Try signing in before creating another workspace.' });
    } finally {
      setLoading(false);
    }
  }

  const loginParams = new URLSearchParams();
  if (plan) loginParams.set('plan', plan);
  if (plan) loginParams.set('billingInterval', billingInterval);
  if (requestedNext) loginParams.set('next', nextPath);
  const loginHref = `/login${loginParams.size ? `?${loginParams.toString()}` : ''}`;
  const selectedPlan = plan ? PLANS[plan] : null;
  const planCarry = selectedPlan
    ? (() => {
        if (selectedPlan.priceGbp === 'custom') return `Requested ${selectedPlan.name} · custom ${billingInterval} terms to agree. Selection does not activate a subscription.`;
        if (billingInterval === 'annual' && typeof selectedPlan.annualPriceGbp === 'number') {
          const equivalentMinor = annualMonthlyEquivalentMinor(selectedPlan);
          const saving = annualSavingGbp(selectedPlan);
          const discount = annualDiscountPercent(selectedPlan);
          const freeMonths = annualFreeMonths(selectedPlan);
          const annualDetails = [
            saving == null ? null : `save ${planMoney(saving)}`,
            discount == null || freeMonths == null ? null : `${discount}% discount, equivalent to ${freeMonths} months free`,
          ].filter((detail): detail is string => detail != null).join(' · ');
          return `Requested ${selectedPlan.name} · ${equivalentMinor == null ? 'Custom' : formatMoney(equivalentMinor, selectedPlan.currency)}/month effective, ${planMoney(selectedPlan.annualPriceGbp)} paid upfront annually${annualDetails ? ` · ${annualDetails}` : ''}. Selection does not activate a subscription.`;
        }
        return `Requested ${selectedPlan.name} · ${planMoney(selectedPlan.priceGbp)} per month, excluding VAT. Selection does not activate a subscription.`;
      })()
    : requestedPlan
      ? 'That plan is not available. Choose a current plan from Pricing to create a workspace.'
      : 'Choose Core, Scale or Enterprise from Pricing to create a workspace. There is no free plan.';
  return <AuthShell surfaceId="create-account" title="Create your workspace" description="Bring your evidence, decisions and next steps together." stateId={loading?'signup-submitting':confirmationRequired?'signup-confirmation-required':Object.keys(errors).length?'signup-error':undefined}>
    <PublicNotice>{planCarry}</PublicNotice>
    {!selectedPlan && <p className={styles.fine}><PublicLink href="/pricing">View current plans</PublicLink></p>}
    {Object.keys(errors).length>0&&<PublicNotice error>{Object.values(errors).join(' ')}</PublicNotice>}
    {selectedPlan && (confirmationRequired?<PublicNotice>Check your email to confirm your account, then sign in. Your requested plan and payment frequency are retained; they are not an active subscription.</PublicNotice>:<form className={styles.form} aria-label="Create a workspace" noValidate onSubmit={submit}>
      <div className={styles.field}><label htmlFor="signup-email">Work email</label><input className={styles.input} id="signup-email" name="email" type="email" autoComplete="email" ref={emailRef} value={email} aria-invalid={!!errors.email} aria-describedby={errors.email?'signup-email-error':undefined} onChange={e=>{setEmail(e.target.value);setErrors({});}}/>{errors.email&&<span className={styles.fieldError} id="signup-email-error">{errors.email}</span>}</div>
      <PasswordField label="Password" id="signup-password" name="password" inputRef={passwordRef} autoComplete="new-password" value={password} error={errors.password} onChange={e=>{setPassword(e.target.value);setErrors({});}}/>
      <p className={styles.fine}>Use at least 12 characters.</p>
      <PasswordField label="Confirm password" id="signup-confirm-password" name="confirm" inputRef={confirmRef} autoComplete="new-password" value={confirm} error={errors.confirm} onChange={e=>{setConfirm(e.target.value);setErrors({});}}/>
      <button className={styles.button} type="submit" disabled={loading} aria-busy={loading}>{loading?'Creating workspace…':'Create workspace'}</button>
    </form>)}<p className={styles.fine}>Already have an account? <a href={loginHref}>Sign in</a></p>
  </AuthShell>;
}

export default function SignupPage() {
  return <Suspense fallback={<AuthShell title="Loading account access" description="Preparing the form…"><p role="status">Loading…</p></AuthShell>}><SignupForm /></Suspense>;
}
