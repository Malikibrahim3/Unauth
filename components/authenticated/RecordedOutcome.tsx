import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function RecordedOutcome({ children, meta, urgent = false }: { children: ReactNode; meta?: ReactNode; urgent?: boolean }) {
  return (
    <div className={styles.recordedOutcome} role={urgent ? 'alert' : 'status'}>
      <div>{children}</div>
      {meta ? <div className={styles.recordedOutcomeMeta}>{meta}</div> : null}
    </div>
  );
}
