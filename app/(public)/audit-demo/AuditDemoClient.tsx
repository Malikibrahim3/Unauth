'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUDIT_DEMO_CONTEXT_KEY,
  auditDemoReducer,
  createAuditDemoInitialState,
} from '@/app/(public)/audit-demo/auditDemoReducer';
import AuditDemoSteps from '@/app/(public)/audit-demo/AuditDemoSteps';
import styles from '@/app/(public)/audit-demo/AuditDemoClient.module.css';

export default function AuditDemoClient({ initialEmail = '' }: { initialEmail?: string }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    auditDemoReducer,
    initialEmail,
    createAuditDemoInitialState,
  );

  function onStartAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = state.email.trim();
    if (!trimmedEmail) {
      dispatch({ type: 'patch', patch: { emailError: 'Enter your work email to continue.' } });
      return;
    }
    dispatch({ type: 'startAudit' });
  }

  async function onSelectProblem(value: string) {
    dispatch({ type: 'patch', patch: { problem: value, loading: true } });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    sessionStorage.setItem('auditPrefillEmail', state.email.trim());
    sessionStorage.setItem(
      AUDIT_DEMO_CONTEXT_KEY,
      JSON.stringify({ platform: state.platform, volume: state.volume, problem: value }),
    );
    router.push('/audit');
  }

  return (
    <main className={styles.main}>
      <div className={`mx-auto w-full max-w-[560px] ${styles.card}`}>
        <AuditDemoSteps
          state={state}
          dispatch={dispatch}
          onStartAudit={onStartAudit}
          onSelectProblem={onSelectProblem}
          onGoBack={() => dispatch({ type: 'goBack' })}
        />
      </div>
    </main>
  );
}
