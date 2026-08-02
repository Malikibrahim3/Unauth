import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export function DecisionHeader({
  title,
  sentence,
  meta,
  actions,
  scope,
}: {
  title: string;
  sentence?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  scope?: ReactNode;
}) {
  return (
    <header className={styles.decisionHeader}>
      <div className={styles.decisionIdentity}>
        <h1 className={styles.decisionTitle}>{title}</h1>
        {sentence ? <div className={styles.decisionSentence}>{sentence}</div> : null}
        {meta ? <div className={styles.decisionMeta}>{meta}</div> : null}
      </div>
      {actions ? <div className={styles.decisionActions}>{actions}</div> : null}
      {scope ? <div className={styles.scopeStrip}>{scope}</div> : null}
    </header>
  );
}
