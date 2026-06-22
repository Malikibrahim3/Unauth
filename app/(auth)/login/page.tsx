'use client';

import { Suspense, useMemo, useReducer } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { AuthError, authButtonStyle, authInputClassName } from '../AuthShell';

type LoginState = {
  email: string;
  password: string;
  fieldErrors: Partial<Record<'email' | 'password', string>>;
  loading: boolean;
};

type LoginAction = { type: 'patch'; patch: Partial<LoginState> };

function mapAuthError(message: string): Partial<Record<'email' | 'password', string>> {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return { password: 'Incorrect email or password' };
  if (lower.includes('email not confirmed')) return { email: 'Please verify your email before signing in' };
  return { password: 'We could not sign you in. Please try again.' };
}

function reducer(state: LoginState, action: LoginAction): LoginState {
  return { ...state, ...action.patch };
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');
  const [state, dispatch] = useReducer(reducer, {
    email: '',
    password: '',
    fieldErrors: {},
    loading: false,
  });

  const nextPath = !requestedNextPath ? '/dashboard' : requestedNextPath;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: 'patch', patch: { loading: true, fieldErrors: {} } });

    const { error } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });

    if (error) {
      dispatch({ type: 'patch', patch: { loading: false, fieldErrors: mapAuthError(error.message) } });
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-normal text-[#17151F]">Sign in</h1>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-[#3D394B]">
            Email
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={state.email}
            onChange={(event) => dispatch({ type: 'patch', patch: { email: event.target.value } })}
            required
            aria-describedby={state.fieldErrors.email ? 'login-email-error' : undefined}
            className={authInputClassName}
            placeholder="you@company.com"
          />
          <AuthError id="login-email-error">{state.fieldErrors.email}</AuthError>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-[#3D394B]">
            Password
          </label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={state.password}
            onChange={(event) => dispatch({ type: 'patch', patch: { password: event.target.value } })}
            required
            minLength={8}
            aria-describedby={state.fieldErrors.password ? 'login-password-error' : undefined}
            className={authInputClassName}
            placeholder="Password"
          />
          <AuthError id="login-password-error">{state.fieldErrors.password}</AuthError>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={state.loading}
          disabled={state.loading}
          className="w-full justify-center"
          style={authButtonStyle}
        >
          {state.loading ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-5 text-sm text-[#625D70]">
        Forgot password?{' '}
        <Link href="/reset" className="font-medium text-[#5D4B8B] underline-offset-4 hover:underline">
          Reset it
        </Link>
      </p>
      <p className="mt-4 text-sm text-[#625D70]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-[#5D4B8B] underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </section>
  );
}
