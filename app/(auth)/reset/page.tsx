'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset/update` });
    setLoading(false);
    if (resetError) setError(resetError.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] lg:grid lg:grid-cols-2">
      <section className="hidden border-r border-[var(--surface-border)] lg:flex lg:items-center lg:justify-center">
        <UnauthLogo variant="dark" size={128} />
      </section>
      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md espresso-panel p-6 lg:p-8">
          <p className="t-label text-[var(--ink-tertiary)]">ACCOUNT RECOVERY</p>
          <h1 className="mt-2 t-heading">Reset your password</h1>
          {sent ? (
            <div className="mt-6 rounded-sm border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4 t-body text-[var(--ink-secondary)]">
              Check your inbox for a reset link to <strong>{email}</strong>.
              <div className="mt-4"><Link href="/login" className="t-label text-[var(--copper-bright)]">Back to sign in</Link></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block t-label text-[var(--ink-tertiary)]">Email address</span>
                <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </label>
              {error && <p className="t-body text-[var(--sev-probable)]">{error}</p>}
              <button type="submit" disabled={loading || !email} className="w-full rounded-sm bg-[var(--copper-bright)] px-4 py-3 t-label text-[var(--ink-inverse)] disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <div className="text-center"><Link href="/login" className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]">Back to sign in</Link></div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
