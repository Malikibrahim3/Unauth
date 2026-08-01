import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function ScopeStrip({ primary, utility }: { primary?: ReactNode; utility?: ReactNode }) {
  return (
    <>
      <div className={styles.scopePrimary}>{primary}</div>
      <div className={styles.scopeUtility}>{utility}</div>
    </>
  );
}
