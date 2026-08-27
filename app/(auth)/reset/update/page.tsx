'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, KeyRound, Link2Off } from 'lucide-react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { AuthError } from '../../AuthShell';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

type SessionState = 'checking' | 'valid' | 'invalid' | 'success';

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const resetHref = requestedNext ? `/reset?next=${encodeURIComponent(nextPath)}` : '/reset';
  const loginParams = new URLSearchParams({ password: 'updated' });
  if (requestedNext) loginParams.set('next', nextPath);
  const loginHref = `/login?${loginParams.toString()}`;
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setSessionState('invalid');
    }, 10_000);
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (active) setSessionState(data.session ? 'valid' : 'invalid');
    }).catch(() => {
      if (active) setSessionState('invalid');
    });
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setSessionState('valid');
    });
    return () => { active = false; window.clearTimeout(timeout); data.subscription.unsubscribe(); };
  }, [supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      confirmRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    const result = await supabase.auth.updateUser({ password });
    setLoading(false);
    setPassword('');
    setConfirm('');
    if (result.error) {
      setError(result.error.message.toLowerCase().includes('session') ? 'This reset link has expired. Request a new one.' : 'We could not update the password. Try the recovery link again.');
      if (result.error.message.toLowerCase().includes('session')) setSessionState('invalid');
      return;
    }
    setSessionState('success');
  }

  if (sessionState === 'checking') {
    return <section className="ua-auth-card" data-surface-id="password-reset-session-check" data-state-id="password-reset-session-check" aria-busy="true" aria-label="Checking the recovery link"><p className="text-sm text-[var(--uo-route-text-secondary)]" role="status">Checking the recovery link…</p></section>;
  }

  if (sessionState === 'invalid') {
    return (
      <section className="ua-auth-card" data-surface-id="set-new-password" data-state-id="reset-update-invalid-session" data-archetype="P2">
        <header><span className="ua-auth-card__mark"><Link2Off size={18} aria-hidden="true" /></span><div><h1>This link cannot be used</h1><p>Recovery links are time-limited and can only be used once.</p></div></header>
        <Link className="ua-button ua-button--primary ua-button--lg w-full justify-center" href={resetHref}>Request a new link</Link>
        <footer><Link href={requestedNext ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}>Back to sign in</Link></footer>
      </section>
    );
  }

  if (sessionState === 'success') {
    return (
      <section className="ua-auth-card" data-surface-id="set-new-password" data-state-id="reset-update-success" data-archetype="P2">
        <header><span className="ua-auth-card__mark"><Check size={18} aria-hidden="true" /></span><div><h1>Password updated</h1><p>Your new password is ready to use.</p></div></header>
        <Link className="ua-button ua-button--primary ua-button--lg w-full justify-center" href={loginHref}>Return to sign in</Link>
      </section>
    );
  }

  return (
    <section className="ua-auth-card" data-surface-id="set-new-password" data-state-id="set-new-password" data-archetype="P2">
      <header><span className="ua-auth-card__mark"><KeyRound size={18} aria-hidden="true" /></span><div><h1>Set a new password</h1><p>Choose a password you have not used for this workspace.</p></div></header>
      <form noValidate onSubmit={submit}>
        <FormField label="New password" hint="Use 8 or more characters." error={error && password.length < 8 ? error : undefined} success={password.length >= 8 ? 'Password length is valid.' : undefined}>
          <Input ref={passwordRef} name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} />
        </FormField>
        <FormField label="Confirm password" error={error && password.length >= 8 ? error : undefined}>
          <Input ref={confirmRef} name="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(''); }} />
        </FormField>
        <AuthError>{error}</AuthError>
        <Button type="submit" size="lg" loading={loading}>Save new password</Button>
      </form>
    </section>
  );
}

export default function UpdatePasswordPage() {
  return <Suspense fallback={<section className="ua-auth-card" aria-busy="true">Checking the recovery link…</section>}><UpdatePasswordForm /></Suspense>;
}
