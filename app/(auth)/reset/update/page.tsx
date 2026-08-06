'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { AuthError, authButtonStyle, authInputClassName } from '../../AuthShell';

function mapUpdateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Password must be at least 8 characters';
  }
  return 'We could not update your password. Please try the reset link again.';
}

function passwordRequirement(password: string): string {
  if (!password) return 'Use at least 8 characters.';
  if (password.length < 8) return `${8 - password.length} more character${password.length === 7 ? '' : 's'} needed.`;
  return 'Password length is valid.';
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'password' | 'confirm', string>>>({});
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    if (password !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setFieldErrors({});

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setFieldErrors({ password: mapUpdateError(error.message) });
      return;
    }

    router.push('/overview');
    router.refresh();
  }

  return (
    <Panel as="section" variant="panel" className="p-6">
      <h1 className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal text-[var(--ua-text-primary)]">Set new password</h1>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reset-update-password" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
            New password
          </label>
          <Input
            id="reset-update-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="reset-update-password-requirement reset-update-password-error"
            className={authInputClassName}
            placeholder="At least 8 characters"
          />
          <p id="reset-update-password-requirement" className="mt-2 min-h-5 text-sm leading-5 text-[var(--ua-text-tertiary)]" aria-live="polite">
            {passwordRequirement(password)}
          </p>
          <AuthError id="reset-update-password-error">{fieldErrors.password}</AuthError>
        </div>

        <div>
          <label htmlFor="reset-update-confirm" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
            Confirm password
          </label>
          <Input
            id="reset-update-confirm"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setFieldErrors((current) => ({ ...current, confirm: undefined }));
            }}
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.confirm)}
            aria-describedby={fieldErrors.confirm ? 'reset-update-confirm-error' : undefined}
            className={authInputClassName}
            placeholder="Confirm password"
          />
          <AuthError id="reset-update-confirm-error">{fieldErrors.confirm}</AuthError>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={loading}
          className="w-full justify-center"
          style={authButtonStyle}
        >
          {loading ? 'Updating password' : 'Update password'}
        </Button>
      </form>
    </Panel>
  );
}
