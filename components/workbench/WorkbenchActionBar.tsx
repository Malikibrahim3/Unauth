import { type ReactNode } from 'react';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

interface WorkbenchActionBarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}

export function WorkbenchActionBar({ left, middle, right }: WorkbenchActionBarProps) {
  return (
    <div
      className={styles.toolbar}
    >
      <div className={styles.toolbarGroup}>{left}</div>
      <div className={styles.toolbarGroup}>{middle}</div>
      <div className={styles.toolbarGroup}>{right}</div>
    </div>
  );
}
