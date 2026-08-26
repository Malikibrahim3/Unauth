'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { AuthError } from '../AuthShell';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

function validateEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email.trim()) ? '' : 'Enter a valid email address.';
}

function ResetForm() {
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = safeRedirectPath(requestedNext);
  const loginHref = requestedNext ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendReset() {
    const validation = validateEmail(email);
    if (validation) {
      setError(validation);
      emailRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    const updateParams = new URLSearchParams();
    if (requestedNext) updateParams.set('next', nextPath);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset/update${updateParams.size ? `?${updateParams.toString()}` : ''}`,
    });
    setLoading(false);
    if (resetError) {
      setError('We could not send the link. Wait a moment and try again.');
      return;
    }
    setSent(true);
    setCooldown(30);
  }

  if (sent) {
    return (
      <section className="ua-auth-card" data-surface-id="password-reset-sent-state" data-state-id="password-reset-sent-state" data-archetype="P2">
        <header><span className="ua-auth-card__mark"><MailCheck size={18} aria-hidden="true" /></span><div><h1>Check your email</h1><p>If an account can be recovered, a reset link is on its way.</p></div></header>
        <p className="text-sm leading-6 text-[var(--uo-route-text-secondary)]">We sent recovery instructions to the address you entered: <strong className="font-medium text-[var(--uo-route-text-primary)]">{email.trim()}</strong>. Delivery can take a minute.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" disabled={cooldown > 0} loading={loading} leadingIcon={<RotateCw size={14} />} onClick={sendReset}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}</Button>
          <Link className="text-xs font-medium text-[var(--uo-route-text-link)] hover:underline" href={loginHref}>Back to sign in</Link>
        </div>
        <AuthError>{error}</AuthError>
      </section>
    );
  }

  return (
    <section className="ua-auth-card" data-surface-id="request-password-reset" data-state-id="password-reset-request" data-archetype="P2">
      <header><span className="ua-auth-card__mark"><RotateCw size={18} aria-hidden="true" /></span><div><h1>Reset your password</h1><p>We will send a time-limited recovery link.</p></div></header>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void sendReset(); }}>
        <FormField label="Email" hint="Use the address associated with your workspace." error={error}>
          <Input ref={emailRef} name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} />
        </FormField>
        <AuthError>{error}</AuthError>
        <Button type="submit" size="lg" loading={loading}>Send reset link</Button>
      </form>
      <footer><Link href={loginHref}>Back to sign in</Link><span>Remembered it? <Link href={loginHref}>Sign in</Link></span></footer>
    </section>
  );
}

export default function ResetPage() {
  return <Suspense fallback={<section className="ua-auth-card" aria-busy="true">Preparing password recovery…</section>}><ResetForm /></Suspense>;
}
