'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset/update`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <Card variant="raised" density="relaxed">
        <div className="mb-7">
          <p className="text-meta mb-2.5" style={{ color: 'var(--ink-tertiary)' }}>
            Account recovery
          </p>
          <h1 className="text-h1" style={{ color: 'var(--ink-primary)' }}>
            Reset your password
          </h1>
        </div>

        {sent ? (
          <div
            className="rounded-[var(--radius-md)] border px-4 py-4"
            style={{
              background: 'var(--sev-clear-fill)',
              borderColor: 'color-mix(in srgb, var(--sev-clear) 45%, transparent)',
            }}
          >
            <p className="text-meta" style={{ color: 'var(--ink-secondary)' }}>
              Check your inbox — we&apos;ve sent a reset link to <strong>{email}</strong>.
            </p>
            <p className="text-meta mt-3" style={{ color: 'var(--ink-secondary)' }}>
              <Link href="/login" className="font-medium" style={{ color: 'var(--sev-clear)' }}>
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="text-meta mb-1.5 block" style={{ color: 'var(--ink-secondary)' }}>
                Email address
              </label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
              />
            </div>

            {error ? (
              <p className="text-meta" style={{ color: 'var(--sev-definite)' }}>
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={loading || !email}
              loading={loading}
              className="w-full"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-meta" style={{ color: 'var(--ink-secondary)' }}>
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
