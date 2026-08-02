'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui';
import { AuthError, AuthShell, authButtonStyle, authInputClassName } from '@/app/(auth)/AuthShell';
import { createClient } from '@/lib/supabase/client';

type SignupErrors = Partial<Record<'email' | 'password' | 'confirm', string>>;

function validateSignup(email: string, password: string, confirm: string): SignupErrors {
  const fieldErrors: SignupErrors = {};
  if (!email.trim()) fieldErrors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) fieldErrors.email = 'Enter a valid email address.';
  if (password.length < 8) fieldErrors.password = 'Password must be at least 8 characters.';
  if (!confirm) fieldErrors.confirm = 'Confirm your password.';
  else if (password !== confirm) fieldErrors.confirm = 'Passwords do not match.';
  return fieldErrors;
}

function mapSignupError(message: string): SignupErrors {
  const lower = message.toLowerCase();
  if (lower.includes('user already registered')) return { email: 'An account with this email already exists' };
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return { password: 'Password must be at least 8 characters' };
  }
  return { email: 'We could not create your account. Please try again.' };
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateSignup(email, password, confirm);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setLoading(true);
    setFieldErrors({});

    const signUpResult = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: { setup_complete: false },
      },
    });

    if (signUpResult.error) {
      setLoading(false);
      setFieldErrors(mapSignupError(signUpResult.error.message));
      return;
    }

    let user = signUpResult.data.user ?? null;
    if (!signUpResult.data.session) {
      const signInResult = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!signInResult.error) user = signInResult.data.user;
    }

    if (user) {
      // Workspace ownership is represented by merchant_users, not a legacy
      // merchants.user_id column. Bootstrap through the server-side service
      // path so a brand-new account can create both rows as one service-owned
      // product flow without relying on browser RLS permissions.
      const setupResponse = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapOnly: true }),
      });

      if (!setupResponse.ok) {
        setLoading(false);
        setFieldErrors({ email: 'Your account was created, but we could not prepare your workspace.' });
        return;
      }
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <AuthShell>
      <Panel as="section" variant="panel" className="p-6">
        <h1 className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal text-[var(--ua-text-primary)]">Create your account</h1>

        <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
              Email
            </label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              className={authInputClassName}
              placeholder="you@company.com"
            />
            <AuthError id="signup-email-error">{fieldErrors.email}</AuthError>
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
              Password
            </label>
            <Input
              id="signup-password"
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
              aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
              className={authInputClassName}
              placeholder="At least 8 characters"
            />
            <AuthError id="signup-password-error">{fieldErrors.password}</AuthError>
          </div>

          <div>
            <label htmlFor="signup-confirm" className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]">
              Confirm password
            </label>
            <Input
              id="signup-confirm"
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
              aria-describedby={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
              className={authInputClassName}
              placeholder="Confirm password"
            />
            <AuthError id="signup-confirm-error">{fieldErrors.confirm}</AuthError>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={loading}
            className="w-full justify-center"
            style={authButtonStyle}
          >
            {loading ? 'Creating account' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-[var(--ua-text-secondary)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </Panel>
    </AuthShell>
  );
}
