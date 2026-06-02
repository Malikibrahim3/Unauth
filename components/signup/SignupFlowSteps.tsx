'use client';

import type { SignupFlowState } from '@/components/signup/signupFlowReducer';
import { SignupFlowAccountStep } from '@/components/signup/SignupFlowAccountStep';
import { SignupFlowUploadStep } from '@/components/signup/SignupFlowUploadStep';

type SignupFlowStepsProps = {
  state: SignupFlowState;
  onPatch: (patch: Partial<SignupFlowState>) => void;
  onCreateAccount: (event: React.FormEvent<HTMLFormElement>) => void;
  onFileSelection: (file: File | null) => void;
  onRunAudit: () => void;
};

export function SignupFlowSteps({
  state,
  onPatch,
  onCreateAccount,
  onFileSelection,
  onRunAudit,
}: SignupFlowStepsProps) {
  return (
    <div className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-xl rounded-sm border bg-[#FDFBF6] p-8 md:p-10" style={{ borderColor: '#D8D0BD' }}>
        {state.step === 'account' ? (
          <SignupFlowAccountStep state={state} onPatch={onPatch} onCreateAccount={onCreateAccount} />
        ) : (
          <SignupFlowUploadStep state={state} onFileSelection={onFileSelection} onRunAudit={onRunAudit} />
        )}
      </div>
    </div>
  );
}
