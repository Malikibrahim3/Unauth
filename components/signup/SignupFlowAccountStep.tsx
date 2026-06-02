'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { SignupFlowState } from '@/components/signup/signupFlowReducer';
import { SIGNUP_TEXT_MUTED } from '@/components/signup/signupFlowStyles';

type SignupFlowAccountStepProps = {
  state: SignupFlowState;
  onPatch: (patch: Partial<SignupFlowState>) => void;
  onCreateAccount: (event: React.FormEvent<HTMLFormElement>) => void;
};

function SignupField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function SignupFlowAccountStep({ state, onPatch, onCreateAccount }: SignupFlowAccountStepProps) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
        Step 1 · account
      </p>
      <h2 className="mt-3 text-3xl font-medium tracking-tight">Create your account.</h2>

      <form className="mt-8 space-y-5" onSubmit={onCreateAccount}>
        <SignupField label="Full name">
          <Input value={state.fullName} onChange={(event) => onPatch({ fullName: event.target.value })} required style={SIGNUP_TEXT_MUTED} />
        </SignupField>
        <SignupField label="Work email">
          <Input type="email" value={state.workEmail} onChange={(event) => onPatch({ workEmail: event.target.value })} required style={SIGNUP_TEXT_MUTED} />
        </SignupField>
        <SignupField label="Store name">
          <Input value={state.storeName} onChange={(event) => onPatch({ storeName: event.target.value })} required style={SIGNUP_TEXT_MUTED} />
        </SignupField>
        <div className="grid gap-5 md:grid-cols-2">
          <SignupField label="Password">
            <Input type="password" value={state.password} onChange={(event) => onPatch({ password: event.target.value })} required style={SIGNUP_TEXT_MUTED} />
          </SignupField>
          <SignupField label="Confirm password">
            <Input type="password" value={state.confirmPassword} onChange={(event) => onPatch({ confirmPassword: event.target.value })} required style={SIGNUP_TEXT_MUTED} />
          </SignupField>
        </div>

        {state.error ? (
          <p className="text-sm" style={{ color: '#7B2D26' }}>
            {state.error}
          </p>
        ) : null}

        <div className="pt-2">
          <Button type="submit" size="lg" loading={state.accountLoading}>
            Create account →
          </Button>
          <p className="mt-3 text-sm" style={SIGNUP_TEXT_MUTED}>
            Free to start. No card required.
          </p>
          <p className="mt-4 text-sm" style={SIGNUP_TEXT_MUTED}>
            By creating an account, you agree to use Unauth for authorised business use only.
          </p>
        </div>
      </form>
    </>
  );
}
