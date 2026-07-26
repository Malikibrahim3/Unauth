'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { AuthError, authButtonStyle, authInputClassName } from '../AuthShell';

function mapResetError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid')) return 'Enter a valid email address.';
  return 'We could not send a reset link. Please try again.';
}

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset/update`,
    });

    setLoading(false);

    if (resetError) {
      setError(mapResetError(resetError.message));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <Panel as="section" variant="panel" className="p-6">
        <h1 className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal text-[var(--ua-text-primary)]">Check your email</h1>
        <p className="mt-3 text-sm leading-5 text-[var(--ua-text-secondary)]">
          We&apos;ve sent a reset link to <span className="font-medium text-[var(--ua-text-primary)]">{email.trim()}</span>.
          It may take a minute to arrive.
        </p>
        <Link href="/login" className="mt-8 inline-flex text-sm font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </Panel>
    );
  }

  return (
    <Panel as="section" variant="panel" className="p-6">
      <h1 className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal text-[var(--ua-text-primary)]">Reset your password</h1>
      <p className="mt-3 text-sm leading-5 text-[var(--ua-text-secondary)]">Enter your email and we&apos;ll send you a reset link.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
            Email
          </label>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-describedby={error ? 'reset-email-error' : undefined}
            className={authInputClassName}
            placeholder="you@company.com"
          />
          <AuthError id="reset-email-error">{error}</AuthError>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={loading}
          className="w-full justify-center"
          style={authButtonStyle}
        >
          {loading ? 'Sending reset link' : 'Send reset link'}
        </Button>
      </form>

      <Link href="/login" className="mt-6 inline-flex text-sm font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </Panel>
  );
}
