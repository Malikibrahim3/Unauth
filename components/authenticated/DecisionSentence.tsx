import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function DecisionSentence({ children }: { children: ReactNode }) {
  return <p className={styles.decisionLine}>{children}</p>;
}
