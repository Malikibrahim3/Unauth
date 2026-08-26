import type { ReactNode } from 'react';
import styles from './neutralLanding.module.css';

type NeutralChapterProps = {
  id: string;
  title: string;
  statement: string;
  body: string;
  children: ReactNode;
  className?: string;
};

export function NeutralChapter({ id, title, statement, body, children, className = '' }: NeutralChapterProps) {
  return (
    <section id={id} className={`${styles.chapter} ${className}`} data-landing-section={id}>
      <div className={styles.shell}>
        <div className={styles.chapterIntro}>
          <h2>{title}</h2>
          <div className={styles.chapterCopy}>
            <p className={styles.statement}>{statement}</p>
            <p className={styles.bodyCopy}>{body}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
