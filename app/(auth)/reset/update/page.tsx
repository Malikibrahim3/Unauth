'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      router.push('/dashboard');
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
            Choose a new password
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-update-password"
              className="text-meta mb-1.5 block"
              style={{ color: 'var(--ink-secondary)' }}
            >
              New password
            </label>
            <Input
              id="reset-update-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="reset-update-confirm-password"
              className="text-meta mb-1.5 block"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Confirm password
            </label>
            <Input
              id="reset-update-confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="text-meta" style={{ color: 'var(--sev-definite)' }}>
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading || !password || !confirm}
            className="w-full"
          >
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
