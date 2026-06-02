'use client';

import { Button } from '@/components/ui/Button';
import type { SignupFlowState } from '@/components/signup/signupFlowReducer';
import { SIGNUP_TEXT_MUTED } from '@/components/signup/signupFlowStyles';

type SignupFlowUploadStepProps = {
  state: SignupFlowState;
  onFileSelection: (file: File | null) => void;
  onRunAudit: () => void;
};

export function SignupFlowUploadStep({ state, onFileSelection, onRunAudit }: SignupFlowUploadStepProps) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
        Step 2 · upload
      </p>
      <h2 className="mt-3 text-3xl font-medium tracking-tight">Upload your order export.</h2>
      <p className="mt-4 text-base leading-7" style={{ color: '#4A4640', fontFamily: 'var(--font-serif, serif)' }}>
        A CSV of your last 90 days works best. 5,000–50,000 rows. We&apos;ll match your columns automatically - no
        formatting required.
      </p>

      {state.verificationFallback ? (
        <div
          className="mt-6 rounded-sm border px-4 py-3 text-sm"
          style={{ borderColor: '#D8D0BD', background: '#F8F5EE', color: '#4A4640' }}
        >
          We created your account and sent a confirmation email. If your environment requires verification before
          sign-in, confirm that email, then continue here.
        </div>
      ) : null}

      <label
        className="mt-8 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-8 text-center"
        style={{ borderColor: '#C7BEAA', background: '#FAF6EF' }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => onFileSelection(event.target.files?.[0] ?? null)}
        />
        <p className="text-base font-medium">Drag and drop or choose a CSV</p>
        <p className="mt-2 text-sm" style={SIGNUP_TEXT_MUTED}>
          Accepts .csv only
        </p>
        {state.selectedFile ? (
          <div
            className="mt-6 rounded-sm border px-4 py-3 text-left text-sm"
            style={{ borderColor: '#D8D0BD', background: '#FDFBF6', minWidth: '100%' }}
          >
            <p className="font-medium" style={{ color: '#1A1814' }}>
              {state.selectedFile.name}
            </p>
            <p className="mt-1" style={SIGNUP_TEXT_MUTED}>
              {state.rowCount !== null ? `${state.rowCount.toLocaleString()} rows detected` : 'Preparing file…'}
            </p>
          </div>
        ) : null}
      </label>

      {state.error ? (
        <p className="mt-4 text-sm" style={{ color: '#7B2D26' }}>
          {state.error}
        </p>
      ) : null}

      <div className="mt-8">
        <Button type="button" size="lg" loading={state.uploadLoading} disabled={!state.hashedFile} onClick={onRunAudit}>
          Run audit →
        </Button>
        <p className="mt-3 text-sm" style={SIGNUP_TEXT_MUTED}>
          Your upload is processed in your merchant workspace. Shared network matching uses hashed identifiers and
          exports minimise customer identifiers by default.
        </p>
      </div>
    </>
  );
}
