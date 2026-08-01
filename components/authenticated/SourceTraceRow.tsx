import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function SourceTraceRow({ kind, summary, meta }: { kind: ReactNode; summary: ReactNode; meta?: ReactNode }) {
  return (
    <div className={styles.sourceTrace}>
      <div className={styles.sourceKind}>{kind}</div>
      <div className={styles.sourceSummary}>{summary}</div>
      {meta ? <div className={styles.sourceMeta}>{meta}</div> : null}
    </div>
  );
}
