'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthShell, PublicNotice } from '@/components/public/PublicUI';
import { PasswordField } from '@/components/public/PasswordField';
import styles from '@/components/public/public.module.css';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseBillingInterval, parseRequestedPlanId } from '@/lib/billing/plans';

type SessionState = 'checking' | 'valid' | 'invalid' | 'success';

function UpdatePasswordForm() {
  const searchParams = useSearchParams();

  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const plan = parseRequestedPlanId(searchParams.get('plan'));
  const billingInterval = parseBillingInterval(searchParams.get('billingInterval'));
  const resetParams = new URLSearchParams();
  if(requestedNext) resetParams.set('next',nextPath);
  if(plan) resetParams.set('plan',plan);
  if(plan) resetParams.set('billingInterval',billingInterval);
  const resetHref = `/reset${resetParams.size?`?${resetParams}`:''}`;
  const loginParams = new URLSearchParams({ password: 'updated' });
  if (requestedNext) loginParams.set('next', nextPath);
  if (plan) loginParams.set('plan', plan);
  if (plan) loginParams.set('billingInterval', billingInterval);
  const loginHref = `/login?${loginParams}`;
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [email, setEmail] = useState('your account');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {

    let active = true;
    let sessionEventObserved = false;
    const timeout = window.setTimeout(() => {
      if (active) setSessionState((current) => current === 'checking' ? 'invalid' : current);
    }, 10_000);
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active || sessionEventObserved) return;
      window.clearTimeout(timeout);
      setEmail(data.session?.user.email ?? 'your account');
      setSessionState(data.session ? 'valid' : 'invalid');
    }).catch(() => {
      if (!active || sessionEventObserved) return;
      window.clearTimeout(timeout);
      setSessionState('invalid');
    });
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active || (event !== 'PASSWORD_RECOVERY' && event !== 'SIGNED_OUT' && !session)) return;
      sessionEventObserved = true;
      window.clearTimeout(timeout);
      setEmail(session?.user.email ?? 'your account');
      setSessionState((current) => current === 'success' ? current : session ? 'valid' : 'invalid');
    });
    return () => { active = false; window.clearTimeout(timeout); data.subscription.unsubscribe(); };
  }, [supabase]);

  async function submit() {
    if (loading || sessionState === 'checking') return;
    if (sessionState === 'invalid') {
      router.push(resetHref);
      return;
    }
    if (sessionState === 'success') {
      router.push(loginHref);
      return;
    }
    if (password.length < 12) { setError('Use at least 12 characters.'); passwordRef.current?.focus(); return; }
    if (password !== confirm) { setError('Passwords do not match.'); confirmRef.current?.focus(); return; }
    setLoading(true);
    setError('');
    try {
      const result = await supabase.auth.updateUser({ password });
      let otherSessionsWarning = '';
      if (!result.error && signOutOthers) {
        try {
          const signOut = await supabase.auth.signOut({ scope: 'others' });
          if (signOut.error) otherSessionsWarning = 'Other sessions could not be signed out and may still have access.';
        } catch {
          otherSessionsWarning = 'Other sessions could not be signed out and may still have access.';
        }
      }
      setLoading(false);
      setPassword('');
      setConfirm('');
      if (result.error) {
        const expired = result.error.message.toLowerCase().includes('session');
        setError(expired ? 'This reset link has expired. Request a new one.' : 'We could not update the password. Try the recovery link again.');
        if (expired) setSessionState('invalid');
        return;
      }
      setError(otherSessionsWarning);
      setSessionState('success');
    } catch {
      setError('The password update could not be confirmed. Try signing in or request a new recovery link.');
    } finally {
      setLoading(false);
    }
  }

  const invalid = sessionState === 'invalid';
  const success = sessionState === 'success';
  return <AuthShell surfaceId="set-new-password" title={success?'Password updated':'Set a new password'} description={success?'Your new password is ready to use.':invalid?'Request a new recovery link. No password was changed here.':sessionState==='checking'?'Checking your recovery session…':`Set a new password for ${email}.`} stateId={success?'reset-update-success':invalid?'reset-update-invalid-session':error?'reset-update-error':`reset-update-${sessionState}`}>
    {invalid&&<PublicNotice error>This link is invalid or expired. Request a new link and use the latest valid one.</PublicNotice>}
    {error&&<PublicNotice error={!success} id="reset-update-error">{error}</PublicNotice>}
    {!success&&sessionState!=='checking'&&<form className={styles.form} aria-label="Set a new password" noValidate onSubmit={e=>{e.preventDefault();void submit();}}>
      <PasswordField label="New password" id="reset-new-password" name="password" inputRef={passwordRef} autoComplete="new-password" value={password} disabled={invalid} error={error.includes('12 characters')?error:undefined} onChange={e=>{setPassword(e.target.value);setError('');}}/>
      <PasswordField label="Confirm new password" id="reset-confirm-password" name="confirm" inputRef={confirmRef} autoComplete="new-password" value={confirm} disabled={invalid} error={error.includes('match')?error:undefined} onChange={e=>{setConfirm(e.target.value);setError('');}}/>
      {!invalid&&<label><input type="checkbox" checked={signOutOthers} onChange={e=>setSignOutOthers(e.target.checked)}/> Sign out other sessions</label>}
      {!invalid&&<button className={styles.button} type="submit" disabled={loading} aria-busy={loading}>{loading?'Saving…':'Set password and continue'}</button>}
    </form>}
    {invalid&&<a className={styles.button} href={resetHref}>Request a new link</a>}
    {success&&<a className={styles.button} href={loginHref}>Return to sign in</a>}
  </AuthShell>;
}

export default function UpdatePasswordPage() {
  return <Suspense fallback={<AuthShell title="Loading account access" description="Preparing the form…"><p role="status">Loading…</p></AuthShell>}><UpdatePasswordForm /></Suspense>;
}
