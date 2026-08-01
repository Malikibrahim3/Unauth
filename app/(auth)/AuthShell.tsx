import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import styles from './AuthShell.module.css';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className={`ua-auth-surface ${styles.shell} text-[var(--ua-text-primary)]`}>
      <div className={styles.layout}>
        <div className={styles.formRegion}>
          <Link href="/" className={styles.logo} aria-label="Unauth home">
            <UnauthLogo kind="lockup" tone="graphite" height={22} priority />
          </Link>
          <div className={styles.formSlot}>{children}</div>
        </div>
        <aside className={styles.contextPanel} aria-label="What Unauth brings together">
          <div className={styles.contextInner}>
            <div className={styles.contextCopy}>
              <h2 className={styles.contextTitle}>The evidence is assembled. The decision stays yours.</h2>
              <p className={styles.contextBody}>
                Unauth reconciles the merchant-owned records around a payout case,
                explains the matched rule, and keeps the final action with your team.
              </p>
              <ul className={styles.evidenceList}>
                <li className={styles.evidenceItem}>
                  <strong>Commerce context</strong>
                  <span>Order and value linked</span>
                </li>
                <li className={styles.evidenceItem}>
                  <strong>Fulfilment evidence</strong>
                  <span>Source and freshness retained</span>
                </li>
                <li className={styles.evidenceItem}>
                  <strong>Support history</strong>
                  <span>Request and outcome connected</span>
                </li>
              </ul>
            </div>
            <p className={styles.contextFooter}>
              Evidence reconciliation and recovery control for merchant teams.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function AuthError({ id, children }: { id?: string; children?: ReactNode }) {
  return (
    <p
      id={id}
      role={children ? 'alert' : undefined}
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={children ? undefined : true}
      className="mt-2 min-h-5 text-sm leading-5 text-[var(--ua-risk-critical)]"
    >
      {children ?? '\u00a0'}
    </p>
  );
}

export const authInputClassName =
  'h-9 rounded-[var(--ua-radius-control)] border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 text-sm text-[var(--ua-text-primary)] shadow-none placeholder:text-[var(--ua-text-tertiary)] focus:border-[var(--ua-action-primary)] focus:bg-[var(--ua-surface-primary)] focus:ring-[var(--ua-shadow-focus)]';

export const authButtonStyle = {
  background: 'var(--ua-action-primary)',
  color: 'var(--ua-action-primary-fg)',
  borderColor: 'var(--ua-action-primary)',
  borderRadius: 'var(--ua-radius-control)',
  boxShadow: 'none',
} as const;
