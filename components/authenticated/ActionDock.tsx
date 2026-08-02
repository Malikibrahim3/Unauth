import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function ActionDock({ copy, actions, sticky = false }: { copy?: ReactNode; actions: ReactNode; sticky?: boolean }) {
  return (
    <div className={styles.actionDock} data-sticky={sticky || undefined}>
      {copy ? <div className={styles.actionDockCopy}>{copy}</div> : null}
      <div className={styles.actionDockActions}>{actions}</div>
    </div>
  );
}
