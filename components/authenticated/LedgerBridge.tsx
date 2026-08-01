import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './DecisionLedger.module.css';

export type LedgerBridgeItem = {
  key: string;
  label: string;
  value: ReactNode;
  definition?: ReactNode;
  href?: string;
  state?: 'known' | 'unavailable' | 'partial';
};

export function LedgerBridge({ items, label }: { items: LedgerBridgeItem[]; label: string }) {
  return (
    <div className={styles.bridgeViewport}>
      <ol
        className={styles.bridge}
        style={{ gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))` }}
        aria-label={label}
      >
        {items.map((item, index) => {
          const content = (
            <>
              <span className={styles.bridgeNode} data-state={item.state ?? 'known'} aria-hidden="true" />
              <span className={styles.bridgeLabel}>{item.label}</span>
              <span className={styles.bridgeValue}>{item.value}</span>
              {item.definition ? <span className={styles.bridgeDefinition}>{item.definition}</span> : null}
              {index < items.length - 1 ? <span className="sr-only">then</span> : null}
            </>
          );
          return (
            <li key={item.key} className={styles.bridgeItem}>
              {item.href ? <Link href={item.href} className={styles.bridgeLink}>{content}</Link> : content}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
