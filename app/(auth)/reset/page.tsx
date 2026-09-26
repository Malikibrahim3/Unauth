'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthShell, PublicNotice } from '@/components/public/PublicUI';
import styles from '@/components/public/public.module.css';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseBillingInterval, parseRequestedPlanId } from '@/lib/billing/plans';

function ResetForm() {
  const searchParams = useSearchParams();

  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const billingInterval = parseBillingInterval(searchParams.get('billingInterval'));
  const loginParams = new URLSearchParams();
  if(requestedNext) loginParams.set('next',nextPath);
  if(plan) loginParams.set('plan',plan);
  if(plan) loginParams.set('billingInterval',billingInterval);
  const loginHref = `/login${loginParams.size?`?${loginParams}`:''}`;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendReset() {
    if (sendingRef.current || cooldown > 0) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    setLoading(true);
    sendingRef.current = true;
    setSent(false);
    setError('');
    const updateParams = new URLSearchParams();
    if (requestedNext) updateParams.set('next', nextPath);
    if (plan) updateParams.set('plan', plan);
    if (plan) updateParams.set('billingInterval', billingInterval);
    try {
    const requestedEmail = email.trim();
    const result = await supabase.auth.resetPasswordForEmail(requestedEmail, {
      redirectTo: `${window.location.origin}/reset/update${updateParams.size ? `?${updateParams}` : ''}`,
    });
    if (result.error) {
      setError(/rate|too many/i.test(result.error.message)
        ? 'Too many requests. Wait before asking for another link.'
        : 'We could not send the link. Wait a moment and try again.');
      return;
    }
    setSent(true);
    setSubmittedEmail(requestedEmail);
    setCooldown(30);
    } catch {
      setError('We could not request the link. Check your connection and try again.');
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  return <AuthShell surfaceId="request-password-reset" title="Reset your password" description="Request recovery instructions. You will see the same response whether or not an account exists." stateId={loading?'password-reset-submitting':sent?'password-reset-sent-state':error?'password-reset-error':'password-reset-initial'}>
    {error&&<PublicNotice error id="reset-error">{error}</PublicNotice>}
    {sent&&<PublicNotice>If {submittedEmail} has an account, check its inbox and spam for recovery instructions. Use the latest valid link.</PublicNotice>}
    <form className={styles.form} aria-label="Reset your password" noValidate onSubmit={e=>{e.preventDefault();void sendReset();}}>
      <div className={styles.field}><label htmlFor="reset-email">Email</label><input className={styles.input} id="reset-email" name="email" ref={emailRef} type="email" autoComplete="email" value={email} aria-invalid={!!error} aria-describedby={error?'reset-error':undefined} onChange={e=>{setEmail(e.target.value);setError('');}}/></div>
      <button className={styles.button} type="submit" disabled={loading||cooldown>0} aria-busy={loading}>{loading?'Requesting instructions…':cooldown>0?`Request again in ${cooldown}s`:sent?'Request another link':'Send recovery link'}</button>
    </form><a href={loginHref}>Back to sign in</a>
  </AuthShell>;
}

export default function ResetPage() {
  return <Suspense fallback={<AuthShell title="Loading account access" description="Preparing the form…"><p role="status">Loading…</p></AuthShell>}><ResetForm /></Suspense>;
}
