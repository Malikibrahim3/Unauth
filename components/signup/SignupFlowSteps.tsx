'use client';

import type { SignupFlowState } from '@/components/signup/signupFlowReducer';
import { SignupFlowAccountStep } from '@/components/signup/SignupFlowAccountStep';

type SignupFlowStepsProps = {
  state: SignupFlowState;
  onPatch: (patch: Partial<SignupFlowState>) => void;
  onCreateAccount: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function SignupFlowSteps({
  state,
  onPatch,
  onCreateAccount,
}: SignupFlowStepsProps) {
  return (
    <div className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-xl rounded-sm border bg-[#FDFBF6] p-8 md:p-10" style={{ borderColor: '#D8D0BD' }}>
        <SignupFlowAccountStep state={state} onPatch={onPatch} onCreateAccount={onCreateAccount} />
      </div>
    </div>
  );
}
