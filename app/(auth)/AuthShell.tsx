import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import styles from './AuthShell.module.css';

const promises = [
  ['One verified position', 'Exposure, prevented, recovered and realised loss, reconciled to your own records.'],
  ['Recovery ready for external filing', 'Provider-specific claim packs prepared with the recorded evidence and deadline; a person submits them outside Unauth.'],
  ['Never a guessed number', 'If a source is stale or partial, the affected figure is withheld and labelled — not estimated.'],
] as const;

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className={`uo-entry ua-auth-surface ${styles.shell}`} data-unauth-ui="evidence-operations-v1" data-surface-family="auth" data-screen-label="Auth and onboarding" data-readiness="shell-ready auth-resolved" data-shell-ready="true" data-auth-resolved="true">
      <div className={styles.frame}>
        <AuthProductContext />
        <section className={styles.task} aria-label="Account access">
          <div className={styles.taskTopbar}>
            <div className={styles.steps} aria-label="Account setup progress"><span data-active="true">Account access</span><span>Connect sources</span><span>First import</span></div>
            <p>Trouble signing in? Contact your workspace owner</p>
          </div>
          <div className={styles.formArea}><div className={styles.formSlot}>{children}</div></div>
        </section>
      </div>
    </main>
  );
}

export function AuthProductContext() {
  return (
    <aside className={styles.context} aria-label="Product context">
      <Link href="/" className={styles.logo} aria-label="Unauth home">
        <UnauthLogo kind="symbol" tone="graphite" background="white" height={28} alt="" decorative className={styles.logoMark} />
        <strong>Unauth</strong>
      </Link>
      <div className={styles.contextCopy}>
        <h2>Know exactly what your delivery losses cost, and get the recoverable part back.</h2>
        <p>Unauth reads your orders, payments, fulfilment and support records, then states one verified position: what was lost, what was prevented, what is still recoverable.</p>
      </div>
      <div className={styles.promises}>
        {promises.map(([title, body]) => <div key={title}><span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.7 5.1 4 7.3 8.4 2.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><strong>{title}</strong><small>{body}</small></div></div>)}
      </div>
      <div className={styles.contextSpacer} />
      <footer className={styles.contextFooter}>
        <p>Read-only access by default. Unauth never moves money, and never issues a refund on your behalf.</p>
        <div><span>Workspace-scoped access</span><b>·</b><span>Audited consequential actions</span></div>
      </footer>
    </aside>
  );
}

export function AuthError({ id, children }: { id?: string; children?: ReactNode }) {
  return <p id={id} role={children ? 'alert' : undefined} aria-live="polite" className={styles.error}>{children ?? '\u00a0'}</p>;
}

/** Transitional API name retained for non-P01 routes; the value is owned by the new control contract. */
export const authInputClassName = 'ua-input';
export const authButtonStyle = undefined;
