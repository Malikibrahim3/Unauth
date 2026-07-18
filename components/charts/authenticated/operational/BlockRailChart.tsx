import Link from 'next/link';
import type { AuthChartTone } from '../types';
import styles from '../AuthenticatedCharts.module.css';

export type BlockRailBlock = {
  key: string;
  label: string;
  value: number;
  tone: AuthChartTone;
  href?: string;
};

export type BlockRailPin = {
  label: string;
  emphasis?: boolean;
};

type BlockRailChartProps = {
  blocks: BlockRailBlock[];
  /** Unrealised/outstanding remainder — renders as a hatched tail, never a background fill. */
  remainder?: number;
  pins?: BlockRailPin[];
  compact?: boolean;
};

/** T6 — block rail with pin annotations and hatched remainder. The pipeline/health rail. */
export function BlockRailChart({ blocks, remainder, pins, compact = false }: BlockRailChartProps) {
  const total = blocks.reduce((sum, b) => sum + Math.max(0, b.value), 0) + Math.max(0, remainder ?? 0);

  return (
    <div>
      {pins?.length ? (
        <div className={styles.pinRow}>
          {pins.map((pin) => (
            <div key={pin.label} className={styles.pin}>
              <span className={styles.pinLine} style={{ height: pin.emphasis ? 28 : 16 }} />
              <span className={styles.pinLabel} data-emphasis={pin.emphasis}>{pin.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div
        className={styles.rail}
        data-compact={compact}
        role="img"
        aria-label={blocks.map((b) => `${b.label}: ${b.value}`).join(', ')}
      >
        {blocks.map((block) => {
          const width = total > 0 ? Math.max(6, (block.value / total) * 100) : 0;
          const body = <span className={styles[block.tone]} style={{ display: 'block', width: '100%', height: '100%', borderRadius: 4 }} />;
          return (
            <div key={block.key} className={styles.railBlock} style={{ width: `${width}%` }}>
              {block.href ? (
                <Link href={block.href} aria-label={`Open ${block.label} — ${block.value}`}>{body}</Link>
              ) : (
                body
              )}
            </div>
          );
        })}
        {remainder && remainder > 0 ? (
          <div className={`${styles.railRemainder} ${styles.hatchNeutral}`} style={{ flexGrow: remainder }} />
        ) : null}
      </div>
    </div>
  );
}
