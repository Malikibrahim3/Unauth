"use client";

import { Suspense, useMemo, useReducer } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton, Panel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { AuthError, authButtonStyle, authInputClassName } from "../AuthShell";
import { safeRedirectPath } from "@/lib/auth/safeRedirect";

type LoginState = {
  email: string;
  password: string;
  showPassword: boolean;
  fieldErrors: Partial<Record<"email" | "password", string>>;
  loading: boolean;
};

type LoginAction = { type: "patch"; patch: Partial<LoginState> };

function validateLogin(email: string, password: string) {
  const fieldErrors: LoginState['fieldErrors'] = {};
  if (!email.trim()) fieldErrors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) fieldErrors.email = 'Enter a valid email address.';
  if (!password) fieldErrors.password = 'Enter your password.';
  return fieldErrors;
}

function mapAuthError(
  message: string,
): Partial<Record<"email" | "password", string>> {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials"))
    return { password: "Incorrect email or password" };
  if (lower.includes("email not confirmed"))
    return { email: "Please verify your email before signing in" };
  return { password: "We could not sign you in. Please try again." };
}

function reducer(state: LoginState, action: LoginAction): LoginState {
  return { ...state, ...action.patch };
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <Panel as="section" variant="panel" className="p-6">
          <LoadingSkeleton
            variant="form"
            rows={2}
            title="Loading sign-in form"
            delayMs={0}
          />
        </Panel>
      )}
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");
  const [state, dispatch] = useReducer(reducer, {
    email: "",
    password: "",
    showPassword: false,
    fieldErrors: {},
    loading: false,
  });

  const nextPath = safeRedirectPath(requestedNextPath);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateLogin(state.email, state.password);
    if (Object.keys(fieldErrors).length > 0) {
      dispatch({ type: "patch", patch: { fieldErrors } });
      return;
    }
    dispatch({ type: "patch", patch: { loading: true, fieldErrors: {} } });

    const { error } = await supabase.auth.signInWithPassword({
      email: state.email.trim(),
      password: state.password,
    });

    if (error) {
      dispatch({
        type: "patch",
        patch: { loading: false, fieldErrors: mapAuthError(error.message) },
      });
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <Panel as="section" variant="panel" className="p-6">
      <h1 className="text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal text-[var(--ua-text-primary)]">
        Sign in
      </h1>

      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]"
          >
            Email
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={state.email}
            onChange={(event) =>
              dispatch({
                type: "patch",
                patch: { email: event.target.value, fieldErrors: { ...state.fieldErrors, email: undefined } },
              })
            }
            required
            aria-invalid={Boolean(state.fieldErrors.email)}
            aria-describedby={
              state.fieldErrors.email ? "login-email-error" : undefined
            }
            className={authInputClassName}
            placeholder="you@company.com"
          />
          <AuthError id="login-email-error">
            {state.fieldErrors.email}
          </AuthError>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-medium text-[var(--ua-text-secondary)]"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={state.showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={state.password}
              onChange={(event) =>
                dispatch({
                  type: "patch",
                  patch: { password: event.target.value, fieldErrors: { ...state.fieldErrors, password: undefined } },
                })
              }
              required
              minLength={8}
              aria-invalid={Boolean(state.fieldErrors.password)}
              aria-describedby={
                state.fieldErrors.password ? "login-password-error" : undefined
              }
              className={`${authInputClassName} pr-10`}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "patch", patch: { showPassword: !state.showPassword } })
              }
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--ua-radius-control)] text-[var(--ua-text-tertiary)] transition-colors hover:bg-[var(--ua-surface-secondary)] hover:text-[var(--ua-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-shadow-focus)]"
              aria-label={state.showPassword ? "Hide password" : "Show password"}
              aria-pressed={state.showPassword}
              aria-controls="login-password"
              title={state.showPassword ? "Hide password" : "Show password"}
            >
              {state.showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <AuthError id="login-password-error">
            {state.fieldErrors.password}
          </AuthError>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={state.loading}
          disabled={state.loading}
          className="w-full justify-center"
          style={authButtonStyle}
        >
          {state.loading ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-xs leading-4 text-[var(--ua-text-tertiary)]">
        Secure account access for your workspace.
      </p>

      <p className="mt-5 text-sm text-[var(--ua-text-secondary)]">
        Forgot password?{" "}
        <Link
          href="/reset"
          className="font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline"
        >
          Reset it
        </Link>{" "}· Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--ua-action-primary)] underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </Panel>
  );
}
