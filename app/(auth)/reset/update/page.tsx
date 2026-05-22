'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--ink-primary)] lg:grid lg:grid-cols-2">
      <section className="hidden border-r border-[var(--surface-border)] lg:flex lg:items-center lg:justify-center">
        <UnauthLogo variant="dark" size={128} />
      </section>
      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md espresso-panel p-6 lg:p-8">
          <p className="t-label text-[var(--ink-tertiary)]">ACCOUNT RECOVERY</p>
          <h1 className="mt-2 t-heading">Choose a new password</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block t-label text-[var(--ink-tertiary)]">New password</span>
              <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />
            </label>
            <label className="block">
              <span className="mb-2 block t-label text-[var(--ink-tertiary)]">Confirm password</span>
              <input className="w-full espresso-input px-4 py-3 outline-none focus-ring" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            </label>
            {error && <p className="t-body text-[var(--sev-probable)]">{error}</p>}
            <button type="submit" disabled={loading || !password || !confirm} className="w-full rounded-sm bg-[var(--copper-bright)] px-4 py-3 t-label text-[var(--ink-inverse)] disabled:opacity-50">
              {loading ? 'Updating...' : 'Update password'}
            </button>
            <div className="text-center"><Link href="/login" className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]">Back to sign in</Link></div>
          </form>
        </div>
      </section>
    </div>
  );
}
